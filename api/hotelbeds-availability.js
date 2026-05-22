import { createHash } from 'crypto';
import { mapHotelbedsBookingToVoucherData } from '../lib/hotelbeds-booking-map.js';
import { hotelbedsBaseUrl, hotelbedsFetch, getMtlsCreds } from '../lib/hotelbeds-mtls.js';
import { sendEmail } from '../lib/resend.js';

/**
 * Proxy para Hotelbeds Availability API
 * POST /api/hotelbeds-availability
 * Body: { checkIn, checkOut, rooms, adults, children?, hotelCodes?, destinationCode? }
 *
 * También (mismo endpoint, sin función extra en Vercel):
 * - { "action": "checkrates", "rooms": [ { "rateKey": "..." }, ... ] } (máx. 10)
 * - { "action": "booking", "booking": { ... }, "packageLabel": "opcional" } → POST /bookings (timeout 65s)
 *
 * Reconfirmation push (mismo archivo): POST /api/hotelbeds-reconfirmation
 * → rewrite en vercel.json a ?__hb_reconfirm=1
 *
 * Variables Hotel API: API_Key, API_Secret (o HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET).
 *
 * mTLS: HOTELBEDS_MTLS_CERT + HOTELBEDS_MTLS_KEY (certificado de cliente emitido por CA pública;
 * ver HOTELBEDS-SETUP.md). Con ellos: api-mtls.hotelbeds.com (prod) o api-mtls.test.hotelbeds.com (test).
 */
function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const str = apiKey + secret + ts;
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

const BOOKING_TIMEOUT_MS = 65000;

async function hotelbedsPostJson(apiKey, secret, pathSuffix, jsonBody, timeoutMs) {
  const baseUrl = hotelbedsBaseUrl();
  const signature = getSignature(apiKey, secret);
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Api-key': apiKey,
    'X-Signature': signature,
  };
  const body = JSON.stringify(jsonBody);
  const url = `${baseUrl}${pathSuffix}`;

  const res = await hotelbedsFetch(url, { method: 'POST', headers, body, timeoutMs });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 1500) };
  }
  return { res, data };
}

