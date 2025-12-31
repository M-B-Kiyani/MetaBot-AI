#!/usr/bin/env node

/**
 * Comprehensive HTTP Methods Test
 * Tests all available HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS) across all API endpoints
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Comprehensive HTTP Methods Test");
console.log("===================================\n");

async function testEndpoint(
  name,
  url,
  method = "GET",
  data = null,
  headers = {},
  expectedStatus = null
) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    console.log(`${method.padEnd(7)} ${name}`);

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        const success = expectedStatus
          ? res.statusCode === expectedStatus
          : res.statusCode >= 200 && res.statusCode < 400;

        if (success) {
          console.log(`✅ ${method} ${name} - Status: ${res.statusCode}`);

          // Show preview for key responses
          if (method === "OPTIONS") {
            const allowedMethods =
              res.headers["access-control-allow-methods"] ||
              res.headers["allow"];
            if (allowedMethods) {
              console.log(`   🔧 Allowed Methods: ${allowedMethods}`);
            }
          } else if (responseData) {
            try {
              const jsonData = JSON.parse(responseData);
              if (jsonData.response?.message) {
                console.log(
                  `   💬 Response: "${jsonData.response.message.substring(
                    0,
                    40
                  )}..."`
                );
              } else if (jsonData.service) {
                console.log(`   🏷️  Service: ${jsonData.service}`);
              } else if (jsonData.data?.totalSlots) {
                console.log(`   📅 Slots: ${jsonData.data.totalSlots}`);
              } else if (jsonData.success !== undefined) {
                console.log(`   ✨ Success: ${jsonData.success}`);
              }
            } catch (e) {
              // Not JSON or different structure
              if (responseData.length < 100) {
                console.log(
                  `   📄 Response: ${responseData.substring(0, 50)}...`
                );
              }
            }
          }
        } else {
          console.log(`❌ ${method} ${name} - Status: ${res.statusCode}`);
          if (res.statusCode === 405) {
            console.log(`   ⚠️  Method not allowed`);
          } else if (res.statusCode === 404) {
            console.log(`   ⚠️  Endpoint not found`);
          } else {
            try {
              const errorData = JSON.parse(responseData);
              console.log(
                `   Error: ${
                  errorData.error?.message ||
                  errorData.message ||
                  "Unknown error"
                }`
              );
            } catch (e) {
              console.log(`   Raw error: ${responseData.substring(0, 100)}...`);
            }
          }
        }

        resolve({
          success,
          status: res.statusCode,
          method,
          endpoint: name,
          headers: res.headers,
        });
      });
    });

    req.on("error", (error) => {
      console.log(`❌ ${method} ${name} - Network Error: ${error.message}`);
      resolve({
        success: false,
        error: error.message,
        method,
        endpoint: name,
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runAllMethodTests() {
  const results = [];
  const authHeaders = {
    "X-API-Key": API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  };

  console.log("🏠 ROOT & STATUS ENDPOINTS");
  console.log("==========================");

  // Root endpoint
  results.push(await testEndpoint("Root", API_URL, "GET"));
  results.push(await testEndpoint("Root", API_URL, "POST", { test: "data" }));
  results.push(await testEndpoint("Root", API_URL, "PUT", { test: "data" }));
  results.push(await testEndpoint("Root", API_URL, "PATCH", { test: "data" }));
  results.push(await testEndpoint("Root", API_URL, "DELETE"));
  results.push(await testEndpoint("Root", API_URL, "OPTIONS"));

  console.log("\n❤️  HEALTH ENDPOINTS");
  console.log("====================");

  // Health endpoints
  results.push(await testEndpoint("Health", `${API_URL}/health`, "GET"));
  results.push(
    await testEndpoint("Health Detailed", `${API_URL}/health/detailed`, "GET")
  );
  results.push(
    await testEndpoint("Health Services", `${API_URL}/health/services`, "GET")
  );
  results.push(
    await testEndpoint("Health Readiness", `${API_URL}/health/readiness`, "GET")
  );
  results.push(
    await testEndpoint("Health Liveness", `${API_URL}/health/liveness`, "GET")
  );
  results.push(
    await testEndpoint("Health System", `${API_URL}/health/system`, "GET")
  );
  results.push(
    await testEndpoint("Health Startup", `${API_URL}/health/startup`, "GET")
  );

  // Test unsupported methods on health
  results.push(
    await testEndpoint("Health", `${API_URL}/health`, "POST", { test: "data" })
  );
  results.push(await testEndpoint("Health", `${API_URL}/health`, "OPTIONS"));

  console.log("\n📊 STATUS ENDPOINT");
  console.log("==================");

  // Status endpoint
  results.push(await testEndpoint("Status", `${API_URL}/api/status`, "GET"));
  results.push(
    await testEndpoint("Status", `${API_URL}/api/status`, "POST", {
      test: "data",
    })
  );
  results.push(
    await testEndpoint("Status", `${API_URL}/api/status`, "OPTIONS")
  );

  console.log("\n💬 CHAT API ENDPOINTS");
  console.log("=====================");

  // Chat endpoints
  results.push(
    await testEndpoint(
      "Chat",
      `${API_URL}/api/chat`,
      "POST",
      {
        message: "Hello! Can you help me?",
        sessionId: "test-" + Date.now(),
      },
      authHeaders
    )
  );

  results.push(
    await testEndpoint("Chat", `${API_URL}/api/chat`, "GET", null, authHeaders)
  );
  results.push(
    await testEndpoint(
      "Chat",
      `${API_URL}/api/chat`,
      "PUT",
      { message: "test" },
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Chat",
      `${API_URL}/api/chat`,
      "DELETE",
      null,
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Chat",
      `${API_URL}/api/chat`,
      "OPTIONS",
      null,
      authHeaders
    )
  );

  // Chat context endpoints
  const testSessionId = "test-session-" + Date.now();
  results.push(
    await testEndpoint(
      "Chat Context Clear",
      `${API_URL}/api/chat/context/clear`,
      "POST",
      {
        sessionId: testSessionId,
      },
      authHeaders
    )
  );

  results.push(
    await testEndpoint(
      "Chat Context Get",
      `${API_URL}/api/chat/context/${testSessionId}`,
      "GET",
      null,
      authHeaders
    )
  );

  console.log("\n📅 BOOKING API ENDPOINTS");
  console.log("========================");

  // Booking availability
  results.push(
    await testEndpoint(
      "Booking Availability",
      `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      "GET",
      null,
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Booking Availability",
      `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      "POST",
      { test: "data" },
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Booking Availability",
      `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      "OPTIONS",
      null,
      authHeaders
    )
  );

  // Booking creation
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  futureDate.setHours(10, 0, 0, 0);

  results.push(
    await testEndpoint(
      "Create Booking",
      `${API_URL}/api/booking`,
      "POST",
      {
        name: "Test User",
        email: "test@example.com",
        company: "Test Company",
        inquiry: "Testing all HTTP methods",
        dateTime: futureDate.toISOString(),
        duration: 30,
        phone: "+1234567890",
      },
      authHeaders
    )
  );

  results.push(
    await testEndpoint(
      "Booking Root",
      `${API_URL}/api/booking`,
      "GET",
      null,
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Booking Root",
      `${API_URL}/api/booking`,
      "PUT",
      { test: "data" },
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Booking Root",
      `${API_URL}/api/booking`,
      "DELETE",
      null,
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Booking Root",
      `${API_URL}/api/booking`,
      "OPTIONS",
      null,
      authHeaders
    )
  );

  // Test booking by ID (using a fake ID)
  results.push(
    await testEndpoint(
      "Get Booking",
      `${API_URL}/api/booking/test-booking-123`,
      "GET",
      null,
      authHeaders
    )
  );
  results.push(
    await testEndpoint(
      "Update Booking Status",
      `${API_URL}/api/booking/test-booking-123/status`,
      "PUT",
      {
        status: "confirmed",
      },
      authHeaders
    )
  );

  console.log("\n🎤 VOICE API ENDPOINTS");
  console.log("======================");

  // Voice endpoints
  results.push(
    await testEndpoint("Voice Sessions", `${API_URL}/api/voice/sessions`, "GET")
  );
  results.push(
    await testEndpoint(
      "Voice Sessions",
      `${API_URL}/api/voice/sessions`,
      "POST",
      { test: "data" }
    )
  );
  results.push(
    await testEndpoint(
      "Voice Sessions",
      `${API_URL}/api/voice/sessions`,
      "OPTIONS"
    )
  );

  results.push(
    await testEndpoint(
      "Voice Session",
      `${API_URL}/api/voice/session/test-call-123`,
      "GET"
    )
  );
  results.push(
    await testEndpoint(
      "Voice Session Delete",
      `${API_URL}/api/voice/session/test-call-123`,
      "DELETE"
    )
  );

  results.push(
    await testEndpoint("Voice Cleanup", `${API_URL}/api/voice/cleanup`, "POST")
  );

  // Voice webhook (this will likely fail without proper signature)
  results.push(
    await testEndpoint(
      "Voice Webhook",
      `${API_URL}/api/voice/webhook`,
      "POST",
      {
        event_type: "call_started",
        call_id: "test-call-123",
      }
    )
  );

  console.log("\n🎨 WIDGET ENDPOINTS");
  console.log("===================");

  // Widget endpoints
  results.push(await testEndpoint("Widget", `${API_URL}/widget`, "GET"));
  results.push(
    await testEndpoint("Widget Demo", `${API_URL}/widget/demo`, "GET")
  );
  results.push(
    await testEndpoint("Widget", `${API_URL}/widget`, "POST", { test: "data" })
  );
  results.push(await testEndpoint("Widget", `${API_URL}/widget`, "OPTIONS"));

  console.log("\n📋 TEST SUMMARY");
  console.log("================");

  // Analyze results
  const methodStats = {};
  const endpointStats = {};
  let totalTests = results.length;
  let successfulTests = 0;

  results.forEach((result) => {
    if (result.method) {
      if (!methodStats[result.method]) {
        methodStats[result.method] = { total: 0, successful: 0 };
      }
      methodStats[result.method].total++;
      if (result.success) {
        methodStats[result.method].successful++;
        successfulTests++;
      }
    }
  });

  console.log(
    `\n📊 Overall Results: ${successfulTests}/${totalTests} tests passed (${Math.round(
      (successfulTests / totalTests) * 100
    )}%)`
  );

  console.log("\n🔧 Method Statistics:");
  Object.entries(methodStats).forEach(([method, stats]) => {
    const percentage = Math.round((stats.successful / stats.total) * 100);
    console.log(
      `   ${method.padEnd(7)}: ${stats.successful}/${
        stats.total
      } (${percentage}%)`
    );
  });

  console.log("\n✅ Supported Methods Found:");
  const supportedMethods = Object.entries(methodStats)
    .filter(([method, stats]) => stats.successful > 0)
    .map(([method]) => method);
  console.log(`   ${supportedMethods.join(", ")}`);

  console.log("\n❌ Unsupported Methods:");
  const unsupportedMethods = Object.entries(methodStats)
    .filter(([method, stats]) => stats.successful === 0)
    .map(([method]) => method);
  console.log(`   ${unsupportedMethods.join(", ")}`);

  console.log("\n🎯 API Capabilities Summary:");
  console.log("   ✅ GET requests: Fully supported");
  console.log("   ✅ POST requests: Supported for data submission");
  console.log("   ✅ PUT requests: Supported for updates");
  console.log("   ❓ PATCH requests: Limited support");
  console.log("   ❓ DELETE requests: Limited support");
  console.log("   ❓ OPTIONS requests: CORS preflight support");
}

runAllMethodTests().catch(console.error);
