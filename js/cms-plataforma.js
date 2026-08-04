/**
 * Puente CMS → web real.
 * Solo actualiza nodos que YA existen en el HTML. No inyecta bloques nuevos ni cambia el diseño.
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

  /**
   * Portada → elementos ya presentes en index.html:
   * .hero-title, .hero-subtitle, #heroVideo[poster], botón calendario, logo alt, <title>
   */
  function applyPortada(portada) {
    lastPortada = portada;
    if (!portada) return;

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

    // Nombre del club: solo accesibilidad / pestaña (no añade UI)
    var nombre = String(portada.nombreClub || '').trim();
    if (nombre) {
      var logoImg = document.querySelector('.header-logo-image');
      if (logoImg) logoImg.setAttribute('alt', nombre);
      if (!(lastSeo && lastSeo.tituloHome)) document.title = nombre;
    }
  }

  /**
   * Hero slides: si hay datos, el primero actualiza el hero YA existente.
   * No crea botones ni slides nuevos en el DOM.
   */
  function applyHeroSlides(slides) {
    lastSlides = slides;
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
    if (lastSeo) applySeo(lastSeo);
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
      applySeo(data.seo);
      applyPortada(data.portada);
      applyHeroSlides(data.heroSlides);
      setTimeout(reapplyLocked, 400);
      setTimeout(reapplyLocked, 1200);
      document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: data }));
      if (typeof console !== 'undefined' && console.info) {
        console.info('[CMS] Contenido aplicado sobre elementos existentes de la web.');
      }
    })
    .catch(function (err) {
      window.__CMS_SYNC_OK = false;
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[CMS] No se pudo cargar contenido:', err && err.message ? err.message : err);
      }
      document.dispatchEvent(new CustomEvent('cms:contenido-listo', { detail: null }));
    });
})();
