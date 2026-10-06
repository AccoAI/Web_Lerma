/**
 * API: solicitud promoción torneo → midend (lead.capturado + datos).
 */

import { emitMidendEvent, splitPersonName } from '../lib/midend-events.js';

const MAX_FOTO_BYTES = 2.5 * 1024 * 1024;

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
    const nombreTorneo = str(body.nombre_torneo);
    const contactoEmail = str(body.contacto_email);
    const contactoNombre = str(body.contacto_nombre);

    if (!nombreTorneo) {
      return jsonResponse({ error: 'El nombre del torneo es obligatorio' }, 400);
    }
    if (!contactoEmail) {
      return jsonResponse({ error: 'El email de contacto es obligatorio' }, 400);
    }
    if (!contactoNombre) {
      return jsonResponse({ error: 'Indique su nombre de contacto' }, 400);
    }

    const fotoBase64 = str(body.foto_base64);
    const fotoFilename = str(body.foto_filename) || 'foto-torneo.jpg';
    let foto = null;

    if (fotoBase64) {
      const raw = fotoBase64.replace(/^data:[^;]+;base64,/, '');
      const approxBytes = Math.ceil((raw.length * 3) / 4);
      if (approxBytes > MAX_FOTO_BYTES) {
        return jsonResponse({ error: 'La foto no puede superar 2,5 MB' }, 400);
      }
      foto = { filename: fotoFilename, contentBase64: raw };
    }

    const fields = { ...body };
    delete fields.foto_base64;
    const { firstName, lastName } = splitPersonName(contactoNombre);

    const midend = await emitMidendEvent('lead.capturado', {
      contact: {
        email: contactoEmail,
        phone: str(body.contacto_telefono) || undefined,
        firstName: firstName || contactoNombre,
        lastName: lastName || undefined,
        tipo: 'lead',
      },
      payload: {
        origen: 'web-promociona-torneo',
        torneo: nombreTorneo,
        fecha: str(body.fecha_inicio) || undefined,
        sede: str(body.sede) || undefined,
        fields,
        fotoAdjunta: foto ? foto.filename : undefined,
        ...(foto ? { foto } : {}),
      },
      channels: ['email'],
      timeoutMs: 20000,
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
    console.error('promociona-torneo:', err);
    return jsonResponse({ error: 'Error al enviar la solicitud' }, 500);
  }
}
