/**
 * Selector de campo por día: dos botones (Golf Lerma / Saldaña Golf) en lugar de <select>.
 */
(function () {
    var OPCIONES = [
        { v: 'lerma', l: 'Golf Lerma', title: 'Golf Lerma' },
        { v: 'saldana', l: 'Saldaña Golf', title: 'Saldaña Golf' }
    ];
    var OPCIONES_CORTAS = [
        { v: 'lerma', l: 'Lerma', title: 'Golf Lerma' },
        { v: 'saldana', l: 'Saldaña', title: 'Saldaña Golf' }
    ];

    function escapeAttr(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    function leerValorCampoDia(container, form, dayIndex) {
        var root = container || form;
        if (!root) return '';
        var hid = root.querySelector('input[type="hidden"][name="campo-dia-' + dayIndex + '"]');
        if (hid) return String(hid.value || '').trim();
        var sel = root.querySelector('select[name="campo-dia-' + dayIndex + '"]');
        return sel ? String(sel.value || '').trim() : '';
    }

    function leerValoresPrevios(container, form, numDias) {
        var prev = {};
        for (var i = 1; i <= numDias; i++) {
            var v = leerValorCampoDia(container, form, i);
            if (v) prev[i] = v;
        }
        return prev;
    }

    function setToggleActivo(item, valor) {
        if (!item) return;
        var hid = item.querySelector('input[type="hidden"][name^="campo-dia-"]');
        var btns = item.querySelectorAll('.campo-dia-toggle__btn');
        var v = valor === 'lerma' || valor === 'saldana' ? valor : '';
        if (hid) hid.value = v;
        btns.forEach(function (btn) {
            var on = btn.getAttribute('data-campo') === v;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function wireCampoDiaToggleItem(item, onChange) {
        if (!item || item.dataset.campoDiaWired === '1') return;
        item.dataset.campoDiaWired = '1';
        item.addEventListener('click', function (e) {
            var btn = e.target.closest('.campo-dia-toggle__btn');
            if (!btn || !item.contains(btn)) return;
            var campo = btn.getAttribute('data-campo');
            var hid = item.querySelector('input[type="hidden"][name^="campo-dia-"]');
            setToggleActivo(item, campo);
            if (hid) {
                hid.dispatchEvent(new Event('change', { bubbles: true }));
                hid.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (typeof onChange === 'function') onChange(item, campo);
        });
    }

    function buildCampoDiaToggleItem(dayIndex, savedValue, options) {
        options = options || {};
        var saved = savedValue === 'lerma' || savedValue === 'saldana' ? savedValue : '';
        var opciones = options.shortLabels ? OPCIONES_CORTAS : OPCIONES;
        var item = document.createElement('div');
        item.className = 'campos-dias-item campos-dias-item--campo-toggle';
        var btnsHtml = opciones.map(function (o) {
            var on = saved === o.v;
            return (
                '<button type="button" class="campo-dia-toggle__btn' + (on ? ' is-active' : '') + '" data-campo="' + o.v + '" aria-pressed="' + (on ? 'true' : 'false') + '" title="' + escapeAttr(o.title || o.l) + '">' +
                escapeAttr(o.l) +
                '</button>'
            );
        }).join('');
        item.innerHTML =
            '<span class="campos-dias-item__dia-label">Día ' + dayIndex + '</span>' +
            '<div class="campo-dia-toggle" role="group" aria-label="Campo para el día ' + dayIndex + '">' +
            btnsHtml +
            '</div>' +
            '<input type="hidden" name="campo-dia-' + dayIndex + '" value="' + escapeAttr(saved) + '">';
        if (options.required) {
            var hid = item.querySelector('input[type="hidden"]');
            if (hid) hid.setAttribute('required', 'required');
        }
        wireCampoDiaToggleItem(item, options.onChange);
        return item;
    }

    function fillCampoDiaContainer(container, numDias, form, options) {
        if (!container) return;
        options = options || {};
        var prev = leerValoresPrevios(container, form, numDias);
        container.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            container.appendChild(buildCampoDiaToggleItem(i, prev[i] || '', options));
        }
    }

    window.CAMPO_DIA_OPCIONES = OPCIONES;
    window.getCampoDiaValueFromDom = leerValorCampoDia;
    window.campoDiaTieneReservaEnDom = function (container, form, dayIndex) {
        return leerValorCampoDia(container, form, dayIndex) !== '';
    };
    window.buildCampoDiaToggleItem = buildCampoDiaToggleItem;
    window.fillCampoDiaContainer = fillCampoDiaContainer;
    window.setCampoDiaToggleValue = setToggleActivo;
})();
