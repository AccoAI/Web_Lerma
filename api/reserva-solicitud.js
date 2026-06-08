/**
 * API: solicitud de reserva (bautismos, clases de golf). Pago posterior fuera de la web.
 * POST /api/reserva-solicitud
 */

import { sendEmail } from '../lib/resend.js';

const EMAIL_DESTINO =
  process.env.RESEND_EMAIL_RESERVAS ||
  process.env.RESEND_EMAIL_EMPRESA ||
  'eventos@golflerma.com';

const TIPO_LABELS = {
  bautismos: 'Bautismos de golf',
  'clases-golf': 'Clases de golf',
};

const CAMPO_LABELS = {
  lerma: 'Golf Lerma',
  saldana: 'Saldaña Golf',
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  const d = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, (c) => d[c]);
}

function str(v) {
  return v == null ? '' : String(v).trim();
}

export async function GET() {
  return jsonResponse({ error: 'Use POST para enviar la solicitud' }, 405);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tipo = str(body.tipo);
    const fecha = str(body.fecha);
    const hora = str(body.hora);
    const numPersonas = parseInt(body.num_personas, 10);
    const campo = str(body.campo);
    const nombre = str(body.contacto_nombre);
    const email = str(body.contacto_email);
    const telefono = str(body.contacto_telefono);

    if (!TIPO_LABELS[tipo]) {
      return jsonResponse({ error: 'Tipo de solicitud no válido' }, 400);
    }
    if (!fecha) return jsonResponse({ error: 'La fecha es obligatoria' }, 400);
    if (!hora) return jsonResponse({ error: 'La hora es obligatoria' }, 400);
    if (!numPersonas || numPersonas < 1) {
      return jsonResponse({ error: 'Indique al menos una persona' }, 400);
    }
    if (!campo || !CAMPO_LABELS[campo]) {
      return jsonResponse({ error: 'Seleccione el campo (Lerma o Saldaña)' }, 400);
    }
    if (!nombre) return jsonResponse({ error: 'El nombre es obligatorio' }, 400);
    if (!email) return jsonResponse({ error: 'El email es obligatorio' }, 400);
    if (!telefono) return jsonResponse({ error: 'El teléfono es obligatorio' }, 400);

    const tipoLabel = TIPO_LABELS[tipo];
    const campoLabel = CAMPO_LABELS[campo];
    const subject = 'Solicitud ' + tipoLabel + ' – ' + fecha + ' (' + nombre + ')';

    const rows = [
      ['Servicio', tipoLabel],
      ['Fecha', fecha],
      ['Hora', hora],
      ['Nº personas', String(numPersonas)],
      ['Campo', campoLabel],
      ['Nombre', nombre],
      ['Email', email],
      ['Teléfono', telefono],
    ];

    const text = rows.map(([k, v]) => k + ': ' + v).join('\n');
    const htmlRows = rows
      .map(
        ([k, v]) =>
          '<tr><td style="padding:4px 12px 4px 0;font-weight:600;">' +
          escapeHtml(k) +
          '</td><td style="padding:4px 0;">' +
          escapeHtml(v) +
          '</td></tr>'
      )
      .join('');

    const result = await sendEmail({
      to: EMAIL_DESTINO,
      subject,
      html:
        '<p><strong>Nueva solicitud de reserva (bautismos / clases).</strong></p>' +
        '<p>Tramitar la solicitud y contactar al cliente. El pago, si procede, se gestionará después.</p>' +
        '<p>Responder a: <a href="mailto:' +
        escapeHtml(email) +
        '">' +
        escapeHtml(email) +
        '</a></p>' +
        '<table style="border-collapse:collapse;margin-top:0.75rem;">' +
        htmlRows +
        '</table>',
      text: 'Nueva solicitud de reserva (bautismos / clases). Pago posterior si procede.\nResponder a: ' + email + '\n\n' + text,
    });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('reserva-solicitud:', err);
    return jsonResponse({ error: 'Error al enviar la solicitud' }, 500);
  }
}
