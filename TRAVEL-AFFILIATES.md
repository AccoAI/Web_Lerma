# Enlaces de afiliado — vuelo y coche (post-reserva)

Tras el pago del paquete, la página `confirmacion-reserva.html` y el correo de confirmación (webhook Stripe) pueden mostrar enlaces a **Skyscanner** (vuelos) y **Rentcars** (coche).

## 1. Darse de alta

- **Rentcars:** [Rentcars Affiliates](https://affiliates.rentcars.com/) (Integrations → Links).
- **Skyscanner:** programa de afiliados de Skyscanner Partners.

## 2. Configurar URLs en el proyecto

Edita `js/travel-affiliates.js`:

```javascript
window.TRAVEL_AFFILIATES = {
  rentalcars: 'https://www.rentcars.com/es/?requestorid=…',  // enlace afiliado Rentcars (es)
  skyscanner: 'https://…',  // búsqueda vuelos a Madrid
};
```

Para el **correo** de confirmación (servidor), añade en **Vercel → Environment Variables** las mismas URLs:

| Variable | Uso |
|----------|-----|
| `AFFILIATE_RENTALCARS_URL` | Enlace afiliado Rentcars (misma URL que en `travel-affiliates.js`) |
| `AFFILIATE_SKYSCANNER_URL` | Enlace afiliado Skyscanner |

Si una URL está vacía, no se muestra ese botón.

## 3. Redirección tras el pago (importante)

Tras pagar, Stripe debe enviar al usuario a **`confirmacion-reserva.html`** (coche, vuelos, restaurantes, bono). Eso lo configura `api/crear-pago.js` automáticamente si existe:

1. **`PUBLIC_SITE_URL`** en Vercel — **obligatorio en la práctica**: `https://web-lerma.vercel.app` (sin barra final).  
   Así Stripe redirige siempre al dominio de producción, no a URLs de preview (`…-victors-projects-….vercel.app`).

Si ves solo la pantalla genérica de Stripe («Thanks for your payment»), falta desplegar o definir `PUBLIC_SITE_URL`.

## 4. Dónde lo ve el cliente

- **Página de gracias:** `confirmacion-reserva.html?session_id=…` (tras Stripe).
- **Email:** webhook `checkout.session.completed` (mismo bloque si hay variables en Vercel).
- **Paquetes:** nota bajo alojamiento: «Una vez confirmado el paquete… vuelo y coche».

Los enlaces abren en **pestaña nueva** (`target="_blank"`, `rel="noopener noreferrer sponsored"`).
