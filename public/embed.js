(function () {
  "use strict";

  // Prevent multiple widget loads
  if (window.MetalogicsWidgetLoaded) {
    return;
  }
  window.MetalogicsWidgetLoaded = true;

  // Get the current script tag to extract configuration
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  // Extract configuration from script attributes
  const config = {
    apiUrl:
      currentScript.getAttribute("data-api-url") ||
      "https://your-domain.railway.app",
    apiKey: currentScript.getAttribute("data-api-key") || null,
    theme: currentScript.getAttribute("data-theme") || "default",
    position: currentScript.getAttribute("data-position") || "bottom-right",
    autoOpen: currentScript.getAttribute("data-auto-open") === "true",
    welcomeMessage: currentScript.getAttribute("data-welcome-message") || null,
  };

  // Create widget container
  function createWidget() {
    // Create iframe container for better isolation
    const widgetContainer = document.createElement("div");
    widgetContainer.id = "metalogics-widget-container";
    widgetContainer.style.cssText = `
            position: fixed;
            bottom: 0;
            right: 0;
            z-index: 2147483647;
            pointer-events: none;
        `;

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.id = "metalogics-widget-iframe";
    iframe.src =
      `${config.apiUrl}/widget?` +
      new URLSearchParams({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey || "",
        theme: config.theme,
        position: config.position,
        autoOpen: config.autoOpen,
        welcomeMessage: config.welcomeMessage || "",
      }).toString();

    iframe.style.cssText = `
            width: 400px;
            height: 620px;
            border: none;
            background: transparent;
            pointer-events: auto;
        `;

    // Handle iframe load
    iframe.onload = function () {
      console.log("Metalogics Widget loaded successfully");

      // Send configuration to iframe
      iframe.contentWindow.postMessage(
        {
          type: "WIDGET_CONFIG",
          config: config,
        },
        config.apiUrl
      );
    };

    widgetContainer.appendChild(iframe);
    document.body.appendChild(widgetContainer);

    // Handle messages from iframe
    window.addEventListener("message", function (event) {
      if (event.origin !== config.apiUrl) return;

      switch (event.data.type) {
        case "WIDGET_RESIZE":
          iframe.style.width = event.data.width + "px";
          iframe.style.height = event.data.height + "px";
          break;

        case "WIDGET_MINIMIZE":
          iframe.style.width = "60px";
          iframe.style.height = "60px";
          break;

        case "WIDGET_MAXIMIZE":
          iframe.style.width = "400px";
          iframe.style.height = "620px";
          break;

        case "WIDGET_ERROR":
          console.error("Widget error:", event.data.error);
          break;
      }
    });

    return widgetContainer;
  }

  // Alternative: Direct embedding (less secure but simpler)
  function createDirectWidget() {
    // Inject CSS
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = `${config.apiUrl}/widget.css`;
    document.head.appendChild(cssLink);

    // Create widget HTML
    const widgetHtml = `
            <div id="metalogics-chat-widget" class="chat-widget">
                <div class="chat-header">
                    <div class="header-content">
                        <div class="company-info">
                            <div class="company-logo">M</div>
                            <div class="company-details">
                                <h3>Metalogics AI Assistant</h3>
                                <p>How can I help you today?</p>
                            </div>
                        </div>
                        <button class="minimize-btn" id="minimize-widget">−</button>
                    </div>
                </div>
                
                <div class="chat-messages" id="chat-messages">
                    <div class="message assistant-message">
                        <div class="message-content">
                            <p>${
                              config.welcomeMessage ||
                              "Hello! I'm the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?"
                            }</p>
                        </div>
                        <div class="message-time">Just now</div>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <div class="input-wrapper">
                        <textarea 
                            id="chat-input" 
                            placeholder="Type your message here..." 
                            rows="1"
                            maxlength="1000"
                        ></textarea>
                        <button id="send-button" class="send-btn" disabled>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22,2 15,22 11,13 2,9"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div class="input-footer">
                        <small>Powered by Metalogics AI</small>
                    </div>
                </div>
                
                <div class="typing-indicator" id="typing-indicator" style="display: none;">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span class="typing-text">AI is typing...</span>
                </div>
            </div>
            
            <div class="chat-toggle" id="chat-toggle" style="display: none;">
                <div class="toggle-content">
                    <div class="company-logo">M</div>
                    <div class="notification-badge" id="notification-badge" style="display: none;">1</div>
                </div>
            </div>
        `;

    // Add widget to page
    const widgetContainer = document.createElement("div");
    widgetContainer.innerHTML = widgetHtml;
    document.body.appendChild(widgetContainer);

    // Load widget JavaScript
    const script = document.createElement("script");
    script.src = `${config.apiUrl}/widget.js`;
    script.setAttribute("data-api-url", config.apiUrl);
    script.setAttribute("data-api-key", config.apiKey || "");
    script.setAttribute("data-theme", config.theme);
    document.head.appendChild(script);
  }

  // Initialize widget when DOM is ready
  function initWidget() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        // Use iframe approach for better security and isolation
        createWidget();
      });
    } else {
      createWidget();
    }
  }

  // Public API for the embedding website
  window.MetalogicsWidgetAPI = {
    open: function () {
      const iframe = document.getElementById("metalogics-widget-iframe");
      if (iframe) {
        iframe.contentWindow.postMessage(
          { type: "WIDGET_OPEN" },
          config.apiUrl
        );
      }
    },

    close: function () {
      const iframe = document.getElementById("metalogics-widget-iframe");
      if (iframe) {
        iframe.contentWindow.postMessage(
          { type: "WIDGET_CLOSE" },
          config.apiUrl
        );
      }
    },

    sendMessage: function (message) {
      const iframe = document.getElementById("metalogics-widget-iframe");
      if (iframe) {
        iframe.contentWindow.postMessage(
          {
            type: "WIDGET_SEND_MESSAGE",
            message: message,
          },
          config.apiUrl
        );
      }
    },

    setConfig: function (newConfig) {
      Object.assign(config, newConfig);
      const iframe = document.getElementById("metalogics-widget-iframe");
      if (iframe) {
        iframe.contentWindow.postMessage(
          {
            type: "WIDGET_CONFIG_UPDATE",
            config: config,
          },
          config.apiUrl
        );
      }
    },
  };

  // Start initialization
  initWidget();
})();
