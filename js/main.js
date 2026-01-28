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
        if (window.innerWidth <= 1100) {
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
    lerma: [{ v: 'alisa', l: 'Hotel Alisa' }, { v: 'ceres', l: 'Hotel CERES' }, { v: 'parador', l: 'Parador de Lerma' }],
    burgos: [{ v: 'silken', l: 'Silken' }, { v: 'palacio-blasones', l: 'Palacio de los Blasones' }, { v: 'hotel-centro', l: 'Hotel Centro' }]
};
var HOTELES_LABELS = {
    lerma: { alisa: 'Hotel Alisa', ceres: 'Hotel CERES', parador: 'Parador de Lerma' },
    burgos: { silken: 'Silken', 'palacio-blasones': 'Palacio de los Blasones', 'hotel-centro': 'Hotel Centro' }
};

var PRECIO_GF_PACK = 90;
var PRECIO_ALOJ_POR_NOCHE = 65;
var PRECIO_COMIDA = 22;
var DESCUENTO_PACK_PORC = 15;

function initConfiguradorPaquete() {
    var form = document.getElementById('configuradorForm');
    var resumenDiv = document.getElementById('resumen-paquete');
    var calendarioContainer = document.getElementById('calendario-dias-finsemana');
    var camposDiasFinSemana = document.getElementById('campos-dias-finsemana');
    var diasCamposContainerFinSemana = document.getElementById('dias-campos-container-finsemana');
    var configuradorHotelWrap = document.getElementById('configurador-hotel-wrap');
    var hotelPorNocheBlock = document.getElementById('hotel-por-noche-block');
    var hotelesPorNocheContainer = document.getElementById('hoteles-por-noche-container');

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
                '<option value="">—</option>',
                '<option value="lerma"' + (saved === 'lerma' ? ' selected' : '') + '>Golf Lerma</option>',
                '<option value="saldana"' + (saved === 'saldana' ? ' selected' : '') + '>Saldaña Golf</option>',
                '</select>'
            ].join('');
            diasCamposContainerFinSemana.appendChild(item);
        }
    }

    function generarHotelesPorNoche(n, ciudad) {
        if (!hotelesPorNocheContainer) return;
        var opts = HOTELES_OPTS[ciudad] || [];
        var prev = {};
        for (var i = 1; i <= n; i++) {
            var sel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
            if (sel && sel.value && opts.some(function (o) { return o.v === sel.value; })) prev[i] = sel.value;
        }
        hotelesPorNocheContainer.innerHTML = '';
        for (var i = 1; i <= n; i++) {
            var saved = prev[i] || '';
            var item = document.createElement('div');
            item.className = 'campos-dias-item hoteles-por-noche-item';
            var optHtml = '<option value="">—</option>';
            for (var j = 0; j < opts.length; j++) {
                optHtml += '<option value="' + opts[j].v + '"' + (saved === opts[j].v ? ' selected' : '') + '>' + opts[j].l + '</option>';
            }
            item.innerHTML = [
                '<label for="hotel-noche-' + i + '-sel">Noche ' + i + '</label>',
                '<select id="hotel-noche-' + i + '-sel" name="hotel-noche-' + i + '" required>' + optHtml + '</select>'
            ].join('');
            hotelesPorNocheContainer.appendChild(item);
        }
    }

    function actualizarBloqueHotel() {
        var ciudadEl = form && form.querySelector('input[name="hotel-ciudad"]:checked');
        var ciudad = ciudadEl ? ciudadEl.value : null;
        var noches = parseInt(((form && form.querySelector('input[name="noches"]')) || {}).value || '0', 10);
        if (ciudad && noches >= 1) {
            hotelPorNocheBlock.style.display = 'block';
            generarHotelesPorNoche(noches, ciudad);
        } else {
            hotelPorNocheBlock.style.display = 'none';
        }
    }

    if (calendarioContainer && form && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameFechas: 'fechas[]',
            nameNoches: 'noches',
            maxSeleccion: 7,
            onChange: function (count) {
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
                if (typeof actualizarResumen === 'function') actualizarResumen();
            }
        });
    }

    if (form) {
        form.addEventListener('change', function (e) {
            if (e.target && e.target.getAttribute('name') === 'hotel-ciudad') actualizarBloqueHotel();
            actualizarResumen();
        });
    }

    function actualizarResumen() {
        var formData = new FormData(form);
        var noches = formData.get('noches');
        var count = (formData.getAll('fechas[]') || []).length;
        var hotelCiudad = formData.get('hotel-ciudad');
        var comida = formData.get('comida');

        var necesitaHotel = count >= 2;
        var hotelOk = !necesitaHotel || (hotelCiudad && (function () {
            var n = parseInt(noches || '0', 10);
            for (var i = 1; i <= n; i++) { if (!formData.get('hotel-noche-' + i)) return false; }
            return true;
        })());

        var nNoches = parseInt(noches || '0', 10);
        if (nNoches >= 1) {
            var resumenHTML = '<div class="resumen-items">';
            resumenHTML += '<p><strong>Noches:</strong> ' + noches + ' ' + (noches === '1' ? 'noche' : 'noches') + '</p>';
            resumenHTML += '<p><strong>Green Fees incluidos:</strong> 1 en Golf Lerma + 1 en Saldaña Golf</p>';

            var fechas = formData.getAll('fechas[]');
            if (fechas && fechas.length > 0) {
                for (var i = 1; i <= fechas.length; i++) {
                    var c = formData.get('campo-dia-' + i);
                    if (c) resumenHTML += '<p><strong>Día ' + i + ':</strong> ' + (c === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf') + '</p>';
                }
            }

            if (necesitaHotel && hotelCiudad) {
                var labels = HOTELES_LABELS[hotelCiudad] || {};
                var n = parseInt(noches || '0', 10);
                var parts = [];
                for (var i = 1; i <= n; i++) {
                    var v = formData.get('hotel-noche-' + i);
                    if (v && labels[v]) parts.push('Noche ' + i + ': ' + labels[v]);
                }
                resumenHTML += '<p><strong>Alojamiento:</strong> ' + (hotelCiudad === 'lerma' ? 'Lerma' : 'Burgos') + '. ' + parts.join('. ') + '</p>';
            }

            resumenHTML += '<p><strong>Comida:</strong> ' + (comida === 'lerma' ? 'Club Social Golf Lerma' : (comida ? 'Restaurantes en Burgos' : '—')) + '</p>';

            var usuarios = form.querySelectorAll('.usuario-form');
            if (usuarios.length > 0) resumenHTML += '<p><strong>Número de participantes:</strong> ' + usuarios.length + '</p>';
            resumenHTML += '</div>';

            var gf = PRECIO_GF_PACK;
            var aloj = (necesitaHotel && hotelOk) ? (nNoches * PRECIO_ALOJ_POR_NOCHE) : 0;
            var comidaVal = comida ? PRECIO_COMIDA : 0;
            var base = gf + aloj + comidaVal;
            var desc = Math.round(base * DESCUENTO_PACK_PORC / 100);
            var subtotal = base - desc;

            resumenHTML += '<div class="resumen-subtotal">';
            resumenHTML += '<table class="resumen-subtotal-tabla">';
            resumenHTML += '<tr><td>Green fees (2)</td><td>' + gf + ' €</td></tr>';
            if (necesitaHotel) {
                resumenHTML += '<tr><td>Alojamiento (' + nNoches + ' ' + (nNoches === 1 ? 'noche' : 'noches') + ')</td><td>' + (hotelOk ? (aloj + ' €') : '—') + '</td></tr>';
            }
            resumenHTML += '<tr><td>Comida</td><td>' + (comida ? comidaVal + ' €' : '—') + '</td></tr>';
            resumenHTML += '<tr class="resumen-descuento"><td>Descuento pack (-' + DESCUENTO_PACK_PORC + '%)</td><td>-' + desc + ' €</td></tr>';
            resumenHTML += '<tr class="resumen-total"><td>Subtotal</td><td>' + subtotal + ' €</td></tr>';
            resumenHTML += '</table>';
            resumenHTML += '<p class="resumen-subtotal-nota">Precios orientativos. Descuento por pack aplicado.</p></div>';

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
                var hotelCiudad = formData.get('hotel-ciudad');
                if (!hotelCiudad) {
                    alert('Indica dónde te alojas: Estancia en Lerma o Estancia en Burgos.');
                    return;
                }
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
            var datos = {
                noches: noches,
                fechas: fechas,
                camposPorDia: camposPorDia,
                hotelCiudad: formData.get('hotel-ciudad'),
                hotelPorNoche: hotelPorNoche,
                comida: formData.get('comida')
            };

            var msg = '¡Paquete configurado! Te contactaremos pronto para confirmar tu reserva.\n\nNoches: ' + datos.noches + '\n';
            if (count >= 2 && datos.hotelCiudad) {
                var lbl = HOTELES_LABELS[datos.hotelCiudad] || {};
                var parts = [];
                for (var k in datos.hotelPorNoche) { if (lbl[datos.hotelPorNoche[k]]) parts.push('Noche ' + k + ': ' + lbl[datos.hotelPorNoche[k]]); }
                msg += 'Alojamiento: ' + (datos.hotelCiudad === 'lerma' ? 'Lerma' : 'Burgos') + '. ' + parts.join('. ') + '\n';
            }
            msg += 'Comida: ' + (datos.comida === 'lerma' ? 'Club Social Lerma' : 'Burgos');
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

