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

## 5. Webhooks (recomendado para producción)

Para registrar pagos exitosos y actualizar reservas, configura un webhook en Stripe:

1. Stripe Dashboard > **Developers > Webhooks**
2. Añade endpoint: `https://tu-dominio.vercel.app/api/webhook-stripe` (crear esta función si se necesita)
3. Eventos: `checkout.session.completed` o `payment_intent.succeeded`
