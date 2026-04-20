# mazoPegatas — Servidor de Imágenes

Servidor self-hosted que sirve las fotos de pegatinas para la web de mazoPegatas.

## Requisitos

- **Node.js 18+** instalado en el PC ([descargar](https://nodejs.org))
- **Windows 10/11**

## Instalación rápida

1. **Copia esta carpeta `image-server/`** al otro PC
2. **Doble clic en `setup.bat`** → instala las dependencias
3. **Doble clic en `start.bat`** → arranca el servidor
4. Abre **http://localhost:3000** → panel de administración

## Uso

### Añadir fotos
Hay 2 formas:
- **Arrastrar fotos** al panel web (http://localhost:3000)
- **Copiar archivos** directamente a la carpeta `fotos/`

### API
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/images` | Lista todas las imágenes |
| `GET /api/images?count=12` | 12 imágenes aleatorias |
| `GET /api/health` | Estado del servidor |
| `POST /api/upload` | Subir fotos (multipart) |
| `DELETE /api/images/:nombre` | Eliminar una foto |

---

## Exponer a internet (para que Vercel acceda)

Tu web en Vercel necesita llegar a este servidor. Tienes 2 opciones:

### Opción 1: ngrok (recomendada, más fácil)

1. **Crear cuenta gratis** en https://ngrok.com
2. **Descargar ngrok** para Windows
3. **Autenticarte**:
   ```
   ngrok config add-authtoken TU_TOKEN_AQUÍ
   ```
4. **Crear un dominio estático gratis** (1 gratis por cuenta):
   - Ve a https://dashboard.ngrok.com/domains
   - Clic en "New Domain" → te dan algo como `tu-nombre.ngrok-free.app`
5. **Arrancar el túnel**:
   ```
   ngrok http --domain=tu-nombre.ngrok-free.app 3000
   ```
6. Tu servidor ahora es accesible en `https://tu-nombre.ngrok-free.app`

### Opción 2: Cloudflare Tunnel

1. **Descargar cloudflared**: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. **Túnel rápido (temporal)**:
   ```
   cloudflared tunnel --url http://localhost:3000
   ```
   Te dará una URL tipo `https://algo-random.trycloudflare.com`
   ⚠️ Cambia cada vez que reinicias

---

## Configurar mazoPegatas

Una vez tengas la URL pública del servidor, edita `index.html` y cambia:

```javascript
const IMAGE_SERVER = 'https://tu-nombre.ngrok-free.app';
```

---

## Arranque automático con Windows (opcional)

Para que el servidor arranque solo cuando enciendas el PC:

1. Pulsa `Win+R` → escribe `shell:startup` → Enter
2. Copia un acceso directo de `start.bat` en esa carpeta
3. El servidor arrancará automáticamente al iniciar Windows

---

## Estructura
```
image-server/
├── server.js        # Servidor Express
├── package.json     # Dependencias
├── setup.bat        # Instalación (ejecutar 1 vez)
├── start.bat        # Arrancar servidor
├── fotos/           # ← Tus fotos aquí
├── thumbs/          # Thumbnails auto-generados
└── README.md        # Este archivo
```
