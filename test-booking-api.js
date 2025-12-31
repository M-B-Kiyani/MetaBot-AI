#!/usr/bin/env node

/**
 * Test booking API endpoints specifically
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Testing Booking API Endpoints\n");

async function testEndpoint(url, method = "GET", data = null, headers = {}) {
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

    console.log(`📤 ${method} ${url}`);
    console.log(`🔑 Headers:`, Object.keys(headers).join(", "));

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        console.log(`📊 Status: ${res.statusCode}`);

        try {
          const jsonData = JSON.parse(responseData);
          console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log(`📄 Raw Response:`, responseData.substring(0, 500));
        }

        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: responseData,
        });
      });
    });

    req.on("error", (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      resolve({
        success: false,
        error: error.message,
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runBookingTests() {
  console.log("1️⃣ Testing Booking Availability API");
  console.log("=====================================");

  // Test with a future date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD format

  await testEndpoint(
    `${API_URL}/api/booking/availability?date=${tomorrowISO}&duration=30`,
    "GET",
    null,
    {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    }
  );

  console.log("\n2️⃣ Testing Create Booking API");
  console.log("===============================");

  // Test creating a booking
  const bookingDateTime = new Date(tomorrow);
  bookingDateTime.setHours(10, 0, 0, 0); // 10:00 AM

  await testEndpoint(
    `${API_URL}/api/booking`,
    "POST",
    {
      name: "Test User",
      email: "test@example.com",
      company: "Test Company",
      inquiry: "Testing the booking API endpoint functionality",
      dateTime: bookingDateTime.toISOString(),
      duration: 30,
      phone: "+1234567890",
    },
    {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    }
  );

  console.log("\n3️⃣ Testing Invalid Booking (Missing Fields)");
  console.log("=============================================");

  await testEndpoint(
    `${API_URL}/api/booking`,
    "POST",
    {
      name: "Test User",
      // Missing required fields to test validation
    },
    {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    }
  );
}

runBookingTests().catch(console.error);
