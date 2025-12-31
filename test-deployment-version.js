#!/usr/bin/env node

/**
 * Test if the latest changes are deployed to Railway
 */

const axios = require("axios");

const BASE_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

async function testDeploymentVersion() {
  console.log("🔍 Testing if latest changes are deployed...\n");

  const sessionId = "version-test-" + Date.now();

  try {
    // Start booking flow
    console.log("📤 Starting booking flow...");
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

    console.log("✅ Step 1 - Booking flow started");
    console.log(`   Type: ${response1.data.response.type}`);
    console.log(`   Step: ${response1.data.response.step}`);

    // Immediately send second message
    console.log("\n📤 Sending name (should maintain booking context)...");
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

    console.log("📥 Step 2 Response:");
    console.log(`   Type: ${response2.data.response.type}`);
    if (response2.data.response.step) {
      console.log(`   Step: ${response2.data.response.step}`);
    }

    // Check if the fix is working
    if (response2.data.response.type === "booking_flow") {
      console.log(
        "🎉 SUCCESS: Booking flow context fix is deployed and working!"
      );
      return true;
    } else {
      console.log("❌ ISSUE: Booking flow context is still lost");
      console.log(
        "   This indicates the fix is not deployed or there's another issue"
      );
      return false;
    }
  } catch (error) {
    console.log("❌ Test failed:", error.response?.data || error.message);
    return false;
  }
}

async function checkServerLogs() {
  console.log("\n📋 Checking server logs for booking flow processing...");

  // We can't directly access server logs, but we can test the behavior
  const sessionId = "log-test-" + Date.now();

  try {
    // Start booking
    await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: "I want to schedule a meeting",
        sessionId: sessionId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    // Check context immediately
    const context = await axios.get(
      `${BASE_URL}/api/chat/context/${sessionId}`,
      {
        headers: { "X-API-Key": API_KEY },
      }
    );

    console.log("📊 Booking state after first message:");
    console.log(`   Has active booking: ${context.data.data.hasActiveBooking}`);
    console.log(`   Current step: ${context.data.data.bookingState?.step}`);

    // Send second message and check logs
    const response2 = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: "My name is Test User",
        sessionId: sessionId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log("\n📥 Second message response:");
    console.log(`   Type: ${response2.data.response.type}`);

    // Check context after second message
    const context2 = await axios.get(
      `${BASE_URL}/api/chat/context/${sessionId}`,
      {
        headers: { "X-API-Key": API_KEY },
      }
    );

    console.log("\n📊 Booking state after second message:");
    console.log(
      `   Has active booking: ${context2.data.data.hasActiveBooking}`
    );
    console.log(`   Current step: ${context2.data.data.bookingState?.step}`);
    console.log(
      `   Data collected: ${JSON.stringify(
        context2.data.data.bookingState?.data
      )}`
    );
  } catch (error) {
    console.log("❌ Log check failed:", error.response?.data || error.message);
  }
}

async function runVersionTest() {
  console.log("🚀 Testing Deployment Version and Booking Flow Fix...\n");

  const isWorking = await testDeploymentVersion();
  await checkServerLogs();

  console.log("\n🎯 CONCLUSION:");
  if (isWorking) {
    console.log("✅ The booking flow context fix is working correctly!");
  } else {
    console.log("❌ The booking flow context fix needs attention.");
    console.log("   Possible causes:");
    console.log("   1. Changes not deployed to Railway yet");
    console.log("   2. Railway needs to be redeployed with latest code");
    console.log("   3. There's still an issue in the logic");
  }

  return isWorking;
}

if (require.main === module) {
  runVersionTest().catch(console.error);
}

module.exports = { testDeploymentVersion, checkServerLogs };
