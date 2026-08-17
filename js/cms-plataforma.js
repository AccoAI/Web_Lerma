/**
 * Puente CMS → web real.
 * Solo actualiza nodos que YA existen. No cambia el diseño.
 * Si portada.aplicarEnWeb !== true, no toca la home (queda el HTML/i18n original).
 */
(function () {
  'use strict';

  var lastPortada = null;
  var lastSeo = null;
  var lastSlides = null;
  var lastMenu = null;

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
    el.textContent = String(value).trim();
    lockFromI18n(el);
  }

  function applySeo(seo) {
    lastSeo = seo;
    if (!seo) return;
    if (seo.tituloHome) document.title = seo.tituloHome;
    if (seo.descripcionHome) {
      var meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', seo.descripcionHome);
    }
  }

  function applyPortada(portada) {
    lastPortada = portada;
    if (!portada || portada.aplicarEnWeb !== true) return;

    setText(document.querySelector('.hero-title'), portada.heroTitulo);
    setText(document.querySelector('.hero-subtitle'), portada.heroTexto || portada.tagline);

    var video = document.getElementById('heroVideo');
    if (video) {
      if (portada.heroImagen) {
        video.setAttribute('poster', portada.heroImagen);
      }
      if (portada.heroVideo) {
        var source = video.querySelector('source');
        if (source) {
          source.setAttribute('src', portada.heroVideo);
        } else {
          video.setAttribute('src', portada.heroVideo);
        }
        try { video.load(); } catch (e) {}
      }
    }

    var ctaCal = document.querySelector('.hero-buttons a[href*="calendario"]');
    if (ctaCal) {
      if (portada.ctaTexto) setText(ctaCal, portada.ctaTexto);
      if (portada.ctaUrl) ctaCal.setAttribute('href', portada.ctaUrl);
    }

    var nombre = String(portada.nombreClub || '').trim();
    if (nombre && !(lastSeo && lastSeo.tituloHome)) document.title = nombre;
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
      if (s.linkUrl) btn.setAttribute('href', s.linkUrl);
    });
  }

  function applyMenu(items) {
    lastMenu = items;
    var list = document.querySelector('#mainNav .nav-list') || document.querySelector('.nav-list');
    if (!list) return;
    var active = (items || []).filter(function (m) { return m && m.activo !== false && String(m.label || '').trim(); })
      .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
    if (!active.length) return;

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

  function reapplyLocked() {
    if (lastPortada) applyPortada(lastPortada);
    if (lastSlides && lastSlides.length) applyHeroSlides(lastSlides);
    if (lastMenu && lastMenu.length) applyMenu(lastMenu);
    if (lastSeo && lastPortada && lastPortada.aplicarEnWeb === true) applySeo(lastSeo);
  }

  window.CmsPlataforma = {
    data: null,
    getCorrespondencias: function () {
      return (this.data && this.data.correspondencias) || [];
    },
    reapply: reapplyLocked
  };

  document.addEventListener('i18n:changed', function () {
    setTimeout(reapplyLocked, 0);
  });

  var url = getUrl();
  url += (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('contenido HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      window.CmsPlataforma.data = data || {};
      window.__CMS_SYNC_OK = true;
      applyPortada(data.portada);
      applyMenu(data.menu);
      if (data.portada && data.portada.aplicarEnWeb === true) {
        applySeo(data.seo);
        applyHeroSlides(data.heroSlides);
      }
      setTimeout(reapplyLocked, 400);
      document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: data }));
    })
    .catch(function (err) {
      window.__CMS_SYNC_OK = false;
      document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: null }));
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[CMS]', err && err.message ? err.message : err);
      }
    });
})();
