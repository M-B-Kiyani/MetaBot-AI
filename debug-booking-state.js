#!/usr/bin/env node

/**
 * Debug booking state management to understand why context is lost
 */

const axios = require("axios");

const BASE_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

async function debugBookingState() {
  console.log("🔍 Debugging Booking State Management...\n");

  const sessionId = "debug-session-" + Date.now();

  // Step 1: Start booking flow
  console.log("📤 Step 1: Starting booking flow");
  try {
    const response1 = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: "I want to book a meeting",
        sessionId: sessionId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log("📥 Response 1:");
    console.log(`   Type: ${response1.data.response.type}`);
    console.log(`   Step: ${response1.data.response.step}`);
    console.log(
      `   Message: ${response1.data.response.message.substring(0, 100)}...`
    );

    // Check context endpoint
    console.log("\n🔍 Checking context after step 1...");
    try {
      const contextResponse1 = await axios.get(
        `${BASE_URL}/api/chat/context/${sessionId}`,
        {
          headers: { "X-API-Key": API_KEY },
        }
      );

      console.log("📊 Context Response 1:");
      console.log(JSON.stringify(contextResponse1.data, null, 2));
    } catch (contextError) {
      console.log(
        "❌ Context check failed:",
        contextError.response?.data || contextError.message
      );
    }
  } catch (error) {
    console.log("❌ Step 1 failed:", error.response?.data || error.message);
    return;
  }

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Provide name
  console.log("\n📤 Step 2: Providing name");
  try {
    const response2 = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: "John Smith",
        sessionId: sessionId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log("📥 Response 2:");
    console.log(`   Type: ${response2.data.response.type}`);
    if (response2.data.response.step) {
      console.log(`   Step: ${response2.data.response.step}`);
    }
    console.log(
      `   Message: ${response2.data.response.message.substring(0, 100)}...`
    );

    // Check context endpoint again
    console.log("\n🔍 Checking context after step 2...");
    try {
      const contextResponse2 = await axios.get(
        `${BASE_URL}/api/chat/context/${sessionId}`,
        {
          headers: { "X-API-Key": API_KEY },
        }
      );

      console.log("📊 Context Response 2:");
      console.log(JSON.stringify(contextResponse2.data, null, 2));
    } catch (contextError) {
      console.log(
        "❌ Context check failed:",
        contextError.response?.data || contextError.message
      );
    }
  } catch (error) {
    console.log("❌ Step 2 failed:", error.response?.data || error.message);
  }

  // Test direct booking state check
  console.log("\n🔍 Testing booking state persistence...");

  // Create a new session and check if state persists
  const testSessionId = "test-persistence-" + Date.now();

  try {
    // Start booking
    await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: "I want to schedule a consultation",
        sessionId: testSessionId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log("✅ Started booking flow for test session");

    // Immediately check context
    const immediateContext = await axios.get(
      `${BASE_URL}/api/chat/context/${testSessionId}`,
      {
        headers: { "X-API-Key": API_KEY },
      }
    );

    console.log("📊 Immediate context check:");
    console.log(JSON.stringify(immediateContext.data, null, 2));

    // Wait and check again
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const delayedContext = await axios.get(
      `${BASE_URL}/api/chat/context/${testSessionId}`,
      {
        headers: { "X-API-Key": API_KEY },
      }
    );

    console.log("📊 Delayed context check:");
    console.log(JSON.stringify(delayedContext.data, null, 2));
  } catch (error) {
    console.log(
      "❌ Persistence test failed:",
      error.response?.data || error.message
    );
  }
}

async function testHealthAndServices() {
  console.log("\n🏥 Testing service health...");

  try {
    const healthResponse = await axios.get(`${BASE_URL}/health/detailed`, {
      timeout: 10000,
    });

    console.log("📊 Detailed Health Status:");
    console.log(JSON.stringify(healthResponse.data, null, 2));
  } catch (error) {
    console.log(
      "❌ Health check failed:",
      error.response?.data || error.message
    );
  }
}

async function runDebugTests() {
  console.log("🚀 Starting Booking State Debug Tests...\n");

  await debugBookingState();
  await testHealthAndServices();

  console.log("\n🏁 Debug tests completed.");
}

if (require.main === module) {
  runDebugTests().catch(console.error);
}

module.exports = { debugBookingState, testHealthAndServices };
