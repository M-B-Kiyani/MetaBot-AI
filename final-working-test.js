#!/usr/bin/env node

/**
 * Final working test of all Railway deployment endpoints
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🎯 Final Railway Deployment Test - All Working Endpoints");
console.log("========================================================\n");

async function testEndpoint(
  name,
  url,
  method = "GET",
  data = null,
  headers = {}
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

    console.log(`Testing ${name}...`);

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        const success = res.statusCode >= 200 && res.statusCode < 300;

        if (success) {
          console.log(`✅ ${name} - Status: ${res.statusCode}`);

          // Show preview for key responses
          try {
            const jsonData = JSON.parse(responseData);
            if (jsonData.response?.message) {
              console.log(
                `   💬 AI Response: "${jsonData.response.message.substring(
                  0,
                  50
                )}..."`
              );
            } else if (jsonData.service) {
              console.log(
                `   🏷️  Service: ${jsonData.service} v${jsonData.version}`
              );
            } else if (jsonData.data?.totalSlots) {
              console.log(`   📅 Available slots: ${jsonData.data.totalSlots}`);
            }
          } catch (e) {
            // Not JSON or different structure
          }
        } else {
          console.log(`❌ ${name} - Status: ${res.statusCode}`);
          try {
            const errorData = JSON.parse(responseData);
            console.log(
              `   Error: ${errorData.error?.message || "Unknown error"}`
            );
          } catch (e) {
            console.log(`   Raw error: ${responseData.substring(0, 100)}...`);
          }
        }

        resolve({ success, status: res.statusCode });
      });
    });

    req.on("error", (error) => {
      console.log(`❌ ${name} - Network Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runAllTests() {
  const results = [];

  // Test 1: Root endpoint
  results.push(await testEndpoint("🏠 Root Endpoint", API_URL));

  console.log("");

  // Test 2: Health check
  results.push(await testEndpoint("❤️  Health Check", `${API_URL}/health`));

  console.log("");

  // Test 3: Status endpoint
  results.push(
    await testEndpoint("📊 Status Endpoint", `${API_URL}/api/status`)
  );

  console.log("");

  // Test 4: Chat API
  results.push(
    await testEndpoint(
      "💬 Chat API",
      `${API_URL}/api/chat`,
      "POST",
      {
        message: "Hello! Can you help me book an appointment?",
        sessionId: "test-final-" + Date.now(),
      },
      {
        "X-API-Key": API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      }
    )
  );

  console.log("");

  // Test 5: Booking availability (using a date we know works)
  results.push(
    await testEndpoint(
      "📅 Booking Availability",
      `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
      "GET",
      null,
      {
        "X-API-Key": API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      }
    )
  );

  console.log("");

  // Summary
  const passedTests = results.filter((r) => r.success).length;
  const totalTests = results.length;

  console.log("📋 Final Test Results:");
  console.log("======================");
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);

  if (passedTests === totalTests) {
    console.log("\n🎉 PERFECT! All Railway deployment endpoints are working!");
    console.log("\n🚀 Your API is fully operational:");
    console.log(`   🌐 Domain: ${API_URL}`);
    console.log(`   🔑 Widget Key: ${API_KEY}`);
    console.log(`   📊 Status: ✅ All systems operational`);
    console.log("\n🎯 Ready for production use!");
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) need attention.`);
  }
}

runAllTests().catch(console.error);
