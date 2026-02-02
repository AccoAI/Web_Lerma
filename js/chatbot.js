/**
 * Chatbot widget para Golf Lerma - consultas y soporte
 */
(function () {
    'use strict';

    var TELEFONO = '(+34) 947 56 46 30';

    var RESPUESTAS = {
        horario: 'Nuestros horarios dependen de la temporada y la luz solar. Puedes consultar disponibilidad y reservar en la web. Para más información, llámanos al ' + TELEFONO + '.',
        reserva: 'Puedes reservar partidas, paquetes y torneos desde esta web. Navega por "Paquetes de Golf" o "Calendario de Torneos" según lo que busques. ¿Necesitas ayuda con algo concreto?',
        precios: 'Los precios de green fees, hoteles y paquetes están en cada sección de la web. Los green fees son desde 33€ entre semana y 44€ en fin de semana. ¿Quieres ver algún paquete en concreto?',
        contacto: 'Puedes contactarnos por teléfono ' + TELEFONO + ' o a través de los formularios de reserva de cada paquete. Estaremos encantados de ayudarte.',
        socio: 'Para hacerte socio visita la sección "Hazte Socio" en el menú. Ofrecemos modalidades Oro, Plata y Cobre con distintas ventajas.',
        torneos: 'Consulta el Calendario de Torneos en el menú principal. También puedes crear tu propio torneo desde ahí.',
        saldana: 'Saldaña Golf está en la Urbanización Golf Saldaña, Saldaña de Burgos. Puedes completar tu partida en Saldaña si juegas en Golf Lerma y viceversa.',
        lerma: 'Golf Lerma está en la Autovía Madrid-Burgos km 195,5, Lerma (Burgos).',
        default: 'Gracias por tu mensaje. Si necesitas una respuesta personalizada, llámanos al ' + TELEFONO + ' o envíanos un correo a través del formulario de contacto. ¿En qué más puedo ayudarte?'
    };

    var PALABRAS_CLAVE = {
        horario: /\b(horario|hora|abierto|abren|cierra|apertura)\b/i,
        reserva: /\b(reservar|reserva|reservación|booking)\b/i,
        precios: /\b(precio|cuánto|cuesta|tarifa|green fee)\b/i,
        contacto: /\b(contacto|teléfono|llamar|email|correo)\b/i,
        socio: /\b(socio|cuota|membresía)\b/i,
        torneos: /\b(torneo|torneos|competición)\b/i,
        saldana: /\b(saldaña|saldana)\b/i,
        lerma: /\b(lerma)\b/i
    };

    function buscarRespuesta(texto) {
        var t = (texto || '').trim().toLowerCase();
        if (!t) return RESPUESTAS.default;
        for (var key in PALABRAS_CLAVE) {
            if (PALABRAS_CLAVE[key].test(texto)) return RESPUESTAS[key];
        }
        return RESPUESTAS.default;
    }

    function crearElemento(tag, className, contenido) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (contenido != null) el.textContent = contenido;
        return el;
    }

    function addMsg(container, texto, esUser) {
        var div = crearElemento('div', 'chatbot-msg ' + (esUser ? 'user' : 'bot'));
        div.textContent = texto;
        var time = crearElemento('span', 'chatbot-msg-time');
        var now = new Date();
        time.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        div.appendChild(time);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function svgChat() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    }

    function svgSend() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    }

    function init() {
        if (document.getElementById('chatbot-root')) return;

        var root = document.createElement('div');
        root.id = 'chatbot-root';
        root.className = 'chatbot-wrapper';
        root.innerHTML =
            '<button type="button" class="chatbot-toggle" aria-label="Abrir chat">' + svgChat() + '</button>' +
            '<div class="chatbot-window" id="chatbotWindow" role="dialog" aria-label="Chat de consultas">' +
            '  <div class="chatbot-header">' +
            '    <h3>¿En qué podemos ayudarte?</h3>' +
            '    <button type="button" class="chatbot-close" aria-label="Cerrar chat">×</button>' +
            '  </div>' +
            '  <div class="chatbot-messages" id="chatbotMessages"></div>' +
            '  <div class="chatbot-input-wrap">' +
            '    <textarea class="chatbot-input" id="chatbotInput" placeholder="Escribe tu consulta..." rows="1"></textarea>' +
            '    <button type="button" class="chatbot-send" aria-label="Enviar">' + svgSend() + '</button>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(root);

        var toggle = root.querySelector('.chatbot-toggle');
        var windowEl = document.getElementById('chatbotWindow');
        var messages = document.getElementById('chatbotMessages');
        var input = document.getElementById('chatbotInput');
        var sendBtn = root.querySelector('.chatbot-send');
        var closeBtn = root.querySelector('.chatbot-close');

        var mensajeInicial = 'Hola, soy el asistente de Golf Lerma. Puedo ayudarte con horarios, reservas, precios o cómo contactarnos. ¿Qué necesitas?';
        if (!messages.querySelector('.chatbot-msg')) {
            addMsg(messages, mensajeInicial, false);
        }

        function abrir() {
            windowEl.classList.add('open');
            input.focus();
        }

        function cerrar() {
            windowEl.classList.remove('open');
        }

        function enviar() {
            var texto = (input.value || '').trim();
            if (!texto) return;
            addMsg(messages, texto, true);
            input.value = '';
            input.style.height = 'auto';

            setTimeout(function () {
                var respuesta = buscarRespuesta(texto);
                addMsg(messages, respuesta, false);
            }, 400);
        }

        toggle.addEventListener('click', abrir);
        closeBtn.addEventListener('click', cerrar);
        sendBtn.addEventListener('click', enviar);

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
            }
        });

        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
