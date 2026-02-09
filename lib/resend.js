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
export async function sendEmail({ to, subject, html, from, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.RESEND_EMAIL_FROM;

  if (!apiKey) {
    console.warn('Resend: RESEND_API_KEY no configurada');
    return { error: 'Email no configurado' };
  }

  const payload = {
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    from: from || defaultFrom || 'Golf Lerma <onboarding@resend.dev>',
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
    return { error: data.message || data.msg || 'Error al enviar email' };
  }

  return { id: data.id };
}
