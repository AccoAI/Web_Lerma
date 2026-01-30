/**
 * Agenda de actividades - Hazte Socio.
 * Mini calendario + vista semanal con eventos.
 */
(function () {
    'use strict';

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    var DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    var HORAS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

    /* Eventos mock (fecha YYYY-MM-DD, hora, titulo, tipo) */
    var EVENTOS = [
        { fecha: '2025-02-19', hora: 11, titulo: 'Javier Pérez - Torneo', tipo: 'deporte' },
        { fecha: '2025-02-19', hora: 14, titulo: 'Expo bonsáis', tipo: 'exposicion' },
        { fecha: '2025-02-20', hora: 10, titulo: 'Curso iniciación', tipo: 'curso' },
        { fecha: '2025-02-20', hora: 17, titulo: 'Partida socios', tipo: 'deporte' },
        { fecha: '2025-02-21', hora: 12, titulo: 'Clase individual', tipo: 'curso' },
        { fecha: '2025-02-22', hora: 9, titulo: 'Torneo fin de semana', tipo: 'deporte' },
        { fecha: '2025-02-22', hora: 13, titulo: 'Comida torneo', tipo: 'otros' },
        { fecha: '2025-02-23', hora: 11, titulo: 'Expo material golf', tipo: 'exposicion' },
    ];

    function toISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getLunes(d) {
        var x = new Date(d);
        var dia = x.getDay();
        var diff = x.getDate() - dia + (dia === 0 ? -6 : 1);
        x.setDate(diff);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    function renderMiniCal(mes) {
        var grid = document.getElementById('agendaCalGrid');
        var mesEl = document.getElementById('agendaCalMes');
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
            span.textContent = d.getDate();
            span.dataset.fecha = iso;
            grid.appendChild(span);
        }
    }

    function renderSemana(lunes) {
        var header = document.getElementById('agendaSemanaHeader');
        var body = document.getElementById('agendaSemanaBody');
        if (!header || !body) return;

        header.innerHTML = '<div class="agenda-hora-col"></div>';
        body.innerHTML = '';

        var dias = [];
        for (var i = 0; i < 7; i++) {
            var d = new Date(lunes);
            d.setDate(d.getDate() + i);
            dias.push(d);
            var col = document.createElement('div');
            col.className = 'agenda-dia-col';
            col.innerHTML = '<span class="agenda-dia-nom">' + DIAS[d.getDay()] + '</span><span class="agenda-dia-num">' + d.getDate() + '</span>';
            col.dataset.fecha = toISO(d);
            header.appendChild(col);
        }

        var filtroActivo = (document.querySelector('.agenda-filtro.activo') || {}).dataset?.filtro || 'todos';

        HORAS.forEach(function (h) {
            var fila = document.createElement('div');
            fila.className = 'agenda-fila';
            fila.innerHTML = '<div class="agenda-hora-col">' + String(h).padStart(2, '0') + ':00</div>';
            dias.forEach(function (d) {
                var iso = toISO(d);
                var celda = document.createElement('div');
                celda.className = 'agenda-celda';
                celda.dataset.fecha = iso;
                celda.dataset.hora = h;
                var evs = EVENTOS.filter(function (e) {
                    if (e.fecha !== iso || e.hora !== h) return false;
                    if (filtroActivo === 'todos') return true;
                    return e.tipo === filtroActivo;
                });
                evs.forEach(function (e) {
                    var ev = document.createElement('div');
                    ev.className = 'agenda-evento agenda-evento-' + e.tipo;
                    ev.textContent = e.titulo;
                    celda.appendChild(ev);
                });
                fila.appendChild(celda);
            });
            body.appendChild(fila);
        });
    }

    function init() {
        var mes = new Date(2025, 1, 1);
        var lunes = getLunes(mes);

        renderMiniCal(mes);
        renderSemana(lunes);

        var prev = document.getElementById('agendaCalPrev');
        var next = document.getElementById('agendaCalNext');
        if (prev) prev.addEventListener('click', function () {
            mes.setMonth(mes.getMonth() - 1);
            lunes = getLunes(mes);
            renderMiniCal(mes);
            renderSemana(lunes);
        });
        if (next) next.addEventListener('click', function () {
            mes.setMonth(mes.getMonth() + 1);
            lunes = getLunes(mes);
            renderMiniCal(mes);
            renderSemana(lunes);
        });

        document.getElementById('agendaCalGrid').addEventListener('click', function (e) {
            var dia = e.target.closest('.agenda-cal-dia');
            if (!dia || !dia.dataset.fecha) return;
            lunes = getLunes(new Date(dia.dataset.fecha));
            renderSemana(lunes);
        });

        document.querySelectorAll('.agenda-filtro').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.agenda-filtro').forEach(function (b) { b.classList.remove('activo'); });
                btn.classList.add('activo');
                renderSemana(lunes);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
