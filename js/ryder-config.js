// Configurador de Ryder Cup
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('configuradorRyderForm');
    const resumenDiv = document.getElementById('resumen-ryder');
    const camposDiasContainer = document.getElementById('campos-dias-ryder');
    const diasCamposContainer = document.getElementById('dias-campos-container-ryder');
    const calendarioContainer = document.getElementById('calendario-dias-ryder');

    if (calendarioContainer && form && typeof CalendarioDias !== 'undefined') {
        CalendarioDias.init({
            container: calendarioContainer,
            form: form,
            nameDias: 'dias-juego',
            nameFechas: 'fechas[]',
            maxSeleccion: 10,
            onChange: function (count, fechas) {
                if (camposDiasContainer) {
                    if (count > 0) {
                        camposDiasContainer.style.display = 'block';
                        generarCamposPorDia(count);
                    } else {
                        camposDiasContainer.style.display = 'none';
                    }
                }
                actualizarResumenRyder();
            }
        });
    }

    function generarCamposPorDia(numDias) {
        if (!diasCamposContainer) return;
        var prev = {};
        for (var i = 1; i <= numDias; i++) {
            var sel = form && form.querySelector('select[name="campo-dia-' + i + '"]');
            if (sel && sel.value) prev[i] = sel.value;
        }
        diasCamposContainer.innerHTML = '';
        for (var i = 1; i <= numDias; i++) {
            var saved = prev[i] || '';
            var item = document.createElement('div');
            item.className = 'campos-dias-item';
            item.innerHTML = [
                '<label for="campo-dia-' + i + '-sel-ryder">Día ' + i + '</label>',
                '<select id="campo-dia-' + i + '-sel-ryder" name="campo-dia-' + i + '" required>',
                '<option value="">Sin reserva</option>',
                '<option value="lerma"' + (saved === 'lerma' ? ' selected' : '') + '>Golf Lerma</option>',
                '<option value="saldana"' + (saved === 'saldana' ? ' selected' : '') + '>Saldaña Golf</option>',
                '</select>'
            ].join('');
            diasCamposContainer.appendChild(item);
        }
    }

    // Actualizar resumen cuando cambian las opciones
    if (form) {
        form.addEventListener('change', function(e) {
            actualizarResumenRyder();
        });
        form.addEventListener('input', function(e) {
            actualizarResumenRyder();
        });
    }

    function actualizarResumenRyder() {
        const formData = new FormData(form);
        const diasJuego = formData.get('dias-juego');
        const noches = formData.get('noches');
        const hotelUbicacion = formData.get('hotel-ubicacion');
        const comida = formData.get('comida');
        const transporte = formData.get('transporte');
        
        // Servicios adicionales (ancillaries)
        const ancillaries = [];
        if (formData.get('ancillary_bolas_personalizadas')) ancillaries.push('Bolas personalizadas');
        if (formData.get('ancillary_equipacion_equipos')) ancillaries.push('Equipación por equipos personalizada');
        if (formData.get('ancillary_gestion_trofeos')) ancillaries.push('Gestión de trofeos');
        if (formData.get('ancillary_premio_economico')) ancillaries.push('Premio económico');
        if (formData.get('ancillary_buggy')) ancillaries.push('Buggies');

        if (diasJuego && noches && hotelUbicacion && comida && transporte) {
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
            
            if (ancillaries.length > 0) {
                resumenHTML += '<p><strong>Servicios adicionales:</strong> ' + ancillaries.join(', ') + '</p>';
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
                comida: formData.get('comida'),
                transporte: formData.get('transporte'),
                ancillaries: {
                    bolas_personalizadas: formData.get('ancillary_bolas_personalizadas') === '1',
                    equipacion_equipos: formData.get('ancillary_equipacion_equipos') === '1',
                    gestion_trofeos: formData.get('ancillary_gestion_trofeos') === '1',
                    premio_economico: formData.get('ancillary_premio_economico') === '1',
                    buggy: formData.get('ancillary_buggy') === '1'
                }
            };
            
            // Aquí puedes enviar los datos a tu backend
            alert('¡Configuración de Ryder Cup enviada! Te contactaremos pronto con un presupuesto personalizado.');
        });
    }
});

