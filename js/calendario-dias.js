/**
 * Calendario reutilizable con multiselección y arrastre para rango.
 * Uso: CalendarioDias.init({ container, form, nameDias, nameFechas, ... })
 */
(function () {
    'use strict';

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

    function toISODate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function parseISODate(s) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function getDaysInRange(from, to) {
        const a = from.getTime();
        const b = to.getTime();
        const [start, end] = a <= b ? [from, to] : [to, from];
        const out = [];
        const cur = new Date(start);
        cur.setHours(0,0,0,0);
        const endT = new Date(end);
        endT.setHours(0,0,0,0);
        while (cur.getTime() <= endT.getTime()) {
            out.push(toISODate(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return out;
    }

    function asegurarInput(form, name, value) {
        let el = form.querySelector('input[name="' + name + '"]');
        if (!el) {
            el = document.createElement('input');
            el.type = 'hidden';
            el.name = name;
            form.appendChild(el);
        }
        el.value = value;
    }

    function eliminarInputs(form, name) {
        form.querySelectorAll('input[name="' + name + '"]').forEach(function (n) { n.remove(); });
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
            var maxDate = opts.maxDate ? new Date(opts.maxDate) : (function () { var d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();
            var onChange = opts.onChange || function () {};

            minDate.setHours(0, 0, 0, 0);
            maxDate.setHours(23, 59, 59, 999);

            var fechas = []; // ISO strings
            var mesActual = new Date(Math.max(minDate.getTime(), (new Date()).getTime()));
            mesActual.setHours(0, 0, 0, 0);
            mesActual.setDate(1);

            var dragStart = null;
            var isDragging = false;

            function emit() {
                var count = fechas.length;
                if (nameDias != null) asegurarInput(form, nameDias, String(count));
                if (nameFechas != null) setFechasInputs(form, nameFechas, fechas);
                if (nameFechaPrimera != null) asegurarInput(form, nameFechaPrimera, fechas.length ? fechas[0] : '');
                if (nameNoches != null) {
                    var noches = 0;
                    if (fechas.length === 1) noches = 1;
                    else if (fechas.length >= 2) {
                        var first = parseISODate(fechas[0]).getTime();
                        var last = parseISODate(fechas[fechas.length - 1]).getTime();
                        noches = Math.round((last - first) / MS_PER_DAY);
                        noches = Math.max(1, noches);
                    }
                    asegurarInput(form, nameNoches, String(noches));
                }
                var countEl = container.querySelector('.calendario-count');
                if (countEl) countEl.textContent = String(count);
                onChange(count, fechas);
            }

            function toggle(iso) {
                var i = fechas.indexOf(iso);
                if (i >= 0) {
                    fechas.splice(i, 1);
                } else {
                    if (fechas.length >= maxSeleccion) return;
                    fechas.push(iso);
                    fechas.sort();
                }
                render();
                emit();
            }

            function setRango(isoFrom, isoTo) {
                var from = parseISODate(isoFrom);
                var to = parseISODate(isoTo);
                var list = getDaysInRange(from, to);
                list = list.filter(function (iso) {
                    var d = parseISODate(iso);
                    return d.getTime() >= minDate.getTime() && d.getTime() <= maxDate.getTime();
                });
                if (list.length > maxSeleccion) list = list.slice(0, maxSeleccion);
                fechas = list;
                render();
                emit();
            }

            function render() {
                var grid = container.querySelector('.calendario-grid');
                if (!grid) return;
                grid.querySelectorAll('.calendario-dia').forEach(function (cell) {
                    var iso = cell.getAttribute('data-date');
                    if (iso) cell.classList.toggle('selected', fechas.indexOf(iso) >= 0);
                });
            }

            function buildMonth() {
                var year = mesActual.getFullYear();
                var month = mesActual.getMonth();
                var first = new Date(year, month, 1);
                var last = new Date(year, month + 1, 0);
                // Lunes = 0 en getDay(); para domingo=0: (getDay()+6)%7 -> Lu=1,...,Do=0. Nosotros Lu=0: (getDay()+6)%7
                var offset = (first.getDay() + 6) % 7;
                var days = last.getDate();
                var hoy = toISODate(new Date());

                var html = '';
                for (var i = 0; i < offset; i++) html += '<div class="calendario-dia calendario-dia-empty"></div>';
                for (var d = 1; d <= days; d++) {
                    var dt = new Date(year, month, d);
                    var iso = toISODate(dt);
                    var dis = (dt.getTime() < minDate.getTime() || dt.getTime() > maxDate.getTime());
                    var isHoy = iso === hoy;
                    var sel = fechas.indexOf(iso) >= 0;
                    var cls = 'calendario-dia';
                    if (dis) cls += ' disabled';
                    if (isHoy) cls += ' today';
                    if (sel) cls += ' selected';
                    html += '<div class="' + cls + '" data-date="' + iso + '" role="button" tabindex="0" aria-pressed="' + (sel ? 'true' : 'false') + '">' + d + '</div>';
                }
                grid.innerHTML = html;
                container.querySelector('.calendario-mes-titulo').textContent = MESES[month] + ' ' + year;

                grid.querySelectorAll('.calendario-dia:not(.calendario-dia-empty):not(.disabled)').forEach(function (cell) {
                    var iso = cell.getAttribute('data-date');
                    if (!iso) return;
                    cell.addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        dragStart = iso;
                        isDragging = false;
                    });
                    cell.addEventListener('click', function (e) { e.preventDefault(); });
                    cell.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(iso); }
                    });
                });
            }

            function onDocMove(e) {
                if (dragStart == null) return;
                var t = e.target.closest('.calendario-dia[data-date]');
                if (t && t.getAttribute('data-date') !== dragStart) isDragging = true;
            }
            function onDocUp(e) {
                if (dragStart == null) return;
                var t = e.target.closest('.calendario-dia[data-date]');
                var endIso = t && !t.classList.contains('disabled') && !t.classList.contains('calendario-dia-empty') ? t.getAttribute('data-date') : null;
                if (isDragging && endIso) setRango(dragStart, endIso);
                else if (!isDragging) toggle(dragStart);
                dragStart = null;
                isDragging = false;
            }

            container.innerHTML = (
                '<p class="calendario-hint">Clic o <strong>arrastra</strong> para elegir rango. <strong class="calendario-count">0</strong> días seleccionados.</p>' +
                '<div class="calendario-nav">' +
                '<button type="button" class="calendario-btn-prev" aria-label="Mes anterior">‹</button>' +
                '<span class="calendario-mes-titulo"></span>' +
                '<button type="button" class="calendario-btn-next" aria-label="Mes siguiente">›</button>' +
                '</div>' +
                '<div class="calendario-mes">' +
                '<div class="calendario-semana-headers"><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span></div>' +
                '<div class="calendario-grid"></div>' +
                '</div>'
            );

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
            document.addEventListener('mousemove', onDocMove);
            document.addEventListener('mouseup', onDocUp);
            emit();
        }
    };
})();
