// Configurador de Ryder Cup
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('configuradorRyderForm');
    const resumenDiv = document.getElementById('resumen-ryder');
    const camposDiasContainer = document.getElementById('campos-dias-ryder');
    const diasCamposContainer = document.getElementById('dias-campos-container-ryder');
    const calendarioContainer = document.getElementById('calendario-dias-ryder');
    const configuradorHotelWrapRyder = document.getElementById('configurador-hotel-wrap-ryder');
    const hotelPorNocheBlockRyder = document.getElementById('hotel-por-noche-block-ryder');
    const hotelesPorNocheContainerRyder = document.getElementById('hoteles-por-noche-container-ryder');
    const comidaSinFechasRyder = document.getElementById('comida-sin-fechas-ryder');
    const comidaPorDiaContainerRyder = document.getElementById('comida-por-dia-container-ryder');

    function getHotelLabelFromValueRyder(val) {
        if (!val || val.indexOf('-') < 0) return val || 'Sin reserva';
        var idx = val.indexOf('-');
        var c = val.substring(0, idx);
        var h = val.substring(idx + 1);
        var lbl = (typeof HOTELES_LABELS !== 'undefined' && HOTELES_LABELS[c]) ? HOTELES_LABELS[c][h] : null;
        return lbl ? lbl + ' (' + (c === 'lerma' ? 'Lerma' : 'Burgos') + ')' : val;
    }

    function refillHotelSelectRyder(i, ciudad) {
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
        actualizarResumenRyder();
    }

    function generarHotelesPorNocheRyder(n) {
        if (!hotelesPorNocheContainerRyder) return;
        var prev = {};
        for (var i = 1; i <= n; i++) {
            var hSel = form && form.querySelector('select[name="hotel-noche-' + i + '"]');
            var lSel = form && form.querySelector('select[name="lugar-noche-' + i + '"]');
            var h = (hSel && hSel.value) ? hSel.value : '';
            var l = (lSel && lSel.value) ? lSel.value : '';
            if (!l && h && h.indexOf('-') >= 0) l = h.split('-')[0];
            prev[i] = { hotel: h || '', lugar: l || '' };
        }
        hotelesPorNocheContainerRyder.innerHTML = '';
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
                '<label for="lugar-noche-' + i + '-ryder">Lugar</label>',
                '<select id="lugar-noche-' + i + '-ryder" name="lugar-noche-' + i + '" required aria-label="Lugar noche ' + i + '">' + lugarOpts + '</select>',
                '</div>',
                '<div class="hotel-noche-par">',
                '<label for="hotel-noche-' + i + '-ryder">Hotel</label>',
                '<select id="hotel-noche-' + i + '-ryder" name="hotel-noche-' + i + '" required aria-label="Hotel noche ' + i + '">' + hotelOptHtml + '</select>',
                '</div>'
            ].join('');
            hotelesPorNocheContainerRyder.appendChild(item);
        }
        actualizarResumenRyder();
    }

    function actualizarBloqueHotelRyder() {
        var noches = parseInt(((form && form.querySelector('input[name="noches"]')) || {}).value || '0', 10);
        if (configuradorHotelWrapRyder) {
            if (noches >= 1) {
                configuradorHotelWrapRyder.style.display = 'block';
                if (hotelPorNocheBlockRyder) hotelPorNocheBlockRyder.style.display = 'block';
                generarHotelesPorNocheRyder(noches);
            } else {
                configuradorHotelWrapRyder.style.display = 'none';
                if (hotelPorNocheBlockRyder) hotelPorNocheBlockRyder.style.display = 'none';
            }
        }
    }

    function formatearFechaComidaRyder(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso + 'T12:00:00');
            return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch (e) { return ''; }
    }

    function actualizarBloqueComidaRyder(count, fechas) {
        fechas = fechas || [];
        if (comidaSinFechasRyder) comidaSinFechasRyder.style.display = count >= 1 ? 'none' : 'block';
        if (!comidaPorDiaContainerRyder) return;
        if (count < 1) {
            comidaPorDiaContainerRyder.style.display = 'none';
            comidaPorDiaContainerRyder.innerHTML = '';
            return;
        }
        var prevComida = {}, prevCena = {};
        for (var i = 1; i <= count; i++) {
            var sc = form && form.querySelector('select[name="comida_dia_' + i + '"]');
            var sv = form && form.querySelector('select[name="cena_dia_' + i + '"]');
            if (sc && sc.value) prevComida[i] = sc.value;
            if (sv && sv.value) prevCena[i] = sv.value;
        }
        comidaPorDiaContainerRyder.style.display = 'block';
        comidaPorDiaContainerRyder.innerHTML = '';
        var precioComida = (typeof PRECIO_COMIDA !== 'undefined') ? PRECIO_COMIDA : 22;
        var precioBurgos = (typeof PRECIO_SERVICIO_BURGOS !== 'undefined') ? PRECIO_SERVICIO_BURGOS : 25;
        for (var i = 1; i <= count; i++) {
            var fechaStr = formatearFechaComidaRyder(fechas[i - 1]);
            var titulo = 'Día ' + i + (fechaStr ? ' <span class="comida-dia-fecha">(' + fechaStr + ')</span>' : '');
            var optComida = '<option value="">Sin reserva</option><option value="lerma"' + (prevComida[i] === 'lerma' ? ' selected' : '') + '>Lerma · Club Social Golf Lerma · ' + precioComida + ' €</option><option value="burgos"' + (prevComida[i] === 'burgos' ? ' selected' : '') + '>Burgos · Restaurantes · ' + precioBurgos + ' €</option>';
            var optCena = '<option value="">Sin reserva</option><option value="lerma"' + (prevCena[i] === 'lerma' ? ' selected' : '') + '>Lerma · Club Social Golf Lerma · ' + precioComida + ' €</option><option value="burgos"' + (prevCena[i] === 'burgos' ? ' selected' : '') + '>Burgos · Restaurantes · ' + precioBurgos + ' €</option>';
            var block = document.createElement('div');
            block.className = 'comida-dia-block';
            block.innerHTML = '<div class="comida-dia-titulo">' + titulo + '</div><div class="comida-dia-campos"><div class="form-group-inline"><label>Comida</label><select name="comida_dia_' + i + '">' + optComida + '</select></div><div class="form-group-inline"><label>Cena</label><select name="cena_dia_' + i + '">' + optCena + '</select></div></div>';
            comidaPorDiaContainerRyder.appendChild(block);
        }
        actualizarResumenRyder();
    }

    if (calendarioContainer && form && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameDias: 'dias-juego',
            nameFechas: 'fechas[]',
            nameNoches: 'noches',
            maxSeleccion: 10,
            onChange: function (count, fechas) {
                if (camposDiasContainer) {
                    if (count > 0) {
                        camposDiasContainer.style.display = 'block';
                        generarCamposPorDia(count);
                    } else {
                        camposDiasContainer.style.display = 'none';
                    }
                }
                if (configuradorHotelWrapRyder) {
                    if (count >= 2) {
                        actualizarBloqueHotelRyder();
                    } else {
                        configuradorHotelWrapRyder.style.display = 'none';
                        if (hotelPorNocheBlockRyder) hotelPorNocheBlockRyder.style.display = 'none';
                        if (hotelesPorNocheContainerRyder) hotelesPorNocheContainerRyder.innerHTML = '';
                    }
                }
                actualizarBloqueComidaRyder(count, fechas || []);
                actualizarResumenRyder();
            }
        });
    }

    function generarCamposPorDia(numDias) {
        if (!diasCamposContainer) return;
        var prev = {};
        for (var i = 1; i <= numDias; i++) {
            var sel = form && form.querySelector('select[name="campo-dia-' + i + '"]');
            if (sel && sel.value) prev[i] = sel.value;
        }
        diasCamposContainer.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var saved = prev[i] || '';
            var item = document.createElement('div');
            item.className = 'campos-dias-item';
            item.innerHTML = [
                '<label for="campo-dia-' + i + '-sel-ryder">Día ' + i + '</label>',
                '<select id="campo-dia-' + i + '-sel-ryder" name="campo-dia-' + i + '" required>',
                '<option value="">Sin reserva</option>',
                '<option value="lerma"' + (saved === 'lerma' ? ' selected' : '') + '>Golf Lerma</option>',
                '<option value="saldana"' + (saved === 'saldana' ? ' selected' : '') + '>Saldaña Golf</option>',
                '</select>'
            ].join('');
            diasCamposContainer.appendChild(item);
        }
    }

    if (form) {
        form.addEventListener('change', function (e) {
            var t = e.target;
            if (t && t.name && t.name.indexOf('lugar-noche-') === 0) {
                var i = parseInt(t.name.replace('lugar-noche-', ''), 10);
                if (i >= 1) refillHotelSelectRyder(i, t.value || '');
                return;
            }
            actualizarResumenRyder();
        });
        form.addEventListener('input', function () {
            actualizarResumenRyder();
        });
    }

    function actualizarResumenRyder() {
        const formData = new FormData(form);
        const diasJuego = formData.get('dias-juego');
        const noches = formData.get('noches');
        const transporte = formData.get('transporte');

        var nNoches = parseInt(noches || '0', 10);
        var sectionAlojamientoShown = formData.get('hotel-noche-1') !== null;
        var hotelOk = true;
        if (nNoches >= 1 && sectionAlojamientoShown) {
            for (var i = 1; i <= nNoches; i++) {
                if (!formData.get('hotel-noche-' + i)) { hotelOk = false; break; }
            }
        }

        const ancillaries = [];
        if (formData.get('ancillary_bolas_personalizadas')) ancillaries.push('Bolas personalizadas');
        if (formData.get('ancillary_equipacion_equipos')) ancillaries.push('Equipación por equipos personalizada');
        if (formData.get('ancillary_gestion_trofeos')) ancillaries.push('Gestión de trofeos');
        if (formData.get('ancillary_premio_economico')) ancillaries.push('Premio económico');
        var qBuggy = parseInt(formData.get('ancillary_buggy') || '0', 10);
        if (qBuggy > 0) ancillaries.push('Buggies (' + qBuggy + ')');
        var cuboVal = (formData.get('ancillary_cubo_premium_boogie') || '').trim();
        if (cuboVal === 'champagne') ancillaries.push('Cubo premium: Champagne');
        else if (cuboVal === 'cervezas') ancillaries.push('Cubo premium: Cubo de cervezas');
        else if (cuboVal === 'vino_blanco') ancillaries.push('Cubo premium: Vino blanco');

        if (diasJuego && hotelOk && transporte) {
            var resumenHTML = '<div class="resumen-items">';

            resumenHTML += '<p><strong>Días de juego:</strong> ' + diasJuego + ' ' + (diasJuego === '1' ? 'día' : 'días') + '</p>';

            var numDias = parseInt(diasJuego, 10);
            for (var d = 1; d <= numDias; d++) {
                var campoDia = formData.get('campo-dia-' + d);
                if (campoDia) {
                    var campoNombre = campoDia === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf';
                    resumenHTML += '<p><strong>Día ' + d + ':</strong> ' + campoNombre + '</p>';
                }
            }

            if (sectionAlojamientoShown && nNoches >= 1) {
                resumenHTML += '<p><strong>Noches:</strong> ' + noches + ' ' + (noches === '1' ? 'noche' : 'noches') + '</p>';
                var parts = [];
                for (var k = 1; k <= nNoches; k++) {
                    var v = formData.get('hotel-noche-' + k);
                    if (v) parts.push('Noche ' + k + ': ' + getHotelLabelFromValueRyder(v));
                }
                if (parts.length) resumenHTML += '<p><strong>Alojamiento:</strong> ' + parts.join('. ') + '</p>';
            }

            var numDiasResumen = parseInt(diasJuego, 10);
            var partesComida = [];
            for (var ic = 1; ic <= numDiasResumen; ic++) {
                var com = (formData.get('comida_dia_' + ic) || '').trim();
                var cen = (formData.get('cena_dia_' + ic) || '').trim();
                var labCom = (com === 'lerma' ? 'Lerma' : com === 'burgos' ? 'Burgos' : '');
                var labCen = (cen === 'lerma' ? 'Lerma' : cen === 'burgos' ? 'Burgos' : '');
                if (labCom || labCen) {
                    var p = 'Día ' + ic + ':';
                    if (labCom) p += ' Comida ' + labCom;
                    if (labCen) p += (labCom ? ', ' : '') + 'Cena ' + labCen;
                    partesComida.push(p);
                }
            }
            if (partesComida.length) resumenHTML += '<p><strong>Comidas / cenas:</strong> ' + partesComida.join('. ') + '</p>';

            resumenHTML += '<p><strong>Transporte desde Madrid:</strong> ' + (transporte === 'si' ? 'Sí (hasta 12 personas)' : 'No') + '</p>';

            if (ancillaries.length > 0) {
                resumenHTML += '<p><strong>Servicios adicionales:</strong> ' + ancillaries.join(', ') + '</p>';
            }

            resumenHTML += '<p style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2);"><strong>Live Scoring:</strong> Web de puntuaciones en vivo durante todo el fin de semana</p>';

            var usuarios = form.querySelectorAll('.usuario-form');
            if (usuarios.length > 0) {
                resumenHTML += '<p><strong>Número de participantes:</strong> ' + usuarios.length + '</p>';
            }

            resumenHTML += '</div>';
            resumenDiv.innerHTML = resumenHTML;
        } else {
            resumenDiv.innerHTML = '<p>Completa las opciones para ver el resumen</p>';
        }
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (typeof window.validarTelefonosForm === 'function' && !window.validarTelefonosForm(form)) return;
            var formData = new FormData(form);
            var diasJuego = formData.get('dias-juego');
            if (!diasJuego || diasJuego === '0') {
                alert('Selecciona al menos un día de juego en el calendario.');
                return;
            }
            var nNoches = parseInt(formData.get('noches') || '0', 10);
            var hoteles = [];
            for (var i = 1; i <= nNoches; i++) {
                hoteles.push({ noche: i, hotel: formData.get('hotel-noche-' + i), lugar: formData.get('lugar-noche-' + i) });
            }
            var numDiasSubmit = parseInt(diasJuego || '0', 10);
            var comidasPorDia = [];
            for (var j = 1; j <= numDiasSubmit; j++) {
                comidasPorDia.push({ dia: j, comida: formData.get('comida_dia_' + j) || '', cena: formData.get('cena_dia_' + j) || '' });
            }
            var datos = {
                diasJuego: diasJuego,
                fechas: formData.getAll('fechas[]'),
                noches: formData.get('noches'),
                hotelesPorNoche: hoteles,
                comidasPorDia: comidasPorDia,
                transporte: formData.get('transporte'),
                ancillaries: {
                    bolas_personalizadas: formData.get('ancillary_bolas_personalizadas') === '1',
                    equipacion_equipos: formData.get('ancillary_equipacion_equipos') === '1',
                    gestion_trofeos: formData.get('ancillary_gestion_trofeos') === '1',
                    premio_economico: formData.get('ancillary_premio_economico') === '1',
                    buggy: parseInt(formData.get('ancillary_buggy') || '0', 10),
                    cubo_premium_boogie: formData.get('ancillary_cubo_premium_boogie') || ''
                }
            };

            alert('¡Configuración de Ryder Cup enviada! Te contactaremos pronto con un presupuesto personalizado.');
        });
    }
});

