let ALL_IMAGES = [];

// Lightbox state
let lbImages = [];
let lbIdx = 0;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randBetween(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

async function loadImages() {
  const res = await fetch('data/rutas.json');
  const data = await res.json();
  ALL_IMAGES = data.rutas.flatMap(r => r.fotos.map(f => f.src));
  document.querySelector('.hint').innerHTML = `⟳ REFRESH · ${ALL_IMAGES.length} fotos`;
}

function renderGrid(animate = true) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const chosen = shuffle(ALL_IMAGES).slice(0, 12);
  lbImages = chosen;

  chosen.forEach((src, idx) => {
    const rotEntry = randBetween(-4, 4);
    const rotIdle  = randBetween(-3, 3);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--rot', `${rotEntry}deg`);
    card.style.setProperty('--rot-idle', `${rotIdle}deg`);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `pegatina ${idx + 1} — abrir imagen completa`);

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = idx + 1;
    card.appendChild(label);

    const img = document.createElement('img');
    img.src = src;
    img.alt = `pegatina ${idx + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = function () {
      this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%230A0A0A"/><text x="50%" y="50%" fill="%23B8A88A" font-size="18" font-family="monospace" text-anchor="middle" dominant-baseline="middle">imagen no disponible</text></svg>';
    };
    card.appendChild(img);

    const open = () => openLightbox(idx);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    grid.appendChild(card);

    if (animate) {
      const delay = 50 + idx * 65;
      setTimeout(() => card.classList.add('visible'), delay);
    } else {
      card.classList.add('visible');
    }
  });

  updateCounter();
}

function updateCounter() {
  const el = document.getElementById('wall-counter');
  if (el) el.innerHTML = `<strong>${ALL_IMAGES.length}</strong> fotos en el muro`;
}

function refreshWall() {
  const grid = document.getElementById('grid');
  const cards = grid.querySelectorAll('.card');

  cards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.remove('visible');
      card.style.setProperty('--rot-idle', `${randBetween(-4, 4)}deg`);
    }, idx * 40);
  });

  const total = cards.length;
  setTimeout(() => {
    renderGrid(true);
  }, total * 40 + 200);
}

// ── Lightbox ──────────────────────────────────────────────
function openLightbox(idx) {
  lbIdx = idx;
  showLbImage();
  const lb = document.getElementById('lightbox');
  lb.classList.add('open');
  lb.focus();
}

function showLbImage() {
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-caption');
  const src = lbImages[lbIdx];

  img.style.animation = 'none';
  img.offsetHeight; // reflow
  img.style.animation = '';
  img.src = src;
  img.alt = `pegatina ${lbIdx + 1}`;

  if (cap) {
    cap.innerHTML = `<strong>pegatina ${lbIdx + 1}</strong> de ${lbImages.length}`;
  }
}

function lbNext() {
  lbIdx = (lbIdx + 1) % lbImages.length;
  showLbImage();
}
function lbPrev() {
  lbIdx = (lbIdx - 1 + lbImages.length) % lbImages.length;
  showLbImage();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('grid').innerHTML =
    '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#B8A88A;font-size:13px;letter-spacing:2px">CONECTANDO CON SERVIDOR...</div>';

  await loadImages();
  renderGrid(true);

  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (lb.classList.contains('open')) {
      if (e.key === 'ArrowRight') lbNext();
      else if (e.key === 'ArrowLeft') lbPrev();
      else if (e.key === 'Escape') closeLightbox();
      return;
    }
    if (e.key.toLowerCase() === 'r') refreshWall();
  });

  document.querySelector('.hero').addEventListener('dblclick', refreshWall);

  // Lightbox click: close on backdrop, not on image
  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLightbox();
  });

});
