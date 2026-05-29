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

1. Burgos / zona (código destino API **1–3 caracteres**): `GET .../api/hotelbeds-list-hotels?destination=BRG`
2. No usar `BUR2` en Availability ni listados: la Hotel API devuelve **400** (*destination.code size must be between 1 and 3*). Para más cobertura geográfica, usar **códigos de hotel** concretos en `precios-data.js` / Content API.
3. Paginación: `?destination=BRG&from=1&to=100`

La respuesta incluye `{ hotels: [ { code, name, city, ... } ] }`. Busca por nombre (Alisa, Parador, Silken, Landa, etc.) y anota el `code`.

4. Añade cada código en `js/precios-data.js`:
   ```javascript
   { id: 'alisa', nombre: 'Hotel Alisa', precioPorNoche: 65, hotelbedsCode: '12345' },
   ```
   O en `js/hotelbeds-config.js`:
   ```javascript
   hotelCodes: { alisa: '12345', ceres: '67890', ... }
   ```

## mTLS (certificado de cliente)

Hotelbeds exige **mTLS** para disponibilidad, booking, checkrate, etc. ([documentación](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/mutual-authentication/)).

### No sirve un certificado autofirmado

**No uses** `openssl req -x509` (certificado generado en local). El portal devuelve *certificate not authorised* porque solo acepta certificados de **cliente** emitidos por una **CA pública** del [programa Mozilla Root CA](https://wiki.mozilla.org/CA) (Sectigo, DigiCert, GlobalSign, etc.).

El par `hotelbeds-mtls.crt` / `hotelbeds-mtls.key` creado con OpenSSL en el proyecto **no se puede subir** a Hotelbeds. Hay que comprar o solicitar un certificado de **client authentication** a una CA.

### Pasos (cuando tengáis el certificado de la CA)

1. [developer.hotelbeds.com](https://developer.hotelbeds.com) → **MY API CERTIFICATES** → **Add Certificate** → subir solo el `.crt` / `.pem` **público** (no la clave privada).
2. Asociar el certificado a vuestra **Api Key** (test o producción).
3. En **Vercel** → Environment Variables:
   - `HOTELBEDS_MTLS_CERT` — PEM del certificado (una línea con `\n` entre líneas, o multilínea según el panel).
   - `HOTELBEDS_MTLS_KEY` — clave privada que os entregó la CA (**nunca** en git; ya están en `.gitignore`).
4. `HOTELBEDS_ENV`:
   - vacío o distinto de `production` → test (`api.test.hotelbeds.com` o `api-mtls.test.hotelbeds.com` si hay cert mTLS).
   - `production` → producción (`api-mtls.hotelbeds.com` con cert mTLS).

PowerShell para copiar a Vercel (sustituir nombres de archivo por los de la CA):

```powershell
(Get-Content tu-certificado-de-ca.crt -Raw) -replace "`r`n","\n" -replace "`n","\n"
(Get-Content tu-clave-privada.key -Raw) -replace "`r`n","\n" -replace "`n","\n"
```

### Comprobar configuración en despliegue

`GET /api/hotelbeds-availability?diagnostic=1` devuelve `mtlsConfigured` y `hotelbedsHost`.

### Reconfirmaciones

Push URL: `https://<tu-dominio>/api/hotelbeds-reconfirmation`. Hotelbeds las activa al pasar a **live** (en test pueden estar configuradas pero inactivas).

## Frontend: `hotelbeds-paquetes.js`

### Lista de hoteles Burgos (BRG)

En `js/hotelbeds-paquetes.js`, array **`BRG_HOTEL_CODES`**: pool de hoteles Burgos admitidos, **ordenados por prioridad** (arriba = más preferido). Una petición availability con todos los códigos; se muestran hasta **`HB_DISPLAY_MAX`** (3) **con tarifas**, respetando ese orden. Sin stock → no se muestran. Solo entran hoteles listados en el array.

Orden por defecto:

| Prioridad | Código | Nombre |
|-----------|--------|--------|
| 1 | `87356` | Silken Gran Teatro |
| 2 | `23103` | NH Collection Palacio de Burgos |
| 3 | `934` | Hotel Maria Luisa |
| 4 | `1882` | Abba Burgos |
| 5 | `1021767` | Apartamentos El Cid |
| 6 | `4177` | Crisol Meson del Cid |

Opcional por página:

```javascript
window.HOTELBEDS_PAGE = {
  brgHotelCodes: ['87356', '23103', '934', '1882', '1021767', '4177'],
  displayMaxHotels: 3,
};
```

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
