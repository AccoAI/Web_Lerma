# Hotelbeds — Checklist de certificación (re-certificación)

Última actualización: **2026-07-20**. Referencia oficial: [Certification process](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/) · [mTLS](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/mutual-authentication/).

**URL base certificación:** `https://web-lerma.vercel.app`

**mTLS (verificado 2026-07-20):** `GET /api/hotelbeds-availability?diagnostic=1` → `mtlsConfigured: true`, host `api-mtls.test.hotelbeds.com`. Status connectivity OK.

---

## Requisitos obligatorios (correo Hotelbeds)

| # | Requisito | Estado | Notas / archivos |
|---|-----------|--------|------------------|
| 1 | Cancelación desde CheckRate / confirmación | **Hecho** | Funnel + voucher desde CheckRate / Booking |
| 2 | Rate comments en todo el flujo | **Hecho** | Tarjetas, funnel y voucher |
| 3 | Facilidades con coste adicional | **Hecho** | `facilitiesWithCharge` (Content API) en UI |
| 4 | Teléfono del hotel en voucher | **Hecho** | Booking / CheckRate / Content API |
| 5 | Especificar filtros implementados | **Hecho (doc)** | Sección «Filtros actuales» + borrador email |
| 6 | Uso obligatorio de RSP | **Hecho** | `sellingRate` en UI y voucher |
| 7 | Dirección completa en voucher | **Hecho** | Booking / CheckRate / Content API |
| 8 | Edades de niños en voucher | **Hecho** | Funnel → paxes → voucher |
| 9 | Impuestos excluidos por subtipo en voucher | **Hecho (UI)** | Funnel + voucher; falta activar Tax Breakdown en Api Key |
| 10 | Precio/cancel/comments desde CheckRate | **Hecho** | CheckRate obligatorio pre-booking |
| 11 | Mapeo ≥90% producto distribuible | **Hecho (dinámico)** | Content API BRG completo; UI preferentes (`displayMaxHotels: 3`) |
| 12 | mTLS en todo el flujo | **Hecho** | Hotel API + Content API; cert en portal + Vercel |

### Recomendados (2026-08-04)

| Ítem | Estado |
|------|--------|
| Imágenes Content | Hecho (Giata + fallback medium) |
| Descripción hotel | Hecho (1–2 líneas en tarjeta compacta) |
| Instalaciones | Hecho (resumen Content + coste adicional) |
| Offers / promotions | Hecho (bloque junto a cada tarifa) |
| Cancelación Apitude | Hecho (DELETE proxy + `/hotelbeds-cancel.html`) |

---

## Tareas técnicas restantes

- [x] **UI niños:** contador + edades en funnel → `hb_children_ages` / booking paxes
- [x] **Content fallback:** teléfono/dirección (`lib/hotelbeds-content-contact.js`)
- [x] **Vercel:** `HOTELBEDS_MTLS_CERT` + `HOTELBEDS_MTLS_KEY` (verificado diagnostic 2026-07-20)
- [ ] **Prueba E2E:** availability → CheckRate → booking → voucher email con todos los campos (recomendado antes/durante revisión HB)
- [ ] **Actualizar** `HOTELBEDS-CERTIFICATION.md` (borradores email desactualizados)

---

## Filtros actuales (para respuesta a Hotelbeds)

| Filtro | Valor |
|--------|-------|
| Destino API | `BRG` (Burgos) |
| Whitelist preferente (UI) | `BRG_HOTEL_CODES` (~26 hoteles; orden de venta) |
| Mapeo técnico certificación | Todos los hoteles BRG de Content API; los no preferentes van al final (`__HB_COVERAGE_CODES__`) |
| Máx. tarjetas visibles | `displayMaxHotels: 3` (solo los primeros preferentes con disponibilidad) |
| Categoría / precio / tipo alojamiento | No filtrado en UI (pendiente si lo exigen) |
| `sourceMarket` | No enviado |

---

## Archivos modificados en esta iteración

- `js/hotelbeds-paquetes.js` — RSP, condiciones siempre visibles, CheckRate → voucher
- `lib/hotelbeds-booking-map.js` — impuestos excluidos, enrich CheckRate, cancelación
- `lib/hotelbeds-voucher-html.js` — sección impuestos, RSP, metadata Stripe
- `api/hotelbeds-availability.js` — merge `checkrateSnapshot`
- `api/hotelbeds-list-hotels.js` — mTLS Content API
- `lib/hotelbeds-content-contact.js` — fetch Content API contacto (teléfono, dirección)
