/**
 * API: consulta Eventos de Empresa → midend (lead.capturado).
 */

import { emitMidendEvent } from '../lib/midend-events.js';

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

    const midend = await emitMidendEvent('lead.capturado', {
      contact: {
        email,
        firstName: empresa || email.split('@')[0],
        tipo: 'lead',
        consentMarketing: false,
      },
      payload: {
        empresa: empresa || undefined,
        mensaje: mensaje || undefined,
        origen: 'web-contacto-empresa',
      },
      channels: ['email'],
    });

    if (!midend.ok) {
      return jsonResponse(
        {
          error:
            midend.status === 401
              ? 'Midend no autorizado (revisa MIDEND_API_KEY en Vercel).'
              : 'No se pudo enviar la consulta. Inténtalo de nuevo.',
        },
        midend.status === 401 ? 503 : 502
      );
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('contacto-empresa:', err);
    return jsonResponse({ error: 'Error al enviar la consulta' }, 500);
  }
}
