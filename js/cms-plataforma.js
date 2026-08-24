/**
 * Puente CMS → web real.
 * Solo actualiza nodos que YA existen. No cambia el diseño.
 * Si portada.aplicarEnWeb !== true, no toca la home (queda el HTML/i18n original).
 * Evita reaplicar media/menú si no hay cambios (sin parpadeos).
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

  function currentVideoSrc(video) {
    if (!video) return '';
    var source = video.querySelector('source');
    return String((source && source.getAttribute('src')) || video.getAttribute('src') || '').trim();
  }

  function applyPortadaMedia(portada) {
    if (!portada || portada.aplicarEnWeb !== true) return;
    var video = document.getElementById('heroVideo');
    if (!video) return;

    if (portada.heroImagen) {
      var poster = String(portada.heroImagen).trim();
      if (poster && video.getAttribute('poster') !== poster) {
        video.setAttribute('poster', poster);
      }
    }

    if (portada.heroVideo) {
      var vurl = String(portada.heroVideo).trim();
      if (vurl && currentVideoSrc(video) !== vurl) {
        var source = video.querySelector('source');
        if (source) source.setAttribute('src', vurl);
        else video.setAttribute('src', vurl);
        try { video.load(); } catch (e) {}
      }
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
        if (el.id === 'heroVideo' || (el.closest && el.closest('#heroVideo'))) {
          // Si hay vídeo CMS, no forzar poster de override (flash foto↔vídeo).
          if (lastPortada && lastPortada.aplicarEnWeb === true && lastPortada.heroVideo) return;
          var poster = String(o.src).trim();
          if (poster && el.getAttribute && el.getAttribute('poster') !== poster) {
            el.setAttribute('poster', poster);
          }
          return;
        }
        if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE') {
          if (el.getAttribute('src') !== o.src) el.setAttribute('src', o.src);
        }
      }
      if (o.bg) {
        var nextBg = 'url("' + String(o.bg).replace(/"/g, '\\"') + '")';
        if (el.style.backgroundImage !== nextBg) el.style.backgroundImage = nextBg;
      }
    });
  }

  /** Reaplica solo texto / menú / overrides no-media (carrera con i18n). Nunca reinicia el vídeo. */
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
    // Una sola pasada suave (solo texto). Nunca a 400+1200 ni video.load().
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
    // Overrides de media DESPUÉS de portada, pero sin pisar el vídeo activo.
    applyOverrides(data.webOverrides, { skipMedia: false });
    if (data.portada && data.portada.aplicarEnWeb === true) {
      applySeo(data.seo);
      applyHeroSlides(data.heroSlides);
    }
    // En público no hace falta reaplicar por timer; i18n:changed ya lo hace.
    if (window.parent !== window || window.CMS_FORCE_EDIT || /[?&]cmsEdit=1/.test(location.search || '')) {
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
    scheduleSoftReapply();
  });

  reload().catch(function (err) {
    window.__CMS_SYNC_OK = false;
    document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: null }));
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[CMS]', err && err.message ? err.message : err);
    }
  });
})();
