/**
 * Paquete Golf Burgos: validación de datos de contacto en el panel del resumen (sin modal).
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

    function scrollToPanel() {
        var panel = getPanel();
        if (!panel || !panel.scrollIntoView) return;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function validateDatosReservaFields(form) {
        if (!form) return false;
        var panel = getPanel();
        var root = panel || form;
        var fields = root.querySelectorAll(
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

    window.configuradorDatosReserva = {
        validateForSubmit: function (form) {
            return validateDatosReservaFields(form || getForm());
        },
    };
})();
