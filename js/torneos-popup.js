/**
 * Popup de torneos en portada.
 * Lee data/torneos-popup.json. Si popupActivo y hay torneos, muestra el modal.
 * "No volver a mostrar hoy" se guarda en sessionStorage.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'torneosPopupCerrado';
    var DATA_URL = 'data/torneos-popup.json';
    var DELAY_MS = 1800;

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

    function showPopup(config) {
        var overlay = document.getElementById('torneosPopup');
        var list = document.getElementById('torneosPopupList');
        var titulo = document.getElementById('torneosPopupTitulo');
        var subtituloEl = document.getElementById('torneosPopupSubtitulo');
        var imgWrap = document.getElementById('torneosPopupImagenWrap');
        var textoWrap = document.getElementById('torneosPopupTextoWrap');
        var textoEl = document.getElementById('torneosPopupTexto');
        var linkEl = document.getElementById('torneosPopupLink');
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
            var imgUrl = (config.imagen || '').trim();
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

        if (linkEl) {
            var lt = (config.linkTexto || '').trim();
            var lu = config.linkUrl != null ? String(config.linkUrl).trim() : '';
            if (lt && lu) {
                linkEl.textContent = lt;
                linkEl.href = safeHref(lu);
                linkEl.removeAttribute('hidden');
            } else {
                linkEl.setAttribute('hidden', '');
                linkEl.href = '#';
                linkEl.textContent = '';
            }
        }

        if (list) {
            list.innerHTML = '';
            var torneos = config.torneos || [];
            if (torneos.length) {
                list.removeAttribute('hidden');
                torneos.forEach(function (t) {
                    var a = document.createElement('a');
                    a.href = safeHref(t.enlace);
                    a.className = 'torneos-popup-item';
                    a.innerHTML = '<strong>' + esc(t.titulo || 'Torneo') + '</strong>' +
                        (t.fechas ? '<span>' + esc(t.fechas) + '</span>' : '') +
                        (t.descripcion ? '<span style="display:block;margin-top:0.35rem;">' + esc(t.descripcion) + '</span>' : '');
                    list.appendChild(a);
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
                setTimeout(function () {
                    showPopup(data);
                }, DELAY_MS);
            })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
