#!/usr/bin/env node

/**
 * Widget Deployment Script
 * Copies widget files to the public directory for serving
 */

const fs = require("fs");
const path = require("path");

const WIDGET_FILES = ["wordpress-widget.js", "embed.js", "widget-demo.html"];

const PUBLIC_DIR = path.join(__dirname, "public");

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  console.log("✅ Created public directory");
}

// Copy widget files
WIDGET_FILES.forEach((file) => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(PUBLIC_DIR, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${file} to public directory`);
  } else {
    console.log(`❌ Source file not found: ${file}`);
  }
});

// Create a simple index.html for the public directory
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metalogics AI Widget Files</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        h1 { color: #333; }
        .file-list { list-style: none; padding: 0; }
        .file-list li { padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; }
        .file-list a { text-decoration: none; color: #007bff; font-weight: bold; }
        .file-list a:hover { text-decoration: underline; }
        .description { color: #666; font-size: 14px; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Metalogics AI Widget Files</h1>
        <p>Available widget files for integration:</p>
        
        <ul class="file-list">
            <li>
                <a href="./wordpress-widget.js">wordpress-widget.js</a>
                <div class="description">Main widget JavaScript file for WordPress integration</div>
            </li>
            <li>
                <a href="./embed.js">embed.js</a>
                <div class="description">Simple embed script for any website</div>
            </li>
            <li>
                <a href="./widget-demo.html">widget-demo.html</a>
                <div class="description">Live demo page showing the widget in action</div>
            </li>
        </ul>
        
        <h2>Quick Integration</h2>
        <p>Add this to your website:</p>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;">
&lt;script 
  src="${process.env.RAILWAY_STATIC_URL || "https://your-domain.com"}/embed.js"
  data-api-url="https://metabot-ai-production.up.railway.app"
  data-api-key="wk_ad06e8526e194703c8886e53a7b15ace9a754ad0"
  data-company-name="Your Company"
  data-welcome-message="Hello! How can I help you today?"
&gt;&lt;/script&gt;</pre>
        
        <p><strong>Documentation:</strong> See WIDGET_INSTALLATION.md for complete setup instructions.</p>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(PUBLIC_DIR, "index.html"), indexHtml);
console.log("✅ Created index.html in public directory");

console.log("\n🎉 Widget deployment complete!");
console.log("\nFiles available at:");
WIDGET_FILES.forEach((file) => {
  console.log(`  - /public/${file}`);
});
console.log("  - /public/index.html (file listing)");

console.log("\n📝 Next steps:");
console.log("1. Test the widget at /public/widget-demo.html");
console.log("2. Use /public/embed.js for simple integration");
console.log("3. Use wordpress-widget.js for WordPress plugin");
console.log("4. See WIDGET_INSTALLATION.md for complete setup guide");
