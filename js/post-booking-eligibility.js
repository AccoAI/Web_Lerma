/**
 * Paquetes con extras post-pago: alquiler coche (Rentcars) y restaurantes externos (CoverManager / TheFork).
 * Golf+Comida y el resto de configuradores sin hotel Burgos no los incluyen.
 */
(function () {
  'use strict';

  var CON_POSTBOOKING_VIAJE_RESTAURANTES = {
    'golf-burgos': true,
    'campeonato-burgos': true,
    'fin-semana': true,
  };

  window.paqueteIncluyePostbookingViajeYRestaurantes = function (paqueteId) {
    return !!(paqueteId && CON_POSTBOOKING_VIAJE_RESTAURANTES[paqueteId]);
  };
})();
