/**
 * Enlace afiliado Rentcars (cliente). Misma lógica que lib/rentcars-search-url.js
 */
(function () {
  'use strict';

  var AFFILIATE_HOME = 'https://www.rentcars.com/es/';
  var DEFAULT_REQUESTOR_ID = '10695';

  function appendAffiliateQuery(baseUrl, opts) {
    var requestorid = String(
      (opts && opts.requestorid) ||
        ((window.TRAVEL_AFFILIATES || {}).rentcarsRequestorId) ||
        DEFAULT_REQUESTOR_ID
    ).trim();
    var utmMedium = (opts && opts.utmMedium) || 'afiliado-embed';
    var u = new URL(baseUrl);
    u.searchParams.set('requestorid', requestorid);
    u.searchParams.set('utm_source', 'web-lerma.vercel.app');
    u.searchParams.set('utm_medium', utmMedium);
    return u.toString();
  }

  window.buildRentcarsAffiliateUrl = function (opts) {
    var cfg = window.TRAVEL_AFFILIATES || {};
    var base = (cfg.rentalcars || '').trim();
    if (base) {
      try {
        var parsed = new URL(base);
        if (parsed.hostname.indexOf('rentcars.com') >= 0) {
          return appendAffiliateQuery(parsed.origin + parsed.pathname, opts);
        }
      } catch (e) {
        /* usar home por defecto */
      }
    }
    return appendAffiliateQuery(AFFILIATE_HOME, opts);
  };

  window.buildRentcarsSearchUrl = function (opts) {
    return window.buildRentcarsAffiliateUrl({
      requestorid: opts && opts.requestorid,
      utmMedium: 'afiliado-postbooking',
    });
  };
})();
