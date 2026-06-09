// Configurador de Torneos — pasos 1–2 alineados con paquetes (personas + selección de golf)
document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    var calendarioContainer = document.getElementById('calendario-dias-finsemana');
    var diasCamposContainer = document.getElementById('dias-campos-container-finsemana');
    var fechasDiaPlanHint = document.getElementById('fechas-dia-plan-hint');
    var fechasGolfEspera = document.getElementById('fechas-golf-espera-personas');
    var fechasGolfBody = document.getElementById('fechas-golf-body');

    function formatearEtiquetaDia(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso + 'T12:00:00');
            var s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
            return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        } catch (e) { return ''; }
    }

    function isTamanioGrupoCompleto() {
        var tg = document.getElementById('tamanio-grupo');
        if (!tg) return false;
        var n = parseInt(tg.value, 10);
        return !isNaN(n) && n >= 1;
    }

    function syncFechasGolfBodyVisibility() {
        if (!fechasGolfBody) return;
        var ready = isTamanioGrupoCompleto();
        fechasGolfBody.hidden = !ready;
        if (fechasGolfEspera) fechasGolfEspera.hidden = ready;
        if (ready) recalcNumeroGrupos();
    }

    function recalcNumeroGrupos() {
        var tg = document.getElementById('tamanio-grupo-sync') || document.getElementById('tamanio-grupo');
        var out = document.getElementById('numero-grupos-output');
        var hid = document.getElementById('numero-grupos');
        if (!tg) return;
        var n = parseInt(tg.value, 10);
        var hidVal = (n >= 1) ? String(Math.ceil(n / 4)) : '';
        if (out) out.textContent = hidVal || '—';
        if (hid) hid.value = hidVal;
        actualizarResumenTorneo();
    }

    function getTamanioGrupoDefault() {
        var barTg = document.getElementById('tamanio-grupo');
        if (!barTg) return 4;
        var n = parseInt(barTg.value, 10);
        return (!isNaN(n) && n >= 1) ? n : 4;
    }

    function leerHoraSalidaPrev(numDias) {
        var prev = {};
        if (!form || !numDias) return prev;
        for (var i = 1; i <= numDias; i++) {
            var name = numDias === 1 ? 'hora_salida' : 'hora_salida_dia_' + i;
            var inp = form.querySelector('input[name="' + name + '"]');
            if (inp && inp.value) prev[i] = inp.value;
        }
        return prev;
    }

    function leerJugadoresDiaPrev(numDias) {
        var prev = {};
        if (!form || !numDias) return prev;
        var fallback = getTamanioGrupoDefault();
        for (var i = 1; i <= numDias; i++) {
            var inp = form.querySelector('input[name="jugadores_dia_' + i + '"]');
            if (inp && inp.value) {
                var v = parseInt(inp.value, 10);
                if (!isNaN(v) && v >= 1) prev[i] = v;
            }
        }
        for (var j = 1; j <= numDias; j++) {
            if (!prev[j]) prev[j] = fallback;
        }
        return prev;
    }

    function campoDiaTieneReserva(idx) {
        if (!form || idx < 1) return false;
        if (typeof window.campoDiaTieneReservaEnDom === 'function') {
            return window.campoDiaTieneReservaEnDom(diasCamposContainer, form, idx);
        }
        return false;
    }

    function syncPlanHoraRow(row, dayIndex, numDias) {
        if (!row) return;
        var conCampo = campoDiaTieneReserva(dayIndex);
        var horaWrap = row.querySelector('.fechas-dia-plan-row__hora');
        if (horaWrap) {
            horaWrap.classList.toggle('is-disabled', !conCampo);
            var name = numDias === 1 ? 'hora_salida' : 'hora_salida_dia_' + dayIndex;
            horaWrap.querySelectorAll('input[name="' + name + '"], .hora-salida-picker__h, .hora-salida-picker__m').forEach(function (el) {
                if (conCampo) {
                    el.removeAttribute('disabled');
                    if (el.tagName === 'INPUT') el.setAttribute('required', 'required');
                } else {
                    el.setAttribute('disabled', 'disabled');
                    el.removeAttribute('required');
                }
            });
        }
        var jugWrap = row.querySelector('.fechas-dia-plan-row__jugadores');
        if (jugWrap) {
            jugWrap.classList.toggle('is-disabled', !conCampo);
            var jugInp = jugWrap.querySelector('.fechas-jugadores-dia');
            var jugBtns = jugWrap.querySelectorAll('.ancillary-btn');
            if (conCampo) {
                if (jugInp) {
                    jugInp.removeAttribute('disabled');
                    jugInp.setAttribute('required', 'required');
                }
                jugBtns.forEach(function (b) { b.removeAttribute('disabled'); });
            } else {
                if (jugInp) {
                    jugInp.setAttribute('disabled', 'disabled');
                    jugInp.removeAttribute('required');
                }
                jugBtns.forEach(function (b) { b.setAttribute('disabled', 'disabled'); });
            }
        }
    }

    function syncPlanHoraRows(numDias) {
        if (!diasCamposContainer || !numDias) return;
        diasCamposContainer.querySelectorAll('.fechas-dia-plan-row').forEach(function (row) {
            var idx = parseInt(row.getAttribute('data-dia') || '0', 10);
            if (idx >= 1) syncPlanHoraRow(row, idx, numDias);
        });
    }

    function syncTamanioGrupoDesdeDias(numDias) {
        if (!form) return getTamanioGrupoDefault();
        var max = 0;
        for (var i = 1; i <= (numDias || 0); i++) {
            var inp = form.querySelector('input[name="jugadores_dia_' + i + '"]');
            if (inp) max = Math.max(max, parseInt(inp.value, 10) || 0);
        }
        var barInput = document.getElementById('tamanio-grupo');
        if (numDias >= 1) {
            if (max < 1) max = getTamanioGrupoDefault();
            if (barInput) barInput.removeAttribute('name');
            var sync = document.getElementById('tamanio-grupo-sync');
            if (!sync) {
                sync = document.createElement('input');
                sync.type = 'hidden';
                sync.id = 'tamanio-grupo-sync';
                sync.name = 'tamanio_grupo';
                form.appendChild(sync);
            }
            sync.value = String(max);
        } else {
            var oldSync = document.getElementById('tamanio-grupo-sync');
            if (oldSync) oldSync.remove();
            if (barInput) barInput.setAttribute('name', 'tamanio_grupo');
        }
        return max || getTamanioGrupoDefault();
    }

    function syncFechasGrupoBarLayout(numDias) {
        syncTamanioGrupoDesdeDias(numDias);
        recalcNumeroGrupos();
    }

    function syncFechasDiaPlanPanel(numDias) {
        if (diasCamposContainer) diasCamposContainer.hidden = !(numDias >= 1);
    }

    function onCampoDiaPlanChange() {
        var fd = new FormData(form);
        var nFechas = (fd.getAll('fechas[]') || []).length;
        syncPlanHoraRows(nFechas);
        actualizarResumenTorneo();
    }

    function onJugadoresDiaChange() {
        var fd = new FormData(form);
        var nFechas = (fd.getAll('fechas[]') || []).length;
        syncTamanioGrupoDesdeDias(nFechas);
        recalcNumeroGrupos();
        actualizarResumenTorneo();
    }

    function generarPlanPorDia(numDias, fechas) {
        if (!diasCamposContainer || typeof window.buildCampoDiaToggleItem !== 'function') return;
        fechas = fechas || [];
        if (!numDias || numDias < 1) {
            diasCamposContainer.innerHTML = '';
            syncFechasDiaPlanPanel(0);
            syncFechasGrupoBarLayout(0);
            return;
        }
        syncFechasDiaPlanPanel(numDias);
        var prevCampo = {};
        for (var c = 1; c <= numDias; c++) {
            if (typeof window.getCampoDiaValueFromDom === 'function') {
                var v = window.getCampoDiaValueFromDom(diasCamposContainer, form, c);
                if (v) prevCampo[c] = v;
            }
        }
        var prevHora = leerHoraSalidaPrev(numDias);
        var prevJug = leerJugadoresDiaPrev(numDias);
        diasCamposContainer.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var row = document.createElement('div');
            row.className = 'fechas-dia-plan-row';
            row.setAttribute('data-dia', String(i));

            var campoWrap = document.createElement('div');
            campoWrap.className = 'fechas-dia-plan-row__campo';
            var campoItem = window.buildCampoDiaToggleItem(i, prevCampo[i] || '', {
                required: true,
                shortLabels: true,
                onChange: onCampoDiaPlanChange
            });
            var diaLbl = campoItem.querySelector('.campos-dias-item__dia-label');
            if (diaLbl && fechas[i - 1]) {
                var etiqueta = formatearEtiquetaDia(fechas[i - 1]);
                if (etiqueta) diaLbl.textContent = etiqueta;
            }
            campoWrap.appendChild(campoItem);

            var horaWrap = document.createElement('div');
            horaWrap.className = 'fechas-dia-plan-row__hora';
            var horaName = numDias === 1 ? 'hora_salida' : 'hora_salida_dia_' + i;
            var horaId = numDias === 1 ? 'hora-salida' : 'hora-salida-dia-' + i + '-torneo';
            horaWrap.innerHTML =
                '<label for="' + horaId + '" title="Hora de salida">Hora *</label>' +
                '<input type="time" id="' + horaId + '" name="' + horaName + '" title="Hora día ' + i + '" disabled value="' + (prevHora[i] || '') + '">';

            var jugWrap = document.createElement('div');
            jugWrap.className = 'fechas-dia-plan-row__jugadores fechas-dia-plan-row__grupo-item';
            var jugId = 'jugadores-dia-' + i + '-torneo';
            var jugVal = prevJug[i] || 1;
            jugWrap.innerHTML =
                '<label for="' + jugId + '">Jugadores *</label>' +
                '<div class="ancillary-counter-wrap reserva-quantity-wrap">' +
                '<button type="button" class="ancillary-btn ancillary-btn-minus" aria-label="Reducir jugadores">−</button>' +
                '<input type="number" id="' + jugId + '" name="jugadores_dia_' + i + '" min="1" max="54" value="' + jugVal + '" class="ancillary-counter fechas-jugadores-dia reserva-quantity-input" readonly disabled title="Jugadores día ' + i + '">' +
                '<button type="button" class="ancillary-btn ancillary-btn-plus" aria-label="Aumentar jugadores">+</button>' +
                '</div>';

            row.appendChild(campoWrap);
            row.appendChild(horaWrap);
            row.appendChild(jugWrap);
            diasCamposContainer.appendChild(row);
        }
        if (typeof window.initHoraSalidaPickers === 'function') {
            window.initHoraSalidaPickers(diasCamposContainer);
        }
        for (var j = 1; j <= numDias; j++) {
            var planRow = diasCamposContainer.querySelector('.fechas-dia-plan-row[data-dia="' + j + '"]');
            syncPlanHoraRow(planRow, j, numDias);
        }
        syncFechasGrupoBarLayout(numDias);
    }

    function actualizarPasosTorneos() {
        var paso = 1;
        form.querySelectorAll('[data-torneo-titulo]').forEach(function (titulo) {
            var seccion = titulo.closest('.configurador-seccion');
            if (!seccion || seccion.hidden) return;
            titulo.textContent = paso + '. ' + titulo.getAttribute('data-torneo-titulo');
            paso++;
        });
    }

    if (calendarioContainer && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameFechas: 'fechas[]',
            nameFechaPrimera: 'fecha',
            nameNoches: 'noches',
            maxSeleccion: 14,
            hintContainer: fechasDiaPlanHint || null,
            onChange: function (count, fechas) {
                generarPlanPorDia(count, fechas || []);
                actualizarResumenTorneo();
            }
        });
    }

    var tipoTorneoRadios = form.querySelectorAll('input[name="tipo_torneo"]');
    var torneoPublicoCampos = document.getElementById('torneo-publico-campos');
    var nombreTorneoInput = document.getElementById('nombre-torneo');
    function actualizarTipoTorneoUI() {
        var tipo = (form.querySelector('input[name="tipo_torneo"]:checked') || {}).value;
        if (torneoPublicoCampos) torneoPublicoCampos.style.display = tipo === 'publico' ? 'block' : 'none';
        if (nombreTorneoInput) nombreTorneoInput.required = (tipo === 'publico');
        actualizarResumenTorneo();
    }
    if (tipoTorneoRadios.length) {
        tipoTorneoRadios.forEach(function (r) {
            r.addEventListener('change', actualizarTipoTorneoUI);
        });
        actualizarTipoTorneoUI();
    }

    form.addEventListener('change', function (e) {
        var t = e.target;
        if (t && t.name === 'tipo_torneo') {
            actualizarTipoTorneoUI();
            return;
        }
        if (t && t.id === 'tamanio-grupo') {
            syncFechasGolfBodyVisibility();
            recalcNumeroGrupos();
        }
        if (t && t.classList && t.classList.contains('fechas-jugadores-dia')) {
            onJugadoresDiaChange();
        }
        actualizarResumenTorneo();
    });

    form.addEventListener('input', function (e) {
        var t = e.target;
        if (t && t.id === 'tamanio-grupo') {
            syncFechasGolfBodyVisibility();
            recalcNumeroGrupos();
        }
        if (t && t.classList && t.classList.contains('fechas-jugadores-dia')) {
            onJugadoresDiaChange();
        }
        if (t && t.matches && t.matches('#tamanio-grupo, #nombre-torneo, #descripcion-torneo, .fechas-jugadores-dia, input[name^="hora_salida"]')) {
            actualizarResumenTorneo();
        }
    });

    syncFechasGolfBodyVisibility();
    actualizarPasosTorneos();
    actualizarResumenTorneo();
});

