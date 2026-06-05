/**
 * Enlaces a Google Maps y teléfonos clicables (tel:) en bloques de contacto.
 */
(function () {
  'use strict';

  var MAP_URLS = {
    'Golf Lerma':
      'https://www.google.com/maps/search/?api=1&query=Club+de+Golf+de+Lerma,+Autov%C3%ADa+Madrid-Burgos+km+195.5,+09200+Lerma,+Espa%C3%B1a',
    'Saldaña Golf':
      'https://www.google.com/maps/search/?api=1&query=Salda%C3%B1a+Golf,+Urbanizaci%C3%B3n+Golf+Salda%C3%B1a,+Salda%C3%B1a+de+Burgos,+Espa%C3%B1a',
  };

  var PHONE_RE =
    /(?:\(\s*\+?(34)\s*\)\s*)?(\d{3}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}|\d{9})(?![\d])/g;

  function mapsTitle() {
    if (window.i18n && window.i18n.t) {
      var t = window.i18n.t('footer_ver_maps');
      if (t && t !== 'footer_ver_maps') return t;
    }
    return 'Abrir en Google Maps';
  }

  function phoneCallTitle() {
    if (window.i18n && window.i18n.t) {
      var t = window.i18n.t('footer_llamar_telefono');
      if (t && t !== 'footer_llamar_telefono') return t;
    }
    return 'Llamar por teléfono';
  }

  function telHrefFromMatch(display, countryCode) {
    var digits = String(display).replace(/\D/g, '');
    var country = (countryCode || '34').replace(/\D/g, '') || '34';
    if (digits.length === 9) digits = country + digits;
    else if (digits.length === 11 && digits.indexOf('34') === 0) {
      /* ya internacional */
    } else if (digits.length > 9 && digits.indexOf(country) !== 0) {
      digits = country + digits.slice(-9);
    }
    return 'tel:+' + digits;
  }

  function linkifyPhoneNumbersInHtml(html) {
    if (!html || /href\s*=\s*["']tel:/i.test(html)) return html;

    return html.replace(PHONE_RE, function (match, country, local) {
      var part = local || match;
      var display = match.trim();
      var href = telHrefFromMatch(part, country);
      var title = phoneCallTitle().replace(/"/g, '&quot;');
      return (
        '<a class="contact-phone-link" href="' +
        href +
        '" title="' +
        title +
        '">' +
        display +
        '</a>'
      );
    });
  }

  function linkifyPhoneNumbersInText(text) {
    if (!text) return text;
    var escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return linkifyPhoneNumbersInHtml(escaped);
  }

  function enhancePhoneLinks() {
    var selectors = [
      '.footer .contact-info p',
      '.contact-info p',
      '.contacto-datos p',
      '.empresa-contacto p',
      '.pagina-contacto p',
    ];

    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (p) {
        if (p.dataset.phoneEnhanced === '1') return;
        if (p.querySelector('a[href^="tel:"]')) {
          p.dataset.phoneEnhanced = '1';
          return;
        }

        var html = p.innerHTML;
        if (!PHONE_RE.test(p.textContent || '')) return;
        PHONE_RE.lastIndex = 0;

        var linked = linkifyPhoneNumbersInHtml(html);
        if (linked !== html) {
          p.innerHTML = linked;
          p.dataset.phoneEnhanced = '1';
        }
      });
    });
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

  function enhanceContactBlocks() {
    enhanceFooterMapLinks();
    enhancePhoneLinks();
  }

  window.enhanceFooterMapLinks = enhanceFooterMapLinks;
  window.enhancePhoneLinks = enhancePhoneLinks;
  window.linkifyPhoneNumbersInText = linkifyPhoneNumbersInText;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceContactBlocks);
  } else {
    enhanceContactBlocks();
  }

  document.addEventListener('i18n:changed', enhanceContactBlocks);
})();
