/**
 * Envío WhatsApp vía Twilio (texto, MediaUrl y/o ContentSid de plantilla).
 * Si Body+MediaUrl falla (p. ej. PDF muy grande), reintenta solo con Body.
 */

function normalizeWhatsAppAddress(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('whatsapp:')) return s;
  const digits = s.replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? `whatsapp:${digits}` : `whatsapp:+${digits}`;
}

async function postTwilioMessage({ accountSid, authToken, from, to, body, mediaUrl, contentSid, contentVariables }) {
  const params = new URLSearchParams();
  params.set('To', to);
  params.set('From', from);

  if (contentSid) {
    params.set('ContentSid', contentSid);
    if (contentVariables != null) {
      const vars =
        typeof contentVariables === 'string'
          ? contentVariables
          : JSON.stringify(contentVariables);
      params.set('ContentVariables', vars);
    }
  } else {
    if (body) params.set('Body', body);
    if (mediaUrl) params.set('MediaUrl', mediaUrl);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, error: errText };
  }
  return { ok: true };
}

/**
 * @param {{
 *   body?: string,
 *   mediaUrl?: string,
 *   to?: string,
 *   contentSid?: string,
 *   contentVariables?: Record<string, string>|string
 * }} opts
 */
export async function sendWhatsAppTwilio(opts = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const toDefault = process.env.WHATSAPP_NOTIFY_TO;
  const to = normalizeWhatsAppAddress(opts.to || toDefault);
  const body = opts.body != null ? String(opts.body) : '';
  const mediaUrl = opts.mediaUrl ? String(opts.mediaUrl).trim() : '';
  const contentSid = opts.contentSid ? String(opts.contentSid).trim() : '';

  if (!accountSid || !authToken || !from || !to) {
    console.warn('WhatsApp (Twilio) no configurado: faltan variables de entorno');
    return { ok: false, skipped: true };
  }

  if (!contentSid && !body && !mediaUrl) {
    console.warn('WhatsApp (Twilio): sin body, mediaUrl ni contentSid');
    return { ok: false, skipped: true };
  }

  const base = { accountSid, authToken, from, to };

  if (contentSid) {
    const r = await postTwilioMessage({
      ...base,
      contentSid,
      contentVariables: opts.contentVariables,
    });
    if (!r.ok) console.error('Twilio WhatsApp error', r.status, r.error);
    return r;
  }

  // Primero con media si viene; si falla, solo texto (enlace en el body).
  if (mediaUrl && body) {
    const withMedia = await postTwilioMessage({ ...base, body, mediaUrl });
    if (withMedia.ok) return { ok: true, withMedia: true };
    console.warn(
      'Twilio WhatsApp: fallo con MediaUrl; reintento solo texto. status=',
      withMedia.status,
      withMedia.error
    );
    const textOnly = await postTwilioMessage({ ...base, body });
    if (!textOnly.ok) console.error('Twilio WhatsApp error', textOnly.status, textOnly.error);
    return textOnly.ok ? { ok: true, withMedia: false, mediaFailed: true } : textOnly;
  }

  const r = await postTwilioMessage({ ...base, body, mediaUrl: mediaUrl || undefined });
  if (!r.ok) console.error('Twilio WhatsApp error', r.status, r.error);
  return r;
}

export { normalizeWhatsAppAddress };
