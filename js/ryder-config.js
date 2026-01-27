// Configurador de Ryder Cup
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('configuradorRyderForm');
    const resumenDiv = document.getElementById('resumen-ryder');
    const camposDiasContainer = document.getElementById('campos-dias');
    const diasCamposContainer = document.getElementById('dias-campos-container');
    const calendarioContainer = document.getElementById('calendario-dias-ryder');

    if (calendarioContainer && form && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameDias: 'dias-juego',
            nameFechas: 'fechas[]',
            maxSeleccion: 10,
            onChange: function (count, fechas) {
                if (count > 0) {
                    camposDiasContainer.style.display = 'block';
                    generarCamposPorDia(count);
                } else {
                    camposDiasContainer.style.display = 'none';
                }
                actualizarResumenRyder();
            }
        });
    }

    function generarCamposPorDia(numDias) {
        diasCamposContainer.innerHTML = '';
        for (let i = 1; i <= numDias; i++) {
            const diaDiv = document.createElement('div');
            diaDiv.className = 'dia-campo-selector';
            diaDiv.innerHTML = `
                <h5 class="dia-titulo">Día ${i}:</h5>
                <div class="opciones-grid">
                    <label class="opcion-card">
                        <input type="radio" name="campo-dia-${i}" value="lerma" required>
                        <div class="opcion-content">
                            <span class="opcion-icon">⛳</span>
                            <span class="opcion-texto">Golf Lerma</span>
                        </div>
                    </label>
                    <label class="opcion-card">
                        <input type="radio" name="campo-dia-${i}" value="saldana" required>
                        <div class="opcion-content">
                            <span class="opcion-icon">⛳</span>
                            <span class="opcion-texto">Saldaña Golf</span>
                        </div>
                    </label>
                </div>
            `;
            diasCamposContainer.appendChild(diaDiv);
        }
    }

    // Actualizar resumen cuando cambian las opciones
    if (form) {
        const inputs = form.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        inputs.forEach(input => {
            input.addEventListener('change', actualizarResumenRyder);
        });
    }

    function actualizarResumenRyder() {
        const formData = new FormData(form);
        const diasJuego = formData.get('dias-juego');
        const noches = formData.get('noches');
        const hotelUbicacion = formData.get('hotel-ubicacion');
        const equipacion = formData.get('equipacion');
        const comida = formData.get('comida');
        const transporte = formData.get('transporte');
        const opciones = formData.getAll('opciones[]');

        if (diasJuego && noches && hotelUbicacion && equipacion && comida && transporte) {
            let resumenHTML = '<div class="resumen-items">';
            
            resumenHTML += `<p><strong>Días de juego:</strong> ${diasJuego} ${diasJuego === '1' ? 'día' : 'días'}</p>`;
            
            // Mostrar campos seleccionados por día
            if (diasJuego) {
                const numDias = parseInt(diasJuego);
                for (let i = 1; i <= numDias; i++) {
                    const campoDia = formData.get(`campo-dia-${i}`);
                    if (campoDia) {
                        const campoNombre = campoDia === 'lerma' ? 'Golf Lerma' : 'Saldaña Golf';
                        resumenHTML += `<p><strong>Día ${i}:</strong> ${campoNombre}</p>`;
                    }
                }
            }
            
            resumenHTML += `<p><strong>Noches:</strong> ${noches} ${noches === '1' ? 'noche' : 'noches'}</p>`;
            resumenHTML += `<p><strong>Hotel:</strong> ${hotelUbicacion === 'lerma' ? 'Lerma' : 'Burgos'}</p>`;
            resumenHTML += `<p><strong>Equipación con logos Lerma:</strong> ${equipacion === 'si' ? 'Sí' : 'No'}</p>`;
            
            let comidaTexto = '';
            if (comida === 'lerma') {
                comidaTexto = 'Comida en Lerma';
            } else if (comida === 'pack-huevos-morcilla') {
                comidaTexto = 'Pack Huevos + Morcilla';
            } else if (comida === 'pack-cochinillo') {
                comidaTexto = 'Pack Cochinillo';
            }
            resumenHTML += `<p><strong>Pack de comida:</strong> ${comidaTexto}</p>`;
            
            resumenHTML += `<p><strong>Transporte desde Madrid:</strong> ${transporte === 'si' ? 'Sí (hasta 12 personas)' : 'No'}</p>`;
            
            if (opciones.length > 0) {
                resumenHTML += '<p><strong>Opciones adicionales:</strong></p><ul>';
                opciones.forEach(opcion => {
                    let opcionTexto = '';
                    if (opcion === 'trofeos') opcionTexto = 'Gestión de trofeos y premios económicos';
                    else if (opcion === 'bolas') opcionTexto = 'Bolas personalizadas';
                    else if (opcion === 'buggies') opcionTexto = 'Buggies';
                    resumenHTML += `<li>${opcionTexto}</li>`;
                });
                resumenHTML += '</ul>';
            }
            
            resumenHTML += '<p style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2);"><strong>Live Scoring:</strong> Web de puntuaciones en vivo durante todo el fin de semana</p>';
            
            // Agregar información de usuarios
            const usuarios = form.querySelectorAll('.usuario-form');
            if (usuarios.length > 0) {
                resumenHTML += `<p><strong>Número de participantes:</strong> ${usuarios.length}</p>`;
            }
            
            resumenHTML += '</div>';
            resumenDiv.innerHTML = resumenHTML;
        } else {
            resumenDiv.innerHTML = '<p>Completa las opciones para ver el resumen</p>';
        }
    }

    // Manejar envío del formulario
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const diasJuego = formData.get('dias-juego');
            if (!diasJuego || diasJuego === '0') {
                alert('Selecciona al menos un día de juego en el calendario.');
                return;
            }
            const datos = {
                diasJuego: diasJuego,
                fechas: formData.getAll('fechas[]'),
                noches: formData.get('noches'),
                hotelUbicacion: formData.get('hotel-ubicacion'),
                equipacion: formData.get('equipacion'),
                comida: formData.get('comida'),
                transporte: formData.get('transporte'),
                opciones: formData.getAll('opciones[]')
            };
            
            // Aquí puedes enviar los datos a tu backend
            alert('¡Configuración de Ryder Cup enviada! Te contactaremos pronto con un presupuesto personalizado.');
        });
    }
});

