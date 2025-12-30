const express = require("express");
const path = require("path");
const router = express.Router();

// Serve the widget HTML page
router.get("/", (req, res) => {
  // Extract configuration from query parameters
  const config = {
    apiUrl: req.query.apiUrl || req.protocol + "://" + req.get("host"),
    apiKey: req.query.apiKey || "",
    theme: req.query.theme || "default",
    position: req.query.position || "bottom-right",
    autoOpen: req.query.autoOpen === "true",
    welcomeMessage: req.query.welcomeMessage || "",
  };

  // Read the widget HTML file and inject configuration
  const fs = require("fs");
  const widgetPath = path.join(__dirname, "../public/widget.html");

  try {
    let widgetHtml = fs.readFileSync(widgetPath, "utf8");

    // Inject configuration into the HTML
    const configScript = `
            <script>
                window.WIDGET_CONFIG = ${JSON.stringify(config)};
            </script>
        `;

    // Insert config script before the widget.js script
    widgetHtml = widgetHtml.replace(
      '<script src="widget.js"></script>',
      configScript + '\n    <script src="widget.js"></script>'
    );

    // Update welcome message if provided
    if (config.welcomeMessage) {
      widgetHtml = widgetHtml.replace(
        "Hello! I'm the Metalogics AI Assistant. I can help you learn about our services and book a consultation. What would you like to know?",
        config.welcomeMessage
      );
    }

    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Frame-Options", "ALLOWALL"); // Allow embedding in iframes
    res.send(widgetHtml);
  } catch (error) {
    console.error("Error serving widget:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "WIDGET_ERROR",
        message: "Failed to load widget",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Serve widget demo page
router.get("/demo", (req, res) => {
  const demoHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metalogics Widget Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: #f5f7fa;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2d3748;
            margin-bottom: 20px;
        }
        .demo-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .code-block {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 14px;
            overflow-x: auto;
            margin: 15px 0;
        }
        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 10px 10px 10px 0;
        }
        .button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Metalogics AI Widget Demo</h1>
        
        <p>This page demonstrates the Metalogics AI booking assistant widget. The widget is already embedded on this page - look for the chat icon in the bottom right corner!</p>
        
        <div class="demo-section">
            <h3>📋 How to Embed</h3>
            <p>Add this single line to any website to embed the widget:</p>
            <div class="code-block">
&lt;script src="${req.protocol}://${req.get("host")}/embed.js" 
        data-api-url="${req.protocol}://${req.get("host")}"
        data-theme="default"&gt;&lt;/script&gt;
            </div>
        </div>
        
        <div class="demo-section">
            <h3>⚙️ Configuration Options</h3>
            <p>Customize the widget with these data attributes:</p>
            <div class="code-block">
&lt;script src="${req.protocol}://${req.get("host")}/embed.js" 
        data-api-url="${req.protocol}://${req.get("host")}"
        data-api-key="your-api-key"
        data-theme="default"
        data-position="bottom-right"
        data-auto-open="false"
        data-welcome-message="Custom welcome message"&gt;&lt;/script&gt;
            </div>
        </div>
        
        <div class="demo-section">
            <h3>🎮 Widget Controls</h3>
            <p>Test the widget programmatically:</p>
            <button class="button" onclick="MetalogicsWidgetAPI.open()">Open Widget</button>
            <button class="button" onclick="MetalogicsWidgetAPI.close()">Close Widget</button>
            <button class="button" onclick="MetalogicsWidgetAPI.sendMessage('Hello from the demo page!')">Send Test Message</button>
        </div>
        
        <div class="demo-section">
            <h3>✨ Features</h3>
            <ul>
                <li>💬 Natural language conversations about Metalogics services</li>
                <li>📅 Intelligent booking flow with calendar integration</li>
                <li>🎯 Lead capture and CRM integration</li>
                <li>📱 Responsive design for all devices</li>
                <li>🔒 Secure API communication</li>
                <li>🎨 Customizable themes and positioning</li>
            </ul>
        </div>
    </div>
    
    <!-- Embed the widget on this demo page -->
    <script src="/embed.js" 
            data-api-url="${req.protocol}://${req.get("host")}"
            data-theme="default"
            data-welcome-message="Welcome to the Metalogics demo! Try asking about our services or booking a consultation."></script>
</body>
</html>
    `;

  res.setHeader("Content-Type", "text/html");
  res.send(demoHtml);
});

module.exports = router;
