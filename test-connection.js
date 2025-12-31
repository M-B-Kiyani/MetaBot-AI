#!/usr/bin/env node

/**
 * Simple connection test for Railway deployment
 */

const https = require("https");

console.log("🔧 Testing Railway API Connection...");

const testEndpoints = [
  "https://metabot-ai-production.up.railway.app",
  "https://metabot-ai-production.up.railway.app/health",
  "https://metabot-ai-production.up.railway.app/api/status",
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${url}`);

    const startTime = Date.now();
    const req = https.request(
      url,
      {
        timeout: 15000,
        headers: {
          "User-Agent": "Railway-Connection-Test/1.0",
        },
      },
      (res) => {
        const duration = Date.now() - startTime;
        let data = "";

        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log(`✅ Status: ${res.statusCode} (${duration}ms)`);
          console.log(
            `📄 Response: ${data.substring(0, 150)}${
              data.length > 150 ? "..." : ""
            }`
          );
          resolve({
            success: true,
            status: res.statusCode,
            duration,
            data: data.substring(0, 500),
          });
        });
      }
    );

    req.on("error", (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ Error: ${error.message} (${duration}ms)`);
      resolve({
        success: false,
        error: error.message,
        duration,
        code: error.code,
      });
    });

    req.on("timeout", () => {
      const duration = Date.now() - startTime;
      console.log(`⏰ Timeout after ${duration}ms`);
      req.destroy();
      resolve({
        success: false,
        error: "Request timeout",
        duration,
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log("🚀 Starting connection tests...\n");

  const results = [];

  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ endpoint, ...result });

    // Wait a bit between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n📊 Test Summary:");
  console.log("================");

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.endpoint}`);
    if (result.success) {
      console.log(
        `   Status: ${result.status}, Duration: ${result.duration}ms`
      );
    } else {
      console.log(`   Error: ${result.error}, Duration: ${result.duration}ms`);
    }
  });

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `\n🎯 Results: ${successCount}/${results.length} endpoints successful`
  );

  if (successCount === 0) {
    console.log("\n🔧 Troubleshooting Tips:");
    console.log("1. Check Railway deployment status");
    console.log("2. Verify server is binding to 0.0.0.0");
    console.log("3. Check Railway logs for errors");
    console.log("4. Ensure health check endpoint exists");
    console.log("5. Verify domain configuration");
  }
}

runTests().catch(console.error);
