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
                // Si es la sección de paquete fin de semana, mostrarla primero
                if (href === '#paquete-fin-semana') {
                    target.classList.add('active');
                }
                
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

// Cámara del Tiempo - Actualizar datos
function updateTiempoData() {
    // Aquí puedes integrar con una API de tiempo real
    // Por ahora, valores de ejemplo
    const temperatura = document.getElementById('temperatura');
    const viento = document.getElementById('viento');
    
    if (temperatura) {
        // Simular datos - reemplazar con API real
        temperatura.textContent = '18°C';
    }
    
    if (viento) {
        // Simular datos - reemplazar con API real
        viento.textContent = '12 km/h';
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    highlightNavigation();
    initHeroSlider();
    updateTiempoData();
    loadCamaraLive();
    
    // Actualizar datos del tiempo cada 5 minutos
    setInterval(updateTiempoData, 300000);
});

