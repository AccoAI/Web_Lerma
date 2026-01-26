// Gestión de formularios de usuarios
function initUsuariosForm() {
    const agregarBtn = document.getElementById('agregar-usuario');
    const usuariosContainer = document.getElementById('usuarios-container');
    
    if (!agregarBtn || !usuariosContainer) return;
    
    let contadorUsuarios = 1;
    
    // Agregar nuevo usuario
    agregarBtn.addEventListener('click', () => {
        contadorUsuarios++;
        const nuevoUsuario = crearFormularioUsuario(contadorUsuarios);
        usuariosContainer.appendChild(nuevoUsuario);
        
        // Scroll suave al nuevo formulario
        nuevoUsuario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    
    function crearFormularioUsuario(numero) {
        const usuarioDiv = document.createElement('div');
        usuarioDiv.className = 'usuario-form';
        usuarioDiv.setAttribute('data-usuario', numero);
        
        usuarioDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 class="usuario-numero">Participante ${numero}</h4>
                <button type="button" class="btn-eliminar-usuario" onclick="eliminarUsuario(this)">
                    <span>×</span> Eliminar
                </button>
            </div>
            <div class="usuario-campos">
                <div class="form-group-usuario">
                    <label>Nombre *</label>
                    <input type="text" name="usuario[${numero}][nombre]" required>
                </div>
                <div class="form-group-usuario">
                    <label>Correo *</label>
                    <input type="email" name="usuario[${numero}][correo]" required>
                </div>
                <div class="form-group-usuario">
                    <label>Móvil *</label>
                    <input type="tel" name="usuario[${numero}][movil]" required>
                </div>
                <div class="form-group-usuario">
                    <label>Club</label>
                    <input type="text" name="usuario[${numero}][club]">
                </div>
                <div class="form-group-usuario">
                    <label>Handicap</label>
                    <input type="number" name="usuario[${numero}][handicap]" min="0" max="54" step="0.1">
                </div>
            </div>
        `;
        
        return usuarioDiv;
    }
    
    // Función global para eliminar usuario
    window.eliminarUsuario = function(btn) {
        const usuarioForm = btn.closest('.usuario-form');
        if (usuarioForm) {
            // No permitir eliminar si solo queda uno
            const totalUsuarios = usuariosContainer.querySelectorAll('.usuario-form').length;
            if (totalUsuarios > 1) {
                usuarioForm.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                usuarioForm.style.opacity = '0';
                usuarioForm.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    usuarioForm.remove();
                    // Renumerar usuarios restantes
                    renumerarUsuarios();
                }, 300);
            } else {
                alert('Debe haber al menos un participante');
            }
        }
    };
    
    function renumerarUsuarios() {
        const usuarios = usuariosContainer.querySelectorAll('.usuario-form');
        usuarios.forEach((usuario, index) => {
            const nuevoNumero = index + 1;
            usuario.setAttribute('data-usuario', nuevoNumero);
            const titulo = usuario.querySelector('.usuario-numero');
            if (titulo) {
                titulo.textContent = `Participante ${nuevoNumero}`;
            }
            // Renumerar los inputs
            const inputs = usuario.querySelectorAll('input');
            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    const newName = name.replace(/usuario\[\d+\]/, `usuario[${nuevoNumero}]`);
                    input.setAttribute('name', newName);
                }
            });
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initUsuariosForm();
});
