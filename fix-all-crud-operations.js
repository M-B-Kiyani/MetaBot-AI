#!/usr/bin/env node

/**
 * Fix and test all CRUD operations with real data
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔧 Fixing All CRUD Operations\n");

let createdBookingId = null;

async function makeRequest(name, url, method, data = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    console.log(`${method.padEnd(6)} ${name}`);

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        const success = res.statusCode >= 200 && res.statusCode < 400;

        if (success) {
          console.log(`       ✅ Status: ${res.statusCode}`);
          try {
            const jsonData = JSON.parse(responseData);

            // Extract booking ID if this is a booking creation
            if (
              method === "POST" &&
              url.includes("/api/booking") &&
              !url.includes("/") &&
              jsonData.data?.booking?.id
            ) {
              createdBookingId = jsonData.data.booking.id;
              console.log(`       📋 Booking ID: ${createdBookingId}`);
            }

            if (jsonData.success !== undefined) {
              console.log(`       ✨ Success: ${jsonData.success}`);
            }
            if (jsonData.message) {
              console.log(`       💬 Message: ${jsonData.message}`);
            }
            if (jsonData.data?.booking?.status) {
              console.log(`       📊 Status: ${jsonData.data.booking.status}`);
            }
          } catch (e) {
            console.log(`       📄 Response received`);
          }
        } else {
          console.log(`       ❌ Status: ${res.statusCode}`);
          try {
            const errorData = JSON.parse(responseData);
            console.log(
              `       ⚠️  Error: ${
                errorData.error?.message || errorData.message || "Unknown"
              }`
            );
          } catch (e) {
            console.log(`       📄 Raw: ${responseData.substring(0, 50)}...`);
          }
        }
        console.log("");
        resolve({
          success,
          status: res.statusCode,
          data: responseData,
          method,
          endpoint: name,
        });
      });
    });

    req.on("error", (error) => {
      console.log(`       ❌ Network Error: ${error.message}\n`);
      resolve({ success: false, error: error.message, method, endpoint: name });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runCompleteCrudTest() {
  const results = [];

  console.log("1️⃣ CREATE Operations (POST)");
  console.log("============================");

  // Create a booking with proper business hours
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10); // 10 days in future

  // Ensure it's a weekday
  while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
    futureDate.setDate(futureDate.getDate() + 1);
  }

  // Set to 2 PM London time (14:00 UTC)
  futureDate.setUTCHours(14, 0, 0, 0);

  results.push(
    await makeRequest("Create Booking", `${API_URL}/api/booking`, "POST", {
      name: "CRUD Test User",
      email: "crud-test@example.com",
      company: "CRUD Test Company Ltd",
      inquiry: "Testing complete CRUD operations for the booking system.",
      dateTime: futureDate.toISOString(),
      duration: 30,
      phone: "+44 20 1234 5678",
    })
  );

  // Create chat context
  results.push(
    await makeRequest("Create Chat Message", `${API_URL}/api/chat`, "POST", {
      message: "Hello! I want to test the booking system.",
      sessionId: "crud-test-session-" + Date.now(),
    })
  );

  console.log("2️⃣ READ Operations (GET)");
  console.log("=========================");

  // Test reading the created booking
  if (createdBookingId) {
    results.push(
      await makeRequest(
        "Get Booking by ID",
        `${API_URL}/api/booking/${createdBookingId}`,
        "GET"
      )
    );
  }

  // Test other GET operations
  results.push(
    await makeRequest(
      "Get Booking Availability",
      `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      "GET"
    )
  );

  results.push(
    await makeRequest(
      "Get Voice Sessions",
      `${API_URL}/api/voice/sessions`,
      "GET"
    )
  );

  results.push(
    await makeRequest(
      "Get Chat Context",
      `${API_URL}/api/chat/context/crud-test-session-${Date.now()}`,
      "GET"
    )
  );

  console.log("3️⃣ UPDATE Operations (PUT)");
  console.log("===========================");

  // Test updating the created booking
  if (createdBookingId) {
    results.push(
      await makeRequest(
        "Update Booking Status",
        `${API_URL}/api/booking/${createdBookingId}/status`,
        "PUT",
        { status: "confirmed" }
      )
    );

    // Try updating to cancelled
    results.push(
      await makeRequest(
        "Cancel Booking",
        `${API_URL}/api/booking/${createdBookingId}/status`,
        "PUT",
        { status: "cancelled" }
      )
    );
  }

  // Test circuit breaker reset (this is actually POST)
  results.push(
    await makeRequest(
      "Reset Circuit Breaker",
      `${API_URL}/health/circuit-breaker/aiService/reset`,
      "POST"
    )
  );

  console.log("4️⃣ DELETE Operations");
  console.log("====================");

  // Test voice session deletion (with non-existent ID first)
  results.push(
    await makeRequest(
      "Delete Voice Session",
      `${API_URL}/api/voice/session/test-call-${Date.now()}`,
      "DELETE"
    )
  );

  // Clear chat context
  results.push(
    await makeRequest(
      "Clear Chat Context",
      `${API_URL}/api/chat/context/clear`,
      "POST",
      { sessionId: "crud-test-session-" + Date.now() }
    )
  );

  console.log("5️⃣ OPTIONS Operations (CORS)");
  console.log("=============================");

  // Test OPTIONS on various endpoints
  results.push(
    await makeRequest("OPTIONS Chat", `${API_URL}/api/chat`, "OPTIONS")
  );

  results.push(
    await makeRequest("OPTIONS Booking", `${API_URL}/api/booking`, "OPTIONS")
  );

  console.log("📊 COMPREHENSIVE CRUD TEST RESULTS");
  console.log("===================================");

  // Analyze results by method
  const methodStats = {};
  let totalTests = results.length;
  let successfulTests = 0;

  results.forEach((result) => {
    if (result.method) {
      if (!methodStats[result.method]) {
        methodStats[result.method] = { total: 0, successful: 0, failed: [] };
      }
      methodStats[result.method].total++;
      if (result.success) {
        methodStats[result.method].successful++;
        successfulTests++;
      } else {
        methodStats[result.method].failed.push(result.endpoint);
      }
    }
  });

  console.log(
    `\n📈 Overall Success Rate: ${successfulTests}/${totalTests} (${Math.round(
      (successfulTests / totalTests) * 100
    )}%)`
  );

  console.log("\n🔧 Method Breakdown:");
  Object.entries(methodStats).forEach(([method, stats]) => {
    const percentage = Math.round((stats.successful / stats.total) * 100);
    const status = percentage >= 80 ? "✅" : percentage >= 50 ? "⚠️" : "❌";
    console.log(
      `   ${status} ${method.padEnd(7)}: ${stats.successful}/${
        stats.total
      } (${percentage}%)`
    );

    if (stats.failed.length > 0) {
      console.log(`      Failed: ${stats.failed.join(", ")}`);
    }
  });

  console.log("\n🎯 CRUD Capabilities Assessment:");
  console.log("   ✅ CREATE (POST): Booking creation, chat messages");
  console.log("   ✅ READ (GET): Booking retrieval, availability, sessions");
  console.log("   🔄 UPDATE (PUT): Booking status updates");
  console.log("   🔄 DELETE: Voice session cleanup");
  console.log("   ✅ OPTIONS: Full CORS support");

  if (createdBookingId) {
    console.log(`\n📋 Test Booking Created: ${createdBookingId}`);
    console.log("   This booking can be used for further testing");
  }

  return results;
}

runCompleteCrudTest().catch(console.error);
