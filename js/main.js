// Header: más opaco al hacer scroll (legibilidad sobre fondos claros)
(function () {
    var header = document.querySelector('.header');
    if (!header) return;
    function onScroll() {
        header.classList.toggle('header-scrolled', window.scrollY > 60);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();

// Mover nav a body en móvil para que el overlay cubra toda la pantalla (evita contención por backdrop-filter del header)
(function () {
    var nav = document.querySelector('.nav');
    var headerContainer = document.querySelector('.header-container');
    if (!nav || !headerContainer) return;
    var mq = window.matchMedia('(max-width: 1280px)');
    function moveNav() {
        if (mq.matches) {
            if (nav.parentNode !== document.body) {
                document.body.appendChild(nav);
            }
        } else {
            var headerActions = headerContainer.querySelector('.header-actions');
            if (nav.parentNode !== headerContainer && headerActions) {
                headerContainer.insertBefore(nav, headerActions);
            }
        }
    }
    moveNav();
    mq.addEventListener('change', moveNav);
})();

// Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuToggle && nav) {
    function toggleMenu(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        nav.classList.toggle('active');
        menuToggle.classList.toggle('active');
    }
    menuToggle.addEventListener('click', toggleMenu);
    menuToggle.addEventListener('touchend', function(e) {
        e.preventDefault();
        toggleMenu(e);
    }, { passive: false });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (nav && nav.classList.contains('active') && menuToggle) {
        if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    }
});

// Inyectar Hazte Socio y Area Socio en el menú móvil (cuando header-actions está oculto)
(function () {
    function injectMobileActions() {
        var navList = document.querySelector('.nav-list');
        if (!navList) return;
        if (navList.querySelector('.nav-item-mobile-actions')) return;
        var headerActions = document.querySelector('.header-actions');
        if (headerActions && navList && window.matchMedia('(max-width: 1280px)').matches) {
            var wrap = document.createElement('li');
            wrap.className = 'nav-item nav-item-mobile-actions';
            wrap.setAttribute('data-injected', '1');
            var actions = headerActions.querySelectorAll('a');
            var div = document.createElement('div');
            div.className = 'nav-mobile-actions';
            actions.forEach(function (a) {
                var link = document.createElement('a');
                link.href = a.href;
                link.className = a.className + ' nav-link-mobile';
                link.textContent = a.textContent;
                div.appendChild(link);
            });
            wrap.appendChild(div);
            navList.appendChild(wrap);
        }
    }
    injectMobileActions();
    window.addEventListener('resize', function () {
        var injected = document.querySelector('.nav-item-mobile-actions');
        if (injected && window.matchMedia('(min-width: 1281px)').matches) {
            injected.remove();
        } else if (!injected && window.matchMedia('(max-width: 1280px)').matches) {
            injectMobileActions();
        }
    });
})();

// Close menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 1280) {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '#login') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20; // Extra offset for better visibility
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Cookie Consent
const cookieConsent = document.getElementById('cookieConsent');
const cookieClose = document.getElementById('cookieClose');
const acceptCookies = document.getElementById('acceptCookies');
const rejectCookies = document.getElementById('rejectCookies');
const configureCookies = document.getElementById('configureCookies');

// Check if user has already made a choice
const cookieChoice = localStorage.getItem('cookieConsent');

if (!cookieChoice && cookieConsent) {
    // Show cookie consent after a short delay
    setTimeout(() => {
        cookieConsent.classList.add('show');
    }, 1000);
}

// Handle cookie consent actions
if (cookieClose) {
    cookieClose.addEventListener('click', () => {
        cookieConsent.classList.remove('show');
    });
}

if (acceptCookies) {
    acceptCookies.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'accepted');
        cookieConsent.classList.remove('show');
        // Here you would initialize analytics, etc.
    });
}

if (rejectCookies) {
    rejectCookies.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'rejected');
        cookieConsent.classList.remove('show');
    });
}

if (configureCookies) {
    configureCookies.addEventListener('click', () => {
        // Here you would show cookie configuration options
        alert('Configuración de cookies - Esta funcionalidad se implementará según tus necesidades');
    });
}

// Newsletter Form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('newsletterEmail').value;
        const privacy = document.getElementById('newsletterPrivacy').checked;

        if (privacy) {
            // Here you would send the email to your backend
            alert('¡Gracias por suscribirte! Te mantendremos informado de nuestras novedades.');
            newsletterForm.reset();
        } else {
            alert('Por favor, acepta la política de privacidad para continuar.');
        }
    });
}

// Header scroll effect
let lastScroll = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
        header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    }

    lastScroll = currentScroll;
});

// Lazy loading for images (if you add more images later)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Add active class to current section in navigation
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-link[href^="#"]');

