/**
 * Comprobación de conectividad Hotelbeds **Transfers** (misma Api-key + firma que Hotels).
 * GET /api/hotelbeds-transfers-status?status=1
 *
 * Documentación: https://developer.hotelbeds.com/documentation/transfers/
 */
import { createHash } from 'crypto';

function getSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  return createHash('sha256').update(apiKey + secret + ts, 'utf8').digest('hex');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request) {
  const url = request?.url ? new URL(request.url) : new URL('http://localhost/');
  if (url.searchParams.get('status') !== '1' && url.searchParams.get('ping') !== '1') {
    return json(
      {
        hint: 'Use GET ?status=1 para probar transfer-api/1.0/status con las mismas credenciales que Hotels.',
      },
      400
    );
  }

  const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY;
  const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET;
  if (!apiKey || !secret) {
    return json({ ok: false, error: 'missing_credentials', message: 'Faltan HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET' }, 200);
  }

  const baseUrl =
    process.env.HOTELBEDS_ENV === 'production'
      ? 'https://api.hotelbeds.com'
      : 'https://api.test.hotelbeds.com';

  const sig = getSignature(apiKey, secret);
  try {
    const res = await fetch(`${baseUrl}/transfer-api/1.0/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Api-key': apiKey,
        'X-Signature': sig,
      },
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { parseError: true, preview: text.slice(0, 200) };
    }
    return json({
      ok: res.ok,
      httpStatus: res.status,
      environment: process.env.HOTELBEDS_ENV === 'production' ? 'production' : 'test',
      transferApi: data,
    });
  } catch (e) {
    return json({ ok: false, error: 'fetch_failed', message: e.message || String(e) }, 200);
  }
}
