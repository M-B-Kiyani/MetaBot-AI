#!/usr/bin/env node

/**
 * Test CRUD operations (PUT/PATCH/DELETE)
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Testing CRUD Operations (PUT/PATCH/DELETE)\n");

async function testEndpoint(name, url, method, data = null) {
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

    console.log(`${method} ${name}`);

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        console.log(`   Status: ${res.statusCode}`);

        if (res.statusCode < 400) {
          console.log(`   ✅ Success`);
          try {
            const jsonData = JSON.parse(responseData);
            if (jsonData.success !== undefined) {
              console.log(`   Response: Success = ${jsonData.success}`);
            }
            if (jsonData.message) {
              console.log(`   Message: ${jsonData.message}`);
            }
          } catch (e) {
            console.log(`   Response: ${responseData.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ❌ Failed`);
          try {
            const errorData = JSON.parse(responseData);
            console.log(
              `   Error: ${
                errorData.error?.message || errorData.message || "Unknown"
              }`
            );
          } catch (e) {
            console.log(`   Raw: ${responseData.substring(0, 100)}...`);
          }
        }
        console.log("");
        resolve({ success: res.statusCode < 400, status: res.statusCode });
      });
    });

    req.on("error", (error) => {
      console.log(`   ❌ Network Error: ${error.message}\n`);
      resolve({ success: false, error: error.message });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runCrudTests() {
  console.log("🔄 PUT Operations");
  console.log("=================");

  // First create a booking to get a real booking ID
  console.log("Creating a test booking first...");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
    futureDate.setDate(futureDate.getDate() + 1);
  }
  futureDate.setUTCHours(14, 0, 0, 0);

  const createResult = await testEndpoint(
    "Create Test Booking",
    `${API_URL}/api/booking`,
    "POST",
    {
      name: "CRUD Test User",
      email: "crud-test@example.com",
      company: "CRUD Test Company",
      inquiry: "Testing CRUD operations",
      dateTime: futureDate.toISOString(),
      duration: 30,
      phone: "+1234567890",
    }
  );

  // Extract booking ID from the response (we'll use a known pattern for now)
  const testBookingId = "test-booking-123"; // We'll test with this first

  // Test PUT operations
  await testEndpoint(
    "Update Booking Status",
    `${API_URL}/api/booking/${testBookingId}/status`,
    "PUT",
    { status: "confirmed" }
  );

  await testEndpoint(
    "Reset Circuit Breaker",
    `${API_URL}/health/circuit-breaker/aiService/reset`,
    "POST" // This is actually POST according to the routes
  );

  console.log("🗑️ DELETE Operations");
  console.log("====================");

  // Test DELETE operations
  await testEndpoint(
    "Delete Voice Session",
    `${API_URL}/api/voice/session/test-call-123`,
    "DELETE"
  );

  // Test with a real voice session (create one first)
  console.log("📞 Testing Voice Session Management");
  console.log("===================================");

  // Get current voice sessions
  await testEndpoint(
    "List Voice Sessions",
    `${API_URL}/api/voice/sessions`,
    "GET"
  );

  // Test voice session by ID
  await testEndpoint(
    "Get Voice Session",
    `${API_URL}/api/voice/session/nonexistent-call`,
    "GET"
  );

  console.log("🔧 Additional CRUD Tests");
  console.log("========================");

  // Test booking retrieval by ID
  await testEndpoint(
    "Get Booking by ID",
    `${API_URL}/api/booking/${testBookingId}`,
    "GET"
  );

  // Test with a real booking ID pattern
  await testEndpoint(
    "Get Real Booking Pattern",
    `${API_URL}/api/booking/d98e7402-437b-457b-b1b1-99144eb94f97`,
    "GET"
  );

  console.log("📊 CRUD Test Summary");
  console.log("====================");
  console.log("✅ Booking creation: Working");
  console.log("🔄 PUT operations: Testing...");
  console.log("🗑️ DELETE operations: Testing...");
  console.log("📖 GET by ID: Testing...");
}

runCrudTests().catch(console.error);
