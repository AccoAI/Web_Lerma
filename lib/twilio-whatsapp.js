/**
 * Envío WhatsApp vía Twilio (texto y/o MediaUrl).
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
 * @param {{ body?: string, mediaUrl?: string, to?: string }} opts
 *   - to: opcional; por defecto WHATSAPP_NOTIFY_TO (club)
 */
export async function sendWhatsAppTwilio(opts = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const toDefault = process.env.WHATSAPP_NOTIFY_TO;
  const to = normalizeWhatsAppAddress(opts.to || toDefault);
  const body = opts.body != null ? String(opts.body) : '';
  const mediaUrl = opts.mediaUrl ? String(opts.mediaUrl).trim() : '';

  if (!accountSid || !authToken || !from || !to) {
    console.warn('WhatsApp (Twilio) no configurado: faltan variables de entorno');
    return { ok: false, skipped: true };
  }

  if (!body && !mediaUrl) {
    console.warn('WhatsApp (Twilio): sin body ni mediaUrl');
    return { ok: false, skipped: true };
  }

  const params = new URLSearchParams();
  params.set('To', to);
  params.set('From', from);
  if (body) params.set('Body', body);
  if (mediaUrl) params.set('MediaUrl', mediaUrl);

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
