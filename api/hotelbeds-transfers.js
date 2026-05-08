/**
 * Proxy Hotelbeds Transfers API (certificación y futuro flujo B2C).
 *
 * GET  /api/hotelbeds-transfers?language=en&fromType=ATLAS&fromCode=5643&toType=IATA&toCode=CIA&outbound=2026-06-15T10:00:00&inbound=&adults=2&children=0&infants=0
 *      — disponibilidad simple (ida: dejar inbound vacío o omitir)
 *
 * POST /api/hotelbeds-transfers — JSON:
 *   { "action": "availability_multi", "language":"en", "adults":2, "children":0, "infants":0,
 *     "routes":[{ "id":"ATLAS/57/IATA/BCN", "dateTime":"2026-08-12T10:00:00" }, ...] }
 *     → POST …/transfer-api/1.0/availability/routes/{lang}/{adults}/{children}/{infants}
 *     (hasta 20 rutas; query opcional: allowPartialResults, vehicle, type, category)
 *   { "action": "booking", "language":"en", "holder":{...}, "transfers":[...], ... } → POST …/transfer-api/1.0/bookings
 *   { "action": "booking_detail", "language":"en", "reference":"XXX-XXXXXX" } → GET …/bookings/{lang}/reference/{ref}
 *   { "action": "cancel", "language":"en", "reference":"XXX-XXXXXX", "simulation":false, "serviceId": 2 } → DELETE …/bookings/{lang}/reference/…
 *
 * GET  /api/hotelbeds-transfers?detail=1&language=en&reference=XXX-XXXXXX — mismo GET booking detail (alternativa al POST).
 *
 * Variables: HOTELBEDS_TRANSFER_API_KEY / HOTELBEDS_TRANSFER_API_SECRET (prioridad),
 * o API_Key / HOTELBEDS_API_KEY + API_Secret / HOTELBEDS_API_SECRET.
 */
import { createHash } from 'crypto';
import { getHotelbedsCredentialsTransfers } from '../lib/hotelbeds-credentials.js';

/**
 * Misma fórmula que Postman / doc Hotelbeds: SHA256(Api-key + Secret + timestampUnixSegundos).
 */
function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  return createHash('sha256').update(apiKey + secret + ts, 'utf8').digest('hex');
}

/** Si Hotelbeds devuelve 403 "disallowed", casi siempre es contrato/permiso de la key, no bug de firma. */
function withTransfer403Help(payload, baseUrl, operation, apiKey) {
  const errStr =
    payload &&
    payload.data &&
    (typeof payload.data.error === 'string' ? payload.data.error : JSON.stringify(payload.data.error || ''));
  const disallowed =
    payload.httpStatus === 403 ||
    (errStr && String(errStr).toLowerCase().includes('disallowed'));
  if (!disallowed) return payload;
  return {
    ...payload,
    diagnostic: {
      environment: process.env.HOTELBEDS_ENV === 'production' ? 'production' : 'test',
      hotelbedsHost: baseUrl.replace(/^https:\/\//, ''),
      operation,
      apiKeyLast4:
        typeof apiKey === 'string' && apiKey.length >= 4 ? apiKey.slice(-4) : null,
      signatureNote: 'SHA256(apiKey + secret + unixTimestampSeconds); mismo criterio que hotel-api en este repo.',
      likelyCause:
        '403 "Access disallowed" suele indicar que esta Api-key no tiene habilitado el producto Transfer API en Hotelbeds. Comprueba HOTELBEDS_TRANSFER_* o API_Key/HOTELBEDS_API_KEY en Vercel y HOTELBEDS_ENV. Si GET disponibilidad simple también da 403, pide a Hotelbeds activación Transfer API. Si solo falla availability_multi (POST), pide permiso explícito para multi-route.',
    },
  };
}

function getBaseUrl() {
  return process.env.HOTELBEDS_ENV === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function hbHeaders(apiKey, secret) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Api-key': apiKey,
    'X-Signature': getSignature(apiKey, secret),
  };
}

function hbHeadersGet(apiKey, secret) {
  return {
    Accept: 'application/json',
    'Api-key': apiKey,
    'X-Signature': getSignature(apiKey, secret),
  };
}

async function fetchBookingDetailJson(baseUrl, apiKey, secret, language, reference) {
  const path = `${baseUrl}/transfer-api/1.0/bookings/${encodeURIComponent(language)}/reference/${encodeURIComponent(reference)}`;
  const res = await fetch(path, {
    method: 'GET',
    headers: hbHeadersGet(apiKey, secret),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 1200) };
  }
  return { res, data };
}

