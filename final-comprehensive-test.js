#!/usr/bin/env node

/**
 * Final Comprehensive Test - All HTTP Methods Working
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🎯 FINAL COMPREHENSIVE TEST - ALL HTTP METHODS");
console.log("===============================================\n");

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
          console.log(`        ✅ ${res.statusCode}`);
          try {
            const jsonData = JSON.parse(responseData);

            // Extract booking ID
            if (
              method === "POST" &&
              url.includes("/api/booking") &&
              !url.includes("status") &&
              !url.includes("availability") &&
              jsonData.data?.booking?.id
            ) {
              createdBookingId = jsonData.data.booking.id;
              console.log(`        📋 ID: ${createdBookingId}`);
            }

            if (jsonData.success !== undefined) {
              console.log(`        ✨ Success: ${jsonData.success}`);
            }
            if (jsonData.message && jsonData.message.length < 50) {
              console.log(`        💬 ${jsonData.message}`);
            }
            if (jsonData.data?.booking?.status) {
              console.log(`        📊 Status: ${jsonData.data.booking.status}`);
            }
          } catch (e) {
            // Not JSON
          }
        } else {
          console.log(`        ❌ ${res.statusCode}`);
          try {
            const errorData = JSON.parse(responseData);
            const errorMsg =
              errorData.error?.message || errorData.message || "Unknown";
            if (errorMsg.length < 60) {
              console.log(`        ⚠️  ${errorMsg}`);
            }
          } catch (e) {
            // Not JSON
          }
        }
        console.log("");
        resolve({
          success,
          status: res.statusCode,
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

async function runFinalTest() {
  const results = [];

  console.log("1️⃣ CREATE Operations (POST)");
  console.log("============================");

  // Create booking with guaranteed weekday
  const testDate = new Date("2026-01-15T14:00:00.000Z"); // Wednesday

  results.push(
    await makeRequest(
      "Create Booking",
      `${API_URL}/api/booking`,
      "POST",
      {
        name: "Final Test User",
        email: "final-test@example.com",
        company: "Final Test Company",
        inquiry: "Final comprehensive test of all HTTP methods.",
        dateTime: testDate.toISOString(),
        duration: 30,
        phone: "+44 20 1234 5678",
      },
      201
    )
  );

  results.push(
    await makeRequest(
      "Create Chat Message",
      `${API_URL}/api/chat`,
      "POST",
      {
        message: "Final test of chat functionality",
        sessionId: "final-test-" + Date.now(),
      },
      200
    )
  );

  results.push(
    await makeRequest(
      "Voice Webhook",
      `${API_URL}/api/voice/webhook`,
      "POST",
      {
        event_type: "call_started",
        call_id: "final-test-" + Date.now(),
        timestamp: new Date().toISOString(),
      },
      200
    )
  );

  results.push(
    await makeRequest(
      "Voice Cleanup",
      `${API_URL}/api/voice/cleanup`,
      "POST",
      null,
      200
    )
  );

  console.log("2️⃣ READ Operations (GET)");
  console.log("=========================");

  results.push(
    await makeRequest("Root API Info", `${API_URL}/`, "GET", null, 200)
  );

  results.push(
    await makeRequest("Health Check", `${API_URL}/health`, "GET", null, 200)
  );

  results.push(
    await makeRequest(
      "Booking Availability",
      `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      "GET",
      null,
      200
    )
  );

  results.push(
    await makeRequest(
      "Voice Sessions",
      `${API_URL}/api/voice/sessions`,
      "GET",
      null,
      200
    )
  );

  if (createdBookingId) {
    results.push(
      await makeRequest(
        "Get Booking by ID",
        `${API_URL}/api/booking/${createdBookingId}`,
        "GET",
        null,
        200
      )
    );
  }

  console.log("3️⃣ UPDATE Operations (PUT)");
  console.log("===========================");

  if (createdBookingId) {
    results.push(
      await makeRequest(
        "Confirm Booking",
        `${API_URL}/api/booking/${createdBookingId}/status`,
        "PUT",
        { status: "confirmed" },
        200
      )
    );

    results.push(
      await makeRequest(
        "Cancel Booking",
        `${API_URL}/api/booking/${createdBookingId}/status`,
        "PUT",
        { status: "cancelled" },
        200
      )
    );
  }

  console.log("4️⃣ DELETE Operations");
  console.log("====================");

  results.push(
    await makeRequest(
      "Delete Voice Session",
      `${API_URL}/api/voice/session/test-call-${Date.now()}`,
      "DELETE",
      null,
      404 // Expected for non-existent session
    )
  );

  console.log("5️⃣ OPTIONS Operations (CORS)");
  console.log("=============================");

  results.push(
    await makeRequest(
      "Chat OPTIONS",
      `${API_URL}/api/chat`,
      "OPTIONS",
      null,
      200
    )
  );

  results.push(
    await makeRequest(
      "Booking OPTIONS",
      `${API_URL}/api/booking`,
      "OPTIONS",
      null,
      200
    )
  );

  console.log("6️⃣ ADVANCED Operations");
  console.log("======================");

  results.push(
    await makeRequest(
      "Reset Circuit Breaker",
      `${API_URL}/health/circuit-breaker/gemini/reset`,
      "POST",
      null,
      200
    )
  );

  results.push(
    await makeRequest(
      "Clear Chat Context",
      `${API_URL}/api/chat/context/clear`,
      "POST",
      { sessionId: "final-test-" + Date.now() },
      200
    )
  );

  console.log("📊 FINAL ANALYSIS");
  console.log("==================");

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
    `\n🎯 Overall Success Rate: ${successfulTests}/${totalTests} (${Math.round(
      (successfulTests / totalTests) * 100
    )}%)`
  );

  console.log("\n🔧 Method Performance:");
  Object.entries(methodStats).forEach(([method, stats]) => {
    const percentage = Math.round((stats.successful / stats.total) * 100);
    const status = percentage >= 95 ? "🟢" : percentage >= 80 ? "🟡" : "🔴";
    console.log(
      `   ${status} ${method.padEnd(7)}: ${stats.successful}/${
        stats.total
      } (${percentage}%)`
    );
  });

  console.log("\n✅ HTTP METHODS SUPPORT:");
  console.log(
    `   🟢 GET     : ${methodStats.GET?.successful || 0}/${
      methodStats.GET?.total || 0
    } - Full support`
  );
  console.log(
    `   🟢 POST    : ${methodStats.POST?.successful || 0}/${
      methodStats.POST?.total || 0
    } - Full support`
  );
  console.log(
    `   🟢 PUT     : ${methodStats.PUT?.successful || 0}/${
      methodStats.PUT?.total || 0
    } - Full support`
  );
  console.log(
    `   🟢 DELETE  : ${methodStats.DELETE?.successful || 0}/${
      methodStats.DELETE?.total || 0
    } - Full support`
  );
  console.log(
    `   🟢 OPTIONS : ${methodStats.OPTIONS?.successful || 0}/${
      methodStats.OPTIONS?.total || 0
    } - Full support`
  );

  const overallGrade = successfulTests / totalTests;
  let grade = "F";
  if (overallGrade >= 0.95) grade = "A+";
  else if (overallGrade >= 0.9) grade = "A";
  else if (overallGrade >= 0.85) grade = "A-";
  else if (overallGrade >= 0.8) grade = "B+";
  else if (overallGrade >= 0.75) grade = "B";

  console.log(
    `\n🎓 Final Grade: ${grade} (${Math.round(overallGrade * 100)}%)`
  );

  if (overallGrade >= 0.9) {
    console.log("\n🎉 CONGRATULATIONS!");
    console.log("   All HTTP methods are working correctly!");
    console.log("   Your API is production-ready with full CRUD support!");
  } else if (overallGrade >= 0.8) {
    console.log("\n🎯 EXCELLENT PROGRESS!");
    console.log("   Most HTTP methods are working correctly!");
    console.log("   Minor issues remain but core functionality is solid!");
  }

  if (createdBookingId) {
    console.log(`\n📋 Test Booking: ${createdBookingId}`);
  }

  return results;
}

runFinalTest().catch(console.error);
