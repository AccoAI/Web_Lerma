/**
 * Ticker inferior (Banners del panel): franja fija abajo con texto desplazándose.
 */
(function () {
  'use strict';

  var ROOT_ID = 'cmsBannersTicker';

  function getUrl() {
    if (window.CMS_CONTENIDO_URL) return window.CMS_CONTENIDO_URL;
    var base = (window.PLATAFORMA_CMS_URL || 'https://plataforma-torneos-lerma-salda-a.vercel.app').replace(/\/$/, '');
    return base + '/api/contenido.json';
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function safeHref(url) {
    var href = (url || '').trim();
    if (!href || /^\s*javascript\s*:/i.test(href) || /^\s*data\s*:/i.test(href)) return '';
    return href;
  }

  function bannerLabel(b) {
    var titulo = String(b.titulo || '').trim();
    var texto = String(b.texto || '').trim();
    if (titulo && texto) return titulo + ' · ' + texto;
    return texto || titulo;
  }

  function ensureStyles() {
    if (document.getElementById('cms-banners-ticker-styles')) return;
    var style = document.createElement('style');
    style.id = 'cms-banners-ticker-styles';
    style.textContent =
      '#' + ROOT_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:9000;height:2.4rem;' +
        'background:#0f5c2c;color:#f5faf6;overflow:hidden;box-shadow:0 -2px 12px rgba(0,0,0,.18);' +
        'font-family:Montserrat,system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.02em;}' +
      '#' + ROOT_ID + '[hidden]{display:none!important;}' +
      '#' + ROOT_ID + ' .cms-ticker__viewport{height:100%;overflow:hidden;display:flex;align-items:center;}' +
      '#' + ROOT_ID + ' .cms-ticker__track{display:flex;align-items:center;width:max-content;white-space:nowrap;' +
        'animation:cmsTickerScroll var(--cms-ticker-duration,45s) linear infinite;}' +
      '#' + ROOT_ID + ' .cms-ticker__track:hover{animation-play-state:paused;}' +
      '#' + ROOT_ID + ' .cms-ticker__item{display:inline-flex;align-items:center;padding:0 2.25rem;gap:.65rem;}' +
      '#' + ROOT_ID + ' .cms-ticker__sep{opacity:.45;font-weight:400;}' +
      '#' + ROOT_ID + ' .cms-ticker__item a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.35);}' +
      '#' + ROOT_ID + ' .cms-ticker__item a:hover{border-bottom-color:#fff;}' +
      '@keyframes cmsTickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      'body.cms-ticker-active{padding-bottom:2.4rem;}';
    document.head.appendChild(style);
  }

  function segmentHtml(b) {
    var label = bannerLabel(b);
    if (!label) return '';
    var href = safeHref(b.linkUrl);
    var inner = href
      ? '<a href="' + esc(href) + '">' + esc(label) + '</a>'
      : '<span>' + esc(label) + '</span>';
    return '<span class="cms-ticker__item">' + inner + '<span class="cms-ticker__sep" aria-hidden="true">◆</span></span>';
  }

  function render(banners) {
    ensureStyles();
    var list = (banners || []).filter(function (b) {
      return b && b.activo !== false && bannerLabel(b);
    }).sort(function (a, b) {
      return (Number(a.orden) || 0) - (Number(b.orden) || 0);
    });

    var root = document.getElementById(ROOT_ID);
    if (!list.length) {
      if (root) {
        root.setAttribute('hidden', '');
        root.innerHTML = '';
      }
      document.body.classList.remove('cms-ticker-active');
      return;
    }

    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('role', 'marquee');
      root.setAttribute('aria-live', 'off');
      document.body.appendChild(root);
    }

    var parts = list.map(segmentHtml).filter(Boolean).join('');
    if (!parts) {
      root.setAttribute('hidden', '');
      document.body.classList.remove('cms-ticker-active');
      return;
    }

    // Duplicar para bucle continuo; duración según cantidad de texto
    var chars = list.reduce(function (n, b) { return n + bannerLabel(b).length; }, 0);
    var duration = Math.max(28, Math.min(90, Math.round(chars * 0.55)));
    root.style.setProperty('--cms-ticker-duration', duration + 's');
    root.innerHTML =
      '<div class="cms-ticker__viewport">' +
        '<div class="cms-ticker__track">' + parts + parts + '</div>' +
      '</div>';
    root.removeAttribute('hidden');
    document.body.classList.add('cms-ticker-active');
  }

  function fromData(data) {
    render((data && data.banners) || []);
  }

  function init() {
    if (window.CmsPlataforma && window.CmsPlataforma.data) {
      fromData(window.CmsPlataforma.data);
      return;
    }
    document.addEventListener('cms:contenido-listo', function (ev) {
      fromData(ev.detail);
    }, { once: true });

    // Si no hay cms-plataforma en la página, cargar contenido aquí
    setTimeout(function () {
      if (document.getElementById(ROOT_ID) && !document.getElementById(ROOT_ID).hasAttribute('hidden')) return;
      if (window.CmsPlataforma && window.CmsPlataforma.data) {
        fromData(window.CmsPlataforma.data);
        return;
      }
      var url = getUrl() + (getUrl().indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(fromData)
        .catch(function () {});
    }, 2200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
