// Configurador de Ryder Cup
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('configuradorRyderForm');
    const resumenDiv = document.getElementById('resumen-ryder');
    const camposDiasContainer = document.getElementById('campos-dias-ryder');
    const diasCamposContainer = document.getElementById('dias-campos-container-ryder');
    const calendarioContainer = document.getElementById('calendario-dias-ryder');
    const hotelPorNocheBlockRyder = document.getElementById('hotel-por-noche-block-ryder');
    const hotelesPorNocheContainerRyder = document.getElementById('hoteles-por-noche-container-ryder');

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

    if (calendarioContainer && form && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameDias: 'dias-juego',
            nameFechas: 'fechas[]',
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
            if (t && t.name && t.name === 'noches') {
                var n = parseInt(t.value, 10);
                if (n >= 1) generarHotelesPorNocheRyder(n);
                return;
            }
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

    generarHotelesPorNocheRyder(1);

    function actualizarResumenRyder() {
        const formData = new FormData(form);
        const diasJuego = formData.get('dias-juego');
        const noches = formData.get('noches');
        const comida = formData.get('comida');
        const transporte = formData.get('transporte');

        var nNoches = parseInt(noches || '0', 10);
        var hotelOk = nNoches >= 1;
        if (hotelOk) {
            for (var i = 1; i <= nNoches; i++) {
                if (!formData.get('hotel-noche-' + i)) { hotelOk = false; break; }
            }
        }

        const ancillaries = [];
        if (formData.get('ancillary_bolas_personalizadas')) ancillaries.push('Bolas personalizadas');
        if (formData.get('ancillary_equipacion_equipos')) ancillaries.push('Equipación por equipos personalizada');
        if (formData.get('ancillary_gestion_trofeos')) ancillaries.push('Gestión de trofeos');
        if (formData.get('ancillary_premio_economico')) ancillaries.push('Premio económico');
        if (formData.get('ancillary_buggy')) ancillaries.push('Buggies');

        if (diasJuego && noches && hotelOk && comida && transporte) {
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

            resumenHTML += '<p><strong>Noches:</strong> ' + noches + ' ' + (noches === '1' ? 'noche' : 'noches') + '</p>';
            var parts = [];
            for (var k = 1; k <= nNoches; k++) {
                var v = formData.get('hotel-noche-' + k);
                if (v) parts.push('Noche ' + k + ': ' + getHotelLabelFromValueRyder(v));
            }
            if (parts.length) resumenHTML += '<p><strong>Alojamiento:</strong> ' + parts.join('. ') + '</p>';

            var comidaTexto = '';
            if (comida === 'lerma') comidaTexto = 'Comida en Lerma';
            else if (comida === 'pack-huevos-morcilla') comidaTexto = 'Pack Huevos + Morcilla';
            else if (comida === 'pack-cochinillo') comidaTexto = 'Pack Cochinillo';
            resumenHTML += '<p><strong>Pack de comida:</strong> ' + comidaTexto + '</p>';

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
            var datos = {
                diasJuego: diasJuego,
                fechas: formData.getAll('fechas[]'),
                noches: formData.get('noches'),
                hotelesPorNoche: hoteles,
                comida: formData.get('comida'),
                transporte: formData.get('transporte'),
                ancillaries: {
                    bolas_personalizadas: formData.get('ancillary_bolas_personalizadas') === '1',
                    equipacion_equipos: formData.get('ancillary_equipacion_equipos') === '1',
                    gestion_trofeos: formData.get('ancillary_gestion_trofeos') === '1',
                    premio_economico: formData.get('ancillary_premio_economico') === '1',
                    buggy: formData.get('ancillary_buggy') === '1'
                }
            };

            alert('¡Configuración de Ryder Cup enviada! Te contactaremos pronto con un presupuesto personalizado.');
        });
    }
});

