/**
 * Tabla comparativa de paquetes (landing). Datos en data/paquetes-comparativa.json
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

    function renderTable(data) {
        var host = document.getElementById('paquetes-comparativa-table');
        if (!host || !data || !data.rows) return;

        var cols = data.columns || ['golfComida', 'golfBurgos', 'campeonatoBurgos'];
        var colLabels = [];
        for (var ci = 0; ci < cols.length; ci++) {
            var colKey = cols[ci];
            var colDef = data.columnLabels && data.columnLabels[colKey];
            colLabels.push(colDef ? t(colDef.i18n, colDef.fallback) : colKey);
        }

        var html = '<table class="paquetes-comparativa"><thead><tr>';
        html += '<th scope="col" class="paquetes-comparativa__feature-col">' + t('comp_col_incluye', 'Qué incluye') + '</th>';
        for (var cj = 0; cj < colLabels.length; cj++) {
            html += '<th scope="col">' + colLabels[cj] + '</th>';
        }
        html += '</tr></thead><tbody>';

        for (var ri = 0; ri < data.rows.length; ri++) {
            var row = data.rows[ri];
            html += '<tr><th scope="row">' + t(row.i18n, row.fallback) + '</th>';
            for (var cj = 0; cj < cols.length; cj++) {
                html += '<td>' + cellHtml(!!row[cols[cj]]) + '</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        host.innerHTML = html;
    }

    function loadAndRender() {
        fetch('data/paquetes-comparativa.json')
            .then(function (r) { return r.json(); })
            .then(renderTable)
            .catch(function () {
                var host = document.getElementById('paquetes-comparativa-table');
                if (host) host.innerHTML = '';
            });
    }

    document.addEventListener('DOMContentLoaded', loadAndRender);
    document.addEventListener('i18n:changed', loadAndRender);
})();