function actualizarResumenTorneo() {
    var form = document.getElementById('configuradorTorneosForm');
    if (!form) return;

    var resumenDetalle = document.getElementById('resumen-detalle');
    if (!resumenDetalle) return;

    var formData = new FormData(form);
    var tipoTorneo = (formData.get('tipo_torneo') || 'privado');
    var modalidad = formData.get('modalidad');
    var fechas = formData.getAll('fechas[]');
    var count = fechas ? fechas.length : 0;

    if (count < 1) {
        resumenDetalle.innerHTML = '<p>Completa las opciones para ver el resumen</p>';
        return;
    }

    var resumenHTML = '<div class="resumen-items">';
    resumenHTML += '<p><strong>Tipo:</strong> ' + (tipoTorneo === 'publico' ? 'Público (se publicará en la web tras aprobación)' : 'Privado (solo su grupo)') + '</p>';
    if (tipoTorneo === 'publico') {
        var nombrePub = (formData.get('nombre_torneo') || '').trim();
        var descPub = (formData.get('descripcion') || '').trim();
        if (nombrePub) resumenHTML += '<p><strong>Nombre del torneo:</strong> ' + nombrePub + '</p>';
        if (descPub) resumenHTML += '<p><strong>Descripción:</strong> ' + descPub + '</p>';
    }
    var formatoComp = (formData.get('formato_competicion') || '').trim();
    if (formatoComp) resumenHTML += '<p><strong>Formato competición:</strong> ' + formatoComp + '</p>';
    var premios = (formData.get('premios') || '').trim();
    if (premios) resumenHTML += '<p><strong>Premios:</strong> ' + premios + '</p>';
    resumenHTML += '<p><strong>Fechas:</strong> ' + (fechas.length ? fechas.join(', ') : '—') + '</p>';

    for (var i = 1; i <= count; i++) {
        var c = formData.get('campo-dia-' + i);
        var jug = formData.get('jugadores_dia_' + i);
        var line = '';
        if (c) line += (c === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf');
        if (jug) line += (line ? ' · ' : '') + jug + ' jug.';
        var hs = count === 1
            ? (formData.get('hora_salida') || '').trim()
            : (formData.get('hora_salida_dia_' + i) || '').trim();
        if (hs) line += (line ? ' · ' : '') + 'Salida ' + hs;
        if (line) resumenHTML += '<p><strong>Día ' + i + ':</strong> ' + line + '</p>';
    }

    if (modalidad) {
        var modalidades = {
            golf: 'Golf',
            'foot-golf': 'Foot Golf',
            'disc-golf': 'Disc Golf',
            'pitch-putt': 'Pitch and Putt'
        };
        resumenHTML += '<p><strong>Modalidad:</strong> ' + (modalidades[modalidad] || modalidad) + '</p>';
    }

    var tg = (formData.get('tamanio_grupo') || '').trim();
    var ng = (formData.get('numero_grupos') || '').trim();
    if (tg || ng) {
        var partsInit = [];
        if (tg) partsInit.push('Personas: ' + tg);
        if (ng) partsInit.push('Partidas: ' + ng);
        resumenHTML += '<p><strong>Grupo:</strong> ' + partsInit.join(' · ') + '</p>';
    }

    resumenHTML += '</div>';
    resumenDetalle.innerHTML = resumenHTML;
}
