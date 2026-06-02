/**
 * Enlaces de afiliado para logística post-reserva (vuelos y coche).
 * Rentcars Affiliates / Skyscanner Partners — deja vacío ('') lo que aún no tengas.
 */
window.TRAVEL_AFFILIATES = {
  /** Enlace afiliado Rentcars (es) — home con requestorid (email y respaldo si falla iframe) */
  rentalcars: 'https://www.rentcars.com/es/?requestorid=10695&utm_source=web-lerma.vercel.app&utm_medium=afiliado-link',
  rentcarsRequestorId: '10695',
  /** Motor de búsqueda oficial (Rentcars Affiliates → Widgets v13) */
  rentcarsWidgetHtml:
    '<object class="post-booking-rentcars-widget-object" type="text/html" ' +
    'data="https://widgets.rentcars.com/widget-v13.html?requestor=10695&locale=es&utm_source=web-lerma.vercel.app&utm_medium=afiliado-widget" ' +
    'width="100%" height="420" title="Buscar coche en Rentcars"></object>',
  rentalcarsIframeHeight: 780,
  /** Enlace afiliado Skyscanner hacia Madrid (MAD) */
  skyscanner: '',
  skyscannerIframeHeight: 700,
};
