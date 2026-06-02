/**
 * Paquete Golf Burgos: datos de contacto en el panel del resumen.
 * Ocultos hasta el primer clic en «Reservar Paquete»; segundo clic valida y va a Stripe.
 */
(function () {
    'use strict';

    var FORM_ID = 'configuradorForm';
    var PANEL_ID = 'datos-reserva-panel';

    function getForm() {
        return document.getElementById(FORM_ID);
    }

    function getPanel() {
        return document.getElementById(PANEL_ID);
    }

    function getPanelFormFields() {
        var panel = getPanel();
        if (!panel) return [];
        return Array.prototype.slice.call(panel.querySelectorAll('[form="' + FORM_ID + '"]'));
    }

    function setPanelFormFieldsEnabled(enabled) {
        getPanelFormFields().forEach(function (el) {
            if (enabled) el.removeAttribute('disabled');
            else el.setAttribute('disabled', 'disabled');
        });
    }

    function isPanelVisible() {
        var panel = getPanel();
        return panel && !panel.hidden;
    }

    function expandMobileResumenIfNeeded() {
        var wrapper = document.querySelector('.resumen-mobile-wrapper');
        if (!wrapper) return;
        wrapper.classList.add('expanded');
        document.body.classList.add('resumen-drawer-open');
        var tab = document.getElementById('resumen-mobile-tab');
        if (tab) tab.setAttribute('aria-expanded', 'true');
    }

    function scrollToPanel() {
        var panel = getPanel();
        if (!panel || !panel.scrollIntoView) return;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showPanel() {
        var panel = getPanel();
        if (!panel) return;
        panel.hidden = false;
        panel.setAttribute('aria-hidden', 'false');
        setPanelFormFieldsEnabled(true);
        expandMobileResumenIfNeeded();
        scrollToPanel();
        window.setTimeout(function () {
            var first = panel.querySelector(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled])'
            );
            if (!first) return;
            try {
                first.focus({ preventScroll: true });
            } catch (e) {
                first.focus();
            }
        }, 280);
    }

    function validateDatosReservaFields(form) {
        if (!form) return false;
        var panel = getPanel();
        if (!panel) return false;
        var fields = panel.querySelectorAll(
            '.usuario-form-reserva input[required], .usuario-form-reserva select[required]'
        );
        for (var i = 0; i < fields.length; i++) {
            if (!fields[i].checkValidity()) {
                fields[i].reportValidity();
                scrollToPanel();
                return false;
            }
        }
        if (typeof window.validarTelefonosForm === 'function' && !window.validarTelefonosForm(form)) {
            scrollToPanel();
            return false;
        }
        return true;
    }

    function init() {
        setPanelFormFieldsEnabled(false);
    }

    window.configuradorDatosReserva = {
        isPanelVisible: isPanelVisible,
        showPanel: showPanel,
        validateForSubmit: function (form) {
            return validateDatosReservaFields(form || getForm());
        },
        shouldRevealPanel: function () {
            return !isPanelVisible();
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
