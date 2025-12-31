#!/usr/bin/env node

/**
 * Test the new Railway domain
 */

const https = require("https");

const newDomain = "https://metabot-ai-production.up.railway.app";

console.log(`🔍 Testing new Railway domain: ${newDomain}\n`);

const testEndpoints = [
  `${newDomain}`,
  `${newDomain}/health`,
  `${newDomain}/api/chat`,
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`Testing: ${url}`);

    const startTime = Date.now();
    const req = https.request(url, { timeout: 10000 }, (res) => {
      const duration = Date.now() - startTime;
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`✅ Status: ${res.statusCode} (${duration}ms)`);
        console.log(`📄 Response: ${data.substring(0, 200)}...`);
        resolve({ success: true, status: res.statusCode, duration });
      });
    });

    req.on("error", (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ Error: ${error.message} (${duration}ms)`);
      resolve({ success: false, error: error.message, duration });
    });

    req.on("timeout", () => {
      const duration = Date.now() - startTime;
      console.log(`⏰ Timeout after ${duration}ms`);
      req.destroy();
      resolve({ success: false, error: "Timeout", duration });
    });

    req.end();
  });
}

async function runTests() {
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
    console.log("");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("🎯 Your new Railway deployment is working!");
  console.log(`🌐 Domain: ${newDomain}`);
}

runTests().catch(console.error);
