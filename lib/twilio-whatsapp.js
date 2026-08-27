/**
 * Envío WhatsApp vía Twilio (texto, MediaUrl y/o ContentSid de plantilla).
 * Sandbox: mensajes iniciados por el negocio requieren plantilla (ContentSid).
 * Si Body falla con 63016, reintenta con plantilla de sandbox / env.
 */

function normalizeWhatsAppAddress(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('whatsapp:')) return s;
  const digits = s.replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? `whatsapp:${digits}` : `whatsapp:+${digits}`;
}

/** Plantilla sandbox "Appointment Reminders" (Twilio Try WhatsApp). */
const SANDBOX_APPOINTMENT_CONTENT_SID = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';

function isSandboxFrom(from) {
  return String(from || '').includes('14155238886');
}

function parseTwilioError(errText) {
  try {
    const j = JSON.parse(errText);
    return { code: j.code, message: j.message || '' };
  } catch {
    return { code: null, message: String(errText || '').slice(0, 280) };
  }
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
    return { ok: false, status: res.status, error: errText, ...parseTwilioError(errText) };
  }
  return { ok: true };
}

function resolveContentSid(explicit) {
  return (
    (explicit && String(explicit).trim()) ||
    (process.env.TWILIO_GUIDE_CONTENT_SID || '').trim() ||
    (process.env.TWILIO_WHATSAPP_CONTENT_SID || '').trim() ||
    ''
  );
}

/**
 * @param {{
 *   body?: string,
 *   mediaUrl?: string,
 *   to?: string,
 *   contentSid?: string,
 *   contentVariables?: Record<string, string>|string,
 *   templateFallbackVars?: Record<string, string>
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
  let contentSid = resolveContentSid(opts.contentSid);
  const contentVariables = opts.contentVariables;

  if (!accountSid || !authToken || !from || !to) {
    console.warn('WhatsApp (Twilio) no configurado: faltan variables de entorno');
    return { ok: false, skipped: true };
  }

  if (!contentSid && !body && !mediaUrl) {
    console.warn('WhatsApp (Twilio): sin body, mediaUrl ni contentSid');
    return { ok: false, skipped: true };
  }

  const base = { accountSid, authToken, from, to };

  // Si ya pedimos plantilla, solo eso.
  if (contentSid && (opts.contentSid || !body)) {
    const r = await postTwilioMessage({
      ...base,
      contentSid,
      contentVariables: contentVariables || opts.templateFallbackVars,
    });
    if (!r.ok) console.error('Twilio WhatsApp error', r.status, r.code, r.message);
    return r;
  }

  // Sandbox: preferir plantilla para mensajes iniciados por el negocio.
  if (!contentSid && isSandboxFrom(from)) {
    contentSid =
      resolveContentSid('') || SANDBOX_APPOINTMENT_CONTENT_SID;
  }

  if (contentSid && isSandboxFrom(from)) {
    const vars =
      contentVariables ||
      opts.templateFallbackVars || {
        '1': 'Guía Golf Burgos',
        '2': (body.match(/https?:\/\/\S+/) || ['ver web'])[0].slice(0, 200),
      };
    const templated = await postTwilioMessage({
      ...base,
      contentSid,
      contentVariables: vars,
    });
    if (templated.ok) return { ok: true, viaTemplate: true, contentSid };
    console.warn('Twilio plantilla sandbox falló; pruebo freeform', templated.code, templated.message);
  }

  // Freeform (solo válido dentro de ventana 24h tras un mensaje del usuario / join).
  if (mediaUrl && body) {
    const withMedia = await postTwilioMessage({ ...base, body, mediaUrl });
    if (withMedia.ok) return { ok: true, withMedia: true };
    console.warn('Twilio MediaUrl falló; reintento texto', withMedia.code, withMedia.message);
  }

  if (body) {
    const textOnly = await postTwilioMessage({ ...base, body });
    if (textOnly.ok) return { ok: true, withMedia: false };

    // 63016: fuera de ventana → plantilla
    if (textOnly.code === 63016 || /template/i.test(textOnly.message || '')) {
      const sid = resolveContentSid(opts.contentSid) || SANDBOX_APPOINTMENT_CONTENT_SID;
      const vars =
        opts.templateFallbackVars ||
        contentVariables || {
          '1': 'Guía Golf Burgos',
          '2': (body.match(/https?:\/\/\S+/) || ['web-lerma.vercel.app'])[0].slice(0, 200),
        };
      const retry = await postTwilioMessage({
        ...base,
        contentSid: sid,
        contentVariables: vars,
      });
      if (!retry.ok) console.error('Twilio WhatsApp error', retry.status, retry.code, retry.message);
      return retry.ok ? { ok: true, viaTemplate: true, contentSid: sid } : retry;
    }

    console.error('Twilio WhatsApp error', textOnly.status, textOnly.code, textOnly.message);
    return textOnly;
  }

  return { ok: false, error: 'Sin contenido que enviar' };
}

export { normalizeWhatsAppAddress, SANDBOX_APPOINTMENT_CONTENT_SID };
