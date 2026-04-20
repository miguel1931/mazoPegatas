const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Directorios ───────────────────────────────────────────────
const PHOTOS_DIR = path.join(__dirname, 'fotos');
const THUMBS_DIR = path.join(__dirname, 'thumbs');

[PHOTOS_DIR, THUMBS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: '*',  // Permite cualquier origen (Vercel, localhost, etc.)
  methods: ['GET', 'POST'],
}));

// ── Archivos estáticos ───────────────────────────────────────
app.use('/fotos', express.static(PHOTOS_DIR, { maxAge: '7d', etag: true }));
app.use('/thumbs', express.static(THUMBS_DIR, { maxAge: '7d', etag: true }));

// ── Extensiones válidas ──────────────────────────────────────
const VALID_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

function getImageFiles() {
  try {
    return fs.readdirSync(PHOTOS_DIR)
      .filter(f => VALID_EXT.includes(path.extname(f).toLowerCase()))
      .sort();
  } catch { return []; }
}

// ── API: Listar imágenes ─────────────────────────────────────
app.get('/api/images', (req, res) => {
  const files = getImageFiles();
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const images = files.map(f => ({
    name: f,
    url: `${baseUrl}/fotos/${encodeURIComponent(f)}`,
    thumb: `${baseUrl}/thumbs/${encodeURIComponent(f)}`,
  }));

  // ?count=12 → devuelve 12 aleatorias
  const count = parseInt(req.query.count);
  if (count && count > 0) {
    const shuffled = [...images].sort(() => Math.random() - 0.5);
    return res.json(shuffled.slice(0, Math.min(count, images.length)));
  }

  res.json(images);
});

// ── API: Health check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    photos: getImageFiles().length,
    uptime: Math.floor(process.uptime()),
  });
});

