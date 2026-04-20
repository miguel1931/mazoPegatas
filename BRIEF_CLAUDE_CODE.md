# mazoPegatas — Brief para Claude Code (v2)

**Repo:** `mazo-pegatas` (Vercel · estático)
**URL actual:** https://mazo-pegatas.vercel.app/
**Stack:** HTML estático + CSS + JS vanilla. Sin backend, sin build.
**Estética:** Keith Haring × Basquiat × OBEY · colores planos, bordes gruesos, tipografía bold, look fanzine.

---

## 🎯 Objetivo

1. **Mejorar el muro** (`index.html`) — más vivo, menos cuadrícula.
2. **Nueva sección: mapa geográfico** (`mapa.html`) — fotos reales de pegatinas pegadas en Madrid, **geolocalizadas por EXIF**, unidas en **rutas** ordenadas por timestamp.
3. **Admin local** (`admin.html`) — herramienta client-side que lee EXIF de fotos subidas, genera el bloque JSON listo para commitear al repo.

Filosofía: la pegatina es un acto. El mapa documenta el acto. Cada ruta es una salida a la calle.

---

## Decisiones técnicas fijadas

| Decisión | Valor | Implicación |
|---|---|---|
| Persistencia | Repo Git (JSON + imgs en `img/rutas/`) | Sin BD. Cada cambio es un commit. |
| Captura de rutas | **EXIF de las fotos** (GPS + DateTime) | No hay tracking ni GPX. Ruta = fotos ordenadas por fecha. |
| Librería de mapas | **MapLibre GL JS** + tiles OSM | Vectorial, moderno, gratis. CDN. |
| Auth del admin | **Ninguna** (local-only) | Admin no se despliega en prod. Corre en `localhost` y genera JSON. Alternativa: deploy con `robots.txt` disallow + URL oscura. |

---

## 1. Mejoras del muro (`index.html`)

Sin cambios respecto al brief anterior. Resumen:

- **Stagger de entrada** (50–80ms) + rotación aleatoria ligera (±4deg) al caer.
- **Rotación persistente sutil** (±3deg) manteniendo look callejero.
- **Hover**: scale 1.04 + sombra dura desplazada 4px estilo OBEY.
- **Refresh**: fade out escalonado → shuffle → fade in. No destructivo.
- **Contador** discreto inferior: "N pegatinas en este muro".
- **Accesibilidad**: aria-labels, focus visible, tab/Enter/Esc.
- **Lightbox mejorado**: nombre + autor + navegación con flechas ← →.

No tocar la paleta ni la tipografía. Nada de gradientes suaves ni blur moderno.

---

## 2. Sección mapa (`mapa.html`)

### Concepto

Mapa real de Madrid (MapLibre GL + tiles OSM). Encima se dibujan:

- **Rutas** (polylines) — cada ruta es una salida a pegar pegatinas. Uniendo los puntos GPS de sus fotos, ordenadas por timestamp.
- **Marcadores** — uno por foto. Click → popup con miniatura + metadatos. Click en popup → lightbox grande.

### Estilo del mapa

El tile base debe sentirse al espíritu de la web, no a Google Maps genérico. Opciones por preferencia:

1. **Stamen Toner** (blanco y negro duro) — `https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png` — encaja con estética fanzine y con bordes Basquiat.
2. **CartoDB Positron** — limpio, gris claro, deja respirar los colores de las rutas.
3. **OSM default** — último recurso.

Arrancar con Stamen Toner. Fácil de cambiar editando una sola URL.

**Rutas coloreadas**: cada ruta tiene un color de la paleta (rojo Haring, amarillo Basquiat, azul OBEY, verde, naranja, negro). Trazo grueso (6px), opacidad 0.9, línea dura (sin gradientes).

**Marcadores**: círculos planos de color negro con borde blanco grueso (3px). Al hacer hover, crecen ligeramente.

### Estructura de datos — `data/rutas.json`

```json
{
  "rutas": [
    {
      "id": "2026-04-14-centro-proyecto1931",
      "titulo": "14 de abril · vuelta por el Centro",
      "fecha": "2026-04-14",
      "color": "#E63946",
      "nota": "primera salida tras Proyecto 1931 Fase 0",
      "fotos": [
        {
          "src": "img/rutas/2026-04-14-centro-proyecto1931/01.jpg",
          "thumb": "img/rutas/2026-04-14-centro-proyecto1931/01-thumb.jpg",
          "lat": 40.4168,
          "lng": -3.7038,
          "timestamp": "2026-04-14T23:12:04+02:00",
          "pegatina": "Radiant Baby",
          "autor": "Haring",
          "lugar": "Calle Mayor, 12",
          "nota": "farola, lado norte"
        }
      ]
    }
  ]
}
```

**La ruta se dibuja uniendo `fotos[].lat/lng` en orden de `timestamp` ascendente.** No hay un array separado de puntos de ruta — la ruta *es* la secuencia de fotos.

Campos opcionales: `nota`, `lugar`, `pegatina`, `autor`. Obligatorios: `src`, `lat`, `lng`, `timestamp`.

### Interacción

