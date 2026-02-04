/**
 * Lista hoteles disponibles en Hotelbeds para un destino/fechas.
 * GET /api/hotelbeds-list-hotels?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&destination=BUR
 * Usa esto para obtener los códigos de Hotelbeds y mapearlos en precios-data.js
 */
import { createHash } from 'crypto';

function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const str = apiKey + secret + ts;
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
  if (!apiKey || !secret) {
    return jsonResponse({ error: 'Faltan credenciales' }, 500);
  }

  const url = request?.url ? new URL(request.url) : null;
  const checkIn = url?.searchParams?.get('checkIn') || '';
  const checkOut = url?.searchParams?.get('checkOut') || '';
  const dest = url?.searchParams?.get('destination') || 'BUR';

  if (!checkIn || !checkOut) {
    return jsonResponse({
      error: 'Usa ?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD',
      ejemplo: '/api/hotelbeds-list-hotels?checkIn=2026-02-15&checkOut=2026-02-17',
    }, 400);
  }

  const baseUrl = process.env.HOTELBEDS_ENV === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';

  const payload = {
    stay: { checkIn, checkOut },
    occupancies: [{ rooms: 1, adults: 2, children: 0 }],
    destination: { code: dest },
  };

  try {
    const res = await fetch(`${baseUrl}/hotel-api/1.0/hotels`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'X-Signature': getSignature(apiKey, secret),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return jsonResponse({ error: data.error?.message || JSON.stringify(data) }, 500);
    }

    const hotels = (data.hotels && data.hotels.hotels) || [];
    const list = hotels.map((h) => ({
      code: h.code,
      name: h.name || h.description?.content,
      category: h.categoryCode,
    }));

    return jsonResponse({ hotels: list, total: list.length });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
