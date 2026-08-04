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
    if (video && portada.heroImagen) {
      video.setAttribute('poster', portada.heroImagen);
    }

    var ctaCal = document.querySelector('.hero-buttons a[href*="calendario"]');
    if (ctaCal) {
      if (portada.ctaTexto) setText(ctaCal, portada.ctaTexto);
      if (portada.ctaUrl) ctaCal.setAttribute('href', portada.ctaUrl);
    }

    var nombre = String(portada.nombreClub || '').trim();
    if (nombre) {
      var logoImg = document.querySelector('.header-logo-image');
      if (logoImg) logoImg.setAttribute('alt', nombre);
      if (!(lastSeo && lastSeo.tituloHome)) document.title = nombre;
    }
  }

  function applyHeroSlides(slides) {
    lastSlides = slides;
    if (!lastPortada || lastPortada.aplicarEnWeb !== true) return;
    if (!slides || !slides.length) return;
    var first = slides[0];
    if (!first) return;
    setText(document.querySelector('.hero-title'), first.titulo);
    setText(document.querySelector('.hero-subtitle'), first.pie);
    var video = document.getElementById('heroVideo');
    if (video && first.imagen) video.setAttribute('poster', first.imagen);
    if (first.linkTexto || first.linkUrl) {
      var ctaCal = document.querySelector('.hero-buttons a[href*="calendario"]');
      if (ctaCal) {
        if (first.linkTexto) setText(ctaCal, first.linkTexto);
        if (first.linkUrl) ctaCal.setAttribute('href', first.linkUrl);
      }
    }
  }

  function reapplyLocked() {
    if (lastPortada) applyPortada(lastPortada);
    if (lastSlides && lastSlides.length) applyHeroSlides(lastSlides);
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
