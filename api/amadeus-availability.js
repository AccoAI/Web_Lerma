/**
 * Proxy Amadeus Hotel Search: precios en tiempo real.
 * POST /api/amadeus-availability
 * Body: { checkIn, checkOut, hotelIds: ['alisa','parador',...] }
 * Env: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET (y opcional AMADEUS_ENV=production)
 */
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_TOKEN_URL_PROD = 'https://api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_OFFERS_URL = 'https://test.api.amadeus.com/v3/shopping/hotel-offers';
const AMADEUS_OFFERS_URL_PROD = 'https://api.amadeus.com/v3/shopping/hotel-offers';

/** Mapeo id interno -> Amadeus hotelId. Burgos (RGS) ya mapeado; Lerma se puede añadir por env o by-geocode. */
const OUR_ID_TO_AMADEUS = {
  alisa: process.env.AMADEUS_HOTEL_ALISA || null,
  ceres: process.env.AMADEUS_HOTEL_CERES || null,
  parador: process.env.AMADEUS_HOTEL_PARADOR || null,
  silken: process.env.AMADEUS_HOTEL_SILKEN || 'UIRGS755',
  'palacio-blasones': process.env.AMADEUS_HOTEL_PALACIO_BLASONES || 'KYRGSBLA',
  'hotel-centro': process.env.AMADEUS_HOTEL_CENTRO || 'HSRGSABC',
};

async function getToken() {
  const base = process.env.AMADEUS_ENV === 'production' ? AMADEUS_TOKEN_URL_PROD : AMADEUS_TOKEN_URL;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AMADEUS_CLIENT_ID || '',
    client_secret: process.env.AMADEUS_CLIENT_SECRET || '',
  });
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Token ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function fetchOffers(accessToken, hotelIds, checkIn, checkOut) {
  const base = process.env.AMADEUS_ENV === 'production' ? AMADEUS_OFFERS_URL_PROD : AMADEUS_OFFERS_URL;
  const params = new URLSearchParams({
    hotelIds: hotelIds.join(','),
    adults: '2',
    roomQuantity: '1',
    checkInDate: checkIn,
  });
  if (checkOut) params.set('checkOutDate', checkOut);
  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Offers ${res.status}`);
  }
  if (!res.ok) {
    const msg = (data.errors && data.errors[0] && data.errors[0].detail) || text;
    throw new Error(msg);
  }
  return data;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request) {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return jsonResponse(
      { error: 'Faltan credenciales Amadeus (AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET)' },
      500
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const checkIn = (body.checkIn || '').trim();
    const checkOut = (body.checkOut || '').trim();
    const ourIds = Array.isArray(body.hotelIds) ? body.hotelIds : [];

    if (!checkIn || !checkOut) {
      return jsonResponse({ error: 'Se requieren checkIn y checkOut (YYYY-MM-DD)' }, 400);
    }

    const amadeusIds = ourIds
      .map((id) => (OUR_ID_TO_AMADEUS[id] || process.env[`AMADEUS_HOTEL_${String(id).toUpperCase().replace(/-/g, '_')}`] || null))
      .filter(Boolean);
    if (amadeusIds.length === 0) {
      return jsonResponse({
        hotels: [],
        note: 'Configura AMADEUS_HOTEL_* en Vercel o añade códigos en api/amadeus-availability.js. Obtén IDs con Hotel List API (by-city?cityCode=RGS para Burgos, by-geocode para Lerma).',
      });
    }

    const token = await getToken();
    const raw = await fetchOffers(token, amadeusIds, checkIn, checkOut);
    const data = raw.data || [];
    const idToOur = {};
    Object.keys(OUR_ID_TO_AMADEUS).forEach((ourId) => {
      const a = OUR_ID_TO_AMADEUS[ourId];
      if (a) idToOur[a] = ourId;
    });
    const hotels = data.map((item) => {
      const hotel = item.hotel || {};
      const offer = (item.offers && item.offers[0]) || {};
      const price = offer.price || {};
      const total = parseFloat(price.total || price.base || 0) || 0;
      let nights = 1;
      if (checkIn && checkOut) {
        const a = new Date(checkIn);
        const b = new Date(checkOut);
        nights = Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
      }
      const pricePerNight = nights >= 1 ? Math.round((total / nights) * 100) / 100 : total;
      return {
        id: idToOur[hotel.hotelId] || hotel.hotelId,
        amadeusHotelId: hotel.hotelId,
        name: hotel.name || 'Hotel',
        pricePerNight,
        total,
        offerId: offer.id || null,
      };
    });

    return jsonResponse({ hotels });
  } catch (err) {
    console.error('Amadeus error:', err.message);
    return jsonResponse(
      { error: err.message || 'Error al consultar disponibilidad' },
      500
    );
  }
}

export async function GET() {
  const hasCreds = !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  const mapped = Object.keys(OUR_ID_TO_AMADEUS).filter((k) => OUR_ID_TO_AMADEUS[k]);
  return jsonResponse({
    configured: hasCreds,
    hotelIdsMapped: mapped.length,
    note: hasCreds && mapped.length === 0 ? 'Añade variables AMADEUS_HOTEL_ALISA, etc. en Vercel.' : null,
  });
}
