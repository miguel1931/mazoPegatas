const IMAGE_SERVER = 'http://localhost:3000';

const FALLBACK_IMAGES = [
  "https://i.ibb.co/nMDmWFz5/IMG20260329193013.jpg",
  "https://i.ibb.co/SwgbBdsY/IMG20260329193041.jpg",
  "https://i.ibb.co/fBKJ5tf/IMG20260329193050.jpg",
  "https://i.ibb.co/cXrk4rVq/IMG20260329194115.jpg",
  "https://i.ibb.co/KjTP8bDq/IMG20260329194117.jpg",
  "https://i.ibb.co/Rf5dgR7/IMG20260329194147.jpg",
  "https://i.ibb.co/r25ftmTx/IMG20260330141939.jpg",
  "https://i.ibb.co/9Hw0HqQR/IMG20260330190941.jpg",
  "https://i.ibb.co/tTYRc460/IMG20260330204838.jpg",
  "https://i.ibb.co/8nJcqfLd/IMG20260318100703.jpg",
  "https://i.ibb.co/0j2FyXt2/IMG20260319130712.jpg",
  "https://i.ibb.co/xqfNhrrW/IMG20260319130716.jpg",
  "https://i.ibb.co/rKtgKKL0/IMG20260319165027.jpg",
  "https://i.ibb.co/QvwpVQXn/IMG20260320214811.jpg",
  "https://i.ibb.co/9j1wnNR/IMG20260322114606.jpg",
  "https://i.ibb.co/Q77zgdJT/IMG20260323122151.jpg",
  "https://i.ibb.co/ymV85bQd/IMG20260323122239.jpg",
  "https://i.ibb.co/8n9cHzRf/IMG20260324094941.jpg",
  "https://i.ibb.co/F454Zm37/IMG20260324223202.jpg",
  "https://i.ibb.co/hjFtDLf/IMG20260324224412.jpg",
  "https://i.ibb.co/tTYRc460/IMG20260324224615.jpg",
  "https://i.ibb.co/DPCjb6y7/IMG20260325185629.jpg",
  "https://i.ibb.co/BHVztq9Y/IMG20260325190223.jpg",
  "https://i.ibb.co/skvY30R/IMG20260326184454.jpg",
  "https://i.ibb.co/rRBCXn0q/IMG20260328201141.jpg",
  "https://i.ibb.co/qM9m3znk/IMG20260329193008.jpg",
  "https://i.ibb.co/ZPQj5TJ/IMG20260329193010.jpg",
  "https://i.ibb.co/PZb3VDVf/IMG20260329193015.jpg",
  "https://i.ibb.co/8Dw6q4YN/IMG20260329193039.jpg",
  "https://i.ibb.co/jkpp4ygS/IMG20260329193046.jpg",
  "https://i.ibb.co/Lhh0qhm9/IMG20260329193942.jpg",
  "https://i.ibb.co/7NjjsPZk/IMG20260330142058.jpg",
  "https://i.ibb.co/CpNLQKMG/IMG20260330191355.jpg",
  "https://i.ibb.co/sp8Spvwp/IMG20260330191357.jpg",
  "https://i.ibb.co/gMCWZRBj/IMG20260318100707.jpg",
  "https://i.ibb.co/YTR17cJ2/IMG20260319130713.jpg",
  "https://i.ibb.co/cSMFfPv2/IMG20260320214814.jpg",
  "https://i.ibb.co/ZzKX6WS0/IMG20260320214822.jpg",
  "https://i.ibb.co/BxLV3hx/IMG20260320214847.jpg",
  "https://i.ibb.co/5WMq1bsJ/IMG20260322114608.jpg",
  "https://i.ibb.co/jpfPpJ9/IMG20260322114611.jpg",
  "https://i.ibb.co/1GTzjBcK/IMG20260323122237.jpg",
  "https://i.ibb.co/QvNjNkYS/IMG20260324223206.jpg",
  "https://i.ibb.co/XxkPk76C/IMG20260324223209.jpg",
  "https://i.ibb.co/MktV2vV1/IMG20260324223213.jpg",
  "https://i.ibb.co/Y4wCMtwC/IMG20260324223842.jpg",
  "https://i.ibb.co/xK9pDccF/IMG20260324230152.jpg",
  "https://i.ibb.co/jZJGgNYG/IMG20260324230155.jpg",
  "https://i.ibb.co/TxdDyGqZ/IMG20260325185825.jpg",
  "https://i.ibb.co/LdkHzTTp/IMG20260325185827.jpg",
  "https://i.ibb.co/N6R2J63w/IMG20260325185844.jpg",
  "https://i.ibb.co/jkkHWkHR/IMG20260325190226.jpg",
  "https://i.ibb.co/HfJ43jxC/IMG20260325190325.jpg",
  "https://i.ibb.co/WvmnLcjK/IMG20260326184457.jpg",
  "https://i.ibb.co/7dF3dG15/IMG20260328201145.jpg",
  "https://i.ibb.co/dsX50FK0/IMG20260329105115.jpg",
  "https://i.ibb.co/RT1LsnvC/IMG20260329191447.jpg",
  "https://i.ibb.co/tPZx4rF7/IMG20260329191458.jpg"
];

let ALL_IMAGES = [];
let serverOnline = false;

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

function updateStatus(online, count) {
  const hint = document.querySelector('.hint');
  if (online) {
    hint.innerHTML = `<span style="color:#00F260">●</span> SERVIDOR · ${count} fotos — ⟳ REFRESH`;
  } else {
    hint.innerHTML = `<span style="color:#E3342F">●</span> OFFLINE · fallback — ⟳ REFRESH`;
  }
}

async function loadImages() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${IMAGE_SERVER}/api/images`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.length > 0) {
      ALL_IMAGES = data.map(img => img.url);
      serverOnline = true;
      updateStatus(true, data.length);
      return;
    }
  } catch (err) {
    console.warn('Servidor no disponible, usando fallback:', err.message);
  }
  ALL_IMAGES = FALLBACK_IMAGES;
  serverOnline = false;
  updateStatus(false, FALLBACK_IMAGES.length);
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
  if (el) {
    el.innerHTML = `<strong>${ALL_IMAGES.length}</strong> pegatinas en este muro`;
  }
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

  // Reconnect check
  setInterval(async () => {
    if (serverOnline) return;
    await loadImages();
    if (serverOnline) refreshWall();
  }, 30000);
});
