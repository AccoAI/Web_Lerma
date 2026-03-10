/**
 * Popup de torneos en portada (izquierda de pantalla).
 * Si popupActivo y hay contenido, muestra el modal.
 * "No volver a mostrar hoy" se guarda en sessionStorage.
 * URL por defecto: plataforma de torneos; se puede sobrescribir con window.TORNEOS_POPUP_DATA_URL en el HTML.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'torneosPopupCerrado';
    var DEFAULT_PLATFORM_URL = 'https://plataforma-torneos-lerma-salda-a.vercel.app/api/torneos.json';

    function getDataUrl() {
        if (typeof window !== 'undefined' && typeof window.TORNEOS_POPUP_DATA_URL === 'string' && window.TORNEOS_POPUP_DATA_URL.trim()) {
            return window.TORNEOS_POPUP_DATA_URL.trim();
        }
        return DEFAULT_PLATFORM_URL;
    }

    var DATA_URL = getDataUrl();

    function isPortada() {
        var p = (window.location.pathname || '').replace(/\/$/, '');
        return p === '' || p === '/index.html' || /\/index\.html$/i.test(p);
    }

    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function cerradoHoy() {
        try {
            return sessionStorage.getItem(STORAGE_KEY) === todayStr();
        } catch (e) {
            return false;
        }
    }

    function marcarCerradoHoy() {
        try {
            sessionStorage.setItem(STORAGE_KEY, todayStr());
        } catch (e) {}
    }

    function esc(s) {
        if (s == null || s === '') return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function safeHref(url) {
        var href = (url || '').trim();
        if (!href || /^\s*javascript\s*:/i.test(href) || /^\s*data\s*:/i.test(href)) return '#';
        return href;
    }

    function safeImgSrc(src) {
        var s = (src || '').trim();
        if (!s || /^\s*javascript\s*:/i.test(s) || /^\s*data\s*:/i.test(s)) return '';
        return s;
    }

    function showPopup(config) {
        var overlay = document.getElementById('torneosPopup');
        var list = document.getElementById('torneosPopupList');
        var titulo = document.getElementById('torneosPopupTitulo');
        var subtituloEl = document.getElementById('torneosPopupSubtitulo');
        var imgWrap = document.getElementById('torneosPopupImagenWrap');
        var textoWrap = document.getElementById('torneosPopupTextoWrap');
        var textoEl = document.getElementById('torneosPopupTexto');
        var closeBtn = document.getElementById('torneosPopupClose');
        var noHoy = document.getElementById('torneosPopupNoHoy');

        if (!overlay || !titulo) return;

        titulo.textContent = config.titulo || 'Próximos torneos';

        if (subtituloEl) {
            var sub = (config.subtitulo || '').trim();
            if (sub) {
                subtituloEl.textContent = sub;
                subtituloEl.removeAttribute('hidden');
            } else {
                subtituloEl.setAttribute('hidden', '');
                subtituloEl.textContent = '';
            }
        }

        if (imgWrap) {
            var imgUrl = (config.foto || config.imagen || '').trim();
            if (imgUrl && !/^\s*javascript\s*:/i.test(imgUrl) && !/^\s*data\s*:/i.test(imgUrl)) {
                var img = document.createElement('img');
                img.src = imgUrl;
                img.alt = config.titulo || 'Torneo';
                img.className = 'torneos-popup-imagen';
                imgWrap.innerHTML = '';
                imgWrap.appendChild(img);
                imgWrap.removeAttribute('hidden');
            } else {
                imgWrap.setAttribute('hidden', '');
                imgWrap.innerHTML = '';
            }
        }

        if (textoWrap && textoEl) {
            textoWrap.setAttribute('hidden', '');
            textoEl.textContent = '';
        }

        if (list) {
            list.innerHTML = '';
            var torneos = config.torneos || [];
            if (torneos.length) {
                list.removeAttribute('hidden');
                torneos.forEach(function (t) {
                    var item = document.createElement('div');
                    item.className = 'torneos-popup-item';
                    var imgUrl = safeImgSrc(t.foto || t.imagen);
                    var info = (t.fechas ? '<span class="torneos-popup-item-fecha">' + esc(t.fechas) + '</span>' : '') +
                        '<strong class="torneos-popup-item-titulo">' + esc(t.titulo || 'Torneo') + '</strong>' +
                        (t.descripcion ? '<span class="torneos-popup-item-desc">' + esc(t.descripcion) + '</span>' : '');
                    var contentWrap = document.createElement('div');
                    contentWrap.className = 'torneos-popup-item-content';
                    contentWrap.innerHTML = info;
                    var btn = document.createElement('a');
                    btn.href = safeHref(t.enlace);
                    btn.className = 'torneos-popup-item-btn';
                    btn.textContent = 'Más información';
                    contentWrap.appendChild(btn);
                    item.appendChild(contentWrap);
                    if (imgUrl) {
                        var imgWrap = document.createElement('div');
                        imgWrap.className = 'torneos-popup-item-imagen-wrap';
                        var img = document.createElement('img');
                        img.src = imgUrl;
                        img.alt = t.titulo || 'Torneo';
                        img.className = 'torneos-popup-item-imagen';
                        imgWrap.appendChild(img);
                        item.appendChild(imgWrap);
                    }
                    list.appendChild(item);
                });
            } else {
                list.setAttribute('hidden', '');
            }
        }

        overlay.removeAttribute('hidden');

        function close() {
            overlay.setAttribute('hidden', '');
            if (noHoy && noHoy.checked) marcarCerradoHoy();
        }

        if (closeBtn) closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
    }

    function init() {
        if (!isPortada() || cerradoHoy()) return;

        var overlay = document.getElementById('torneosPopup');
        if (!overlay) return;

        fetch(DATA_URL)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data || !data.popupActivo) return;
                var hasContent = (data.torneos && data.torneos.length) || (data.imagen && data.imagen.trim()) || (data.texto && data.texto.trim()) || (data.linkUrl && data.linkTexto);
                if (!hasContent) return;
                showPopup(data);
            })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
