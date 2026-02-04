/**
 * Configuración para integración Hotelbeds.
 * Mapea nuestros hoteles (precios-data) a códigos de Hotelbeds.
 *
 * Para obtener códigos: usar Content API de Hotelbeds o buscar en su portal.
 * Lerma: zona / destino cercano. Burgos: código destino típico.
 */
window.HOTELBEDS_CONFIG = {
  /* Códigos de hoteles en Hotelbeds (reemplazar por los reales cuando los tengas) */
  hotelCodes: {
    /* Lerma */
    alisa: null,       // Ej: '12345'
    ceres: null,
    parador: null,
    /* Burgos */
    silken: null,
    'palacio-blasones': null,
    'hotel-centro': null,
  },

  /* Códigos de destino Hotelbeds para búsqueda por zona (si no usas hotelCodes) */
  destinations: {
    lerma: null,   // Código destino Lerma/Burgos en Hotelbeds
    burgos: null,
  },

  /* Devuelve array de códigos de Hotelbeds para nuestros hoteles de una ciudad */
  getCodesForCity: function (city) {
    var map = {
      lerma: ['alisa', 'ceres', 'parador'],
      burgos: ['silken', 'palacio-blasones', 'hotel-centro'],
    };
    var ids = map[city] || [];
    var codes = [];
    for (var i = 0; i < ids.length; i++) {
      var c = this.hotelCodes[ids[i]];
      if (c) codes.push(c);
    }
    return codes;
  },

  /* Devuelve todos los códigos configurados */
  getAllHotelCodes: function () {
    var codes = [];
    var h = this.hotelCodes;
    for (var k in h) { if (h[k]) codes.push(h[k]); }
    return codes;
  },
};