// ── Upload (multer) ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: PHOTOS_DIR,
  filename: (req, file, cb) => {
    // Mantener nombre original, evitar duplicados
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const name = `${base}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (VALID_EXT.includes(ext)) cb(null, true);
    else cb(new Error(`Tipo no permitido: ${ext}`));
  },
});

// Generar thumbnail
async function generateThumb(filename) {
  const src = path.join(PHOTOS_DIR, filename);
  const dst = path.join(THUMBS_DIR, filename);
  try {
    await sharp(src)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(dst);
  } catch (err) {
    console.error(`⚠️  Thumb error (${filename}):`, err.message);
  }
}

app.post('/api/upload', upload.array('photos', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se recibieron archivos' });
  }

  // Generar thumbnails en background
  for (const file of req.files) {
    generateThumb(file.filename);
  }

  res.json({
    message: `${req.files.length} foto(s) subida(s)`,
    files: req.files.map(f => f.filename),
  });
});

// ── API: Eliminar imagen ─────────────────────────────────────
app.delete('/api/images/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(PHOTOS_DIR, filename);
  const thumbPath = path.join(THUMBS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No encontrado' });
  }

  try {
    fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    res.json({ message: `Eliminado: ${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generar todos los thumbnails al arrancar ─────────────────
async function generateAllThumbs() {
  const files = getImageFiles();
  let generated = 0;
  for (const f of files) {
    const thumbPath = path.join(THUMBS_DIR, f);
    if (!fs.existsSync(thumbPath)) {
      await generateThumb(f);
      generated++;
    }
  }
  if (generated > 0) console.log(`🖼️  Generados ${generated} thumbnails`);
}

// ── Panel de administración (UI embebida) ────────────────────
app.get('/', (req, res) => {
  const photoCount = getImageFiles().length;
  res.send(/* html */`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>mazoPegatas · Servidor de Imágenes</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --cream: #F5E6C8; --red: #E3342F; --black: #0A0A0A;
      --dark: #1A1A1A; --neon-yellow: #FDFC47; --neon-green: #00F260;
      --muted: #B8A88A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Space Mono', monospace;
      background: var(--black); color: var(--cream);
      min-height: 100vh;
    }
    .header {
      text-align: center; padding: 40px 20px 24px;
      border-bottom: 4px solid var(--red);
      background: repeating-linear-gradient(45deg, transparent, transparent 20px,
        rgba(227,52,47,0.03) 20px, rgba(227,52,47,0.03) 22px),
        linear-gradient(180deg, var(--black), var(--dark));
    }
    .header h1 {
      font-family: 'Bebas Neue', sans-serif; font-size: 48px;
      letter-spacing: 4px; color: var(--cream); text-transform: uppercase;
      text-shadow: 3px 3px 0 var(--red);
    }
    .header p { color: var(--muted); font-size: 13px; letter-spacing: 2px;
      text-transform: uppercase; margin-top: 8px; }
    .stats {
      display: flex; justify-content: center; gap: 24px; margin-top: 16px;
    }
    .stat {
      background: rgba(245,230,200,0.05); border: 2px solid rgba(245,230,200,0.1);
      padding: 12px 24px; text-align: center;
    }
    .stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: var(--neon-yellow); }
    .stat-label { font-size: 11px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; }

    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }

    /* Upload zone */
    .upload-zone {
      border: 3px dashed var(--red); padding: 48px 24px;
      text-align: center; margin-bottom: 32px; cursor: pointer;
      transition: all 0.3s; position: relative;
    }
    .upload-zone:hover, .upload-zone.drag {
      border-color: var(--neon-yellow);
      background: rgba(253,252,71,0.03);
      box-shadow: 0 0 30px rgba(253,252,71,0.1);
    }
    .upload-zone h2 {
      font-family: 'Bebas Neue', sans-serif; font-size: 28px;
      letter-spacing: 3px; color: var(--cream); margin-bottom: 8px;
    }
    .upload-zone p { color: var(--muted); font-size: 13px; }
    .upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .upload-progress {
      margin-top: 16px; display: none;
    }
    .upload-bar {
      height: 4px; background: rgba(245,230,200,0.1); overflow: hidden;
    }
    .upload-bar-fill {
      height: 100%; background: var(--neon-green); width: 0%;
      transition: width 0.3s;
    }
    .upload-status {
      font-size: 12px; color: var(--neon-green); margin-top: 8px;
      letter-spacing: 1px;
    }

    /* Gallery */
    .gallery {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .photo {
      position: relative; aspect-ratio: 1; overflow: hidden;
      border: 2px solid rgba(245,230,200,0.06); background: var(--dark);
      transition: all 0.2s; cursor: pointer;
    }
    .photo:hover {
      border-color: var(--neon-yellow);
      transform: translateY(-4px);
      box-shadow: 4px 4px 0 var(--red);
    }
    .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo .name {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(10,10,10,0.85); padding: 6px 8px;
      font-size: 10px; color: var(--muted); letter-spacing: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .photo .del-btn {
      position: absolute; top: 4px; right: 4px;
      background: var(--red); color: var(--cream); border: none;
      width: 24px; height: 24px; font-size: 14px; cursor: pointer;
      display: none; font-family: 'Bebas Neue', sans-serif;
    }
    .photo:hover .del-btn { display: block; }

    .empty {
      text-align: center; padding: 60px; color: var(--muted);
      font-size: 14px; letter-spacing: 2px;
    }
    .footer {
      text-align: center; padding: 24px; margin-top: 32px;
      border-top: 2px solid rgba(245,230,200,0.06);
      color: var(--muted); font-size: 11px; letter-spacing: 2px;
    }
    .footer a { color: var(--red); text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 Servidor de Imágenes</h1>
    <p>mazoPegatas · panel de administración</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-num" id="photo-count">${photoCount}</div>
        <div class="stat-label">Fotos</div>
      </div>
      <div class="stat">
        <div class="stat-num" id="uptime">0</div>
        <div class="stat-label">Uptime (min)</div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="upload-zone" id="drop-zone">
      <h2>⬆ Arrastra fotos aquí</h2>
      <p>o haz clic para seleccionar · JPG, PNG, WebP · máx 50MB</p>
      <input type="file" id="file-input" multiple accept="image/*">
      <div class="upload-progress" id="progress">
        <div class="upload-bar"><div class="upload-bar-fill" id="bar-fill"></div></div>
        <div class="upload-status" id="upload-status"></div>
      </div>
    </div>

    <div class="gallery" id="gallery"></div>
    <div class="empty" id="empty" style="display:none">
      No hay fotos todavía · arrastra algunas arriba ↑
    </div>
  </div>

  <div class="footer">
    API: <a href="/api/images" target="_blank">/api/images</a> ·
    <a href="/api/health" target="_blank">/api/health</a> ·
    <a href="/api/images?count=12" target="_blank">/api/images?count=12</a>
  </div>

  <script>
    // ── Load gallery ──
    async function loadGallery() {
      const res = await fetch('/api/images');
      const images = await res.json();
      const gallery = document.getElementById('gallery');
      const empty = document.getElementById('empty');
      document.getElementById('photo-count').textContent = images.length;

      if (images.length === 0) { empty.style.display = 'block'; gallery.innerHTML = ''; return; }
      empty.style.display = 'none';

      gallery.innerHTML = images.map(img => \`
        <div class="photo">
          <img src="\${img.thumb || img.url}" alt="\${img.name}" loading="lazy"
               onerror="this.src=this.src.includes('thumbs')?'\${img.url}':''">
          <div class="name">\${img.name}</div>
          <button class="del-btn" onclick="deletePhoto('\${img.name}', event)" title="Eliminar">✕</button>
        </div>
      \`).join('');
    }

    // ── Upload ──
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    ['dragenter','dragover'].forEach(e => dropZone.addEventListener(e, ev => {
      ev.preventDefault(); dropZone.classList.add('drag');
    }));
    ['dragleave','drop'].forEach(e => dropZone.addEventListener(e, ev => {
      ev.preventDefault(); dropZone.classList.remove('drag');
    }));

    dropZone.addEventListener('drop', e => uploadFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', e => uploadFiles(e.target.files));

    async function uploadFiles(files) {
      if (!files.length) return;
      const progress = document.getElementById('progress');
      const barFill = document.getElementById('bar-fill');
      const status = document.getElementById('upload-status');

      progress.style.display = 'block';
      barFill.style.width = '10%';
      status.textContent = \`Subiendo \${files.length} archivo(s)...\`;

      const fd = new FormData();
      for (const f of files) fd.append('photos', f);

      try {
        barFill.style.width = '50%';
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        barFill.style.width = '100%';
        status.textContent = data.message || 'Subida completada';
        setTimeout(() => { progress.style.display = 'none'; barFill.style.width = '0%'; }, 2000);
        setTimeout(loadGallery, 500);
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
        status.style.color = '#E3342F';
      }
      fileInput.value = '';
    }

    // ── Delete ──
    async function deletePhoto(name, event) {
      event.stopPropagation();
      if (!confirm('¿Eliminar ' + name + '?')) return;
      await fetch('/api/images/' + encodeURIComponent(name), { method: 'DELETE' });
      loadGallery();
    }

    // ── Uptime ──
    async function updateUptime() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        document.getElementById('uptime').textContent = Math.floor(data.uptime / 60);
      } catch {}
    }

    loadGallery();
    updateUptime();
    setInterval(updateUptime, 60000);
  </script>
</body>
</html>`);
});

// ── Arrancar servidor ────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║                                                   ║');
  console.log('  ║   🖼️  mazoPegatas — Servidor de Imágenes          ║');
  console.log('  ║                                                   ║');
  console.log(\`  ║   🌐 http://localhost:\${PORT}                      ║\`);
  console.log(\`  ║   📁 Fotos: ./fotos/                              ║\`);
  console.log(\`  ║   📡 API:   http://localhost:\${PORT}/api/images    ║\`);
  console.log('  ║                                                   ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  💡 Pon tus fotos en la carpeta "fotos/" o súbelas');
  console.log('     desde el panel web en http://localhost:' + PORT);
  console.log('');

  await generateAllThumbs();
});
