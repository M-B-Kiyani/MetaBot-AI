#!/usr/bin/env node

/**
 * Railway Debug Tool
 * Simple diagnostic tool to check Railway deployment issues
 */

const http = require("http");
const https = require("https");

console.log("🔧 Railway Debug Tool Starting...");
console.log("📊 Environment Information:");
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);
console.log(
  `- Railway Deployment: ${process.env.RAILWAY_DEPLOYMENT_ID || "Not set"}`
);
console.log(
  `- Railway Service: ${process.env.RAILWAY_SERVICE_NAME || "Not set"}`
);
console.log(
  `- Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || "Not set"}`
);

// Test internal health check
function testInternalHealth() {
  return new Promise((resolve) => {
    const port = process.env.PORT || 3000;
    const options = {
      hostname: "localhost",
      port: port,
      path: "/health",
      method: "GET",
      timeout: 5000,
    };

    console.log(`🔍 Testing internal health check on localhost:${port}/health`);

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`✅ Internal health check: ${res.statusCode}`);
        console.log(`📄 Response: ${data.substring(0, 200)}...`);
        resolve({ success: true, status: res.statusCode, data });
      });
    });

    req.on("error", (error) => {
      console.log(`❌ Internal health check failed: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.on("timeout", () => {
      console.log(`⏰ Internal health check timed out`);
      req.destroy();
      resolve({ success: false, error: "Timeout" });
    });

    req.end();
  });
}

// Test external access
function testExternalAccess() {
  return new Promise((resolve) => {
    const url = "https://metabot-ai-production.up.railway.app/health";
    console.log(`🌐 Testing external access: ${url}`);

    const req = https.request(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`✅ External access: ${res.statusCode}`);
        console.log(`📄 Response: ${data.substring(0, 200)}...`);
        resolve({ success: true, status: res.statusCode, data });
      });
    });

    req.on("error", (error) => {
      console.log(`❌ External access failed: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.on("timeout", () => {
      console.log(`⏰ External access timed out`);
      req.destroy();
      resolve({ success: false, error: "Timeout" });
    });

    req.end();
  });
}

// Test basic server
function testBasicServer() {
  return new Promise((resolve) => {
    const port = process.env.PORT || 3000;

    const server = http.createServer((req, res) => {
      console.log(`📥 Request received: ${req.method} ${req.url}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          url: req.url,
          method: req.method,
          headers: req.headers,
        })
      );
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Test server listening on 0.0.0.0:${port}`);
      resolve(server);
    });

    server.on("error", (error) => {
      console.log(`❌ Test server error: ${error.message}`);
      resolve(null);
    });
  });
}

// Main diagnostic function
async function runDiagnostics() {
  console.log("\n🔍 Starting diagnostics...\n");

  // Test 1: Basic server
  console.log("📋 Test 1: Basic Server Test");
  const testServer = await testBasicServer();

  if (testServer) {
    // Wait a moment for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Internal health check
    console.log("\n📋 Test 2: Internal Health Check");
    await testInternalHealth();

    // Test 3: External access
    console.log("\n📋 Test 3: External Access Test");
    await testExternalAccess();

    // Close test server
    testServer.close();
  }

  console.log("\n🏁 Diagnostics complete!");
  console.log("\n💡 Recommendations:");
  console.log("1. Check Railway dashboard for deployment status");
  console.log("2. Verify environment variables are set correctly");
  console.log("3. Check Railway logs for any startup errors");
  console.log("4. Ensure health check endpoint is responding");
  console.log("5. Verify domain configuration in Railway");
}

// Run diagnostics
runDiagnostics().catch(console.error);
