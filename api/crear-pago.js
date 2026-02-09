/**
 * Vercel Serverless Function: crear Payment Link de Stripe
 * POST /api/crear-pago
 * Body: { amountCents, modo, numParticipantes, paquete }
 *
 * Configurar STRIPE_SECRET_KEY en Variables de Entorno de Vercel
 */
import Stripe from 'stripe';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  return jsonResponse(
    { error: 'Método no permitido', hint: 'Use POST para crear un enlace de pago' },
    405
  );
}

export async function POST(request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY no configurada');
    return jsonResponse({ error: 'Configuración de pago no disponible' }, 500);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { amountCents, modo, numParticipantes, paquete } = body;

    if (!amountCents || amountCents < 50) {
      return jsonResponse({ error: 'Importe inválido (mínimo 0,50 €)' }, 400);
    }

    const numPart = Math.max(1, parseInt(numParticipantes, 10) || 1);
    const modoPago = modo === 'por_persona' ? 'por_persona' : 'unico';

    const unitAmountCents =
      modoPago === 'por_persona' ? Math.round(amountCents / numPart) : amountCents;

    if (unitAmountCents < 50) {
      return jsonResponse(
        { error: 'El importe por persona es demasiado bajo (mín. 0,50 €)' },
        400
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const nombresPaquete = {
      'fin-semana': 'Fin de Semana Golf Burgos',
      cochinillo: 'Paquete Golf + Cochinillo',
      'golf-vino': 'Paquete Golf y Vino',
      '36-hoyos': '36 Hoyos Golf',
      'pausa-drive': 'Pausa & Drive',
      'tour-boogie': 'Tour en boogie',
      bautismos: 'Bautismos de golf',
      ryder: 'Ryder Cup',
      torneos: 'Configurador Torneos',
      'primera-cuota': 'Primera cuota socio - Golf Lerma',
    };

    const nombreProducto = nombresPaquete[paquete] || paquete || 'Reserva Golf Lerma';
    const descripcion =
      modoPago === 'por_persona'
        ? `Pago por persona (${numPart} participantes)`
        : 'Pago del paquete completo';

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: unitAmountCents,
            product_data: {
              name: nombreProducto,
              description: descripcion,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        paquete: String(paquete || ''),
        modo: modoPago,
        numParticipantes: String(numPart),
      },
    });

    return jsonResponse({ url: paymentLink.url });
  } catch (err) {
    console.error('Error Stripe:', err.message || err);
    return jsonResponse({ error: 'Error al crear el enlace de pago' }, 500);
  }
}
