/**
 * Barra lateral "Próximos torneos" (solo torneos publicados, máx. 3).
 * Los popups centrados van en js/cms-popups.js (sección Popups del panel).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'torneosPopupCerrado';
    var DEFAULT_PLATFORM_URL = 'https://plataforma-torneos-lerma-salda-a.vercel.app/api/torneos.json';
    var MAX_TORNEOS = 3;

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

    function safeImgSrc(src) {
        var s = (src || '').trim();
        if (!s || /^\s*javascript\s*:/i.test(s) || /^\s*data\s*:/i.test(s)) return '';
        return s;
    }

    function isMobileViewport() {
        return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    }

    function t(key, fallback) {
        if (window.i18n && window.i18n.t) {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback;
    }

    function masInfoLabel(compact) {
        return compact
            ? t('popup_mas_info_short', 'Más info')
            : t('popup_mas_info', 'Más información');
    }

    function getHeroPopupBoundary() {
        var selectors = ['.hero-title', '.hero-subtitle', '.hero-buttons', '.hero-content', '.hero-centro'];
        var minLeft = Infinity;
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (!el) continue;
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) minLeft = Math.min(minLeft, r.left);
        }
        return minLeft === Infinity ? null : minLeft;
    }

    function setTorneosMobileSheetOpen(open) {
        document.body.classList.toggle('torneos-sheet-open', !!open);
    }

    function updateTorneosPopupBounds(overlay) {
        if (!overlay || overlay.hasAttribute('hidden') || isMobileViewport()) {
            if (overlay) {
                overlay.style.removeProperty('--torneos-popup-max-width');
                overlay.style.removeProperty('--torneos-popup-card-height');
                overlay.style.removeProperty('--torneos-popup-thumb-width');
                overlay.style.removeProperty('--torneos-popup-card-gap');
                overlay.classList.remove('torneos-popup--compact');
            }
            return;
        }
        var heroBoundary = getHeroPopupBoundary();
        if (heroBoundary == null) return;
        var gap = 22;
        var letterBuffer = 14;
        var overlayStyle = window.getComputedStyle(overlay);
        var padLeft = parseFloat(overlayStyle.paddingLeft) || 24;
        var padTop = parseFloat(overlayStyle.paddingTop) || 24;
        var padBottom = parseFloat(overlayStyle.paddingBottom) || 24;
        var availableW = Math.floor(heroBoundary - gap - padLeft - letterBuffer);
        if (availableW < 220) {
            overlay.style.removeProperty('--torneos-popup-max-width');
            overlay.classList.remove('torneos-popup--compact');
            return;
        }
        var cards = overlay.querySelectorAll('.torneos-popup-cards .torneos-popup');
        var cardCount = cards.length || 3;
        var usableH = window.innerHeight - padTop - padBottom;
        var headerReserve = 52;
        var noHoyReserve = 36;
        var cardGap = 10;
        var cardsArea = usableH - headerReserve - noHoyReserve - (cardCount - 1) * cardGap;
        var cardH = Math.min(104, Math.max(92, Math.floor(cardsArea / cardCount)));
        var thumbW = cardH;
        var compact = availableW < 290;
        overlay.classList.toggle('torneos-popup--compact', compact);
        overlay.style.setProperty('--torneos-popup-max-width', availableW + 'px');
        overlay.style.setProperty('--torneos-popup-card-height', cardH + 'px');
        overlay.style.setProperty('--torneos-popup-thumb-width', thumbW + 'px');
        overlay.style.setProperty('--torneos-popup-card-gap', cardGap + 'px');
        var btnLabel = masInfoLabel(compact && availableW < 275);
        var btns = overlay.querySelectorAll('.torneos-popup-item-btn');
        for (var b = 0; b < btns.length; b++) btns[b].textContent = btnLabel;
    }

    var desktopLayoutBound = false;
    function setupDesktopLayout(overlay) {
        function refresh() { updateTorneosPopupBounds(overlay); }
        refresh();
        requestAnimationFrame(refresh);
        setTimeout(refresh, 120);
        setTimeout(refresh, 400);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        if (!desktopLayoutBound) {
            desktopLayoutBound = true;
            window.addEventListener('resize', refresh, { passive: true });
            window.addEventListener('orientationchange', refresh, { passive: true });
        }
    }

    function showPopup(config) {
        var overlay = document.getElementById('torneosPopup');
        var titulo = document.getElementById('torneosPopupTitulo');
        var cardsContainer = document.getElementById('torneosPopupCards');
        var closeBtn = document.getElementById('torneosPopupClose');
        var noHoy = document.getElementById('torneosPopupNoHoy');
        if (!overlay || !titulo) return;

        titulo.textContent = t('popup_torneos_titulo', 'Próximos torneos');

        var torneos = (config.torneos || []).slice(0, MAX_TORNEOS);
        if (!torneos.length) return;

        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            cardsContainer.classList.remove('is-slideshow');
            torneos.forEach(function (tneo) {
                var card = document.createElement('div');
                card.className = 'torneos-popup';
                var content = document.createElement('div');
                content.className = 'torneos-popup-content';
                var info = (tneo.fechas ? '<span class="torneos-popup-item-fecha">' + esc(tneo.fechas) + '</span>' : '') +
                    '<strong class="torneos-popup-item-titulo">' + esc(tneo.titulo || 'Torneo') + '</strong>';
                var btn = document.createElement('a');
                btn.href = 'torneo.html';
                btn.className = 'torneos-popup-item-btn';
                btn.textContent = masInfoLabel(false);
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    try { sessionStorage.setItem('torneoSeleccionado', JSON.stringify(tneo)); } catch (err) {}
                    window.location.href = 'torneo.html';
                });
                content.innerHTML = info;
                content.appendChild(btn);
                card.appendChild(content);
                var imgUrl = safeImgSrc(tneo.foto || tneo.imagen);
                if (imgUrl) {
                    var imgWrap = document.createElement('div');
                    imgWrap.className = 'torneos-popup-imagen-wrap';
                    var img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = tneo.titulo || 'Torneo';
                    img.className = 'torneos-popup-imagen';
                    imgWrap.appendChild(img);
                    card.appendChild(imgWrap);
                }
                cardsContainer.appendChild(card);
            });
        }

        overlay.removeAttribute('hidden');
        setupDesktopLayout(overlay);

        function close() {
            var w = overlay.querySelector('.torneos-popup-wrapper');
            var mobile = isMobileViewport();
            var cerrarTodo = mobile ? (noHoy && noHoy.checked) : true;
            var tab = document.getElementById('torneosPopupTab');
            if (mobile && !cerrarTodo) {
                overlay.classList.remove('torneos-popup-expanded');
                setTorneosMobileSheetOpen(false);
                if (tab) tab.setAttribute('aria-expanded', 'false');
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
                    setTorneosMobileSheetOpen(false);
                    w.style.removeProperty('--torneos-popup-no-hoy-delay');
                }, totalMs);
            } else {
                overlay.setAttribute('hidden', '');
                setTorneosMobileSheetOpen(false);
            }
            if (noHoy && noHoy.checked) marcarCerradoHoy();
        }

        var wrapper = overlay.querySelector('.torneos-popup-wrapper');
        var tab = document.getElementById('torneosPopupTab');
        if (closeBtn) {
            closeBtn.onclick = function (e) { e.stopPropagation(); close(); };
        }
        overlay.onclick = function (e) { if (e.target === overlay) close(); };

        if (wrapper && tab && isMobileViewport()) {
            overlay.classList.remove('torneos-popup-expanded');
            setTorneosMobileSheetOpen(false);
            tab.onclick = function (e) {
                if (e.target.closest && e.target.closest('.torneos-popup-close')) return;
                e.preventDefault();
                var expanded = overlay.classList.toggle('torneos-popup-expanded');
                setTorneosMobileSheetOpen(expanded);
                tab.setAttribute('aria-expanded', expanded);
            };
        }
    }

    function setupScrollHide() {
        var overlay = document.getElementById('torneosPopup');
        var paquetes = document.getElementById('paquetes');
        if (!overlay || !paquetes) return;
        function onScroll() {
            if (overlay.hasAttribute('hidden')) return;
            var rect = paquetes.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.6) overlay.classList.add('torneos-popup-scroll-hidden');
            else overlay.classList.remove('torneos-popup-scroll-hidden');
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    function init() {
        if (!isPortada() || cerradoHoy() || window.CMS_FORCE_EDIT) return;
        if (!document.getElementById('torneosPopup')) return;
        var url = DATA_URL + (DATA_URL.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
        fetch(url)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data || !data.torneos || !data.torneos.length) return;
                // Después del popup central (~1.8s) para no solaparse al cargar.
                setTimeout(function () {
                    showPopup(data);
                    setupScrollHide();
                }, 2600);
            })
            .catch(function () {});
    }

    window.TorneosPopup = { getDataUrl: getDataUrl };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
