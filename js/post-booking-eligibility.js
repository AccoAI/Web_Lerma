/**
 * Paquetes con extras post-pago: alquiler coche (Rentcars) y restaurantes externos (CoverManager / TheFork).
 * Golf+Comida y el resto de configuradores sin hotel Burgos no los incluyen.
 * Guía PDF «Golf en Burgos»: mismos paquetes Burgos / Campeonato / Fin de semana.
 * Paquete de regalo (PDF personalizado): Burgos y Campeonato.
 */
(function () {
  'use strict';

  var CON_POSTBOOKING_VIAJE_RESTAURANTES = {
    'golf-burgos': true,
    'campeonato-burgos': true,
    'fin-semana': true,
  };

  var CON_PAQUETE_REGALO = {
    'golf-burgos': true,
    'campeonato-burgos': true,
  };

  window.paqueteIncluyePostbookingViajeYRestaurantes = function (paqueteId) {
    return !!(paqueteId && CON_POSTBOOKING_VIAJE_RESTAURANTES[paqueteId]);
  };

  window.paqueteIncluyeGuiaBurgos = function (paqueteId) {
    return !!(paqueteId && CON_POSTBOOKING_VIAJE_RESTAURANTES[paqueteId]);
  };

  window.paqueteIncluyePaqueteRegalo = function (paqueteId) {
    return !!(paqueteId && CON_PAQUETE_REGALO[paqueteId]);
  };
})();