/**
 * Construye URL availability simple según doc:
 * …/availability/{lang}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{outbound}/[{inbound}/]{adults}/{children}/{infants}
 */
function buildAvailabilityPath(baseUrl, q) {
  const lang = q.get('language') || 'en';
  /** IATA por defecto: códigos tipo MAD no son ATLAS (evita 400 con aeropuertos). */
  const fromType = q.get('fromType') || 'IATA';
  const fromCode = q.get('fromCode') || '';
  const toType = q.get('toType') || 'IATA';
  const toCode = q.get('toCode') || '';
  const outbound = q.get('outbound') || '';
  const inbound = (q.get('inbound') || '').trim();
  const adults = String(Math.max(0, parseInt(q.get('adults') || '2', 10) || 0));
  const children = String(Math.max(0, parseInt(q.get('children') || '0', 10) || 0));
  const infants = String(Math.max(0, parseInt(q.get('infants') || '0', 10) || 0));

  const enc = (s) => encodeURIComponent(s);
  let path = `${baseUrl}/transfer-api/1.0/availability/${enc(lang)}/from/${fromType}/${enc(fromCode)}/to/${toType}/${enc(toCode)}/${enc(outbound)}`;
  if (inbound) {
    path += `/${enc(inbound)}`;
  }
  path += `/${adults}/${children}/${infants}`;
  return path;
}

export async function GET(request) {
  const { apiKey, secret } = getHotelbedsCredentialsTransfers();
  if (!apiKey || !secret) {
    return json({ ok: false, error: 'missing_credentials' }, 200);
  }

  const url = new URL(request.url);
  if (url.searchParams.get('ping') === '1') {
    return json({
      ok: true,
      msg: 'hotelbeds-transfers proxy',
      env: process.env.HOTELBEDS_ENV === 'production' ? 'production' : 'test',
      apiKeyLast4:
        typeof apiKey === 'string' && apiKey.length >= 4 ? apiKey.slice(-4) : null,
    });
  }

  const wantDetail =
    url.searchParams.get('detail') === '1' || url.searchParams.get('booking_detail') === '1';
  if (wantDetail) {
    const reference = url.searchParams.get('reference') || url.searchParams.get('booking_reference');
    const language = url.searchParams.get('language') || 'en';
    if (!reference || !reference.trim()) {
      return json({ ok: false, error: 'missing_reference' }, 400);
    }
    try {
      const baseUrl = getBaseUrl();
      const { res, data } = await fetchBookingDetailJson(
        baseUrl,
        apiKey,
        secret,
        language,
        reference.trim()
      );
      const payload = { ok: res.ok, httpStatus: res.status, data };
      return json(withTransfer403Help(payload, baseUrl, 'booking_detail GET', apiKey), 200);
    } catch (e) {
      console.error('hotelbeds-transfers GET detail:', e);
      return json({ ok: false, error: e.message || String(e) }, 200);
    }
  }

  try {
    const baseUrl = getBaseUrl();
    const targetUrl = buildAvailabilityPath(baseUrl, url.searchParams);
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Api-key': apiKey,
        'X-Signature': getSignature(apiKey, secret),
      },
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json(
        { ok: false, httpStatus: res.status, error: 'invalid_json', raw: text.slice(0, 500) },
        200
      );
    }
    const payload = { ok: res.ok, httpStatus: res.status, data };
    return json(withTransfer403Help(payload, baseUrl, 'availability_simple GET', apiKey), 200);
  } catch (e) {
    console.error('hotelbeds-transfers GET:', e);
    return json({ ok: false, error: e.message || String(e) }, 200);
  }
}

