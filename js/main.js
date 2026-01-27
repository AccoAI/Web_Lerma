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
        if (window.innerWidth <= 968) {
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

// Cámara del Tiempo - Temperatura y viento desde Open-Meteo (Quintanilla de la Mata o Lerma)
async function updateTiempoData() {
    const temperatura = document.getElementById('temperatura');
    const viento = document.getElementById('viento');
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
        var w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,wind_speed_10m&timezone=Europe%2FMadrid');
        var wData = await w.json();
        if (wData.current) {
            temperatura.textContent = Math.round(wData.current.temperature_2m) + '°C';
            viento.textContent = Math.round(wData.current.wind_speed_10m) + ' km/h';
        }
        if (origen) origen.textContent = 'Datos: ' + placeName;
    } catch (e) {
        if (origen) origen.textContent = 'Datos: no disponibles';
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
function initConfiguradorPaquete() {
    const form = document.getElementById('configuradorForm');
    const resumenDiv = document.getElementById('resumen-paquete');
    const hotelLermaRadio = document.getElementById('hotel-lerma');
    const hotelBurgosRadio = document.getElementById('hotel-burgos');
    const hotelesLermaList = document.getElementById('hoteles-lerma-list');
    const hotelesBurgosList = document.getElementById('hoteles-burgos-list');

    // Mostrar/ocultar hoteles según selección
    if (hotelLermaRadio && hotelBurgosRadio) {
        hotelLermaRadio.addEventListener('change', () => {
            if (hotelLermaRadio.checked) {
                hotelesLermaList.style.display = 'grid';
                hotelesBurgosList.style.display = 'none';
            }
        });

        hotelBurgosRadio.addEventListener('change', () => {
            if (hotelBurgosRadio.checked) {
                hotelesLermaList.style.display = 'none';
                hotelesBurgosList.style.display = 'block';
            }
        });
    }

    // Actualizar resumen cuando cambian las opciones
    if (form) {
        const inputs = form.querySelectorAll('input[type="radio"]');
        inputs.forEach(input => {
            input.addEventListener('change', actualizarResumen);
        });
    }

    function actualizarResumen() {
        const formData = new FormData(form);
        const noches = formData.get('noches');
        const hotel = formData.get('hotel');
        const comida = formData.get('comida');

        if (noches && hotel && comida) {
            let resumenHTML = '<div class="resumen-items">';
            
            resumenHTML += `<p><strong>Noches:</strong> ${noches} ${noches === '1' ? 'noche' : 'noches'}</p>`;
            resumenHTML += '<p><strong>Green Fees incluidos:</strong> 1 en Golf Lerma + 1 en Saldaña Golf</p>';
            
            if (hotel === 'lerma') {
                resumenHTML += '<p><strong>Hotel:</strong> En Lerma (Hotel Alisa, CERES o Parador)</p>';
            } else {
                resumenHTML += '<p><strong>Hotel:</strong> En Burgos (a elegir)</p>';
            }
            
            if (comida === 'lerma') {
                resumenHTML += '<p><strong>Comida:</strong> Club Social Golf Lerma</p>';
            } else {
                resumenHTML += '<p><strong>Comida:</strong> Restaurantes en Burgos</p>';
            }
            
            // Agregar información de usuarios
            const usuarios = form.querySelectorAll('.usuario-form');
            if (usuarios.length > 0) {
                resumenHTML += `<p><strong>Número de participantes:</strong> ${usuarios.length}</p>`;
            }
            
            resumenHTML += '</div>';
            resumenDiv.innerHTML = resumenHTML;
        } else {
            resumenDiv.innerHTML = '<p>Completa las opciones para ver el resumen</p>';
        }
    }

    // Manejar envío del formulario
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const datos = {
                noches: formData.get('noches'),
                hotel: formData.get('hotel'),
                comida: formData.get('comida')
            };
            
            // Aquí puedes enviar los datos a tu backend o mostrar un mensaje
            alert('¡Paquete configurado! Te contactaremos pronto para confirmar tu reserva.\n\n' +
                  `Noches: ${datos.noches}\n` +
                  `Hotel: ${datos.hotel === 'lerma' ? 'Lerma' : 'Burgos'}\n` +
                  `Comida: ${datos.comida === 'lerma' ? 'Club Social Lerma' : 'Burgos'}`);
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

