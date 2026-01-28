// Gestión de formularios de usuarios
// Opciones por data en #usuarios-container: data-max-participantes, data-extra-opcionales, data-simplificar-extras, data-grupos-correspondencia
function initUsuariosForm() {
    const agregarBtn = document.getElementById('agregar-usuario');
    const usuariosContainer = document.getElementById('usuarios-container');

    if (!agregarBtn || !usuariosContainer) return;

    const maxP = parseInt(usuariosContainer.getAttribute('data-max-participantes') || '0', 10) || 99;
    const extraOpt = usuariosContainer.getAttribute('data-extra-opcionales') === 'true';
    const simplificar = usuariosContainer.getAttribute('data-simplificar-extras') === 'true';
    const gruposCorr = usuariosContainer.getAttribute('data-grupos-correspondencia') === 'true';

    const gruposWrap = document.getElementById('correspondencia-grupos-wrap');
    const contadorEl = document.getElementById('participantes-contador');

    let contadorUsuarios = 1;

    function actualizarContadorYBotón() {
        const n = usuariosContainer.querySelectorAll('.usuario-form').length;
        if (contadorEl) {
            if (maxP < 99) {
                contadorEl.textContent = n + ' / ' + maxP + ' participantes';
            } else {
                contadorEl.textContent = n === 1 ? '' : n + ' participantes';
            }
        }
        if (agregarBtn) {
            if (n >= maxP) {
                agregarBtn.disabled = true;
                agregarBtn.setAttribute('aria-hidden', 'true');
            } else {
                agregarBtn.disabled = false;
                agregarBtn.removeAttribute('aria-hidden');
            }
        }
        if (gruposCorr && gruposWrap) {
            if (n >= 1) {
                gruposWrap.style.display = 'block';
                gruposWrap.setAttribute('aria-hidden', 'false');
                if (!gruposWrap.querySelector('.correspondencia-grupos-inner')) inicializarGruposBlock();
            } else {
                gruposWrap.style.display = 'none';
                gruposWrap.setAttribute('aria-hidden', 'true');
            }
        }
        if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
    }

    function inicializarGruposBlock() {
        if (!gruposWrap || gruposWrap.querySelector('.correspondencia-grupos-inner')) return;
        const clubs = (typeof getClubsCorrespondencia === 'function' && getClubsCorrespondencia()) || [];
        let optHtml = '<option value="sin">Sin correspondencia</option>';
        clubs.forEach(function (c) {
            optHtml += '<option value="' + (c.id || '').replace(/"/g, '&quot;') + '">' + (c.nombre || '').replace(/</g, '&lt;') + '</option>';
        });
        const inner = document.createElement('div');
        inner.className = 'correspondencia-grupos-inner';
        inner.innerHTML =
            '<h4 class="correspondencia-grupos-titulo">Correspondencias por grupos (opcional)</h4>' +
            '<p class="correspondencia-grupos-hint">Indica cuántos participantes adicionales tienen correspondencia de cada club. Ej.: 3 × Club A, 2 × Club B, 2 sin.</p>' +
            '<div class="correspondencia-grupos-rows"></div>' +
            '<button type="button" class="btn-anadir-grupo">+ Añadir grupo</button>';
        gruposWrap.appendChild(inner);
        const rowsCont = inner.querySelector('.correspondencia-grupos-rows');
        const btnAdd = inner.querySelector('.btn-anadir-grupo');
        function addRow() {
            const row = document.createElement('div');
            row.className = 'correspondencia-grupos-row';
            row.innerHTML =
                '<label class="corr-grupo-label"><input type="number" name="correspondencia_grupo[][cantidad]" min="1" class="corr-grupo-cantidad" placeholder="Nº" value="1"> personas con</label>' +
                '<select name="correspondencia_grupo[][club_id]" class="corr-grupo-club">' + optHtml + '</select>' +
                '<button type="button" class="btn-eliminar-grupo" aria-label="Quitar grupo">×</button>';
            rowsCont.appendChild(row);
            row.querySelector('.btn-eliminar-grupo').addEventListener('click', function () {
                row.remove();
                if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
            });
            row.querySelector('.corr-grupo-club').addEventListener('change', function () { if (typeof window.actualizarResumen === 'function') window.actualizarResumen(); });
            row.querySelector('.corr-grupo-cantidad').addEventListener('input', function () { if (typeof window.actualizarResumen === 'function') window.actualizarResumen(); });
            row.querySelector('.corr-grupo-cantidad').addEventListener('change', function () { if (typeof window.actualizarResumen === 'function') window.actualizarResumen(); });
            if (typeof window.actualizarResumen === 'function') window.actualizarResumen();
        }
        btnAdd.addEventListener('click', addRow);
        addRow();
    }

    function crearFormularioUsuario(numero) {
        const usuarioDiv = document.createElement('div');
        usuarioDiv.className = 'usuario-form';
        usuarioDiv.setAttribute('data-usuario', numero);

        const esExtraSimplificado = (extraOpt && simplificar && numero >= 2);
        const req = (extraOpt && numero >= 2) ? '' : ' required';

        if (esExtraSimplificado) {
            usuarioDiv.innerHTML =
                '<div class="usuario-form-header">' +
                '<h4 class="usuario-numero">Participante ' + numero + '</h4>' +
                '<button type="button" class="btn-eliminar-usuario" onclick="eliminarUsuario(this)"><span>×</span> Eliminar</button>' +
                '</div>' +
                '<div class="usuario-campos">' +
                '<div class="form-group-usuario"><label>Nombre</label><input type="text" name="usuario[' + numero + '][nombre]"></div>' +
                '<div class="form-group-usuario"><label>Correo</label><input type="email" name="usuario[' + numero + '][correo]"></div>' +
                '<div class="form-group-usuario"><label>Móvil</label><input type="tel" name="usuario[' + numero + '][movil]"></div>' +
                '</div>';
        } else {
            usuarioDiv.innerHTML =
                '<div class="usuario-form-header">' +
                '<h4 class="usuario-numero">Participante ' + numero + '</h4>' +
                '<button type="button" class="btn-eliminar-usuario" onclick="eliminarUsuario(this)"><span>×</span> Eliminar</button>' +
                '</div>' +
                '<div class="usuario-campos">' +
                '<div class="form-group-usuario"><label>Nombre *</label><input type="text" name="usuario[' + numero + '][nombre]"' + req + '></div>' +
                '<div class="form-group-usuario"><label>Correo *</label><input type="email" name="usuario[' + numero + '][correo]"' + req + '></div>' +
                '<div class="form-group-usuario"><label>Móvil *</label><input type="tel" name="usuario[' + numero + '][movil]"' + req + '></div>' +
                '<div class="form-group form-group-correspondencia" data-campo="paquete">' +
                '<label>Club / Campo de procedencia (para tarifa correspondencia)</label>' +
                '<select name="usuario[' + numero + '][club_correspondencia]" class="select-club-correspondencia"></select>' +
                '<div class="correspondencia-precio-info"></div></div>' +
                '<div class="form-group-usuario"><label>Club</label><input type="text" name="usuario[' + numero + '][club]"></div>' +
                '<div class="form-group-usuario"><label>Handicap</label><input type="number" name="usuario[' + numero + '][handicap]" min="0" max="54" step="0.1"></div>' +
                '</div>';
        }

        return usuarioDiv;
    }

    agregarBtn.addEventListener('click', function () {
        const n = usuariosContainer.querySelectorAll('.usuario-form').length;
        if (n >= maxP) return;
        contadorUsuarios++;
        const nuevoUsuario = crearFormularioUsuario(contadorUsuarios);
        usuariosContainer.appendChild(nuevoUsuario);
        const sel = nuevoUsuario.querySelector('.select-club-correspondencia');
        if (sel && typeof window.inicializarSelectCorrespondencia === 'function') window.inicializarSelectCorrespondencia(sel);
        nuevoUsuario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        actualizarContadorYBotón();
    });

    window.eliminarUsuario = function (btn) {
        const usuarioForm = btn.closest('.usuario-form');
        if (!usuarioForm) return;
        const totalUsuarios = usuariosContainer.querySelectorAll('.usuario-form').length;
        if (totalUsuarios <= 1) {
            alert('Debe haber al menos un participante');
            return;
        }
        if (usuarioForm.classList.contains('usuario-form-reserva')) {
            alert('No se puede eliminar el participante que realiza la reserva.');
            return;
        }
        usuarioForm.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        usuarioForm.style.opacity = '0';
        usuarioForm.style.transform = 'translateX(-20px)';
        setTimeout(function () {
            usuarioForm.remove();
            renumerarUsuarios();
            actualizarContadorYBotón();
        }, 300);
    };

    function renumerarUsuarios() {
        const usuarios = usuariosContainer.querySelectorAll('.usuario-form');
        usuarios.forEach(function (usuario, index) {
            const nuevoNumero = index + 1;
            usuario.setAttribute('data-usuario', nuevoNumero);
            const titulo = usuario.querySelector('.usuario-numero');
            if (titulo) {
                if (nuevoNumero === 1 && usuario.classList.contains('usuario-form-reserva')) {
                    titulo.textContent = 'Datos de la reserva *';
                } else {
                    titulo.textContent = 'Participante ' + nuevoNumero;
                }
            }
            usuario.querySelectorAll('input, select').forEach(function (el) {
                const name = el.getAttribute('name');
                if (name && /usuario\[\d+\]/.test(name)) {
                    el.setAttribute('name', name.replace(/usuario\[\d+\]/, 'usuario[' + nuevoNumero + ']'));
                }
            });
        });
    }

    actualizarContadorYBotón();
}

document.addEventListener('DOMContentLoaded', function () {
    initUsuariosForm();
});
