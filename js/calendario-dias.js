/**
 * Calendario reutilizable: modo llegada/salida (rango inclusivo) o multiselección legacy.
 * Uso: CalendarioDias.init({ container, form, nameFechas, selectionMode: 'llegada-salida', ... })
 */
(function () {
    'use strict';

    var MS_PER_DAY = 24 * 60 * 60 * 1000;
    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    function toISODate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function parseISODate(s) {
        var parts = s.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function getDaysInRange(from, to) {
        var a = from.getTime();
        var b = to.getTime();
        var start = a <= b ? from : to;
        var end = a <= b ? to : from;
        var out = [];
        var cur = new Date(start);
        cur.setHours(0, 0, 0, 0);
        var endT = new Date(end);
        endT.setHours(0, 0, 0, 0);
        while (cur.getTime() <= endT.getTime()) {
            out.push(toISODate(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return out;
    }

    function formatFechaCorta(iso) {
        if (!iso) return '';
        var d = parseISODate(iso);
        return d.getDate() + ' ' + MESES_CORTO[d.getMonth()];
    }

    function t(key, fallback) {
        return window.i18n && window.i18n.t ? window.i18n.t(key) : fallback;
    }

    function asegurarInput(form, name, value) {
        var el = form.querySelector('input[name="' + name + '"]');
        if (!el) {
            el = document.createElement('input');
            el.type = 'hidden';
            el.name = name;
            form.appendChild(el);
        }
        el.value = value;
    }

    function eliminarInputs(form, name) {
        form.querySelectorAll('input[name="' + name + '"]').forEach(function (n) {
            n.remove();
        });
    }

    function setFechasInputs(form, nameFechas, fechas) {
        eliminarInputs(form, nameFechas);
        fechas.forEach(function (iso) {
            var i = document.createElement('input');
            i.type = 'hidden';
            i.name = nameFechas;
            i.value = iso;
            form.appendChild(i);
        });
    }

    function filterAllowedDays(list, minDate, maxDate) {
        return list.filter(function (iso) {
            var d = parseISODate(iso);
            return d.getTime() >= minDate.getTime() && d.getTime() <= maxDate.getTime();
        });
    }

    window.CalendarioDias = {
        init: function (opts) {
            var container = opts.container;
            var form = opts.form;
            var nameDias = opts.nameDias || null;
            var nameFechas = opts.nameFechas || null;
            var nameFechaPrimera = opts.nameFechaPrimera || null;
            var nameNoches = opts.nameNoches || null;
            var maxSeleccion = opts.maxSeleccion != null ? opts.maxSeleccion : 10;
            var minDate = opts.minDate ? new Date(opts.minDate) : new Date();
            var maxDate = opts.maxDate
                ? new Date(opts.maxDate)
                : (function () {
                      var d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      return d;
                  })();
            var onChange = opts.onChange || function () {};
            var hintContainer = opts.hintContainer || null;
            var selectionMode = opts.selectionMode || 'llegada-salida';
            var isLlegadaSalida = selectionMode === 'llegada-salida';
            var isDiaUnico = selectionMode === 'dia-unico';

            minDate.setHours(0, 0, 0, 0);
            maxDate.setHours(23, 59, 59, 999);

            var fechas = [];
            var mesActual = new Date(Math.max(minDate.getTime(), new Date().getTime()));
            mesActual.setHours(0, 0, 0, 0);
            mesActual.setDate(1);

            var pendingLlegada = null;
            var hoverSalida = null;
            var dragStart = null;
            var isDragging = false;

            function getFechasParaFormulario() {
                if (isLlegadaSalida && pendingLlegada != null) return [];
                return fechas;
            }

            function getRangoVisual() {
                if (!isLlegadaSalida) return fechas.slice();
                if (pendingLlegada != null) {
                    var endIso = hoverSalida || pendingLlegada;
                    return filterAllowedDays(getDaysInRange(parseISODate(pendingLlegada), parseISODate(endIso)), minDate, maxDate);
                }
                return fechas.slice();
            }

            function updateHintUI(fechasForm) {
                var root = hintContainer || container;
                if (!root) return;
                var countEl = root.querySelector('.calendario-count');
                var instructionEl = root.querySelector('.calendario-hint-instruction');
                var rangeEl = root.querySelector('.calendario-range-label');
                var suffixEl = root.querySelector('.calendario-hint-dias-suffix');

                var count = fechasForm.length;
                if (countEl) countEl.textContent = String(count);

                if (isDiaUnico) {
                    if (countEl) countEl.hidden = true;
                    if (suffixEl) suffixEl.hidden = true;
                    if (count >= 1) {
                        if (instructionEl) instructionEl.hidden = true;
                        if (rangeEl) {
                            rangeEl.hidden = false;
                            rangeEl.textContent = t(
                                'calendario_dia_seleccionado',
                                'Día seleccionado: ' + formatFechaCorta(fechasForm[0])
                            ).replace('{fecha}', formatFechaCorta(fechasForm[0]));
                        }
                    } else {
                        if (instructionEl) {
                            instructionEl.hidden = false;
                            instructionEl.textContent = t(
                                'calendario_hint_dia_unico',
                                'Elige el día de tu partida en Golf Lerma.'
                            );
                        }
                        if (rangeEl) rangeEl.hidden = true;
                    }
                    return;
                }

                if (!isLlegadaSalida) {
                    if (instructionEl) instructionEl.hidden = false;
                    if (rangeEl) rangeEl.hidden = true;
                    if (suffixEl) suffixEl.hidden = false;
                    return;
                }

                if (pendingLlegada != null) {
                    if (instructionEl) {
                        instructionEl.hidden = false;
                        instructionEl.textContent = t(
                            'calendario_hint_elige_salida',
                            'Llegada: ' + formatFechaCorta(pendingLlegada) + ' — ahora elige el día de salida.'
                        ).replace('{llegada}', formatFechaCorta(pendingLlegada));
                    }
                    if (rangeEl) rangeEl.hidden = true;
                    if (suffixEl) suffixEl.hidden = true;
                    return;
                }

                if (count >= 1) {
                    var llegada = fechasForm[0];
                    var salida = fechasForm[fechasForm.length - 1];
                    if (instructionEl) instructionEl.hidden = true;
                    if (rangeEl) {
                        rangeEl.hidden = false;
                        var llegadaTxt = formatFechaCorta(llegada);
                        var salidaTxt = formatFechaCorta(salida);
                        if (count === 1) {
                            rangeEl.textContent = t(
                                'calendario_rango_resumen_1',
                                'Llegada y salida: ' + llegadaTxt + ' (1 día)'
                            ).replace('{llegada}', llegadaTxt);
                        } else {
                            rangeEl.textContent = t(
                                'calendario_rango_resumen',
                                'Llegada: ' + llegadaTxt + ' · Salida: ' + salidaTxt + ' (' + count + ' días)'
                            )
                                .replace('{llegada}', llegadaTxt)
                                .replace('{salida}', salidaTxt)
                                .replace('{dias}', String(count));
                        }
                    }
                    if (suffixEl) suffixEl.hidden = true;
                    return;
                }

                if (instructionEl) instructionEl.hidden = false;
                if (rangeEl) rangeEl.hidden = true;
                if (suffixEl) suffixEl.hidden = false;
            }

            function emit() {
                var fechasForm = getFechasParaFormulario();
                var count = fechasForm.length;

                if (nameDias != null) asegurarInput(form, nameDias, String(count));
                if (nameFechas != null) setFechasInputs(form, nameFechas, fechasForm);
                if (nameFechaPrimera != null) asegurarInput(form, nameFechaPrimera, fechasForm.length ? fechasForm[0] : '');
                if (nameNoches != null) {
                    var noches = 0;
                    if (fechasForm.length === 1) noches = 1;
                    else if (fechasForm.length >= 2) {
                        var first = parseISODate(fechasForm[0]).getTime();
                        var last = parseISODate(fechasForm[fechasForm.length - 1]).getTime();
                        noches = Math.round((last - first) / MS_PER_DAY);
                        noches = Math.max(1, noches);
                    }
                    asegurarInput(form, nameNoches, String(noches));
                }

                updateHintUI(fechasForm);
                onChange(count, fechasForm.slice());
            }

            function aplicarRango(isoFrom, isoTo) {
                var list = filterAllowedDays(getDaysInRange(parseISODate(isoFrom), parseISODate(isoTo)), minDate, maxDate);
                if (!list.length) return;
                if (list.length > maxSeleccion) list = list.slice(0, maxSeleccion);
                fechas = list;
                pendingLlegada = null;
                hoverSalida = null;
                render();
                emit();
            }

            function toggle(iso) {
                var i = fechas.indexOf(iso);
                if (i >= 0) fechas.splice(i, 1);
                else {
                    if (fechas.length >= maxSeleccion) return;
                    fechas.push(iso);
                    fechas.sort();
                }
                render();
                emit();
            }

            function onDayActivate(iso) {
                if (isDiaUnico) {
                    if (fechas.length === 1 && fechas[0] === iso) {
                        fechas = [];
                    } else {
                        fechas = [iso];
                    }
                    pendingLlegada = null;
                    hoverSalida = null;
                    render();
                    emit();
                    return;
                }
                if (isLlegadaSalida) {
                    if (pendingLlegada != null) {
                        aplicarRango(pendingLlegada, iso);
                        return;
                    }
                    pendingLlegada = iso;
                    fechas = [];
                    hoverSalida = null;
                    render();
                    emit();
                    return;
                }
                toggle(iso);
            }

            function render() {
                var grid = container.querySelector('.calendario-grid');
                if (!grid) return;

                var visual = getRangoVisual();
                var llegadaIso = visual.length ? visual[0] : null;
                var salidaIso = visual.length ? visual[visual.length - 1] : null;
                var enSeleccion = isLlegadaSalida && pendingLlegada != null;

                grid.querySelectorAll('.calendario-dia').forEach(function (cell) {
                    var iso = cell.getAttribute('data-date');
                    if (!iso) return;

                    var idx = visual.indexOf(iso);
                    var inRange = idx >= 0;
                    var isStart = inRange && iso === llegadaIso;
                    var isEnd = inRange && iso === salidaIso;
                    var isMiddle = inRange && !isStart && !isEnd;

                    cell.classList.toggle('selected', inRange && (!isLlegadaSalida || isDiaUnico));
                    cell.classList.toggle('range-start', isLlegadaSalida && isStart);
                    cell.classList.toggle('range-end', isLlegadaSalida && isEnd);
                    cell.classList.toggle('range-middle', isLlegadaSalida && isMiddle);
                    cell.classList.toggle('range-preview', isLlegadaSalida && enSeleccion && hoverSalida && iso !== pendingLlegada && inRange);
                    cell.setAttribute('aria-pressed', inRange ? 'true' : 'false');
                });
            }

            function buildMonth() {
                var year = mesActual.getFullYear();
                var month = mesActual.getMonth();
                var first = new Date(year, month, 1);
                var last = new Date(year, month + 1, 0);
                var offset = (first.getDay() + 6) % 7;
                var days = last.getDate();
                var hoy = toISODate(new Date());

                var html = '';
                for (var i = 0; i < offset; i++) html += '<div class="calendario-dia calendario-dia-empty"></div>';
                for (var d = 1; d <= days; d++) {
                    var dt = new Date(year, month, d);
                    var iso = toISODate(dt);
                    var dis = dt.getTime() < minDate.getTime() || dt.getTime() > maxDate.getTime();
                    var isHoy = iso === hoy;
                    var cls = 'calendario-dia';
                    if (dis) cls += ' disabled';
                    if (isHoy) cls += ' today';
                    html +=
                        '<div class="' +
                        cls +
                        '" data-date="' +
                        iso +
                        '" role="button" tabindex="0" aria-pressed="false">' +
                        d +
                        '</div>';
                }
                grid.innerHTML = html;
                container.querySelector('.calendario-mes-titulo').textContent = MESES[month] + ' ' + year;

                grid.querySelectorAll('.calendario-dia:not(.calendario-dia-empty):not(.disabled)').forEach(function (cell) {
                    var iso = cell.getAttribute('data-date');
                    if (!iso) return;

                    cell.addEventListener('click', function (e) {
                        e.preventDefault();
                        onDayActivate(iso);
                    });
                    cell.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onDayActivate(iso);
                        }
                    });

                    if (isLlegadaSalida) {
                        cell.addEventListener('mouseenter', function () {
                            if (pendingLlegada == null) return;
                            hoverSalida = iso;
                            render();
                        });
                        cell.addEventListener('touchstart', function (e) {
                            if (pendingLlegada == null) return;
                            hoverSalida = iso;
                            render();
                        }, { passive: true });
                    } else if (!isDiaUnico) {
                        cell.addEventListener('mousedown', function (e) {
                            e.preventDefault();
                            dragStart = iso;
                            isDragging = false;
                        });
                    }
                });

                render();
            }

            function onDocMove(e) {
                if (isLlegadaSalida || isDiaUnico || dragStart == null) return;
                var t = e.target.closest('.calendario-dia[data-date]');
                if (t && t.getAttribute('data-date') !== dragStart) isDragging = true;
            }

            function onDocUp(e) {
                if (isLlegadaSalida || isDiaUnico || dragStart == null) return;
                var t = e.target.closest('.calendario-dia[data-date]');
                var endIso =
                    t && !t.classList.contains('disabled') && !t.classList.contains('calendario-dia-empty')
                        ? t.getAttribute('data-date')
                        : null;
                if (isDragging && endIso) {
                    var list = filterAllowedDays(getDaysInRange(parseISODate(dragStart), parseISODate(endIso)), minDate, maxDate);
                    if (list.length > maxSeleccion) list = list.slice(0, maxSeleccion);
                    fechas = list;
                    pendingLlegada = null;
                    hoverSalida = null;
                    render();
                    emit();
                } else if (!isDragging) onDayActivate(dragStart);
                dragStart = null;
                isDragging = false;
            }

            var hintHtml = isLlegadaSalida
                ? '<p class="calendario-hint"><span class="calendario-hint-instruction">Elige el día de llegada y después el día de salida.</span><span class="calendario-range-label" hidden></span> <strong class="calendario-count">0</strong><span class="calendario-hint-dias-suffix"> días en el paquete.</span></p>'
                : '<p class="calendario-hint">Clic o <strong>arrastra</strong> para elegir rango. <strong class="calendario-count">0</strong> días seleccionados.</p>';

            container.innerHTML =
                (hintContainer ? '' : hintHtml) +
                '<div class="calendario-nav">' +
                '<button type="button" class="calendario-btn-prev" aria-label="Mes anterior">‹</button>' +
                '<span class="calendario-mes-titulo"></span>' +
                '<button type="button" class="calendario-btn-next" aria-label="Mes siguiente">›</button>' +
                '</div>' +
                '<div class="calendario-mes">' +
                '<div class="calendario-semana-headers"><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span></div>' +
                '<div class="calendario-grid"></div>' +
                '</div>';

            var grid = container.querySelector('.calendario-grid');
            container.querySelector('.calendario-btn-prev').addEventListener('click', function () {
                mesActual.setMonth(mesActual.getMonth() - 1);
                buildMonth();
            });
            container.querySelector('.calendario-btn-next').addEventListener('click', function () {
                mesActual.setMonth(mesActual.getMonth() + 1);
                buildMonth();
            });

            buildMonth();
            if (!isLlegadaSalida && !isDiaUnico) {
                document.addEventListener('mousemove', onDocMove);
                document.addEventListener('mouseup', onDocUp);
            }
            emit();
        }
    };
})();
