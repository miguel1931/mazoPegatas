/* =========================================================
   ADMIN MVP — EXIF, thumbnails, preview, export JSON
   ========================================================= */

const PALETTE = ['#E63946','#FFD700','#3B82F6','#00F260','#FF3CAC','#0A0A0A'];
const MADRID_CENTER = [-3.7038, 40.4168];
const MADRID_BOUNDS = { latMin: 40.30, latMax: 40.55, lngMin: -3.90, lngMax: -3.50 };

let miniMap = null;
let fotos = []; // { file, previewURL, lat, lng, timestamp, pegatina, autor, lugar, nota, status }
let selectedColor = PALETTE[0];
let ofuscarCoords = false;

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderPalette();
  initMiniMap();
  initDropZone();
});

// ── Paleta de color ───────────────────────────────────────
function renderPalette() {
  const cont = document.getElementById('color-palette');
  PALETTE.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === selectedColor ? ' selected' : '');
    sw.style.background = c;
    sw.title = c;
    sw.onclick = () => {
      selectedColor = c;
      cont.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    };
    cont.appendChild(sw);
  });
}

// ── Mini mapa preview ─────────────────────────────────────
function initMiniMap() {
  miniMap = new maplibregl.Map({
    container: 'mini-map',
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center: MADRID_CENTER,
    zoom: 12
  });
  miniMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  miniMap.on('load', () => updateMiniMap());
}

function updateMiniMap() {
  if (!miniMap) return;

  // Remove old layers/sources
  ['preview-line', 'preview-points'].forEach(id => {
    if (miniMap.getLayer(id)) miniMap.removeLayer(id);
    if (miniMap.getSource(id)) miniMap.removeSource(id);
  });

  const ordered = [...fotos].filter(f => f.lat && f.lng)
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

  if (!ordered.length) return;

  const coords = ordered.map(f => [f.lng, f.lat]);

  // Line
  miniMap.addSource('preview-line', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }
  });
  miniMap.addLayer({
    id: 'preview-line', type: 'line', source: 'preview-line',
    paint: { 'line-color': selectedColor, 'line-width': 4, 'line-opacity': 0.9 }
  });

  // Points
  miniMap.addSource('preview-points', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: ordered.map((f, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: { label: i + 1 }
      }))
    }
  });
  miniMap.addLayer({
    id: 'preview-points', type: 'circle', source: 'preview-points',
    paint: { 'circle-color': '#0A0A0A', 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
  });

  // Fit bounds
  const bounds = coords.reduce((b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0]));
  miniMap.fitBounds(bounds, { padding: 40, maxZoom: 17 });
}

// ── Drop zone ─────────────────────────────────────────────
function initDropZone() {
  const dz = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');

  dz.addEventListener('click', () => input.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    handleFiles([...e.dataTransfer.files]);
  });
  input.addEventListener('change', () => handleFiles([...input.files]));
}

async function handleFiles(files) {
  const imgs = files.filter(f => f.type.startsWith('image/'));
  if (!imgs.length) return;

  log('Procesando ' + imgs.length + ' imagen(es)…');

  for (const file of imgs) {
    await processFile(file);
  }
  renderFotoList();
  updateMiniMap();
}

async function processFile(file) {
  const url = URL.createObjectURL(file);
  const foto = { file, previewURL: url, lat: null, lng: null, timestamp: null, pegatina: '', autor: '', lugar: '', nota: '', status: 'pending' };

  try {
    const exif = await window.exifr.parse(file, { gps: true, tiff: true });
    if (exif) {
      if (exif.latitude != null && exif.longitude != null) {
        foto.lat = exif.latitude;
        foto.lng = exif.longitude;

        if (!inMadrid(foto.lat, foto.lng)) {
          foto.status = 'warn-coords';
          logWarn(`${file.name}: coords fuera de Madrid (${foto.lat.toFixed(4)}, ${foto.lng.toFixed(4)})`);
        } else {
          foto.status = 'ok';
        }
      } else {
        foto.status = 'no-gps';
        logWarn(`${file.name}: sin GPS — rellena coordenadas manualmente`);
      }

      if (exif.DateTimeOriginal) {
        foto.timestamp = toISO8601Madrid(exif.DateTimeOriginal);
      } else if (exif.CreateDate) {
        foto.timestamp = toISO8601Madrid(exif.CreateDate);
      }
    }
  } catch (err) {
    foto.status = 'no-exif';
    logErr(`${file.name}: no se pudo leer EXIF — ${err.message}`);
  }

  fotos.push(foto);
  logOk(`${file.name}: añadida`);
}

