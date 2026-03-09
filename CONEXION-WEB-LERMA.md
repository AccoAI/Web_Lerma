# Conexión con la plataforma de torneos (web-lerma.vercel.app)

Guía para que esta web consuma los torneos desde la plataforma desplegada en Vercel.

---

## Comportamiento del popup en este repo

En **esta** web, el popup se muestra cuando la API devuelve `popupActivo: true` y hay **al menos uno** de estos contenidos:

- Lista de torneos (`torneos[]` con elementos)
- Imagen (`imagen`)
- Texto largo (`texto`)
- Enlace con texto (`linkUrl` + `linkTexto`)

Por tanto, **sí es normal** ver solo título + botón (por ejemplo "Próximos torneos" y "Ver calendario") cuando la API devuelve `titulo`, `linkUrl`, `linkTexto` pero `torneos[]` vacío y sin imagen/texto. No significa que la web no esté leyendo de la API.

Si quieres que aparezca la **lista de torneos** en el popup, la API debe devolver el array `torneos` con al menos un elemento (cada uno con `titulo`, `fechas`, `descripcion`, `enlace`).

---

## Comprobar que la API devuelve tus torneos

Abre en el navegador:

```
https://plataforma-torneos-lerma-salda-a.vercel.app/api/torneos.json
```

(sustituye por la URL real de tu proyecto en Vercel si es distinta).

- Si ahí ves tu JSON con `torneos` y los torneos que creaste, la plataforma está bien. Lo que muestre el popup (solo título+botón o lista) depende de ese contenido.
- Si no ves los torneos o el JSON está vacío, el fallo está en la plataforma (persistencia, Blob, etc.).

---

## Cómo usa esta web la API

- **Script:** `js/torneos-popup.js` (en la portada) y `js/calendario-torneos.js` (en la página Calendario de Torneos).
- **URL por defecto:** En ambos scripts está definida `DEFAULT_PLATFORM_URL = 'https://plataforma-torneos-lerma-salda-a.vercel.app/api/torneos.json'`. Si no se define `window.TORNEOS_POPUP_DATA_URL` en el HTML, se usa esa URL.
- **Sobrescribir URL:** En `index.html` o `calendario-torneos.html` puedes poner **antes** del script correspondiente:
  ```html
  <script>window.TORNEOS_POPUP_DATA_URL = 'https://tu-plataforma.vercel.app/api/torneos.json';</script>
  ```

No hay `popup-portada.js` en este proyecto; toda la lógica del popup está en `torneos-popup.js`.

---

## Si la web no parece leer de la plataforma

1. **Comprobar la URL en el código**  
   En este repo la URL por defecto está en `js/torneos-popup.js` y `js/calendario-torneos.js` (`DEFAULT_PLATFORM_URL`). Si tu proyecto en Vercel tiene otra URL (por ejemplo con hash), actualiza esa constante o define `window.TORNEOS_POPUP_DATA_URL` en el HTML.

2. **Comprobar en el navegador**  
   En web-lerma.vercel.app → F12 → pestaña **Network** → recarga la página. Busca la petición a `.../api/torneos.json`. Debe ser 200 y la respuesta debe ser el JSON de la plataforma. Si no aparece la petición, la web desplegada puede ser una versión antigua: haz commit, push y redeploy.

3. **“No volver a mostrar hoy”**  
   El popup no se muestra si el usuario marcó esa opción. Se guarda en **sessionStorage** con la clave `torneosPopupCerrado`. Para probar: F12 → Application → **Session Storage** → borrar esa clave, o abrir en ventana de incógnito. La página **Calendario de Torneos** usa los mismos datos y no depende de esa opción.

4. **Caché**  
   Tras desplegar cambios, haz Ctrl+F5 (o Cmd+Shift+R) para forzar recarga sin caché.

---

## Resumen

| Dónde | Qué hacer |
|-------|-----------|
| **Esta web (Golf Lerma)** | La URL por defecto está en `js/torneos-popup.js` y `js/calendario-torneos.js`. Para otra URL, define `window.TORNEOS_POPUP_DATA_URL` en el HTML antes de cargar esos scripts. Commit, push y redesplegar en Vercel. |
| **Plataforma de torneos** | Asegurar CORS en `/api/torneos.json`, que el JSON tenga el formato de TORNEOS-PLATAFORMA.md y, si aplica, persistencia (p. ej. Vercel Blob). |

Para ver la **lista de torneos** en el popup, la API debe devolver el array `torneos` con al menos un elemento.
