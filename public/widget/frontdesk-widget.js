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
    const color = biz.theme_color || '#0d9488';

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      #fd-bubble {
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        width: 60px; height: 60px; border-radius: 50%;
        background: ${color}; color: white;
        border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 0 ${color}40;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
        animation: fd-pulse 3s ease-in-out infinite;
      }
      @keyframes fd-pulse { 0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 0 ${color}40; } 50% { box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 8px ${color}00; } }
      #fd-bubble:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,0,0,0.25); animation: none; }
      #fd-bubble.open { transform: rotate(0deg) scale(1); animation: none; }
      #fd-bubble svg { width: 28px; height: 28px; fill: white; transition: transform 0.3s, opacity 0.3s; }
      #fd-bubble .fd-icon-close { display: none; }
      #fd-bubble.open .fd-icon-chat { display: none; }
      #fd-bubble.open .fd-icon-close { display: block; }

      #fd-chat {
        position: fixed; bottom: 96px; right: 24px; z-index: 99998;
        width: 380px; max-width: calc(100vw - 48px);
        height: 520px; max-height: calc(100vh - 120px);
        background: white; border-radius: 20px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        display: flex; flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0; visibility: hidden;
        transform: translateY(16px) scale(0.96);
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    visibility 0.3s;
      }
      #fd-chat.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }

      #fd-header {
        background: ${color}; color: white;
        padding: 1.1rem 1.25rem;
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
        max-width: 85%; padding: 0.65rem 0.9rem;
        border-radius: 16px; font-size: 0.88rem; line-height: 1.55;
        word-wrap: break-word;
        animation: fd-msg-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes fd-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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
      }
      .fd-msg.typing::after {
        content: ''; display: inline-block;
        animation: fd-dots 1.4s infinite;
      }
      @keyframes fd-dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60%, 100% { content: '...'; }
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
        text-align: center; padding: 0.5rem;
        font-size: 0.6rem; color: #c0c8d4; letter-spacing: 0.3px;
      }
      #fd-powered a { color: #94a3b8; text-decoration: none; }
      #fd-powered a:hover { color: #64748b; }

      #fd-greeting {
        position: fixed; bottom: 92px; right: 24px; z-index: 99997;
        background: white; color: #1e293b;
        padding: 12px 18px; border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
        font-size: 14px; font-weight: 500; line-height: 1.4;
        max-width: 260px;
        opacity: 0; visibility: hidden;
        transform: translateY(8px) scale(0.95);
        transition: opacity 0.4s, transform 0.4s, visibility 0.4s;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #fd-greeting.show { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
      #fd-greeting::after {
        content: ''; position: absolute; bottom: -6px; right: 28px;
        width: 12px; height: 12px; background: white;
        transform: rotate(45deg);
        box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
      }
      #fd-greeting .fd-g-close {
        position: absolute; top: 4px; right: 8px;
        background: none; border: none; font-size: 14px;
        color: #94a3b8; cursor: pointer; padding: 2px;
      }
      #fd-greeting .fd-g-close:hover { color: #64748b; }
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
      <div id="fd-powered"><a href="#">Powered by FrontDesk AI</a></div>
    `;
    document.body.appendChild(chat);

    // Create bubble
    const bubble = document.createElement('button');
    bubble.id = 'fd-bubble';
    bubble.setAttribute('aria-label', 'Chat with us');
    bubble.innerHTML = `
      <svg class="fd-icon-chat" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z" fill="none"/><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <svg class="fd-icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    `;
    document.body.appendChild(bubble);

    // Greeting tooltip
    const greeting = document.createElement('div');
    greeting.id = 'fd-greeting';
    greeting.innerHTML = `${escapeHtml(biz.welcome_message)} <button class="fd-g-close" aria-label="Close">&times;</button>`;
    document.body.appendChild(greeting);

    // Show greeting after 3s if chat not opened
    setTimeout(() => {
      if (!isOpen) greeting.classList.add('show');
    }, 3000);
    greeting.querySelector('.fd-g-close').addEventListener('click', (e) => {
      e.stopPropagation();
      greeting.classList.remove('show');
    });
    greeting.addEventListener('click', () => {
      greeting.classList.remove('show');
      if (!isOpen) toggleChat();
    });

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
      const greeting = document.getElementById('fd-greeting');
      if (greeting) greeting.classList.remove('show');
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
