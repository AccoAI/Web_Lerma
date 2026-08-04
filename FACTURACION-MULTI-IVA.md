# Facturación multi-IVA (paquetes)

## Modelo

1. **Cobra** siempre **Club de Golf Lerma SA** (A-09115668) vía Stripe.
2. Tras el pago, el webhook envía por email **hasta 3 facturas HTML** (sin SaaS de pago):

| Tramo | Emisor | NIF | IVA | Qué incluye |
|-------|--------|-----|-----|-------------|
| Golf / resto | Club de Golf Lerma SA | A-09115668 | 0 % | Green fees, alquileres, tienda, extras campeonato |
| Comida | LALIATM SL | B-40280422 | 21 % | Menús Casa Club (prepago en pack) |
| Hotel | Hotelbeds Spain SLU | B-28916765 | 10 % | Alojamiento Hotelbeds |

3. El **descuento de pack** se reparte de forma proporcional entre los tres tramos; la suma cuadra con el cobro Stripe.

## Flujo técnico

- Resumen (`js/main.js`) calcula `window.__PACKAGE_FISCAL__` **solo en interno** (no se muestra al cliente en el resumen; así no se revela el tramo hotel en tarifas packaging).
- `js/stripe-pago.js` → `fiscalBreakdown` en `POST /api/crear-pago`
- Metadata Stripe: `inv_golf_cents`, `inv_comida_cents`, `inv_hotel_cents`
- `api/webhook-stripe.js` → `lib/invoice-html.js` adjunta facturas al correo
- **Tax breakdown Hotelbeds** (Resort Fee, City Tax, etc.): va en funnel/voucher junto a la tarifa HB, no en este desglose fiscal.

## Aviso legal / contable (importante)

- Emitir facturas a nombre de **Hotelbeds Spain** y **LALIATM** cuando el dinero entra solo en la cuenta de **Golf Lerma** requiere **autorización / liquidación interna** entre sociedades. Validar con asesoría.
- Estas facturas HTML son un **documento operativo** (numeración `CGL/LAL/HBS-YYYY-sufijoStripe`). Para contabilidad oficial puede hacer falta importarlas o emitirlas desde el software de cada sociedad.
- Si asesoría indica que el hotel al cliente debe facturarlo Golf Lerma (agencia) y no Hotelbeds Spain, basta cambiar el emisor en `lib/invoice-issuers.js`.

## Coste

**0 €** de SaaS: HTML por Resend (ya lo usáis). Sin Holded/Quipu obligatorios.
