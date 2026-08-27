/**
 * Reenvío / envío bajo demanda de la guía Golf en Burgos por WhatsApp (Twilio).
 * POST { session_id } — solo si el pago Stripe está completed/paid y el paquete incluye guía.
 */

import Stripe from 'stripe';
import {
  paqueteIncluyeGuiaBurgos,
  guiaBurgosPublicUrl,
} from '../lib/guia-burgos.js';
import { sendWhatsAppTwilio, normalizeWhatsAppAddress } from '../lib/twilio-whatsapp.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  return json({ error: 'Método no permitido' }, 405);
}

export async function POST(request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return json({ ok: false, error: 'Stripe no configurado' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido' }, 400);
  }

  const sessionId = body && body.session_id ? String(body.session_id).trim() : '';
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return json({ ok: false, error: 'session_id inválido' }, 400);
  }

  const stripe = new Stripe(stripeKey);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return json({ ok: false, error: 'Sesión no encontrada' }, 404);
  }

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return json({ ok: false, error: 'El pago no está confirmado' }, 400);
  }

  const meta = session.metadata || {};
  const paquete = meta.paquete || '';
  if (!paqueteIncluyeGuiaBurgos(paquete)) {
    return json({ ok: false, error: 'Este paquete no incluye la guía' }, 400);
  }

  const guiaUrl = guiaBurgosPublicUrl(request);
  if (!guiaUrl) {
    return json({ ok: false, error: 'No hay URL pública de la guía' }, 500);
  }

  const customerPhone =
    (session.customer_details && session.customer_details.phone) ||
    meta.pkg_holder_phone ||
    '';
  const toCustomer = normalizeWhatsAppAddress(customerPhone);
  const toClub = normalizeWhatsAppAddress(process.env.WHATSAPP_NOTIFY_TO);

  // Preferimos el móvil del cliente; si no hay, el del club (NOTIFY_TO).
  const to = toCustomer || toClub;
  if (!to) {
    return json({
      ok: false,
      error: 'No hay teléfono WhatsApp (ni en el pago ni WHATSAPP_NOTIFY_TO)',
    }, 400);
  }

  const nombre = paquete || 'tu paquete';
  const mensaje =
    `Golf Lerma — Guía Golf en Burgos\n\n` +
    `Gracias por tu reserva (${nombre}).\n` +
    `Descarga tu guía aquí:\n${guiaUrl}\n`;

  const attach =
    process.env.WHATSAPP_ATTACH_GUIDE_PDF === '1' || body.attach_pdf === true;

  const result = await sendWhatsAppTwilio({
    to,
    body: mensaje,
    mediaUrl: attach ? guiaUrl : undefined,
    // Plantilla sandbox Appointment: "Your appointment is coming up on {{1}} at {{2}}"
    templateFallbackVars: {
      '1': `guía Golf Burgos (${nombre})`,
      '2': guiaUrl.slice(0, 200),
    },
  });

  if (!result.ok) {
    let twilioMsg = result.message || '';
    let twilioCode = result.code != null ? result.code : null;
    if (!twilioMsg && result.error) {
      try {
        const parsed = JSON.parse(result.error);
        twilioMsg = parsed.message || '';
        twilioCode = parsed.code != null ? parsed.code : twilioCode;
      } catch {
        twilioMsg = String(result.error).slice(0, 280);
      }
    }
    console.error('[enviar-guia-whatsapp] Twilio fail', {
      status: result.status,
      code: twilioCode,
      message: twilioMsg,
      to,
    });
    let hint = '';
    if (twilioCode === 63016) {
      hint =
        ' (Fuera de ventana 24h: escribe "join …" al sandbox de Twilio y reintenta, o usa plantilla.)';
    } else if (twilioCode === 63015) {
      hint = ' (Tu móvil no está unido al sandbox: envía join … a +1 415 523 8886.)';
    }
    return json(
      {
        ok: false,
        error: result.skipped
          ? 'WhatsApp (Twilio) no configurado en el servidor'
          : twilioMsg
            ? `Twilio: ${twilioMsg}${hint}`
            : `Twilio no pudo enviar el mensaje${hint}`,
        code: twilioCode,
        detail: result.error || null,
      },
      502
    );
  }

  return json({
    ok: true,
    toMasked: to.replace(/\d(?=\d{4})/g, '•'),
    withMedia: !!result.withMedia,
    viaTemplate: !!result.viaTemplate,
  });
}
