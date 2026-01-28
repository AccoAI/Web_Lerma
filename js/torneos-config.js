// Configurador de Torneos
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    var calendarioContainer = document.getElementById('calendario-dias-torneos');
    var camposDiasTorneos = document.getElementById('campos-dias-torneos');
    var diasCamposContainerTorneos = document.getElementById('dias-campos-container-torneos');
    var configuradorHotelWrapTorneos = document.getElementById('configurador-hotel-wrap-torneos');
    var hotelPorNocheBlockTorneos = document.getElementById('hotel-por-noche-block-torneos');
    var hotelesPorNocheContainerTorneos = document.getElementById('hoteles-por-noche-container-torneos');

    function getHotelLabelFromValueTorneos(val) {
        if (!val || val.indexOf('-') < 0) return val || 'Sin reserva';
        var idx = val.indexOf('-');
        var c = val.substring(0, idx);
        var h = val.substring(idx + 1);
        var lbl = (typeof HOTELES_LABELS !== 'undefined' && HOTELES_LABELS[c]) ? HOTELES_LABELS[c][h] : null;
        return lbl ? lbl + ' (' + (c === 'lerma' ? 'Lerma' : 'Burgos') + ')' : val;
    }

    function generarCamposPorDiaTorneos(numDias) {
        if (!diasCamposContainerTorneos) return;
        var prev = {};
        for (var i = 1; i <= numDias; i++) {
            var sel = form && form.querySelector('select[name="campo-dia-' + i + '"]');
            if (sel && sel.value) prev[i] = sel.value;
        }
        diasCamposContainerTorneos.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var saved = prev[i] || '';
            var item = document.createElement('div');
            item.className = 'campos-dias-item';
            item.innerHTML = [
                '<label for="campo-dia-' + i + '-sel-torneos">Día ' + i + '</label>',
                '<select id="campo-dia-' + i + '-sel-torneos" name="campo-dia-' + i + '" required>',
                '<option value="">Sin reserva</option>',
                '<option value="lerma"' + (saved === 'lerma' ? ' selected' : '') + '>Golf Lerma</option>',
                '<option value="saldana"' + (saved === 'saldana' ? ' selected' : '') + '>Saldaña Golf</option>',
                '</select>'
            ].join('');
            diasCamposContainerTorneos.appendChild(item);
        }
    }

    function refillHotelSelectTorneos(i, ciudad) {
        var sel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
        if (!sel) return;
        var kept = sel.value;
        var opts = [{ v: '', l: 'Sin reserva' }];
        if (ciudad === 'lerma' || ciudad === 'burgos') {
            var arr = (typeof HOTELES_OPTS !== 'undefined' && HOTELES_OPTS[ciudad]) ? HOTELES_OPTS[ciudad] : [];
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
        if (typeof actualizarResumenTorneo === 'function') actualizarResumenTorneo();
    }

    function generarHotelesPorNocheTorneos(n) {
        if (!hotelesPorNocheContainerTorneos) return;
        var prev = {};
        for (var i = 1; i <= n; i++) {
            var hSel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
            var lSel = form && form.querySelector('select[name="lugar-noche-' + i + '"]');
            var h = (hSel && hSel.value) ? hSel.value : '';
            var l = (lSel && lSel.value) ? lSel.value : '';
            if (!l && h && h.indexOf('-') >= 0) l = h.split('-')[0];
            prev[i] = { hotel: h || '', lugar: l || '' };
        }
        hotelesPorNocheContainerTorneos.innerHTML = '';
        for (var i = 1; i <= n; i++) {
            var savedL = prev[i].lugar;
            var savedH = prev[i].hotel;
            var lugarOpts = '<option value="">Sin reserva</option><option value="lerma"' + (savedL === 'lerma' ? ' selected' : '') + '>Lerma</option><option value="burgos"' + (savedL === 'burgos' ? ' selected' : '') + '>Burgos</option>';
            var hotelOpts = [{ v: '', l: 'Sin reserva' }];
            if (savedL === 'lerma' || savedL === 'burgos') {
                var arr = (typeof HOTELES_OPTS !== 'undefined' && HOTELES_OPTS[savedL]) ? HOTELES_OPTS[savedL] : [];
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
                '<label for="lugar-noche-' + i + '-torneos">Lugar</label>',
                '<select id="lugar-noche-' + i + '-torneos" name="lugar-noche-' + i + '" required aria-label="Lugar noche ' + i + '">' + lugarOpts + '</select>',
                '</div>',
                '<div class="hotel-noche-par">',
                '<label for="hotel-noche-' + i + '-torneos">Hotel</label>',
                '<select id="hotel-noche-' + i + '-torneos" name="hotel-noche-' + i + '" required aria-label="Hotel noche ' + i + '">' + hotelOptHtml + '</select>',
                '</div>'
            ].join('');
            hotelesPorNocheContainerTorneos.appendChild(item);
        }
    }

    function actualizarBloqueHotelTorneos() {
        var noches = parseInt(((form && form.querySelector('input[name="noches"]')) || {}).value || '0', 10);
        if (noches >= 1) {
            if (hotelPorNocheBlockTorneos) hotelPorNocheBlockTorneos.style.display = 'block';
            generarHotelesPorNocheTorneos(noches);
        } else {
            if (hotelPorNocheBlockTorneos) hotelPorNocheBlockTorneos.style.display = 'none';
        }
    }

    if (calendarioContainer && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameDias: 'dias-torneo',
            nameFechas: 'fechas[]',
            nameFechaPrimera: 'fecha',
            nameNoches: 'noches',
            maxSeleccion: 14,
            onChange: function (count, fechas) {
                if (camposDiasTorneos) {
                    if (count >= 1) {
                        camposDiasTorneos.style.display = 'block';
                        generarCamposPorDiaTorneos(count);
                    } else {
                        camposDiasTorneos.style.display = 'none';
                    }
                }
                if (configuradorHotelWrapTorneos) {
                    if (count >= 2) {
                        configuradorHotelWrapTorneos.style.display = 'block';
                        actualizarBloqueHotelTorneos();
                    } else {
                        configuradorHotelWrapTorneos.style.display = 'none';
                        if (hotelPorNocheBlockTorneos) hotelPorNocheBlockTorneos.style.display = 'none';
                    }
                }
                actualizarResumenTorneo();
            }
        });
    }

    // Inicializar formulario de usuarios
    if (typeof initUsuariosForm === 'function') {
        initUsuariosForm();
    }

    // Actualizar resumen cuando cambien los campos
    form.addEventListener('change', function(e) {
        var t = e.target;
        if (t && t.name && t.name.indexOf('lugar-noche-') === 0) {
            var i = parseInt(t.name.replace('lugar-noche-', ''), 10);
            if (i >= 1) refillHotelSelectTorneos(i, t.value || '');
            return;
        }
        actualizarResumenTorneo();
    });
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

    // Hacer función disponible globalmente para actualizarResumenTorneo
    window.getHotelLabelFromValueTorneos = getHotelLabelFromValueTorneos;

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
    var count = fechas ? fechas.length : (fecha ? 1 : 0);
    
    if (fechas && fechas.length > 0) {
        if (fechas.length === 1) {
            var d = new Date(fechas[0] + 'T00:00:00');
            resumenHTML += '<p><strong>Fecha:</strong> ' + d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
        } else {
            resumenHTML += '<p><strong>Fechas:</strong> ' + fechas.join(', ') + '</p>';
        }
        // Mostrar campos seleccionados por día
        for (var i = 1; i <= fechas.length; i++) {
            var c = formData.get('campo-dia-' + i);
            if (c) resumenHTML += '<p><strong>Día ' + i + ':</strong> ' + (c === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf') + '</p>';
        }
    } else if (fecha) {
        var d = new Date(fecha + 'T00:00:00');
        resumenHTML += '<p><strong>Fecha:</strong> ' + d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    }

    // Mostrar hoteles si hay 2+ días
    var necesitaHotel = count >= 2;
    if (necesitaHotel) {
        var nNoches = parseInt((formData.get('noches') || '0'), 10);
        if (nNoches >= 1) {
            var parts = [];
            for (var i = 1; i <= nNoches; i++) {
                var v = formData.get('hotel-noche-' + i);
                if (v) {
                    var lbl = (typeof window.getHotelLabelFromValueTorneos === 'function') ? window.getHotelLabelFromValueTorneos(v) : v;
                    parts.push('Noche ' + i + ': ' + lbl);
                }
            }
            if (parts.length) resumenHTML += '<p><strong>Alojamiento:</strong> ' + parts.join('. ') + '</p>';
        }
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

    // Servicios adicionales
    var ancillaries = [];
    if (formData.get('ancillary_buggy')) ancillaries.push('Buggies');
    if (formData.get('ancillary_carrito_mano')) ancillaries.push('Carrito de mano');
    if (formData.get('ancillary_carrito_electrico')) ancillaries.push('Carrito eléctrico');
    if (ancillaries.length > 0) {
        resumenHTML += '<p><strong>Servicios adicionales:</strong> ' + ancillaries.join(', ') + '</p>';
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
