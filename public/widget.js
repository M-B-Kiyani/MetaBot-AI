class MetalogicsWidget {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || window.location.origin,
      apiKey: config.apiKey || null,
      theme: config.theme || "default",
      position: config.position || "bottom-right",
      ...config,
    };

    this.isMinimized = false;
    this.conversationHistory = [];
    this.isTyping = false;
    this.sessionId = this.generateSessionId();

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateTimestamps();
    this.autoResizeTextarea();

    // Update timestamps every minute
    setInterval(() => this.updateTimestamps(), 60000);
  }

  bindEvents() {
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const minimizeBtn = document.getElementById("minimize-widget");
    const chatToggle = document.getElementById("chat-toggle");

    // Send message events
    sendButton.addEventListener("click", () => this.sendMessage());
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Input validation and button state
    chatInput.addEventListener("input", () => {
      const message = chatInput.value.trim();
      sendButton.disabled = !message || this.isTyping;
      this.autoResizeTextarea();
    });

    // Widget minimize/maximize
    minimizeBtn.addEventListener("click", () => this.minimizeWidget());
    chatToggle.addEventListener("click", () => this.maximizeWidget());

    // Prevent form submission on enter
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
      }
    });
  }

  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  autoResizeTextarea() {
    const textarea = document.getElementById("chat-input");
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  }

  async sendMessage() {
    const chatInput = document.getElementById("chat-input");
    const message = chatInput.value.trim();

    if (!message || this.isTyping) return;

    // Clear input and disable send button
    chatInput.value = "";
    chatInput.style.height = "auto";
    document.getElementById("send-button").disabled = true;

    // Add user message to chat
    this.addMessage(message, "user");

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Send message to backend
      const response = await this.callChatAPI(message);

      // Hide typing indicator
      this.hideTypingIndicator();

      if (response.success) {
        this.addMessage(response.message, "assistant");

        // Handle booking flow if needed
        if (response.bookingInProgress) {
          this.handleBookingFlow(response);
        }
      } else {
        this.addMessage(
          "I apologize, but I encountered an error. Please try again.",
          "assistant",
          true
        );
      }
    } catch (error) {
      console.error("Chat API error:", error);
      this.hideTypingIndicator();
      this.addMessage(
        "I'm having trouble connecting right now. Please try again in a moment.",
        "assistant",
        true
      );
    }
  }

  async callChatAPI(message) {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    // Add widget origin header for tracking
    if (window.location.origin) {
      headers["X-Widget-Origin"] = window.location.origin;
    }

    // Add session identifier
    headers["X-Session-ID"] = this.sessionId;

    try {
      const response = await fetch(`${this.config.apiUrl}/api/chat`, {
        method: "POST",
        headers: headers,
        credentials: "include", // Include cookies for session management
        body: JSON.stringify({
          message: message,
          sessionId: this.sessionId,
          context: this.conversationHistory.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error("Authentication failed. Please check your API key.");
        } else if (response.status === 429) {
          throw new Error(
            "Too many requests. Please wait a moment before trying again."
          );
        } else if (response.status === 403) {
          throw new Error(
            "Access denied. This widget may not be authorized for this domain."
          );
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      return await response.json();
    } catch (error) {
      // Log error for debugging (in development)
      if (this.config.debug || window.location.hostname === "localhost") {
        console.error("Chat API Error:", error);
      }

      // Re-throw with user-friendly message
      throw new Error(error.message || "Failed to connect to chat service");
    }
  }

  addMessage(content, sender, isError = false) {
    const messagesContainer = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    const timestamp = new Date();

    messageDiv.className = `message ${sender}-message${
      isError ? " error-message" : ""
    }`;
    messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(content)}</p>
            </div>
            <div class="message-time">${this.formatTime(timestamp)}</div>
        `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add to conversation history
    this.conversationHistory.push({
      content: content,
      sender: sender,
      timestamp: timestamp.toISOString(),
    });

    // Limit conversation history to last 50 messages
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
  }

  handleBookingFlow(response) {
    // Handle any special booking flow UI updates
    if (response.bookingComplete) {
      this.showBookingConfirmation(response.bookingDetails);
    }
  }

  showBookingConfirmation(bookingDetails) {
    // Add a special confirmation message
    const confirmationMessage = `
            ✅ Booking confirmed! 
            
            Details:
            • Date: ${bookingDetails.dateTime}
            • Duration: ${bookingDetails.duration} minutes
            • Meeting link will be sent to: ${bookingDetails.email}
            
            We'll send you a calendar invitation shortly.
        `;

    this.addMessage(confirmationMessage, "assistant");
  }

  showTypingIndicator() {
    this.isTyping = true;
    document.getElementById("typing-indicator").style.display = "flex";
    document.getElementById("send-button").disabled = true;

    // Scroll to bottom
    const messagesContainer = document.getElementById("chat-messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    this.isTyping = false;
    document.getElementById("typing-indicator").style.display = "none";

    // Re-enable send button if there's text
    const chatInput = document.getElementById("chat-input");
    document.getElementById("send-button").disabled = !chatInput.value.trim();
  }

  minimizeWidget() {
    document
      .getElementById("metalogics-chat-widget")
      .classList.add("minimized");
    document.getElementById("chat-toggle").style.display = "flex";
    this.isMinimized = true;

    // Notify parent window if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({ type: "WIDGET_MINIMIZE" }, "*");
    }
  }

  maximizeWidget() {
    document
      .getElementById("metalogics-chat-widget")
      .classList.remove("minimized");
    document.getElementById("chat-toggle").style.display = "none";
    this.isMinimized = false;

    // Focus on input
    document.getElementById("chat-input").focus();

    // Hide notification badge
    document.getElementById("notification-badge").style.display = "none";

    // Notify parent window if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({ type: "WIDGET_MAXIMIZE" }, "*");
    }
  }

  updateTimestamps() {
    const timeElements = document.querySelectorAll(".message-time");
    timeElements.forEach((element, index) => {
      if (this.conversationHistory[index]) {
        const timestamp = new Date(this.conversationHistory[index].timestamp);
        element.textContent = this.formatTime(timestamp);
      }
    });
  }

  formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API methods
  sendCustomMessage(message) {
    document.getElementById("chat-input").value = message;
    this.sendMessage();
  }

  clearChat() {
    document.getElementById("chat-messages").innerHTML = `
            <div class="message assistant-message">
                <div class="message-content">
                    <p>Hello! I'm the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?</p>
                </div>
                <div class="message-time">Just now</div>
            </div>
        `;
    this.conversationHistory = [];
  }

  setTheme(theme) {
    this.config.theme = theme;
    // Theme switching logic can be implemented here
  }
}

// Initialize widget when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Check if widget is being embedded or has config from server
  let config = {};

  // First check for server-injected config
  if (window.WIDGET_CONFIG) {
    config = window.WIDGET_CONFIG;
  } else {
    // Fallback to script tag attributes
    const scriptTag = document.querySelector('script[src*="widget.js"]');
    if (scriptTag) {
      config.apiUrl =
        scriptTag.getAttribute("data-api-url") || window.location.origin;
      config.apiKey = scriptTag.getAttribute("data-api-key") || null;
      config.theme = scriptTag.getAttribute("data-theme") || "default";
    }
  }

  // Initialize the widget
  window.MetalogicsWidget = new MetalogicsWidget(config);

  // Listen for messages from parent window (if in iframe)
  window.addEventListener("message", function (event) {
    if (!window.MetalogicsWidget) return;

    switch (event.data.type) {
      case "WIDGET_CONFIG":
        window.MetalogicsWidget.config = {
          ...window.MetalogicsWidget.config,
          ...event.data.config,
        };
        break;

      case "WIDGET_OPEN":
        if (window.MetalogicsWidget.isMinimized) {
          window.MetalogicsWidget.maximizeWidget();
        }
        break;

      case "WIDGET_CLOSE":
        if (!window.MetalogicsWidget.isMinimized) {
          window.MetalogicsWidget.minimizeWidget();
        }
        break;

      case "WIDGET_SEND_MESSAGE":
        window.MetalogicsWidget.sendCustomMessage(event.data.message);
        break;

      case "WIDGET_CONFIG_UPDATE":
        window.MetalogicsWidget.config = {
          ...window.MetalogicsWidget.config,
          ...event.data.config,
        };
        break;
    }
  });
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = MetalogicsWidget;
}
