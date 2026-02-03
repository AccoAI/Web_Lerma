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
    var comidaSinFechasTorneos = document.getElementById('comida-sin-fechas-torneos');
    var comidaPorDiaContainerTorneos = document.getElementById('comida-por-dia-container-torneos');

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

    function formatearFechaComidaTorneos(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso + 'T12:00:00');
            return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch (e) { return ''; }
    }

    function actualizarBloqueComidaTorneos(count, fechas) {
        fechas = fechas || [];
        if (comidaSinFechasTorneos) comidaSinFechasTorneos.style.display = count >= 1 ? 'none' : 'block';
        if (!comidaPorDiaContainerTorneos) return;
        if (count < 1) {
            comidaPorDiaContainerTorneos.style.display = 'none';
            comidaPorDiaContainerTorneos.innerHTML = '';
            return;
        }
        var prevComida = {}, prevCena = {};
        for (var i = 1; i <= count; i++) {
            var sc = form && form.querySelector('select[name="comida_dia_' + i + '"]');
            var sv = form && form.querySelector('select[name="cena_dia_' + i + '"]');
            if (sc && sc.value) prevComida[i] = sc.value;
            if (sv && sv.value) prevCena[i] = sv.value;
        }
        comidaPorDiaContainerTorneos.style.display = 'block';
        comidaPorDiaContainerTorneos.innerHTML = '';
        var precioComida = (typeof PRECIO_COMIDA !== 'undefined') ? PRECIO_COMIDA : 22;
        var precioBurgos = (typeof PRECIO_SERVICIO_BURGOS !== 'undefined') ? PRECIO_SERVICIO_BURGOS : 25;
        for (var i = 1; i <= count; i++) {
            var fechaStr = formatearFechaComidaTorneos(fechas[i - 1]);
            var titulo = 'Día ' + i + (fechaStr ? ' <span class="comida-dia-fecha">(' + fechaStr + ')</span>' : '');
            var optComida = '<option value="">Sin reserva</option><option value="lerma"' + (prevComida[i] === 'lerma' ? ' selected' : '') + '>Lerma · Club Social Golf Lerma · ' + precioComida + ' €</option><option value="burgos"' + (prevComida[i] === 'burgos' ? ' selected' : '') + '>Burgos · Restaurantes · ' + precioBurgos + ' €</option>';
            var optCena = '<option value="">Sin reserva</option><option value="lerma"' + (prevCena[i] === 'lerma' ? ' selected' : '') + '>Lerma · Club Social Golf Lerma · ' + precioComida + ' €</option><option value="burgos"' + (prevCena[i] === 'burgos' ? ' selected' : '') + '>Burgos · Restaurantes · ' + precioBurgos + ' €</option>';
            var block = document.createElement('div');
            block.className = 'comida-dia-block';
            block.innerHTML = '<div class="comida-dia-titulo">' + titulo + '</div><div class="comida-dia-campos"><div class="form-group-inline"><label>Comida</label><select name="comida_dia_' + i + '">' + optComida + '</select></div><div class="form-group-inline"><label>Cena</label><select name="cena_dia_' + i + '">' + optCena + '</select></div></div>';
            comidaPorDiaContainerTorneos.appendChild(block);
        }
    }

    function recalcNumeroGruposTorneos() {
        var tg = document.getElementById('tamanio-grupo-torneos');
        var out = document.getElementById('numero-grupos-output-torneos');
        var hid = document.getElementById('numero-grupos-torneos');
        if (!tg) return;
        var n = parseInt(tg.value, 10);
        var val = (n >= 1) ? String(Math.ceil(n / 4)) : '';
        if (out) out.textContent = val;
        if (hid) hid.value = val;
        if (typeof actualizarResumenTorneo === 'function') actualizarResumenTorneo();
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
                actualizarBloqueComidaTorneos(count, fechas || []);
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
        if (t && t.id === 'tamanio-grupo-torneos') recalcNumeroGruposTorneos();
        actualizarResumenTorneo();
    });
    form.addEventListener('input', function(e) {
        var t = e.target;
        if (t && t.id === 'tamanio-grupo-torneos') recalcNumeroGruposTorneos();
        if (t && t.matches && t.matches('#tamanio-grupo-torneos, #hora-salida-torneos, #handicap-grupo-torneos, .ancillary-counter')) actualizarResumenTorneo();
    });
    recalcNumeroGruposTorneos();

    // Manejar envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        if (typeof window.validarTelefonosForm === 'function' && !window.validarTelefonosForm(form)) return;
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
    const modalidad = formData.get('modalidad');
    var fechas = formData.getAll('fechas[]');
    var count = fechas ? fechas.length : 0;

    var necesitaHotel = count >= 2;
    var hotelOk = !necesitaHotel || (function () {
        var n = parseInt((formData.get('noches') || '0'), 10);
        for (var i = 1; i <= n; i++) { if (!formData.get('hotel-noche-' + i)) return false; }
        return true;
    })();

    var nNoches = parseInt((formData.get('noches') || '0'), 10);

    if (count < 1) {
        resumenDetalle.innerHTML = '<p>Completa las opciones para ver el resumen</p>';
        return;
    }

    var resumenHTML = '<div class="resumen-items">';
    resumenHTML += '<p><strong>Fechas:</strong> ' + (fechas.length ? fechas.join(', ') : '—') + '</p>';
    
    for (var i = 1; i <= count; i++) {
        var c = formData.get('campo-dia-' + i);
        if (c) resumenHTML += '<p><strong>Día ' + i + ':</strong> ' + (c === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf') + '</p>';
    }

    if (necesitaHotel && hotelOk) {
        var n = parseInt((formData.get('noches') || '0'), 10);
        var parts = [];
        for (var i = 1; i <= n; i++) {
            var v = formData.get('hotel-noche-' + i);
            if (v) {
                var lbl = (typeof window.getHotelLabelFromValueTorneos === 'function') ? window.getHotelLabelFromValueTorneos(v) : v;
                parts.push('Noche ' + i + ': ' + lbl);
            }
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

    if (modalidad) {
        const modalidades = {
            'golf': 'Golf',
            'foot-golf': 'Foot Golf',
            'disc-golf': 'Disc Golf',
            'pitch-putt': 'Pitch and Putt'
        };
        resumenHTML += `<p><strong>Modalidad:</strong> ${modalidades[modalidad] || modalidad}</p>`;
    }

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
    
    var grupos = (typeof getCorrespondenciaGrupos === 'function') ? getCorrespondenciaGrupos(form) : [];
    if (grupos.length > 0) resumenHTML += '<p><strong>Correspondencias (grupos):</strong> ' + grupos.map(function (g) { return g.cantidad + ' × ' + g.label; }).join(', ') + '</p>';
    
    var hg = (formData.get('handicap_grupo') || '').trim();
    if (hg) resumenHTML += '<p><strong>Handicap del grupo (orientativo):</strong> ' + hg + '</p>';

    // Servicios adicionales
    var ancillaries = [];
    var qB = parseInt(formData.get('ancillary_buggy') || '0', 10);
    var qC = parseInt(formData.get('ancillary_carrito_mano') || '0', 10);
    var qE = parseInt(formData.get('ancillary_carrito_electrico') || '0', 10);
    if (qB > 0) ancillaries.push('Buggies (' + qB + ')');
    if (qC > 0) ancillaries.push('Carrito de mano (' + qC + ')');
    if (qE > 0) ancillaries.push('Carrito eléctrico (' + qE + ')');
    var cuboVal = (formData.get('ancillary_cubo_premium_boogie') || '').trim();
    if (cuboVal === 'champagne') ancillaries.push('Cubo premium: Champagne');
    else if (cuboVal === 'cervezas') ancillaries.push('Cubo premium: Cubo de cervezas');
    else if (cuboVal === 'vino_blanco') ancillaries.push('Cubo premium: Vino blanco');
    if (ancillaries.length > 0) {
        resumenHTML += '<p><strong>Servicios adicionales:</strong> ' + ancillaries.join(', ') + '</p>';
    }

    resumenHTML += '</div>';

    resumenDetalle.innerHTML = resumenHTML;
}
