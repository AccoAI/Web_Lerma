/**
 * Calendario de Torneos - página dedicada.
 * Mini calendario mensual + lista de torneos (data/torneos-popup.json).
 */
(function () {
    'use strict';

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function toISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function parseFechaSubtitulo(sub) {
        if (!sub || typeof sub !== 'string') return null;
        var m = sub.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (m) {
            var dia = parseInt(m[1], 10);
            var mes = parseInt(m[2], 10) - 1;
            var year = parseInt(m[3], 10);
            return year + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
        }
        return null;
    }

    function renderCalendario(mes, torneosPorFecha) {
        var grid = document.getElementById('calTorneosGrid');
        var mesEl = document.getElementById('calTorneosMes');
        if (!grid || !mesEl) return;

        mesEl.textContent = MESES[mes.getMonth()] + ' ' + mes.getFullYear();

        var primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
        var ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
        var inicio = new Date(primero);
        inicio.setDate(inicio.getDate() - (primero.getDay() === 0 ? 6 : primero.getDay() - 1));
        var hoy = toISO(new Date());

        grid.innerHTML = '';
        for (var i = 0; i < 42; i++) {
            var d = new Date(inicio);
            d.setDate(d.getDate() + i);
            var iso = toISO(d);
            var span = document.createElement('span');
            span.className = 'agenda-cal-dia';
            if (d.getMonth() !== mes.getMonth()) span.classList.add('otro-mes');
            if (iso === hoy) span.classList.add('hoy');
            if (torneosPorFecha && torneosPorFecha[iso]) span.classList.add('tiene-torneo');
            span.textContent = d.getDate();
            span.dataset.fecha = iso;
            grid.appendChild(span);
        }
    }

    function renderLista(torneos) {
        var lista = document.getElementById('calendario-torneos-lista');
        var cargando = document.getElementById('calendarioTorneosCargando');
        if (!lista) return;

        if (cargando) cargando.style.display = 'none';

        if (!torneos || torneos.length === 0) {
            lista.innerHTML = '<p class="calendario-torneos-vacio">No hay torneos programados en este momento. <a href="configurador-torneos.html">Crea tu propio torneo</a>.</p>';
            return;
        }

        var html = '';
        torneos.forEach(function (t) {
            var enlace = (t.enlace || '').trim();
            var href = enlace && !/^\s*javascript\s*:/i.test(enlace) ? enlace : '#';
            html += '<a href="' + href + '" class="calendario-torneo-item">';
            html += '<span class="calendario-torneo-fecha">' + (t.fechas || '') + '</span>';
            html += '<strong class="calendario-torneo-titulo">' + (t.titulo || 'Torneo') + '</strong>';
            if (t.descripcion) html += '<span class="calendario-torneo-desc">' + t.descripcion + '</span>';
            html += '</a>';
        });
        lista.innerHTML = html;
    }

    function init() {
        var mes = new Date();
        var torneosPorFecha = {};

        fetch('data/torneos-popup.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var torneos = [];

                if (data) {
                    if (data.torneos && data.torneos.length) {
                        data.torneos.forEach(function (t) {
                            torneos.push({
                                titulo: t.titulo,
                                fechas: t.fechas,
                                descripcion: t.descripcion,
                                enlace: t.enlace
                            });
                            var iso = parseFechaSubtitulo(t.fechas);
                            if (iso) torneosPorFecha[iso] = true;
                        });
                    }
                    if (data.titulo && data.subtitulo) {
                        var iso = parseFechaSubtitulo(data.subtitulo);
                        torneos.unshift({
                            titulo: data.titulo,
                            fechas: data.subtitulo,
                            descripcion: '',
                            enlace: data.linkUrl || 'configurador-torneos.html'
                        });
                        if (iso) torneosPorFecha[iso] = true;
                    }
                }

                renderLista(torneos);
                renderCalendario(mes, torneosPorFecha);
            })
            .catch(function () {
                renderLista([]);
                renderCalendario(mes, {});
            });

        var prev = document.getElementById('calTorneosPrev');
        var next = document.getElementById('calTorneosNext');
        var grid = document.getElementById('calTorneosGrid');

        if (prev) prev.addEventListener('click', function () {
            mes.setMonth(mes.getMonth() - 1);
            renderCalendario(mes, torneosPorFecha);
        });
        if (next) next.addEventListener('click', function () {
            mes.setMonth(mes.getMonth() + 1);
            renderCalendario(mes, torneosPorFecha);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
