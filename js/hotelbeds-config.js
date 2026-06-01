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

/** Suma alojamiento en el resumen del paquete: con funnel Hotelbeds confirmado usa hb_hotel_stay_ref_net (importe lista no empaquetado, solo en cálculo; el cliente no ve ese desglose si hideHotelEuroUi). El pago a HB sigue siendo la tarifa empaquetada (rateKey). El margen se reparte comercialmente con el resto del paquete (golf). */
window.calcularAlojamientoResumenEuros = function (formData, nNoches, fallbackPerNoche) {
  if (!formData || !formData.get) return 0;
  var funnelReady = String(formData.get('hb_funnel_ready') || '').trim() === '1';
  var rateValidated = String(formData.get('hb_rate_validated') || '').trim() === '1';
  var hotelCode = String(formData.get('hb_selected_hotel_code') || '').trim();
  if (funnelReady || (rateValidated && hotelCode)) {
    var rawRef = String(formData.get('hb_hotel_stay_ref_net') || '').trim().replace(',', '.');
    var rawBook = String(formData.get('hb_hotel_stay_book_net') || '').trim().replace(',', '.');
    var ref = parseFloat(rawRef);
    var book = parseFloat(rawBook);
    if (isFinite(ref) && ref > 0) return Math.round(ref * 100) / 100;
    if (isFinite(book) && book > 0) return Math.round(book * 100) / 100;
  }
  var total = 0;
  var fb = fallbackPerNoche != null && isFinite(Number(fallbackPerNoche)) ? Number(fallbackPerNoche) : null;
  for (var inx = 1; inx <= (nNoches || 0); inx++) {
    var hv = (formData.get('hotel-noche-' + inx) || '').trim();
    if (!hv) continue;
    var pa = typeof window.precioNocheDesdeHotelSelect === 'function' ? window.precioNocheDesdeHotelSelect(hv) : null;
    total += pa != null ? pa : fb != null ? fb : 0;
  }
  return Math.round(total * 100) / 100;
};

/** Precio €/noche para un valor de select (lerma-id, hb-código, etc.) usando LIVE_HOTEL_PRICES y getHotelesOpts. */
window.precioNocheDesdeHotelSelect = function (hv) {
  if (!hv || String(hv).indexOf('-') < 0) return null;
  hv = String(hv);
  var live = window.LIVE_HOTEL_PRICES;
  if (live && live[hv] != null) return Number(live[hv]);
  var idx = hv.indexOf('-');
  var ciudad = hv.substring(0, idx);
  var hotelId = hv.substring(idx + 1);
  if (live && live[hotelId] != null) return Number(live[hotelId]);
  var opts = (typeof getHotelesOpts === 'function') ? getHotelesOpts() : {};
  var arr = opts[ciudad] || [];
  for (var j = 0; j < arr.length; j++) {
    if (arr[j].v === hotelId && arr[j].p != null) return Number(arr[j].p);
  }
  return null;
};

/** Etiqueta legible para un valor de select de hotel (incl. códigos Hotelbeds hb-). */
window.etiquetaHotelSelect = function (val) {
  if (!val) return 'Sin reserva';
  val = String(val);
  if (window.HOTELBEDS_DYNAMIC_OPTS) {
    function findIn(arr) {
      if (!arr) return null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].v === val) return arr[i].l;
      }
      return null;
    }
    var dyn = findIn(window.HOTELBEDS_DYNAMIC_OPTS.lerma) || findIn(window.HOTELBEDS_DYNAMIC_OPTS.burgos);
    if (dyn) return dyn + (val.indexOf('hb-') === 0 ? '' : '');
  }
  if (val.indexOf('-') >= 0) {
    var ix = val.indexOf('-');
    var c = val.substring(0, ix);
    var h = val.substring(ix + 1);
    var lbl = (typeof HOTELES_LABELS !== 'undefined' && HOTELES_LABELS[c]) ? HOTELES_LABELS[c][h] : null;
    if (lbl) return lbl + ' (' + (c === 'lerma' ? 'Lerma' : 'Burgos') + ')';
  }
  return val;
};
