/**
 * Bloque "Opciones para comer" en confirmacion-reserva.html — mismo picker con iframe que en paquetes.
 */
(function () {
  'use strict';

  function renderPostBookingRestaurants(containerId) {
    var el = document.getElementById(containerId);
    if (!el || typeof window.mountRestaurantePaquetePicker !== 'function') return;

    el.innerHTML =
      '<h2 class="configurador-titulo post-travel-title">Opciones para comer</h2>' +
      '<p class="post-travel-intro">Elige zona y restaurante. Reserva en el visor (TheFork o CoverManager) o llama al restaurante del club, como en el configurador del paquete.</p>' +
      '<div class="comida-restaurante-picker-panel post-booking-picker-panel">' +
      '<div id="post-booking-restaurant-root" class="comida-restaurante-picker-root"></div>' +
      '</div>';

    el.className = 'confirmacion-seccion-card post-travel-box post-restaurants-box';
    el.hidden = false;

    var root = document.getElementById('post-booking-restaurant-root');
    if (!root) return;

    var picker = window.mountRestaurantePaquetePicker(root, { soloExternos: true });
    if (picker && typeof picker.setCategoria === 'function') {
      picker.setCategoria('burgos');
    }
  }

  window.renderPostBookingRestaurants = renderPostBookingRestaurants;
})();
