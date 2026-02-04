/**
 * Lista hoteles por destino usando la Content API de Hotelbeds.
 * GET /api/hotelbeds-list-hotels?destination=BUR
 * GET /api/hotelbeds-list-hotels?destination=BUR2&from=1&to=100
 *
 * Destinos: BUR (Burgos ciudad), BUR2 (Lerma y provincia)
 * Devuelve code, name, city para mapear en precios-data.js
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
  const dest = url?.searchParams?.get('destination') || 'BUR';
  const from = url?.searchParams?.get('from') || '1';
  const to = url?.searchParams?.get('to') || '100';
  const lang = url?.searchParams?.get('language') || 'CAS';

  const baseUrl = process.env.HOTELBEDS_ENV === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';

  const params = new URLSearchParams({
    destinationCode: dest,
    from,
    to,
    fields: 'all',
    language: lang,
  });

  const contentUrl = `${baseUrl}/hotel-content-api/1.0/hotels?${params}`;

  try {
    const res = await fetch(contentUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-Key': apiKey,
        'X-Signature': getSignature(apiKey, secret),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return jsonResponse({
        error: data.error?.message || data.message || JSON.stringify(data),
      }, 500);
    }

    const hotels = Array.isArray(data.hotels) ? data.hotels : [];
    const list = hotels.map((h) => ({
      code: h.code,
      name: h.name || h.description?.content || '',
      city: h.city?.content || h.city || '',
      destinationCode: h.destinationCode || dest,
    }));

    return jsonResponse({
      hotels: list,
      total: list.length,
      destination: dest,
      nota: 'BUR = Burgos ciudad. BUR2 = Lerma y provincia. Usa estos code en precios-data.js (hotelbedsCode).',
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
