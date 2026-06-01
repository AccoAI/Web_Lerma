/**
 * Datos de recibo a partir de una Checkout Session de Stripe (confirmación post-pago).
 */
export async function buildCheckoutReceipt(stripe, session) {
  const currency = (session.currency || 'eur').toLowerCase();
  const amountTotal = session.amount_total != null ? session.amount_total / 100 : null;

  let lineItems = [];
  try {
    const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
    lineItems = (li.data || []).map((item) => ({
      description: item.description || item.price?.product?.name || 'Reserva Golf Lerma',
      amount: item.amount_total != null ? item.amount_total / 100 : null,
      quantity: item.quantity || 1,
    }));
  } catch (e) {
    console.warn('listLineItems:', e.message || e);
  }

  let paymentMethodLabel = null;
  const piId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && session.payment_intent.id;

  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['payment_method'] });
      const pm = pi.payment_method;
      if (pm && typeof pm === 'object' && pm.card) {
        const brand = formatCardBrand(pm.card.brand);
        paymentMethodLabel = brand + ' ···· ' + (pm.card.last4 || '****');
      } else if (session.payment_method_types && session.payment_method_types[0]) {
        paymentMethodLabel = session.payment_method_types[0];
      }
    } catch (e) {
      console.warn('payment_intent:', e.message || e);
    }
  }

  const created = session.created
    ? new Date(session.created * 1000).toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  return {
    amount_total: amountTotal,
    currency,
    created_at: created,
    created_unix: session.created || null,
    customer_email: session.customer_details?.email || session.customer_email || null,
    customer_name: session.customer_details?.name || null,
    payment_status: session.payment_status,
    payment_method: paymentMethodLabel,
    line_items: lineItems,
    session_id: session.id,
  };
}

function formatCardBrand(brand) {
  const map = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
  };
  return map[String(brand || '').toLowerCase()] || String(brand || 'Tarjeta');
}
