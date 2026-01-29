# Datos editables (torneos popup portada)

## `torneos-popup.json`

Controla el **popup de torneos** que se muestra en la portada de la web.

- **`popupActivo`**: `true` para mostrar el popup, `false` para ocultarlo.
- **`titulo`**: Título del modal.
- **`subtitulo`**: (opcional) Línea bajo el título (ej. "Saldaña Golf | 20.3.2026").
- **`imagen`**: (opcional) Ruta de la imagen (ej. `FOTOS/torneo_grupo_julian.png`). Se muestra bajo el título/subtítulo.
- **`texto`**: (opcional) Texto del torneo. Se respetan saltos de línea. Zona con scroll si es largo.
- **`linkTexto`** y **`linkUrl`**: (opcional) Botón "Más información" u otro; si ambos existen, se muestra el enlace.
- **`torneos`**: Lista de torneos (opcional). Cada uno puede tener:
  - `id`: identificador (opcional).
  - `titulo`: nombre del torneo.
  - `fechas`: texto libre (ej. "15-16 Febrero 2025").
  - `enlace`: URL (ej. `configurador-torneos.html` o `configurador-ryder.html`).
  - `descripcion`: texto corto opcional.

Para **quitar el popup** sin borrar torneos: pon `"popupActivo": false`.

El popup solo se muestra en la **portada** (index). Si el usuario marca "No volver a mostrar hoy", no se vuelve a mostrar hasta el día siguiente.
