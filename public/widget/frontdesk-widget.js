/**
 * FrontDesk AI — Embeddable Chat Widget
 *
 * Usage: Add this to any website:
 * <script src="https://your-server.com/widget/frontdesk-widget.js"
 *         data-business="plateau-kitchen"
 *         data-server="https://your-server.com"></script>
 */
(function () {
  const script = document.currentScript;
  const BUSINESS_SLUG = script.getAttribute('data-business');
  const SERVER = script.getAttribute('data-server') || window.location.origin;

  if (!BUSINESS_SLUG) {
    console.error('FrontDesk: data-business attribute is required');
    return;
  }

  let businessData = null;
  let conversationId = null;
  let isOpen = false;

  // Fetch business info
  fetch(`${SERVER}/api/business/${BUSINESS_SLUG}`)
    .then(r => r.json())
    .then(data => {
      businessData = data;
      injectWidget(data);
    })
    .catch(err => console.error('FrontDesk: Failed to load business info', err));

  function injectWidget(biz) {
    const color = biz.theme_color || '#2563eb';

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      #fd-bubble {
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        width: 60px; height: 60px; border-radius: 50%;
        background: ${color}; color: white;
        border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #fd-bubble:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
      #fd-bubble.open { transform: rotate(45deg) scale(1); }
      #fd-bubble.open::after { content: '✕'; font-size: 1.4rem; }
      #fd-bubble:not(.open)::after { content: '💬'; }

      #fd-chat {
        position: fixed; bottom: 96px; right: 24px; z-index: 99998;
        width: 380px; max-width: calc(100vw - 48px);
        height: 520px; max-height: calc(100vh - 120px);
        background: white; border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.18);
        display: none; flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #fd-chat.open { display: flex; }

      #fd-header {
        background: ${color}; color: white;
        padding: 1rem 1.25rem;
        display: flex; align-items: center; gap: 0.75rem;
      }
      #fd-header-dot { width: 10px; height: 10px; border-radius: 50%; background: #4ade80; flex-shrink: 0; }
      #fd-header-info h3 { font-size: 0.95rem; font-weight: 600; margin: 0; }
      #fd-header-info p { font-size: 0.75rem; opacity: 0.85; margin: 0.15rem 0 0 0; }

      #fd-messages {
        flex: 1; overflow-y: auto; padding: 1rem;
        display: flex; flex-direction: column; gap: 0.5rem;
      }
      .fd-msg {
        max-width: 85%; padding: 0.6rem 0.85rem;
        border-radius: 14px; font-size: 0.9rem; line-height: 1.5;
        word-wrap: break-word;
      }
      .fd-msg.assistant {
        align-self: flex-start;
        background: #f1f5f9; color: #1e293b;
        border-bottom-left-radius: 4px;
      }
      .fd-msg.user {
        align-self: flex-end;
        background: ${color}; color: white;
        border-bottom-right-radius: 4px;
      }
      .fd-msg.typing {
        align-self: flex-start;
        background: #f1f5f9; color: #94a3b8;
        font-style: italic;
      }

      #fd-input-area {
        padding: 0.75rem; border-top: 1px solid #e2e8f0;
        display: flex; gap: 0.5rem;
      }
      #fd-input {
        flex: 1; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 0.6rem 0.85rem; font-size: 0.9rem;
        outline: none; font-family: inherit;
      }
      #fd-input:focus { border-color: ${color}; }
      #fd-send {
        background: ${color}; color: white; border: none;
        border-radius: 10px; padding: 0.6rem 1rem;
        font-size: 0.9rem; font-weight: 600; cursor: pointer;
      }
      #fd-send:disabled { opacity: 0.5; cursor: not-allowed; }

      #fd-powered {
        text-align: center; padding: 0.4rem;
        font-size: 0.65rem; color: #94a3b8;
      }
    `;
    document.head.appendChild(style);

    // Create chat window
    const chat = document.createElement('div');
    chat.id = 'fd-chat';
    chat.innerHTML = `
      <div id="fd-header">
        <div id="fd-header-dot"></div>
        <div id="fd-header-info">
          <h3>${escapeHtml(biz.name)}</h3>
          <p>Typically replies instantly</p>
        </div>
      </div>
      <div id="fd-messages"></div>
      <div id="fd-input-area">
        <input id="fd-input" type="text" placeholder="Type your question..." autocomplete="off">
        <button id="fd-send">Send</button>
      </div>
      <div id="fd-powered">Powered by FrontDesk AI</div>
    `;
    document.body.appendChild(chat);

    // Create bubble
    const bubble = document.createElement('button');
    bubble.id = 'fd-bubble';
    bubble.setAttribute('aria-label', 'Chat with us');
    document.body.appendChild(bubble);

    // Events
    bubble.addEventListener('click', toggleChat);
    document.getElementById('fd-send').addEventListener('click', sendMessage);
    document.getElementById('fd-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('fd-chat').classList.toggle('open', isOpen);
    document.getElementById('fd-bubble').classList.toggle('open', isOpen);

    if (isOpen) {
      const messages = document.getElementById('fd-messages');
      if (messages.children.length === 0) {
        addMessage('assistant', businessData.welcome_message);
      }
      document.getElementById('fd-input').focus();
    }
  }

  async function sendMessage() {
    const input = document.getElementById('fd-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage('user', text);

    const sendBtn = document.getElementById('fd-send');
    sendBtn.disabled = true;

    // Show typing indicator
    const typingEl = addMessage('typing', 'Typing...');

    try {
      const res = await fetch(`${SERVER}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: businessData.id,
          conversationId,
          message: text,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        conversationId = data.conversationId;
        typingEl.remove();
        addMessage('assistant', data.reply);
      } else {
        typingEl.remove();
        addMessage('assistant', data.error || 'Sorry, something went wrong. Please try calling us!');
      }
    } catch (err) {
      typingEl.remove();
      addMessage('assistant', 'Sorry, I\'m having trouble connecting. Please call us directly!');
    }

    sendBtn.disabled = false;
    input.focus();
  }

  function addMessage(role, content) {
    const messages = document.getElementById('fd-messages');
    const msg = document.createElement('div');
    msg.className = `fd-msg ${role}`;
    msg.textContent = content;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