**Vista inicial**: mapa centrado en Madrid (lat 40.4168, lng -3.7038, zoom 13). Se dibujan **todas las rutas** simultáneamente, cada una con su color.

**Panel lateral derecho** (desktop) o **bottom sheet** (móvil):

- Lista de rutas, cada una como fila con: color, título, fecha, nº de fotos.
- Click en ruta → el mapa hace fit-bounds a esa ruta, el resto se atenúa (opacity 0.25). En el panel se expande la ruta mostrando miniaturas de sus fotos.
- Click en miniatura → mapa vuela al marcador correspondiente + abre popup + lightbox.
- Botón "ver todas" para resetear.

**Lightbox**: foto grande, metadatos abajo (pegatina, autor, lugar, fecha, nota). Flechas ← → para navegar dentro de la ruta. Esc cierra.

**Hover en marcador**: resalta esa foto en el panel lateral (scroll-into-view suave).

**Filtros** (opcional MVP, chulo luego):

- Por autor de pegatina (Haring / Basquiat / Fairey / ...)
- Por mes
- Rango de fechas

---

## 3. Admin (`admin.html`)

### Filosofía

**No se despliega en producción.** Es una herramienta que corre en local (`npx serve .` o similar). Genera el bloque JSON y el lote de imágenes procesadas, listos para copiar al repo y commitear.

Opcionalmente, se puede desplegar como `admin.html` protegido por `robots.txt` disallow + URL no enlazada desde ningún sitio. Pero el admin **nunca escribe en prod** — solo genera artefactos descargables.

### Flujo de uso

1. Usuario abre `admin.html` en local.
2. **Paso 1 — Nueva ruta**: formulario con `titulo`, `fecha`, `color` (picker de paleta), `nota`.
3. **Paso 2 — Subir fotos**: drag-and-drop múltiple (o input file con `multiple accept="image/*"`).
4. **Paso 3 — Procesamiento automático en navegador**:
   - Por cada foto: leer **EXIF** (lib: `exifr` via CDN) → extraer `GPSLatitude`, `GPSLongitude`, `DateTimeOriginal`.
   - Si falta GPS o fecha → mostrar fila en rojo con opción de rellenar a mano (input lat/lng, input datetime) o marcar punto en mini-mapa.
   - Generar **thumbnail** (canvas, ~400px lado mayor, JPEG calidad 0.85).
   - Generar **versión web** (canvas, ~1600px lado mayor, JPEG calidad 0.85). La original no se sube al repo — pesa demasiado.
   - Renombrar: `NN.jpg` y `NN-thumb.jpg` donde NN es el orden por timestamp.
5. **Paso 4 — Preview**:
   - Mini-mapa con la ruta dibujada y los marcadores.
   - Lista de fotos editables: por cada una, poder ajustar `pegatina`, `autor`, `lugar`, `nota`.
6. **Paso 5 — Exportar**:
   - Botón "Descargar lote" → genera un **ZIP** (lib: `JSZip` via CDN) con:
     - `rutas-fragment.json` — el bloque JSON a pegar en `data/rutas.json`
     - Carpeta `img/rutas/{ruta-id}/` con todas las imágenes procesadas (web + thumb)
     - `README.txt` con instrucciones de merge: "copia la carpeta img/ al repo, mergea el JSON fragment en data/rutas.json"
   - Botón "Copiar JSON al portapapeles" para el caso rápido sin ZIP.

### UI del admin

Mismo lenguaje visual pero en modo "taller": fondo más oscuro, acentos cian/magenta, tipografía mono. Que se sienta claramente como backstage, no como la web pública.

### Edge cases a manejar

- Fotos sin EXIF GPS → permitir marcar punto en mini-mapa + guardar.
- Fotos sin fecha → permitir input manual; si quedan en blanco, orden manual por drag-and-drop.
- Timestamps con zona horaria rara → normalizar todo a ISO 8601 con offset de Madrid (+01:00 o +02:00 según DST).
- Fotos HEIC (iPhone) → avisar al usuario que convierta a JPEG antes (o usar `heic2any` si da tiempo).
- Coordenadas claramente fuera de Madrid → warning amarillo (no bloquear, solo avisar).

---

## 4. Librerías externas (CDN, sin npm)

| Librería | Uso | CDN |
|---|---|---|
| MapLibre GL JS | Mapa vectorial | `https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js` + CSS |
| exifr | Leer EXIF GPS/fecha | `https://cdn.jsdelivr.net/npm/exifr/dist/full.umd.min.js` |
| JSZip | Generar ZIP de exportación | `https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js` |
| heic2any *(opcional)* | Convertir HEIC en admin | `https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js` |

Todo cargado desde CDN con `<script>`. Sin bundler, sin package.json nuevo.

**Importante**: MapLibre y exifr solo se cargan en las páginas que los necesitan (`mapa.html` y `admin.html` respectivamente). El muro y el catálogo no arrastran peso innecesario.

---

## 5. Estructura de archivos

