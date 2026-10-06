/**
 * Cliente midend de comunicaciones (Brevo) — mismo contrato que la app.
 *
 * POST {MIDEND_EVENTS_URL}  body: { type, contact?, payload?, channels? }
 * Auth: X-Midend-Key (también Authorization: Bearer)
 *
 * Env:
 *   MIDEND_EVENTS_URL   — default: plataforma …/api/comms/events
 *   MIDEND_EVENTS_SECRET o MIDEND_API_KEY — misma clave que en plataforma (MIDEND_API_KEY)
 */

const DEFAULT_EVENTS_URL =
  'https://plataforma-torneos-lerma-salda-a.vercel.app/api/comms/events';

/**
 * @param {string} type - p.ej. reserva.confirmada
 * @param {{
 *   contact?: object,
 *   payload?: object,
 *   channels?: string[],
 *   skipContactSync?: boolean,
 *   timeoutMs?: number
 * }} [opts]
 */
export async function emitMidendEvent(type, opts = {}) {
  const url = (process.env.MIDEND_EVENTS_URL || '').trim() || DEFAULT_EVENTS_URL;
  const secret = (
    process.env.MIDEND_EVENTS_SECRET ||
    process.env.MIDEND_API_KEY ||
    ''
  ).trim();

  const eventType = String(type || '').trim();
  if (!eventType) {
    return { ok: false, error: 'type requerido' };
  }

  // Compat: llamadas antiguas emitMidendEvent(type, payloadPlano)
  let contact = opts.contact;
  let payload = opts.payload;
  let channels = opts.channels;
  let skipContactSync = opts.skipContactSync;
  if (
    contact == null &&
    payload == null &&
    opts &&
    typeof opts === 'object' &&
    !opts.timeoutMs &&
    !Array.isArray(opts.channels)
  ) {
    const keys = Object.keys(opts);
    const looksLikeLegacyPayload =
      keys.length > 0 &&
      !('contact' in opts) &&
      !('payload' in opts) &&
      !('channels' in opts);
    if (looksLikeLegacyPayload) {
      payload = opts;
    }
  }

  const body = {
    type: eventType,
    source: 'web-lerma',
    contact: contact && typeof contact === 'object' ? contact : undefined,
    payload: payload && typeof payload === 'object' ? payload : {},
  };
  if (Array.isArray(channels) && channels.length) body.channels = channels;
  if (skipContactSync) body.skipContactSync = true;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (secret) {
    headers['X-Midend-Key'] = secret;
    headers.Authorization = `Bearer ${secret}`;
  }

  const timeoutMs = opts.timeoutMs != null ? Number(opts.timeoutMs) : 8000;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });
    if (timer) clearTimeout(timer);
    const text = await res.text().catch(() => '');
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      console.error('[midend] HTTP', res.status, eventType, text.slice(0, 280));
      return {
        ok: false,
        status: res.status,
        error: (json && json.error) || text.slice(0, 280),
        result: json,
      };
    }
    // Midend puede devolver 207 / ok:false parcial
    const eventOk = json == null || json.ok !== false;
    if (!eventOk) {
      console.warn('[midend] parcial', eventType, text.slice(0, 280));
    } else {
      console.log('[midend] OK', eventType);
    }
    return { ok: eventOk, status: res.status, result: json };
  } catch (e) {
    if (timer) clearTimeout(timer);
    console.error('[midend] fetch failed', eventType, e && e.message);
    return { ok: false, error: (e && e.message) || 'fetch failed' };
  }
}

/** Parte nombre completo en firstName / lastName (como la app). */
export function splitPersonName(fullName) {
  const s = String(fullName || '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
