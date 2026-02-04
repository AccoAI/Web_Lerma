/**
 * Lista hoteles por destino.
 * Por defecto usa Availability API (devuelve hoteles con precios y nombres correctos).
 *
 * GET /api/hotelbeds-list-hotels?destination=BUR
 * GET /api/hotelbeds-list-hotels?destination=BUR2
 * GET /api/hotelbeds-list-hotels?destination=BUR&checkIn=2026-03-15&checkOut=2026-03-17
 *
 * source=content -> Content API (puede devolver nombres vacíos en test)
 * source=availability (por defecto) -> Availability API con fechas futuras
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

function getFutureDates() {
  const d = new Date();
  d.setMonth(d.getMonth() + 4);
  const checkIn = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 2);
  const checkOut = d.toISOString().slice(0, 10);
  return { checkIn, checkOut };
}

async function fetchFromAvailability(apiKey, secret, dest, checkIn, checkOut, baseUrl) {
  const payload = {
    stay: { checkIn, checkOut },
    occupancies: [{ rooms: 1, adults: 2, children: 0 }],
    destination: { code: dest },
  };

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
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));

  const hotels = (data.hotels && data.hotels.hotels) || [];
  const getStr = (v) => (typeof v === 'string' ? v : (v && v.content) ? v.content : '');
  return {
    list: hotels.map((h) => ({
      code: h.code,
      name: getStr(h.name) || getStr(h.description) || (h.description && h.description.content) || 'Hotel ' + h.code,
      city: getStr(h.destinationName) || getStr(h.city) || (h.address && getStr(h.address.city)) || '',
      minRate: h.minRate,
      currency: h.currency || 'EUR',
    })),
    rawHotels: hotels.slice(0, 3),
  };
}

async function fetchFromContent(apiKey, secret, dest, country, from, to, lang, baseUrl) {
  const params = new URLSearchParams({
    destinationCode: dest,
    countryCode: country,
    from,
    to,
    fields: 'all',
    language: lang,
  });
  const res = await fetch(`${baseUrl}/hotel-content-api/1.0/hotels?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Api-Key': apiKey,
      'X-Signature': getSignature(apiKey, secret),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
  const hotels = Array.isArray(data.hotels) ? data.hotels : [];
  const getStr = (v) => (typeof v === 'string' ? v : (v && v.content) ? v.content : '');
  return {
    list: hotels.map((h) => ({
      code: h.code,
      name: getStr(h.name) || getStr(h.description) || '',
      city: getStr(h.city) || '',
    })),
    rawHotels: hotels.slice(0, 3),
  };
}

export async function GET(request) {
  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
  if (!apiKey || !secret) {
    return jsonResponse({ error: 'Faltan credenciales' }, 500);
  }

  const url = request?.url ? new URL(request.url) : null;
  const dest = url?.searchParams?.get('destination') || 'BUR';
  const source = url?.searchParams?.get('source') || 'availability';
  const filterSpain = url?.searchParams?.get('filter') !== 'none';
  const raw = url?.searchParams?.get('raw') === '1';
  const checkIn = url?.searchParams?.get('checkIn') || '';
  const checkOut = url?.searchParams?.get('checkOut') || '';
  const country = url?.searchParams?.get('countryCode') || 'ES';
  const from = url?.searchParams?.get('from') || '1';
  const to = url?.searchParams?.get('to') || '100';
  const lang = url?.searchParams?.get('language') || 'CAS';

  const baseUrl = process.env.HOTELBEDS_ENV === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';

  const esZonaBurgos = (h) => {
    const s = ((h.name || '') + ' ' + (h.city || '')).toUpperCase();
    return /BURGOS|LERMA|SALDAÑA|ARANDA|MIRANDA|BRIVIESCA|09\d{3}/.test(s) || s.includes('PARADOR') || s.includes('ALISA') || s.includes('SILKEN') || s.includes('LANDA');
  };

  try {
    let result;
    if (source === 'content') {
      result = await fetchFromContent(apiKey, secret, dest, country, from, to, lang, baseUrl);
    } else {
      const dates = checkIn && checkOut ? { checkIn, checkOut } : getFutureDates();
      result = await fetchFromAvailability(apiKey, secret, dest, dates.checkIn, dates.checkOut, baseUrl);
    }
    let list = result.list;

    if (raw) {
      return jsonResponse({
        rawPrimerosHoteles: result.rawHotels,
        source,
        info: 'Estructura real de Hotelbeds para depurar name/city.',
      });
    }

    if (filterSpain && dest === 'BUR') {
      const before = list.length;
      list = list.filter(esZonaBurgos);
      if (list.length === 0 && before > 0) {
        return jsonResponse({
          hotels: [],
          total: 0,
          destination: dest,
          source,
          aviso: 'BUR devuelve hoteles fuera de Burgos (España). Filtrados. Usa ?filter=none para ver todos y contacta a Hotelbeds por el código correcto para Burgos (ES).',
          nota: 'Puedes añadir códigos manualmente en precios-data.js tras obtenerlos de tu gestor Hotelbeds.',
        });
      }
    }

    return jsonResponse({
      hotels: list,
      total: list.length,
      destination: dest,
      source,
      nota: 'Usa code en precios-data.js. Si BUR no devuelve Burgos ES: contacta Hotelbeds. ?filter=none muestra todos sin filtrar.',
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
