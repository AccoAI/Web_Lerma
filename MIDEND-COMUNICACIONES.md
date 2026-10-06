# Comunicaciones — Midend + Brevo (igual que la app)

La web dispara los **mismos eventos** que la app Android hacia la plataforma:

`POST https://plataforma-torneos-lerma-salda-a.vercel.app/api/comms/events`

## Auth

| Header | Valor |
|--------|--------|
| `X-Midend-Key` | `MIDEND_API_KEY` (o `MIDEND_EVENTS_SECRET`) en Vercel de **web-lerma** |

Debe coincidir con `MIDEND_API_KEY` del proyecto **plataforma**.

## Pago Stripe → mismo mail que la app

Al completar checkout, el webhook envía:

```json
{
  "type": "reserva.confirmada",
  "contact": { "email", "phone", "firstName", "lastName", "tipo": "invitado" },
  "payload": {
    "fecha": "15/09/2026",
    "hora": "…",
    "campo": "Golf Lerma y Saldaña",
    "jugadores": "2",
    "referencia": "cs_test_…",
    "concepto": "Paquete Golf Burgos (227.90 €)"
  },
  "channels": ["email"]
}
```

Brevo usa `BREVO_TEMPLATE_RESERVA_CONFIRMADA` (o HTML fallback «Tu salida está confirmada»).

## Variables en web-lerma (Vercel)

| Variable | Obligatorio |
|----------|-------------|
| `MIDEND_API_KEY` | Sí (misma que plataforma) |
| `MIDEND_EVENTS_URL` | No (default = plataforma `/api/comms/events`) |
| `MIDEND_EVENTS_SECRET` | Alternativa a `MIDEND_API_KEY` |

## Qué no cambia

- Hotelbeds booking API / mTLS
- WhatsApp `wa.me` de atención en el chatbot
- Descarga guía / tarjeta regalo en confirmación

## Otros eventos web

| type | Origen |
|------|--------|
| `reserva.confirmada` | Stripe + solicitudes bautismos/clases |
| `lead.capturado` | contacto empresa, promociona torneo |
| `hotelbeds.reconfirmation` | push HB (solo aviso midend; no cambia booking) |
