# Amadeus: precios en tiempo real sin salir de la página

Con Amadeus los usuarios ven precios reales en la sección Alojamiento, el total del resumen se calcula con esos importes y la reserva del paquete se hace en tu web (Stripe), sin ir a Booking.com.

## Variables en Vercel

En **Vercel → Settings → Environment Variables** añade:

| Variable | Descripción |
|----------|-------------|
| `AMADEUS_CLIENT_ID` | API Key de [developers.amadeus.com](https://developers.amadeus.com/) |
| `AMADEUS_CLIENT_SECRET` | API Secret |
| `AMADEUS_ENV` | Opcional: `production` para API producción (por defecto test) |

## Códigos de hotel (Amadeus hotelId)

Cada hotel que quieras mostrar debe tener su **Amadeus hotelId**. Obtén los IDs así:

1. **Burgos**: `GET https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=RGS` (necesitas token OAuth).
2. **Lerma** (sin IATA): `GET .../by-geocode?latitude=42.0261&longitude=-3.7542&radius=20&radiusUnit=KM`.

Crea una variable por hotel en Vercel:

| Variable | Ejemplo (sustituir por el ID real) |
|----------|-------------------------------------|
| `AMADEUS_HOTEL_ALISA` | Código Amadeus del Hotel Alisa |
| `AMADEUS_HOTEL_CERES` | Código del CERES |
| `AMADEUS_HOTEL_PARADOR` | Parador de Lerma |
| `AMADEUS_HOTEL_SILKEN` | Silken Burgos |
| `AMADEUS_HOTEL_PALACIO_BLASONES` | Palacio de los Blasones |
| `AMADEUS_HOTEL_CENTRO` | Hotel Centro |

Alternativamente puedes editar el mapeo en `api/amadeus-availability.js` (objeto `OUR_ID_TO_AMADEUS`).

## Probar la API

```bash
curl -X POST https://tu-dominio.vercel.app/api/amadeus-availability \
  -H "Content-Type: application/json" \
  -d '{"checkIn":"2025-03-15","checkOut":"2025-03-17","hotelIds":["alisa","parador"]}'
```

Estado de configuración:

```bash
curl https://tu-dominio.vercel.app/api/amadeus-availability
```

## Flujo en la web

1. El usuario elige fechas y noches en el configurador.
2. Se llama a `/api/amadeus-availability` con esas fechas y los hoteles seleccionados (o todos).
3. Se muestran los precios por noche en la misma página.
4. El **total del resumen** usa esos precios (`LIVE_HOTEL_PRICES`).
5. Al pulsar **Reservar Paquete** se paga con Stripe; el usuario no sale de tu sitio.

Si Amadeus no está configurado o falla, se intenta Hotelbeds (si tienes códigos) y, si no, se muestra el enlace a Booking.com.
