/**
 * Ticker inferior (Banners del panel): franja fija abajo con frases en bucle continuo.
 * Si hay una sola frase, se repite; si hay varias, van separadas por un hueco fijo.
 */
(function () {
  'use strict';

  var ROOT_ID = 'cmsBannersTicker';
  var GAP_PX = 96; // distancia fija entre frases
  var SPEED_PX_PER_S = 48; // velocidad constante

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
        'will-change:transform;animation:cmsTickerScroll var(--cms-ticker-duration,40s) linear infinite;}' +
      '#' + ROOT_ID + ' .cms-ticker__track:hover{animation-play-state:paused;}' +
      '#' + ROOT_ID + ' .cms-ticker__group{display:inline-flex;align-items:center;}' +
      '#' + ROOT_ID + ' .cms-ticker__item{display:inline-flex;align-items:center;flex-shrink:0;' +
        'padding:0;margin:0;gap:0;}' +
      '#' + ROOT_ID + ' .cms-ticker__item + .cms-ticker__item{margin-left:var(--cms-ticker-gap,' + GAP_PX + 'px);}' +
      '#' + ROOT_ID + ' .cms-ticker__dot{display:inline-block;width:5px;height:5px;margin:0 0 0 var(--cms-ticker-gap,' + GAP_PX + 'px);' +
        'border-radius:50%;background:rgba(255,255,255,.45);flex-shrink:0;align-self:center;}' +
      '#' + ROOT_ID + ' .cms-ticker__item a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.35);}' +
      '#' + ROOT_ID + ' .cms-ticker__item a:hover{border-bottom-color:#fff;}' +
      '@keyframes cmsTickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      'body.cms-ticker-active{padding-bottom:2.4rem;}';
    document.head.appendChild(style);
  }

  function segmentHtml(b, i) {
    var label = bannerLabel(b);
    if (!label) return '';
    var href = safeHref(b.linkUrl);
    var inner = href
      ? '<a href="' + esc(href) + '">' + esc(label) + '</a>'
      : '<span>' + esc(label) + '</span>';
    return '<span class="cms-ticker__item" data-cms-i="' + i + '">' + inner + '</span>';
  }

  function buildGroupHtml(list) {
    return list.map(segmentHtml).filter(Boolean).join('<span class="cms-ticker__dot" aria-hidden="true"></span>');
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

    var groupHtml = buildGroupHtml(list);
    if (!groupHtml) {
      root.setAttribute('hidden', '');
      document.body.classList.remove('cms-ticker-active');
      return;
    }

    root.style.setProperty('--cms-ticker-gap', GAP_PX + 'px');
    // Dos grupos idénticos → animación -50% = bucle perfecto
    root.innerHTML =
      '<div class="cms-ticker__viewport">' +
        '<div class="cms-ticker__track">' +
          '<span class="cms-ticker__group">' + groupHtml + '</span>' +
          '<span class="cms-ticker__dot" aria-hidden="true"></span>' +
          '<span class="cms-ticker__group">' + groupHtml + '</span>' +
        '</div>' +
      '</div>';
    root.removeAttribute('hidden');
    document.body.classList.add('cms-ticker-active');

    // Si el contenido es más estrecho que la pantalla, repetir grupos hasta llenar
    requestAnimationFrame(function () {
      var track = root.querySelector('.cms-ticker__track');
      var viewport = root.querySelector('.cms-ticker__viewport');
      if (!track || !viewport) return;
      var group = track.querySelector('.cms-ticker__group');
      if (!group) return;

      var need = Math.max(viewport.clientWidth * 2, 800);
      var safety = 0;
      while (group.offsetWidth < need && safety < 12) {
        group.insertAdjacentHTML('beforeend',
          '<span class="cms-ticker__dot" aria-hidden="true"></span>' + groupHtml);
        safety++;
      }

      // Sincronizar el segundo grupo con el primero (mismo HTML interno)
      var groups = track.querySelectorAll('.cms-ticker__group');
      if (groups[1]) groups[1].innerHTML = groups[0].innerHTML;

      var half = track.scrollWidth / 2;
      var duration = Math.max(18, Math.round(half / SPEED_PX_PER_S));
      root.style.setProperty('--cms-ticker-duration', duration + 's');
    });
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
