# Integración Hotelbeds

## Variables de entorno en Vercel

Asegúrate de tener estas variables en **Vercel → Settings → Environment Variables**:

| Variable | Valor | Notas |
|----------|-------|-------|
| `HOTELBEDS_API_KEY` | Tu API Key | O `API_Key` si la nombraste así |
| `HOTELBEDS_API_SECRET` | Tu API Secret | O `API_Secret` |
| `HOTELBEDS_ENV` | `production` o vacío | Vacío = entorno test |

La API lee ambos nombres (`HOTELBEDS_*` y `API_Key`/`API_Secret`).

## Probar la API

```bash
curl -X POST https://tu-dominio.vercel.app/api/hotelbeds-availability \
  -H "Content-Type: application/json" \
  -d '{"checkIn":"2025-03-15","checkOut":"2025-03-17","rooms":1,"adults":2}'
```

Con hoteles concretos:

```bash
curl -X POST https://tu-dominio.vercel.app/api/hotelbeds-availability \
  -H "Content-Type: application/json" \
  -d '{"checkIn":"2025-03-15","checkOut":"2025-03-17","hotelCodes":["12345","67890"]}'
```

## Códigos de hoteles (para ofertar hoteles específicos)

Usa la **Content API** para obtener el listado con códigos:

1. Burgos ciudad: `GET .../api/hotelbeds-list-hotels?destination=BUR`
2. Lerma y provincia: `GET .../api/hotelbeds-list-hotels?destination=BUR2`
3. Paginación: `?destination=BUR&from=1&to=100`

La respuesta incluye `{ hotels: [ { code, name, city, ... } ] }`. Busca por nombre (Alisa, Parador, Silken, Landa, etc.) y anota el `code`.

4. Añade cada código en `js/precios-data.js`:
   ```javascript
   { id: 'alisa', nombre: 'Hotel Alisa', precioPorNoche: 65, hotelbedsCode: '12345' },
   ```
   O en `js/hotelbeds-config.js`:
   ```javascript
   hotelCodes: { alisa: '12345', ceres: '67890', ... }
   ```

## mTLS (Producción)

Hotelbeds exige **mTLS** (certificado cliente) para disponibilidad en producción. Con la cuenta de evaluación es posible que aún uses el endpoint estándar.

Si recibes error de certificado:
- Sube tu certificado en [developer.hotelbeds.com](https://developer.hotelbeds.com) → MY API CERTIFICATES
- En Vercel, mTLS con certificados requiere configurar el runtime (Node.js con `https.Agent` y certificados). Contacta a Hotelbeds para alternativas en serverless.

## Frontend: `hotelbeds-paquetes.js`

Las páginas con configurador y alojamiento cargan `js/hotelbeds-config.js` y `js/hotelbeds-paquetes.js`. Antes del script, define opciones si no usas los valores por defecto del fin de semana:

```javascript
window.HOTELBEDS_PAGE = {
  formId: 'tuFormId',
  hotelWrapId: 'configurador-hotel-wrap-…',
  preciosBlockId: 'hotelbeds-precios-block-…',
  bookingWidgetId: 'booking-com-widget-…', // opcional
  linkLermaId: 'booking-link-lerma-…',
  linkBurgosId: 'booking-link-burgos-…',
  onResumen: function () { /* actualizarResumen del paquete */ },
};
```

## Uso desde el frontend (fetch directo)

```javascript
fetch('/api/hotelbeds-availability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    checkIn: '2025-03-15',
    checkOut: '2025-03-17',
    rooms: 1,
    adults: 2,
    hotelCodes: window.HOTELBEDS_CONFIG.getAllHotelCodes(), // o ['code1','code2']
  }),
})
.then(r => r.json())
.then(data => { /* data.hotels, data.error */ });
```

## Certificación Hotelbeds

Borrador de correo y checklist para el proceso con Hotelbeds: ver **[HOTELBEDS-CERTIFICATION.md](./HOTELBEDS-CERTIFICATION.md)**.

## Bono / voucher en el correo (tras el pago)

Tras `checkout.session.completed`, el webhook **`/api/webhook-stripe`** envía el correo de confirmación. Si el **Payment Link** incluye metadata de Hotelbeds (`hb_*`), se **adjunta el bono** (HTML + texto plano) con referencia de reserva, hotel, huéspedes, régimen, observaciones/cancelación y el texto legal tipo certificación §4.5 (*Payable through …, VAT …, Reference …*).

### Variables opcionales (Vercel)

| Variable | Uso |
|----------|-----|
| `HOTELBEDS_VOUCHER_SUPPLIER_NAME` | Nombre del proveedor en el pie legal (por defecto `Hotelbeds`). Ajusta si tu contrato indica otro nombre. |
| `HOTELBEDS_VOUCHER_SUPPLIER_VAT` | NIF/VAT del proveedor en el pie legal (si aplica). |

### Cómo rellenar los datos del bono

1. **Cuando tengas respuesta real de Booking** de Hotelbeds, mapea sus campos al objeto que espera `lib/hotelbeds-voucher-html.js` (o rellena metadata `hb_*` desde tu backend).
2. Hasta entonces, puedes probar enviando **`hotelbedsVoucher`** en el body de **`POST /api/crear-pago`** junto con `amountCents`, `paquete`, etc. Ese objeto se traduce a metadata del enlace de pago (valores truncados a 500 caracteres; comentarios largos pueden partirse en `hb_rate_comments` + `hb_rate_comments_2`).

Campos principales del objeto (inglés o *snake_case* equivalente):

- `bookingReference` (obligatorio), `agencyReference`
- `hotelName`, `hotelAddress` (obligatorios para mostrar el bono), `hotelCategory`, `hotelDestination`, `hotelPhone`
- `checkIn`, `checkOut`, `roomType`, `boardType`
- `leadPaxName`, `additionalPaxNames` (array o `pax_extra` como `"Nombre A|Nombre B"`), `childrenAges` (array o string `"7,10"`)
- `rateComments`, `cancellationSummary`
- `supplierName`, `supplierVat` (si no usas las variables de entorno)
- `packageName` / `package_label` (si no, el webhook usa el nombre del paquete del metadata `paquete`)

Ejemplo mínimo de prueba (solo para test; no uses datos inventados en producción frente a un hotel):

```json
{
  "amountCents": 5000,
  "paquete": "fin-semana",
  "modo": "unico",
  "numParticipantes": 2,
  "hotelbedsVoucher": {
    "bookingReference": "TEST-123456",
    "hotelName": "Hotel Ejemplo",
    "hotelAddress": "Calle Mayor 1, 09001 Burgos",
    "hotelPhone": "+34 947 000 000",
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-03",
    "roomType": "Doble",
    "boardType": "Solo alojamiento",
    "leadPaxName": "Nombre Apellido",
    "rateComments": "Tarifa de ejemplo para certificación."
  }
}
```

Si no hay `hb_booking_ref` + hotel en metadata, el correo sigue siendo solo la confirmación de pago del paquete (comportamiento anterior).
