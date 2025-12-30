/**
 * Metalogics AI Widget for WordPress
 * Optimized for Hostinger hosting and WordPress sites
 * Version: 1.0.0
 */

(function () {
  "use strict";

  // Prevent multiple widget loads
  if (window.MetalogicsWidgetLoaded) {
    return;
  }
  window.MetalogicsWidgetLoaded = true;

  // Configuration - can be overridden by global config or WordPress localized data
  const WIDGET_CONFIG = Object.assign(
    {
      apiUrl: "https://metabot-ai-production.up.railway.app",
      apiKey: "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0",
      theme: "metalogics",
      position: "bottom-right",
      autoOpen: false,
      welcomeMessage:
        "Hello! I'm the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?",
      companyName: "Metalogics.io",
      companyLogo: "M",
    },
    window.METALOGICS_WIDGET_CONFIG || {},
    window.metalogicsWidgetConfig || {}
  );

  // Widget styles optimized for WordPress themes
  const WIDGET_STYLES = `
        /* Metalogics AI Widget Styles */
        #metalogics-widget-container {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 999999 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
            direction: ltr !important;
        }

        #metalogics-chat-widget {
            width: 380px;
            height: 600px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            border: 1px solid #e1e5e9;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: translateY(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-height: calc(100vh - 40px);
        }

        #metalogics-chat-widget.widget-open {
            transform: translateY(0);
            opacity: 1;
        }

        .metalogics-chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 60px;
        }

        .metalogics-company-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .metalogics-company-logo {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
        }

        .metalogics-company-details h3 {
            margin: 0 !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
        }

        .metalogics-company-details p {
            margin: 2px 0 0 0 !important;
            font-size: 13px !important;
            opacity: 0.9;
            line-height: 1.2 !important;
        }

        .metalogics-minimize-btn {
            background: rgba(255, 255, 255, 0.2) !important;
            border: none !important;
            color: white !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 18px !important;
            transition: background-color 0.2s !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        .metalogics-minimize-btn:hover {
            background: rgba(255, 255, 255, 0.3) !important;
        }

        .metalogics-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .metalogics-message {
            display: flex;
            flex-direction: column;
            max-width: 85%;
        }

        .metalogics-message.user-message {
            align-self: flex-end;
        }

        .metalogics-message.assistant-message {
            align-self: flex-start;
        }

        .metalogics-message-content {
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            line-height: 1.4;
        }

        .metalogics-message.user-message .metalogics-message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 6px;
        }

        .metalogics-message.assistant-message .metalogics-message-content {
            background: white;
            color: #333;
            border: 1px solid #e1e5e9;
            border-bottom-left-radius: 6px;
        }

        .metalogics-message-time {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
            padding: 0 4px;
        }

        .metalogics-chat-input-container {
            padding: 16px 20px;
            background: white;
            border-top: 1px solid #e1e5e9;
        }

        .metalogics-input-wrapper {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            background: #f8f9fa;
            border-radius: 24px;
            padding: 8px 12px;
            border: 1px solid #e1e5e9;
        }

        .metalogics-input-wrapper:focus-within {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        #metalogics-chat-input {
            flex: 1 !important;
            border: none !important;
            background: transparent !important;
            resize: none !important;
            outline: none !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            max-height: 100px !important;
            min-height: 20px !important;
            padding: 4px 0 !important;
            margin: 0 !important;
            font-family: inherit !important;
        }

        #metalogics-send-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            color: white !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 16px !important;
            transition: all 0.2s !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        #metalogics-send-button:hover {
            transform: scale(1.05) !important;
        }

        #metalogics-send-button:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
        }

        .metalogics-typing-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 18px;
            border-bottom-left-radius: 6px;
            max-width: 85%;
            align-self: flex-start;
        }

        .metalogics-typing-dots {
            display: flex;
            gap: 4px;
        }

        .metalogics-typing-dot {
            width: 8px;
            height: 8px;
            background: #667eea;
            border-radius: 50%;
            animation: metalogics-typing 1.4s infinite ease-in-out;
        }

        .metalogics-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .metalogics-typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes metalogics-typing {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }

        .metalogics-chat-button {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            width: 60px !important;
            height: 60px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            z-index: 999998 !important;
            color: white !important;
            font-size: 24px !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        .metalogics-chat-button:hover {
            transform: scale(1.1) !important;
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4) !important;
        }

        .metalogics-chat-button.widget-open {
            transform: rotate(45deg) !important;
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
            #metalogics-chat-widget {
                width: calc(100vw - 20px) !important;
                height: calc(100vh - 40px) !important;
                bottom: 10px !important;
                right: 10px !important;
                border-radius: 12px !important;
            }

            #metalogics-widget-container {
                bottom: 10px !important;
                right: 10px !important;
            }

            .metalogics-chat-button {
                bottom: 15px !important;
                right: 15px !important;
                width: 55px !important;
                height: 55px !important;
            }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
            #metalogics-chat-widget {
                border: 2px solid #000 !important;
            }
            
            .metalogics-message.assistant-message .metalogics-message-content {
                border: 2px solid #000 !important;
            }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            #metalogics-chat-widget,
            .metalogics-chat-button,
            #metalogics-send-button {
                transition: none !important;
            }
            
            .metalogics-typing-dot {
                animation: none !important;
            }
        }
    `;

  // Widget HTML template
  const WIDGET_HTML = `
        <div id="metalogics-widget-container">
            <button id="metalogics-chat-button" class="metalogics-chat-button" aria-label="Open chat">
                💬
            </button>
            <div id="metalogics-chat-widget" role="dialog" aria-labelledby="metalogics-widget-title" aria-hidden="true">
                <div class="metalogics-chat-header">
                    <div class="metalogics-company-info">
                        <div class="metalogics-company-logo">${WIDGET_CONFIG.companyLogo}</div>
                        <div class="metalogics-company-details">
                            <h3 id="metalogics-widget-title">${WIDGET_CONFIG.companyName}</h3>
                            <p>AI Assistant</p>
                        </div>
                    </div>
                    <button class="metalogics-minimize-btn" aria-label="Close chat">×</button>
                </div>
                <div class="metalogics-chat-messages" id="metalogics-chat-messages" role="log" aria-live="polite">
                    <!-- Messages will be inserted here -->
                </div>
                <div class="metalogics-chat-input-container">
                    <div class="metalogics-input-wrapper">
                        <textarea 
                            id="metalogics-chat-input" 
                            placeholder="Type your message..." 
                            rows="1"
                            aria-label="Type your message"
                        ></textarea>
                        <button id="metalogics-send-button" aria-label="Send message">
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Widget state
  let widgetState = {
    isOpen: false,
    isLoading: false,
    conversationId: null,
    messages: [],
  };

  // API functions
  async function sendMessage(message) {
    try {
      const response = await fetch(`${WIDGET_CONFIG.apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": WIDGET_CONFIG.apiKey,
          "X-Widget-Origin": window.location.origin,
        },
        body: JSON.stringify({
          message: message,
          conversationId: widgetState.conversationId,
          context: {
            source: "wordpress-widget",
            url: window.location.href,
            title: document.title,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        widgetState.conversationId = data.conversationId;
        return data.response;
      } else {
        throw new Error(data.error?.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Widget API Error:", error);
      return "I apologize, but I'm having trouble connecting right now. Please try again in a moment or contact us directly.";
    }
  }

  // UI functions
  function addMessage(content, isUser = false) {
    const messagesContainer = document.getElementById(
      "metalogics-chat-messages"
    );
    const messageDiv = document.createElement("div");
    messageDiv.className = `metalogics-message ${
      isUser ? "user-message" : "assistant-message"
    }`;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageDiv.innerHTML = `
            <div class="metalogics-message-content">${content}</div>
            <div class="metalogics-message-time">${timeString}</div>
        `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Store message in state
    widgetState.messages.push({
      content,
      isUser,
      timestamp: now.toISOString(),
    });
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById(
      "metalogics-chat-messages"
    );
    const typingDiv = document.createElement("div");
    typingDiv.className = "metalogics-typing-indicator";
    typingDiv.id = "metalogics-typing-indicator";
    typingDiv.innerHTML = `
            <div class="metalogics-typing-dots">
                <div class="metalogics-typing-dot"></div>
                <div class="metalogics-typing-dot"></div>
                <div class="metalogics-typing-dot"></div>
            </div>
            <span>AI is typing...</span>
        `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingIndicator = document.getElementById(
      "metalogics-typing-indicator"
    );
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  function openWidget() {
    const widget = document.getElementById("metalogics-chat-widget");
    const button = document.getElementById("metalogics-chat-button");

    widget.classList.add("widget-open");
    widget.setAttribute("aria-hidden", "false");
    button.classList.add("widget-open");
    button.innerHTML = "×";

    widgetState.isOpen = true;

    // Focus on input
    setTimeout(() => {
      const input = document.getElementById("metalogics-chat-input");
      if (input) input.focus();
    }, 300);

    // Send welcome message if no messages exist
    if (widgetState.messages.length === 0) {
      setTimeout(() => {
        addMessage(WIDGET_CONFIG.welcomeMessage, false);
      }, 500);
    }
  }

  function closeWidget() {
    const widget = document.getElementById("metalogics-chat-widget");
    const button = document.getElementById("metalogics-chat-button");

    widget.classList.remove("widget-open");
    widget.setAttribute("aria-hidden", "true");
    button.classList.remove("widget-open");
    button.innerHTML = "💬";

    widgetState.isOpen = false;
  }

  function toggleWidget() {
    if (widgetState.isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  async function handleSendMessage() {
    const input = document.getElementById("metalogics-chat-input");
    const sendButton = document.getElementById("metalogics-send-button");
    const message = input.value.trim();

    if (!message || widgetState.isLoading) return;

    // Add user message
    addMessage(message, true);
    input.value = "";

    // Update UI state
    widgetState.isLoading = true;
    sendButton.disabled = true;
    showTypingIndicator();

    // Auto-resize textarea
    input.style.height = "auto";

    try {
      // Send message to API
      const response = await sendMessage(message);

      // Hide typing indicator and add response
      hideTypingIndicator();
      addMessage(response, false);
    } catch (error) {
      hideTypingIndicator();
      addMessage(
        "I apologize, but I encountered an error. Please try again.",
        false
      );
    } finally {
      widgetState.isLoading = false;
      sendButton.disabled = false;
    }
  }

  // Auto-resize textarea
  function autoResizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  }

  // Initialize widget
  function initializeWidget() {
    // Inject styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = WIDGET_STYLES;
    document.head.appendChild(styleSheet);

    // Inject HTML
    const widgetContainer = document.createElement("div");
    widgetContainer.innerHTML = WIDGET_HTML;
    document.body.appendChild(widgetContainer.firstElementChild);

    // Attach event listeners
    const chatButton = document.getElementById("metalogics-chat-button");
    const minimizeButton = document.querySelector(".metalogics-minimize-btn");
    const sendButton = document.getElementById("metalogics-send-button");
    const input = document.getElementById("metalogics-chat-input");

    chatButton.addEventListener("click", toggleWidget);
    minimizeButton.addEventListener("click", closeWidget);
    sendButton.addEventListener("click", handleSendMessage);

    // Input event listeners
    input.addEventListener("input", (e) => autoResizeTextarea(e.target));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Keyboard accessibility
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && widgetState.isOpen) {
        closeWidget();
      }
    });

    // Click outside to close
    document.addEventListener("click", (e) => {
      const widget = document.getElementById("metalogics-chat-widget");
      const button = document.getElementById("metalogics-chat-button");

      if (
        widgetState.isOpen &&
        !widget.contains(e.target) &&
        !button.contains(e.target)
      ) {
        closeWidget();
      }
    });

    console.log("✅ Metalogics AI Widget initialized successfully");
  }

  // Public API
  window.MetalogicsWidgetAPI = {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    sendMessage: (message) => {
      if (!widgetState.isOpen) openWidget();
      const input = document.getElementById("metalogics-chat-input");
      if (input) {
        input.value = message;
        setTimeout(handleSendMessage, 100);
      }
    },
    getState: () => ({ ...widgetState }),
    isOpen: () => widgetState.isOpen,
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWidget);
  } else {
    initializeWidget();
  }
})();