function highlightNavigation() {
    let current = '';
    const scrollY = window.pageYOffset;
    const headerHeight = header.offsetHeight;

    sections.forEach(section => {
        const sectionTop = section.offsetTop - headerHeight - 100;
        const sectionHeight = section.offsetHeight;
        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinksAll.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', highlightNavigation);

// Hero Image Slider
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;
    
    if (slides.length === 0) return;
    
    function showNextSlide() {
        // Remove active class from current slide
        slides[currentSlide].classList.remove('active');
        
        // Move to next slide
        currentSlide = (currentSlide + 1) % slides.length;
        
        // Add active class to new slide
        slides[currentSlide].classList.add('active');
    }
    
    // Rotate images every 3 seconds
    setInterval(showNextSlide, 3000);
}

// Cámara del Tiempo - Temperatura, viento e icono desde Open-Meteo (Quintanilla de la Mata o Lerma)
function weatherCodeToIcon(code) {
    if (code == null) return { emoji: '—', label: '—' };
    var c = parseInt(code, 10);
    if (c === 0) return { emoji: '☀️', label: 'Despejado' };
    if (c === 1) return { emoji: '🌤️', label: 'Poco nuboso' };
    if (c === 2) return { emoji: '⛅', label: 'Parcialmente nublado' };
    if (c === 3) return { emoji: '☁️', label: 'Nublado' };
    if (c === 45 || c === 48) return { emoji: '🌫️', label: 'Niebla' };
    if (c >= 51 && c <= 57) return { emoji: '🌧️', label: 'Llovizna' };
    if (c >= 61 && c <= 67) return { emoji: '🌧️', label: 'Lluvia' };
    if (c >= 71 && c <= 77) return { emoji: '🌨️', label: 'Nieve' };
    if (c >= 80 && c <= 82) return { emoji: '🌦️', label: 'Chubascos' };
    if (c >= 85 && c <= 86) return { emoji: '🌨️', label: 'Nieve' };
    if (c >= 95 && c <= 99) return { emoji: '⛈️', label: 'Tormenta' };
    return { emoji: '🌡️', label: '—' };
}

async function updateTiempoData() {
    const temperatura = document.getElementById('temperatura');
    const viento = document.getElementById('viento');
    const icono = document.getElementById('tiempo-icono');
    const estado = document.getElementById('tiempo-estado');
    const origen = document.getElementById('tiempo-origen');
    if (!temperatura || !viento) return;

    var lat, lon, placeName;
    try {
        var geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Quintanilla+de+la+Mata&count=5&countryCode=ES');
        var geoData = await geo.json();
        if (geoData.results && geoData.results.length > 0) {
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
            placeName = 'Quintanilla de la Mata';
        } else {
            lat = 42.0263;
            lon = -3.755;
            placeName = 'Lerma';
        }
    } catch (e) {
        lat = 42.0263;
        lon = -3.755;
        placeName = 'Lerma';
    }

    try {
        var w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,wind_speed_10m,weather_code&timezone=Europe%2FMadrid');
        var wData = await w.json();
        if (wData.current) {
            temperatura.textContent = Math.round(wData.current.temperature_2m) + '°C';
            viento.textContent = Math.round(wData.current.wind_speed_10m) + ' km/h';
            var wIcon = weatherCodeToIcon(wData.current.weather_code);
            if (icono) icono.textContent = wIcon.emoji;
            if (estado) estado.textContent = wIcon.label;
        }
        if (origen) origen.textContent = 'Datos: ' + placeName;
    } catch (e) {
        if (origen) origen.textContent = 'Datos: no disponibles';
        if (icono) icono.textContent = '—';
        if (estado) estado.textContent = '—';
    }
}

// Cargar cámara en vivo
function loadCamaraLive() {
    const camaraFrame = document.getElementById('camara-frame');
    if (camaraFrame) {
        // Aquí debes poner la URL real de la cámara en vivo
        // camaraFrame.src = 'URL_DE_LA_CAMARA';
        // Por ahora dejamos vacío para que el usuario configure la URL
    }
}

// Configurador de Paquete Fin de Semana - usa precios-data.js
function getPrecios() {
    return window.PRECIOS_DATA || {};
}
function getHotelesOpts() {
    var p = getPrecios();
    var hl = (p.hoteles && p.hoteles.lerma) || [];
    var hb = (p.hoteles && p.hoteles.burgos) || [];
    var staticOpts = {
        lerma: hl.map(function (h) { return { v: h.id, l: h.nombre, p: h.precioPorNoche }; }),
        burgos: hb.map(function (h) { return { v: h.id, l: h.nombre, p: h.precioPorNoche }; }),
    };
    var dyn = window.HOTELBEDS_DYNAMIC_OPTS;
    if (!dyn || !dyn.lerma || !dyn.burgos) return staticOpts;
    function pick(staticArr, dynArr) {
        return dynArr && dynArr.length > 0 ? dynArr : (staticArr || []);
    }
    return {
        lerma: pick(staticOpts.lerma, dyn.lerma),
        burgos: pick(staticOpts.burgos, dyn.burgos),
    };
}
var HOTELES_OPTS = getHotelesOpts();
var HOTELES_LABELS = (function () {
    var o = {};
    var opts = getHotelesOpts();
    if (opts.lerma) opts.lerma.forEach(function (h) { if (!o.lerma) o.lerma = {}; o.lerma[h.v] = h.l; });
    if (opts.burgos) opts.burgos.forEach(function (h) { if (!o.burgos) o.burgos = {}; o.burgos[h.v] = h.l; });
    return o;
})();

var PRECIO_COMIDA = (function () { var p = getPrecios(); return (p.comida && p.comida.lerma) != null ? p.comida.lerma : 22; })();
var PRECIO_SERVICIO_BURGOS = (function () { var p = getPrecios(); return (p.comida && p.comida.burgos) != null ? p.comida.burgos : 25; })();
var DESCUENTO_PACK_PORC = (function () { var p = getPrecios(); return (p.paquetes && p.paquetes.finSemana && p.paquetes.finSemana.descuentoPorcentaje) != null ? p.paquetes.finSemana.descuentoPorcentaje : 15; })();

function roundEuros(n) {
    var x = Number(n);
    if (!isFinite(x)) return 0;
    return Math.round((x + Number.EPSILON) * 100) / 100;
}

function formatEurosResumen(n) {
    return roundEuros(n).toFixed(2).replace('.', ',');
}

window.roundEuros = roundEuros;
window.formatEurosResumen = formatEurosResumen;

function sanitizePublicAssetPath(path) {
    if (!path) return '';
    var p = String(path).trim().replace(/\\/g, '/');
    if (/^https?:\/\//i.test(p)) return p;
    if (p.indexOf('"') >= 0 || p.indexOf("'") >= 0) return '';
    return p;
}

function escapeAttrValue(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function htmlTarjetaFotoMedia(imgUrl, blockClass, eagerLoad) {
    var safeUrl = sanitizePublicAssetPath(imgUrl);
    if (!safeUrl) {
        return '<span class="' + blockClass + '__media" aria-hidden="true"></span>';
    }
    return (
        '<span class="' + blockClass + '__media" aria-hidden="true">' +
        '<img class="' + blockClass + '__photo" src="' + escapeAttrValue(safeUrl) + '" alt="" loading="' + (eagerLoad ? 'eager' : 'lazy') + '" decoding="async">' +
        '</span>'
    );
}

// Función global para obtener grupos de correspondencia
function getConfigPrereqState(form) {
    if (!form) return { fechas: false, personas: false };
    var fd = new FormData(form);
    var nFechas = (fd.getAll('fechas[]') || []).length;
    var personas = false;
    if (nFechas >= 1) {
        personas = true;
        for (var i = 1; i <= nFechas; i++) {
            var jd = parseInt(String(fd.get('jugadores_dia_' + i) || '').trim(), 10);
            if (isNaN(jd) || jd < 1) {
                personas = false;
                break;
            }
        }
    } else {
        var raw = String(fd.get('tamanio_grupo') || '').trim();
        var n = parseInt(raw, 10);
        personas = raw !== '' && !isNaN(n) && n >= 1;
    }
    return {
        fechas: nFechas >= 1,
        personas: personas
    };
}

function getConfigPrereqHintI18nKey(state) {
    if (!state.fechas && !state.personas) return 'config_hint_falta_ambos';
    if (!state.fechas) return 'config_hint_falta_fechas';
    if (!state.personas) return 'config_hint_falta_personas';
    return '';
}

function getConfigPrereqHintText(stateOrKey) {
    var key = typeof stateOrKey === 'string' ? stateOrKey : getConfigPrereqHintI18nKey(stateOrKey);
    if (!key) return '';
    if (window.i18n && window.i18n.t) return window.i18n.t(key);
    var fallbacks = {
        config_hint_falta_fechas: 'Selecciona las fechas en el calendario (paso 1) para ver las opciones de esta sección.',
        config_hint_falta_personas: 'Indica el tamaño del grupo (paso 1) para ver las opciones de esta sección.',
        config_hint_falta_ambos: 'Completa el paso 1 (fechas y número de jugadores) para ver las opciones de esta sección.',
        config_hint_falta_campo: 'Indica el campo para cada día seleccionado (paso 1) para configurar los servicios adicionales.'
    };
    return fallbacks[key] || '';
}

function setConfigSeccionHint(el, i18nKey) {
    if (!el || !i18nKey) return;
    el.setAttribute('data-i18n', i18nKey);
    el.textContent = getConfigPrereqHintText(i18nKey);
}

window.getConfigPrereqState = getConfigPrereqState;
window.getConfigPrereqHintI18nKey = getConfigPrereqHintI18nKey;
window.getConfigPrereqHintText = getConfigPrereqHintText;

function getCorrespondenciaGrupos(f) {
    if (!f) return [];
    var rows = f.querySelectorAll('.correspondencia-grupos-row');
    var out = [];
    for (var i = 0; i < rows.length; i++) {
        var inp = rows[i].querySelector('.corr-grupo-cantidad');
        var sel = rows[i].querySelector('.corr-grupo-club');
        var cant = parseInt((inp && inp.value) ? inp.value : '0', 10);
        var clubId = (sel && sel.value) ? String(sel.value).trim() : '';
        if (cant < 1) continue;
        var label = (clubId === 'sin' || !clubId) ? (window.i18n && window.i18n.t ? window.i18n.t('sin_correspondencia') : 'Sin correspondencia') : (typeof getClubById === 'function' && getClubById(clubId)) ? getClubById(clubId).nombre : clubId;
        out.push({ cantidad: cant, club_id: clubId || 'sin', label: label });
    }
    return out;
}

function initConfiguradorPaquete() {
    var form = document.getElementById('configuradorForm');
    var resumenDiv = document.getElementById('resumen-paquete');
    var calendarioContainer = document.getElementById('calendario-dias-finsemana');
    var diasCamposContainerFinSemana = document.getElementById('dias-campos-container-finsemana');
    var fechasDiaPlanHint = document.getElementById('fechas-dia-plan-hint');
    var configuradorHotelWrap = document.getElementById('configurador-hotel-wrap');
    var hotelPorNocheBlock = document.getElementById('hotel-por-noche-block');
    var hotelesPorNocheContainer = document.getElementById('hoteles-por-noche-container');
        var comidaSinFechas = document.getElementById('comida-sin-fechas');
        var comidaPostbookingNota = document.getElementById('comida-postbooking-nota');
    var comidaPorDiaContainer = document.getElementById('comida-por-dia-container');
    var ancillaryPorDiaContainer = document.getElementById('ancillary-por-dia-container');
    var ancillarySinPrereqs = document.getElementById('ancillary-sin-prereqs');
    var comidaDiaActivo = 1;
    var ancillaryDiaActivo = 1;
    var comidaDiasNav = [];
    var ancillaryDiasNav = [];
    function campoDiaTieneReservaFinSemana(idx) {
        if (!form || idx < 1) return false;
        if (typeof window.campoDiaTieneReservaEnDom === 'function') {
            return window.campoDiaTieneReservaEnDom(diasCamposContainerFinSemana, form, idx);
        }
        return false;
    }

    function leerHoraSalidaPrevFinSemana(numDias) {
        var prev = {};
        if (!form || !numDias) return prev;
        for (var i = 1; i <= numDias; i++) {
            var name = numDias === 1 ? 'hora_salida' : 'hora_salida_dia_' + i;
            var inp = form.querySelector('input[name="' + name + '"]');
            if (inp && inp.value) prev[i] = inp.value;
        }
        return prev;
    }

    function syncPlanHoraRowFinSemana(row, dayIndex, numDias) {
        if (!row) return;
        var horaWrap = row.querySelector('.fechas-dia-plan-row__hora');
        if (!horaWrap) return;
        var conCampo = campoDiaTieneReservaFinSemana(dayIndex);
        horaWrap.classList.toggle('is-disabled', !conCampo);
        var name = numDias === 1 ? 'hora_salida' : 'hora_salida_dia_' + dayIndex;
        horaWrap.querySelectorAll('input[name="' + name + '"], .hora-salida-picker__h, .hora-salida-picker__m').forEach(function (el) {
            if (conCampo) {
                el.removeAttribute('disabled');
                if (el.tagName === 'INPUT') el.setAttribute('required', 'required');
            } else {
                el.setAttribute('disabled', 'disabled');
                el.removeAttribute('required');
            }
        });
    }

    function syncPlanHoraRowsFinSemana(numDias) {
        if (!diasCamposContainerFinSemana || !numDias) return;
        var rows = diasCamposContainerFinSemana.querySelectorAll('.fechas-dia-plan-row');
        rows.forEach(function (row) {
            var idx = parseInt(row.getAttribute('data-dia') || '0', 10);
            if (idx >= 1) syncPlanHoraRowFinSemana(row, idx, numDias);
        });
    }

    function onCampoDiaPlanChangeFinSemana() {
        var fdCampo = new FormData(form);
        var nFechas = (fdCampo.getAll('fechas[]') || []).length;
        var fechasCampo = fdCampo.getAll('fechas[]') || [];
        syncPlanHoraRowsFinSemana(nFechas);
        actualizarBloqueAncillaryPorDia(nFechas, fechasCampo);
        actualizarResumen();
    }

    function leerJugadoresDiaPrev(numDias) {
        var prev = {};
        if (!form || !numDias) return prev;
        var fallback = 4;
        var barTg = document.getElementById('tamanio-grupo');
        if (barTg && barTg.value) {
            var fb = parseInt(barTg.value, 10);
            if (!isNaN(fb) && fb >= 1) fallback = fb;
        }
        for (var i = 1; i <= numDias; i++) {
            var inp = form.querySelector('input[name="jugadores_dia_' + i + '"]');
            if (inp && inp.value) {
                var v = parseInt(inp.value, 10);
                if (!isNaN(v) && v >= 1) prev[i] = v;
            }
        }
        for (var j = 1; j <= numDias; j++) {
            if (!prev[j]) prev[j] = fallback;
        }
        return prev;
    }

    function getTamanioGrupoDefault() {
        var barTg = document.getElementById('tamanio-grupo');
        if (!barTg) return 4;
        var n = parseInt(barTg.value, 10);
        return (!isNaN(n) && n >= 1) ? n : 4;
    }

    function syncTamanioGrupoDesdeDias(numDias) {
        if (!form) return getTamanioGrupoDefault();
        var max = 0;
        for (var i = 1; i <= (numDias || 0); i++) {
            var inp = form.querySelector('input[name="jugadores_dia_' + i + '"]');
            if (inp) max = Math.max(max, parseInt(inp.value, 10) || 0);
        }
        var barInput = document.getElementById('tamanio-grupo');
        if (numDias >= 1) {
            if (max < 1) max = getTamanioGrupoDefault();
            if (barInput) barInput.removeAttribute('name');
            var sync = document.getElementById('tamanio-grupo-sync');
            if (!sync) {
                sync = document.createElement('input');
                sync.type = 'hidden';
                sync.id = 'tamanio-grupo-sync';
                sync.name = 'tamanio_grupo';
                sync.required = true;
                form.appendChild(sync);
            }
            sync.value = String(max);
        } else {
            if (barInput) {
                barInput.setAttribute('name', 'tamanio_grupo');
                var barVal = parseInt(barInput.value, 10);
                max = (!isNaN(barVal) && barVal >= 1) ? barVal : 0;
            }
            var oldSync = document.getElementById('tamanio-grupo-sync');
            if (oldSync) oldSync.remove();
        }
        return max;
    }

    function isTamanioGrupoCompleto() {
        var tg = document.getElementById('tamanio-grupo');
        if (!tg) return false;
        var n = parseInt(tg.value, 10);
        return !isNaN(n) && n >= 1;
    }

    function syncFechasGolfBodyVisibility() {
        var body = document.getElementById('fechas-golf-body');
        if (!body) return;
        var ready = isTamanioGrupoCompleto();
        body.hidden = !ready;
        if (ready) recalcNumeroGrupos();
    }

    function syncFechasGrupoBarLayout(numDias) {
        syncTamanioGrupoDesdeDias(numDias);
        recalcNumeroGrupos();
    }

    function onJugadoresDiaChange() {
        var fd = new FormData(form);
        var nFechas = (fd.getAll('fechas[]') || []).length;
        syncTamanioGrupoDesdeDias(nFechas);
        recalcNumeroGrupos();
        syncComidaBloqueLimites();
        actualizarBloqueAncillaryPorDia(nFechas, fd.getAll('fechas[]') || []);
        actualizarResumen();
    }

    function syncFechasDiaPlanPanel(numDias) {
        if (diasCamposContainerFinSemana) {
            diasCamposContainerFinSemana.hidden = !(numDias >= 1);
        }
    }

    function generarPlanPorDiaFinSemana(numDias, fechas) {
        if (!diasCamposContainerFinSemana || typeof window.buildCampoDiaToggleItem !== 'function') return;
        fechas = fechas || [];
        if (!numDias || numDias < 1) {
            diasCamposContainerFinSemana.innerHTML = '';
            syncFechasDiaPlanPanel(0);
            syncFechasGrupoBarLayout(0);
            return;
        }
        syncFechasDiaPlanPanel(numDias);
        var prevCampo = typeof window.getCampoDiaValueFromDom === 'function'
            ? (function () {
                var p = {};
                for (var c = 1; c <= numDias; c++) {
                    var v = window.getCampoDiaValueFromDom(diasCamposContainerFinSemana, form, c);
                    if (v) p[c] = v;
                }
                return p;
            })()
            : {};
        var prevHora = leerHoraSalidaPrevFinSemana(numDias);
        var prevJug = leerJugadoresDiaPrev(numDias);
        diasCamposContainerFinSemana.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var row = document.createElement('div');
            row.className = 'fechas-dia-plan-row';
            row.setAttribute('data-dia', String(i));

            var campoWrap = document.createElement('div');
            campoWrap.className = 'fechas-dia-plan-row__campo';
            var campoItem = window.buildCampoDiaToggleItem(i, prevCampo[i] || '', {
                required: true,
                shortLabels: true,
                onChange: onCampoDiaPlanChangeFinSemana
            });
            var diaLbl = campoItem.querySelector('.campos-dias-item__dia-label');
            if (diaLbl && fechas[i - 1]) {
                var etiqueta = formatearEtiquetaDiaComida(fechas[i - 1]);
                if (etiqueta) diaLbl.textContent = etiqueta;
            }
            campoWrap.appendChild(campoItem);

            var horaWrap = document.createElement('div');
            horaWrap.className = 'fechas-dia-plan-row__hora';
            var horaName = numDias === 1 ? 'hora_salida' : 'hora_salida_dia_' + i;
            var horaId = numDias === 1 ? 'hora-salida' : 'hora-salida-dia-' + i + '-fs';
            var horaLbl = (window.i18n && window.i18n.t) ? window.i18n.t('label_hora') : 'Hora *';
            horaWrap.innerHTML =
                '<label for="' + horaId + '" title="' + ((window.i18n && window.i18n.t) ? window.i18n.t('label_hora_salida') : 'Hora de salida') + '">' + horaLbl + '</label>' +
                '<input type="time" id="' + horaId + '" name="' + horaName + '" title="Hora día ' + i + '" disabled value="' + (prevHora[i] || '') + '">';

            row.appendChild(campoWrap);
            row.appendChild(horaWrap);

            var jugWrap = document.createElement('div');
            jugWrap.className = 'fechas-dia-plan-row__jugadores fechas-dia-plan-row__grupo-item';
            var jugId = 'jugadores-dia-' + i + '-fs';
            var jugLbl = (window.i18n && window.i18n.t) ? window.i18n.t('label_jugadores_dia') : 'Jugadores';
            var jugVal = prevJug[i] || 1;
            jugWrap.innerHTML =
                '<label for="' + jugId + '">' + jugLbl + ' *</label>' +
                '<div class="ancillary-counter-wrap reserva-quantity-wrap">' +
                '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir jugadores">−</button>' +
                '<input type="number" id="' + jugId + '" name="jugadores_dia_' + i + '" min="1" max="54" value="' + jugVal + '" class="ancillary-counter fechas-jugadores-dia reserva-quantity-input" readonly required title="Jugadores día ' + i + '">' +
                '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar jugadores">+</button>' +
                '</div>';
            row.appendChild(jugWrap);

            diasCamposContainerFinSemana.appendChild(row);
        }
        if (typeof window.initHoraSalidaPickers === 'function') {
            window.initHoraSalidaPickers(diasCamposContainerFinSemana);
        }
        for (var j = 1; j <= numDias; j++) {
            var planRow = diasCamposContainerFinSemana.querySelector('.fechas-dia-plan-row[data-dia="' + j + '"]');
            syncPlanHoraRowFinSemana(planRow, j, numDias);
        }
        syncFechasGrupoBarLayout(numDias);
    }

    function getHotelLabelFromValue(val) {
        if (!val || val.indexOf('-') < 0) return val || 'Sin reserva';
        var idx = val.indexOf('-');
        var c = val.substring(0, idx);
        var h = val.substring(idx + 1);
        var opts = getHotelesOpts();
        if (opts[c]) {
            for (var j = 0; j < opts[c].length; j++) {
                if (opts[c][j].v === h) return (opts[c][j].l || h) + ' (' + (c === 'lerma' ? 'Lerma' : 'Burgos') + ')';
            }
        }
        var lbl = (HOTELES_LABELS[c] || {})[h];
        return lbl ? lbl + ' (' + (c === 'lerma' ? 'Lerma' : 'Burgos') + ')' : val;
    }

    function refillHotelSelect(i, ciudad) {
        var sel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
        if (!sel) return;
        var kept = sel.value;
        var opts = [{ v: '', l: 'Sin reserva' }];
        if (ciudad === 'lerma' || ciudad === 'burgos') {
            var arr = getHotelesOpts()[ciudad] || [];
            for (var j = 0; j < arr.length; j++) {
                opts.push({ v: ciudad + '-' + arr[j].v, l: arr[j].l, p: arr[j].p });
            }
        }
        sel.innerHTML = opts.map(function (o) {
            var txt = (o.p != null && o.p !== '') ? o.l + ' · ' + o.p + ' €' : o.l;
            return '<option value="' + o.v + '"' + (o.v === kept ? ' selected' : '') + '>' + txt + '</option>';
        }).join('');
        var found = opts.some(function (o) { return o.v === kept; });
        if (!found) sel.value = '';
        if (typeof actualizarResumen === 'function') actualizarResumen();
    }

    function generarHotelesPorNoche(n) {
        if (!hotelesPorNocheContainer) return;
        var prev = {};
        for (var i = 1; i <= n; i++) {
            var hSel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
            var lSel = form && form.querySelector('select[name="lugar-noche-' + i + '"]');
            var h = (hSel && hSel.value) ? hSel.value : '';
            var l = (lSel && lSel.value) ? lSel.value : '';
            if (!l && h && h.indexOf('-') >= 0) l = h.split('-')[0];
            prev[i] = { hotel: h || '', lugar: l || '' };
        }
        hotelesPorNocheContainer.innerHTML = '';
        for (var i = 1; i <= n; i++) {
            var savedL = prev[i].lugar;
            var savedH = prev[i].hotel;
            var lugarOpts = '<option value="">Sin reserva</option><option value="lerma"' + (savedL === 'lerma' ? ' selected' : '') + '>Lerma</option><option value="burgos"' + (savedL === 'burgos' ? ' selected' : '') + '>Burgos</option>';
            var hotelOpts = [{ v: '', l: 'Sin reserva' }];
            if (savedL === 'lerma' || savedL === 'burgos') {
                var arr = getHotelesOpts()[savedL] || [];
                for (var j = 0; j < arr.length; j++) {
                    hotelOpts.push({ v: savedL + '-' + arr[j].v, l: arr[j].l, p: arr[j].p });
                }
            }
            var hotelOptHtml = hotelOpts.map(function (o) {
                var txt = (o.p != null && o.p !== '') ? o.l + ' · ' + o.p + ' €' : o.l;
                return '<option value="' + o.v + '"' + (o.v === savedH ? ' selected' : '') + '>' + txt + '</option>';
            }).join('');
            var item = document.createElement('div');
            item.className = 'hoteles-por-noche-item hotel-noche-fila';
            item.innerHTML = [
                '<span class="hotel-noche-num">Noche ' + i + '</span>',
                '<div class="hotel-noche-par">',
                '<label for="lugar-noche-' + i + '">Lugar</label>',
                '<select id="lugar-noche-' + i + '" name="lugar-noche-' + i + '" aria-label="Lugar noche ' + i + '">' + lugarOpts + '</select>',
                '</div>',
                '<div class="hotel-noche-par">',
                '<label for="hotel-noche-' + i + '">Hotel</label>',
                '<select id="hotel-noche-' + i + '" name="hotel-noche-' + i + '" aria-label="Hotel noche ' + i + '">' + hotelOptHtml + '</select>',
                '</div>'
            ].join('');
            hotelesPorNocheContainer.appendChild(item);
        }
    }

    function actualizarBloqueHotel() {
        var noches = parseInt(((form && form.querySelector('input[name="noches"]')) || {}).value || '0', 10);
        if (noches >= 1) {
            // UI antigua “hotel por noche” retirada: la selección se hace en tarjetas Hotelbeds.
            if (hotelPorNocheBlock) hotelPorNocheBlock.style.display = 'none';
        } else {
            if (hotelPorNocheBlock) hotelPorNocheBlock.style.display = 'none';
        }
    }

    function formatearEtiquetaDiaComida(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso + 'T12:00:00');
            var s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
            if (s.length) return s.charAt(0).toUpperCase() + s.slice(1);
            return s;
        } catch (e) { return ''; }
    }

    function escapeHtmlComida(s) {
        if (s == null || s === '') return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function getNumJugadoresComida() {
        var tg = document.getElementById('tamanio-grupo-sync') || document.getElementById('tamanio-grupo');
        var usuarios = form ? form.querySelectorAll('.usuario-form') : [];
        return Math.max(1, parseInt((tg && tg.value) || '', 10) || usuarios.length || 1);
    }

    var HORA_COMIDA_DEFAULT = '13:00';
    var HORA_COMIDA_MIN = 12 * 60;
    var HORA_COMIDA_MAX = 14 * 60;

    function parseHoraComidaMinutos(hora) {
        if (!hora || typeof hora !== 'string') return null;
        var m = hora.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        var h = parseInt(m[1], 10);
        var min = parseInt(m[2], 10);
        if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
        return h * 60 + min;
    }

    function formatHoraComidaMinutos(totalMin) {
        var h = Math.floor(totalMin / 60);
        var min = totalMin % 60;
        return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
    }

    function normalizarHoraComida(hora) {
        var mins = parseHoraComidaMinutos(hora);
        if (mins == null) mins = parseHoraComidaMinutos(HORA_COMIDA_DEFAULT);
        mins = Math.round(mins / 15) * 15;
        mins = Math.max(HORA_COMIDA_MIN, Math.min(HORA_COMIDA_MAX, mins));
        return formatHoraComidaMinutos(mins);
    }

    function htmlOpcionesHoraComida(selected) {
        var sel = normalizarHoraComida(selected);
        var html = '';
        for (var m = HORA_COMIDA_MIN; m <= HORA_COMIDA_MAX; m += 15) {
            var v = formatHoraComidaMinutos(m);
            html += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + v + '</option>';
        }
        return html;
    }

    function normalizarReservaComida(r) {
        if (!r || typeof r !== 'object') return null;
        if (r.tipo === 'club') {
            var mid = String(r.menuId || '').trim();
            if (!mid) return null;
            return {
                tipo: 'club',
                menuId: mid,
                comensales: Math.max(1, parseInt(r.comensales, 10) || 1),
                hora: normalizarHoraComida(r.hora),
            };
        }
        if (r.tipo === 'externo') {
            var rid = String(r.restId || '').trim();
            if (!rid) return null;
            return { tipo: 'externo', restId: rid, zona: String(r.zona || '').trim() };
        }
        return null;
    }

    function parseReservasComidaJson(raw) {
        if (!raw) return [];
        try {
            var arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            var out = [];
            for (var pi = 0; pi < arr.length; pi++) {
                var n = normalizarReservaComida(arr[pi]);
                if (n) out.push(n);
            }
            return out;
        } catch (e0) {
            return [];
        }
    }

    function leerReservasComidaDesdeLegacy(dia) {
        var opc = form && form.querySelector('input[name="comida_opcion_dia_' + dia + '"]');
        var menu = form && form.querySelector('input[name="comida_menu_id_' + dia + '"]');
        var rest = form && form.querySelector('input[name="comida_rest_id_' + dia + '"]');
        var zona = form && form.querySelector('input[name="comida_dia_' + dia + '"]');
        var com = form && form.querySelector('input[name="comida_comensales_dia_' + dia + '"]');
        var opcion = (opc && opc.value) ? opc.value.trim() : '';
        if (!opcion) return [];
        var menuId = (menu && menu.value) ? menu.value.trim() : '';
        if (!menuId && opcion.indexOf('club:') === 0) menuId = opcion.replace(/^club:/, '');
        var comensales = (com && com.value) ? Math.max(0, parseInt(com.value, 10) || 0) : 0;
        if (opcion.indexOf('club:') === 0) {
            return [{
                tipo: 'club',
                menuId: menuId,
                comensales: comensales >= 1 ? comensales : getNumJugadoresComida(),
                hora: HORA_COMIDA_DEFAULT,
            }];
        }
        if (opcion === 'externo') {
            return [{
                tipo: 'externo',
                restId: (rest && rest.value) ? rest.value.trim() : '',
                zona: (zona && zona.value) ? zona.value.trim() : '',
            }];
        }
        return [];
    }

    function leerReservasComidaDia(dia) {
        var inp = form && form.querySelector('input[name="comida_reservas_dia_' + dia + '"]');
        if (inp && inp.value && inp.value.trim()) {
            var parsed = parseReservasComidaJson(inp.value.trim());
            if (parsed.length) return parsed;
        }
        return leerReservasComidaDesdeLegacy(dia);
    }

    function leerReservasComidaDesdeFormData(formData, dia) {
        var raw = (formData.get('comida_reservas_dia_' + dia) || '').trim();
        if (raw) {
            var parsed = parseReservasComidaJson(raw);
            if (parsed.length) return parsed;
        }
        var opc = (formData.get('comida_opcion_dia_' + dia) || '').trim();
        if (!opc) return [];
        if (opc.indexOf('club:') === 0) {
            var menuId = (formData.get('comida_menu_id_' + dia) || opc.replace(/^club:/, '')).trim();
            var pax = Math.max(1, parseInt(formData.get('comida_comensales_dia_' + dia) || '', 10) || 1);
            return [{ tipo: 'club', menuId: menuId, comensales: pax, hora: HORA_COMIDA_DEFAULT }];
        }
        if (opc === 'externo') {
            return [{
                tipo: 'externo',
                restId: (formData.get('comida_rest_id_' + dia) || '').trim(),
                zona: (formData.get('comida_dia_' + dia) || '').trim(),
            }];
        }
        return [];
    }

    function guardarReservasComidaDia(dia, reservas) {
        if (!form) return;
        var norm = [];
        for (var gi = 0; gi < (reservas || []).length; gi++) {
            var n = normalizarReservaComida(reservas[gi]);
            if (n) norm.push(n);
        }
        var hid = form.querySelector('input[name="comida_reservas_dia_' + dia + '"]');
        if (!hid) {
            hid = document.createElement('input');
            hid.type = 'hidden';
            hid.name = 'comida_reservas_dia_' + dia;
            form.appendChild(hid);
        }
        hid.value = norm.length ? JSON.stringify(norm) : '';
        var first = norm[0] || null;
        var opcInp = form.querySelector('input[name="comida_opcion_dia_' + dia + '"]');
        var menuInp = form.querySelector('input[name="comida_menu_id_' + dia + '"]');
        var restInp = form.querySelector('input[name="comida_rest_id_' + dia + '"]');
        var zonaInp = form.querySelector('input[name="comida_dia_' + dia + '"]');
        var comInp = form.querySelector('input[name="comida_comensales_dia_' + dia + '"]');
        if (opcInp) opcInp.value = first && first.tipo === 'club' ? ('club:' + first.menuId) : (first && first.tipo === 'externo' ? 'externo' : '');
        if (menuInp) menuInp.value = first && first.tipo === 'club' ? first.menuId : '';
        if (restInp) restInp.value = first && first.tipo === 'externo' ? first.restId : '';
        if (zonaInp) zonaInp.value = first && first.tipo === 'externo' ? first.zona : '';
        if (comInp) comInp.value = first && first.tipo === 'club' ? String(first.comensales) : '';
    }

    function etiquetaReservaComida(r) {
        if (!r) return '';
        if (r.tipo === 'club' && typeof window.getCasaClubMenuById === 'function') {
            var m = window.getCasaClubMenuById(r.menuId);
            return m ? ('Casa Club · ' + m.label) : 'Casa Club Lerma';
        }
        if (r.tipo === 'externo' && r.restId && typeof window.getRestaurantePaqueteById === 'function') {
            var rest = window.getRestaurantePaqueteById(r.restId);
            return rest ? rest.nombre : 'Restaurante recomendado';
        }
        return '';
    }

    function reservasTienenMenuClub(reservas) {
        for (var i = 0; i < reservas.length; i++) {
            if (reservas[i].tipo === 'club') return true;
        }
        return false;
    }

    function reservasTienenExterno(reservas) {
        for (var j = 0; j < reservas.length; j++) {
            if (reservas[j].tipo === 'externo') return true;
        }
        return false;
    }

    function findReservaClubMenu(reservas, menuId) {
        for (var k = 0; k < reservas.length; k++) {
            if (reservas[k].tipo === 'club' && reservas[k].menuId === menuId) {
                return { idx: k, r: reservas[k] };
            }
        }
        return null;
    }

    function syncComidaDiaCardBadge(dia, dayCard) {
        if (!dayCard) return;
        var reservas = leerReservasComidaDia(dia);
        var hasClub = reservasTienenMenuClub(reservas);
        dayCard.classList.toggle('comida-dia-card--selected', hasClub);
        var head = dayCard.querySelector('.comida-dia-card__head');
        if (!head) return;
        var badge = head.querySelector('.comida-dia-card__badge--pack');
        if (!badge) {
            head.insertAdjacentHTML('beforeend', '<span class="comida-dia-card__badge comida-dia-card__badge--pack" hidden>Incluido en el paquete</span>');
            badge = head.querySelector('.comida-dia-card__badge--pack');
        }
        if (badge) badge.hidden = !hasClub;
    }

    function getHoraComidaDiaDesdeReservas(reservas) {
        for (var i = 0; i < (reservas || []).length; i++) {
            if (reservas[i].tipo === 'club') {
                return normalizarHoraComida(reservas[i].hora);
            }
        }
        return HORA_COMIDA_DEFAULT;
    }

    function getHoraComidaDesdeDom(dia) {
        if (!form) return null;
        var sel = form.querySelector('.comida-dia-hora[data-dia="' + dia + '"]');
        return sel ? normalizarHoraComida(sel.value) : null;
    }

    function aplicarHoraComidaDia(dia, hora) {
        var reservas = leerReservasComidaDia(dia);
        var h = normalizarHoraComida(hora);
        var changed = false;
        for (var i = 0; i < reservas.length; i++) {
            if (reservas[i].tipo === 'club') {
                reservas[i].hora = h;
                changed = true;
            }
        }
        if (changed) guardarReservasComidaDia(dia, reservas);
        return h;
    }

    function syncComidaMenuCardState(card, added) {
        if (!card) return;
        card.classList.toggle('comida-menu-card--added', added);
    }

    function aplicarComensalesMenuClub(input) {
        if (!input || !form) return;
        var dia = input.getAttribute('data-dia');
        var menuId = input.getAttribute('data-menu');
        if (!dia || !menuId) return;
        var nJug = getNumJugadoresComida();
        var maxPax = Math.max(nJug, 20);
        var val = parseInt(input.value, 10) || 0;
        val = Math.min(Math.max(0, val), maxPax);
        var reservas = leerReservasComidaDia(dia);
        var found = findReservaClubMenu(reservas, menuId);
        if (val <= 0) {
            if (found) reservas.splice(found.idx, 1);
        } else {
            if (found) {
                found.r.comensales = val;
                found.r.hora = getHoraComidaDesdeDom(dia) || getHoraComidaDiaDesdeReservas(reservas);
            } else {
                var horaDia = getHoraComidaDesdeDom(dia) || getHoraComidaDiaDesdeReservas(reservas);
                reservas.push({
                    tipo: 'club',
                    menuId: menuId,
                    comensales: val,
                    hora: horaDia,
                });
            }
        }
        input.value = String(val > 0 ? val : 0);
        guardarReservasComidaDia(dia, reservas);
        syncComidaMenuCardState(input.closest('.comida-menu-card'), val > 0);
        syncComidaDiaCardBadge(dia, input.closest('.comida-dia-card'));
        syncComidaDiaTabsBadges();
    }

    function htmlConfigDiaTabBtn(diaIndex, titulo, isActive, hasSelection, group) {
        return (
            '<button type="button" class="config-dia-tab' +
            (isActive ? ' is-active' : '') +
            (hasSelection ? ' has-selection' : '') +
            '" role="tab" aria-selected="' + (isActive ? 'true' : 'false') +
            '" data-dia-tab="' + diaIndex +
            '" data-dia-tab-group="' + group + '">' +
            escapeHtmlComida(titulo) + '</button>'
        );
    }

    function syncConfigDiaTabsActive(group, activeDia) {
        var root = group === 'comida' ? comidaPorDiaContainer : ancillaryPorDiaContainer;
        if (!root) return;
        root.querySelectorAll('.config-dia-tab[data-dia-tab-group="' + group + '"]').forEach(function (btn) {
            var d = parseInt(btn.getAttribute('data-dia-tab'), 10);
            var on = d === activeDia;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    function comidaDiaTieneSeleccion(dia) {
        var reservas = leerReservasComidaDia(dia);
        return reservas.length > 0 && reservasTienenMenuClub(reservas);
    }

    function syncComidaDiaTabsBadges() {
        if (!comidaPorDiaContainer) return;
        comidaPorDiaContainer.querySelectorAll('.config-dia-tab[data-dia-tab-group="comida"]').forEach(function (btn) {
            var d = parseInt(btn.getAttribute('data-dia-tab'), 10);
            btn.classList.toggle('has-selection', comidaDiaTieneSeleccion(d));
        });
    }

    function ensureComidaLegacyHiddenFields(dia, reservas) {
        if (!form) return;
        var store = comidaPorDiaContainer && comidaPorDiaContainer.querySelector('.config-dia-fields-store');
        var parent = store || form;
        var firstLegacy = reservas[0] || {};
        var specs = [
            { name: 'comida_reservas_dia_' + dia, value: reservas.length ? JSON.stringify(reservas) : '' },
            { name: 'comida_opcion_dia_' + dia, value: firstLegacy.tipo === 'club' ? ('club:' + firstLegacy.menuId) : (firstLegacy.tipo === 'externo' ? 'externo' : '') },
            { name: 'comida_menu_id_' + dia, value: firstLegacy.tipo === 'club' ? firstLegacy.menuId : '' },
            { name: 'comida_rest_id_' + dia, value: firstLegacy.tipo === 'externo' ? firstLegacy.restId : '' },
            { name: 'comida_dia_' + dia, value: firstLegacy.tipo === 'externo' ? firstLegacy.zona : '' },
            { name: 'comida_comensales_dia_' + dia, value: firstLegacy.tipo === 'club' ? String(firstLegacy.comensales || '') : '' },
            { name: 'cena_dia_' + dia, value: '' },
            { name: 'cena_rest_id_' + dia, value: '' }
        ];
        for (var si = 0; si < specs.length; si++) {
            var spec = specs[si];
            var hid = parent.querySelector('input[name="' + spec.name + '"]');
            if (!hid) hid = form.querySelector('input[name="' + spec.name + '"]');
            if (!hid) {
                hid = document.createElement('input');
                hid.type = 'hidden';
                hid.name = spec.name;
                parent.appendChild(hid);
            } else if (store && hid.parentElement !== store && store !== form) {
                store.appendChild(hid);
            }
            hid.value = spec.value == null ? '' : String(spec.value);
        }
    }

    function renderComidaDiaPanel(diaIndex) {
        if (!comidaPorDiaContainer) return;
        var panel = comidaPorDiaContainer.querySelector('.comida-dia-panel');
        if (!panel) return;
        var navItem = null;
        for (var ni = 0; ni < comidaDiasNav.length; ni++) {
            if (comidaDiasNav[ni].index === diaIndex) { navItem = comidaDiasNav[ni]; break; }
        }
        if (!navItem) return;
        var reservas = leerReservasComidaDia(diaIndex);
        var nJug = getNumJugadoresComida();
        for (var ri = 0; ri < reservas.length; ri++) {
            if (reservas[ri].tipo === 'club') {
                var maxPaxRender = Math.max(nJug, 20);
                reservas[ri].comensales = Math.min(Math.max(1, parseInt(reservas[ri].comensales, 10) || 1), maxPaxRender);
            }
        }
        var horaDia = getHoraComidaDiaDesdeReservas(reservas);
        for (var rh = 0; rh < reservas.length; rh++) {
            if (reservas[rh].tipo === 'club') reservas[rh].hora = horaDia;
        }
        ensureComidaLegacyHiddenFields(diaIndex, reservas);
        var menus = typeof window.getCasaClubMenus === 'function' ? window.getCasaClubMenus() : [];
        var tieneSel = reservas.length > 0;
        var horaDiaId = 'comida-dia-hora-' + diaIndex;
        var html = '';
        html += '<article class="comida-dia-card' + (tieneSel ? ' comida-dia-card--selected' : '') + '" data-dia-card="' + diaIndex + '">';
        html += '<header class="comida-dia-card__head">';
        html += '<div class="comida-dia-card__head-main">';
        html += '<h4 class="comida-dia-card__fecha">' + escapeHtmlComida(navItem.titulo) + '</h4>';
        html += '<div class="comida-dia-card__hora-wrap">';
        html += '<label class="comida-dia-card__hora-label" for="' + horaDiaId + '">Hora</label>';
        html += '<select id="' + horaDiaId + '" class="comida-dia-hora comida-hora-comida" data-dia="' + diaIndex + '" aria-label="Hora de la comida">' + htmlOpcionesHoraComida(horaDia) + '</select>';
        html += '</div></div>';
        html += '<span class="comida-dia-card__badge comida-dia-card__badge--pack"' + (reservasTienenMenuClub(reservas) ? '' : ' hidden') + '>Incluido en el paquete</span>';
        html += '</header>';
        html += '<section class="comida-dia-card__section">';
        html += '<div class="comida-dia-card__section-head">';
        html += '<h5 class="comida-dia-card__section-title">Casa Club Lerma</h5>';
        html += '<span class="comida-dia-card__tag">Solo comidas</span>';
        html += '</div>';
        html += '<div class="comida-menu-grid" role="group" aria-label="Menús Casa Club">';
        for (var mi = 0; mi < menus.length; mi++) {
            var menu = menus[mi];
            var reservaMenu = findReservaClubMenu(reservas, menu.id);
            html += htmlComidaMenuCard(menu, diaIndex, reservaMenu ? reservaMenu.r : null, nJug);
        }
        html += '</div></section></article>';
        panel.innerHTML = html;
        syncComidaDiaTabsBadges();
        syncConfigDiaTabsActive('comida', diaIndex);
    }

    function setComidaDiaActivo(diaIndex) {
        var ok = false;
        for (var i = 0; i < comidaDiasNav.length; i++) {
            if (comidaDiasNav[i].index === diaIndex) { ok = true; break; }
        }
        if (!ok) return;
        comidaDiaActivo = diaIndex;
        renderComidaDiaPanel(diaIndex);
    }

    function leerAncillaryDiaFromForm(dia) {
        var ib = form && form.querySelector('input[name="ancillary_buggy_dia_' + dia + '"]');
        var ic = form && form.querySelector('input[name="ancillary_carrito_mano_dia_' + dia + '"]');
        var ie = form && form.querySelector('input[name="ancillary_carrito_electrico_dia_' + dia + '"]');
        return {
            buggy: ib ? Math.max(0, parseInt(ib.value || '0', 10)) : 0,
            mano: ic ? Math.max(0, parseInt(ic.value || '0', 10)) : 0,
            elec: ie ? Math.max(0, parseInt(ie.value || '0', 10)) : 0
        };
    }

    function ancillaryDiaTieneSeleccion(dia) {
        var p = leerAncillaryDiaFromForm(dia);
        return (p.buggy + p.mano + p.elec) > 0;
    }

    function syncAncillaryDiaTabsBadges() {
        if (!ancillaryPorDiaContainer) return;
        ancillaryPorDiaContainer.querySelectorAll('.config-dia-tab[data-dia-tab-group="ancillary"]').forEach(function (btn) {
            var d = parseInt(btn.getAttribute('data-dia-tab'), 10);
            btn.classList.toggle('has-selection', ancillaryDiaTieneSeleccion(d));
        });
    }

    function renderAncillaryDiaPanel(diaIndex, prevByDay) {
        if (!ancillaryPorDiaContainer) return;
        var panel = ancillaryPorDiaContainer.querySelector('.ancillary-dia-panel');
        var store = ancillaryPorDiaContainer.querySelector('.config-dia-fields-store');
        if (!panel || !store) return;
        var navItem = null;
        for (var ni = 0; ni < ancillaryDiasNav.length; ni++) {
            if (ancillaryDiasNav[ni].index === diaIndex) { navItem = ancillaryDiasNav[ni]; break; }
        }
        if (!navItem) return;
        var servicios = getAncillaryServiciosConfig();
        var p = (prevByDay && prevByDay[diaIndex]) ? prevByDay[diaIndex] : leerAncillaryDiaFromForm(diaIndex);
        var cardsHtml = '';
        for (var si = 0; si < servicios.length; si++) {
            var svc = servicios[si];
            var qty = p[svc.field] != null ? p[svc.field] : 0;
            cardsHtml += htmlAncillaryServiceCard(svc, diaIndex, qty);
        }
        panel.innerHTML =
            '<div class="ancillary-dia-header">' + escapeHtmlComida(navItem.titulo) + '</div>' +
            '<div class="ancillary-service-grid" role="group" aria-label="' + escapeHtmlComida(navItem.titulo) + '">' +
            cardsHtml +
            '</div>';
        store.innerHTML = '';
        for (var pi = 0; pi < ancillaryDiasNav.length; pi++) {
            var idx = ancillaryDiasNav[pi].index;
            if (idx === diaIndex) continue;
            var pv = (prevByDay && prevByDay[idx]) ? prevByDay[idx] : leerAncillaryDiaFromForm(idx);
            for (var sj = 0; sj < servicios.length; sj++) {
                var svcH = servicios[sj];
                var hid = document.createElement('input');
                hid.type = 'hidden';
                hid.name = svcH.inputPrefix + idx;
                hid.value = String(pv[svcH.field] != null ? pv[svcH.field] : 0);
                store.appendChild(hid);
            }
        }
        syncAncillaryDiaTabsBadges();
        syncConfigDiaTabsActive('ancillary', diaIndex);
        if (typeof fillAncillaryPrices === 'function') fillAncillaryPrices();
    }

    function leerAncillaryPrevByDay(playableDays) {
        var prev = {};
        for (var pi = 0; pi < playableDays.length; pi++) {
            var i = playableDays[pi];
            prev[i] = leerAncillaryDiaFromForm(i);
        }
        return prev;
    }

    function setAncillaryDiaActivo(diaIndex) {
        var ok = false;
        for (var i = 0; i < ancillaryDiasNav.length; i++) {
            if (ancillaryDiasNav[i].index === diaIndex) { ok = true; break; }
        }
        if (!ok) return;
        var prev = leerAncillaryPrevByDay(ancillaryDiasNav.map(function (n) { return n.index; }));
        ancillaryDiaActivo = diaIndex;
        renderAncillaryDiaPanel(diaIndex, prev);
    }

    function htmlComidaMenuCard(menu, dia, reserva, nJug) {
        var added = !!reserva;
        var maxPax = Math.max(nJug, 20);
        var paxVal = added ? Math.min(Math.max(1, parseInt(reserva.comensales, 10) || 1), maxPax) : 0;
        var precio = menu.precioPorPersona != null ? menu.precioPorPersona : '';
        var inputId = 'comida-menu-pax-dia-' + dia + '-' + menu.id;
        var selectedCls = added ? ' comida-menu-card--added' : '';
        var paxLbl = (window.i18n && window.i18n.t) ? window.i18n.t('label_num_comensales') : 'Número de comensales';
        return (
            '<article class="comida-menu-card comida-menu-card--config' + selectedCls + '" data-dia="' + dia + '" data-menu="' + escapeHtmlComida(menu.id) + '">' +
            htmlTarjetaFotoMedia(menu.imagen, 'comida-menu-card', true) +
            '<div class="comida-menu-card__content">' +
            '<span class="comida-menu-card__nombre">' + escapeHtmlComida(menu.label) + '</span>' +
            (precio !== '' ? '<span class="comida-menu-card__precio"><span class="comida-menu-card__precio-num">' + precio + ' €</span><span class="comida-menu-card__precio-unit">/ pers.</span></span>' : '') +
            '<div class="config-card-controls">' +
            '<span class="config-card-controls__label">' + escapeHtmlComida(paxLbl) + '</span>' +
            '<div class="ancillary-counter-wrap config-card-counter">' +
            '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Menos comensales">−</button>' +
            '<input type="number" id="' + inputId + '" min="0" max="' + maxPax + '" value="' + paxVal + '" class="ancillary-counter comida-menu-comensales" data-dia="' + dia + '" data-menu="' + escapeHtmlComida(menu.id) + '" readonly aria-label="' + escapeHtmlComida(paxLbl) + '">' +
            '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Más comensales">+</button>' +
            '</div></div></div></article>'
        );
    }

    function actualizarBloqueComida(count, fechas) {
        fechas = fechas || [];
        var prereqState = getConfigPrereqState(form);
        var prereqsOk = prereqState.fechas && prereqState.personas;
        if (comidaSinFechas) {
            if (!prereqsOk) {
                comidaSinFechas.style.display = 'block';
                setConfigSeccionHint(comidaSinFechas, getConfigPrereqHintI18nKey(prereqState));
            } else {
                comidaSinFechas.style.display = 'none';
            }
        }
        if (comidaPostbookingNota) comidaPostbookingNota.hidden = !prereqsOk || count < 1;
        if (!comidaPorDiaContainer) return;
        if (!prereqsOk || count < 1) {
            comidaPorDiaContainer.style.display = 'none';
            comidaPorDiaContainer.innerHTML = '';
            comidaDiasNav = [];
            return;
        }
        var prevReservas = {};
        for (var pi = 1; pi <= count; pi++) {
            prevReservas[pi] = leerReservasComidaDia(pi).filter(function (r) {
                return r.tipo !== 'externo';
            });
        }
        comidaDiasNav = [];
        for (var di = 1; di <= count; di++) {
            var isoNav = fechas[di - 1];
            comidaDiasNav.push({
                index: di,
                titulo: formatearEtiquetaDiaComida(isoNav) || ('Día ' + di)
            });
        }
        if (comidaDiaActivo > count || comidaDiaActivo < 1) comidaDiaActivo = 1;
        var tabsHtml = '<div class="config-dia-tabs-wrap"><div class="config-dia-tabs" role="tablist" aria-label="Días de comida" data-dia-tab-group="comida">';
        for (var ti = 0; ti < comidaDiasNav.length; ti++) {
            var nav = comidaDiasNav[ti];
            tabsHtml += htmlConfigDiaTabBtn(nav.index, nav.titulo, nav.index === comidaDiaActivo, comidaDiaTieneSeleccion(nav.index), 'comida');
        }
        tabsHtml += '</div><div class="comida-dia-panel config-dia-panel" role="tabpanel"></div>';
        tabsHtml += '<div class="config-dia-fields-store" hidden aria-hidden="true"></div></div>';
        comidaPorDiaContainer.style.display = 'block';
        comidaPorDiaContainer.innerHTML = tabsHtml;
        for (var hi = 1; hi <= count; hi++) {
            ensureComidaLegacyHiddenFields(hi, prevReservas[hi] || []);
        }
        renderComidaDiaPanel(comidaDiaActivo);
    }

    function syncComidaBloqueLimites() {
        if (!comidaPorDiaContainer || comidaPorDiaContainer.style.display === 'none') return;
        var nJug = getNumJugadoresComida();
        var maxPax = Math.max(nJug, 20);
        comidaPorDiaContainer.querySelectorAll('.comida-menu-comensales').forEach(function (input) {
            input.setAttribute('max', String(maxPax));
            var val = parseInt(input.value, 10) || 0;
            if (val > maxPax) {
                input.value = String(maxPax);
                aplicarComensalesMenuClub(input);
            }
        });
    }

    function agregarReservaExterna(dia, restId, zona) {
        if (!form || !restId) return;
        var reservas = leerReservasComidaDia(dia);
        reservas.push({ tipo: 'externo', restId: restId, zona: zona || '' });
        guardarReservasComidaDia(dia, reservas);
    }

    function getAncillaryServiciosConfig() {
        var defs = window.PRECIOS_DATA && window.PRECIOS_DATA.ancillaryServicios;
        if (defs && defs.length) return defs;
        return [
            { id: 'buggy', precioKey: 'buggy', i18n: 'anc_buggies', fallback: 'Buggies', imagen: 'FOTOS/servicios/buggy.png', field: 'buggy', inputPrefix: 'ancillary_buggy_dia_', inputIdPrefix: 'ancillary-buggy-dia-' },
            { id: 'carritoMano', precioKey: 'carritoMano', i18n: 'anc_carrito_mano', fallback: 'Carrito de mano', imagen: 'FOTOS/servicios/carrito-mano.png', field: 'mano', inputPrefix: 'ancillary_carrito_mano_dia_', inputIdPrefix: 'ancillary-carrito-mano-dia-' },
            { id: 'carritoElectrico', precioKey: 'carritoElectrico', i18n: 'anc_carrito_electrico', fallback: 'Carrito eléctrico', imagen: 'FOTOS/servicios/carrito-electrico.png', field: 'elec', inputPrefix: 'ancillary_carrito_electrico_dia_', inputIdPrefix: 'ancillary-carrito-elec-dia-' },
        ];
    }

    function htmlAncillaryServiceCard(svc, dia, qty) {
        var label = (window.i18n && window.i18n.t && svc.i18n) ? window.i18n.t(svc.i18n) : svc.fallback;
        var selected = qty > 0 ? ' ancillary-service-card--selected' : '';
        var inputId = svc.inputIdPrefix + dia;
        var inputName = svc.inputPrefix + dia;
        return (
            '<article class="ancillary-service-card ancillary-service-card--' + escapeHtmlComida(svc.id) + selected + '" data-ancillary-id="' + escapeHtmlComida(svc.id) + '">' +
            htmlTarjetaFotoMedia(svc.imagen, 'ancillary-service-card') +
            '<div class="ancillary-service-card__content">' +
            '<span class="ancillary-service-card__title">' + escapeHtmlComida(label) + '</span>' +
            '<span class="ancillary-precio" data-ancillary="' + escapeHtmlComida(svc.precioKey) + '"></span>' +
            '<div class="config-card-controls config-card-controls--solo-counter">' +
            '<div class="ancillary-counter-wrap config-card-counter">' +
            '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir">−</button>' +
            '<input type="number" id="' + escapeHtmlComida(inputId) + '" name="' + escapeHtmlComida(inputName) + '" min="0" max="20" value="' + qty + '" class="ancillary-counter" readonly>' +
            '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar">+</button>' +
            '</div></div></article>'
        );
    }

    function actualizarBloqueAncillaryPorDia(count, fechas) {
        fechas = fechas || [];
        if (!ancillaryPorDiaContainer) return;
        var prereqState = getConfigPrereqState(form);
        var prereqsOk = prereqState.fechas && prereqState.personas;
        if (!prereqsOk || count < 1) {
            ancillaryPorDiaContainer.innerHTML = '';
            ancillaryPorDiaContainer.style.display = 'none';
            ancillaryDiasNav = [];
            if (ancillarySinPrereqs) {
                ancillarySinPrereqs.style.display = 'block';
                setConfigSeccionHint(ancillarySinPrereqs, getConfigPrereqHintI18nKey(prereqState));
            }
            return;
        }
        var playable = [];
        for (var i = 1; i <= count; i++) {
            if (!campoDiaTieneReservaFinSemana(i)) continue;
            var iso = fechas[i - 1];
            playable.push(i);
        }
        if (!playable.length) {
            ancillaryPorDiaContainer.innerHTML = '';
            ancillaryPorDiaContainer.style.display = 'none';
            ancillaryDiasNav = [];
            if (ancillarySinPrereqs) {
                ancillarySinPrereqs.style.display = 'block';
                setConfigSeccionHint(ancillarySinPrereqs, 'config_hint_falta_campo');
            }
            return;
        }
        var prev = leerAncillaryPrevByDay(playable);
        ancillaryDiasNav = playable.map(function (idx) {
            return {
                index: idx,
                titulo: formatearEtiquetaDiaComida(fechas[idx - 1]) || ('Día ' + idx)
            };
        });
        var activoValido = false;
        for (var av = 0; av < ancillaryDiasNav.length; av++) {
            if (ancillaryDiasNav[av].index === ancillaryDiaActivo) { activoValido = true; break; }
        }
        if (!activoValido) ancillaryDiaActivo = ancillaryDiasNav[0].index;
        var tabsHtml = '<div class="config-dia-tabs-wrap"><div class="config-dia-tabs" role="tablist" aria-label="Días de servicios adicionales" data-dia-tab-group="ancillary">';
        for (var ti = 0; ti < ancillaryDiasNav.length; ti++) {
            var nav = ancillaryDiasNav[ti];
            tabsHtml += htmlConfigDiaTabBtn(nav.index, nav.titulo, nav.index === ancillaryDiaActivo, ancillaryDiaTieneSeleccion(nav.index), 'ancillary');
        }
        tabsHtml += '</div><div class="ancillary-dia-panel config-dia-panel" role="tabpanel"></div>';
        tabsHtml += '<div class="config-dia-fields-store" hidden aria-hidden="true"></div></div>';
        ancillaryPorDiaContainer.innerHTML = tabsHtml;
        ancillaryPorDiaContainer.style.display = 'block';
        if (ancillarySinPrereqs) ancillarySinPrereqs.style.display = 'none';
        renderAncillaryDiaPanel(ancillaryDiaActivo, prev);
    }

    var comidaPickerControl = null;
    var comidaPickerListenersBound = false;
    var activeComidaPickerSlot = null;
    var embedPollTimer = null;
    var lastEmbedAutoCommitAt = 0;
    var refreshPickerIframeTimer = null;

    function schedulePickerIframeRefreshFromForm() {
        var panel = document.getElementById('comida-restaurante-picker-panel');
        if (!panel || panel.hidden || !comidaPickerControl || !comidaPickerControl.refreshCurrentEmbed) return;
        clearTimeout(refreshPickerIframeTimer);
        refreshPickerIframeTimer = setTimeout(function () {
            refreshPickerIframeTimer = null;
            if (comidaPickerControl && comidaPickerControl.refreshCurrentEmbed) comidaPickerControl.refreshCurrentEmbed();
        }, 400);
    }

    function tryReadIframeInnerText(ifr) {
        if (!ifr) return null;
        try {
            var doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
            if (!doc || !doc.body) return null;
            return (doc.body.innerText || '') || null;
        } catch (e) {
            return null;
        }
    }

    function normalizeAcc(s) {
        if (s == null) return '';
        var t = String(s);
        if (typeof t.normalize === 'function') {
            t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        return t.toLowerCase();
    }

    /** Coincidir nombre de restaurante con texto de confirmación (CoverManager, etc.). */
    function findRestaurantInConfirmationText(text) {
        var data = window.RESTAURANTES_PAQUETE_DATA;
        if (!data || !text) return null;
        var flat = normalizeAcc(text);
        var i;
        for (i = 0; i < data.length; i++) {
            if (flat.indexOf(normalizeAcc(data[i].nombre)) >= 0) return data[i];
            if (flat.indexOf(normalizeAcc(data[i].id)) >= 0) return data[i];
        }
        var m = /Gracias por reservar en\s+([^\.\n\r]+)/i.exec(text);
        if (m) {
            var frag = normalizeAcc(m[1].trim());
            for (i = 0; i < data.length; i++) {
                var nom = normalizeAcc(data[i].nombre);
                if (frag.indexOf(nom) >= 0 || nom.indexOf(frag) >= 0) return data[i];
            }
        }
        return null;
    }

    function embedPayloadToString(data) {
        if (data == null) return '';
        if (typeof data === 'string') return data;
        try {
            return JSON.stringify(data);
        } catch (e) {
            return String(data);
        }
    }

    function looksLikeReservationConfirmation(text) {
        if (!text || typeof text !== 'string') return false;
        return (/Gracias por reservar/i.test(text) ||
            /reserva confirmada/i.test(text) ||
            /email de confirmaci/i.test(text) ||
            /recibir[aá] en breve un email/i.test(text));
    }

    function handleEmbedConfirmationText(rawText) {
        if (!activeComidaPickerSlot || !comidaPickerControl || !form) return;
        if (Date.now() - lastEmbedAutoCommitAt < 4500) return;
        var text = String(rawText || '').slice(0, 16000);
        if (!looksLikeReservationConfirmation(text)) return;
        var r = findRestaurantInConfirmationText(text);
        if (r && comidaPickerControl.selectRestaurantById) {
            comidaPickerControl.selectRestaurantById(r.id);
        }
        if (commitComidaPickerChoice()) {
            lastEmbedAutoCommitAt = Date.now();
        }
    }

    function scheduleEmbedConfirmationPoll(ifr) {
        if (!ifr || !activeComidaPickerSlot) return;
        if (embedPollTimer) {
            clearInterval(embedPollTimer);
            embedPollTimer = null;
        }
        var tries = 0;
        embedPollTimer = setInterval(function () {
            tries++;
            if (!activeComidaPickerSlot || tries > 90) {
                if (embedPollTimer) clearInterval(embedPollTimer);
                embedPollTimer = null;
                return;
            }
            var t = tryReadIframeInnerText(ifr);
            if (t && looksLikeReservationConfirmation(t)) {
                if (embedPollTimer) clearInterval(embedPollTimer);
                embedPollTimer = null;
                handleEmbedConfirmationText(t);
            }
        }, 650);
    }

    function ensureComidaPickerListeners() {
        if (comidaPickerListenersBound) return;
        comidaPickerListenersBound = true;
        var btnG = document.getElementById('comida-picker-guardar');
        var btnC = document.getElementById('comida-picker-cerrar');
        if (btnG) btnG.addEventListener('click', function () { commitComidaPickerChoice(); });
        if (btnC) btnC.addEventListener('click', function () { closeComidaPickerPanel(); });
    }

    function mountComidaPickerIfNeeded() {
        var root = document.getElementById('comida-restaurante-picker-root');
        if (!root || comidaPickerControl || typeof window.mountRestaurantePaquetePicker !== 'function') return;
        comidaPickerControl = window.mountRestaurantePaquetePicker(root, { soloExternos: true });
        ensureComidaPickerListeners();
        if (!root.dataset.embedLoadListener) {
            root.dataset.embedLoadListener = '1';
            root.addEventListener('restaurante-iframe-loaded', function (ev) {
                var ir = ev.detail && ev.detail.iframe;
                if (ir) scheduleEmbedConfirmationPoll(ir);
            });
        }
    }

    function onPaqueteWindowMessage(e) {
        if (!activeComidaPickerSlot || !comidaPickerControl) return;
        var ifr = comidaPickerControl.getIframe && comidaPickerControl.getIframe();
        if (!ifr || e.source !== ifr.contentWindow) return;
        var str = embedPayloadToString(e.data);
        if (!str || str.length > 20000) return;
        if (looksLikeReservationConfirmation(str)) {
            handleEmbedConfirmationText(str);
        }
    }

    function openComidaPickerPanel(diaStr) {
        mountComidaPickerIfNeeded();
        if (!form) return;
        var fd = new FormData(form);
        var fechasArr = fd.getAll('fechas[]') || [];
        var dia = parseInt(diaStr, 10);
        var idx = dia - 1;
        var labelDia = (idx >= 0 && fechasArr[idx]) ? formatearEtiquetaDiaComida(fechasArr[idx]) : ('Día ' + diaStr);
        activeComidaPickerSlot = { dia: String(dia) };
        window.__paqueteEmbedSlot = activeComidaPickerSlot;
        var panel = document.getElementById('comida-restaurante-picker-panel');
        var ctx = document.getElementById('comida-picker-context');
        var gs = document.getElementById('comida-picker-guardar-slot');
        if (ctx) ctx.textContent = 'Restaurantes recomendados para el ' + labelDia + '. Reserva en el visor (CoverManager o TheFork) y elige comida o cena y la hora allí. Pulsa Guardar cuando quieras fijar el restaurante.';
        if (gs) gs.textContent = 'este día';
        if (panel) {
            panel.hidden = false;
            panel.style.display = 'block';
        }
        if (comidaPickerControl && comidaPickerControl.setCategoria) comidaPickerControl.setCategoria('burgos');
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closeComidaPickerPanel() {
        if (embedPollTimer) {
            clearInterval(embedPollTimer);
            embedPollTimer = null;
        }
        var panel = document.getElementById('comida-restaurante-picker-panel');
        if (panel) {
            panel.hidden = true;
            panel.style.display = 'none';
        }
        activeComidaPickerSlot = null;
        window.__paqueteEmbedSlot = null;
        if (refreshPickerIframeTimer) {
            clearTimeout(refreshPickerIframeTimer);
            refreshPickerIframeTimer = null;
        }
    }

    function commitComidaPickerChoice() {
        if (!activeComidaPickerSlot || !comidaPickerControl || !form) return false;
        if (embedPollTimer) {
            clearInterval(embedPollTimer);
            embedPollTimer = null;
        }
        var r = comidaPickerControl.getCurrentRestaurant();
        if (!r) return false;
        var d = activeComidaPickerSlot.dia;
        var pack = r.precioPack || (r.area === 'lerma' ? 'lerma' : 'burgos');
        agregarReservaExterna(d, r.id, pack);
        var fd = new FormData(form);
        var fechasArr = fd.getAll('fechas[]') || [];
        closeComidaPickerPanel();
        actualizarBloqueComida(fechasArr.length, fechasArr);
        if (typeof actualizarResumen === 'function') actualizarResumen();
        return true;
    }

    if (calendarioContainer && form && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameFechas: 'fechas[]',
            nameNoches: 'noches',
            maxSeleccion: 7,
            hintContainer: fechasDiaPlanHint || null,
            onChange: function (count, fechas) {
                generarPlanPorDiaFinSemana(count, fechas || []);
                if (configuradorHotelWrap) {
                    actualizarBloqueHotel();
                    if (typeof window.actualizarPreciosHotelbeds === 'function') window.actualizarPreciosHotelbeds();
                }
                actualizarBloqueComida(count, fechas || []);
                actualizarBloqueAncillaryPorDia(count, fechas || []);
                if (typeof actualizarResumen === 'function') actualizarResumen();
                schedulePickerIframeRefreshFromForm();
            }
        });
    }

    document.addEventListener('hotelbeds-dynamic-ready', function () {
        // Evitar reconstruir el DOM de hoteles mientras el usuario interactúa con los selects:
        // al regenerar el bloque, el dropdown nativo se cierra y parece que “no deja seleccionar”.
        try {
            var active = document.activeElement;
            if (active && hotelesPorNocheContainer && hotelesPorNocheContainer.contains(active)) {
                // Solo refrescar opciones en el select actual (sin regenerar filas).
                var noches = parseInt(((form && form.querySelector('input[name="noches"]')) || {}).value || '0', 10);
                for (var i = 1; i <= noches; i++) {
                    var lSel = form && form.querySelector('select[name="lugar-noche-' + i + '"]');
                    var lugar = (lSel && lSel.value) ? String(lSel.value) : '';
                    if (lugar === 'lerma' || lugar === 'burgos') refillHotelSelect(i, lugar);
                }
                return;
            }
        } catch (e) { /* ignore */ }
        actualizarBloqueHotel();
    });

    if (form) {
        form.addEventListener('change', function (e) {
            var t = e.target;
            if (t && t.name && t.name.indexOf('lugar-noche-') === 0) {
                var i = parseInt(t.name.replace('lugar-noche-', ''), 10);
                if (i >= 1) refillHotelSelect(i, t.value || '');
                return;
            }
            if (t && t.name && /^campo-dia-\d+$/.test(t.name)) {
                onCampoDiaPlanChangeFinSemana();
                return;
            }
            if (t && t.classList && t.classList.contains('comida-hora-comida')) {
                var diaHora = t.getAttribute('data-dia');
                if (t.classList.contains('comida-dia-hora') && diaHora) {
                    var hNorm = aplicarHoraComidaDia(diaHora, t.value);
                    if (t.value !== hNorm) t.value = hNorm;
                    scheduleActualizarResumen();
                    return;
                }
                var menuHora = t.getAttribute('data-menu');
                if (diaHora && menuHora) {
                    var reservasHora = leerReservasComidaDia(diaHora);
                    var foundHora = findReservaClubMenu(reservasHora, menuHora);
                    if (foundHora) {
                        var hAll = aplicarHoraComidaDia(diaHora, t.value);
                        if (t.value !== hAll) t.value = hAll;
                    }
                } else {
                    var idxHora = parseInt(t.getAttribute('data-reserva-idx'), 10);
                    if (diaHora && !isNaN(idxHora)) {
                        var reservasHoraLegacy = leerReservasComidaDia(diaHora);
                        if (reservasHoraLegacy[idxHora] && reservasHoraLegacy[idxHora].tipo === 'club') {
                            reservasHoraLegacy[idxHora].hora = normalizarHoraComida(t.value);
                            guardarReservasComidaDia(diaHora, reservasHoraLegacy);
                            if (t.value !== reservasHoraLegacy[idxHora].hora) t.value = reservasHoraLegacy[idxHora].hora;
                        }
                    }
                }
                return;
            }
            if (t && t.classList && t.classList.contains('comida-menu-comensales')) {
                aplicarComensalesMenuClub(t);
                scheduleActualizarResumen();
                return;
            }
            if (t && t.classList && t.classList.contains('fechas-jugadores-dia')) {
                onJugadoresDiaChange();
                return;
            }
            if (t && t.classList && t.classList.contains('comida-comensales-counter')) {
                var diaCom = t.getAttribute('data-dia');
                var idxCom = parseInt(t.getAttribute('data-reserva-idx'), 10);
                if (diaCom && !isNaN(idxCom)) {
                    var reservasCom = leerReservasComidaDia(diaCom);
                    if (reservasCom[idxCom] && reservasCom[idxCom].tipo === 'club') {
                        reservasCom[idxCom].comensales = Math.max(1, parseInt(t.value, 10) || 1);
                        guardarReservasComidaDia(diaCom, reservasCom);
                        var hidCom = form.querySelector('input[name="comida_reservas_dia_' + diaCom + '"]');
                        if (hidCom) hidCom.value = JSON.stringify(reservasCom);
                        var cardCom = t.closest('.comida-dia-card');
                        var menuCom = typeof window.getCasaClubMenuById === 'function' ? window.getCasaClubMenuById(reservasCom[idxCom].menuId) : null;
                        var precioEl = cardCom && cardCom.querySelector('[data-reserva-precio="' + idxCom + '"]');
                        if (precioEl && menuCom && menuCom.precioPorPersona != null) {
                            var paxTxt = reservasCom[idxCom].comensales === 1 ? '1 comensal' : reservasCom[idxCom].comensales + ' comensales';
                            precioEl.textContent = menuCom.precioPorPersona + ' € / persona × ' + paxTxt;
                        }
                    }
                }
                scheduleActualizarResumen();
                return;
            }
            if (t && t.id === 'tamanio-grupo') {
                syncFechasGolfBodyVisibility();
                recalcNumeroGrupos();
                schedulePickerIframeRefreshFromForm();
                syncComidaBloqueLimites();
                var fdTg = new FormData(form);
                var faTg = fdTg.getAll('fechas[]') || [];
                actualizarBloqueAncillaryPorDia(faTg.length, faTg);
                if (typeof window.actualizarPreciosHotelbeds === 'function') window.actualizarPreciosHotelbeds();
            }
            scheduleActualizarResumen();
        });
        form.addEventListener('input', function (e) {
            var t = e.target;
            if (t && t.id === 'tamanio-grupo') {
                syncFechasGolfBodyVisibility();
                recalcNumeroGrupos();
                schedulePickerIframeRefreshFromForm();
                syncComidaBloqueLimites();
                var fdTg2 = new FormData(form);
                var faTg2 = fdTg2.getAll('fechas[]') || [];
                actualizarBloqueAncillaryPorDia(faTg2.length, faTg2);
                if (typeof window.actualizarPreciosHotelbeds === 'function') window.actualizarPreciosHotelbeds();
            }
            if (t && t.matches && t.matches('#tamanio-grupo, #hora-salida, #handicap-grupo, .ancillary-counter:not(.comida-menu-comensales), .fechas-jugadores-dia, .comida-comensales-counter, input[name^="hora_salida"]')) scheduleActualizarResumen();
            if (t && t.classList && t.classList.contains('ancillary-counter') && ancillaryPorDiaContainer && ancillaryPorDiaContainer.contains(t)) {
                syncAncillaryDiaTabsBadges();
            }
        });
        form.addEventListener('click', function (e) {
            var diaTab = e.target.closest('.config-dia-tab');
            if (diaTab && form.contains(diaTab)) {
                e.preventDefault();
                var group = diaTab.getAttribute('data-dia-tab-group');
                var diaTabIdx = parseInt(diaTab.getAttribute('data-dia-tab'), 10);
                if (group === 'comida' && !isNaN(diaTabIdx)) setComidaDiaActivo(diaTabIdx);
                if (group === 'ancillary' && !isNaN(diaTabIdx)) setAncillaryDiaActivo(diaTabIdx);
                return;
            }
            var abrir = e.target.closest('.comida-abrir-picker');
            if (abrir && form.contains(abrir)) {
                return;
            }
            var q = e.target.closest('.comida-chip-quitar');
            if (q && form.contains(q)) {
                e.preventDefault();
                var d = q.getAttribute('data-dia');
                var idxQ = parseInt(q.getAttribute('data-reserva-idx'), 10);
                if (!d || isNaN(idxQ)) return;
                var reservasQ = leerReservasComidaDia(d);
                reservasQ.splice(idxQ, 1);
                guardarReservasComidaDia(d, reservasQ);
                var fdq = new FormData(form);
                var fa = fdq.getAll('fechas[]') || [];
                actualizarBloqueComida(fa.length, fa);
                scheduleActualizarResumen();
            }
        });
        window.actualizarResumen = scheduleActualizarResumen;
        document.addEventListener('i18n:changed', function () {
            scheduleActualizarResumen();
            if (form) {
                var fdi = new FormData(form);
                var fechasI18n = fdi.getAll('fechas[]') || [];
                actualizarBloqueComida(fechasI18n.length, fechasI18n);
                actualizarBloqueAncillaryPorDia(fechasI18n.length, fechasI18n);
            }
        });
        recalcNumeroGrupos();
        syncFechasGolfBodyVisibility();
        if (form) {
            var fdInit = new FormData(form);
            var faInit = fdInit.getAll('fechas[]') || [];
            actualizarBloqueComida(faInit.length, faInit);
            actualizarBloqueAncillaryPorDia(faInit.length, faInit);
        }
        if (!window.__golfLermaPaqueteMsgBound) {
            window.__golfLermaPaqueteMsgBound = true;
            window.addEventListener('message', onPaqueteWindowMessage);
        }
    }

    function recalcNumeroGrupos() {
        var tg = document.getElementById('tamanio-grupo-sync') || document.getElementById('tamanio-grupo');
        var out = document.getElementById('numero-grupos-output');
        var hid = document.getElementById('numero-grupos');
        if (!tg) return;
        var n = parseInt(tg.value, 10);
        var hidVal = (n >= 1) ? String(Math.ceil(n / 4)) : '';
        if (out) out.textContent = hidVal || '—';
        if (hid) hid.value = hidVal;
        scheduleActualizarResumen();
    }

    var resumenUpdateFrame = 0;
    function scheduleActualizarResumen() {
        if (!resumenUpdateFrame) {
            resumenUpdateFrame = requestAnimationFrame(function () {
                resumenUpdateFrame = 0;
                actualizarResumen();
            });
        }
    }

    function actualizarResumen() {
        if (!form) return;
        var formData = new FormData(form);
        var noches = formData.get('noches');
        var count = (formData.getAll('fechas[]') || []).length;
        var nNoches = parseInt(noches || '0', 10) || 0;
        var hbFunnelReady = String(formData.get('hb_funnel_ready') || '').trim() === '1';
        var necesitaHotel = nNoches >= 1 || hbFunnelReady;
        var hotelOk = !necesitaHotel || (function () {
            for (var i = 1; i <= nNoches; i++) { if ((formData.get('hotel-noche-' + i) || '').trim()) return true; }
            return hbFunnelReady;
        })();
        if (nNoches >= 1) {
            var fechas = formData.getAll('fechas[]');
            var salidasConCampo = 0;
            for (var isc = 1; isc <= count; isc++) {
                if ((formData.get('campo-dia-' + isc) || '').trim()) salidasConCampo++;
            }
            var numServicios = 0;
            for (var ic = 1; ic <= count; ic++) {
                numServicios += leerReservasComidaDesdeFormData(formData, ic).length;
            }

            var resumenHTML = '<div class="resumen-items">';
            resumenHTML += '<p><strong>Estancia:</strong> ' + noches + ' ' + (noches === '1' ? 'noche' : 'noches') + '</p>';
            resumenHTML += '<p><strong>Green fees:</strong> ' + salidasConCampo + ' ' + (salidasConCampo === 1 ? 'salida' : 'salidas') + '</p>';
            resumenHTML += '<p><strong>Alojamiento:</strong> ' + (necesitaHotel && hotelOk ? (noches + ' ' + (noches === '1' ? 'noche' : 'noches')) : '—') + '</p>';
            resumenHTML += '<p><strong>Reservas de comida:</strong> ' + (numServicios > 0 ? 'x' + numServicios : '—') + '</p>';

            var usuarios = form.querySelectorAll('.usuario-form');
            var nPart = Math.max(1, parseInt((formData.get('tamanio_grupo') || '').trim(), 10) || usuarios.length);
            resumenHTML += '<p><strong>Participantes:</strong> ' + nPart + '</p>';
            var grupos = getCorrespondenciaGrupos(form);
            if (grupos.length > 0) resumenHTML += '<p><strong>Correspondencias:</strong> Sí</p>';
            var qB = 0;
            var qC = 0;
            var qE = 0;
            for (var ian = 1; ian <= count; ian++) {
                if (!(formData.get('campo-dia-' + ian) || '').trim()) continue;
                qB += Math.max(0, parseInt(formData.get('ancillary_buggy_dia_' + ian) || '0', 10));
                qC += Math.max(0, parseInt(formData.get('ancillary_carrito_mano_dia_' + ian) || '0', 10));
                qE += Math.max(0, parseInt(formData.get('ancillary_carrito_electrico_dia_' + ian) || '0', 10));
            }
            var tieneAnc = (qB + qC + qE) > 0;
            resumenHTML += '<p><strong>Servicios adicionales:</strong> ' + (tieneAnc ? 'Sí' : '—') + '</p>';
            resumenHTML += '</div>';

            var numParticipants = Math.max(1, parseInt((formData.get('tamanio_grupo') || '').trim(), 10) || form.querySelectorAll('.usuario-form').length);
            var formaPago = ((formData.get('forma_pago') || 'unico').trim() || 'unico');

            // Green fees: precio por día según correspondencia y día de la semana (laborable→Lerma, sáb/dom→Saldaña). Por persona.
            // Club para tarifa: primer grupo de correspondencias con club (no "sin"); si no, sin correspondencia.
            var clubId = '';
            for (var gi = 0; gi < grupos.length; gi++) {
                if (grupos[gi].club_id && grupos[gi].club_id !== 'sin') {
                    clubId = grupos[gi].club_id;
                    break;
                }
            }
            var fechasGF = formData.getAll('fechas[]') || [];
            var numGF = fechasGF.length;
            var totalGF = 0;
            var tieneCorrespondencia = false;
            var precios = getPrecios();
            var gfLerma = (precios.greenFees && precios.greenFees.lerma) || {};
            var gfSaldana = (precios.greenFees && precios.greenFees.saldana) || {};
            for (var idx = 0; idx < numGF; idx++) {
                var iso = fechasGF[idx];
                if (!iso) continue;
                var campoDia = formData.get('campo-dia-' + (idx + 1));
                if (!(campoDia && String(campoDia).trim())) continue;
                var d = new Date(iso + 'T12:00:00');
                var dow = d.getDay();
                var esFinDeSemana = (dow === 0 || dow === 6);
                var p = null;
                if (clubId && typeof getPrecioGreenFee === 'function') {
                    p = getPrecioGreenFee(clubId, (campoDia === 'saldana') ? 'saldana' : 'lerma');
                    if (p != null) tieneCorrespondencia = true;
                }
                if (p == null) {
                    var gfc = (campoDia === 'saldana') ? gfSaldana : gfLerma;
                    p = esFinDeSemana ? (gfc.finDeSemana || 44) : (gfc.laborable || 33);
                }
                totalGF += p;
            }
            if (numGF === 0) totalGF = (gfLerma.laborable || 33) + (gfSaldana.finDeSemana || 44);
            var gf = roundEuros(totalGF * numParticipants);
            window.__HB_GF_TOTAL__ = gf;
            if (typeof window.refreshHotelCardPackagePrices === 'function') window.refreshHotelCardPackagePrices();
            if (typeof window.refreshFunnelRatePackagePrices === 'function') window.refreshFunnelRatePackagePrices();

            var aloj = 0;
            if (necesitaHotel) {
              if (typeof window.syncHbResumenFromCurrentOffer === 'function') {
                window.syncHbResumenFromCurrentOffer(form);
                formData = new FormData(form);
              }
              if (typeof window.calcularAlojamientoResumenEuros === 'function') {
                aloj = roundEuros(window.calcularAlojamientoResumenEuros(formData, nNoches));
              } else if (hotelOk) {
                for (var inx = 1; inx <= nNoches; inx++) {
                  var hv = (formData.get('hotel-noche-' + inx) || '').trim();
                  if (!hv) continue;
                  var price = (typeof window.precioNocheDesdeHotelSelect === 'function') ? window.precioNocheDesdeHotelSelect(hv) : null;
                  if (price != null) aloj += price;
                }
                aloj = roundEuros(aloj);
              }
            }

            var totalComidaPrepago = 0;
            for (var iv = 1; iv <= count; iv++) {
                var reservasIv = leerReservasComidaDesdeFormData(formData, iv);
                for (var riv = 0; riv < reservasIv.length; riv++) {
                    var rv = reservasIv[riv];
                    if (rv.tipo !== 'club') continue;
                    var menuIv = typeof window.getCasaClubMenuById === 'function' ? window.getCasaClubMenuById(rv.menuId) : null;
                    if (menuIv && menuIv.precioPorPersona != null) {
                        var paxMenu = Math.max(1, parseInt(rv.comensales, 10) || numParticipants);
                        totalComidaPrepago += Number(menuIv.precioPorPersona) * paxMenu;
                    }
                }
            }
            var comidaVal = roundEuros(totalComidaPrepago);

            var anc = precios.ancillaries || {};
            var ancVal = 0;
            var qBuggy = 0;
            var qCarritoMano = 0;
            var qCarritoElec = 0;
            for (var ia2 = 1; ia2 <= count; ia2++) {
                if (!(formData.get('campo-dia-' + ia2) || '').trim()) continue;
                qBuggy += Math.max(0, parseInt(formData.get('ancillary_buggy_dia_' + ia2) || '0', 10));
                qCarritoMano += Math.max(0, parseInt(formData.get('ancillary_carrito_mano_dia_' + ia2) || '0', 10));
                qCarritoElec += Math.max(0, parseInt(formData.get('ancillary_carrito_electrico_dia_' + ia2) || '0', 10));
            }
            ancVal = roundEuros(
                (anc.buggy || 15) * qBuggy +
                (anc.carritoMano || 3) * qCarritoMano +
                (anc.carritoElectrico || 5) * qCarritoElec
            );

            var base = roundEuros(gf + aloj + comidaVal + ancVal);
            var descPct = tieneCorrespondencia ? DESCUENTO_PACK_PORC : 12;
            var desc = roundEuros(base * descPct / 100);
            var subtotal = roundEuros(base - desc);

            resumenHTML += '<div class="resumen-subtotal">';
            resumenHTML += '<table class="resumen-subtotal-tabla">';
            if (necesitaHotel) {
                resumenHTML += '<tr><td>Pack golf + alojamiento</td><td>' + formatEurosResumen(gf + aloj) + ' €</td></tr>';
            } else {
                resumenHTML += '<tr><td>Green fees</td><td>' + formatEurosResumen(gf) + ' €</td></tr>';
            }
            resumenHTML += '<tr><td>Casa Club (menús en pack)</td><td>' + (comidaVal > 0 ? formatEurosResumen(comidaVal) + ' €' : '—') + '</td></tr>';
            resumenHTML += '<tr><td>Servicios adicionales</td><td>' + (ancVal > 0 ? formatEurosResumen(ancVal) + ' €' : '—') + '</td></tr>';
            var pdfBurgosLbl = (window.i18n && window.i18n.t) ? window.i18n.t('resumen_pdf_burgos') : 'PDF recomendaciones de Burgos';
            var gratisLbl = 'GRATIS';
            if (window.i18n && window.i18n.t) {
                var gratisI18n = window.i18n.t('resumen_gratis');
                if (gratisI18n && gratisI18n !== 'resumen_gratis') gratisLbl = gratisI18n;
            }
            resumenHTML += '<tr class="resumen-incluido"><td>' + pdfBurgosLbl + '</td><td><span class="resumen-gratis-valor">' + gratisLbl + '</span></td></tr>';
            resumenHTML += '<tr class="resumen-descuento"><td>Descuento pack (-' + descPct + '%)</td><td>-' + formatEurosResumen(desc) + ' €</td></tr>';
            resumenHTML += '<tr class="resumen-total"><td>Total</td><td>' + formatEurosResumen(subtotal) + ' €</td></tr>';
            if (numParticipants > 1) {
                resumenHTML += '<tr class="resumen-por-persona"><td>Por persona</td><td>' + formatEurosResumen(subtotal / numParticipants) + ' €</td></tr>';
            }
            resumenHTML += '</table>';
            if (typeof window.getHbTariffDebugResumenHtml === 'function') {
                resumenHTML += window.getHbTariffDebugResumenHtml(form);
            }
            resumenHTML += '<p class="resumen-subtotal-nota">Descuento por pack aplicado.' + (clubId ? ' Tarifa correspondencia aplicada según día de la semana.' : '') + ' Forma de pago: ' + (formaPago === 'por_persona' ? 'por persona (enlaces individuales).' : 'único.') + '</p></div>';

            resumenDiv.innerHTML = resumenHTML;
        } else {
            resumenDiv.innerHTML = '<p>' + (window.i18n && window.i18n.t ? window.i18n.t('resumen_completa') : 'Completa las opciones para ver el resumen') + '</p>';
        }
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var formDataEarly = new FormData(form);
            var nochesEarly = formDataEarly.get('noches');
            if (!nochesEarly || parseInt(nochesEarly, 10) < 1) {
                alert('Selecciona al menos una noche en el calendario (elige las fechas de tu estancia).');
                return;
            }
            var totalEarly = (typeof window.getTotalFromResumen === 'function') ? window.getTotalFromResumen() : 0;
            if (totalEarly <= 0) {
                alert('Completa las opciones del paquete para ver el total y proceder al pago.');
                return;
            }

            if (window.configuradorDatosReserva && window.configuradorDatosReserva.shouldInterceptSubmit()) {
                window.configuradorDatosReserva.open();
                return;
            }

            if (!form.reportValidity()) return;
            if (typeof window.validarTelefonosForm === 'function' && !window.validarTelefonosForm(form)) return;
            var formData = new FormData(form);
            var noches = formData.get('noches');
            if (!noches || parseInt(noches, 10) < 1) {
                alert('Selecciona al menos una noche en el calendario (elige las fechas de tu estancia).');
                return;
            }
            var fechas = formData.getAll('fechas[]');
            var count = (fechas || []).length;
            var camposPorDia = {};
            if (fechas) for (var i = 1; i <= fechas.length; i++) {
                var c = formData.get('campo-dia-' + i);
                if (c) camposPorDia[i] = c;
            }
            var hotelPorNoche = {};
            var nHotelNoches = parseInt(noches, 10) || 0;
            if (nHotelNoches >= 1) {
                for (var i = 1; i <= nHotelNoches; i++) { hotelPorNoche[i] = formData.get('hotel-noche-' + i); }
            }
            var corresGrupos = getCorrespondenciaGrupos(form);
            var usuarios = form.querySelectorAll('.usuario-form');
            var numParticipantes = Math.max(1, parseInt((formData.get('tamanio_grupo') || '').trim(), 10) || usuarios.length);
            var comidaPorDia = [];
            for (var icd = 1; icd <= count; icd++) {
                var reservasCd = leerReservasComidaDesdeFormData(formData, icd);
                for (var rcd = 0; rcd < reservasCd.length; rcd++) {
                    var rc = reservasCd[rcd];
                    var itemComida = { dia: icd, reservaIdx: rcd, tipo: rc.tipo };
                    if (rc.tipo === 'club') {
                        itemComida.opcion = 'club:' + rc.menuId;
                        itemComida.menuId = rc.menuId;
                        itemComida.comensales = Math.max(1, parseInt(rc.comensales, 10) || numParticipantes);
                        itemComida.hora = normalizarHoraComida(rc.hora);
                    } else if (rc.tipo === 'externo') {
                        itemComida.opcion = 'externo';
                        itemComida.restId = rc.restId;
                        itemComida.zona = rc.zona;
                    }
                    comidaPorDia.push(itemComida);
                }
            }
            var formaPagoSubmit = ((formData.get('forma_pago') || 'unico').trim() || 'unico');
            var totalEuros = (typeof window.getTotalFromResumen === 'function') ? window.getTotalFromResumen() : 0;

            if (totalEuros <= 0) {
                alert('Completa las opciones del paquete para ver el total y proceder al pago.');
                return;
            }

            var submitBtn = document.querySelector('button[form="configuradorForm"]');
            if (typeof window.iniciarPagoStripe === 'function') {
                window.iniciarPagoStripe({
                    totalEuros: totalEuros,
                    modo: formaPagoSubmit,
                    numParticipantes: numParticipantes,
                    paquete: 'fin-semana',
                    formId: 'configuradorForm',
                    submitButton: submitBtn
                });
            } else {
                alert('Error: módulo de pago no cargado. Recarga la página e inténtalo de nuevo.');
            }
        });
    }
}

// Resumen móvil: pestaña desplegable y botón "Reservar" siempre visible en la barra
(function () {
    function updateMobileTotal() {
        var mobileTotal = document.getElementById('resumen-total-mobile');
        if (!mobileTotal) return;
        var totalCell = document.querySelector('#resumen-paquete .resumen-total td:last-child, #resumen-detalle .resumen-total td:last-child, #resumen-pausadrive .resumen-total td:last-child, #resumen-ryder .resumen-total td:last-child, .resumen-detalle .resumen-total td:last-child');
        mobileTotal.textContent = totalCell ? totalCell.textContent.trim() : '';
    }
    function cloneReservarIntoBar(wrapper) {
        var btnWrap = wrapper.querySelector('.resumen-mobile-btn-wrap');
        var btn = wrapper.querySelector('.configurador-resumen .btn-reservar-paquete');
        if (!btnWrap || !btn || btnWrap.querySelector('.btn-reservar-paquete')) return;
        var clone = btn.cloneNode(true);
        clone.classList.add('btn-reservar-paquete-mobile');
        clone.removeAttribute('id');
        btnWrap.appendChild(clone);
        if (typeof window.refreshConfiguradorFormNav === 'function') {
            var fid = clone.getAttribute('form') || (btn.getAttribute('form'));
            var targetForm = fid ? document.getElementById(fid) : null;
            window.refreshConfiguradorFormNav(targetForm);
        }
    }
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.resumen-mobile-wrapper').forEach(function (wrapper) {
            cloneReservarIntoBar(wrapper);
        });
        var tab = document.getElementById('resumen-mobile-tab');
        var wrapper = tab && tab.closest('.resumen-mobile-wrapper');
        if (tab && wrapper) {
            function setDrawerOpen(open) {
                if (open) {
                    wrapper.classList.add('expanded');
                    document.body.classList.add('resumen-drawer-open');
                } else {
                    wrapper.classList.remove('expanded');
                    document.body.classList.remove('resumen-drawer-open');
                }
                tab.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
            function toggle() {
                setDrawerOpen(!wrapper.classList.contains('expanded'));
            }
            tab.addEventListener('click', function (e) {
                e.stopPropagation();
                toggle();
            });
            tab.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
                if (e.key === 'Escape' && wrapper.classList.contains('expanded')) {
                    setDrawerOpen(false);
                }
            });
            document.addEventListener('click', function (e) {
                if (!wrapper.classList.contains('expanded')) return;
                var drawer = wrapper.querySelector('.configurador-resumen');
                if (drawer && (drawer.contains(e.target) || tab.contains(e.target))) return;
                setDrawerOpen(false);
            });
            var obs = new MutationObserver(updateMobileTotal);
            var resumen = wrapper.querySelector('.resumen-detalle, #resumen-paquete, #resumen-detalle, #resumen-pausadrive, #resumen-ryder, .resumen-content');
            if (resumen) obs.observe(resumen, { childList: true, subtree: true });
            updateMobileTotal();
        }
    });
})();

