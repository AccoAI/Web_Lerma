# Hotelbeds + pago: qué hace hoy el código (verificado)

Fecha de revisión: auditoría del repositorio (flujo real vs. texto para certificación / testers).

## Lo que SÍ existe

| Elemento | Detalle |
|----------|---------|
| **Availability (test)** | `POST /api/hotelbeds-availability` → Hotelbeds `…/hotel-api/1.0/hotels`. |
| **Status / conectividad** | `GET /api/hotelbeds-availability?status=1`. |
| **UI precios en paquetes** | `js/hotelbeds-paquetes.js` + páginas con alojamiento. |
| **Pago del paquete** | `js/stripe-pago.js` → `POST /api/crear-pago` → **Stripe Payment Link**; pago único redirige al **hosted checkout de Stripe** (no hay “checkout” propio en vuestra web). |
| **Tras pago** | `api/webhook-stripe.js` en `checkout.session.completed`: correo (Resend) con paquete, importe, participantes; **WhatsApp** opcional. |
| **Voucher Hotelbeds en email** | Solo si la sesión de Stripe lleva **metadata `hb_*`** (rellenable vía `hotelbedsVoucher` en `crear-pago`). El flujo normal del configurador **no envía** esos datos → el correo típico **no** incluye bono HB. |
| **Formato bono** | HTML en el correo (`lib/hotelbeds-voucher-html.js`), no generación automática de **PDF** adjunto. |

## Lo que NO está implementado (no afirmar en mails hasta que exista en código)

| Afirmación frecuente | Realidad |
|----------------------|----------|
| Tras el pago se llama a **`/bookings`** (Hotelbeds) | **No** hay llamada a Booking API en el repo (`grep` sin `bookings` / BookingRQ). |
| Pantalla de confirmación en **vuestra web** con **referencia Hotelbeds** | Tras pagar, el usuario acaba en la **página de éxito de Stripe** (según el Payment Link), no en una URL vuestra con ref. HB. |
| **PDF** con §4.5 automático tras pago | No; solo email HTML si hay metadata `hb_*`. |
| El formulario envía **rateKey** / datos de hotel a Stripe | `crear-pago` solo mete `paquete`, `modo`, `numParticipantes` (+ `torneoTitulo` en torneos). **No** hay `hotelbedsVoucher` desde el front en fin de semana. |

## Detalles UI `paquete-fin-semana.html` (para guías a testers)

- Sección alojamiento: **«3. Alojamiento»** (no «2»).
- Botón de envío: **«Reservar Paquete»** (`btn-reservar-paquete`), no «Reservar ahora».
- Flujo: rellenar fechas → participantes → alojamiento (si 2+ días) → comidas → resumen → **Reservar Paquete** → Stripe.
- Tarjeta de prueba Stripe: **4242 4242 4242 4242** (modo test) es válida si el Payment Link está en **modo test** de Stripe.

## Texto sugerido para responder a Hotelbeds (disponibilidad + pago, sin Booking API)

- Enfocar la prueba en: **proxy de disponibilidad**, **páginas con bloque Hotelbeds**, **pago test del paquete con Stripe**.
- Indicar que la **confirmación de estancia en Hotelbeds (Booking)** está **en roadmap / integración pendiente** o que la revisarán **en fase siguiente**, si aún no está en producción.
- No prometer **logs de `/bookings`** hasta que exista la llamada.
