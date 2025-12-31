#!/usr/bin/env node

/**
 * Test authentication fix
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Testing Authentication Fix\n");

async function testAuth() {
  return new Promise((resolve) => {
    const options = {
      hostname: "metabot-ai-production.up.railway.app",
      port: 443,
      path: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "Content-Length": Buffer.byteLength(
          JSON.stringify({
            message: "Hello! Test authentication",
            sessionId: "test-auth-" + Date.now(),
          })
        ),
      },
    };

    console.log(
      `Testing POST /api/chat with API key: ${API_KEY.substring(0, 10)}...`
    );

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);

        if (res.statusCode === 200) {
          console.log("✅ Authentication working!");
          try {
            const response = JSON.parse(data);
            console.log(
              `AI Response: "${response.response.message.substring(0, 50)}..."`
            );
          } catch (e) {
            console.log("Response received but couldn't parse JSON");
          }
        } else {
          console.log("❌ Authentication failed");
          try {
            const error = JSON.parse(data);
            console.log(`Error: ${error.error.message}`);
          } catch (e) {
            console.log(`Raw response: ${data}`);
          }
        }
        resolve();
      });
    });

    req.on("error", (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      resolve();
    });

    req.write(
      JSON.stringify({
        message: "Hello! Test authentication",
        sessionId: "test-auth-" + Date.now(),
      })
    );
    req.end();
  });
}

testAuth();