async function handleCheckrates(apiKey, secret, body) {
  const rooms = body.rooms;
  if (!Array.isArray(rooms) || rooms.length < 1 || rooms.length > 10) {
    return jsonResponse({ error: 'rooms debe ser un array de 1 a 10 { rateKey }' }, 400);
  }
  for (const r of rooms) {
    if (!r || !r.rateKey) {
      return jsonResponse({ error: 'Cada room debe incluir rateKey' }, 400);
    }
  }
  try {
    const { res, data } = await hotelbedsPostJson(
      apiKey,
      secret,
      '/hotel-api/1.0/checkrates',
      { rooms },
      45000
    );
    const hbErr =
      data &&
      data.error &&
      (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
    const logicalOk = res.ok && !hbErr;
    return jsonResponse(
      {
        ok: logicalOk,
        httpStatus: res.status,
        data,
        ...(hbErr && { hotelbedsError: hbErr }),
      },
      200
    );
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Timeout checkrates' : e.message || String(e);
    return jsonResponse({ ok: false, error: msg }, 200);
  }
}

async function handleBooking(apiKey, secret, body) {
  const bookingBody = body.booking && typeof body.booking === 'object' ? body.booking : null;
  if (!bookingBody || !bookingBody.holder || !Array.isArray(bookingBody.rooms)) {
    return jsonResponse(
      {
        error:
          'Body inválido: { action: "booking", booking: { holder, rooms, clientReference?, ... } }',
      },
      400
    );
  }
  try {
    const { res, data } = await hotelbedsPostJson(
      apiKey,
      secret,
      '/hotel-api/1.0/bookings',
      bookingBody,
      BOOKING_TIMEOUT_MS
    );
    const hbErr =
      data &&
      data.error &&
      (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
    const logicalOk = res.ok && !hbErr;
    let voucher = null;
    if (logicalOk && data) {
      voucher = mapHotelbedsBookingToVoucherData(data);
      if (voucher && body.packageLabel) {
        voucher.packageName = String(body.packageLabel).slice(0, 200);
      }
    }
    return jsonResponse(
      {
        ok: logicalOk,
        httpStatus: res.status,
        data,
        voucher,
        ...(hbErr && { hotelbedsError: hbErr }),
      },
      200
    );
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Timeout booking (≥65s)' : e.message || String(e);
    return jsonResponse({ ok: false, error: msg, voucher: null }, 200);
  }
}

/**
 * @returns {{ ok: true, data: object } | { ok: false, error: string, status?: number, raw?: string, data?: object }}
 */
async function fetchAvailability(apiKey, secret, body) {
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
    payload.hotels = {
      hotel: body.hotelCodes.slice(0, 20).map((c) => {
        const s = String(c == null ? '' : c).trim();
        if (/^\d{1,12}$/.test(s)) return parseInt(s, 10);
        return s;
      }),
    };
  } else if (body.destinationCode) {
    payload.destination = { code: String(body.destinationCode) };
  } else {
    payload.destination = { code: 'BRG' };
  }

  let res, data;
  try {
    ({ res, data } = await hotelbedsPostJson(apiKey, secret, '/hotel-api/1.0/hotels', payload, 30000));
  } catch (e) {
    return { ok: false, error: e.message || 'Error de red al contactar con Hotelbeds' };
  }

  if (!data || data.raw) {
    return {
      ok: false,
      status: res.status,
      error: `Hotelbeds devolvió una respuesta no JSON (HTTP ${res.status}).`,
      raw: data?.raw || '',
    };
  }

  if (!res.ok) {
    const errObj = data && data.error;
    let errMsg = '';
    if (typeof errObj === 'string') {
      errMsg = errObj.trim();
    } else if (errObj && typeof errObj === 'object') {
      const code = errObj.code != null ? String(errObj.code).trim() : '';
      const message = errObj.message != null ? String(errObj.message).trim() : '';
      const desc = errObj.description != null ? String(errObj.description).trim() : '';
      errMsg = [code, message || desc].filter(Boolean).join(' — ');
    }
    if (!errMsg && typeof data?.message === 'string') errMsg = data.message.trim();
    if (!errMsg && typeof data === 'string') errMsg = data.trim();
    if (!errMsg) errMsg = `Error Hotelbeds (HTTP ${res.status})`;
    return {
      ok: false,
      status: res.status,
      error: String(errMsg).slice(0, 2000),
      data,
    };
  }

  return { ok: true, data };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * Hotelbeds Reconfirmation Push Service handler.
 * Hotelbeds llama a este endpoint (POST) para entregar el supplierConfirmationCode
 * de forma asíncrona tras confirmar la reserva con el proveedor.
 * Debemos responder siempre con HTTP 200; si no, Hotelbeds reintentará.
 *
 * Configurar en el portal Hotelbeds: Settings → Reconfirmation → Push URL →
 *   https://<tu-dominio>/api/hotelbeds-reconfirmation
 */
async function handleReconfirmation(request) {
  let payload = {};
  try {
    payload = await request.json().catch(() => ({}));
  } catch {
    // cuerpo vacío o inválido — responder 200 de todas formas
  }

  const booking = payload.booking || {};
  const ref = booking.reference || payload.reference || '(sin referencia)';
  const supplierCode = booking.supplierConfirmationCode || payload.supplierConfirmationCode || '(sin código)';
  const type = payload.type || 'reconfirmation';

  console.log(
    '[Hotelbeds Reconfirmation] type=%s ref=%s supplierCode=%s raw=%s',
    type,
    ref,
    supplierCode,
    JSON.stringify(payload).slice(0, 500)
  );

  // Notificación por email al equipo (no-bloqueante; ignoramos fallos)
  const adminEmail = process.env.RESEND_EMAIL_EMPRESA || 'eventos@golflerma.com';
  sendEmail({
    to: adminEmail,
    subject: `[Hotelbeds] Reconfirmación reserva ${ref} — código proveedor: ${supplierCode}`,
    html: `
      <h2>Reconfirmación de reserva Hotelbeds</h2>
      <p><strong>Referencia:</strong> ${ref}</p>
      <p><strong>Código proveedor:</strong> ${supplierCode}</p>
      <p><strong>Tipo:</strong> ${type}</p>
      <details><summary>Payload completo</summary>
        <pre style="font-size:12px;background:#f5f5f5;padding:8px">${JSON.stringify(payload, null, 2)}</pre>
      </details>`,
  }).catch((e) => console.warn('[Hotelbeds Reconfirmation] sendEmail failed:', e?.message));

  return new Response(JSON.stringify({ received: true, ref, supplierCode }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  const url = request?.url ? new URL(request.url) : null;
  if (url && url.searchParams.get('__hb_reconfirm') === '1') {
    // Hotelbeds verifica el endpoint con GET antes de activar el push service
    return new Response(
      JSON.stringify({
        ok: true,
        service: 'hotelbeds-reconfirmation',
        info: 'POST a este endpoint para recibir supplierConfirmationCode',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (url && url.searchParams.get('status') === '1') {
    const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
    const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
    if (!apiKey || !secret) return jsonResponse({ error: 'Faltan credenciales' }, 200);
    const baseUrl = hotelbedsBaseUrl();
    const signature = getSignature(apiKey, secret);
    try {
      const res = await hotelbedsFetch(`${baseUrl}/hotel-api/1.0/status`, {
        headers: { Accept: 'application/json', 'Api-key': apiKey, 'X-Signature': signature },
      });
      const data = await res.json().catch(() => ({}));
      return jsonResponse({ status: res.status, ok: res.ok, hotelbeds: data });
    } catch (e) {
      return jsonResponse({ error: e.message }, 200);
    }
  }
  if (url && url.searchParams.get('diagnostic') === '1') {
    const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
    const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
    let cryptoOk = false;
    try {
      getSignature(apiKey || 'x', secret || 'x');
      cryptoOk = true;
    } catch (e) {
      // ignore
    }
    return jsonResponse({
      credentialsOk: !!(apiKey && secret),
      cryptoOk,
      mtlsConfigured: !!getMtlsCreds(),
      hotelbedsHost: hotelbedsBaseUrl().replace(/^https:\/\//, ''),
      envVarsChecked: [
        'API_Key',
        'API_Secret',
        'HOTELBEDS_API_KEY',
        'HOTELBEDS_API_SECRET',
        'HOTELBEDS_MTLS_CERT',
        'HOTELBEDS_MTLS_KEY',
        'HOTELBEDS_ENV',
      ],
    });
  }
  return jsonResponse(
    {
      error:
        'Este endpoint no se usa abriendo la URL en el navegador (eso es GET). Para disponibilidad usa POST con JSON.',
      hint: 'POST con Content-Type application/json y cuerpo: checkIn, checkOut, rooms, adults; opcional children, destinationCode o hotelCodes.',
      example: {
        checkIn: '2026-05-10',
        checkOut: '2026-05-12',
        rooms: 1,
        adults: 2,
        destinationCode: 'BRG',
      },
      connectivityCheck: 'GET este mismo path con ?status=1 para probar credenciales y estado Hotelbeds.',
    },
    400
  );
}

const EMPTY_HOTELS = { hotels: { hotels: [] } };

export async function POST(request) {
  const url = request?.url ? new URL(request.url) : null;
  if (url && url.searchParams.get('__hb_reconfirm') === '1') {
    return handleReconfirmation(request);
  }

  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;

  /** 200 + error: el front (hotelbeds-paquetes.js) ya trata hb.error y evita "500" en consola del navegador. */
  if (!apiKey || !secret) {
    return jsonResponse(
      {
        ...EMPTY_HOTELS,
        error:
          'Faltan credenciales Hotelbeds en el servidor (HOTELBEDS_API_KEY y HOTELBEDS_API_SECRET). En local, define variables en .env.local y reinicia `vercel dev`. En Vercel: Project Settings → Environment Variables.',
        code: 'MISSING_CREDENTIALS',
      },
      200
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'checkrates') {
      return handleCheckrates(apiKey, secret, body);
    }
    if (body.action === 'booking') {
      return handleBooking(apiKey, secret, body);
    }

    const checkIn = (body.checkIn || '').trim();
    const checkOut = (body.checkOut || '').trim();

    if (!checkIn || !checkOut) {
      return jsonResponse(
        { error: 'Se requieren checkIn y checkOut (YYYY-MM-DD)', ...EMPTY_HOTELS },
        400
      );
    }

    const result = await fetchAvailability(apiKey, secret, {
      checkIn,
      checkOut,
      rooms: body.rooms || 1,
      adults: body.adults || 2,
      children: body.children || 0,
      hotelCodes: body.hotelCodes,
      destinationCode: body.destinationCode,
    });

    if (!result.ok) {
      console.error('Hotelbeds availability:', result.status, result.error, result.raw || '');
      return jsonResponse(
        {
          ...EMPTY_HOTELS,
          error: result.error || 'Error al consultar disponibilidad',
          ...(result.status && { hotelbedsHttpStatus: result.status }),
          ...(result.data && { hotelbeds: result.data }),
          ...(result.raw && { rawPreview: result.raw }),
        },
        200
      );
    }

    return jsonResponse(result.data);
  } catch (err) {
    console.error('Hotelbeds error:', err.message);
    const errBody = {
      ...EMPTY_HOTELS,
      error: err.message || 'Error al consultar disponibilidad',
      ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack }),
    };
    return jsonResponse(errBody, 200);
  }
}
