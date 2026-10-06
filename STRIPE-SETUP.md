# Configuración de Stripe - Golf Lerma

## 1. Cuenta Stripe

1. Crea una cuenta en [stripe.com](https://stripe.com)
2. En el Dashboard, ve a **Developers > API keys**
3. Copia la **Secret key** (empieza por `sk_test_` para pruebas, `sk_live_` para producción)

## 2. Variable de entorno en Vercel

1. En el proyecto de Vercel: **Settings > Environment Variables**
2. Añade una variable:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: tu clave secreta (sk_test_... o sk_live_...)
   - **Environment**: Production (y Preview si quieres probar en deploy previews)

3. Redeploy el proyecto para que tome la nueva variable.

## 3. Pruebas locales (opcional)

Para probar el API localmente con `vercel dev`:

1. Crea un archivo `.env` en la raíz (no lo subas a git)
2. Añade: `STRIPE_SECRET_KEY=sk_test_xxx`

## 4. Flujo de pago

- **Pago único**: el usuario es redirigido a Stripe Checkout para pagar el total.
- **Pago por persona**: se muestra un modal con un enlace para compartir; cada participante usa el mismo enlace para pagar su parte.

## 5. Webhook + midend (comunicaciones)

Cuando un cliente **completa el pago** (`checkout.session.completed`), el webhook **emite un evento JSON al midend**. Email/WhatsApp los gestiona el midend con Brevo — no Resend ni Twilio desde esta web.

Ver **MIDEND-COMUNICACIONES.md**.

### 5.1 Webhook en Stripe

1. Stripe Dashboard > **Developers > Webhooks** > **Add endpoint**
2. **Endpoint URL**: `https://tu-dominio.vercel.app/api/webhook-stripe`
3. **Eventos**: marca `checkout.session.completed`
4. Guarda y copia el **Signing secret** (empieza por `whsec_...`)

### 5.2 Variables de entorno en Vercel

Añade estas variables (además de `STRIPE_SECRET_KEY`):

| Nombre | Descripción |
|--------|-------------|
| `STRIPE_WEBHOOK_SECRET` | El Signing secret del webhook (`whsec_...`) |
| `MIDEND_API_KEY` | Misma clave que en plataforma (`X-Midend-Key`) |
| `MIDEND_EVENTS_URL` | (Opcional) Default: plataforma `/api/comms/events` |

Después de guardar, haz **Redeploy**.

El botón WhatsApp de atención al cliente (`wa.me` en el chatbot) **no** depende de este webhook.

