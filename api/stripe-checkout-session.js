/**
 * GET /api/stripe-checkout-session?session_id=cs_...
 * Devuelve un subconjunto seguro de la Checkout Session para la página de confirmación (sin secretos).
 */
import Stripe from 'stripe';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) {
    return json({ error: 'Parámetro session_id requerido' }, 400);
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
    console.error('stripe-checkout-session:', e.message || e);
    return json({ error: 'Sesión no encontrada' }, 404);
  }

  const meta = session.metadata || {};
  const voucherAvailable = !!(meta.hb_booking_ref && meta.hb_hotel_name && meta.hb_hotel_address);

  return json({
    ok: true,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
    currency: session.currency,
    customer_email: session.customer_details?.email || null,
    paquete: meta.paquete || null,
    voucher_available: voucherAvailable,
    voucher_url: voucherAvailable
      ? `/api/booking-voucher?session_id=${encodeURIComponent(sessionId)}`
      : null,
    voucher_download_url: voucherAvailable
      ? `/api/booking-voucher?session_id=${encodeURIComponent(sessionId)}&download=1`
      : null,
  });
}
