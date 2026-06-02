/**
 * Paquete Golf Burgos: datos de contacto en modal al pulsar «Reservar Paquete».
 * Primer clic → modal; segundo clic (tras guardar) → Stripe.
 */
(function () {
    'use strict';

    var FORM_ID = 'configuradorForm';
    var MODAL_ID = 'datos-reserva-modal';
    var OK_ATTR = 'data-datos-reserva-ok';

    function getForm() {
        return document.getElementById(FORM_ID);
    }

    function getModal() {
        return document.getElementById(MODAL_ID);
    }

    function getModalFormFields() {
        var modal = getModal();
        if (!modal) return [];
        return Array.prototype.slice.call(modal.querySelectorAll('[form="' + FORM_ID + '"]'));
    }

    function setModalFormFieldsEnabled(enabled) {
        getModalFormFields().forEach(function (el) {
            if (enabled) el.removeAttribute('disabled');
            else el.setAttribute('disabled', 'disabled');
        });
    }

    function isDatosReservaOk(form) {
        return form && form.getAttribute(OK_ATTR) === '1';
    }

    function setDatosReservaOk(form, ok) {
        if (!form) return;
        if (ok) form.setAttribute(OK_ATTR, '1');
        else form.removeAttribute(OK_ATTR);
    }

    function openModal() {
        var modal = getModal();
        if (!modal) return;
        setModalFormFieldsEnabled(true);
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('datos-reserva-modal-open');
        var first = modal.querySelector('input:not([type="hidden"]), select');
        if (first) {
            window.setTimeout(function () {
                try {
                    first.focus({ preventScroll: true });
                } catch (e) {
                    first.focus();
                }
            }, 120);
        }
    }

    function closeModal() {
        var modal = getModal();
        if (!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('datos-reserva-modal-open');
        if (!isDatosReservaOk(getForm())) setModalFormFieldsEnabled(false);
    }

    function validateConsent(form) {
        var cb = form && form.querySelector('#consentimiento-comercial');
        if (!cb || !cb.checked) {
            alert(
                (window.i18n && window.i18n.t && window.i18n.t('consentimiento_comercial_required')) ||
                    'Debes aceptar el uso de tus datos con fines comerciales para continuar.'
            );
            if (cb) cb.focus();
            return false;
        }
        return true;
    }

    function validateDatosReservaFields(form) {
        var fields = form.querySelectorAll(
            '#datos-reserva-modal [form="' +
                FORM_ID +
                '"][required], #datos-reserva-modal .usuario-form-reserva input[required], #datos-reserva-modal .usuario-form-reserva select[required]'
        );
        for (var i = 0; i < fields.length; i++) {
            if (!fields[i].checkValidity()) {
                fields[i].reportValidity();
                return false;
            }
        }
        if (typeof window.validarTelefonosForm === 'function' && !window.validarTelefonosForm(form)) {
            return false;
        }
        return validateConsent(form);
    }

    function guardarDatosReserva() {
        var form = getForm();
        if (!form) return false;
        if (!validateDatosReservaFields(form)) return false;
        setDatosReservaOk(form, true);
        closeModal();
        var hint = document.getElementById('datos-reserva-ok-hint');
        if (hint) hint.hidden = false;
        var resumen = document.querySelector('.configurador-resumen');
        if (resumen && resumen.scrollIntoView) {
            resumen.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return true;
    }

    function wireModal() {
        var modal = getModal();
        var form = getForm();
        if (!modal || !form) return;

        var backdrop = modal.querySelector('.datos-reserva-modal__backdrop');
        var btnCerrar = modal.querySelector('.datos-reserva-modal__cerrar');
        var btnGuardar = modal.querySelector('.datos-reserva-modal__guardar');

        if (backdrop) {
            backdrop.addEventListener('click', function () {
                closeModal();
            });
        }
        if (btnCerrar) {
            btnCerrar.addEventListener('click', function () {
                closeModal();
            });
        }
        if (btnGuardar) {
            btnGuardar.addEventListener('click', function () {
                guardarDatosReserva();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !modal.hidden) closeModal();
        });
    }

    function init() {
        setModalFormFieldsEnabled(false);
        wireModal();
    }

    window.configuradorDatosReserva = {
        isOk: function () {
            return isDatosReservaOk(getForm());
        },
        reset: function () {
            setDatosReservaOk(getForm(), false);
            setModalFormFieldsEnabled(false);
            var hint = document.getElementById('datos-reserva-ok-hint');
            if (hint) hint.hidden = true;
        },
        open: openModal,
        close: closeModal,
        validateAndSave: guardarDatosReserva,
        shouldInterceptSubmit: function () {
            return !isDatosReservaOk(getForm());
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
