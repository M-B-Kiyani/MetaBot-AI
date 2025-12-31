#!/usr/bin/env node

/**
 * Test the chat API with proper authentication
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Testing Chat API with Authentication\n");

function testChatAPI() {
  const postData = JSON.stringify({
    message: "Hello, can you help me book an appointment?",
    sessionId: "test-session-123",
  });

  const options = {
    hostname: "metabot-ai-production.up.railway.app",
    port: 443,
    path: "/api/chat",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  console.log("📤 Sending test message to chat API...");
  console.log(`📍 URL: ${API_URL}/api/chat`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`💬 Message: "Hello, can you help me book an appointment?"`);
  console.log("");

  const req = https.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("\n📄 Response:");
      try {
        const jsonResponse = JSON.parse(data);
        console.log(JSON.stringify(jsonResponse, null, 2));

        if (res.statusCode === 200) {
          console.log("\n✅ Chat API is working correctly!");
        } else {
          console.log(`\n⚠️  Chat API returned status ${res.statusCode}`);
        }
      } catch (error) {
        console.log("Raw response:", data);
        console.log("Parse error:", error.message);
      }
    });
  });

  req.on("error", (error) => {
    console.error(`❌ Request failed: ${error.message}`);
  });

  req.write(postData);
  req.end();
}

// Also test a simple GET request to see available endpoints
function testAvailableEndpoints() {
  console.log("🔍 Checking available endpoints...\n");

  const req = https.request(`${API_URL}/`, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const response = JSON.parse(data);
        console.log("📋 Available endpoints:");
        if (response.endpoints) {
          Object.entries(response.endpoints).forEach(([name, path]) => {
            console.log(`   ${name}: ${path}`);
          });
        }
        console.log("");

        // Now test the chat API
        testChatAPI();
      } catch (error) {
        console.log("Could not parse endpoints response");
        testChatAPI();
      }
    });
  });

  req.on("error", (error) => {
    console.error(`❌ Failed to get endpoints: ${error.message}`);
    testChatAPI();
  });

  req.end();
}

testAvailableEndpoints();
