/**
 * Proxy Hotelbeds Transfers API (certificación y futuro flujo B2C).
 *
 * GET  /api/hotelbeds-transfers?language=en&fromType=ATLAS&fromCode=5643&toType=IATA&toCode=CIA&outbound=2026-06-15T10:00:00&inbound=&adults=2&children=0&infants=0
 *      — disponibilidad simple (ida: dejar inbound vacío o omitir)
 *
 * POST /api/hotelbeds-transfers — JSON:
 *   { "action": "booking", "language":"en", "holder":{...}, "transfers":[...], ... } → POST …/transfer-api/1.0/bookings
 *   { "action": "cancel", "language":"en", "reference":"XXX-XXXXXX", "simulation":false, "serviceId": 2 } → DELETE …/bookings/{lang}/reference/…
 */
import { createHash } from 'crypto';

function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  return createHash('sha256').update(apiKey + secret + ts, 'utf8').digest('hex');
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

/**
 * Construye URL availability simple según doc:
 * …/availability/{lang}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{outbound}/[{inbound}/]{adults}/{children}/{infants}
 */
function buildAvailabilityPath(baseUrl, q) {
  const lang = q.get('language') || 'en';
  const fromType = q.get('fromType') || 'ATLAS';
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
  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
  if (!apiKey || !secret) {
    return json({ ok: false, error: 'missing_credentials' }, 200);
  }

  const url = new URL(request.url);
  if (url.searchParams.get('ping') === '1') {
    return json({ ok: true, msg: 'hotelbeds-transfers proxy' });
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
    return json({ ok: res.ok, httpStatus: res.status, data }, 200);
  } catch (e) {
    console.error('hotelbeds-transfers GET:', e);
    return json({ ok: false, error: e.message || String(e) }, 200);
  }
}

export async function POST(request) {
  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
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
      return json({ ok: res.ok, httpStatus: res.status, data }, res.ok ? 200 : 200);
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
      return json({ ok: res.ok, httpStatus: res.status, data }, 200);
    } catch (e) {
      console.error('hotelbeds-transfers booking:', e);
      return json({ ok: false, error: e.message || String(e) }, 200);
    }
  }

  return json({ error: 'action no soportada (usa booking o cancel)' }, 400);
}