// Evitar que la barra Resumen o el chatbot tapen el selector nativo de hora/fecha (botón "Establecer" en Android)
function initNativePickerFix() {
    var inputs = document.querySelectorAll(
        'input[type="date"], input[type="datetime-local"], input[type="time"]:not([data-hora-picker-init])'
    );
    inputs.forEach(function (inp) {
        inp.addEventListener('focus', function () {
            document.body.classList.add('native-picker-open');
            // Dejar espacio abajo para el modal nativo: llevar el campo hacia arriba
            if (inp.scrollIntoView) {
                inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        inp.addEventListener('blur', function () {
            setTimeout(function () {
                document.body.classList.remove('native-picker-open');
            }, 350);
        });
    });
}

// Rellenar precios en servicios adicionales (todos los configuradores)
function fillAncillaryPrices() {
    var precios = (typeof getPrecios === 'function') ? getPrecios() : (window.PRECIOS_DATA || {});
    var anc = precios.ancillaries || {};
    document.querySelectorAll('.ancillary-precio[data-ancillary]').forEach(function (span) {
        var key = span.getAttribute('data-ancillary');
        var val = anc[key];
        if (val != null && val !== '') {
            var inCard = span.closest('.ancillary-service-card');
            span.textContent = inCard
                ? (Number(val) === 0 ? 'Consultar' : val + ' €')
                : ('· ' + (Number(val) === 0 ? 'Consultar' : val + ' €'));
            span.style.visibility = 'visible';
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    highlightNavigation();
    initHeroSlider();
    updateTiempoData();
    loadCamaraLive();
    initConfiguradorPaquete();
    fillAncillaryPrices();
    initNativePickerFix();
    if (typeof window.enhanceFooterMapLinks === 'function') window.enhanceFooterMapLinks();

    // Actualizar datos del tiempo cada 5 minutos
    setInterval(updateTiempoData, 300000);
});

