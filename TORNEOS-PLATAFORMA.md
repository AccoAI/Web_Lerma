# Plataforma de torneos – Instrucciones para subir torneos a la web

La web muestra el **popup de “Próximos torneos”** en la portada y la **lista del Calendario de Torneos** usando un único dato: el JSON de torneos. Tu plataforma (código aparte) solo tiene que generar o servir ese JSON con el formato indicado.

---

## 1. Formato del JSON (esquema)

El archivo que consume la web tiene esta estructura. Puedes generar exactamente esto desde tu plataforma.

```json
{
  "popupActivo": true,
  "titulo": "Nombre del torneo destacado",
  "subtitulo": "Saldaña Golf | 20.3.2026",
  "imagen": "FOTOS/torneo_imagen.png",
  "texto": "Información del torneo en una o más líneas.\nSaltos con \\n.",
  "linkTexto": "Más información",
  "linkUrl": "calendario-torneos.html",
  "torneos": [
    {
      "titulo": "Otro torneo",
      "fechas": "15.6.2026",
      "descripcion": "Breve descripción opcional",
      "enlace": "configurador-torneos.html"
    }
  ]
}
```

### Campos

| Campo | Obligatorio | Uso |
|-------|-------------|-----|
| `popupActivo` | Sí | `true` = mostrar popup en portada; `false` = no mostrar. |
| `titulo` | Para popup | Título del torneo destacado (el que se anuncia en el popup). |
| `subtitulo` | Opcional | Línea bajo el título (ej. "Saldaña Golf \| 20.3.2026"). Se usa también en el calendario para la fecha. |
| `imagen` | Opcional | Ruta de la imagen (relativa a la web, ej. `FOTOS/torneo_xxx.png`). |
| `texto` | Opcional | Texto largo del torneo; saltos de línea con `\n`. |
| `linkTexto` | Con `linkUrl` | Texto del botón/enlace (ej. "Más información"). |
| `linkUrl` | Con `linkTexto` | URL de destino del enlace (relativa o absoluta). |
| `torneos` | Opcional | Array de torneos adicionales para la lista del popup y del Calendario. |

### Cada elemento de `torneos[]`

| Campo | Uso |
|-------|-----|
| `titulo` | Nombre del torneo. |
| `fechas` | Texto de fecha (ej. "15.6.2026" o "1-2 junio 2026"). Si es "D.M.AAAA", el calendario marcará ese día. |
| `descripcion` | Opcional. Texto corto. |
| `enlace` | URL a la que lleva el torneo (ej. página de inscripción o `configurador-torneos.html`). |

- El **popup** muestra: título, subtítulo, imagen, texto y enlace del objeto principal; si hay `torneos[]`, además una lista de enlaces con título/fechas/descripcion.
- La **página Calendario de Torneos** muestra: el torneo destacado (titulo + subtitulo + linkUrl) como primer ítem, y luego todos los de `torneos[]`.

---

## 2. Cómo “subir” los torneos a la web

Tienes dos formas; la que elijas depende de dónde vivan los datos en tu plataforma.

### Opción A: Tu plataforma sirve el JSON por URL

1. En tu plataforma, al crear/editar un torneo, generas un JSON con el formato anterior (un “torneo destacado” + opcionalmente más en `torneos[]`).
2. Ese JSON se sirve en una URL pública, por ejemplo:
   - `https://tu-plataforma.com/api/torneos.json`, o
   - Un blob/Storage (Vercel Blob, S3, etc.) con URL pública.
3. En la web (ver más abajo) configuras esa URL. La web hará `fetch` a esa URL en la portada (popup) y en la página del Calendario de Torneos.

Ventaja: no tocas el repositorio de la web al publicar un torneo; solo tu plataforma actualiza el JSON en esa URL.

### Opción B: Sustituir el archivo en el repo y desplegar

1. Tu plataforma genera el JSON con el formato anterior.
2. Escribes (o reemplazas) el archivo `data/torneos-popup.json` en el repositorio de la web con ese contenido.
3. Subes también la imagen si usas una nueva (ej. en `FOTOS/`).
4. Haces commit y push; Vercel (o tu hosting) despliega y la web usa el nuevo JSON.

Ventaja: no hace falta configurar ninguna URL en la web; sigue leyendo `data/torneos-popup.json` como ahora.

---

## 3. Configurar la web para leer una URL (Opción A)

Si usas la Opción A, la web debe leer el JSON desde tu URL en lugar del archivo local. Para eso se usa una variable global **antes** de cargar los scripts del popup y del calendario.

En **index.html** (para el popup) y en **calendario-torneos.html** (para la lista del calendario), añade justo antes de cargar `torneos-popup.js` / `calendario-torneos.js`:

```html
<script>
  window.TORNEOS_POPUP_DATA_URL = 'https://tu-plataforma.com/api/torneos.json';
</script>
```

- Si `TORNEOS_POPUP_DATA_URL` está definida, el popup y el calendario pedirán el JSON a esa URL.
- Si no está definida, se sigue usando `data/torneos-popup.json` (comportamiento actual).

Así puedes desarrollar la plataforma en código aparte y, cuando esté lista, solo configurar esta URL (por ejemplo en un build o en un CMS).

---

## 4. Imágenes

- Si usas **Opción A** (URL del JSON): las imágenes pueden ser:
  - URLs absolutas en `imagen` (ej. `https://tu-plataforma.com/uploads/torneo_1.png`), o
  - Rutas relativas a la web actual (ej. `FOTOS/torneo_1.png`) si subes las fotos al repo.
- Si usas **Opción B**: las imágenes suelen estar en la web (ej. `FOTOS/`) y en `imagen` pones la ruta relativa (ej. `FOTOS/torneo_1.png`).

---

## 5. Resumen para tu plataforma (código aparte)

1. Definir en tu plataforma un “torneo destacado” (el del popup) y, opcionalmente, una lista de torneos.
2. Generar siempre un JSON con el esquema de arriba (`popupActivo`, `titulo`, `subtitulo`, `imagen`, `texto`, `linkTexto`, `linkUrl`, `torneos[]`).
3. Según el caso:
   - **Opción A**: Exponer ese JSON en una URL y configurar `window.TORNEOS_POPUP_DATA_URL` en la web.
   - **Opción B**: Escribir `data/torneos-popup.json` en el repo (y subir imágenes si aplica) y desplegar.

Con eso, el popup y el calendario se comportan igual que ahora: mismo diseño, mismo “No volver a mostrar hoy”, misma lista en el Calendario de Torneos.
