/**
 * Puente CMS → web real.
 * Solo actualiza nodos que YA existen. No cambia el diseño.
 * Si portada.aplicarEnWeb !== true, no toca la home (queda el HTML/i18n original).
 *
 * No oculta el hero ni reinicia el vídeo si el CMS apunta al mismo fichero
 * (ruta relativa HTML vs URL absoluta del panel).
 */
(function () {
  'use strict';

  var lastPortada = null;
  var lastSeo = null;
  var lastSlides = null;
  var lastMenu = null;
  var lastMenuSig = '';
  var softReapplyTimer = null;

  function getUrl() {
    if (window.CMS_CONTENIDO_URL) return window.CMS_CONTENIDO_URL;
    var base = (window.PLATAFORMA_CMS_URL || 'https://plataforma-torneos-lerma-salda-a.vercel.app').replace(/\/$/, '');
    return base + '/api/contenido.json';
  }

  function lockFromI18n(el) {
    if (!el) return;
    el.removeAttribute('data-i18n');
    el.removeAttribute('data-i18n-html');
    el.setAttribute('data-cms', '1');
  }

  function setText(el, value) {
    if (!el || value == null || String(value).trim() === '') return;
    var next = String(value).trim();
    if ((el.textContent || '').trim() === next) {
      lockFromI18n(el);
      return;
    }
    el.textContent = next;
    lockFromI18n(el);
  }

  function applySeo(seo) {
    lastSeo = seo;
    if (!seo) return;
    if (seo.tituloHome && document.title !== seo.tituloHome) document.title = seo.tituloHome;
    if (seo.descripcionHome) {
      var meta = document.querySelector('meta[name="description"]');
      if (meta && meta.getAttribute('content') !== seo.descripcionHome) {
        meta.setAttribute('content', seo.descripcionHome);
      }
    }
  }

  function sameMediaUrl(a, b) {
    a = String(a || '').trim();
    b = String(b || '').trim();
    if (!a || !b) return false;
    if (a === b) return true;
    try {
      var ua = new URL(a, window.location.href);
      var ub = new URL(b, window.location.href);
      var pa = decodeURIComponent(ua.pathname).replace(/\/+$/, '').toLowerCase();
      var pb = decodeURIComponent(ub.pathname).replace(/\/+$/, '').toLowerCase();
      return pa === pb;
    } catch (e) {
      var fa = a.split('?')[0].replace(/^.*\//, '').toLowerCase();
      var fb = b.split('?')[0].replace(/^.*\//, '').toLowerCase();
      return !!fa && fa === fb;
    }
  }

  function currentVideoSrc(video) {
    if (!video) return '';
    var source = video.querySelector('source');
    return String((source && source.getAttribute('src')) || video.getAttribute('src') || '').trim();
  }

  function applyPortadaMedia(portada) {
    if (!portada || portada.aplicarEnWeb !== true) return;
    var video = document.getElementById('heroVideo');
    if (!video) return;

    var poster = portada.heroImagen ? String(portada.heroImagen).trim() : '';
    var vurl = portada.heroVideo ? String(portada.heroVideo).trim() : '';
    var cur = currentVideoSrc(video);
    var videoChanged = !!(vurl && !sameMediaUrl(cur, vurl));
    var posterChanged = !!(poster && !sameMediaUrl(video.getAttribute('poster') || '', poster));

    // Mismo Portada.mp4 / Portada_1.png que el HTML → no tocar (cero flash).
    if (!videoChanged && !posterChanged) return;

    if (poster && posterChanged) {
      video.setAttribute('poster', poster);
    }

    if (videoChanged) {
      var source = video.querySelector('source');
      if (source) source.setAttribute('src', vurl);
      else video.setAttribute('src', vurl);
      try { video.load(); } catch (e) {}
      try {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (e2) {}
    }
  }

  function applyPortadaText(portada) {
    lastPortada = portada;
    if (!portada || portada.aplicarEnWeb !== true) return;

    setText(document.querySelector('.hero-title'), portada.heroTitulo);
    setText(document.querySelector('.hero-subtitle'), portada.heroTexto || portada.tagline);

    var ctaCal = document.querySelector('.hero-buttons a[href*="calendario"]');
    if (ctaCal) {
      if (portada.ctaTexto) setText(ctaCal, portada.ctaTexto);
      if (portada.ctaUrl) {
        var href = String(portada.ctaUrl).trim();
        if (href && ctaCal.getAttribute('href') !== href) ctaCal.setAttribute('href', href);
      }
    }

    var nombre = String(portada.nombreClub || '').trim();
    if (nombre && !(lastSeo && lastSeo.tituloHome) && document.title !== nombre) {
      document.title = nombre;
    }
  }

  function applyPortada(portada, opts) {
    opts = opts || {};
    applyPortadaText(portada);
    if (!opts.skipMedia) applyPortadaMedia(portada);
  }

  function applyHeroSlides(slides) {
    lastSlides = slides;
    if (!lastPortada || lastPortada.aplicarEnWeb !== true) return;
    if (!slides || !slides.length) return;
    var active = slides.filter(function (s) { return s && s.activo !== false; })
      .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
    if (!active.length) return;

    var btns = document.querySelectorAll('.hero-buttons a.hero-btn');
    active.forEach(function (s, i) {
      var btn = btns[i];
      if (!btn) return;
      if (s.linkTexto) setText(btn, s.linkTexto);
      if (s.linkUrl) {
        var href = String(s.linkUrl).trim();
        if (href && btn.getAttribute('href') !== href) btn.setAttribute('href', href);
      }
    });
  }

  function menuSignature(items) {
    var active = (items || []).filter(function (m) { return m && m.activo !== false && String(m.label || '').trim(); })
      .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
    return active.map(function (m) {
      return String(m.label || '').trim() + '\n' + String(m.url || '').trim();
    }).join('|');
  }

  function applyMenu(items) {
    lastMenu = items;
    var list = document.querySelector('#mainNav .nav-list') || document.querySelector('.nav-list');
    if (!list) return;
    var active = (items || []).filter(function (m) { return m && m.activo !== false && String(m.label || '').trim(); })
      .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
    if (!active.length) return;

    var sig = menuSignature(active);
    if (sig === lastMenuSig && list.querySelectorAll('.nav-link').length === active.length) {
      return;
    }
    lastMenuSig = sig;

    list.innerHTML = '';
    active.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'nav-item';
      var a = document.createElement('a');
      a.className = 'nav-link';
      a.href = m.url || '#';
      a.textContent = String(m.label).trim();
      a.setAttribute('data-cms', '1');
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function pageKey(pathname) {
    var p = String(pathname || (window.CMS_EDIT_PAGE || window.location.pathname) || '/').replace(/\/index\.html$/i, '/');
    if (!p || p === '') p = '/';
    return p;
  }

  function pageMatch(saved, current) {
    if (!saved || saved === '*') return true;
    return pageKey(saved) === pageKey(current);
  }

  function findOverrideEl(selector) {
    if (!selector) return null;
    try {
      var el = document.querySelector(selector);
      if (el) return el;
    } catch (e) {}
    var id = selector.match(/#([A-Za-z][\w-]*)/);
    if (id) {
      var byId = document.getElementById(id[1]);
      if (byId) return byId;
    }
    var last = selector.split('>').pop().trim().replace(/:nth-of-type\(\d+\)/g, '');
    if (last) {
      try { return document.querySelector(last); } catch (e2) {}
    }
    return null;
  }

  function applyOverrides(list, opts) {
    opts = opts || {};
    if (!list || !list.length) return;
    var page = pageKey();
    list.forEach(function (o) {
      if (!o || o.activo === false || !o.selector) return;
      if (!pageMatch(o.page, page)) return;
      var el = findOverrideEl(o.selector);
      if (!el) return;
      if (o.hidden) {
        el.style.display = 'none';
        return;
      }
      if (o.text) {
        if (el.tagName === 'IMG') {
          if (el.getAttribute('alt') !== o.text) el.setAttribute('alt', o.text);
        } else setText(el, o.text);
      }
      if (o.href && (el.tagName === 'A' || el.hasAttribute('href'))) {
        var href = String(o.href).trim();
        if (href && el.getAttribute('href') !== href) el.setAttribute('href', href);
      }
      if (opts.skipMedia) return;
      if (o.src) {
        if (el.id === 'heroVideo' || (el.closest && el.closest('#heroVideo'))) return;
        if (el.closest && el.closest('.hero-background')) return;
        if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE') {
          if (el.getAttribute('src') !== o.src) el.setAttribute('src', o.src);
        }
      }
      if (o.bg) {
        if (el.closest && (el.closest('.hero') || el.closest('.hero-background'))) return;
        var nextBg = 'url("' + String(o.bg).replace(/"/g, '\\"') + '")';
        if (el.style.backgroundImage !== nextBg) el.style.backgroundImage = nextBg;
      }
    });
  }

  function reapplyLocked() {
    if (lastPortada) applyPortada(lastPortada, { skipMedia: true });
    if (lastSlides && lastSlides.length) applyHeroSlides(lastSlides);
    if (lastMenu && lastMenu.length) applyMenu(lastMenu);
    if (lastSeo && lastPortada && lastPortada.aplicarEnWeb === true) applySeo(lastSeo);
    if (window.CmsPlataforma && window.CmsPlataforma.data) {
      applyOverrides(window.CmsPlataforma.data.webOverrides, { skipMedia: true });
    }
  }

  function scheduleSoftReapply() {
    if (softReapplyTimer) clearTimeout(softReapplyTimer);
    softReapplyTimer = setTimeout(reapplyLocked, 350);
  }

  function applyData(data) {
    data = data || {};
    window.CmsPlataforma.data = data;
    window.__CMS_SYNC_OK = true;
    lastPortada = data.portada || null;
    lastSeo = data.seo || null;
    lastSlides = data.heroSlides || null;
    lastMenu = data.menu || null;

    applyPortada(data.portada, { skipMedia: false });
    applyMenu(data.menu);
    applyOverrides(data.webOverrides, { skipMedia: false });
    if (data.portada && data.portada.aplicarEnWeb === true) {
      applySeo(data.seo);
      applyHeroSlides(data.heroSlides);
    }
    if (window.CMS_FORCE_EDIT || /[?&]cmsEdit=1/.test(location.search || '') || window.parent !== window) {
      scheduleSoftReapply();
    }
    document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: data }));
    return data;
  }

  function reload() {
    var u = getUrl();
    u += (u.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
    return fetch(u)
      .then(function (r) {
        if (!r.ok) throw new Error('contenido HTTP ' + r.status);
        return r.json();
      })
      .then(applyData);
  }

  window.CmsPlataforma = {
    data: null,
    getCorrespondencias: function () {
      return (this.data && this.data.correspondencias) || [];
    },
    reapply: reapplyLocked,
    reload: reload,
    applyData: applyData
  };

  document.addEventListener('i18n:changed', function () {
    if (window.CMS_FORCE_EDIT || /[?&]cmsEdit=1/.test(location.search || '')) {
      scheduleSoftReapply();
    } else {
      reapplyLocked();
    }
  });

  reload().catch(function (err) {
    window.__CMS_SYNC_OK = false;
    document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: null }));
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[CMS]', err && err.message ? err.message : err);
    }
  });
})();
