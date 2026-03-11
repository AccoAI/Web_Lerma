/**
 * Calendario de Torneos - página dedicada.
 * Mini calendario mensual + lista de torneos desde la plataforma o data/torneos-popup.json.
 * URL por defecto en DEFAULT_PLATFORM_URL; se puede sobrescribir con window.TORNEOS_POPUP_DATA_URL.
 */
(function () {
    'use strict';

    var DEFAULT_PLATFORM_URL = 'https://plataforma-torneos-lerma-salda-a.vercel.app/api/torneos.json';

    function getDataUrl() {
        if (typeof window !== 'undefined' && typeof window.TORNEOS_POPUP_DATA_URL === 'string' && window.TORNEOS_POPUP_DATA_URL.trim()) {
            return window.TORNEOS_POPUP_DATA_URL.trim();
        }
        return DEFAULT_PLATFORM_URL;
    }

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function toISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    var MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    /** Meses en abreviatura 3 letras (API devuelve "12 MAR '26") */
    var MESES_ABREV = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

    /** Parsea una cadena de fecha y devuelve YYYY-MM-DD o null. Prueba varios formatos. */
    function parseFechaToISO(str) {
        if (!str || typeof str !== 'string') return null;
        var s = str.trim();
        if (/próximamente|pendiente|tbd/i.test(s)) return null;
        var m;
        if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
            return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
        }
        if ((m = s.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/))) {
            return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        if ((m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/))) {
            return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        if ((m = s.match(/(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+'(\d{2})/i))) {
            var mesNum = MESES_ABREV[m[2].toLowerCase().substring(0, 3)];
            if (!mesNum) return null;
            var yy = parseInt(m[3], 10);
            var year = yy >= 0 && yy <= 99 ? 2000 + yy : yy;
            return year + '-' + String(mesNum).padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        for (var i = 0; i < MESES_NOMBRE.length; i++) {
            var nombre = MESES_NOMBRE[i];
            var regex = new RegExp('(\\d{1,2})\\s*(?:de\\s*)?' + nombre + '\\s*(?:de\\s*)?(\\d{4})', 'i');
            if ((m = s.match(regex))) {
                return m[2] + '-' + String(i + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0');
            }
        }
        if ((m = s.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{4})/))) {
            return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        return null;
    }

    /** Extrae todas las fechas encontradas en un texto (una por torneo) y las añade a torneosPorFecha. */
    function addFechasFromTexto(texto, torneosPorFecha) {
        if (!texto || !torneosPorFecha) return;
        var iso = parseFechaToISO(texto);
        if (iso) torneosPorFecha[iso] = true;
        var partes = texto.split(/[\s,;]+(?:y|y\/o|\-)\s*|(?:\s+-\s+)/);
        for (var j = 0; j < partes.length; j++) {
            iso = parseFechaToISO(partes[j]);
            if (iso) torneosPorFecha[iso] = true;
        }
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
        torneos.forEach(function (t, i) {
            html += '<a href="torneo.html" class="calendario-torneo-item" data-torneo-index="' + i + '">';
            html += '<span class="calendario-torneo-fecha">' + (t.fechas || '') + '</span>';
            html += '<strong class="calendario-torneo-titulo">' + (t.titulo || 'Torneo') + '</strong>';
            if (t.descripcion) html += '<span class="calendario-torneo-desc">' + t.descripcion + '</span>';
            html += '</a>';
        });
        lista.innerHTML = html;
    }

    function setupListClicks(lista, torneos) {
        if (!lista || !torneos || !torneos.length) return;
        lista.addEventListener('click', function (e) {
            var item = e.target.closest('.calendario-torneo-item');
            if (!item) return;
            var idx = item.getAttribute('data-torneo-index');
            if (idx == null) return;
            var t = torneos[parseInt(idx, 10)];
            if (t) {
                e.preventDefault();
                try { sessionStorage.setItem('torneoSeleccionado', JSON.stringify(t)); } catch (err) {}
                window.location.href = 'torneo.html';
            }
        });
    }

    function init() {
        var mes = new Date();
        var torneosPorFecha = {};

        var dataUrl = getDataUrl();
        fetch(dataUrl)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var torneos = [];

                if (data) {
                    if (data.torneos && data.torneos.length) {
                        data.torneos.forEach(function (t) {
                            torneos.push(t);
                            addFechasFromTexto(t.fechas, torneosPorFecha);
                            if ((t.fechaInicio || '').trim()) addFechasFromTexto(t.fechaInicio, torneosPorFecha);
                            if ((t.fechaFin || '').trim()) addFechasFromTexto(t.fechaFin, torneosPorFecha);
                        });
                    }
                    if (data.titulo && data.subtitulo) {
                        addFechasFromTexto(data.subtitulo, torneosPorFecha);
                        torneos.unshift({
                            titulo: data.titulo,
                            fechas: data.subtitulo,
                            descripcion: '',
                            enlace: data.linkUrl || 'configurador-torneos.html'
                        });
                    }
                }

                renderLista(torneos);
                renderCalendario(mes, torneosPorFecha);
                setupListClicks(document.getElementById('calendario-torneos-lista'), torneos);
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
