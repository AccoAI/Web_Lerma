# WhatsApp / Twilio — OBSOLETO para notificaciones

Las notificaciones de reserva y el reenvío de la guía **ya no usan Twilio** desde esta web.

Pasan al **midend + Brevo**. Ver [MIDEND-COMUNICACIONES.md](./MIDEND-COMUNICACIONES.md).

## Qué sí permanece

- Botón de atención al cliente: `wa.me` en `js/chatbot.js` (enlace directo al móvil del club).
- Descarga de la guía PDF en la página de confirmación.

`lib/twilio-whatsapp.js` y `api/enviar-guia-whatsapp.js` (responde 410) quedan como referencia / desactivados.
