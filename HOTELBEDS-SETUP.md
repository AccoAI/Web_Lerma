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

## Uso desde el frontend

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