```
/
├── index.html              ← muro (mejorado)
├── catalogo.html           ← sin cambios
├── mapa.html               ← NUEVA
├── admin.html              ← NUEVA (solo local / no linkeada)
├── robots.txt              ← Disallow: /admin.html
├── css/
│   ├── base.css
│   ├── muro.css
│   ├── catalogo.css
│   ├── mapa.css
│   └── admin.css
├── js/
│   ├── muro.js
│   ├── catalogo.js
│   ├── mapa.js
│   └── admin.js
├── data/
│   └── rutas.json
├── img/
│   ├── pegatinas/
│   └── rutas/
│       └── {ruta-id}/
│           ├── 01.jpg
│           ├── 01-thumb.jpg
│           ├── 02.jpg
│           └── 02-thumb.jpg
```

---

## 6. Criterios de "hecho"

**Muro**:
- [ ] Stagger + rotación al cargar.
- [ ] Hover con sombra dura.
- [ ] Refresh con fade (no reset duro).
- [ ] Contador visible.
- [ ] Lightbox con navegación por flechas/teclado.

**Mapa**:
- [ ] `mapa.html` con MapLibre + tiles Stamen Toner.
- [ ] Carga `data/rutas.json` vía fetch.
- [ ] Dibuja todas las rutas como polylines coloreadas.
- [ ] Marcadores por cada foto, con popup.
- [ ] Panel lateral con lista de rutas → expand con miniaturas.
- [ ] Click en ruta hace fit-bounds y atenúa las demás.
- [ ] Lightbox con navegación dentro de la ruta.
- [ ] Responsive: bottom sheet en móvil.

**Admin**:
- [ ] `admin.html` corre en local, lee fotos, extrae EXIF.
- [ ] Genera thumbnails + versión web en cliente (canvas).
- [ ] Preview en mini-mapa con ruta dibujada.
- [ ] Edición inline de metadatos por foto.
- [ ] Exporta ZIP con JSON + imágenes procesadas.
- [ ] Maneja fotos sin GPS (input manual o click en mapa).
- [ ] `robots.txt` con disallow de `admin.html`.

**Global**:
- [ ] Navegación 3 pestañas (Muro · Catálogo · Mapa) con estado activo. Admin no en el header.
- [ ] Responsive hasta 375px.
- [ ] Accesibilidad básica.
- [ ] Sin npm / sin build.

---

## 7. Tono y microcopy

Español, minúsculas, frases cortas, fanzine.

- Header mapa: "dónde han caído"
- Ruta sin fotos todavía: "en preparación"
- Empty state: "aún no hay rutas"
- Admin header: "taller · mazoPegatas"
- Admin export: "descarga el lote y comitea"
- Footer mapa: "cada foto es un acto · cada ruta una salida"

---

## 8. Privacidad de las fotos

Las fotos pegadas en calle pueden contener:

- **Caras de peatones** → blurrear en admin antes de exportar (opcional MVP, importante luego).
- **Matrículas de coches** → idem.
- **Direcciones precisas** que revelen rutinas → el admin debe permitir **ofuscar lat/lng** redondeando a 3 decimales (precisión ~100m) si se activa un toggle "modo discreto" por ruta.

Añadir al admin: toggle por ruta "ofuscar ubicaciones (±100m)". Cuando esté activo, las coords guardadas en el JSON se redondean.

---

## 9. Fuera de scope

- Backend / base de datos.
- Auth real del admin (va local).
- Subida desde el navegador directo al repo (habría que meter GitHub API + token → complejidad y riesgo).
- PWA offline.
- Filtros avanzados (por ahora solo lista cronológica).
- Stats / heatmap de intensidad por barrio (chulo para v3).

---

## 10. Primer commit sugerido

1. **Refactor** de CSS/JS a la estructura propuesta, sin cambiar comportamiento del muro y catálogo.
2. **Muro mejorado** (stagger, rotación, hover, refresh con fade, lightbox navegable).
3. **Scaffold de mapa**: `mapa.html` con MapLibre + Stamen Toner, una ruta demo hardcoded en `data/rutas.json` con 2-3 fotos dummy para validar el render.
4. **Admin MVP**: drag-drop de fotos, lectura EXIF, generación de thumbnails, export JSON (sin ZIP todavía, sólo copy-to-clipboard).
5. **Navegación global** actualizada, `robots.txt` con disallow admin.

De ahí se itera:
- ZIP de export con imágenes procesadas.
- Modo ofuscación de coords.
- Filtros por autor/fecha.
- Conversión HEIC.
- Blur automático de caras/matrículas.

---

## 11. Notas de arquitectura

- **Data flow de producción**: admin local → ZIP → descomprimir → `cp` al repo → `git commit` → push → Vercel deploy. Flujo deliberadamente artesanal, encaja con el tono callejero.
- **Orden de fotos en ruta**: siempre por `timestamp` ascendente al renderizar. El campo `NN` del filename es por conveniencia humana, no por lógica de app.
- **IDs de ruta**: formato `YYYY-MM-DD-zona-slug`. Generados por el admin, editables antes de exportar.
- **Caching**: `data/rutas.json` sin cache-busting agresivo. Cuando se actualiza, Vercel invalida. Si hace falta forzar, añadir `?v={hash}` en fetch.

---

**FOC I FERRO, CARN I CODI.**
