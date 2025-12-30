/**
 * Metalogics AI Widget Embed Script
 * Simple script tag integration for any website
 * Usage: <script src="https://your-domain.com/embed.js" data-api-url="..." data-api-key="..."></script>
 */

(function () {
  "use strict";

  console.log("🚀 Metalogics Widget Embed Script Loading...");

  // Get the current script tag to read data attributes
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  // Configuration from data attributes
  const config = {
    apiUrl:
      currentScript.getAttribute("data-api-url") ||
      "https://metabot-ai-production.up.railway.app",
    apiKey:
      currentScript.getAttribute("data-api-key") ||
      "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0",
    companyName:
      currentScript.getAttribute("data-company-name") || "Metalogics.io",
    companyLogo: currentScript.getAttribute("data-company-logo") || "M",
    welcomeMessage:
      currentScript.getAttribute("data-welcome-message") ||
      "Hello! I'm the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?",
    position: currentScript.getAttribute("data-position") || "bottom-right",
    theme: currentScript.getAttribute("data-theme") || "metalogics",
    autoOpen: currentScript.getAttribute("data-auto-open") === "true",
  };

  console.log("🔧 Widget Configuration:", config);

  // Test API connection before loading widget
  async function testConnection() {
    try {
      console.log("🔧 Testing API connection...");
      const response = await fetch(`${config.apiUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("✅ API connection successful");
        return true;
      } else {
        console.warn("⚠️ API health check failed:", response.status);
        return false;
      }
    } catch (error) {
      console.warn("⚠️ API connection test failed:", error.message);
      return false;
    }
  }

  // Load the main widget script
  function loadWidget() {
    // Set global config for the widget
    window.METALOGICS_WIDGET_CONFIG = config;

    // Create and load the widget script
    const script = document.createElement("script");
    script.src = currentScript.src.replace("embed.js", "wordpress-widget.js");
    script.async = true;
    script.onload = function () {
      console.log("✅ Metalogics AI Widget loaded successfully");
    };
    script.onerror = function () {
      console.error("❌ Failed to load Metalogics AI Widget script");
    };

    document.head.appendChild(script);
  }

  // Initialize widget
  async function initializeWidget() {
    console.log("🔧 Initializing widget...");

    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.warn(
        "⚠️ API connection issues detected, but loading widget anyway"
      );
    }

    // Load widget regardless of connection test result
    loadWidget();
  }

  // Load when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWidget);
  } else {
    initializeWidget();
  }

  console.log("🚀 Embed script initialized");
})();
