/**
 * Vercel Serverless Function: crear Payment Link de Stripe
 * POST /api/crear-pago
 * Body: { amountCents, modo, numParticipantes, paquete }
 *
 * Configurar STRIPE_SECRET_KEY en Variables de Entorno de Vercel
 */
const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY no configurada');
    res.status(500).json({ error: 'Configuración de pago no disponible' });
    return;
  }

  try {
    const { amountCents, modo, numParticipantes, paquete } = req.body || {};

    if (!amountCents || amountCents < 50) {
      res.status(400).json({ error: 'Importe inválido (mínimo 0,50 €)' });
      return;
    }

    const numPart = Math.max(1, parseInt(numParticipantes, 10) || 1);
    const modoPago = (modo === 'por_persona') ? 'por_persona' : 'unico';

    const unitAmountCents = modoPago === 'por_persona'
      ? Math.round(amountCents / numPart)
      : amountCents;

    if (unitAmountCents < 50) {
      res.status(400).json({ error: 'El importe por persona es demasiado bajo (mín. 0,50 €)' });
      return;
    }

    const stripe = new Stripe(stripeSecretKey);

    const nombresPaquete = {
      'fin-semana': 'Fin de Semana Golf Burgos',
      'cochinillo': 'Paquete Golf + Cochinillo',
      'golf-vino': 'Paquete Golf y Vino',
      '36-hoyos': '36 Hoyos Golf',
      'pausa-drive': 'Pausa & Drive',
      'tour-boogie': 'Tour en boogie',
      'bautismos': 'Bautismos de golf',
      'ryder': 'Ryder Cup',
      'torneos': 'Configurador Torneos'
    };

    const nombreProducto = nombresPaquete[paquete] || paquete || 'Reserva Golf Lerma';
    const descripcion = modoPago === 'por_persona'
      ? `Pago por persona (${numPart} participantes)`
      : 'Pago del paquete completo';

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: unitAmountCents,
          product_data: {
            name: nombreProducto,
            description: descripcion,
          },
        },
        quantity: 1,
      }],
      metadata: {
        paquete: String(paquete || ''),
        modo: modoPago,
        numParticipantes: String(numPart),
      },
    });

    res.status(200).json({ url: paymentLink.url });
  } catch (err) {
    console.error('Error Stripe:', err.message || err);
    res.status(500).json({ error: 'Error al crear el enlace de pago' });
  }
};
