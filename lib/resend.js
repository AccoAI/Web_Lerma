/**
 * Envío de correos con Resend (https://resend.com)
 * Usar desde serverless (api/) para no exponer RESEND_API_KEY.
 *
 * Variables de entorno:
 *   RESEND_API_KEY  - API key de Resend (re_...)
 *   RESEND_EMAIL_FROM - Remitente (ej: "Golf Lerma <reservas@tudominio.com>")
 */

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Envía un correo con Resend.
 * @param {Object} opts
 * @param {string|string[]} opts.to - Destinatario(s)
 * @param {string} opts.subject - Asunto
 * @param {string} opts.html - Cuerpo HTML
 * @param {string} [opts.from] - Remitente (por defecto RESEND_EMAIL_FROM)
 * @param {string} [opts.text] - Cuerpo texto plano (opcional)
 * @returns {Promise<{ id?: string, error?: string }>}
 */
const UNVERIFIABLE_DOMAINS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'icloud.com'];

function getDomainFromEmail(fromStr) {
  if (!fromStr || typeof fromStr !== 'string') return '';
  const match = fromStr.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return match ? match[1].toLowerCase() : '';
}

export async function sendEmail({ to, subject, html, from, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.RESEND_EMAIL_FROM;

  if (!apiKey) {
    console.warn('Resend: RESEND_API_KEY no configurada');
    return { error: 'Email no configurado' };
  }

  const fromAddress = from || defaultFrom || 'Golf Lerma <onboarding@resend.dev>';
  const domain = getDomainFromEmail(fromAddress);
  if (domain && UNVERIFIABLE_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) {
    return {
      error:
        'No se puede enviar desde @' +
        domain +
        '. Añade y verifica tu dominio en https://resend.com/domains y usa en RESEND_EMAIL_FROM un email de ese dominio (ej. Golf Lerma <noreply@golflerma.com>).',
    };
  }

  const payload = {
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    from: fromAddress,
  };
  if (text != null) payload.text = text;

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('Resend error', res.status, data);
    const msg = data.message || data.msg || '';
    if (msg.includes('domain') && msg.toLowerCase().includes('verif')) {
      return {
        error:
          'El dominio del remitente no está verificado. Añade y verifica tu dominio en https://resend.com/domains y usa en RESEND_EMAIL_FROM un email de ese dominio (ej. Golf Lerma <noreply@golflerma.com>).',
      };
    }
    return { error: msg || 'Error al enviar email' };
  }

  return { id: data.id };
}
