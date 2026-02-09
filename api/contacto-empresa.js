/**
 * API: envío de consulta Eventos de Empresa (Resend).
 * POST /api/contacto-empresa
 * Body: { email, empresa?, mensaje? }
 *
 * Variables de entorno en Vercel:
 *   RESEND_API_KEY       - API key de Resend
 *   RESEND_EMAIL_FROM    - Remitente (ej: Golf Lerma <noreply@tudominio.com>)
 *   RESEND_EMAIL_EMPRESA - (Opcional) Destino consultas empresa (default: eventos@golflerma.com)
 */

import { sendEmail } from '../lib/resend.js';

const EMAIL_DESTINO = process.env.RESEND_EMAIL_EMPRESA || 'eventos@golflerma.com';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  return jsonResponse({ error: 'Use POST para enviar la consulta' }, 405);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').trim();
    const empresa = (body.empresa || '').trim();
    const mensaje = (body.mensaje || '').trim();

    if (!email) {
      return jsonResponse({ error: 'El email corporativo es obligatorio' }, 400);
    }

    const subject = 'Consulta evento empresa' + (empresa ? ` - ${empresa}` : '');
    const text = [
      `Email corporativo: ${email}`,
      empresa ? `Empresa: ${empresa}` : '',
      mensaje ? `Mensaje:\n${mensaje}` : '',
    ].filter(Boolean).join('\n');

    const html = [
      '<p><strong>Email corporativo:</strong> ' + escapeHtml(email) + '</p>',
      empresa ? '<p><strong>Empresa:</strong> ' + escapeHtml(empresa) + '</p>' : '',
      mensaje ? '<p><strong>Mensaje:</strong></p><pre style="white-space:pre-wrap;font-family:inherit;">' + escapeHtml(mensaje) + '</pre>' : '',
    ].filter(Boolean).join('');

    const result = await sendEmail({
      to: EMAIL_DESTINO,
      subject,
      html,
      text,
    });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('contacto-empresa:', err);
    return jsonResponse({ error: 'Error al enviar la consulta' }, 500);
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  const d = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, (c) => d[c]);
}
