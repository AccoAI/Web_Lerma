/**
 * Envío WhatsApp vía Twilio (texto, MediaUrl y/o ContentSid de plantilla).
 */

function normalizeWhatsAppAddress(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('whatsapp:')) return s;
  const digits = s.replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? `whatsapp:${digits}` : `whatsapp:+${digits}`;
}

/**
 * @param {{
 *   body?: string,
 *   mediaUrl?: string,
 *   to?: string,
 *   contentSid?: string,
 *   contentVariables?: Record<string, string>|string
 * }} opts
 *   - to: opcional; por defecto WHATSAPP_NOTIFY_TO (club)
 *   - contentSid: plantilla Meta/Twilio (HX…). Si se usa, no enviar Body/MediaUrl.
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

  const params = new URLSearchParams();
  params.set('To', to);
  params.set('From', from);

  if (contentSid) {
    // Plantilla aprobada: ContentSid sustituye Body y MediaUrl.
    params.set('ContentSid', contentSid);
    if (opts.contentVariables != null) {
      const vars =
        typeof opts.contentVariables === 'string'
          ? opts.contentVariables
          : JSON.stringify(opts.contentVariables);
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
    console.error('Twilio WhatsApp error', res.status, errText);
    return { ok: false, status: res.status, error: errText };
  }

  return { ok: true };
}

export { normalizeWhatsAppAddress };
