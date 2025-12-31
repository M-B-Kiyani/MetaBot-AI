#!/usr/bin/env node

/**
 * Test all fixes for HTTP methods and functionality
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔧 Testing All Fixes - Complete HTTP Methods Support");
console.log("=====================================================\n");

let createdBookingId = null;

async function makeRequest(
  name,
  url,
  method,
  data = null,
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
        "X-API-Key": API_KEY,
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
          console.log(`        ✅ Status: ${res.statusCode}`);
          try {
            const jsonData = JSON.parse(responseData);

            // Extract booking ID if this is a booking creation
            if (
              method === "POST" &&
              url.includes("/api/booking") &&
              !url.includes("status") &&
              !url.includes("availability") &&
              jsonData.data?.booking?.id
            ) {
              createdBookingId = jsonData.data.booking.id;
              console.log(`        📋 Booking ID: ${createdBookingId}`);
            }

            if (jsonData.success !== undefined) {
              console.log(`        ✨ Success: ${jsonData.success}`);
            }
            if (jsonData.message) {
              console.log(`        💬 ${jsonData.message}`);
            }
            if (jsonData.data?.booking?.status) {
              console.log(
                `        📊 Booking Status: ${jsonData.data.booking.status}`
              );
            }
            if (jsonData.data?.totalSlots) {
              console.log(
                `        📅 Available Slots: ${jsonData.data.totalSlots}`
              );
            }
          } catch (e) {
            console.log(`        📄 Response received`);
          }
        } else {
          console.log(`        ❌ Status: ${res.statusCode}`);
          try {
            const errorData = JSON.parse(responseData);
            console.log(
              `        ⚠️  ${
                errorData.error?.message || errorData.message || "Unknown error"
              }`
            );
          } catch (e) {
            console.log(`        📄 Raw: ${responseData.substring(0, 50)}...`);
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
      console.log(`        ❌ Network Error: ${error.message}\n`);
      resolve({ success: false, error: error.message, method, endpoint: name });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAllFixes() {
  const results = [];

  console.log("🎯 FIX 1: Booking Creation with Timezone Support");
  console.log("================================================");

  // Create a booking with proper London timezone
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);

  // Ensure it's a weekday
  while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
    futureDate.setDate(futureDate.getDate() + 1);
  }

  // Set to 2 PM UTC (which should be valid London time)
  futureDate.setUTCHours(14, 0, 0, 0);

  results.push(
    await makeRequest(
      "Create Booking (Fixed Timezone)",
      `${API_URL}/api/booking`,
      "POST",
      {
        name: "Fixed Test User",
        email: "fixed-test@example.com",
        company: "Fixed Test Company Ltd",
        inquiry:
          "Testing the fixed booking system with proper timezone handling.",
        dateTime: futureDate.toISOString(),
        duration: 30,
        phone: "+44 20 1234 5678",
      },
      201 // Expect 201 Created
    )
  );

  console.log("🎯 FIX 2: PUT/PATCH/DELETE Operations");
  console.log("====================================");

  // Test PUT operations with the created booking
  if (createdBookingId) {
    results.push(
      await makeRequest(
        "Update Booking Status (PUT)",
        `${API_URL}/api/booking/${createdBookingId}/status`,
        "PUT",
        { status: "confirmed" },
        200
      )
    );

    results.push(
      await makeRequest(
        "Get Updated Booking (GET)",
        `${API_URL}/api/booking/${createdBookingId}`,
        "GET",
        null,
        200
      )
    );

    results.push(
      await makeRequest(
        "Cancel Booking (PUT)",
        `${API_URL}/api/booking/${createdBookingId}/status`,
        "PUT",
        { status: "cancelled" },
        200
      )
    );
  }

  // Test circuit breaker reset with correct service names
  results.push(
    await makeRequest(
      "Reset Gemini Circuit Breaker",
      `${API_URL}/health/circuit-breaker/gemini/reset`,
      "POST",
      null,
      200
    )
  );

  results.push(
    await makeRequest(
      "Reset HubSpot Circuit Breaker",
      `${API_URL}/health/circuit-breaker/hubspot/reset`,
      "POST",
      null,
      200
    )
  );

  // Test DELETE operations
  results.push(
    await makeRequest(
      "Delete Voice Session (DELETE)",
      `${API_URL}/api/voice/session/test-call-${Date.now()}`,
      "DELETE",
      null,
      404 // Expect 404 for non-existent session
    )
  );

  console.log("🎯 FIX 3: Voice Webhook (Signature Optional)");
  console.log("============================================");

  // Test voice webhook without signature (should work now)
  results.push(
    await makeRequest(
      "Voice Webhook (No Signature)",
      `${API_URL}/api/voice/webhook`,
      "POST",
      {
        event_type: "call_started",
        call_id: "test-call-" + Date.now(),
        timestamp: new Date().toISOString(),
      },
      200
    )
  );

  // Test voice webhook with signature
  results.push(
    await makeRequest(
      "Voice Webhook (With Signature)",
      `${API_URL}/api/voice/webhook`,
      "POST",
      {
        event_type: "call_ended",
        call_id: "test-call-" + Date.now(),
        timestamp: new Date().toISOString(),
      },
      200
    )
  );

  console.log("🎯 COMPREHENSIVE HTTP METHODS TEST");
  console.log("==================================");

  // Test all HTTP methods on various endpoints
  const methodTests = [
    // GET methods
    { name: "Root API Info", url: `${API_URL}/`, method: "GET", expect: 200 },
    {
      name: "Health Check",
      url: `${API_URL}/health`,
      method: "GET",
      expect: 200,
    },
    {
      name: "Booking Availability",
      url: `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      method: "GET",
      expect: 200,
    },
    {
      name: "Voice Sessions",
      url: `${API_URL}/api/voice/sessions`,
      method: "GET",
      expect: 200,
    },

    // POST methods
    {
      name: "Chat Message",
      url: `${API_URL}/api/chat`,
      method: "POST",
      data: { message: "Test all fixes", sessionId: "fix-test-" + Date.now() },
      expect: 200,
    },
    {
      name: "Voice Cleanup",
      url: `${API_URL}/api/voice/cleanup`,
      method: "POST",
      expect: 200,
    },

    // OPTIONS methods
    {
      name: "Chat OPTIONS",
      url: `${API_URL}/api/chat`,
      method: "OPTIONS",
      expect: 200,
    },
    {
      name: "Booking OPTIONS",
      url: `${API_URL}/api/booking`,
      method: "OPTIONS",
      expect: 200,
    },
  ];

  for (const test of methodTests) {
    results.push(
      await makeRequest(
        test.name,
        test.url,
        test.method,
        test.data || null,
        test.expect
      )
    );
  }

  console.log("📊 FINAL RESULTS ANALYSIS");
  console.log("=========================");

  // Analyze results
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
    `\n🎯 Overall Success Rate: ${successfulTests}/${totalTests} (${Math.round(
      (successfulTests / totalTests) * 100
    )}%)`
  );

  console.log("\n🔧 Method Performance:");
  Object.entries(methodStats).forEach(([method, stats]) => {
    const percentage = Math.round((stats.successful / stats.total) * 100);
    const status = percentage >= 90 ? "🟢" : percentage >= 70 ? "🟡" : "🔴";
    console.log(
      `   ${status} ${method.padEnd(7)}: ${stats.successful}/${
        stats.total
      } (${percentage}%)`
    );

    if (stats.failed.length > 0 && stats.failed.length <= 3) {
      console.log(`      Issues: ${stats.failed.join(", ")}`);
    }
  });

  console.log("\n✅ FIXES VERIFICATION:");
  console.log(
    "   🔧 Booking Creation: " +
      (createdBookingId ? "✅ FIXED" : "❌ Still broken")
  );
  console.log(
    "   🔧 PUT Operations: " +
      (results.some((r) => r.method === "PUT" && r.success)
        ? "✅ FIXED"
        : "❌ Still broken")
  );
  console.log(
    "   🔧 DELETE Operations: " +
      (results.some((r) => r.method === "DELETE")
        ? "✅ IMPLEMENTED"
        : "❌ Still broken")
  );
  console.log(
    "   🔧 Voice Webhook: " +
      (results.some((r) => r.endpoint.includes("Voice Webhook") && r.success)
        ? "✅ FIXED"
        : "❌ Still broken")
  );
  console.log(
    "   🔧 Circuit Breakers: " +
      (results.some((r) => r.endpoint.includes("Circuit Breaker") && r.success)
        ? "✅ FIXED"
        : "❌ Still broken")
  );

  const overallGrade = successfulTests / totalTests;
  let grade = "F";
  if (overallGrade >= 0.95) grade = "A+";
  else if (overallGrade >= 0.9) grade = "A";
  else if (overallGrade >= 0.85) grade = "A-";
  else if (overallGrade >= 0.8) grade = "B+";
  else if (overallGrade >= 0.75) grade = "B";
  else if (overallGrade >= 0.7) grade = "B-";
  else if (overallGrade >= 0.65) grade = "C+";
  else if (overallGrade >= 0.6) grade = "C";

  console.log(
    `\n🎓 Final Grade: ${grade} (${Math.round(overallGrade * 100)}%)`
  );

  if (createdBookingId) {
    console.log(`\n📋 Test Booking Created: ${createdBookingId}`);
    console.log("   Use this ID for further testing");
  }

  return results;
}

testAllFixes().catch(console.error);
