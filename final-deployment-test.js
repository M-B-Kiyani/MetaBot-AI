#!/usr/bin/env node

/**
 * Final comprehensive test of Railway deployment
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🎯 Final Railway Deployment Test");
console.log("================================\n");

async function testEndpoint(url, method = "GET", data = null, headers = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
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

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: responseData,
          headers: res.headers,
        });
      });
    });

    req.on("error", (error) => {
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

async function runTests() {
  const tests = [
    {
      name: "🏠 Root Endpoint",
      test: () => testEndpoint(API_URL),
    },
    {
      name: "❤️  Health Check",
      test: () => testEndpoint(`${API_URL}/health`),
    },
    {
      name: "📊 Status Endpoint",
      test: () => testEndpoint(`${API_URL}/api/status`),
    },
    {
      name: "💬 Chat API (Authenticated)",
      test: () =>
        testEndpoint(
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
        ),
    },
    {
      name: "📅 Booking Availability API",
      test: () =>
        testEndpoint(
          `${API_URL}/api/booking/availability?date=2026-01-15&duration=30`,
          "GET",
          null,
          {
            "X-API-Key": API_KEY,
            Authorization: `Bearer ${API_KEY}`,
          }
        ),
    },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`Testing ${test.name}...`);

    try {
      const result = await test.test();

      if (result.success) {
        console.log(`✅ ${test.name} - Status: ${result.status}`);

        // Show response preview for key endpoints
        if (test.name.includes("Chat") || test.name.includes("Root")) {
          try {
            const jsonData = JSON.parse(result.data);
            if (jsonData.response?.message) {
              console.log(
                `   💬 Response: "${jsonData.response.message.substring(
                  0,
                  60
                )}..."`
              );
            } else if (jsonData.service) {
              console.log(
                `   🏷️  Service: ${jsonData.service} v${jsonData.version}`
              );
            }
          } catch (e) {
            // Not JSON, skip preview
          }
        }

        passedTests++;
      } else {
        console.log(`❌ ${test.name} - Status: ${result.status || "Error"}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Exception: ${error.message}`);
    }

    console.log("");
  }

  console.log("📋 Test Results Summary:");
  console.log("========================");
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);

  if (passedTests === totalTests) {
    console.log(
      "\n🎉 All tests passed! Your Railway deployment is fully operational!"
    );
    console.log("\n🔗 Your API is ready to use:");
    console.log(`   Domain: ${API_URL}`);
    console.log(`   Widget Key: ${API_KEY}`);
    console.log(`   Status: ✅ Online`);
  } else {
    console.log(
      `\n⚠️  ${
        totalTests - passedTests
      } test(s) failed. Check the errors above.`
    );
  }
}

runTests().catch(console.error);
