# Notificaciones por WhatsApp - Golf Lerma

Cuando un cliente **paga una reserva** (Stripe checkout completado), se envía un mensaje de WhatsApp al número configurado (por ejemplo el del club) con el resumen de la reserva.

## Estado actual (checklist)

| Pieza | Estado |
|-------|--------|
| Código webhook + Twilio | Listo (`api/webhook-stripe.js`, `lib/twilio-whatsapp.js`) |
| Vars en Vercel: `TWILIO_*` + `WHATSAPP_NOTIFY_TO` | **Sí** (Production / Preview / Development) |
| PDF guía en prod | **Sí** → https://web-lerma.vercel.app/pdf/guia-golf-burgos.pdf |
| UI descarga en confirmación | **Sí** (tras deploy) |
| Email con enlace a la guía | **Sí** (Burgos / Campeonato) |
| WhatsApp **al club** (aviso + MediaUrl PDF) | **Debería funcionar** con las vars actuales |
| WhatsApp **al cliente** automático | **No activo** — falta plantilla + flags (ver abajo) |
| `WHATSAPP_SEND_GUIDE_TO_CUSTOMER` en Vercel | **No** (correcto hasta tener plantilla) |
| Teléfono en Stripe Checkout | **Activado** (`phone_number_collection` en `crear-pago.js`) |

### Cómo comprobar el WhatsApp al club (5 min)

1. Haz un pago de prueba (Stripe test) de Paquete Burgos o Campeonato.
2. Mira el móvil de `WHATSAPP_NOTIFY_TO`: debe llegar el resumen.
3. Si el paquete lleva guía, el mensaje incluye el enlace/PDF.
4. Si no llega: Vercel → Deployments → Functions → logs de `/api/webhook-stripe` (busca `Twilio WhatsApp error` o `no configurado`).
5. Si usáis **Sandbox** (`+14155238886`), el número destino debe estar **unido al sandbox** (código que da Twilio).

### Cómo activar WhatsApp al cliente (cuando estéis listos)

1. En [Twilio Console](https://console.twilio.com) → **Content Template Builder**: crea plantilla WhatsApp tipo **media/document** (o texto + URL) con la guía.
2. Envíala a **aprobación Meta** y espera estado Approved. Copia el **Content SID** (`HX…`).
3. En Vercel → Environment Variables:
   - `WHATSAPP_SEND_GUIDE_TO_CUSTOMER` = `1`
   - `TWILIO_GUIDE_CONTENT_SID` = `HX…`
4. Ajusta las variables de plantilla en el código si tu plantilla no usa `1` = nombre paquete y `2` = URL PDF (ver `api/webhook-stripe.js`).
5. Redeploy. El teléfono sale de Stripe (`customer_details.phone`) o de `pkg_holder_phone`.

> En producción, Meta **no** deja enviar freeform+`MediaUrl` a clientes fríos: hace falta plantilla. El sandbox sí permite pruebas freeform a números unidos.

## Servicio usado: Twilio

API REST de Twilio vía `fetch`. Módulo: `lib/twilio-whatsapp.js` (soporta `Body`, `MediaUrl` y `ContentSid`).

## Variables de entorno (Vercel)

| Variable | Descripción |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Account SID |
| `TWILIO_AUTH_TOKEN` | Auth Token |
| `TWILIO_WHATSAPP_FROM` | Origen: `whatsapp:+34…` o sandbox `whatsapp:+14155238886` |
| `WHATSAPP_NOTIFY_TO` | Destino club: `whatsapp:+34638722973` (móvil con WhatsApp; no usar el 947 fijo) |
| `WHATSAPP_SEND_GUIDE_TO_CUSTOMER` | `1` = intentar envío al cliente |
| `TWILIO_GUIDE_CONTENT_SID` | Content SID de la plantilla de guía (`HX…`) |

## Guía Golf en Burgos (PDF)

- Archivo: `/pdf/guia-golf-burgos.pdf`
- Paquetes: `golf-burgos`, `campeonato-burgos`, `fin-semana`
- Tras el pago: email + página de confirmación + WhatsApp al club (MediaUrl)

## Flujo

1. Pago Stripe → `checkout.session.completed` → `POST /api/webhook-stripe`
2. Email al cliente (+ copia club si `RESEND_EMAIL_TO`)
3. WhatsApp al club
4. Si flags + teléfono + plantilla → WhatsApp al cliente con guía

## Sandbox vs Producción

- **Sandbox**: Messaging → Try WhatsApp → unir tu móvil. `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`
- **Producción**: número WhatsApp Business aprobado por Twilio/Meta
