/**
 * Config compartida: plataforma CMS ↔ web Golf Lerma.
 * Sobrescribe en HTML si hace falta: window.PLATAFORMA_CMS_URL = 'https://...'
 */
(function () {
  'use strict';
  var DEFAULT = 'https://plataforma-torneos-lerma-salda-a.vercel.app';
  var base = (typeof window.PLATAFORMA_CMS_URL === 'string' && window.PLATAFORMA_CMS_URL.trim())
    ? window.PLATAFORMA_CMS_URL.trim().replace(/\/$/, '')
    : DEFAULT;
  window.PLATAFORMA_CMS_URL = base;
  if (!window.TORNEOS_POPUP_DATA_URL) {
    window.TORNEOS_POPUP_DATA_URL = base + '/api/torneos.json';
  }
  window.CMS_CONTENIDO_URL = base + '/api/contenido.json';
})();
