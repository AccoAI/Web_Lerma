/**
 * Popups centrados (sección Popups del panel). Independientes de "Próximos torneos".
 * Tipos: general | aviso | horario | tarifa.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cmsPopupsCerrado';
  /** Espera máxima a la 1ª imagen antes de mostrar el diálogo (ms). */
  var REVEAL_TIMEOUT_MS = 450;
  var IMG_HEIGHT_PX = 240;

  function getUrl() {
    if (window.CMS_CONTENIDO_URL) return window.CMS_CONTENIDO_URL;
    if (window.TORNEOS_POPUP_DATA_URL) {
      return window.TORNEOS_POPUP_DATA_URL.replace(/\/api\/torneos\.json.*/i, '/api/contenido.json');
    }
    var base = (window.PLATAFORMA_CMS_URL || 'https://plataforma-torneos-lerma-salda-a.vercel.app').replace(/\/$/, '');
    return base + '/api/contenido.json';
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function cerradoHoy() {
    try { return sessionStorage.getItem(STORAGE_KEY) === todayStr(); } catch (e) { return false; }
  }

  function marcarCerradoHoy() {
    try { sessionStorage.setItem(STORAGE_KEY, todayStr()); } catch (e) {}
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function safeHref(url) {
    var href = (url || '').trim();
    if (!href || /^\s*javascript\s*:/i.test(href) || /^\s*data\s*:/i.test(href)) return '#';
    return href;
  }

  function tipoLabel(tipo) {
    var t = String(tipo || 'general').toLowerCase();
    if (t === 'aviso') return 'Aviso';
    if (t === 'horario') return 'Horario';
    if (t === 'tarifa') return 'Tarifa';
    return '';
  }

  function whenImageReady(img, timeoutMs) {
    return new Promise(function (resolve) {
      if (!img) {
        resolve();
        return;
      }
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      if (img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(function () {});
      }
      setTimeout(finish, timeoutMs);
    });
  }

  function preloadUrl(url) {
    if (!url) return;
    var img = new Image();
    img.decoding = 'async';
    img.src = url;
  }

  function ensureDom() {
    if (document.getElementById('cmsCenterPopup')) return;
    var wrap = document.createElement('div');
    wrap.id = 'cmsCenterPopup';
    wrap.className = 'cms-center-popup';
    wrap.setAttribute('hidden', '');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="cms-center-popup__backdrop" data-close="1"></div>' +
      '<div class="cms-center-popup__dialog">' +
        '<button type="button" class="cms-center-popup__close" aria-label="Cerrar" data-close="1">×</button>' +
        '<button type="button" class="cms-center-popup__nav cms-center-popup__nav--prev" id="cmsCenterPopupPrev" aria-label="Anterior" hidden>‹</button>' +
        '<button type="button" class="cms-center-popup__nav cms-center-popup__nav--next" id="cmsCenterPopupNext" aria-label="Siguiente" hidden>›</button>' +
        '<div class="cms-center-popup__slides" id="cmsCenterPopupSlides"></div>' +
        '<div class="cms-center-popup__dots" id="cmsCenterPopupDots"></div>' +
        '<label class="cms-center-popup__no-hoy"><input type="checkbox" id="cmsCenterPopupNoHoy"> No volver a mostrar hoy</label>' +
      '</div>';
    document.body.appendChild(wrap);

    var style = document.getElementById('cms-center-popup-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'cms-center-popup-styles';
      document.head.appendChild(style);
    }
    style.textContent =
      '.cms-center-popup{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:1rem;}' +
      '.cms-center-popup[hidden]{display:none!important;}' +
      '.cms-center-popup__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .28s ease;}' +
      '.cms-center-popup.is-ready .cms-center-popup__backdrop{opacity:1;}' +
      '.cms-center-popup__dialog{position:relative;z-index:1;width:min(680px,96vw);background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:Montserrat,system-ui,sans-serif;' +
        'opacity:0;transform:translateY(10px) scale(.985);transition:opacity .32s ease,transform .32s ease;}' +
      '.cms-center-popup.is-ready .cms-center-popup__dialog{opacity:1;transform:none;}' +
      '.cms-center-popup__close{position:absolute;top:.5rem;right:.65rem;z-index:3;border:0;background:rgba(0,0,0,.45);color:#fff;width:2.25rem;height:2.25rem;border-radius:50%;font-size:1.35rem;cursor:pointer;line-height:1;}' +
      '.cms-center-popup__nav{position:absolute;top:' + (IMG_HEIGHT_PX / 2) + 'px;transform:translateY(-50%);z-index:3;border:0;width:2.4rem;height:2.4rem;border-radius:50%;background:rgba(15,92,44,.9);color:#fff;font-size:1.65rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 10px rgba(0,0,0,.25);}' +
      '.cms-center-popup__nav[hidden]{display:none!important;}' +
      '.cms-center-popup__nav--prev{left:.55rem;}' +
      '.cms-center-popup__nav--next{right:.55rem;}' +
      '.cms-center-popup__nav:hover{background:#0a3d1c;}' +
      '.cms-center-popup__dialog--no-img .cms-center-popup__nav{top:auto;bottom:4.85rem;}' +
      '.cms-center-popup__slides{position:relative;}' +
      '.cms-center-popup__slide{display:none;}' +
      '.cms-center-popup__slide.is-active{display:block;}' +
      '.cms-center-popup__slide.is-active.is-switching{animation:cmsPopSlide .35s ease;}' +
      '@keyframes cmsPopSlide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}' +
      '.cms-center-popup__media{width:100%;height:' + IMG_HEIGHT_PX + 'px;background:#e8efe9;overflow:hidden;}' +
      '.cms-center-popup__img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.cms-center-popup__body{padding:1.35rem 1.5rem 1.4rem;}' +
      '.cms-center-popup__dialog--multi .cms-center-popup__body{padding-left:3.15rem;padding-right:3.15rem;}' +
      '.cms-center-popup__tipo{display:inline-block;margin:0 0 .55rem;padding:.25rem .65rem;border-radius:6px;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:#e8efe9;color:#0f5c2c;}' +
      '.cms-center-popup__tipo--aviso{background:#fff4e5;color:#9a5b00;}' +
      '.cms-center-popup__tipo--horario{background:#e8f1ff;color:#1a4a8a;}' +
      '.cms-center-popup__tipo--tarifa{background:#eef8e8;color:#2d6a1f;}' +
      '.cms-center-popup__sub{margin:0 0 .4rem;color:#5a5a5a;font-size:.92rem;}' +
      '.cms-center-popup__title{margin:0 0 .55rem;color:#0f5c2c;font-size:1.45rem;line-height:1.25;}' +
      '.cms-center-popup__text{margin:0 0 1rem;color:#333;font-size:1.02rem;line-height:1.5;white-space:pre-line;}' +
      '.cms-center-popup__link-intro{margin:0 0 .75rem;color:#444;font-size:.95rem;line-height:1.45;white-space:pre-line;}' +
      '.cms-center-popup__btn{display:inline-block;padding:.8rem 1.25rem;background:#0f5c2c;color:#fff;text-decoration:none;font-weight:600;border-radius:8px;font-size:1rem;}' +
      '.cms-center-popup__dots{display:flex;gap:6px;justify-content:center;padding:0 1rem .85rem;}' +
      '.cms-center-popup__dots:empty{display:none;}' +
      '.cms-center-popup__dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:#c5d4ca;cursor:pointer;}' +
      '.cms-center-popup__dot.is-active{background:#0f5c2c;}' +
      '.cms-center-popup__no-hoy{display:flex;align-items:center;gap:.4rem;padding:0 1.5rem 1.15rem;font-size:.85rem;color:#666;cursor:pointer;}' +
      '@media (max-width:520px){' +
        '.cms-center-popup__media{height:200px;}' +
        '.cms-center-popup__nav{top:100px;}' +
        '.cms-center-popup__dialog--multi .cms-center-popup__body{padding-left:2.75rem;padding-right:2.75rem;}' +
        '.cms-center-popup__title{font-size:1.25rem;}' +
      '}';
  }

  function show(popups) {
    ensureDom();
    var root = document.getElementById('cmsCenterPopup');
    var slidesEl = document.getElementById('cmsCenterPopupSlides');
    var dotsEl = document.getElementById('cmsCenterPopupDots');
    var noHoy = document.getElementById('cmsCenterPopupNoHoy');
    var prevBtn = document.getElementById('cmsCenterPopupPrev');
    var nextBtn = document.getElementById('cmsCenterPopupNext');
    if (!root || !slidesEl) return;

    root.classList.remove('is-ready');
    slidesEl.innerHTML = '';
    dotsEl.innerHTML = '';

    var dialog = root.querySelector('.cms-center-popup__dialog');
    var hasAnyImage = popups.some(function (p) { return p && p.imagen && String(p.imagen).trim(); });
    if (dialog) {
      dialog.classList.toggle('cms-center-popup__dialog--multi', popups.length > 1);
      dialog.classList.toggle('cms-center-popup__dialog--no-img', !hasAnyImage);
    }

    popups.forEach(function (p, i) {
      var slide = document.createElement('article');
      slide.className = 'cms-center-popup__slide' + (i === 0 ? ' is-active' : '');
      slide.setAttribute('data-cms-popup-i', String(i));
      var html = '';
      if (p.imagen) {
        html +=
          '<div class="cms-center-popup__media">' +
            '<img class="cms-center-popup__img" src="' + esc(p.imagen) + '" alt="" decoding="async">' +
          '</div>';
      }
      html += '<div class="cms-center-popup__body">';
      var tl = tipoLabel(p.tipo);
      if (tl) {
        html += '<span class="cms-center-popup__tipo cms-center-popup__tipo--' + esc(String(p.tipo || '').toLowerCase()) + '">' +
          esc(tl) + '</span>';
      }
      if (p.subtitulo) html += '<p class="cms-center-popup__sub">' + esc(p.subtitulo) + '</p>';
      if (p.titulo) html += '<h3 class="cms-center-popup__title">' + esc(p.titulo) + '</h3>';
      if (p.texto) html += '<p class="cms-center-popup__text">' + esc(p.texto) + '</p>';
      if (p.linkIntro) html += '<p class="cms-center-popup__link-intro">' + esc(p.linkIntro) + '</p>';
      if (p.linkUrl || p.linkTexto) {
        html += '<a class="cms-center-popup__btn" href="' + esc(safeHref(p.linkUrl || '#')) + '">' +
          esc(p.linkTexto || 'Más información') + '</a>';
      }
      html += '</div>';
      slide.innerHTML = html;
      slidesEl.appendChild(slide);

      if (popups.length > 1) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'cms-center-popup__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Diapositiva ' + (i + 1));
        dot.addEventListener('click', function () { go(i, true); });
        dotsEl.appendChild(dot);
      }

      // Precarga el resto de slides en segundo plano.
      if (i > 0 && p.imagen) preloadUrl(p.imagen);
    });

    var current = 0;
    var autoTimer = null;
    var AUTO_MS = 5500;

    function go(n, resetAuto) {
      current = (n + popups.length) % popups.length;
      slidesEl.querySelectorAll('.cms-center-popup__slide').forEach(function (el, i) {
        var active = i === current;
        el.classList.toggle('is-active', active);
        el.classList.toggle('is-switching', active);
        if (active) {
          // Quitar clase de animación al terminar para no reanimar al reabrir.
          setTimeout(function () { el.classList.remove('is-switching'); }, 360);
        }
      });
      dotsEl.querySelectorAll('.cms-center-popup__dot').forEach(function (el, i) {
        el.classList.toggle('is-active', i === current);
      });
      if (resetAuto) startAuto();
    }

    function startAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
      if (popups.length < 2) return;
      autoTimer = setInterval(function () {
        if (root.hasAttribute('hidden')) return;
        go(current + 1, false);
      }, AUTO_MS);
    }

    function close() {
      root.classList.remove('is-ready');
      root.setAttribute('hidden', '');
      if (autoTimer) clearInterval(autoTimer);
      if (noHoy && noHoy.checked) marcarCerradoHoy();
    }

    root.querySelectorAll('[data-close]').forEach(function (el) {
      el.onclick = close;
    });

    if (prevBtn && nextBtn) {
      if (popups.length > 1) {
        prevBtn.hidden = false;
        nextBtn.hidden = false;
        prevBtn.onclick = function () { go(current - 1, true); };
        nextBtn.onclick = function () { go(current + 1, true); };
      } else {
        prevBtn.hidden = true;
        nextBtn.hidden = true;
        prevBtn.onclick = null;
        nextBtn.onclick = null;
      }
    }

    var firstImg = slidesEl.querySelector('.cms-center-popup__slide.is-active .cms-center-popup__img');

    function reveal() {
      if (!root.hasAttribute('hidden') && root.classList.contains('is-ready')) return;
      root.removeAttribute('hidden');
      // Doble rAF para que la transición CSS arranque desde opacity 0.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.classList.add('is-ready');
        });
      });
      startAuto();
    }

    whenImageReady(firstImg, REVEAL_TIMEOUT_MS).then(reveal);
  }

  function filterList(data) {
    if (!data || data.popupActivo === false) return [];
    if (data.popup && data.popup.activo === false) return [];
    return (data.popups || []).filter(function (p) {
      if (!p || p.activo === false) return false;
      var titulo = String(p.titulo || '').trim();
      var esSoloCabecera = !titulo || titulo === 'Próximos torneos' || titulo === 'Avisos';
      return !!(
        (p.imagen && String(p.imagen).trim()) ||
        (p.texto && String(p.texto).trim()) ||
        (p.subtitulo && String(p.subtitulo).trim()) ||
        (titulo && !esSoloCabecera)
      );
    });
  }

  var shown = false;
  function maybeShow(data) {
    if (shown || cerradoHoy() || window.CMS_FORCE_EDIT) return;
    var list = filterList(data);
    if (!list.length) return;
    shown = true;
    show(list);
  }

  function init() {
    if (cerradoHoy() || window.CMS_FORCE_EDIT) return;

    // Registrar listener ANTES de mirar data (evita perder el evento).
    document.addEventListener('cms:contenido-listo', function (ev) {
      maybeShow(ev.detail);
    }, { once: true });

    if (window.CmsPlataforma && window.CmsPlataforma.data) {
      maybeShow(window.CmsPlataforma.data);
    }

    // Fallback si el puente CMS no responde.
    setTimeout(function () {
      if (shown) return;
      if (window.CmsPlataforma && window.CmsPlataforma.data) {
        maybeShow(window.CmsPlataforma.data);
        return;
      }
      var base = getUrl();
      var url = base + (base.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(maybeShow)
        .catch(function () {});
    }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
