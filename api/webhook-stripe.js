/**
 * Webhook Stripe: al completar el pago, dispara reserva.confirmada en el midend (Brevo),
 * mismo contrato que la app Android.
 *
 * No toca Hotelbeds. No usa Resend/Twilio.
 *
 * Env: STRIPE_*, MIDEND_EVENTS_URL (opcional), MIDEND_API_KEY o MIDEND_EVENTS_SECRET
 */

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { voucherDataFromStripeMetadata } from '../lib/hotelbeds-voucher-html.js';
import { confirmacionReservaUrl } from '../lib/site-base-url.js';
import { paqueteIncluyeGuiaBurgos, guiaBurgosPublicUrl } from '../lib/guia-burgos.js';
import { emitMidendEvent, splitPersonName } from '../lib/midend-events.js';

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
  'fin-semana': 'Paquete Golf Burgos',
  'golf-burgos': 'Paquete Golf Burgos',
  'campeonato-burgos': 'Paquete Campeonato',
  cochinillo: 'Paquete Golf + Cochinillo',
  'golf-vino': 'Golf Canalla',
  'golf-canalla': 'Golf Canalla',
  '36-hoyos': 'Golf Ilimitado en Burgos',
  'golf-ilimitado': 'Golf Ilimitado en Burgos',
  'pausa-drive': 'Pausa & Drive',
  'tour-boogie': 'Tour en boogie',
  bautismos: 'Bautismos de golf',
  ryder: 'Ryder Cup',
  torneos: 'Configurador Torneos',
};

function formatFechaEs(iso) {
  const s = String(iso || '').trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
  const numPart = metadata.numParticipantes || metadata.pkg_party_size || '1';
  const amountTotal = session.amount_total != null ? session.amount_total / 100 : 0;
  const nombreProducto = nombresPaquete[paquete] || paquete;

  const customerEmail =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    metadata.pkg_holder_email ||
    null;
  const customerName =
    (session.customer_details && session.customer_details.name) ||
    metadata.pkg_holder_name ||
    '';
  const customerPhone =
    (session.customer_details && session.customer_details.phone) ||
    metadata.pkg_holder_phone ||
    '';

  const { firstName, lastName } = splitPersonName(customerName);

  const fechaIso =
    metadata.pkg_fecha_inicio ||
    metadata.pkg_embed_date ||
    metadata.fecha ||
    '';
  const fecha = formatFechaEs(fechaIso) || fechaIso;
  const hora = String(metadata.pkg_hora || metadata.hora || '').trim();
  const campo = String(
    metadata.campo ||
      metadata.pkg_campo ||
      'Golf Lerma y Saldaña'
  ).trim();

  const voucherData = voucherDataFromStripeMetadata(metadata);
  if (voucherData && !voucherData.packageName) voucherData.packageName = nombreProducto;

  const confirmUrl = confirmacionReservaUrl(request, session.id);
  const conGuia = paqueteIncluyeGuiaBurgos(paquete);
  const guiaUrl = conGuia ? guiaBurgosPublicUrl(request) : '';

  // Misma plantilla Brevo que la app: "Tu salida está confirmada"
  const midend = await emitMidendEvent('reserva.confirmada', {
    contact: {
      email: customerEmail || undefined,
      phone: customerPhone || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      tipo: 'invitado',
      extId: session.id,
    },
    payload: {
      fecha: fecha || undefined,
      hora: hora || undefined,
      campo,
      jugadores: String(numPart),
      referencia: String(session.id || '').slice(0, 24),
      concepto:
        amountTotal > 0
          ? `${nombreProducto} (${amountTotal.toFixed(2)} €)`
          : nombreProducto,
      // extras útiles para plantillas/web (Brevo ignora params no usados)
      paquete,
      packageName: nombreProducto,
      confirmUrl: confirmUrl || undefined,
      guiaBurgosUrl: guiaUrl || undefined,
      amountTotal: amountTotal > 0 ? String(amountTotal.toFixed(2)) : undefined,
      hasHotelbedsVoucher: voucherData ? '1' : '0',
    },
    channels: ['email'],
  });

  if (!midend.ok) {
    console.error('[webhook-stripe] midend reserva.confirmada falló', midend);
  }

  return jsonResponse({
    received: true,
    midend: midend.ok ? 'ok' : 'error',
  });
}
