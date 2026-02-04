/**
 * Configuración para integración Hotelbeds.
 * Códigos: añade hotelbedsCode en precios-data.js o usa hotelCodes aquí.
 * Para obtener códigos: GET /api/hotelbeds-list-hotels?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
 */
window.HOTELBEDS_CONFIG = {
  hotelCodes: {
    alisa: null,
    ceres: null,
    parador: null,
    silken: null,
    'palacio-blasones': null,
    'hotel-centro': null,
  },

  getCode: function (hotelId) {
    var c = this.hotelCodes[hotelId];
    if (c) return String(c);
    var p = (typeof getPrecios === 'function') ? getPrecios() : (window.PRECIOS_DATA || {});
    var hl = (p.hoteles && p.hoteles.lerma) || [];
    var hb = (p.hoteles && p.hoteles.burgos) || [];
    for (var i = 0; i < hl.length; i++) { if (hl[i].id === hotelId && hl[i].hotelbedsCode) return String(hl[i].hotelbedsCode); }
    for (var j = 0; j < hb.length; j++) { if (hb[j].id === hotelId && hb[j].hotelbedsCode) return String(hb[j].hotelbedsCode); }
    return null;
  },

  getCodesForSelectedHotels: function (formData, numNoches) {
    var codes = [], seen = {};
    for (var i = 1; i <= (numNoches || 10); i++) {
      var hv = (formData.get && formData.get('hotel-noche-' + i)) || '';
      if (!hv || hv.indexOf('-') < 0) continue;
      var hotelId = hv.split('-')[1];
      var code = this.getCode(hotelId);
      if (code && !seen[code]) { seen[code] = 1; codes.push(code); }
    }
    return codes;
  },

  getAllHotelCodes: function () {
    var ids = ['alisa', 'ceres', 'parador', 'silken', 'palacio-blasones', 'hotel-centro'];
    var codes = [];
    for (var i = 0; i < ids.length; i++) {
      var c = this.getCode(ids[i]);
      if (c) codes.push(c);
    }
    return codes;
  },
};
