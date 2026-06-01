/**
 * URL de búsqueda Rentcars con fechas (cliente). Misma lógica que lib/rentcars-search-url.js
 */
(function () {
  'use strict';

  function parseIsoDate(iso) {
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
    };
  }

  window.buildRentcarsSearchUrl = function (opts) {
    var pickup = (opts && opts.pickup) || '';
    var dropoff = (opts && opts.dropoff) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup) || !/^\d{4}-\d{2}-\d{2}$/.test(dropoff)) {
      return null;
    }
    var pu = parseIsoDate(pickup);
    var drop = parseIsoDate(dropoff);
    if (!pu || !drop) return null;

    var loc = ((opts && opts.locationName) || 'Madrid, España').trim();
    var requestorid = ((opts && opts.requestorid) || '10695').trim();

    var params = new URLSearchParams({
      requestorid: requestorid,
      utm_source: 'web-lerma.vercel.app',
      utm_medium: 'afiliado-postbooking',
      location: 'City',
      dropLocation: 'City',
      driversAge: '30',
      puDay: String(pu.day),
      puMonth: String(pu.month),
      puYear: String(pu.year),
      doDay: String(drop.day),
      doMonth: String(drop.month),
      doYear: String(drop.year),
      puHour: '10',
      puMinute: '0',
      doHour: '10',
      doMinute: '0',
      ftsType: 'C',
      ftsLocationName: loc,
      ftsDropLocationName: loc,
    });

    return 'https://www.rentcars.com/es/search-results?' + params.toString();
  };
})();
