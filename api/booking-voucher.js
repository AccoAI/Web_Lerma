/**
 * Bono / voucher imprimible (HTML) para certificación Hotelbeds §4.5.
 *
 * GET  /api/booking-voucher?session_id=cs_... — recupera metadata Stripe (hb_*) y genera el documento.
 * GET  /api/booking-voucher?session_id=...&download=1 — mismo HTML como adjunto.
 * POST /api/booking-voucher — body: { booking: <Hotelbeds BookingRS> } o envoltorio { booking: {...} };
 *        opcional: { voucher: {...} } ya mapeado al shape de buildHotelbedsVoucherHtml;
 *        download: true para Content-Disposition: attachment.
 */
import Stripe from 'stripe';
import { mapHotelbedsBookingToVoucherData } from '../lib/hotelbeds-booking-map.js';
import {
  buildHotelbedsVoucherHtml,
  wrapHotelbedsVoucherDocument,
  voucherDataFromStripeMetadata,
} from '../lib/hotelbeds-voucher-html.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function htmlResponse(html, { attachment = false, filename = 'bono-confirmacion-golf-lerma.html' } = {}) {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
  };
  if (attachment) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  }
  return new Response(html, { status: 200, headers });
}

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const download = url.searchParams.get('download') === '1';

  if (!sessionId) {
    return json(
      {
        ok: false,
        hint:
          'GET requiere session_id (Checkout Session de Stripe tras el pago). Ej.: /api/booking-voucher?session_id=cs_... También: POST JSON { booking: HotelbedsBookingRS }.',
      },
      400
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return json({ error: 'Configuración de pago no disponible' }, 500);
  }

  const stripe = new Stripe(stripeSecretKey);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error('booking-voucher session:', e.message || e);
    return json({ error: 'Sesión no encontrada o no válida' }, 404);
  }

  const data = voucherDataFromStripeMetadata(session.metadata || {});
  if (!data) {
    return json(
      {
        error:
          'No hay datos de bono (metadata hb_*) en esta sesión. El enlace de pago debe crearse con hotelbedsVoucher en POST /api/crear-pago o añadir la reserva Hotelbeds al metadata.',
      },
      404
    );
  }

  const inner = buildHotelbedsVoucherHtml(data);
  const doc = wrapHotelbedsVoucherDocument(inner);
  return htmlResponse(doc, { attachment: download });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo JSON inválido' }, 400);
  }

  const download = body.download === true || body.download === '1';

  if (body.voucher && typeof body.voucher === 'object') {
    const inner = buildHotelbedsVoucherHtml(body.voucher);
    const doc = wrapHotelbedsVoucherDocument(inner);
    return htmlResponse(doc, { attachment: download });
  }

  const raw = body.booking != null ? { booking: body.booking } : body;
  const data = mapHotelbedsBookingToVoucherData(raw);
  if (!data) {
    return json(
      {
        error:
          'No se pudo mapear el JSON. Se necesita al menos booking.reference, hotel.name y dirección de hotel (address).',
      },
      422
    );
  }

  const inner = buildHotelbedsVoucherHtml(data);
  const doc = wrapHotelbedsVoucherDocument(inner);
  return htmlResponse(doc, { attachment: download });
}
