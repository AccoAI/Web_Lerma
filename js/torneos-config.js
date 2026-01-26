// Configurador de Torneos
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    // Establecer fecha mínima como hoy
    const fechaInput = document.getElementById('fecha-torneo');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.setAttribute('min', today);
    }

    // Inicializar formulario de usuarios
    if (typeof initUsuariosForm === 'function') {
        initUsuariosForm();
    }

    // Actualizar resumen cuando cambien los campos
    form.addEventListener('change', actualizarResumenTorneo);
    form.addEventListener('input', actualizarResumenTorneo);

    // Manejar envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Aquí puedes agregar la lógica para enviar los datos
        alert('¡Solicitud de torneo enviada correctamente! Nos pondremos en contacto contigo pronto.');
        form.reset();
        actualizarResumenTorneo();
    });

    // Actualizar resumen inicial
    actualizarResumenTorneo();
});

function actualizarResumenTorneo() {
    const form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    const resumenDetalle = document.getElementById('resumen-detalle');
    if (!resumenDetalle) return;

    const formData = new FormData(form);
    const jugadores = formData.get('jugadores');
    const fecha = formData.get('fecha');
    const modalidad = formData.get('modalidad');

    let resumenHTML = '';

    if (jugadores) {
        resumenHTML += `<p><strong>Número de jugadores:</strong> ${jugadores}</p>`;
    }

    if (fecha) {
        const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        resumenHTML += `<p><strong>Fecha:</strong> ${fechaFormateada}</p>`;
    }

    if (modalidad) {
        const modalidades = {
            'golf': 'Golf',
            'frisbee-golf': 'Frisbee Golf',
            'foot-golf': 'Foot Golf',
            'disc-golf': 'Disc Golf'
        };
        resumenHTML += `<p><strong>Modalidad:</strong> ${modalidades[modalidad] || modalidad}</p>`;
    }

    // Agregar información de participantes
    const usuariosForms = document.querySelectorAll('.usuario-form');
    if (usuariosForms.length > 0) {
        resumenHTML += `<p><strong>Número de participantes registrados:</strong> ${usuariosForms.length}</p>`;
    }

    if (!resumenHTML) {
        resumenHTML = '<p>Completa el formulario para ver el resumen</p>';
    }

    resumenDetalle.innerHTML = resumenHTML;
}
