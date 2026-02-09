/**
 * Chatbot widget para Golf Lerma - conectado a Gemini (LLM)
 * Las respuestas las genera la IA; las instrucciones se pueden personalizar con CHAT_SYSTEM_PROMPT en Vercel.
 */
(function () {
    'use strict';

    var API_CHAT = '/api/chat-assistente';
    var FALLBACK_MSG = 'No he podido conectar con el asistente en este momento. Puedes llamarnos al (+34) 947 56 46 30 o usar los formularios de la web. ¿Quieres intentar de nuevo?';

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
