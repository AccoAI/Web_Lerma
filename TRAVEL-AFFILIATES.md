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

**Error `DNS_PROBE_FINISHED_NXDOMAIN` en `test.golflermaysaldana.com`:** en Vercel tienes `PUBLIC_SITE_URL` apuntando a un dominio que **aún no tiene DNS**. Pon `https://web-lerma.vercel.app` hasta que `test.…` esté configurado en tu registrador y en Vercel → Domains. El código ignora `test.*` salvo que añadas `ALLOW_TEST_PUBLIC_SITE=1`.

## 4. Dónde lo ve el cliente

- **Página de gracias:** `confirmacion-reserva.html?session_id=…` (tras Stripe). Rentcars va en **iframe** (home `rentcars.com/es/?requestorid=10695`) con panel lateral de fechas del paquete. **No** uses `/search-results` ni rutas `/locations/...` antiguas (404). Si el iframe no carga, «Abrir en Rentcars ↗» lleva el mismo enlace afiliado.
- **Motor oficial:** configurado en `rentcarsWidgetHtml` (`js/travel-affiliates.js`) — widget v13 de [Rentcars Affiliates](https://affiliates.rentcars.com/) → Widgets (`requestor=10695`, `utm_medium=afiliado-widget`). Si lo vacías, se usa iframe de respaldo con la home afiliada.
- **Email:** webhook `checkout.session.completed` (mismo bloque si hay variables en Vercel).
- **Paquetes:** nota bajo alojamiento: «Una vez confirmado el paquete… vuelo y coche».

Skyscanner abre en pestaña nueva. Rentcars: búsqueda en iframe en la misma página; enlace externo con `rel="sponsored"` para afiliado.

## 5. Afiliado Rentcars (comisión)

- Tu ID es **`requestorid=10695`**. Debe estar en **toda** URL que salga de tu web (iframe, botón, email).
- Rentcars atribuye la venta desde la **primera visita** con ese ID; no hace falta repetirlo en cada clic interno en rentcars.com.
- Si ves página 404, suele ser una URL antigua (`/es/search-results?...` o `/locations/...`). Usa solo el enlace del panel de afiliados o el de `travel-affiliates.js`.
