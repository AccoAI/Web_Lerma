# Resend - Correos automáticos (Golf Lerma)

Los correos se envían con [Resend](https://resend.com). Cuando un cliente **completa un pago** (Stripe), se envía un email al club con el resumen de la reserva. El mismo helper se puede usar en otros flujos (formularios de bodas, eventos, etc.).

## 1. Cuenta Resend

1. Regístrate en [resend.com](https://resend.com)
2. En **API Keys** crea una clave y cópiala (empieza por `re_`)

## 2. Variables de entorno (Vercel)

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend (re_...) |
| `RESEND_EMAIL_FROM` | Remitente. **No uses @gmail.com ni otros dominios de correo público.** Debe ser un email de un dominio que hayas añadido y verificado en [resend.com/domains](https://resend.com/domains) (ej. `Golf Lerma <noreply@golflerma.com>`). En pruebas: `onboarding@resend.dev` (solo envía al email de tu cuenta Resend). |
| `RESEND_EMAIL_TO` | **(Opcional)** Copia de cada reserva a este correo (ej. del club). El correo de confirmación va siempre al **cliente** (el email que introduce al pagar en Stripe). |

El destinatario del correo es **dinámico**: en paquetes con pago Stripe es el email que el cliente introduce en el checkout; en formularios (bodas, eventos, etc.) será el email que la persona escriba en el formulario (tu API recibirá ese email en el body y lo usará en `sendEmail({ to: email, ... })`).

## 3. Dominio (producción) — obligatorio para recibir en cualquier correo

**No uses nunca @gmail.com, @hotmail.com, @yahoo.com, etc. como remitente.** Resend no permite enviar desde dominios que no puedes verificar. Si en Vercel tienes `RESEND_EMAIL_FROM` con un email de Gmail (o similar), verás el error: *"The gmail.com domain is not verified"*.

**Qué hacer:**

1. Entra en **[resend.com/domains](https://resend.com/domains)** → **Add Domain**
2. Añade el dominio del club (ej. `golflerma.com`) y los registros DNS que Resend te indique (SPF, DKIM, etc.) en tu proveedor de dominio
3. Cuando el dominio esté **Verified**, en Vercel pon en `RESEND_EMAIL_FROM` un email de ese dominio, por ejemplo:
   - `Golf Lerma <noreply@golflerma.com>` o
   - `Golf Lerma <eventos@golflerma.com>`
4. Redeploy del proyecto en Vercel

En desarrollo puedes usar el remitente de prueba de Resend (`onboarding@resend.dev`); solo podrás enviar **al** email con el que te registraste en Resend.

## 4. Uso en el proyecto

- **Webhook Stripe** (`api/webhook-stripe.js`): al evento `checkout.session.completed` envía un correo de **confirmación al cliente** (al email que introdujo en Stripe) y, si está definido, una **copia al club** (`RESEND_EMAIL_TO`).
- **Helper reutilizable** (`lib/resend.js`): función `sendEmail({ to, subject, html, from?, text? })`. El `to` es siempre dinámico: en paquetes viene de Stripe; en formularios (bodas, eventos, etc.) lo pasas desde el body de la petición (el email que rellene el usuario).

### Ejemplo desde otra API (formularios bodas, eventos, etc.)

El destinatario `to` debe ser el email que haya introducido el usuario en el formulario (dinámico).

```js
import { sendEmail } from '../lib/resend.js';

// Ej: POST body = { email: 'cliente@ejemplo.com', nombre: '...', ... }
const { email } = await request.json();
if (email) {
  await sendEmail({
    to: email,
    subject: 'Hemos recibido tu solicitud - Golf Lerma',
    html: '<p>Gracias por contactar. Te responderemos pronto.</p>',
  });
}
```

El `from` por defecto es `RESEND_EMAIL_FROM`; si no está definido, se usa `Golf Lerma <onboarding@resend.dev>` (solo válido en pruebas).

## 5. Si no llega el correo de confirmación

1. **Stripe → Developers → Webhooks** → tu endpoint `…/api/webhook-stripe` → ¿el último `checkout.session.completed` es **200**? Si es 400 (firma) o no aparece, el email **no se intenta**.
2. **Vercel → Logs** de la función `webhook-stripe` tras un pago. Busca:
   - `Fallo email cliente:` → Resend rechazó el envío (dominio, API key, etc.)
   - `Sin email de cliente` → en Stripe no se recogió email
   - `Email cliente OK` → salió de Resend; mira spam
3. **`RESEND_EMAIL_FROM` en Vercel** debe ser un email de un **dominio verificado** en [resend.com/domains](https://resend.com/domains), p. ej. `Golf Lerma <noreply@golflerma.com>`.
   - Si pones `victor@montesanmillan.com` (u otro dominio sin verificar), Resend **falla** y antes el webhook lo tragaba en silencio.
4. Pruebas rápidas: `RESEND_EMAIL_FROM=Golf Lerma <onboarding@resend.dev>` solo envía al email de la cuenta Resend.
5. Opcional: define `RESEND_EMAIL_TO` con tu correo para recibir **copia al club** de cada reserva.
