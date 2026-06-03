/**
 * Comparativa integrada: tarjetas + checks alineados por columna (landing).
 * Datos en data/paquetes-comparativa.json
 */
(function () {
    function t(key, fallback) {
        if (window.i18n && window.i18n.t) {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
        return fallback || key;
    }

    function cellHtml(included) {
        if (included) {
            return '<span class="paquetes-comp-check" aria-label="Incluido">✓</span>';
        }
        return '';
    }

    function renderIntegrated(data) {
        var bloque = document.getElementById('paquetes-comparativa-bloque');
        if (!bloque || !data || !data.rows) return;

        bloque.querySelectorAll('.pcg-row').forEach(function (el) { el.remove(); });

        var cols = data.columns || ['golfComida', 'golfBurgos', 'campeonatoBurgos'];
        var mobileLists = {};
        cols.forEach(function (colKey) {
            var colEl = bloque.querySelector('.pcg-pack-col[data-col="' + colKey + '"]');
            var list = colEl && colEl.querySelector('.pcg-pack-features');
            if (list) {
                list.innerHTML = '';
                mobileLists[colKey] = list;
            }
        });

        for (var ri = 0; ri < data.rows.length; ri++) {
            var row = data.rows[ri];
            var label = t(row.i18n, row.fallback);
            var rowEl = document.createElement('div');
            var rowCls = 'pcg-row' + (ri % 2 === 1 ? ' pcg-row--alt' : '');
            if (row.sepBefore) rowCls += ' pcg-row--section-sep';
            rowEl.className = rowCls;
            rowEl.innerHTML = '<div class="pcg-feature-label">' + label + '</div>';

            for (var cj = 0; cj < cols.length; cj++) {
                var colKey = cols[cj];
                var included = !!row[colKey];
                var cell = document.createElement('div');
                cell.className = 'pcg-cell';
                cell.innerHTML = cellHtml(included);
                rowEl.appendChild(cell);

                var mobList = mobileLists[colKey];
                if (mobList && included) {
                    var li = document.createElement('li');
                    li.className = 'pcg-pack-features__item';
                    li.innerHTML = '<span class="paquetes-comp-check" aria-hidden="true">✓</span><span>' + label + '</span>';
                    mobList.appendChild(li);
                }
            }
            bloque.appendChild(rowEl);
        }
    }

    function loadAndRender() {
        fetch('data/paquetes-comparativa.json')
            .then(function (r) { return r.json(); })
            .then(renderIntegrated)
            .catch(function () { /* sin datos, se mantienen solo las tarjetas */ });
    }

    document.addEventListener('DOMContentLoaded', loadAndRender);
    document.addEventListener('i18n:changed', loadAndRender);
})();