function inMadrid(lat, lng) {
  return lat >= MADRID_BOUNDS.latMin && lat <= MADRID_BOUNDS.latMax &&
         lng >= MADRID_BOUNDS.lngMin && lng <= MADRID_BOUNDS.lngMax;
}

function toISO8601Madrid(dt) {
  if (typeof dt === 'string') {
    // "2026:04:14 22:48:00" → "2026-04-14T22:48:00+02:00"
    const m = dt.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const month = parseInt(m[2]);
      const dst = month >= 3 && month <= 10; // aproximación DST Madrid
      const offset = dst ? '+02:00' : '+01:00';
      return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`;
    }
  }
  if (dt instanceof Date) {
    return dt.toISOString();
  }
  return null;
}

// ── Render lista de fotos ─────────────────────────────────
function renderFotoList() {
  const list = document.getElementById('fotos-list');
  list.innerHTML = '';

  fotos.forEach((foto, idx) => {
    const statusClass = foto.status === 'ok' ? '' : (foto.status === 'warn-coords' ? 'warn-coords' : 'error-exif');
    const statusLabel = foto.status === 'ok' ? '<span class="foto-status ok">✓ gps ok</span>'
      : foto.status === 'warn-coords' ? '<span class="foto-status warn">⚠ fuera de madrid</span>'
      : '<span class="foto-status err">✗ sin gps</span>';

    const item = document.createElement('div');
    item.className = `foto-item ${statusClass}`;
    item.dataset.idx = idx;

    item.innerHTML = `
      <img class="foto-preview" src="${foto.previewURL}" alt="foto ${idx+1}">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          ${statusLabel}
          <span style="font-size:10px;color:var(--muted)">${foto.file.name}</span>
        </div>
        <div class="foto-fields">
          <div class="form-group">
            <label>Pegatina</label>
            <input type="text" value="${foto.pegatina}" placeholder="Radiant Baby" data-field="pegatina" data-idx="${idx}">
          </div>
          <div class="form-group">
            <label>Autor</label>
            <input type="text" value="${foto.autor}" placeholder="Haring" data-field="autor" data-idx="${idx}">
          </div>
          <div class="form-group">
            <label>Lugar</label>
            <input type="text" value="${foto.lugar}" placeholder="Calle Mayor, 12" data-field="lugar" data-idx="${idx}">
          </div>
          <div class="form-group">
            <label>Nota</label>
            <input type="text" value="${foto.nota}" placeholder="farola norte" data-field="nota" data-idx="${idx}">
          </div>
        </div>
        <div class="foto-coords">
          Lat: <input type="number" step="0.0001" value="${foto.lat || ''}" placeholder="40.4168" data-field="lat" data-idx="${idx}">
          Lng: <input type="number" step="0.0001" value="${foto.lng || ''}" placeholder="-3.7038" data-field="lng" data-idx="${idx}">
          ${foto.timestamp ? `<span style="margin-left:8px">${foto.timestamp}</span>` : ''}
        </div>
      </div>
      <button class="btn-remove-foto" onclick="removeFoto(${idx})" title="eliminar">✕</button>
    `;

    list.appendChild(item);
  });

  // Delegated input change
  list.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('change', e => {
      const { field, idx } = e.target.dataset;
      const val = e.target.type === 'number' ? parseFloat(e.target.value) || null : e.target.value;
      fotos[parseInt(idx)][field] = val;
      updateMiniMap();
    });
  });
}

function removeFoto(idx) {
  URL.revokeObjectURL(fotos[idx].previewURL);
  fotos.splice(idx, 1);
  renderFotoList();
  updateMiniMap();
}

// ── Generar JSON ──────────────────────────────────────────
function generateJSON() {
  const titulo = document.getElementById('titulo').value.trim() || 'nueva ruta';
  const fecha = document.getElementById('fecha').value || new Date().toISOString().slice(0, 10);
  const nota = document.getElementById('nota-ruta').value.trim();

  const slug = titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = `${fecha}-${slug}`;

  let fotosOrdenadas = [...fotos].filter(f => f.lat && f.lng)
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

  const fotoObjs = fotosOrdenadas.map((f, i) => {
    const nn = String(i + 1).padStart(2, '0');
    let lat = f.lat;
    let lng = f.lng;
    if (ofuscarCoords) {
      lat = Math.round(lat * 1000) / 1000;
      lng = Math.round(lng * 1000) / 1000;
    }
    const obj = {
      src: `img/rutas/${id}/${nn}.jpg`,
      thumb: `img/rutas/${id}/${nn}-thumb.jpg`,
      lat, lng,
      timestamp: f.timestamp || fecha + 'T12:00:00+02:00'
    };
    if (f.pegatina) obj.pegatina = f.pegatina;
    if (f.autor) obj.autor = f.autor;
    if (f.lugar) obj.lugar = f.lugar;
    if (f.nota) obj.nota = f.nota;
    return obj;
  });

  const ruta = { id, titulo, fecha, color: selectedColor };
  if (nota) ruta.nota = nota;
  ruta.fotos = fotoObjs;

  const fragment = { ruta };

  const out = document.getElementById('json-output');
  out.textContent = JSON.stringify(fragment, null, 2);
  out.classList.add('visible');

  logOk(`JSON generado: ${fotoObjs.length} fotos`);
  return fragment;
}

function copyJSON() {
  generateJSON();
  const text = document.getElementById('json-output').textContent;
  navigator.clipboard.writeText(text).then(() => {
    logOk('JSON copiado al portapapeles');
    const btn = document.getElementById('btn-copy');
    btn.textContent = '✓ copiado';
    setTimeout(() => { btn.textContent = 'copiar json'; }, 2000);
  });
}

// ── Generar thumbs via canvas ─────────────────────────────
async function resizeImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function downloadZip() {
  const fragment = generateJSON();
  const id = fragment.ruta.id;

  if (!window.JSZip) { logErr('JSZip no disponible'); return; }
  const zip = new JSZip();

  zip.file('rutas-fragment.json', JSON.stringify(fragment, null, 2));
  zip.file('README.txt',
    `mazoPegatas — instrucciones de merge\n` +
    `=====================================\n\n` +
    `1. Copia la carpeta img/rutas/${id}/ al repo.\n` +
    `2. Abre data/rutas.json.\n` +
    `3. Añade el objeto de rutas-fragment.json dentro del array "rutas".\n` +
    `4. git add . && git commit -m "feat: ruta ${id}" && git push\n`
  );

  const ordered = [...fotos].filter(f => f.lat && f.lng)
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

  const folder = zip.folder(`img/rutas/${id}`);
  for (let i = 0; i < ordered.length; i++) {
    const nn = String(i + 1).padStart(2, '0');
    log(`Procesando imagen ${nn}/${ordered.length}…`);
    try {
      const webBlob = await resizeImage(ordered[i].file, 1600, 0.85);
      const thumbBlob = await resizeImage(ordered[i].file, 400, 0.85);
      folder.file(`${nn}.jpg`, webBlob);
      folder.file(`${nn}-thumb.jpg`, thumbBlob);
      logOk(`${nn}.jpg generado`);
    } catch (err) {
      logErr(`Error procesando ${ordered[i].file.name}: ${err.message}`);
    }
  }

  log('Generando ZIP…');
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${id}.zip`;
  a.click();
  logOk('ZIP descargado · descarga el lote y comitea');
}

// ── Log ───────────────────────────────────────────────────
function log(msg) { addLog(msg, ''); }
function logOk(msg) { addLog('✓ ' + msg, 'log-ok'); }
function logWarn(msg) { addLog('⚠ ' + msg, 'log-warn'); }
function logErr(msg) { addLog('✗ ' + msg, 'log-err'); }

function addLog(msg, cls) {
  const el = document.getElementById('processing-log');
  if (!el) return;
  const line = document.createElement('div');
  line.className = 'log-line' + (cls ? ' ' + cls : '');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Toggle ofuscación ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const tog = document.getElementById('ofuscar-toggle');
  if (tog) {
    tog.addEventListener('change', e => {
      ofuscarCoords = e.target.checked;
      logWarn(ofuscarCoords ? 'modo discreto activado: coords redondeadas a ±100m' : 'modo discreto desactivado');
    });
  }
});
