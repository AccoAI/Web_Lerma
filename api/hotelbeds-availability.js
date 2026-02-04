/**
 * Proxy para Hotelbeds Availability API
 * POST /api/hotelbeds-availability
 * Body: { checkIn, checkOut, rooms, adults, children?, hotelCodes? }
 *
 * Variables de entorno en Vercel: HOTELBEDS_API_KEY, HOTELBEDS_API_SECRET
 * (o API_Key y API_Secret si las nombraste así)
 */
function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const str = apiKey + secret + ts;
  return { signature: sha256Hex(str), timestamp: ts };
}

function sha256Hex(str) {
  const { createHash } = require('crypto');
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

async function fetchAvailability(apiKey, secret, body) {
  const { signature } = getSignature(apiKey, secret);
  const baseUrl = process.env.HOTELBEDS_ENV === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';

  const payload = {
    stay: {
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    },
    occupancies: [{
      rooms: Math.max(1, parseInt(body.rooms, 10) || 1),
      adults: Math.max(1, parseInt(body.adults, 10) || 2),
      children: Math.max(0, parseInt(body.children, 10) || 0),
    }],
  };

  if (body.hotelCodes && Array.isArray(body.hotelCodes) && body.hotelCodes.length > 0) {
    payload.hotels = { hotel: body.hotelCodes.map(String).slice(0, 20) };
  } else if (body.destinationCode) {
    payload.destination = { code: String(body.destinationCode) };
  }

  const res = await fetch(`${baseUrl}/hotel-api/1.0/hotels`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
      'X-Signature': signature,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!res.ok) {
    const errMsg = data.error && data.error.message ? data.error.message : JSON.stringify(data);
    throw new Error(errMsg);
  }

  return data;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  return jsonResponse(
    { error: 'Usa POST con checkIn, checkOut, rooms, adults' },
    400
  );
}

export async function POST(request) {
  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;

  if (!apiKey || !secret) {
    return jsonResponse(
      { error: 'Faltan credenciales Hotelbeds (HOTELBEDS_API_KEY, HOTELBEDS_API_SECRET)' },
      500
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const checkIn = (body.checkIn || '').trim();
    const checkOut = (body.checkOut || '').trim();

    if (!checkIn || !checkOut) {
      return jsonResponse(
        { error: 'Se requieren checkIn y checkOut (YYYY-MM-DD)' },
        400
      );
    }

    const data = await fetchAvailability(apiKey, secret, {
      checkIn,
      checkOut,
      rooms: body.rooms || 1,
      adults: body.adults || 2,
      children: body.children || 0,
      hotelCodes: body.hotelCodes,
      destinationCode: body.destinationCode,
    });

    return jsonResponse(data);
  } catch (err) {
    console.error('Hotelbeds error:', err.message);
    return jsonResponse(
      { error: err.message || 'Error al consultar disponibilidad' },
      500
    );
  }
}
