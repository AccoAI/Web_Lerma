/**
 * Enlaces a Google Maps en direcciones del footer.
 */
(function () {
  'use strict';

  var MAP_URLS = {
    'Golf Lerma':
      'https://www.google.com/maps/search/?api=1&query=Club+de+Golf+de+Lerma,+Autov%C3%ADa+Madrid-Burgos+km+195.5,+09200+Lerma,+Espa%C3%B1a',
    'Saldaña Golf':
      'https://www.google.com/maps/search/?api=1&query=Salda%C3%B1a+Golf,+Urbanizaci%C3%B3n+Golf+Salda%C3%B1a,+Salda%C3%B1a+de+Burgos,+Espa%C3%B1a',
  };

  function mapsTitle() {
    if (window.i18n && window.i18n.t) {
      var t = window.i18n.t('footer_ver_maps');
      if (t && t !== 'footer_ver_maps') return t;
    }
    return 'Abrir en Google Maps';
  }

  function enhanceFooterMapLinks() {
    document.querySelectorAll('.footer .contact-info p').forEach(function (p) {
      if (p.querySelector('a.footer-map-link')) return;

      var strong = p.querySelector('strong');
      if (!strong) return;

      var placeKey = strong.textContent.replace(/\s*:?\s*$/, '').trim();
      var url = MAP_URLS[placeKey];
      if (!url) return;

      var clone = p.cloneNode(true);
      var sClone = clone.querySelector('strong');
      if (sClone) sClone.remove();
      var brs = clone.querySelectorAll('br');
      if (brs.length) brs[0].remove();
      var addressHtml = clone.innerHTML.trim();
      if (!addressHtml) return;

      var title = mapsTitle().replace(/"/g, '&quot;');
      p.innerHTML =
        strong.outerHTML +
        '<br><a class="footer-map-link" href="' +
        url +
        '" target="_blank" rel="noopener noreferrer" title="' +
        title +
        '">' +
        addressHtml +
        '</a>';
    });
  }

  window.enhanceFooterMapLinks = enhanceFooterMapLinks;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceFooterMapLinks);
  } else {
    enhanceFooterMapLinks();
  }

  document.addEventListener('i18n:changed', enhanceFooterMapLinks);
})();
