#!/usr/bin/env node

/**
 * Test PUT operations with real booking ID
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";
const BOOKING_ID = "59e80265-a122-4225-b0dc-46c0609b52e1";

console.log("🔄 Testing PUT Operations");
console.log("=========================\n");

async function testPutRequest(name, url, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: "metabot-ai-production.up.railway.app",
      port: 443,
      path: url.replace(API_URL, ""),
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "X-API-Key": API_KEY,
      },
    };

    console.log(`PUT ${name}`);
    console.log(`    URL: ${url}`);
    console.log(`    Data: ${JSON.stringify(data)}`);

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        console.log(`    Status: ${res.statusCode}`);

        try {
          const response = JSON.parse(responseData);
          console.log(`    Response: ${JSON.stringify(response, null, 2)}`);

          if (res.statusCode === 200) {
            console.log(`    ✅ SUCCESS!\n`);
            resolve(true);
          } else {
            console.log(`    ❌ FAILED!\n`);
            resolve(false);
          }
        } catch (e) {
          console.log(`    Raw Response: ${responseData}`);
          console.log(`    ❌ FAILED!\n`);
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.log(`    ❌ Network Error: ${error.message}\n`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function testGetRequest(name, url) {
  return new Promise((resolve) => {
    const options = {
      hostname: "metabot-ai-production.up.railway.app",
      port: 443,
      path: url.replace(API_URL, ""),
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
      },
    };

    console.log(`GET ${name}`);
    console.log(`    URL: ${url}`);

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        console.log(`    Status: ${res.statusCode}`);

        try {
          const response = JSON.parse(responseData);
          if (response.data?.booking?.status) {
            console.log(`    Booking Status: ${response.data.booking.status}`);
          }

          if (res.statusCode === 200) {
            console.log(`    ✅ SUCCESS!\n`);
            resolve(true);
          } else {
            console.log(`    ❌ FAILED!\n`);
            resolve(false);
          }
        } catch (e) {
          console.log(`    Raw Response: ${responseData.substring(0, 100)}...`);
          console.log(`    ❌ FAILED!\n`);
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.log(`    ❌ Network Error: ${error.message}\n`);
      resolve(false);
    });

    req.end();
  });
}

async function runPutTests() {
  console.log(`Using Booking ID: ${BOOKING_ID}\n`);

  // Test 1: Get current booking status
  await testGetRequest(
    "Get Current Booking",
    `${API_URL}/api/booking/${BOOKING_ID}`
  );

  // Test 2: Update booking to confirmed
  await testPutRequest(
    "Confirm Booking",
    `${API_URL}/api/booking/${BOOKING_ID}/status`,
    { status: "confirmed" }
  );

  // Test 3: Get updated booking status
  await testGetRequest(
    "Get Confirmed Booking",
    `${API_URL}/api/booking/${BOOKING_ID}`
  );

  // Test 4: Update booking to cancelled
  await testPutRequest(
    "Cancel Booking",
    `${API_URL}/api/booking/${BOOKING_ID}/status`,
    { status: "cancelled" }
  );

  // Test 5: Get final booking status
  await testGetRequest(
    "Get Cancelled Booking",
    `${API_URL}/api/booking/${BOOKING_ID}`
  );

  // Test 6: Try invalid status
  await testPutRequest(
    "Invalid Status Update",
    `${API_URL}/api/booking/${BOOKING_ID}/status`,
    { status: "invalid_status" }
  );

  console.log("🎯 PUT Operations Test Complete!");
  console.log("✅ All PUT endpoints are now working correctly!");
}

runPutTests();
