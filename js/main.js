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

// Función global para obtener grupos de correspondencia
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
    var camposDiasFinSemana = document.getElementById('campos-dias-finsemana');
    var diasCamposContainerFinSemana = document.getElementById('dias-campos-container-finsemana');
    var configuradorHotelWrap = document.getElementById('configurador-hotel-wrap');
    var hotelPorNocheBlock = document.getElementById('hotel-por-noche-block');
    var hotelesPorNocheContainer = document.getElementById('hoteles-por-noche-container');
    var comidaSinFechas = document.getElementById('comida-sin-fechas');
    var comidaPorDiaContainer = document.getElementById('comida-por-dia-container');
    var ancillaryPorDiaContainer = document.getElementById('ancillary-por-dia-container');
    var horaPorDiaWrapFS = document.getElementById('hora-salida-por-dia-finsemana');
    var horaUnicaWrapFS = document.getElementById('hora-salida-unica-finsemana');

    function campoDiaTieneReservaFinSemana(idx) {
        if (!form || idx < 1) return false;
        var sel = null;
        if (diasCamposContainerFinSemana) {
            var items = diasCamposContainerFinSemana.querySelectorAll('.campos-dias-item');
            var item = items[idx - 1];
            if (item) sel = item.querySelector('select[name="campo-dia-' + idx + '"]') || item.querySelector('select');
        }
        if (!sel) sel = form.querySelector('#dias-campos-container-finsemana select[name="campo-dia-' + idx + '"]');
        if (!sel) sel = form.querySelector('select[name="campo-dia-' + idx + '"]');
        return !!(sel && String(sel.value || '').trim() !== '');
    }

    function syncHoraSalidaWrapVisible() {
        var wrap = horaPorDiaWrapFS && horaPorDiaWrapFS.parentElement;
        if (!wrap || !wrap.classList.contains('hora-salida-en-fechas-wrap')) return;
        var porDiaVisible =
            horaPorDiaWrapFS.style.display !== 'none' && horaPorDiaWrapFS.childElementCount > 0;
        var unicaVisible = horaUnicaWrapFS.style.display !== 'none';
        wrap.hidden = !(porDiaVisible || unicaVisible);
        wrap.style.display = porDiaVisible || unicaVisible ? '' : 'none';
    }

    function generarHoraSalidaPorDiaFinSemana(numDias) {
        if (!horaPorDiaWrapFS || !horaUnicaWrapFS) return;
        var singleInput = form && form.querySelector('input[name="hora_salida"]');
        if (!numDias || numDias < 1) {
            horaPorDiaWrapFS.style.display = 'none';
            horaPorDiaWrapFS.innerHTML = '';
            horaUnicaWrapFS.style.display = 'none';
            if (singleInput) singleInput.removeAttribute('required');
            syncHoraSalidaWrapVisible();
            return;
        }
        if (numDias > 1) {
            var prev = {};
            for (var i = 1; i <= numDias; i++) {
                var inp = form && form.querySelector('input[name="hora_salida_dia_' + i + '"]');
                if (inp && inp.value) prev[i] = inp.value;
            }
            horaPorDiaWrapFS.innerHTML = '';
            horaUnicaWrapFS.style.display = 'none';
            if (singleInput) singleInput.removeAttribute('required');
            var hayHoras = false;
            for (var j = 1; j <= numDias; j++) {
                if (!campoDiaTieneReservaFinSemana(j)) continue;
                hayHoras = true;
                var item = document.createElement('div');
                item.className = 'campos-dias-item';
                item.innerHTML = '<label for="hora-salida-dia-' + j + '-fs">Hora de salida día ' + j + ' *</label><input type="time" id="hora-salida-dia-' + j + '-fs" name="hora_salida_dia_' + j + '" title="Hora día ' + j + '" required value="' + (prev[j] || '') + '">';
                horaPorDiaWrapFS.appendChild(item);
            }
            horaPorDiaWrapFS.style.display = hayHoras ? 'block' : 'none';
        } else {
            horaPorDiaWrapFS.style.display = 'none';
            horaPorDiaWrapFS.innerHTML = '';
            var conCampo = campoDiaTieneReservaFinSemana(1);
            horaUnicaWrapFS.style.display = conCampo ? 'block' : 'none';
            if (singleInput) {
                if (conCampo) singleInput.setAttribute('required', 'required');
                else singleInput.removeAttribute('required');
            }
        }
        if (typeof window.initHoraSalidaPickers === 'function') {
            window.initHoraSalidaPickers(horaPorDiaWrapFS);
            window.initHoraSalidaPickers(horaUnicaWrapFS);
        }
        syncHoraSalidaWrapVisible();
    }

    function generarCamposPorDiaFinSemana(numDias) {
        if (!diasCamposContainerFinSemana) return;
        var prev = {};
        var oldItems = diasCamposContainerFinSemana.querySelectorAll('.campos-dias-item');
        for (var i = 1; i <= numDias; i++) {
            var oldItem = oldItems[i - 1];
            var sel = oldItem && (oldItem.querySelector('select[name="campo-dia-' + i + '"]') || oldItem.querySelector('select'));
            if (!sel && form) sel = form.querySelector('#dias-campos-container-finsemana select[name="campo-dia-' + i + '"]');
            if (sel && sel.value) prev[i] = sel.value;
        }
        diasCamposContainerFinSemana.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var saved = prev[i] || '';
            var item = document.createElement('div');
            item.className = 'campos-dias-item';
            item.innerHTML = [
                '<label for="campo-dia-' + i + '-sel">Día ' + i + '</label>',
                '<select id="campo-dia-' + i + '-sel" name="campo-dia-' + i + '">',
                '<option value="">Sin reserva</option>',
                '<option value="lerma"' + (saved === 'lerma' ? ' selected' : '') + '>Golf Lerma</option>',
                '<option value="saldana"' + (saved === 'saldana' ? ' selected' : '') + '>Saldaña Golf</option>',
                '</select>'
            ].join('');
            diasCamposContainerFinSemana.appendChild(item);
        }
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
        var tg = document.getElementById('tamanio-grupo');
        var usuarios = form ? form.querySelectorAll('.usuario-form') : [];
        return Math.max(1, parseInt((tg && tg.value) || '', 10) || usuarios.length || 1);
    }

    function leerEstadoComidaDia(dia) {
        var opc = form && form.querySelector('input[name="comida_opcion_dia_' + dia + '"]');
        var menu = form && form.querySelector('input[name="comida_menu_id_' + dia + '"]');
        var rest = form && form.querySelector('input[name="comida_rest_id_' + dia + '"]');
        var zona = form && form.querySelector('input[name="comida_dia_' + dia + '"]');
        var com = form && form.querySelector('input[name="comida_comensales_dia_' + dia + '"]');
        var opcion = (opc && opc.value) ? opc.value.trim() : '';
        var menuId = (menu && menu.value) ? menu.value.trim() : '';
        if (!menuId && opcion.indexOf('club:') === 0) menuId = opcion.replace(/^club:/, '');
        var comensales = (com && com.value) ? Math.max(0, parseInt(com.value, 10) || 0) : 0;
        return {
            opcion: opcion,
            menuId: menuId,
            restId: (rest && rest.value) ? rest.value.trim() : '',
            zona: (zona && zona.value) ? zona.value.trim() : '',
            comensales: comensales,
        };
    }

    function aplicarSeleccionComidaDia(dia, payload) {
        if (!form) return;
        payload = payload || {};
        var opcInp = form.querySelector('input[name="comida_opcion_dia_' + dia + '"]');
        var menuInp = form.querySelector('input[name="comida_menu_id_' + dia + '"]');
        var restInp = form.querySelector('input[name="comida_rest_id_' + dia + '"]');
        var zonaInp = form.querySelector('input[name="comida_dia_' + dia + '"]');
        var comInp = form.querySelector('input[name="comida_comensales_dia_' + dia + '"]');
        var cenaInp = form.querySelector('input[name="cena_dia_' + dia + '"]');
        var cenaRestInp = form.querySelector('input[name="cena_rest_id_' + dia + '"]');
        if (opcInp) opcInp.value = payload.opcion || '';
        if (menuInp) menuInp.value = payload.menuId || '';
        if (restInp) restInp.value = payload.restId || '';
        if (zonaInp) zonaInp.value = payload.zona || '';
        if (comInp) {
            if (payload.comensales != null && payload.comensales !== '') {
                comInp.value = String(Math.max(1, parseInt(payload.comensales, 10) || 1));
            } else if (!payload.opcion || String(payload.opcion).indexOf('club:') !== 0) {
                comInp.value = '';
            }
        }
        if (cenaInp) cenaInp.value = '';
        if (cenaRestInp) cenaRestInp.value = '';
    }

    function etiquetaSeleccionComida(st) {
        if (!st || !st.opcion) return '';
        if (st.opcion.indexOf('club:') === 0 && typeof window.getCasaClubMenuById === 'function') {
            var mid = st.menuId || st.opcion.replace(/^club:/, '');
            var m = window.getCasaClubMenuById(mid);
            return m ? ('Casa Club · ' + m.label) : 'Casa Club Lerma';
        }
        if (st.opcion === 'externo' && st.restId && typeof window.getRestaurantePaqueteById === 'function') {
            var r = window.getRestaurantePaqueteById(st.restId);
            return r ? r.nombre : 'Restaurante recomendado';
        }
        return '';
    }

    function actualizarBloqueComida(count, fechas) {
        fechas = fechas || [];
        if (comidaSinFechas) comidaSinFechas.style.display = count >= 1 ? 'none' : 'block';
        if (!comidaPorDiaContainer) return;
        if (count < 1) {
            comidaPorDiaContainer.style.display = 'none';
            comidaPorDiaContainer.innerHTML = '';
            var pp = document.getElementById('comida-restaurante-picker-panel');
            if (pp) {
                pp.hidden = true;
                pp.style.display = 'none';
            }
            return;
        }
        var menus = typeof window.getCasaClubMenus === 'function' ? window.getCasaClubMenus() : [];
        var prevEstado = {};
        for (var pi = 1; pi <= count; pi++) {
            prevEstado[pi] = leerEstadoComidaDia(pi);
        }
        comidaPorDiaContainer.style.display = 'block';
        comidaPorDiaContainer.innerHTML = '';
        for (var i = 1; i <= count; i++) {
            var iso = fechas[i - 1];
            var titulo = formatearEtiquetaDiaComida(iso) || ('Día ' + i);
            var st = prevEstado[i] || { opcion: '', menuId: '', restId: '', zona: '', comensales: 0 };
            var nJug = getNumJugadoresComida();
            if (st.opcion.indexOf('club:') === 0) {
                if (!st.comensales || st.comensales < 1) st.comensales = nJug;
                st.comensales = Math.min(Math.max(1, st.comensales), Math.max(nJug, 20));
            }
            var selLabel = etiquetaSeleccionComida(st);
            var tieneSel = !!(st.opcion);
            var html = '';

            html += '<article class="comida-dia-card' + (tieneSel ? ' comida-dia-card--selected' : '') + '" data-dia-card="' + i + '">';
            html += '<header class="comida-dia-card__head">';
            html += '<h4 class="comida-dia-card__fecha">' + escapeHtmlComida(titulo) + '</h4>';
            if (tieneSel && st.opcion.indexOf('club:') === 0) {
                html += '<span class="comida-dia-card__badge comida-dia-card__badge--pack">Incluido en el paquete</span>';
            } else if (tieneSel && st.opcion === 'externo') {
                html += '<span class="comida-dia-card__badge">Reserva externa</span>';
            }
            html += '</header>';

            if (tieneSel) {
                html += '<div class="comida-dia-card__resumen">';
                html += '<div class="comida-dia-card__resumen-main">';
                html += '<span class="comida-dia-card__resumen-icon" aria-hidden="true">✓</span>';
                html += '<div class="comida-dia-card__resumen-text">';
                html += '<span class="comida-dia-card__resumen-titulo">' + escapeHtmlComida(selLabel) + '</span>';
                if (st.opcion.indexOf('club:') === 0) {
                    var menuSel = typeof window.getCasaClubMenuById === 'function' ? window.getCasaClubMenuById(st.menuId) : null;
                    if (menuSel && menuSel.precioPorPersona != null) {
                        var paxLbl = st.comensales === 1 ? '1 comensal' : st.comensales + ' comensales';
                        html += '<span class="comida-dia-card__resumen-precio">' + menuSel.precioPorPersona + ' € / persona × ' + paxLbl + '</span>';
                    }
                }
                html += '</div></div>';
                if (st.opcion.indexOf('club:') === 0) {
                    html += '<div class="comida-dia-card__comensales ancillary-pack-cell">';
                    html += '<label class="ancillary-pack-label" for="comida-comensales-dia-' + i + '">';
                    html += '<span class="ancillary-pack-title">Comensales</span></label>';
                    html += '<div class="ancillary-counter-wrap ancillary-pack-counter">';
                    html += '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Menos comensales">−</button>';
                    html += '<input type="number" id="comida-comensales-dia-' + i + '" name="comida_comensales_dia_' + i + '" min="1" max="' + Math.max(nJug, 20) + '" value="' + st.comensales + '" class="ancillary-counter comida-comensales-counter" readonly>';
                    html += '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Más comensales">+</button>';
                    html += '</div></div>';
                }
                html += '<div class="comida-dia-card__resumen-actions">';
                if (st.opcion === 'externo') {
                    html += '<button type="button" class="comida-dia-card__btn comida-dia-card__btn--ghost comida-abrir-picker" data-dia="' + i + '">Cambiar</button>';
                }
                html += '<button type="button" class="comida-dia-card__btn comida-dia-card__btn--ghost comida-chip-quitar" data-dia="' + i + '">Quitar</button>';
                html += '</div></div>';
            } else {
                html += '<section class="comida-dia-card__section">';
                html += '<div class="comida-dia-card__section-head">';
                html += '<h5 class="comida-dia-card__section-title">Casa Club Lerma</h5>';
                html += '<span class="comida-dia-card__tag">Solo comidas</span>';
                html += '</div>';
                html += '<div class="comida-menu-grid" role="group" aria-label="Menús Casa Club">';
                for (var mi = 0; mi < menus.length; mi++) {
                    var menu = menus[mi];
                    var precio = menu.precioPorPersona != null ? menu.precioPorPersona : '';
                    html += '<button type="button" class="comida-menu-card comida-elegir-club" data-dia="' + i + '" data-menu="' + escapeHtmlComida(menu.id) + '">';
                    html += '<span class="comida-menu-card__body">';
                    html += '<span class="comida-menu-card__nombre">' + escapeHtmlComida(menu.label) + '</span>';
                    html += '<span class="comida-menu-card__cta">Añadir al paquete</span>';
                    html += '</span>';
                    if (precio !== '') {
                        html += '<span class="comida-menu-card__precio"><span class="comida-menu-card__precio-num">' + precio + '</span><span class="comida-menu-card__precio-unit">€ / pers.</span></span>';
                    }
                    html += '</button>';
                }
                html += '</div></section>';

                html += '<section class="comida-dia-card__section comida-dia-card__section--externos">';
                html += '<div class="comida-dia-card__section-head">';
                html += '<h5 class="comida-dia-card__section-title">Restaurantes recomendados</h5>';
                html += '</div>';
                html += '<button type="button" class="comida-externos-card comida-abrir-picker" data-dia="' + i + '">';
                html += '<span class="comida-externos-card__icon" aria-hidden="true">🍽</span>';
                html += '<span class="comida-externos-card__text">';
                html += '<span class="comida-externos-card__titulo">Elegir en TheFork o CoverManager</span>';
                html += '<span class="comida-externos-card__sub">Lerma, Saldaña y Burgos · tú eliges hora y comida o cena</span>';
                html += '</span>';
                html += '<span class="comida-externos-card__arrow" aria-hidden="true">→</span>';
                html += '</button></section>';
            }

            html += '<input type="hidden" name="comida_opcion_dia_' + i + '" value="' + escapeHtmlComida(st.opcion) + '">' +
                '<input type="hidden" name="comida_menu_id_' + i + '" value="' + escapeHtmlComida(st.menuId) + '">' +
                '<input type="hidden" name="comida_rest_id_' + i + '" value="' + escapeHtmlComida(st.restId) + '">' +
                '<input type="hidden" name="comida_dia_' + i + '" value="' + escapeHtmlComida(st.zona) + '">' +
                '<input type="hidden" name="cena_dia_' + i + '" value="">' +
                '<input type="hidden" name="cena_rest_id_' + i + '" value="">';
            html += '</article>';

            var block = document.createElement('div');
            block.className = 'comida-dia-card-wrap';
            block.innerHTML = html;
            comidaPorDiaContainer.appendChild(block.firstElementChild || block);
        }
    }

    function seleccionarMenuClub(dia, menuId) {
        if (!form || !menuId) return;
        var prev = leerEstadoComidaDia(dia);
        var comensales = (prev.comensales && prev.comensales >= 1) ? prev.comensales : getNumJugadoresComida();
        aplicarSeleccionComidaDia(dia, {
            opcion: 'club:' + menuId,
            menuId: menuId,
            restId: '',
            zona: 'lerma',
            comensales: comensales,
        });
        var fd = new FormData(form);
        var fechasArr = fd.getAll('fechas[]') || [];
        actualizarBloqueComida(fechasArr.length, fechasArr);
        if (typeof actualizarResumen === 'function') actualizarResumen();
        var card = comidaPorDiaContainer && comidaPorDiaContainer.querySelector('[data-dia-card="' + dia + '"]');
        if (card) {
            card.classList.add('comida-dia-card--just-added');
            setTimeout(function () {
                card.classList.remove('comida-dia-card--just-added');
            }, 1200);
        }
    }

    function actualizarBloqueAncillaryPorDia(count, fechas) {
        fechas = fechas || [];
        if (!ancillaryPorDiaContainer) return;
        if (count < 1) {
            ancillaryPorDiaContainer.innerHTML = '';
            ancillaryPorDiaContainer.style.display = 'none';
            return;
        }
        var prev = {};
        for (var pi = 1; pi <= count; pi++) {
            var ib = form && form.querySelector('input[name="ancillary_buggy_dia_' + pi + '"]');
            var ic = form && form.querySelector('input[name="ancillary_carrito_mano_dia_' + pi + '"]');
            var ie = form && form.querySelector('input[name="ancillary_carrito_electrico_dia_' + pi + '"]');
            prev[pi] = {
                buggy: ib ? Math.max(0, parseInt(ib.value || '0', 10)) : 0,
                mano: ic ? Math.max(0, parseInt(ic.value || '0', 10)) : 0,
                elec: ie ? Math.max(0, parseInt(ie.value || '0', 10)) : 0
            };
        }
        ancillaryPorDiaContainer.innerHTML = '';
        var any = false;
        var tBug = (window.i18n && window.i18n.t) ? window.i18n.t('anc_buggies') : 'Buggies';
        var tMano = (window.i18n && window.i18n.t) ? window.i18n.t('anc_carrito_mano') : 'Carrito de mano';
        var tElec = (window.i18n && window.i18n.t) ? window.i18n.t('anc_carrito_electrico') : 'Carrito eléctrico';
        for (var i = 1; i <= count; i++) {
            if (!campoDiaTieneReservaFinSemana(i)) continue;
            any = true;
            var iso = fechas[i - 1];
            var titulo = formatearEtiquetaDiaComida(iso) || ('Día ' + i);
            var p = prev[i] || { buggy: 0, mano: 0, elec: 0 };
            var block = document.createElement('div');
            block.className = 'ancillary-dia-block';
            block.innerHTML =
                '<div class="ancillary-dia-header">' + escapeHtmlComida(titulo) + '</div>' +
                '<div class="ancillary-pack-dia-grid" role="group" aria-label="' + escapeHtmlComida(titulo) + '">' +
                '<div class="ancillary-pack-cell">' +
                '<label class="ancillary-pack-label" for="ancillary-buggy-dia-' + i + '">' +
                '<span class="ancillary-pack-title">🛺 ' + escapeHtmlComida(tBug) + '</span>' +
                '<span class="ancillary-precio" data-ancillary="buggy"></span></label>' +
                '<div class="ancillary-counter-wrap ancillary-pack-counter">' +
                '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir">−</button>' +
                '<input type="number" id="ancillary-buggy-dia-' + i + '" name="ancillary_buggy_dia_' + i + '" min="0" max="20" value="' + p.buggy + '" class="ancillary-counter" readonly>' +
                '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar">+</button></div></div>' +
                '<div class="ancillary-pack-cell">' +
                '<label class="ancillary-pack-label" for="ancillary-carrito-mano-dia-' + i + '">' +
                '<span class="ancillary-pack-title">🛒 ' + escapeHtmlComida(tMano) + '</span>' +
                '<span class="ancillary-precio" data-ancillary="carritoMano"></span></label>' +
                '<div class="ancillary-counter-wrap ancillary-pack-counter">' +
                '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir">−</button>' +
                '<input type="number" id="ancillary-carrito-mano-dia-' + i + '" name="ancillary_carrito_mano_dia_' + i + '" min="0" max="20" value="' + p.mano + '" class="ancillary-counter" readonly>' +
                '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar">+</button></div></div>' +
                '<div class="ancillary-pack-cell">' +
                '<label class="ancillary-pack-label" for="ancillary-carrito-elec-dia-' + i + '">' +
                '<span class="ancillary-pack-title">⚡ ' + escapeHtmlComida(tElec) + '</span>' +
                '<span class="ancillary-precio" data-ancillary="carritoElectrico"></span></label>' +
                '<div class="ancillary-counter-wrap ancillary-pack-counter">' +
                '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir">−</button>' +
                '<input type="number" id="ancillary-carrito-elec-dia-' + i + '" name="ancillary_carrito_electrico_dia_' + i + '" min="0" max="20" value="' + p.elec + '" class="ancillary-counter" readonly>' +
                '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar">+</button></div></div>' +
                '</div>';
            ancillaryPorDiaContainer.appendChild(block);
        }
        ancillaryPorDiaContainer.style.display = any ? 'block' : 'none';
        if (typeof fillAncillaryPrices === 'function') fillAncillaryPrices();
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
        if (comidaPickerControl && comidaPickerControl.setCategoria) comidaPickerControl.setCategoria('lerma');
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
        aplicarSeleccionComidaDia(d, {
            opcion: 'externo',
            menuId: '',
            restId: r.id,
            zona: pack,
        });
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
            onChange: function (count, fechas) {
                if (camposDiasFinSemana) {
                    if (count >= 1) {
                        camposDiasFinSemana.style.display = 'block';
                        generarCamposPorDiaFinSemana(count);
                    } else {
                        camposDiasFinSemana.style.display = 'none';
                    }
                }
                if (configuradorHotelWrap) {
                    actualizarBloqueHotel();
                    if (typeof window.actualizarPreciosHotelbeds === 'function') window.actualizarPreciosHotelbeds();
                }
                actualizarBloqueComida(count, fechas || []);
                actualizarBloqueAncillaryPorDia(count, fechas || []);
                generarHoraSalidaPorDiaFinSemana(count);
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
                var fdCampo = new FormData(form);
                var nFechas = (fdCampo.getAll('fechas[]') || []).length;
                var fechasCampo = fdCampo.getAll('fechas[]') || [];
                generarHoraSalidaPorDiaFinSemana(nFechas);
                actualizarBloqueAncillaryPorDia(nFechas, fechasCampo);
                actualizarResumen();
                return;
            }
            if (t && t.classList && t.classList.contains('comida-comensales-counter')) {
                var cardCom = t.closest('.comida-dia-card');
                if (cardCom) {
                    var diaCom = cardCom.getAttribute('data-dia-card');
                    var stCom = leerEstadoComidaDia(diaCom);
                    var menuCom = typeof window.getCasaClubMenuById === 'function' ? window.getCasaClubMenuById(stCom.menuId) : null;
                    var precioEl = cardCom.querySelector('.comida-dia-card__resumen-precio');
                    if (precioEl && menuCom && menuCom.precioPorPersona != null) {
                        var paxN = Math.max(1, parseInt(t.value, 10) || 1);
                        var paxTxt = paxN === 1 ? '1 comensal' : paxN + ' comensales';
                        precioEl.textContent = menuCom.precioPorPersona + ' € / persona × ' + paxTxt;
                    }
                }
                actualizarResumen();
                return;
            }
            if (t && t.id === 'tamanio-grupo') {
                recalcNumeroGrupos();
                schedulePickerIframeRefreshFromForm();
                var fdTg = new FormData(form);
                var faTg = fdTg.getAll('fechas[]') || [];
                if (faTg.length >= 1) actualizarBloqueComida(faTg.length, faTg);
            }
            actualizarResumen();
        });
        form.addEventListener('input', function (e) {
            var t = e.target;
            if (t && t.id === 'tamanio-grupo') {
                recalcNumeroGrupos();
                schedulePickerIframeRefreshFromForm();
                var fdTg2 = new FormData(form);
                var faTg2 = fdTg2.getAll('fechas[]') || [];
                if (faTg2.length >= 1) actualizarBloqueComida(faTg2.length, faTg2);
            }
            if (t && t.matches && t.matches('#tamanio-grupo, #hora-salida, #handicap-grupo, .ancillary-counter, .comida-comensales-counter, input[name^="hora_salida"]')) actualizarResumen();
        });
        form.addEventListener('click', function (e) {
            var clubBtn = e.target.closest('.comida-elegir-club');
            if (clubBtn && form.contains(clubBtn)) {
                e.preventDefault();
                var diaClub = clubBtn.getAttribute('data-dia');
                var menuId = clubBtn.getAttribute('data-menu');
                if (diaClub && menuId) seleccionarMenuClub(diaClub, menuId);
                return;
            }
            var abrir = e.target.closest('.comida-abrir-picker');
            if (abrir && form.contains(abrir)) {
                e.preventDefault();
                var dia = abrir.getAttribute('data-dia');
                if (dia) openComidaPickerPanel(dia);
                return;
            }
            var q = e.target.closest('.comida-chip-quitar');
            if (q && form.contains(q)) {
                e.preventDefault();
                var d = q.getAttribute('data-dia');
                if (!d) return;
                aplicarSeleccionComidaDia(d, { opcion: '', menuId: '', restId: '', zona: '', comensales: '' });
                var fdq = new FormData(form);
                var fa = fdq.getAll('fechas[]') || [];
                actualizarBloqueComida(fa.length, fa);
                actualizarResumen();
            }
        });
        window.actualizarResumen = actualizarResumen;
        document.addEventListener('i18n:changed', function () {
            if (typeof actualizarResumen === 'function') actualizarResumen();
            if (form && ancillaryPorDiaContainer) {
                var fdi = new FormData(form);
                var ni = (fdi.getAll('fechas[]') || []).length;
                if (ni >= 1) actualizarBloqueAncillaryPorDia(ni, fdi.getAll('fechas[]') || []);
            }
        });
        recalcNumeroGrupos();
        if (!window.__golfLermaPaqueteMsgBound) {
            window.__golfLermaPaqueteMsgBound = true;
            window.addEventListener('message', onPaqueteWindowMessage);
        }
    }

    function recalcNumeroGrupos() {
        var tg = document.getElementById('tamanio-grupo');
        var out = document.getElementById('numero-grupos-output');
        var hid = document.getElementById('numero-grupos');
        if (!tg) return;
        var n = parseInt(tg.value, 10);
        var val = (n >= 1) ? String(Math.ceil(n / 4)) : '';
        if (out) out.textContent = val;
        if (hid) hid.value = val;
        if (typeof actualizarResumen === 'function') actualizarResumen();
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
                if ((formData.get('comida_opcion_dia_' + ic) || '').trim()) numServicios++;
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
                var opc = (formData.get('comida_opcion_dia_' + iv) || '').trim();
                if (opc.indexOf('club:') !== 0) continue;
                var menuId = (formData.get('comida_menu_id_' + iv) || opc.replace(/^club:/, '')).trim();
                var menu = typeof window.getCasaClubMenuById === 'function' ? window.getCasaClubMenuById(menuId) : null;
                if (menu && menu.precioPorPersona != null) {
                    var paxMenu = Math.max(1, parseInt(formData.get('comida_comensales_dia_' + iv) || '', 10) || numParticipants);
                    totalComidaPrepago += Number(menu.precioPorPersona) * paxMenu;
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
                var opcD = (formData.get('comida_opcion_dia_' + icd) || '').trim();
                if (!opcD) continue;
                var itemComida = {
                    dia: icd,
                    opcion: opcD,
                    menuId: (formData.get('comida_menu_id_' + icd) || '').trim() || null,
                    restId: (formData.get('comida_rest_id_' + icd) || '').trim() || null,
                };
                if (opcD.indexOf('club:') === 0) {
                    itemComida.comensales = Math.max(1, parseInt(formData.get('comida_comensales_dia_' + icd) || '', 10) || numParticipantes);
                }
                comidaPorDia.push(itemComida);
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
    }
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.resumen-mobile-wrapper').forEach(function (wrapper) {
            cloneReservarIntoBar(wrapper);
        });
        var tab = document.getElementById('resumen-mobile-tab');
        var wrapper = tab && tab.closest('.resumen-mobile-wrapper');
        if (tab && wrapper) {
            function toggle() {
                wrapper.classList.toggle('expanded');
                tab.setAttribute('aria-expanded', wrapper.classList.contains('expanded'));
            }
            tab.addEventListener('click', toggle);
            tab.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
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
            span.textContent = '· ' + (Number(val) === 0 ? 'Consultar' : val + ' €');
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

    // Actualizar datos del tiempo cada 5 minutos
    setInterval(updateTiempoData, 300000);
});

