/* =========================================================
   MAPA — MapLibre GL JS + rutas desde data/rutas.json
   ========================================================= */

let map;
let rutasData = [];
let activeRutaId = null;
let lbFotos = [];
let lbIdx = 0;

const FALLBACK_ONERROR = 'this.onerror=null;this.style.background="#1A1A1A";this.src="";';

// ── Init mapa ─────────────────────────────────────────────
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'stamen-toner': {
          type: 'raster',
          tiles: ['https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'stamen-toner', type: 'raster', source: 'stamen-toner' }]
    },
    center: [-3.7038, 40.4168],
    zoom: 13
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  map.on('load', loadRutas);
}

// ── Cargar datos ──────────────────────────────────────────
async function loadRutas() {
  try {
    const res = await fetch('data/rutas.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    rutasData = data.rutas;
    renderPanel();
    drawRutas();
  } catch (err) {
    console.error('Error cargando rutas:', err);
    document.querySelector('.panel-scroll').innerHTML =
      '<p class="panel-empty">error cargando rutas<br>comprueba data/rutas.json</p>';
  }
}

// ── Dibujar rutas en mapa ─────────────────────────────────
function drawRutas() {
  rutasData.forEach(ruta => {
    const fotosOrdenadas = [...ruta.fotos].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const coords = fotosOrdenadas.map(f => [f.lng, f.lat]);

    // Polyline
    map.addSource(`ruta-${ruta.id}`, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords }
      }
    });
    map.addLayer({
      id: `ruta-line-${ruta.id}`,
      type: 'line',
      source: `ruta-${ruta.id}`,
      paint: {
        'line-color': ruta.color,
        'line-width': 6,
        'line-opacity': 0.9
      }
    });

    // Marcadores
    fotosOrdenadas.forEach((foto, idx) => {
      const el = document.createElement('div');
      el.style.cssText = 'width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;';

      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 16px; height: 16px;
        background: #0A0A0A;
        border: 3px solid #fff;
        border-radius: 50%;
        transition: transform 0.15s;
        pointer-events: none;
      `;
      el.appendChild(dot);

      el.addEventListener('mouseenter', () => {
        dot.style.transform = 'scale(1.5)';
        highlightThumb(ruta.id, idx);
      });
      el.addEventListener('mouseleave', () => {
        dot.style.transform = 'scale(1)';
      });

      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '220px' });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([foto.lng, foto.lat])
        .addTo(map);

      el.addEventListener('click', e => {
        e.stopPropagation();
        if (popup.isOpen()) { popup.remove(); return; }
        popup
          .setLngLat([foto.lng, foto.lat])
          .setHTML(buildPopupHTML(foto, ruta, idx))
          .addTo(map);
        // Lightbox click — esperar a que el DOM del popup exista
        requestAnimationFrame(() => {
          const img = popup.getElement().querySelector('.popup-thumb');
          if (img) img.addEventListener('click', () => openLightbox(ruta, idx));
        });
      });
    });
  });
}

function buildPopupHTML(foto, ruta, idx) {
  const thumb = foto.thumb || foto.src || '';
  const fecha = new Date(foto.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  return `
    <img class="popup-thumb" src="${thumb}" alt="${foto.pegatina || 'pegatina'}" style="cursor:pointer" onerror="${FALLBACK_ONERROR}">
    <div class="popup-title">${foto.pegatina || '—'}</div>
    <div class="popup-meta">${foto.autor || ''} · ${fecha}</div>
    ${foto.lugar ? `<div class="popup-lugar">${foto.lugar}</div>` : ''}
  `;
}

// ── Panel lateral ─────────────────────────────────────────
function renderPanel() {
  const scroll = document.querySelector('.panel-scroll');

  if (!rutasData.length) {
    scroll.innerHTML = '<p class="panel-empty">aún no hay rutas</p>';
    return;
  }

  scroll.innerHTML = rutasData.map(ruta => `
    <div class="ruta-row" data-id="${ruta.id}" onclick="toggleRuta('${ruta.id}')">
      <div class="ruta-dot" style="background:${ruta.color}"></div>
      <div class="ruta-info">
        <div class="ruta-titulo">${ruta.titulo}</div>
        <div class="ruta-meta">${formatFecha(ruta.fecha)} · ${ruta.fotos.length} fotos</div>
      </div>
    </div>
    <div class="ruta-fotos" id="fotos-${ruta.id}">
      ${[...ruta.fotos].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp))
        .map((f, i) => `<img class="foto-thumb" data-ruta="${ruta.id}" data-idx="${i}"
          src="${f.thumb || f.src}" alt="${f.pegatina || 'foto'}"
          onerror="${FALLBACK_ONERROR}"
          onclick="clickThumb('${ruta.id}', ${i})">`).join('')}
    </div>
  `).join('');
}

function toggleRuta(id) {
  const wasActive = activeRutaId === id;
  setActiveRuta(wasActive ? null : id);
}

function setActiveRuta(id) {
  activeRutaId = id;

  // Update panel rows
  document.querySelectorAll('.ruta-row').forEach(row => {
    row.classList.toggle('active', row.dataset.id === id);
  });
  document.querySelectorAll('.ruta-fotos').forEach(el => {
    el.classList.toggle('open', el.id === `fotos-${id}`);
  });

  // Dim/show layers
  rutasData.forEach(ruta => {
    const opacity = (!id || ruta.id === id) ? 0.9 : 0.2;
    if (map.getLayer(`ruta-line-${ruta.id}`)) {
      map.setPaintProperty(`ruta-line-${ruta.id}`, 'line-opacity', opacity);
    }
  });

  // Fit bounds
  if (id) {
    const ruta = rutasData.find(r => r.id === id);
    if (ruta && ruta.fotos.length) {
      const bounds = ruta.fotos.reduce((b, f) => b.extend([f.lng, f.lat]),
        new maplibregl.LngLatBounds([ruta.fotos[0].lng, ruta.fotos[0].lat], [ruta.fotos[0].lng, ruta.fotos[0].lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 800 });
    }
  }
}

function verTodas() {
  setActiveRuta(null);
  const allBounds = rutasData.flatMap(r => r.fotos.map(f => [f.lng, f.lat]));
  if (!allBounds.length) return;
  const bounds = allBounds.reduce((b, c) => b.extend(c),
    new maplibregl.LngLatBounds(allBounds[0], allBounds[0]));
  map.fitBounds(bounds, { padding: 60, duration: 800 });
}

function clickThumb(rutaId, idx) {
  const ruta = rutasData.find(r => r.id === rutaId);
  if (!ruta) return;
  const fotos = [...ruta.fotos].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
  const foto = fotos[idx];
  map.flyTo({ center: [foto.lng, foto.lat], zoom: 17, duration: 800 });
  openLightbox(ruta, idx);
}

function highlightThumb(rutaId, idx) {
  document.querySelectorAll('.foto-thumb').forEach(el => el.classList.remove('highlighted'));
  const thumb = document.querySelector(`[data-ruta="${rutaId}"][data-idx="${idx}"]`);
  if (thumb) {
    thumb.classList.add('highlighted');
    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function formatFecha(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Lightbox ──────────────────────────────────────────────
function openLightbox(ruta, idx) {
  lbFotos = [...ruta.fotos].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
  lbIdx = idx;
  showLbImage();
  document.getElementById('lightbox').classList.add('open');
}

function showLbImage() {
  const foto = lbFotos[lbIdx];
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-caption');

  img.style.animation = 'none';
  img.offsetHeight;
  img.style.animation = '';
  img.src = foto.src || '';
  img.onerror = () => { img.onerror = null; img.style.background = '#1A1A1A'; };
  img.alt = foto.pegatina || 'pegatina';

  const fecha = new Date(foto.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  cap.innerHTML = `
    <strong>${foto.pegatina || '—'}${foto.autor ? ' · ' + foto.autor : ''}</strong>
    ${foto.lugar ? `<em>${foto.lugar}</em> · ` : ''}${fecha}
    ${foto.nota ? `<br><span style="color:var(--muted)">${foto.nota}</span>` : ''}
    <br><span style="color:var(--muted);font-size:10px">${lbIdx + 1} / ${lbFotos.length}</span>
  `;
}

function lbNext() { lbIdx = (lbIdx + 1) % lbFotos.length; showLbImage(); }
function lbPrev() { lbIdx = (lbIdx - 1 + lbFotos.length) % lbFotos.length; showLbImage(); }
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }

// ── Teclado ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (lb.classList.contains('open')) {
    if (e.key === 'ArrowRight') lbNext();
    else if (e.key === 'ArrowLeft') lbPrev();
    else if (e.key === 'Escape') closeLightbox();
  }
});
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLightbox();
});

// ── Swipe táctil lightbox ─────────────────────────────────
let _lbTouchX = 0;
const _lb = document.getElementById('lightbox');
_lb.addEventListener('touchstart', e => { _lbTouchX = e.touches[0].clientX; }, { passive: true });
_lb.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _lbTouchX;
  if (Math.abs(dx) > 50) { dx < 0 ? lbNext() : lbPrev(); }
}, { passive: true });

// ── Arrancar ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initMap);
