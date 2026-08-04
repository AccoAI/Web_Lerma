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
        var selectors = [
            '.hero-title',
            '.hero-subtitle',
            '.hero-buttons',
            '.hero-content',
            '.hero-centro'
        ];
        var minLeft = Infinity;
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (!el) continue;
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                minLeft = Math.min(minLeft, r.left);
            }
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
            overlay.style.removeProperty('--torneos-popup-card-height');
            overlay.style.removeProperty('--torneos-popup-thumb-width');
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
        var cardH = Math.floor(cardsArea / cardCount);
        cardH = Math.min(104, Math.max(92, cardH));

        var thumbW = cardH;
        var textMin = 148;
        var popupW = availableW;

        if (popupW < thumbW + textMin + 24) {
            cardH = Math.max(84, popupW - textMin - 24);
            thumbW = cardH;
        }

        var compact = popupW < 290;
        overlay.classList.toggle('torneos-popup--compact', compact);

        overlay.style.setProperty('--torneos-popup-max-width', popupW + 'px');
        overlay.style.setProperty('--torneos-popup-card-height', cardH + 'px');
        overlay.style.setProperty('--torneos-popup-thumb-width', thumbW + 'px');
        overlay.style.setProperty('--torneos-popup-card-gap', cardGap + 'px');

        var btnLabel = masInfoLabel(compact && popupW < 275);
        var btns = overlay.querySelectorAll('.torneos-popup-item-btn');
        for (var b = 0; b < btns.length; b++) {
            btns[b].textContent = btnLabel;
        }
    }

    var desktopLayoutBound = false;

    function setupDesktopLayout(overlay) {
        function refresh() {
            updateTorneosPopupBounds(overlay);
        }

        refresh();
        requestAnimationFrame(refresh);
        setTimeout(refresh, 120);
        setTimeout(refresh, 400);

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(refresh);
        }

        if (!desktopLayoutBound) {
            desktopLayoutBound = true;
            window.addEventListener('resize', refresh, { passive: true });
            window.addEventListener('orientationchange', refresh, { passive: true });

            var heroTitle = document.querySelector('.hero-title');
            if (heroTitle && typeof ResizeObserver !== 'undefined') {
                var ro = new ResizeObserver(refresh);
                ro.observe(heroTitle);
                var heroCentro = document.querySelector('.hero-centro');
                if (heroCentro) ro.observe(heroCentro);
            }
        }
    }

    function buildSlides(config) {
        if (config.popups && config.popups.length) {
            return config.popups.map(function (p) {
                return {
                    titulo: p.titulo || '',
                    fechas: p.subtitulo || '',
                    texto: p.texto || '',
                    foto: p.imagen || '',
                    enlace: p.linkUrl || '',
                    linkTexto: p.linkTexto || '',
                    esPopup: true
                };
            });
        }
        // Fallback: torneos publicados si aún no hay tarjetas popup
        return (config.torneos || []).slice(0, 5).map(function (t) {
            return {
                titulo: t.titulo || 'Torneo',
                fechas: t.fechas || '',
                texto: '',
                foto: t.foto || t.imagen || '',
                enlace: 'torneo.html',
                linkTexto: '',
                torneo: t,
                esPopup: false
            };
        });
    }

    function ensureSlideshowStyles() {
        if (document.getElementById('popup-slideshow-styles')) return;
        var s = document.createElement('style');
        s.id = 'popup-slideshow-styles';
        s.textContent =
            '.torneos-popup-cards{position:relative;}' +
            '.torneos-popup-cards.is-slideshow .torneos-popup{display:none;width:100%;}' +
            '.torneos-popup-cards.is-slideshow .torneos-popup.is-active{display:flex;animation:popupSlideIn .45s ease;}' +
            '@keyframes popupSlideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}' +
            '.torneos-popup-dots{display:flex;gap:6px;justify-content:center;margin-top:8px;}' +
            '.torneos-popup-dot{width:8px;height:8px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.35);cursor:pointer;}' +
            '.torneos-popup-dot.is-active{background:#fff;}' +
            '.torneos-popup-item-texto{display:block;font-size:.8rem;opacity:.9;margin:.2rem 0 .35rem;line-height:1.3;}';
        document.head.appendChild(s);
    }

    function showPopup(config) {
        var overlay = document.getElementById('torneosPopup');
        var titulo = document.getElementById('torneosPopupTitulo');
        var cardsContainer = document.getElementById('torneosPopupCards');
        var closeBtn = document.getElementById('torneosPopupClose');
        var noHoy = document.getElementById('torneosPopupNoHoy');

        if (!overlay || !titulo) return;

        titulo.textContent = config.titulo || 'Avisos';
        ensureSlideshowStyles();

        var slides = buildSlides(config);
        if (!slides.length) return;

        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            cardsContainer.classList.toggle('is-slideshow', slides.length > 1);
            slides.forEach(function (t, idx) {
                var card = document.createElement('div');
                card.className = 'torneos-popup' + (idx === 0 ? ' is-active' : '');
                card.setAttribute('data-slide', String(idx));
                var content = document.createElement('div');
                content.className = 'torneos-popup-content';
                var info = (t.fechas ? '<span class="torneos-popup-item-fecha">' + esc(t.fechas) + '</span>' : '') +
                    '<strong class="torneos-popup-item-titulo">' + esc(t.titulo || 'Aviso') + '</strong>' +
                    (t.texto ? '<span class="torneos-popup-item-texto">' + esc(t.texto) + '</span>' : '');
                content.innerHTML = info;
                if (t.enlace || t.linkTexto || t.torneo) {
                    var btn = document.createElement('a');
                    btn.href = safeHref(t.enlace || 'calendario-torneos.html');
                    btn.className = 'torneos-popup-item-btn';
                    btn.textContent = t.linkTexto || masInfoLabel(false);
                    btn.addEventListener('click', function (e) {
                        if (t.torneo) {
                            e.preventDefault();
                            try {
                                sessionStorage.setItem('torneoSeleccionado', JSON.stringify(t.torneo));
                            } catch (err) {}
                            window.location.href = 'torneo.html';
                        }
                    });
                    content.appendChild(btn);
                }
                card.appendChild(content);
                var imgUrl = safeImgSrc(t.foto);
                if (imgUrl) {
                    var imgWrap = document.createElement('div');
                    imgWrap.className = 'torneos-popup-imagen-wrap';
                    var img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = t.titulo || 'Aviso';
                    img.className = 'torneos-popup-imagen';
                    imgWrap.appendChild(img);
                    card.appendChild(imgWrap);
                }
                cardsContainer.appendChild(card);
            });

            if (slides.length > 1) {
                var dots = document.createElement('div');
                dots.className = 'torneos-popup-dots';
                var current = 0;
                function go(n) {
                    current = (n + slides.length) % slides.length;
                    cardsContainer.querySelectorAll('.torneos-popup').forEach(function (el, i) {
                        el.classList.toggle('is-active', i === current);
                    });
                    dots.querySelectorAll('.torneos-popup-dot').forEach(function (el, i) {
                        el.classList.toggle('is-active', i === current);
                    });
                }
                slides.forEach(function (_, i) {
                    var d = document.createElement('button');
                    d.type = 'button';
                    d.className = 'torneos-popup-dot' + (i === 0 ? ' is-active' : '');
                    d.setAttribute('aria-label', 'Diapositiva ' + (i + 1));
                    d.addEventListener('click', function () { go(i); });
                    dots.appendChild(d);
                });
                cardsContainer.appendChild(dots);
                setInterval(function () {
                    if (overlay.hasAttribute('hidden')) return;
                    go(current + 1);
                }, 5000);
            }
        }

        overlay.removeAttribute('hidden');
        setupDesktopLayout(overlay);

        function close() {
            var w = overlay.querySelector('.torneos-popup-wrapper');
            var mobile = isMobile && isMobile();
            var cerrarTodo = mobile ? (noHoy && noHoy.checked) : true;
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
                overlay.classList.remove('torneos-popup-expanded');
                setTorneosMobileSheetOpen(false);
            }
            if (noHoy && noHoy.checked) marcarCerradoHoy();
        }

        function isMobile() {
            return isMobileViewport();
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
            setTorneosMobileSheetOpen(false);
            function toggleSheet(e) {
                if (e.target.closest && e.target.closest('.torneos-popup-close')) return;
                e.preventDefault();
                var expanded = overlay.classList.toggle('torneos-popup-expanded');
                setTorneosMobileSheetOpen(expanded);
                if (tab) tab.setAttribute('aria-expanded', expanded);
            }
            tab.addEventListener('click', toggleSheet);
            tab.addEventListener('touchend', function (e) {
                if (e.target.closest && e.target.closest('.torneos-popup-close')) return;
                e.preventDefault();
                var expanded = overlay.classList.toggle('torneos-popup-expanded');
                setTorneosMobileSheetOpen(expanded);
                if (tab) tab.setAttribute('aria-expanded', expanded);
            }, { passive: false });
            tab.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var expanded = overlay.classList.toggle('torneos-popup-expanded');
                    setTorneosMobileSheetOpen(expanded);
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

        var url = DATA_URL + (DATA_URL.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
        fetch(url)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data || data.popupActivo === false) return;
                var slides = buildSlides(data);
                if (!slides.length) return;
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
