/**
 * Chatbot widget para Golf Lerma - conectado a Gemini (LLM)
 * Las respuestas las genera la IA; las instrucciones se pueden personalizar con CHAT_SYSTEM_PROMPT en Vercel.
 */
(function () {
    'use strict';

    var API_CHAT = '/api/chat-assistente';
    var FALLBACK_MSG = 'No he podido conectar con el asistente en este momento. Puedes llamarnos al (+34) 947 56 46 30 o usar los formularios de la web. ¿Quieres intentar de nuevo?';
    /** Teléfono atención al cliente para WhatsApp (sin +, con código país). */
    var WHATSAPP_NUMBER = '34947564630';

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

    function svgWhatsApp() {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
    }

    function init() {
        if (document.getElementById('chatbot-root')) return;

        var root = document.createElement('div');
        root.id = 'chatbot-root';
        root.className = 'chatbot-wrapper';
        root.innerHTML =
            '<div class="chatbot-fab-group">' +
            '  <a href="https://wa.me/' + WHATSAPP_NUMBER + '" class="chatbot-whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp">' + svgWhatsApp() + '</a>' +
            '  <button type="button" class="chatbot-toggle" aria-label="Abrir chat">' + svgChat() + '</button>' +
            '</div>' +
            '<div class="chatbot-window" id="chatbotWindow" role="dialog" aria-label="Chat de consultas">' +
            '  <div class="chatbot-header">' +
            '    <h3>¿En qué podemos ayudarte?</h3>' +
            '    <p class="chatbot-header-badge" aria-hidden="true">Respuestas en tiempo real con IA</p>' +
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
        var conversationHistory = [];
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

        function addLoadingMsg(container) {
            var div = crearElemento('div', 'chatbot-msg bot chatbot-loading');
            div.textContent = '…';
            var time = crearElemento('span', 'chatbot-msg-time');
            time.textContent = '';
            div.appendChild(time);
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
            return div;
        }

        function enviar() {
            var texto = (input.value || '').trim();
            if (!texto) return;
            addMsg(messages, texto, true);
            conversationHistory.push({ role: 'user', content: texto });
            input.value = '';
            input.style.height = 'auto';

            var loadingEl = addLoadingMsg(messages);
            sendBtn.disabled = true;

            fetch(API_CHAT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: texto, history: conversationHistory.slice(0, -1) })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    loadingEl.remove();
                    if (data && data.errorDetail) {
                        console.warn('Chat asistente:', data.errorDetail);
                    }
                    var reply = (data && data.reply) ? data.reply : (data && data.error) ? data.error : FALLBACK_MSG;
                    addMsg(messages, reply, false);
                    conversationHistory.push({ role: 'model', content: reply });
                })
                .catch(function () {
                    loadingEl.remove();
                    addMsg(messages, FALLBACK_MSG, false);
                    conversationHistory.push({ role: 'model', content: FALLBACK_MSG });
                })
                .then(function () {
                    sendBtn.disabled = false;
                });
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
