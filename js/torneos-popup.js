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
        var titulo = document.getElementById('torneosPopupTitulo');
        var cardsContainer = document.getElementById('torneosPopupCards');
        var closeBtn = document.getElementById('torneosPopupClose');
        var noHoy = document.getElementById('torneosPopupNoHoy');

        if (!overlay || !titulo) return;

        titulo.textContent = config.titulo || 'Próximos torneos';

        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            var torneos = (config.torneos || []).slice(0, 3);
            torneos.forEach(function (t) {
                var card = document.createElement('div');
                card.className = 'torneos-popup';
                var content = document.createElement('div');
                content.className = 'torneos-popup-content';
                var info = (t.fechas ? '<span class="torneos-popup-item-fecha">' + esc(t.fechas) + '</span>' : '') +
                    '<strong class="torneos-popup-item-titulo">' + esc(t.titulo || 'Torneo') + '</strong>';
                var btn = document.createElement('a');
                btn.href = 'torneo.html';
                btn.className = 'torneos-popup-item-btn';
                btn.textContent = 'Más información';
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    try {
                        sessionStorage.setItem('torneoSeleccionado', JSON.stringify(t));
                    } catch (err) {}
                    window.location.href = 'torneo.html';
                });
                content.innerHTML = info;
                content.appendChild(btn);
                card.appendChild(content);
                var imgUrl = safeImgSrc(t.foto || t.imagen);
                if (imgUrl) {
                    var imgWrap = document.createElement('div');
                    imgWrap.className = 'torneos-popup-imagen-wrap';
                    var img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = t.titulo || 'Torneo';
                    img.className = 'torneos-popup-imagen';
                    imgWrap.appendChild(img);
                    card.appendChild(imgWrap);
                }
                cardsContainer.appendChild(card);
            });
        }

        overlay.removeAttribute('hidden');

        function close() {
            var w = overlay.querySelector('.torneos-popup-wrapper');
            var mobile = isMobile && isMobile();
            var cerrarTodo = mobile ? (noHoy && noHoy.checked) : true;
            if (mobile && !cerrarTodo) {
                overlay.classList.remove('torneos-popup-expanded');
                return;
            }
            if (w) {
                var cards = w.querySelectorAll('.torneos-popup-cards .torneos-popup');
                var n = cards.length;
                w.style.setProperty('--torneos-popup-no-hoy-delay', (n * 0.1) + 's');
                overlay.classList.add('torneos-popup-closing');
                var totalMs = mobile ? 320 : Math.round((n * 0.1 + 0.3) * 1000) + 50;
                setTimeout(function () {
                    overlay.setAttribute('hidden', '');
                    overlay.classList.remove('torneos-popup-closing');
                    overlay.classList.remove('torneos-popup-expanded');
                    w.style.removeProperty('--torneos-popup-no-hoy-delay');
                }, totalMs);
            } else {
                overlay.setAttribute('hidden', '');
                overlay.classList.remove('torneos-popup-expanded');
            }
            if (noHoy && noHoy.checked) marcarCerradoHoy();
        }

        function isMobile() {
            return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        }

        var wrapper = overlay.querySelector('.torneos-popup-wrapper');
        var tab = document.getElementById('torneosPopupTab');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                close();
            });
            closeBtn.addEventListener('touchend', function (e) {
                e.preventDefault();
                e.stopPropagation();
                close();
            }, { passive: false });
        }
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        if (wrapper && tab && isMobile()) {
            overlay.classList.remove('torneos-popup-expanded');
            function toggleSheet(e) {
                if (e.target.closest && e.target.closest('.torneos-popup-close')) return;
                e.preventDefault();
                var expanded = overlay.classList.toggle('torneos-popup-expanded');
                if (tab) tab.setAttribute('aria-expanded', expanded);
            }
            tab.addEventListener('click', toggleSheet);
            tab.addEventListener('touchend', function (e) {
                if (e.target.closest && e.target.closest('.torneos-popup-close')) return;
                e.preventDefault();
                var expanded = overlay.classList.toggle('torneos-popup-expanded');
                if (tab) tab.setAttribute('aria-expanded', expanded);
            }, { passive: false });
            tab.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var expanded = overlay.classList.toggle('torneos-popup-expanded');
                    if (tab) tab.setAttribute('aria-expanded', expanded);
                }
            });
        }
    }

    function setupScrollHide() {
        var overlay = document.getElementById('torneosPopup');
        var paquetes = document.getElementById('paquetes');
        if (!overlay || !paquetes) return;

        function onScroll() {
            if (overlay.hasAttribute('hidden')) return;
            var rect = paquetes.getBoundingClientRect();
            var threshold = window.innerHeight * 0.6;
            if (rect.top < threshold) {
                overlay.classList.add('torneos-popup-scroll-hidden');
            } else {
                overlay.classList.remove('torneos-popup-scroll-hidden');
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
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
                setupScrollHide();
            })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
