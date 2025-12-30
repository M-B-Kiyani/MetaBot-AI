/**
 * Debug version of Metalogics AI Widget
 * This version includes extensive logging to help diagnose connection issues
 */

(function () {
  "use strict";

  console.log("🔧 Debug Widget Loading...");

  // Prevent multiple widget loads
  if (window.MetalogicsWidgetLoaded) {
    console.log("⚠️ Widget already loaded, skipping");
    return;
  }
  window.MetalogicsWidgetLoaded = true;

  // Configuration with debug logging
  const WIDGET_CONFIG = Object.assign(
    {
      apiUrl: "https://metabot-ai-production.up.railway.app",
      apiKey: "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0",
      theme: "metalogics",
      position: "bottom-right",
      autoOpen: false,
      welcomeMessage:
        "Hello! I'm the Metalogics AI Assistant. How can I help you?",
      companyName: "Metalogics.io",
      companyLogo: "M",
    },
    window.METALOGICS_WIDGET_CONFIG || {},
    window.metalogicsWidgetConfig || {}
  );

  console.log("🔧 Widget Config:", WIDGET_CONFIG);

  // Test API connection immediately
  async function testAPIConnection() {
    console.log("🔧 Testing API connection...");

    try {
      // Test health endpoint first
      console.log(
        "🔧 Testing health endpoint:",
        `${WIDGET_CONFIG.apiUrl}/api/health`
      );
      const healthResponse = await fetch(`${WIDGET_CONFIG.apiUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("🔧 Health response status:", healthResponse.status);
      console.log(
        "🔧 Health response headers:",
        Object.fromEntries(healthResponse.headers.entries())
      );

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log("✅ Health check successful:", healthData);
      } else {
        console.error(
          "❌ Health check failed:",
          healthResponse.status,
          healthResponse.statusText
        );
      }

      // Test chat endpoint
      console.log(
        "🔧 Testing chat endpoint:",
        `${WIDGET_CONFIG.apiUrl}/api/chat`
      );
      const chatResponse = await fetch(`${WIDGET_CONFIG.apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": WIDGET_CONFIG.apiKey,
          "X-Widget-Origin": window.location.origin,
        },
        body: JSON.stringify({
          message: "Debug test message",
          context: {
            source: "debug-widget",
            url: window.location.href,
            title: document.title,
          },
        }),
      });

      console.log("🔧 Chat response status:", chatResponse.status);
      console.log(
        "🔧 Chat response headers:",
        Object.fromEntries(chatResponse.headers.entries())
      );

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        console.log("✅ Chat API test successful:", chatData);
        return true;
      } else {
        const errorText = await chatResponse.text();
        console.error(
          "❌ Chat API test failed:",
          chatResponse.status,
          chatResponse.statusText,
          errorText
        );
        return false;
      }
    } catch (error) {
      console.error("❌ API connection error:", error);
      return false;
    }
  }

  // Simple widget HTML for debugging
  const WIDGET_HTML = `
    <div id="metalogics-debug-widget" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border: 2px solid #007bff;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      z-index: 999999;
      font-family: Arial, sans-serif;
    ">
      <h3 style="margin: 0 0 15px 0; color: #007bff;">🔧 Debug Widget</h3>
      <div id="debug-status" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
        <strong>Status:</strong> Initializing...
      </div>
      <div style="margin-bottom: 15px;">
        <input type="text" id="debug-message" placeholder="Type a test message..." style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        ">
      </div>
      <button id="debug-send" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 10px;
      ">Send Test</button>
      <button id="debug-close" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">Close</button>
      <div id="debug-response" style="
        margin-top: 15px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 5px;
        max-height: 200px;
        overflow-y: auto;
        font-size: 12px;
      "></div>
    </div>
  `;

  function updateStatus(message, type = "info") {
    const statusEl = document.getElementById("debug-status");
    if (statusEl) {
      const colors = {
        info: "#17a2b8",
        success: "#28a745",
        error: "#dc3545",
        warning: "#ffc107",
      };
      statusEl.innerHTML = `<strong>Status:</strong> <span style="color: ${colors[type]}">${message}</span>`;
    }
  }

  function addResponse(message) {
    const responseEl = document.getElementById("debug-response");
    if (responseEl) {
      const timestamp = new Date().toLocaleTimeString();
      responseEl.innerHTML += `<div style="margin-bottom: 5px;"><strong>[${timestamp}]</strong> ${message}</div>`;
      responseEl.scrollTop = responseEl.scrollHeight;
    }
  }

  async function sendDebugMessage(message) {
    console.log("🔧 Sending debug message:", message);
    updateStatus("Sending message...", "info");
    addResponse(`Sending: "${message}"`);

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
          context: {
            source: "debug-widget",
            url: window.location.href,
            title: document.title,
          },
        }),
      });

      console.log("🔧 Response status:", response.status);
      console.log(
        "🔧 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Response data:", data);
        updateStatus("Message sent successfully!", "success");
        addResponse(`Response: "${data.response || "No response text"}"`);
        return data.response;
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Response error:",
          response.status,
          response.statusText,
          errorText
        );
        updateStatus(
          `Error: ${response.status} ${response.statusText}`,
          "error"
        );
        addResponse(`Error: ${response.status} - ${errorText}`);
        return null;
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      updateStatus(`Network error: ${error.message}`, "error");
      addResponse(`Network Error: ${error.message}`);
      return null;
    }
  }

  function initializeDebugWidget() {
    console.log("🔧 Initializing debug widget...");

    // Inject HTML
    const widgetContainer = document.createElement("div");
    widgetContainer.innerHTML = WIDGET_HTML;
    document.body.appendChild(widgetContainer.firstElementChild);

    // Attach event listeners
    const sendButton = document.getElementById("debug-send");
    const closeButton = document.getElementById("debug-close");
    const messageInput = document.getElementById("debug-message");

    sendButton.addEventListener("click", async () => {
      const message = messageInput.value.trim();
      if (message) {
        await sendDebugMessage(message);
        messageInput.value = "";
      }
    });

    messageInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const message = messageInput.value.trim();
        if (message) {
          await sendDebugMessage(message);
          messageInput.value = "";
        }
      }
    });

    closeButton.addEventListener("click", () => {
      const widget = document.getElementById("metalogics-debug-widget");
      if (widget) {
        widget.remove();
      }
    });

    // Test API connection on load
    testAPIConnection().then((success) => {
      if (success) {
        updateStatus("API connection successful!", "success");
        addResponse("✅ API connection test passed");
      } else {
        updateStatus("API connection failed", "error");
        addResponse(
          "❌ API connection test failed - check console for details"
        );
      }
    });

    console.log("✅ Debug widget initialized");
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDebugWidget);
  } else {
    initializeDebugWidget();
  }

  console.log("🔧 Debug Widget script loaded");
})();
