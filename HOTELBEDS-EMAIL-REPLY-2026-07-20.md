# Borrador respuesta a Hotelbeds — 2026-07-20

**Asunto:** Re: Certificación Hotelbeds — requisitos pendientes / solicitud de revisión (ADRINOS SL / Golf Lerma)

---

Buenas tardes,

Gracias por el seguimiento y por confirmar la carga correcta del certificado mTLS.

Sí, hemos avanzado en los requisitos obligatorios que indicáis. Os resumimos el estado y os pedimos, si os parece, volver a revisar la integración para validar lo pendiente.

### Requisitos obligatorios — estado

| Requisito | Estado |
|-----------|--------|
| Condiciones de cancelación desde CheckRate / confirmación | Implementado (funnel + voucher) |
| Rate comments en todo el flujo | Implementado (listado, funnel y voucher) |
| Facilidades de hotel/habitación con coste adicional | Implementado (Content API → UI) |
| Teléfono del hotel en el voucher | Implementado |
| Dirección completa del hotel en el voucher | Implementado |
| Edades de los niños en el voucher | Implementado |
| Impuestos excluidos por subtipo + importe | Implementado en voucher |
| Uso de RSP (`sellingRate`) | Implementado (precio mostrado al cliente) |
| Precio, cancelación y rate comments desde CheckRate | Implementado: CheckRate obligatorio inmediatamente antes del booking |
| Mapeo ≥ 90% producto distribuible | Implementado a nivel de destino BRG vía Content API (ver filtros) |
| mTLS en el flujo de reservas | Implementado: certificado en portal + llamadas a `api-mtls.test.hotelbeds.com` |

### Filtros aplicados (obligatorio especificar)

- **Destino API:** `BRG` (Burgos / zona Lerma).
- **Mapeo técnico:** todos los hoteles del destino BRG obtenidos por Content API (cobertura de producto distribuible en ese destino).
- **UI comercial:** whitelist preferente de hoteles para paquetes de golf; se muestran hasta **3** hoteles con disponibilidad en las tarjetas del configurador (el resto queda fuera de la presentación, no del mapeo técnico).
- **No aplicamos** filtros de categoría (estrellas), tipo de alojamiento ni rango de precio en la UI.
- **No enviamos** `sourceMarket` en las peticiones de disponibilidad.

### URLs para revisión

- Base: `https://web-lerma.vercel.app`
- Paquetes / configuradores con alojamiento Hotelbeds:
  - `https://web-lerma.vercel.app/paquete-fin-semana.html`
  - `https://web-lerma.vercel.app/paquete-golf-vino.html`
  - `https://web-lerma.vercel.app/paquete-36-hoyos.html` (alojamiento con exactamente dos fechas de estancia)
  - `https://web-lerma.vercel.app/configurador-ryder.html`
  - `https://web-lerma.vercel.app/configurador-torneos.html`
- Diagnóstico mTLS: `GET https://web-lerma.vercel.app/api/hotelbeds-availability?diagnostic=1`
- Conectividad: `GET https://web-lerma.vercel.app/api/hotelbeds-availability?status=1`

Entorno actual: **test** (`api-mtls.test.hotelbeds.com`). Credenciales solo por canal seguro si las necesitáis de nuevo.

### Recomendaciones (no bloqueantes)

Las recomendaciones (imágenes Content, cancelación desde Apitude, booking list/detail, PULL HCN, multi-room, Exclusive Deal, offers, descarga automática de estáticos) las tenemos en roadmap; no forman parte del alcance mínimo de esta revisión.

Quedamos a vuestra disposición para la re-revisión y para cualquier ajuste que detectéis.

Un saludo,  
Víctor Adrián Lozano  
ADRINOS SL / Golf Lerma  
[tu email / teléfono]

---

## Notas internas (no enviar)

- Diagnostic verificado 2026-07-20: `mtlsConfigured: true`, `credentialsOk: true`, status OK.
- Conviene hacer **una reserva de prueba E2E** el mismo día de la revisión y guardar el voucher PDF/HTML.
- Si piden LIVE: habrá que cambiar `HOTELBEDS_ENV=production` y asociar el cert a la Api Key de producción.
