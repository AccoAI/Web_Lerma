/**
 * Enlace afiliado Rentcars (home en español + requestorid).
 * Rentcars no admite deep links estables a resultados (/search-results → 404).
 */

const AFFILIATE_HOME = 'https://www.rentcars.com/es/';

const DEFAULT_REQUESTOR_ID = '10695';

function appendAffiliateQuery(baseUrl, opts) {
  const requestorid = String((opts && opts.requestorid) || DEFAULT_REQUESTOR_ID).trim();
  const utmMedium = (opts && opts.utmMedium) || 'afiliado-embed';
  const u = new URL(baseUrl);
  u.searchParams.set('requestorid', requestorid);
  u.searchParams.set('utm_source', 'web-lerma.vercel.app');
  u.searchParams.set('utm_medium', utmMedium);
  return u.toString();
}

/**
 * @param {{ requestorid?: string, utmMedium?: string }} opts
 */
export function buildRentcarsAffiliateUrl(opts) {
  return appendAffiliateQuery(AFFILIATE_HOME, opts);
}

/**
 * Misma URL afiliada (fechas del paquete se muestran en la UI, no en la URL de Rentcars).
 * @param {{ pickup?: string, dropoff?: string, requestorid?: string, locationName?: string }} opts
 */
export function buildRentcarsSearchUrl(opts) {
  return buildRentcarsAffiliateUrl({
    requestorid: opts && opts.requestorid,
    utmMedium: 'afiliado-postbooking',
  });
}
