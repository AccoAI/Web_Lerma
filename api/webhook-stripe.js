/**
 * Webhook Stripe: al completarse un pago, envía notificación por WhatsApp (Twilio) y correo (Resend).
 *
 * Configurar en Stripe: Developers > Webhooks > Add endpoint
 *   URL: https://tu-dominio.vercel.app/api/webhook-stripe
 *   Eventos: checkout.session.completed
 *
 * Variables de entorno en Vercel:
 *   STRIPE_SECRET_KEY      - ya usada en crear-pago
 *   STRIPE_WEBHOOK_SECRET  - Signing secret del webhook (whsec_...)
 *   STRIPE_WEBHOOK_SECRET_LOCAL - (opcional) Para desarrollo: secret del CLI (stripe listen). Si está definida, se usa en lugar de STRIPE_WEBHOOK_SECRET.
 *   TWILIO_* / WHATSAPP_*  - Para WhatsApp (ver STRIPE-SETUP.md)
 *   RESEND_API_KEY         - API key de Resend
 *   RESEND_EMAIL_FROM      - Remitente (ej: Golf Lerma <reservas@tudominio.com>)
 *   RESEND_EMAIL_TO        - (Opcional) Copia de cada reserva a este correo (ej. del club)
 *   El correo de confirmación se envía al email del cliente (el que introduce en Stripe al pagar).
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../lib/resend.js';

function loadLocalWebhookSecret() {
  if (process.env.STRIPE_WEBHOOK_SECRET_LOCAL) return process.env.STRIPE_WEBHOOK_SECRET_LOCAL;
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const envPath = join(__dirname, '..', '.env.local');
    if (!existsSync(envPath)) return '';
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/STRIPE_WEBHOOK_SECRET_LOCAL\s*=\s*([^\r\n#]+)/m);
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

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
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendWhatsAppTwilio(body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.WHATSAPP_NOTIFY_TO;

  if (!accountSid || !authToken || !from || !to) {
    console.warn('WhatsApp (Twilio) no configurado: faltan variables de entorno');
    return;
  }

  const params = new URLSearchParams();
  params.set('To', to);
  params.set('From', from);
  params.set('Body', body);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Twilio WhatsApp error', res.status, errText);
  }
}

export async function GET() {
  return jsonResponse(
    { error: 'Método no permitido', hint: 'Este endpoint es un webhook Stripe (POST)' },
    405
  );
}

export async function POST(request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const localSecretRaw = loadLocalWebhookSecret();
  const mainSecretRaw = process.env.STRIPE_WEBHOOK_SECRET || '';
  const webhookSecret = (localSecretRaw.trim() || mainSecretRaw).trim().replace(/^["']|["']$/g, '');

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY no configurada');
    return jsonResponse({ error: 'Webhook no configurado' }, 500);
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no configurada');
    return jsonResponse({ error: 'Webhook secret no configurado' }, 500);
  }

  let event;
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  try {
    const stripe = new Stripe(stripeSecretKey);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error(
      'Webhook Stripe signature error:',
      err.message,
      '| bodyLength:',
      rawBody.length,
      '| usingLocalSecret:',
      !!localSecretRaw.trim()
    );
    return jsonResponse({ error: 'Firma inválida' }, 400);
  }

  if (event.type !== 'checkout.session.completed') {
    return jsonResponse({ received: true });
  }

  const session = event.data.object;
  const metadata = session.metadata || {};
  const paquete = metadata.paquete || 'paquete';
  const numPart = metadata.numParticipantes || '1';
  const modo = metadata.modo || 'unico';
  const amountTotal = session.amount_total != null ? session.amount_total / 100 : 0;
  const nombreProducto = nombresPaquete[paquete] || paquete;

  // Email del cliente (el que pagó): Stripe lo recoge en el checkout
  const customerEmail =
    session.customer_details?.email || session.customer_email || null;

  const pagoTipo = modo === 'por_persona' ? 'Por persona' : 'Único';
  const subjectConfirmacion = `Confirmación de tu reserva - ${nombreProducto}`;
  const htmlConfirmacion =
    `<h2>Confirmación de reserva</h2>` +
    `<p>Gracias por tu reserva en Golf Lerma.</p>` +
    `<p><strong>Paquete:</strong> ${nombreProducto}</p>` +
    `<p><strong>Importe abonado:</strong> ${amountTotal.toFixed(2)} €</p>` +
    `<p><strong>Participantes:</strong> ${numPart}</p>` +
    `<p><strong>Forma de pago:</strong> ${pagoTipo}</p>` +
    `<p>Para cualquier consulta: (+34) 947 56 46 30.</p>`;

  // 1) Correo al cliente (destinatario dinámico: quien pagó)
  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: subjectConfirmacion,
      html: htmlConfirmacion,
    });
  }

  // 2) Copia opcional al club (variable de entorno fija)
  const emailCopiaClub = process.env.RESEND_EMAIL_TO;
  if (emailCopiaClub) {
    await sendEmail({
      to: emailCopiaClub,
      subject: `[Club] Nueva reserva: ${nombreProducto}`,
      html:
        `<h2>Nueva reserva pagada</h2>` +
        `<p><strong>Paquete:</strong> ${nombreProducto}</p>` +
        `<p><strong>Importe:</strong> ${amountTotal.toFixed(2)} €</p>` +
        `<p><strong>Participantes:</strong> ${numPart}</p>` +
        `<p><strong>Pago:</strong> ${pagoTipo}</p>` +
        (customerEmail ? `<p><strong>Cliente:</strong> ${customerEmail}</p>` : ''),
    });
  }

  const mensaje =
    `✅ *Nueva reserva pagada*\n\n` +
    `*Paquete:* ${nombreProducto}\n` +
    `*Importe:* ${amountTotal.toFixed(2)} €\n` +
    `*Participantes:* ${numPart}\n` +
    `*Pago:* ${modo === 'por_persona' ? 'Por persona' : 'Único'}\n`;

  await sendWhatsAppTwilio(mensaje);

  return jsonResponse({ received: true });
}
