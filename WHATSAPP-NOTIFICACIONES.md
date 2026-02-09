# Notificaciones por WhatsApp - Golf Lerma

Cuando un cliente **paga una reserva** (Stripe checkout completado), se envía un mensaje de WhatsApp al número configurado (por ejemplo el del club) con el resumen de la reserva.

## Servicio usado: Twilio

El envío de WhatsApp se hace con la API de **Twilio** (Programmable Messaging). No hace falta instalar ningún paquete extra; se usa `fetch` contra la API REST de Twilio.

## Variables de entorno (Vercel)

| Variable | Descripción |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Account SID de tu cuenta Twilio (Console) |
| `TWILIO_AUTH_TOKEN` | Auth Token de Twilio |
| `TWILIO_WHATSAPP_FROM` | Número desde el que se envía. Formato: `whatsapp:+34XXXXXXXXX`. En sandbox: `whatsapp:+14155238886` |
| `WHATSAPP_NOTIFY_TO` | Número al que llega la notificación (ej. club). Formato: `whatsapp:+34947564630` |

Si alguna no está configurada, el webhook sigue respondiendo OK a Stripe pero no se envía WhatsApp (se registra un aviso en logs).

## Flujo

1. El cliente completa el pago en Stripe (pago único o uno de los pagos por persona).
2. Stripe envía un evento `checkout.session.completed` a `POST /api/webhook-stripe`.
3. El webhook verifica la firma, lee el evento y construye un texto con: paquete, importe, participantes, forma de pago.
4. Se llama a la API de Twilio para enviar ese texto por WhatsApp al número `WHATSAPP_NOTIFY_TO`.

## Twilio: Sandbox vs Producción

- **Sandbox**: en [Twilio Console](https://console.twilio.com) > Messaging > Try it out > Send a WhatsApp message puedes activar el sandbox. Te dan un número (ej. +1 415 523 8886). Debes unir tu número de móvil al sandbox (envías un código por WhatsApp). Solo los números unidos al sandbox pueden recibir mensajes en modo prueba. Usa `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (o el que indique Twilio).
- **Producción**: necesitas un número de WhatsApp Business aprobado por Twilio/Meta. Twilio te guía en el proceso. Ese número será tu `TWILIO_WHATSAPP_FROM`.

## Mensaje de ejemplo

```
✅ *Nueva reserva pagada*

*Paquete:* Fin de Semana Golf Burgos
*Importe:* 450.00 €
*Participantes:* 4
*Pago:* Por persona
```

## Extender a otros eventos

Si más adelante quieres enviar WhatsApp también cuando se envíe un formulario (bodas, eventos, etc.), puedes:

- Crear un endpoint `POST /api/enviar-formulario-bodas` (o similar) que, tras validar el envío, llame a la misma lógica de envío Twilio (puedes extraer `sendWhatsAppTwilio` a un módulo compartido), o
- Reutilizar la función serverless actual copiando el bloque de Twilio en ese nuevo endpoint.
