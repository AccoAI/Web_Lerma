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

## 5. Webhook + notificación WhatsApp

Cuando un cliente **completa el pago** (checkout.session.completed), el webhook envía un mensaje de WhatsApp al número que configures (por ejemplo el del club) con: paquete, importe, participantes y forma de pago.

### 5.1 Webhook en Stripe

1. Stripe Dashboard > **Developers > Webhooks** > **Add endpoint**
2. **Endpoint URL**: `https://tu-dominio.vercel.app/api/webhook-stripe`
3. **Eventos**: marca `checkout.session.completed`
4. Guarda y copia el **Signing secret** (empieza por `whsec_...`)

### 5.2 Variables de entorno en Vercel

Añade estas variables (además de `STRIPE_SECRET_KEY`):

| Nombre | Descripción |
|--------|-------------|
| `STRIPE_WEBHOOK_SECRET` | El Signing secret del webhook (whsec_...) |
| `TWILIO_ACCOUNT_SID` | Account SID de Twilio (Console) |
| `TWILIO_AUTH_TOKEN` | Auth Token de Twilio |
| `TWILIO_WHATSAPP_FROM` | Número origen WhatsApp: `whatsapp:+34XXXXXXXXX` (producción) o `whatsapp:+14155238886` (sandbox Twilio) |
| `WHATSAPP_NOTIFY_TO` | Número al que enviar la notificación: `whatsapp:+34947564630` (ej. teléfono del club) |
| `RESEND_API_KEY` | API key de Resend (para enviar correo de confirmación al cliente) |
| `RESEND_EMAIL_FROM` | Remitente del correo (ej: `Golf Lerma <reservas@tudominio.com>`) |
| `RESEND_EMAIL_TO` | **(Opcional)** Copia de cada reserva a este correo (ej. del club). La confirmación va al email del cliente (el que introduce en Stripe). |

Después de guardar, haz **Redeploy**. Ver **RESEND-SETUP.md** para configurar Resend.

### 5.3 Configurar WhatsApp (Twilio)

- **Pruebas**: en [Twilio Console](https://console.twilio.com) > **Messaging** > **Try it out** > **Send a WhatsApp message** puedes activar el **Sandbox**. Sigues las instrucciones para unir tu número de prueba al sandbox. Usa como `TWILIO_WHATSAPP_FROM` el número del sandbox (ej. `whatsapp:+14155238886`).
- **Producción**: contrata un número de WhatsApp Business a través de Twilio y úsalo en `TWILIO_WHATSAPP_FROM`. `WHATSAPP_NOTIFY_TO` es el móvil del club (con prefijo país, ej. `whatsapp:+34947564630`).

Ver también **WHATSAPP-NOTIFICACIONES.md** para más detalle.
