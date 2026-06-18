# Hotelbeds — Checklist de certificación (re-certificación)

Última actualización: **2026-06-18**. Referencia oficial: [Certification process](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/) · [mTLS](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/mutual-authentication/).

**URL base certificación:** `https://web-lerma.vercel.app`

---

## Requisitos obligatorios (correo Hotelbeds)

| # | Requisito | Estado | Notas / archivos |
|---|-----------|--------|------------------|
| 1 | Cancelación desde CheckRate / confirmación | **Hecho (parcial)** | `cancellationFromRate`, `renderFunnelLegalBlocksHtml`, `enrichVoucherFromCheckrate`, `cancellationSummaryFromBooking` |
| 2 | Rate comments en todo el flujo | **Hecho (parcial)** | Siempre en funnel y tarjetas; voucher + metadata Stripe |
| 3 | Facilidades con coste adicional | **Hecho (parcial)** | `facilitiesWithCharge` en tarjetas y funnel (Content API) |
| 4 | Teléfono del hotel en voucher | **Hecho (parcial)** | Booking + CheckRate + Content API (`enrichVoucherFromContent`) |
| 5 | Especificar filtros implementados | **Hecho (doc)** | Sección «Filtros actuales» en este archivo |
| 6 | Uso obligatorio de RSP | **Hecho** | `rateRspAmount` / `sellingRate` en UI y voucher (`sellingPrice`) |
| 7 | Dirección completa en voucher | **Hecho (parcial)** | Booking + CheckRate + Content API; validar en test real |
| 8 | Edades de niños en voucher | **Hecho (parcial)** | Contador niños + edades en funnel → booking paxes |
| 9 | Impuestos excluidos por subtipo en voucher | **Hecho** | `excludedTaxesFromRate`, sección voucher, `hb_excluded_taxes` |
| 10 | Precio/cancel/comments desde CheckRate | **Hecho (parcial)** | CheckRate obligatorio pre-booking; snapshot → `enrichVoucherFromCheckrate` |
| 11 | Mapeo ≥90% producto distribuible | **Pendiente** | Ampliar `BRG_HOTEL_CODES` / `precios-data.js`; medir cobertura vs Content API |
| 12 | mTLS en todo el flujo | **Hecho (parcial)** | Hotel API + Content API vía `hotelbedsFetch`; **configurar cert en Vercel** |

---

## Tareas técnicas restantes

- [x] **UI niños:** contador + edades en funnel → `hb_children_ages` / booking paxes
- [x] **Content fallback:** teléfono/dirección (`lib/hotelbeds-content-contact.js`)
- [ ] **Vercel:** `HOTELBEDS_MTLS_CERT` + `HOTELBEDS_MTLS_KEY` (PEM con `\n`)
- [ ] **Prueba E2E:** availability → CheckRate → booking → voucher email con todos los campos
- [ ] **Actualizar** `HOTELBEDS-CERTIFICATION.md` (borradores email desactualizados)

---

## Filtros actuales (para respuesta a Hotelbeds)

| Filtro | Valor |
|--------|-------|
| Destino API | `BRG` (Burgos) |
| Whitelist hoteles | `BRG_HOTEL_CODES` (~30 propiedades curadas para golf) |
| Ranking | Preferencia comercial (hoteles asociados al circuito) |
| Máx. tarjetas listadas | `HB_DISPLAY_MAX` |
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
