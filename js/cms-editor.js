/**
 * Modo editor visual (iframe del panel). Solo se activa con ?cmsEdit=1 dentro de un iframe.
 * Pulsa un texto, foto o botón → el panel padre abre el inspector.
 */
(function () {
  'use strict';

  if (window.parent === window) return;
  var forced = window.CMS_FORCE_EDIT === true;
  var qs = /[?&]cmsEdit=1(?:&|$)/.test(window.location.search || '');
  if (!forced && !qs) return;

  var selected = null;
  var navigateMode = false;
  var badge;

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + cssEscape(el.id);
    var parts = [];
    var cur = el;
    var guard = 0;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement && guard < 10) {
      if (cur.id) {
        parts.unshift('#' + cssEscape(cur.id));
        break;
      }
      var tag = cur.tagName.toLowerCase();
      var parent = cur.parentElement;
      var nth = 1;
      if (parent) {
        var kids = parent.children;
        for (var i = 0; i < kids.length; i++) {
          if (kids[i] === cur) break;
          if (kids[i].tagName === cur.tagName) nth++;
        }
      }
      var cls = '';
      if (cur.className && typeof cur.className === 'string') {
        cls = cur.className.trim().split(/\s+/).filter(function (c) {
          return c && c.indexOf('cms-edit') !== 0;
        }).slice(0, 2).map(function (c) { return '.' + cssEscape(c); }).join('');
      }
      parts.unshift(tag + cls + ':nth-of-type(' + nth + ')');
      cur = parent;
      guard++;
    }
    return parts.join(' > ');
  }

  function pageKey() {
    if (window.CMS_EDIT_PAGE) return String(window.CMS_EDIT_PAGE);
    var p = (window.location.pathname || '/').replace(/\/index\.html$/i, '/');
    if (!p) p = '/';
    return p;
  }

  function post(type, payload) {
    try {
      window.parent.postMessage({ source: 'cms-editor', type: type, payload: payload || {} }, '*');
    } catch (e) {}
  }

  function bgUrl(el) {
    if (!el) return '';
    var bg = (window.getComputedStyle(el).backgroundImage || '').trim();
    var m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
    return m ? m[1] : '';
  }

  function classify(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.closest && (el.closest('.cms-editor-hint') || el.closest('.cookie-consent') || el.closest('#cookieConsent'))) return null;

    var t;
    if ((t = el.closest('.hero-title'))) {
      return { module: 'portada', kind: 'text', field: 'heroTitulo', label: 'Título del hero', text: (t.textContent || '').trim() };
    }
    if ((t = el.closest('.hero-subtitle'))) {
      return { module: 'portada', kind: 'text', field: 'heroTexto', label: 'Subtítulo del hero', text: (t.textContent || '').trim() };
    }
    if ((t = el.closest('.hero-buttons a, a.hero-btn'))) {
      var btns = document.querySelectorAll('.hero-buttons a, a.hero-btn');
      var bi = -1;
      for (var b = 0; b < btns.length; b++) { if (btns[b] === t) bi = b; }
      return {
        module: 'heroSlides', kind: 'link', index: bi, label: 'Botón de portada',
        text: (t.textContent || '').trim(), href: t.getAttribute('href') || ''
      };
    }
    if ((t = el.closest('#mainNav .nav-link'))) {
      var links = document.querySelectorAll('#mainNav .nav-link');
      var ni = -1;
      for (var n = 0; n < links.length; n++) { if (links[n] === t) ni = n; }
      return {
        module: 'menu', kind: 'link', index: ni, label: 'Enlace del menú (Hero bar)',
        text: (t.textContent || '').trim(), href: t.getAttribute('href') || ''
      };
    }
    if ((t = el.closest('.cms-ticker__item'))) {
      var ti = parseInt(t.getAttribute('data-cms-i'), 10);
      if (isNaN(ti)) ti = 0;
      var tLink = t.querySelector('a');
      return {
        module: 'banners', kind: 'ticker', index: ti, label: 'Frase del ticker',
        text: (t.textContent || '').trim(), href: tLink ? (tLink.getAttribute('href') || '') : ''
      };
    }
    if ((t = el.closest('.cms-center-popup__slide'))) {
      var pi = parseInt(t.getAttribute('data-cms-popup-i'), 10);
      if (isNaN(pi)) {
        var slides = document.querySelectorAll('.cms-center-popup__slide');
        pi = Array.prototype.indexOf.call(slides, t);
      }
      var img = t.querySelector('.cms-center-popup__img');
      var btn = t.querySelector('.cms-center-popup__btn');
      return {
        module: 'popups', kind: 'popup', index: pi, label: 'Popup',
        text: ((t.querySelector('.cms-center-popup__title') || {}).textContent || '').trim(),
        subtitulo: ((t.querySelector('.cms-center-popup__sub') || {}).textContent || '').trim(),
        body: ((t.querySelector('.cms-center-popup__text') || {}).textContent || '').trim(),
        src: img ? img.getAttribute('src') : '',
        href: btn ? (btn.getAttribute('href') || '') : '',
        linkTexto: btn ? (btn.textContent || '').trim() : ''
      };
    }
    if (el.closest('#torneosPopup') || el.closest('.torneos-popup-overlay')) {
      return { module: 'torneos', kind: 'goto', label: 'Próximos torneos (barra lateral)' };
    }
    if (el.closest('#heroVideo') || el.closest('.hero-overlay') || el.closest('.hero-background') || el.closest('.hero-video')) {
      var video = document.getElementById('heroVideo');
      var source = video && video.querySelector('source');
      return {
        module: 'portada', kind: 'heroMedia', label: 'Foto / vídeo de portada',
        src: video ? (video.getAttribute('poster') || '') : '',
        video: source ? (source.getAttribute('src') || '') : (video ? (video.getAttribute('src') || '') : '')
      };
    }

    var imgEl = el.closest('img');
    var card = el.closest('.paquete-card, [style*="background-image"]');
    var link = el.closest('a');
    var heading = el.closest('h1, h2, h3, h4, p, .paquete-titulo-externo, .paquete-descripcion, .btn-hazte-socio, .btn-login');
    var target = heading || imgEl || link || card;
    if (!target || target.closest('script, style, noscript')) return null;
    if (target.closest('.cms-editor-hint')) return null;

    var kind = 'text';
    var src = '';
    var bg = '';
    var href = '';
    var text = (target.textContent || '').trim();
    if (target.tagName === 'IMG') {
      kind = 'image';
      src = target.getAttribute('src') || '';
      text = target.getAttribute('alt') || '';
    } else if (card && (target === card || el === card || el.classList.contains('paquete-overlay'))) {
      kind = 'bg';
      bg = bgUrl(card) || '';
      target = card;
      text = ((card.querySelector('.paquete-descripcion') || card).textContent || '').trim();
    } else if (link && !heading) {
      kind = 'link';
      href = link.getAttribute('href') || '';
      text = (link.textContent || '').trim();
      target = link;
    } else if (link) {
      href = link.getAttribute('href') || '';
    }

    return {
      module: 'webOverrides',
      kind: kind,
      label: 'Elemento de la página',
      selector: cssPath(target),
      page: pageKey(),
      text: text,
      href: href,
      src: src,
      bg: bg
    };
  }

  function markTargets() {
    var sels = [
      '.hero-title', '.hero-subtitle', '.hero-background', '.hero-overlay', '#heroVideo',
      '#mainNav .nav-link', 'a.hero-btn', '.hero-buttons a',
      '.btn-hazte-socio', '.btn-login', '.hero-anagrama',
      '.paquetes-section-title', '.paquetes-section-subtitle',
      '.paquete-titulo-externo', '.paquete-card', '.paquete-descripcion',
      '.cms-ticker__item', '.cms-center-popup__slide',
      '#torneosPopup .torneos-popup-header',
      'footer p', 'footer a', 'footer img'
    ];
    sels.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.classList.add('cms-edit-target');
      });
    });
  }

  function setSelected(el) {
    document.querySelectorAll('.cms-edit-selected').forEach(function (n) {
      n.classList.remove('cms-edit-selected');
    });
    selected = el;
    if (el) el.classList.add('cms-edit-selected');
    placeBadge(el);
  }

  function placeBadge(el) {
    if (!badge) return;
    if (!el) {
      badge.hidden = true;
      return;
    }
    var r = el.getBoundingClientRect();
    badge.hidden = false;
    badge.textContent = 'Editar';
    badge.style.top = Math.max(8, r.top + window.scrollY - 28) + 'px';
    badge.style.left = Math.max(8, r.left + window.scrollX) + 'px';
  }

  function onClick(e) {
    if (navigateMode) return;
    if (e.target.closest && e.target.closest('.cms-editor-hint')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    var info = classify(e.target);
    var el = (e.target.closest && e.target.closest('.cms-edit-target')) || e.target;
    if (!info && el && el.nodeType === 1) {
      var link = el.closest ? el.closest('a') : null;
      info = {
        module: 'webOverrides',
        kind: el.tagName === 'IMG' ? 'image' : (link ? 'link' : 'text'),
        label: 'Elemento de la página',
        selector: cssPath(el),
        page: pageKey(),
        text: (el.tagName === 'IMG' ? (el.getAttribute('alt') || '') : (el.textContent || '')).trim().slice(0, 400),
        href: link ? (link.getAttribute('href') || '') : '',
        src: el.tagName === 'IMG' ? (el.getAttribute('src') || '') : '',
        bg: bgUrl(el)
      };
    }
    if (!info) return;
    setSelected(el);
    info.page = info.page || pageKey();
    post('select', info);
  }

  function blockNav(e) {
    if (navigateMode) return;
    if (e.target.closest && e.target.closest('.cms-editor-hint')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function onHover(e) {
    if (navigateMode) return;
    document.querySelectorAll('.cms-edit-hover').forEach(function (n) {
      if (n !== selected) n.classList.remove('cms-edit-hover');
    });
    var t = e.target.closest && e.target.closest('.cms-edit-target');
    if (t && t !== selected) t.classList.add('cms-edit-hover');
  }

  function ensureStyles() {
    if (document.getElementById('cms-editor-styles')) return;
    var style = document.createElement('style');
    style.id = 'cms-editor-styles';
    style.textContent =
      'body.cms-editor-on{cursor:default;padding-top:2rem;}' +
      '.cms-edit-target{outline:1px dashed rgba(35,134,54,.55);outline-offset:2px;cursor:pointer;}' +
      '.cms-edit-hover{outline:2px solid #238636;outline-offset:2px;}' +
      '.cms-edit-selected{outline:2px solid #3fb950;outline-offset:3px;box-shadow:0 0 0 4px rgba(63,185,80,.25);}' +
      '.cms-editor-hint{position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#0f5c2c;color:#fff;' +
        'font:600 13px/1.3 Montserrat,system-ui,sans-serif;padding:.45rem .75rem;text-align:center;}' +
      '.cms-editor-badge{position:absolute;z-index:2147483001;background:#238636;color:#fff;font:700 11px/1 Montserrat,sans-serif;' +
        'padding:.25rem .45rem;border-radius:4px;pointer-events:none;letter-spacing:.04em;text-transform:uppercase;}' +
      'body.cms-editor-on a, body.cms-editor-on button, body.cms-editor-on video, body.cms-editor-on .nav-link{cursor:pointer!important;}' +
      'body.cms-editor-on video{pointer-events:none;}' +
      'body.cms-editor-on .cookie-consent, body.cms-editor-on #cookieConsent, body.cms-editor-on .chatbot, body.cms-editor-on #chatbot{display:none!important;}';
    document.head.appendChild(style);
  }

  function ensureChrome() {
    var hint = document.createElement('div');
    hint.className = 'cms-editor-hint';
    hint.textContent = 'Modo editor: pulsa un texto, una foto o un botón para cambiarlo. Los enlaces no navegan.';
    document.body.appendChild(hint);
    badge = document.createElement('div');
    badge.className = 'cms-editor-badge';
    badge.hidden = true;
    document.body.appendChild(badge);
    document.body.classList.add('cms-editor-on');
  }

  function revealPopups() {
    var pop = document.getElementById('cmsCenterPopup');
    if (pop) pop.removeAttribute('hidden');
  }

  function applyLive(payload) {
    if (!selected || !payload) return;
    if (payload.text != null && payload.kind !== 'heroMedia' && payload.kind !== 'image' && payload.kind !== 'bg') {
      if (selected.tagName !== 'IMG' && selected.tagName !== 'VIDEO') {
        selected.textContent = payload.text;
      }
    }
    if (payload.href && (selected.tagName === 'A' || selected.closest('a'))) {
      var a = selected.tagName === 'A' ? selected : selected.closest('a');
      if (a) a.setAttribute('href', payload.href);
    }
    if (payload.src) {
      if (selected.tagName === 'IMG') selected.setAttribute('src', payload.src);
      if (selected.id === 'heroVideo' || selected.closest('#heroVideo') || selected.closest('.hero-background')) {
        var video = document.getElementById('heroVideo');
        if (video) video.setAttribute('poster', payload.src);
      }
    }
    if (payload.bg) {
      var card = selected.closest('.paquete-card') || selected;
      card.style.backgroundImage = 'url("' + payload.bg.replace(/"/g, '\\"') + '")';
    }
    if (payload.hidden) selected.style.display = 'none';
  }

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.source !== 'cms-admin') return;
    if (d.type === 'navigate') {
      navigateMode = !!d.payload;
      document.body.classList.toggle('cms-editor-nav', navigateMode);
    }
    if (d.type === 'apply') applyLive(d.payload);
  });

  function boot() {
    ensureStyles();
    ensureChrome();
    markTargets();
    revealPopups();
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', blockNav, true);
    document.querySelectorAll('video').forEach(function (v) {
      try { v.pause(); } catch (err) {}
      v.removeAttribute('autoplay');
      v.controls = false;
    });
    document.addEventListener('mouseover', onHover, true);
    window.addEventListener('scroll', function () { placeBadge(selected); }, true);
    post('ready', { page: pageKey(), href: window.location.href });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(function () { markTargets(); revealPopups(); }, 800);
  document.addEventListener('cms:contenido-listo', function () {
    setTimeout(function () { markTargets(); revealPopups(); }, 200);
  });
})();
