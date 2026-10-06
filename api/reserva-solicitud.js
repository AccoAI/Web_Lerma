/**
 * API: solicitud de reserva (bautismos, clases) → midend Brevo.
 */

import { emitMidendEvent, splitPersonName } from '../lib/midend-events.js';

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

    const { firstName, lastName } = splitPersonName(nombre);
    const tipoLabel = TIPO_LABELS[tipo];
    const campoLabel = CAMPO_LABELS[campo];

    // Misma plantilla de confirmación que la app (solicitud tratada como reserva a confirmar).
    const midend = await emitMidendEvent('reserva.confirmada', {
      contact: {
        email,
        phone: telefono,
        firstName: firstName || nombre,
        lastName: lastName || undefined,
        tipo: 'lead',
      },
      payload: {
        fecha,
        hora,
        campo: campoLabel,
        jugadores: String(numPersonas),
        referencia: `SOL-${tipo}-${fecha}`.slice(0, 40),
        concepto: `Solicitud ${tipoLabel} (pago posterior)`,
      },
      channels: ['email'],
    });

    if (!midend.ok) {
      return jsonResponse(
        {
          error:
            midend.status === 401
              ? 'Midend no autorizado (revisa MIDEND_API_KEY en Vercel).'
              : 'No se pudo registrar la solicitud. Inténtalo de nuevo.',
        },
        midend.status === 401 ? 503 : 502
      );
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('reserva-solicitud:', err);
    return jsonResponse({ error: 'Error al enviar la solicitud' }, 500);
  }
}