export async function POST(request) {
  const { apiKey, secret } = getHotelbedsCredentialsTransfers();
  if (!apiKey || !secret) {
    return json({ ok: false, error: 'missing_credentials' }, 200);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const baseUrl = getBaseUrl();
  const action = body.action || 'booking';

  if (action === 'availability_multi') {
    const language = body.language || 'en';
    const adults = Math.max(0, parseInt(body.adults ?? 2, 10) || 0);
    const children = Math.max(0, parseInt(body.children ?? 0, 10) || 0);
    const infants = Math.max(0, parseInt(body.infants ?? 0, 10) || 0);
    const routes = body.routes;
    if (!Array.isArray(routes) || routes.length < 1 || routes.length > 20) {
      return json(
        { error: 'routes debe ser un array de 1 a 20 elementos { id, dateTime }' },
        400
      );
    }
    const qs = new URLSearchParams();
    if (body.allowPartialResults === true) qs.set('allowPartialResults', 'true');
    if (body.allowPartialResults === false) qs.set('allowPartialResults', 'false');
    if (body.vehicle != null && body.vehicle !== '') qs.set('vehicle', String(body.vehicle));
    if (body.type != null && body.type !== '') qs.set('type', String(body.type));
    if (body.category != null && body.category !== '') qs.set('category', String(body.category));
    const qstr = qs.toString();
    const path = `${baseUrl}/transfer-api/1.0/availability/routes/${encodeURIComponent(language)}/${adults}/${children}/${infants}${qstr ? `?${qstr}` : ''}`;
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: hbHeaders(apiKey, secret),
        body: JSON.stringify(routes),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 1200) };
      }
      const payload = { ok: res.ok, httpStatus: res.status, data };
      return json(withTransfer403Help(payload, baseUrl, 'availability_multi POST', apiKey), 200);
    } catch (e) {
      console.error('hotelbeds-transfers availability_multi:', e);
      return json({ ok: false, error: e.message || String(e) }, 200);
    }
  }

  if (action === 'booking_detail') {
    const language = body.language || 'en';
    const reference = body.reference || body.bookingReference;
    if (!reference) {
      return json({ error: 'Se requiere reference' }, 400);
    }
    try {
      const { res, data } = await fetchBookingDetailJson(
        baseUrl,
        apiKey,
        secret,
        language,
        String(reference).trim()
      );
      const payload = { ok: res.ok, httpStatus: res.status, data };
      return json(withTransfer403Help(payload, baseUrl, 'booking_detail POST', apiKey), 200);
    } catch (e) {
      console.error('hotelbeds-transfers booking_detail:', e);
      return json({ ok: false, error: e.message || String(e) }, 200);
    }
  }

  if (action === 'cancel') {
    const language = body.language || 'en';
    const reference = body.reference || body.bookingReference;
    if (!reference) {
      return json({ error: 'Se requiere reference' }, 400);
    }
    let path = `${baseUrl}/transfer-api/1.0/bookings/${encodeURIComponent(language)}/reference/${encodeURIComponent(reference)}`;
    if (body.serviceId != null && body.serviceId !== '') {
      path += `/id/${encodeURIComponent(String(body.serviceId))}`;
    }
    const sim = body.simulation === true ? '?simulation=true' : '';
    try {
      const res = await fetch(path + sim, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Api-key': apiKey,
          'X-Signature': getSignature(apiKey, secret),
        },
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 800) };
      }
      const payload = { ok: res.ok, httpStatus: res.status, data };
      return json(withTransfer403Help(payload, baseUrl, 'cancel DELETE', apiKey), 200);
    } catch (e) {
      return json({ ok: false, error: e.message || String(e) }, 200);
    }
  }

  if (action === 'booking') {
    const { action: _drop, payload, ...rest } = body;
    const bookingBody = payload || rest;
    if (!bookingBody.language || !bookingBody.holder || !bookingBody.transfers) {
      return json(
        {
          error:
            'Body de booking inválido: { action:"booking", language, holder, transfers, ... } o { action:"booking", payload:{...} }',
        },
        400
      );
    }
    {
      const rawRef =
        bookingBody.clientReference != null && String(bookingBody.clientReference).trim() !== ''
          ? String(bookingBody.clientReference).trim()
          : 'GL-' + Date.now();
      bookingBody.clientReference = rawRef.slice(0, 20);
    }
    try {
      const res = await fetch(`${baseUrl}/transfer-api/1.0/bookings`, {
        method: 'POST',
        headers: hbHeaders(apiKey, secret),
        body: JSON.stringify(bookingBody),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 1200) };
      }
      const payload = { ok: res.ok, httpStatus: res.status, data };
      return json(withTransfer403Help(payload, baseUrl, 'booking POST', apiKey), 200);
    } catch (e) {
      console.error('hotelbeds-transfers booking:', e);
      return json({ ok: false, error: e.message || String(e) }, 200);
    }
  }

  return json(
    { error: 'action no soportada (usa availability_multi, booking, booking_detail o cancel)' },
    400
  );
}
