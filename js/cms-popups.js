/**
 * Popups centrados (sección Popups del panel). Independientes de "Próximos torneos".
 * Tipos: general | aviso | horario | tarifa.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cmsPopupsCerrado';

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
        '<div class="cms-center-popup__slides" id="cmsCenterPopupSlides"></div>' +
        '<div class="cms-center-popup__dots" id="cmsCenterPopupDots"></div>' +
        '<label class="cms-center-popup__no-hoy"><input type="checkbox" id="cmsCenterPopupNoHoy"> No volver a mostrar hoy</label>' +
      '</div>';
    document.body.appendChild(wrap);

    if (!document.getElementById('cms-center-popup-styles')) {
      var style = document.createElement('style');
      style.id = 'cms-center-popup-styles';
      style.textContent =
        '.cms-center-popup{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:1rem;}' +
        '.cms-center-popup[hidden]{display:none!important;}' +
        '.cms-center-popup__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55);}' +
        '.cms-center-popup__dialog{position:relative;z-index:1;width:min(520px,94vw);background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:Montserrat,system-ui,sans-serif;}' +
        '.cms-center-popup__close{position:absolute;top:.5rem;right:.65rem;z-index:2;border:0;background:rgba(0,0,0,.45);color:#fff;width:2rem;height:2rem;border-radius:50%;font-size:1.25rem;cursor:pointer;line-height:1;}' +
        '.cms-center-popup__slides{position:relative;min-height:280px;}' +
        '.cms-center-popup__slide{display:none;}' +
        '.cms-center-popup__slide.is-active{display:block;animation:cmsPopIn .4s ease;}' +
        '@keyframes cmsPopIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}' +
        '.cms-center-popup__img{width:100%;max-height:220px;object-fit:cover;display:block;background:#e8efe9;}' +
        '.cms-center-popup__body{padding:1.1rem 1.25rem 1.25rem;}' +
        '.cms-center-popup__tipo{display:inline-block;margin:0 0 .5rem;padding:.2rem .55rem;border-radius:6px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:#e8efe9;color:#0f5c2c;}' +
        '.cms-center-popup__tipo--aviso{background:#fff4e5;color:#9a5b00;}' +
        '.cms-center-popup__tipo--horario{background:#e8f1ff;color:#1a4a8a;}' +
        '.cms-center-popup__tipo--tarifa{background:#eef8e8;color:#2d6a1f;}' +
        '.cms-center-popup__sub{margin:0 0 .35rem;color:#5a5a5a;font-size:.85rem;}' +
        '.cms-center-popup__title{margin:0 0 .5rem;color:#0f5c2c;font-size:1.25rem;}' +
        '.cms-center-popup__text{margin:0 0 1rem;color:#333;font-size:.95rem;line-height:1.45;white-space:pre-line;}' +
        '.cms-center-popup__btn{display:inline-block;padding:.65rem 1.1rem;background:#0f5c2c;color:#fff;text-decoration:none;font-weight:600;border-radius:8px;}' +
        '.cms-center-popup__dots{display:flex;gap:6px;justify-content:center;padding:0 1rem .75rem;}' +
        '.cms-center-popup__dot{width:8px;height:8px;border-radius:50%;border:0;padding:0;background:#c5d4ca;cursor:pointer;}' +
        '.cms-center-popup__dot.is-active{background:#0f5c2c;}' +
        '.cms-center-popup__no-hoy{display:flex;align-items:center;gap:.4rem;padding:0 1.25rem 1rem;font-size:.8rem;color:#666;cursor:pointer;}';
      document.head.appendChild(style);
    }
  }

  function show(popups) {
    ensureDom();
    var root = document.getElementById('cmsCenterPopup');
    var slidesEl = document.getElementById('cmsCenterPopupSlides');
    var dotsEl = document.getElementById('cmsCenterPopupDots');
    var noHoy = document.getElementById('cmsCenterPopupNoHoy');
    if (!root || !slidesEl) return;

    slidesEl.innerHTML = '';
    dotsEl.innerHTML = '';
    popups.forEach(function (p, i) {
      var slide = document.createElement('article');
      slide.className = 'cms-center-popup__slide' + (i === 0 ? ' is-active' : '');
      var html = '';
      if (p.imagen) html += '<img class="cms-center-popup__img" src="' + esc(p.imagen) + '" alt="">';
      html += '<div class="cms-center-popup__body">';
      var tl = tipoLabel(p.tipo);
      if (tl) {
        html += '<span class="cms-center-popup__tipo cms-center-popup__tipo--' + esc(String(p.tipo || '').toLowerCase()) + '">' +
          esc(tl) + '</span>';
      }
      if (p.subtitulo) html += '<p class="cms-center-popup__sub">' + esc(p.subtitulo) + '</p>';
      if (p.titulo) html += '<h3 class="cms-center-popup__title">' + esc(p.titulo) + '</h3>';
      if (p.texto) html += '<p class="cms-center-popup__text">' + esc(p.texto) + '</p>';
      if (p.linkUrl || p.linkTexto) {
        html += '<a class="cms-center-popup__btn" href="' + esc(safeHref(p.linkUrl || '#')) + '">' +
          esc(p.linkTexto || 'Ver más') + '</a>';
      }
      html += '</div>';
      slide.innerHTML = html;
      slidesEl.appendChild(slide);

      if (popups.length > 1) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'cms-center-popup__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Diapositiva ' + (i + 1));
        dot.addEventListener('click', function () { go(i); });
        dotsEl.appendChild(dot);
      }
    });

    var current = 0;
    function go(n) {
      current = (n + popups.length) % popups.length;
      slidesEl.querySelectorAll('.cms-center-popup__slide').forEach(function (el, i) {
        el.classList.toggle('is-active', i === current);
      });
      dotsEl.querySelectorAll('.cms-center-popup__dot').forEach(function (el, i) {
        el.classList.toggle('is-active', i === current);
      });
    }

    function close() {
      root.setAttribute('hidden', '');
      if (noHoy && noHoy.checked) marcarCerradoHoy();
    }

    root.querySelectorAll('[data-close]').forEach(function (el) {
      el.onclick = close;
    });

    root.removeAttribute('hidden');
    if (popups.length > 1) {
      setInterval(function () {
        if (root.hasAttribute('hidden')) return;
        go(current + 1);
      }, 5500);
    }
  }

  function init() {
    if (cerradoHoy()) return;
    var url = getUrl() + (getUrl().indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || data.popupActivo === false) return;
        if (data.popup && data.popup.activo === false) return;
        var list = (data.popups || []).filter(function (p) {
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
        if (!list.length) return;
        show(list);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
