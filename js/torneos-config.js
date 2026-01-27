// Configurador de Torneos
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    var calendarioContainer = document.getElementById('calendario-dias-torneos');
    if (calendarioContainer && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameDias: 'dias-torneo',
            nameFechas: 'fechas[]',
            nameFechaPrimera: 'fecha',
            maxSeleccion: 14,
            onChange: function () { actualizarResumenTorneo(); }
        });
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
        var fechas = formData.getAll('fechas[]');
        var fechaPrimera = formData.get('fecha');
        if ((!fechas || fechas.length === 0) && !fechaPrimera) {
            alert('Selecciona al menos una fecha en el calendario.');
            return;
        }
        
        // Aquí puedes agregar la lógica para enviar los datos
        alert('¡Solicitud de torneo enviada correctamente! Nos pondremos en contacto contigo pronto.');
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

    var fechas = formData.getAll('fechas[]');
    var fecha = formData.get('fecha');
    if (fechas && fechas.length > 0) {
        if (fechas.length === 1) {
            var d = new Date(fechas[0] + 'T00:00:00');
            resumenHTML += '<p><strong>Fecha:</strong> ' + d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
        } else {
            resumenHTML += '<p><strong>Fechas:</strong> ' + fechas.length + ' días</p>';
            resumenHTML += '<ul>';
            fechas.forEach(function (f) {
                var d = new Date(f + 'T00:00:00');
                resumenHTML += '<li>' + d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + '</li>';
            });
            resumenHTML += '</ul>';
        }
    } else if (fecha) {
        var d = new Date(fecha + 'T00:00:00');
        resumenHTML += '<p><strong>Fecha:</strong> ' + d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    }

    if (modalidad) {
        const modalidades = {
            'golf': 'Golf',
            'frisbee-golf': 'Frisbee Golf',
            'foot-golf': 'Foot Golf',
            'disc-golf': 'Disc Golf',
            'pitch-putt': 'Pitch and Putt'
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
