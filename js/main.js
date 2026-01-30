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

// Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (nav && nav.classList.contains('active')) {
        if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    }
});

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

// Configurador de Paquete Fin de Semana
var HOTELES_OPTS = {
    lerma: [
        { v: 'alisa', l: 'Hotel Alisa', p: 65 },
        { v: 'ceres', l: 'Hotel CERES', p: 70 },
        { v: 'parador', l: 'Parador de Lerma', p: 95 }
    ],
    burgos: [
        { v: 'silken', l: 'Silken', p: 55 },
        { v: 'palacio-blasones', l: 'Palacio de los Blasones', p: 60 },
        { v: 'hotel-centro', l: 'Hotel Centro', p: 50 }
    ]
};
var HOTELES_LABELS = {
    lerma: { alisa: 'Hotel Alisa', ceres: 'Hotel CERES', parador: 'Parador de Lerma' },
    burgos: { silken: 'Silken', 'palacio-blasones': 'Palacio de los Blasones', 'hotel-centro': 'Hotel Centro' }
};

var PRECIO_GF_PACK = 90;
var PRECIO_GF_BASE_LABORABLE = 45;   // cuando no hay correspondencia, día entre semana
var PRECIO_GF_BASE_FINSEMANA = 45;   // cuando no hay correspondencia, sáb/dom
var PRECIO_ALOJ_POR_NOCHE = 65;
var PRECIO_COMIDA = 22;
var PRECIO_SERVICIO_BURGOS = 25;   // dummy: comida/cena en Burgos
var DESCUENTO_PACK_PORC = 15;

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
        var label = (clubId === 'sin' || !clubId) ? 'Sin correspondencia' : (typeof getClubById === 'function' && getClubById(clubId)) ? getClubById(clubId).nombre : clubId;
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

    function generarCamposPorDiaFinSemana(numDias) {
        if (!diasCamposContainerFinSemana) return;
        var prev = {};
        for (var i = 1; i <= numDias; i++) {
            var sel = form && form.querySelector('select[name="campo-dia-' + i + '"]');
            if (sel && sel.value) prev[i] = sel.value;
        }
        diasCamposContainerFinSemana.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var saved = prev[i] || '';
            var item = document.createElement('div');
            item.className = 'campos-dias-item';
            item.innerHTML = [
                '<label for="campo-dia-' + i + '-sel">Día ' + i + '</label>',
                '<select id="campo-dia-' + i + '-sel" name="campo-dia-' + i + '" required>',
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
        var lbl = (HOTELES_LABELS[c] || {})[h];
        return lbl ? lbl + ' (' + (c === 'lerma' ? 'Lerma' : 'Burgos') + ')' : val;
    }

    function refillHotelSelect(i, ciudad) {
        var sel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
        if (!sel) return;
        var kept = sel.value;
        var opts = [{ v: '', l: 'Sin reserva' }];
        if (ciudad === 'lerma' || ciudad === 'burgos') {
            var arr = HOTELES_OPTS[ciudad] || [];
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
                var arr = HOTELES_OPTS[savedL] || [];
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
                '<select id="lugar-noche-' + i + '" name="lugar-noche-' + i + '" required aria-label="Lugar noche ' + i + '">' + lugarOpts + '</select>',
                '</div>',
                '<div class="hotel-noche-par">',
                '<label for="hotel-noche-' + i + '">Hotel</label>',
                '<select id="hotel-noche-' + i + '" name="hotel-noche-' + i + '" required aria-label="Hotel noche ' + i + '">' + hotelOptHtml + '</select>',
                '</div>'
            ].join('');
            hotelesPorNocheContainer.appendChild(item);
        }
    }

    function actualizarBloqueHotel() {
        var noches = parseInt(((form && form.querySelector('input[name="noches"]')) || {}).value || '0', 10);
        if (noches >= 1) {
            if (hotelPorNocheBlock) hotelPorNocheBlock.style.display = 'block';
            generarHotelesPorNoche(noches);
        } else {
            if (hotelPorNocheBlock) hotelPorNocheBlock.style.display = 'none';
        }
    }

    function formatearFechaComida(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso + 'T12:00:00');
            return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch (e) { return ''; }
    }

    function actualizarBloqueComida(count, fechas) {
        fechas = fechas || [];
        if (comidaSinFechas) comidaSinFechas.style.display = count >= 1 ? 'none' : 'block';
        if (!comidaPorDiaContainer) return;
        if (count < 1) {
            comidaPorDiaContainer.style.display = 'none';
            comidaPorDiaContainer.innerHTML = '';
            return;
        }
        var prevComida = {}, prevCena = {};
        for (var i = 1; i <= count; i++) {
            var sc = form && form.querySelector('select[name="comida_dia_' + i + '"]');
            var sv = form && form.querySelector('select[name="cena_dia_' + i + '"]');
            if (sc && sc.value) prevComida[i] = sc.value;
            if (sv && sv.value) prevCena[i] = sv.value;
        }
        comidaPorDiaContainer.style.display = 'block';
        comidaPorDiaContainer.innerHTML = '';
        for (var i = 1; i <= count; i++) {
            var fechaStr = formatearFechaComida(fechas[i - 1]);
            var titulo = 'Día ' + i + (fechaStr ? ' <span class="comida-dia-fecha">(' + fechaStr + ')</span>' : '');
            var optComida = '<option value="">Sin reserva</option><option value="lerma"' + (prevComida[i] === 'lerma' ? ' selected' : '') + '>Lerma · Club Social Golf Lerma · ' + PRECIO_COMIDA + ' €</option><option value="burgos"' + (prevComida[i] === 'burgos' ? ' selected' : '') + '>Burgos · Restaurantes · ' + PRECIO_SERVICIO_BURGOS + ' €</option>';
            var optCena = '<option value="">Sin reserva</option><option value="lerma"' + (prevCena[i] === 'lerma' ? ' selected' : '') + '>Lerma · Club Social Golf Lerma · ' + PRECIO_COMIDA + ' €</option><option value="burgos"' + (prevCena[i] === 'burgos' ? ' selected' : '') + '>Burgos · Restaurantes · ' + PRECIO_SERVICIO_BURGOS + ' €</option>';
            var block = document.createElement('div');
            block.className = 'comida-dia-block';
            block.innerHTML = '<div class="comida-dia-titulo">' + titulo + '</div><div class="comida-dia-campos"><div class="form-group-inline"><label>Comida</label><select name="comida_dia_' + i + '">' + optComida + '</select></div><div class="form-group-inline"><label>Cena</label><select name="cena_dia_' + i + '">' + optCena + '</select></div></div>';
            comidaPorDiaContainer.appendChild(block);
        }
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
                    if (count >= 2) {
                        configuradorHotelWrap.style.display = 'block';
                        actualizarBloqueHotel();
                    } else {
                        configuradorHotelWrap.style.display = 'none';
                        if (hotelPorNocheBlock) hotelPorNocheBlock.style.display = 'none';
                    }
                }
                actualizarBloqueComida(count, fechas || []);
                if (typeof actualizarResumen === 'function') actualizarResumen();
            }
        });
    }

    if (form) {
        form.addEventListener('change', function (e) {
            var t = e.target;
            if (t && t.name && t.name.indexOf('lugar-noche-') === 0) {
                var i = parseInt(t.name.replace('lugar-noche-', ''), 10);
                if (i >= 1) refillHotelSelect(i, t.value || '');
                return;
            }
            if (t && t.id === 'tamanio-grupo') recalcNumeroGrupos();
            actualizarResumen();
        });
        form.addEventListener('input', function (e) {
            var t = e.target;
            if (t && t.id === 'tamanio-grupo') recalcNumeroGrupos();
            if (t && t.matches && t.matches('#tamanio-grupo, #hora-salida, #handicap-grupo')) actualizarResumen();
        });
        window.actualizarResumen = actualizarResumen;
        recalcNumeroGrupos();
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

        var necesitaHotel = count >= 2;
        var hotelOk = !necesitaHotel || (function () {
            var n = parseInt(noches || '0', 10);
            for (var i = 1; i <= n; i++) { if (!formData.get('hotel-noche-' + i)) return false; }
            return true;
        })();

        var nNoches = parseInt(noches || '0', 10);
        if (nNoches >= 1) {
            var resumenHTML = '<div class="resumen-items">';
            resumenHTML += '<p><strong>Noches:</strong> ' + noches + ' ' + (noches === '1' ? 'noche' : 'noches') + '</p>';
            resumenHTML += '<p><strong>Green Fees incluidos:</strong> 1 en Golf Lerma + 1 en Saldaña Golf <em>(por persona)</em></p>';

            var fechas = formData.getAll('fechas[]');
            if (fechas && fechas.length > 0) {
                for (var i = 1; i <= fechas.length; i++) {
                    var c = formData.get('campo-dia-' + i);
                    if (c) resumenHTML += '<p><strong>Día ' + i + ':</strong> ' + (c === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf') + '</p>';
                }
            }

            if (necesitaHotel && hotelOk) {
                var n = parseInt(noches || '0', 10);
                var parts = [];
                for (var i = 1; i <= n; i++) {
                    var v = formData.get('hotel-noche-' + i);
                    if (v) parts.push('Noche ' + i + ': ' + getHotelLabelFromValue(v));
                }
                if (parts.length) resumenHTML += '<p><strong>Alojamiento:</strong> ' + parts.join('. ') + '</p>';
            }

            var partesComida = [];
            var numServicios = 0;
            for (var ic = 1; ic <= count; ic++) {
                var com = (formData.get('comida_dia_' + ic) || '').trim();
                var cen = (formData.get('cena_dia_' + ic) || '').trim();
                var labCom = (com === 'lerma' ? 'Lerma' : com === 'burgos' ? 'Burgos' : '');
                var labCen = (cen === 'lerma' ? 'Lerma' : cen === 'burgos' ? 'Burgos' : '');
                if (labCom || labCen) {
                    var p = 'Día ' + ic + ':';
                    if (labCom) { p += ' Comida ' + labCom; numServicios++; }
                    if (labCen) { p += (labCom ? ', ' : '') + 'Cena ' + labCen; numServicios++; }
                    partesComida.push(p);
                }
            }
            if (partesComida.length) resumenHTML += '<p><strong>Comidas / cenas:</strong> ' + partesComida.join('. ') + '</p>';

            var tg = (formData.get('tamanio_grupo') || '').trim();
            var hs = (formData.get('hora_salida') || '').trim();
            var ng = (formData.get('numero_grupos') || '').trim();
            if (tg || hs || ng) {
                var partsInit = [];
                if (tg) partsInit.push('Tamaño del grupo: ' + tg);
                if (hs) partsInit.push('Hora de salida: ' + hs);
                if (ng) partsInit.push('Nº de grupos: ' + ng);
                resumenHTML += '<p><strong>Reserva:</strong> ' + partsInit.join(' · ') + '</p>';
            }

            var usuarios = form.querySelectorAll('.usuario-form');
            if (usuarios.length > 0) resumenHTML += '<p><strong>Número de participantes:</strong> ' + usuarios.length + '</p>';
            var grupos = getCorrespondenciaGrupos(form);
            if (grupos.length > 0) resumenHTML += '<p><strong>Correspondencias (grupos):</strong> ' + grupos.map(function (g) { return g.cantidad + ' × ' + g.label; }).join(', ') + '</p>';
            var hg = (formData.get('handicap_grupo') || '').trim();
            if (hg) resumenHTML += '<p><strong>Handicap del grupo (orientativo):</strong> ' + hg + '</p>';
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
            var totalGF = 0;
            var numGF = Math.min(2, fechasGF.length);
            var tieneCorrespondencia = false;
            for (var idx = 0; idx < numGF; idx++) {
                var iso = fechasGF[idx];
                if (!iso) continue;
                var d = new Date(iso + 'T12:00:00');
                var dow = d.getDay();
                var esFinDeSemana = (dow === 0 || dow === 6);
                var p = null;
                // MANTENER LÓGICA DE CORRESPONDENCIA CORRECTA
                if (clubId && typeof getPrecioGreenFee === 'function') {
                    p = getPrecioGreenFee(clubId, esFinDeSemana ? 'saldana' : 'lerma');
                    if (p != null) tieneCorrespondencia = true;
                }
                // Si hay correspondencia, usar precio real; si no, usar dummy
                if (p == null) p = esFinDeSemana ? 50 : 50; // dummy: 50€ base
                totalGF += p;
            }
            if (numGF === 0) totalGF = 100; // dummy: 100€ pack base
            var gf = totalGF * numParticipants;

            // DUMMY: usar números ficticios para alojamiento
            var aloj = (necesitaHotel && hotelOk) ? (nNoches * 75) : 0; // dummy: 75€/noche

            var numServicios = 0;
            for (var iv = 1; iv <= count; iv++) {
                var cv = (formData.get('comida_dia_' + iv) || '').trim();
                var cev = (formData.get('cena_dia_' + iv) || '').trim();
                if (cv === 'lerma' || cv === 'burgos') numServicios++;
                if (cev === 'lerma' || cev === 'burgos') numServicios++;
            }
            // DUMMY: usar números ficticios para comidas
            var comidaVal = numServicios * 25 * numParticipants; // dummy: 25€/servicio

            var base = gf + aloj + comidaVal;
            // Si hay correspondencia, calcular descuento sobre base real; si no, usar dummy
            var desc = tieneCorrespondencia ? Math.round(base * DESCUENTO_PACK_PORC / 100) : Math.round(base * 0.12); // dummy: 12% si no hay correspondencia
            var subtotal = base - desc;

            resumenHTML += '<div class="resumen-subtotal">';
            resumenHTML += '<table class="resumen-subtotal-tabla">';
            resumenHTML += '<tr><td>Green fees (' + (numGF > 0 ? numGF : 2) + (numParticipants > 1 ? ' × ' + numParticipants + ' pers.' : '') + ')</td><td>' + gf + ' €</td></tr>';
            if (necesitaHotel) {
                resumenHTML += '<tr><td>Alojamiento (' + nNoches + ' ' + (nNoches === 1 ? 'noche' : 'noches') + ')</td><td>' + (hotelOk ? (aloj + ' €') : '—') + '</td></tr>';
            }
            resumenHTML += '<tr><td>Comidas y cenas' + (comidaVal > 0 ? ' (' + numServicios + (numParticipants > 1 ? ' × ' + numParticipants + ' pers.' : '') + ')' : '') + '</td><td>' + (comidaVal > 0 ? comidaVal + ' €' : '—') + '</td></tr>';
            resumenHTML += '<tr class="resumen-descuento"><td>Descuento pack (-' + DESCUENTO_PACK_PORC + '%)</td><td>-' + desc + ' €</td></tr>';
            resumenHTML += '<tr class="resumen-total"><td>Subtotal</td><td>' + subtotal + ' €</td></tr>';
            if (numParticipants > 1) {
                resumenHTML += '<tr class="resumen-por-persona"><td>Importe por persona (' + numParticipants + ')</td><td>' + (Math.round((subtotal / numParticipants) * 100) / 100) + ' €</td></tr>';
            }
            resumenHTML += '</table>';
            resumenHTML += '<p class="resumen-subtotal-nota">Descuento por pack aplicado.' + (clubId ? ' Tarifa correspondencia aplicada según día de la semana.' : '') + ' Forma de pago: ' + (formaPago === 'por_persona' ? 'por persona (enlaces individuales).' : 'único.') + '</p></div>';

            resumenDiv.innerHTML = resumenHTML;
        } else {
            resumenDiv.innerHTML = '<p>Completa las opciones para ver el resumen</p>';
        }
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var formData = new FormData(form);
            var noches = formData.get('noches');
            if (!noches || parseInt(noches, 10) < 1) {
                alert('Selecciona al menos una noche en el calendario (elige las fechas de tu estancia).');
                return;
            }
            var fechas = formData.getAll('fechas[]');
            var count = (fechas || []).length;
            if (count >= 2) {
                var n = parseInt(noches, 10);
                for (var i = 1; i <= n; i++) {
                    if (!formData.get('hotel-noche-' + i)) {
                        alert('Selecciona un hotel para cada noche.');
                        return;
                    }
                }
            }

            var camposPorDia = {};
            if (fechas) for (var i = 1; i <= fechas.length; i++) {
                var c = formData.get('campo-dia-' + i);
                if (c) camposPorDia[i] = c;
            }
            var hotelPorNoche = {};
            if (count >= 2) {
                var n = parseInt(noches, 10);
                for (var i = 1; i <= n; i++) { hotelPorNoche[i] = formData.get('hotel-noche-' + i); }
            }
            var corresGrupos = getCorrespondenciaGrupos(form);
            var comidaPorDia = [];
            for (var icd = 1; icd <= count; icd++) {
                var cpd = (formData.get('comida_dia_' + icd) || '').trim();
                var cnd = (formData.get('cena_dia_' + icd) || '').trim();
                if (cpd || cnd) comidaPorDia.push({ dia: icd, comida: cpd || null, cena: cnd || null });
            }
            var formaPagoSubmit = ((formData.get('forma_pago') || 'unico').trim() || 'unico');
            var datos = {
                noches: noches,
                fechas: fechas,
                camposPorDia: camposPorDia,
                hotelPorNoche: hotelPorNoche,
                comidaPorDia: comidaPorDia,
                correspondenciaGrupos: corresGrupos,
                tamanioGrupo: (formData.get('tamanio_grupo') || '').trim() || null,
                horaSalida: (formData.get('hora_salida') || '').trim() || null,
                numeroGrupos: (formData.get('numero_grupos') || '').trim() || null,
                formaPago: formaPagoSubmit,
                handicapGrupo: (formData.get('handicap_grupo') || '').trim() || null
            };

            var msg = '¡Paquete configurado! Te contactaremos pronto para confirmar tu reserva.\n\nNoches: ' + datos.noches + '\n';
            if (count >= 2 && Object.keys(hotelPorNoche).length > 0) {
                var partsAloj = [];
                for (var k in hotelPorNoche) { partsAloj.push('Noche ' + k + ': ' + getHotelLabelFromValue(hotelPorNoche[k])); }
                msg += 'Alojamiento: ' + partsAloj.join('. ') + '\n';
            }
            if (comidaPorDia.length > 0) {
                var partsCom = comidaPorDia.map(function (x) {
                    var t = 'Día ' + x.dia + ':';
                    if (x.comida) t += ' Comida ' + (x.comida === 'lerma' ? 'Lerma' : 'Burgos');
                    if (x.cena) t += (x.comida ? ', ' : '') + 'Cena ' + (x.cena === 'lerma' ? 'Lerma' : 'Burgos');
                    return t;
                });
                msg += 'Comidas y cenas: ' + partsCom.join('. ') + '\n';
            }
            if (datos.tamanioGrupo || datos.horaSalida || datos.numeroGrupos) {
                var extras = [];
                if (datos.tamanioGrupo) extras.push('Tamaño grupo: ' + datos.tamanioGrupo);
                if (datos.horaSalida) extras.push('Hora salida: ' + datos.horaSalida);
                if (datos.numeroGrupos) extras.push('Nº grupos: ' + datos.numeroGrupos);
                msg += '\n' + extras.join(' · ');
            }
            msg += '\nForma de pago: ' + (formaPagoSubmit === 'por_persona' ? 'Pago por persona (cada uno recibirá un enlace para abonar su parte)' : 'Pago único');
            if (datos.handicapGrupo) msg += '\nHandicap del grupo (orientativo): ' + datos.handicapGrupo;
            if (corresGrupos.length > 0) msg += '\nCorrespondencias: ' + corresGrupos.map(function (g) { return g.cantidad + ' × ' + g.label; }).join(', ');
            alert(msg);
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    highlightNavigation();
    initHeroSlider();
    updateTiempoData();
    loadCamaraLive();
    initConfiguradorPaquete();
    
    // Actualizar datos del tiempo cada 5 minutos
    setInterval(updateTiempoData, 300000);
});

