#!/usr/bin/env node

/**
 * Debug specific issues found in the Railway deployment test
 */

const axios = require("axios");

const BASE_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

async function debugAvailabilityResponse() {
  console.log("🔍 Debugging availability API response...");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  try {
    const response = await axios.get(
      `${BASE_URL}/api/booking/availability?date=${dateStr}&duration=30`,
      {
        headers: {
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log("✅ Raw availability response:");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.availableSlots.length > 0) {
      const firstSlot = response.data.data.availableSlots[0];
      console.log(`\n📅 First available slot: ${JSON.stringify(firstSlot)}`);
      return firstSlot;
    }
  } catch (error) {
    console.log(
      "❌ Availability API error:",
      error.response?.data || error.message
    );
  }

  return null;
}

async function debugBookingCreation(slot) {
  console.log("\n🔍 Debugging booking creation...");

  if (!slot) {
    console.log("❌ No slot available for testing");
    return;
  }

  // Extract datetime from slot object
  let dateTime;
  if (typeof slot === "object" && slot.datetime) {
    dateTime = slot.datetime;
  } else if (typeof slot === "string") {
    dateTime = slot;
  } else {
    console.log("❌ Invalid slot format:", slot);
    return;
  }

  const bookingData = {
    name: "John Test User",
    email: "john.test@example.com",
    company: "Test Company Inc",
    inquiry: "I would like to discuss AI solutions for my business",
    dateTime: dateTime,
    duration: 30,
    phone: "+1-555-0123",
  };

  console.log("📝 Booking data:");
  console.log(JSON.stringify(bookingData, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/api/booking`, bookingData, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
    });

    console.log("✅ Booking creation successful:");
    console.log(JSON.stringify(response.data, null, 2));

    return response.data.data?.booking?.id;
  } catch (error) {
    console.log("❌ Booking creation error:");
    console.log("Status:", error.response?.status);
    console.log("Response:", JSON.stringify(error.response?.data, null, 2));
    console.log("Message:", error.message);
  }

  return null;
}

async function debugWidgetFiles() {
  console.log("\n🔍 Debugging widget file access...");

  const files = [
    "/public/embed.js",
    "/public/widget-demo.html",
    "/public/wordpress-widget.js",
    "/embed.js",
    "/widget-demo.html",
  ];

  for (const file of files) {
    try {
      const response = await axios.get(`${BASE_URL}${file}`, {
        timeout: 10000,
      });

      console.log(
        `✅ ${file} - Status: ${response.status}, Size: ${response.data.length} chars`
      );
    } catch (error) {
      console.log(
        `❌ ${file} - Status: ${
          error.response?.status || "No response"
        }, Error: ${error.message}`
      );
    }
  }
}

async function debugPublicDirectory() {
  console.log("\n🔍 Checking public directory listing...");

  try {
    const response = await axios.get(`${BASE_URL}/public/`, {
      timeout: 10000,
    });

    console.log("✅ Public directory response:");
    console.log("Status:", response.status);
    console.log("Content type:", response.headers["content-type"]);
    console.log("Response preview:", response.data.substring(0, 500));
  } catch (error) {
    console.log("❌ Public directory error:");
    console.log("Status:", error.response?.status);
    console.log("Error:", error.message);
  }
}

async function testChatBookingFlow() {
  console.log("\n🔍 Testing complete chat booking flow...");

  const sessionId = "test-flow-" + Date.now();

  const messages = [
    "Hello, I would like to book a meeting",
    "John Smith",
    "john.smith@testcompany.com",
    "Test Company LLC",
    "I want to discuss AI automation for our business processes",
    "tomorrow at 2 PM",
    "30 minutes",
    "yes, that looks correct",
  ];

  for (let i = 0; i < messages.length; i++) {
    try {
      console.log(`\n📤 Step ${i + 1}: "${messages[i]}"`);

      const response = await axios.post(
        `${BASE_URL}/api/chat`,
        {
          message: messages[i],
          sessionId: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
        }
      );

      console.log(
        `📥 Response: ${response.data.response.message.substring(0, 150)}...`
      );
      console.log(`   Type: ${response.data.response.type}`);

      if (response.data.response.type === "booking_confirmed") {
        console.log("🎉 Booking confirmed via chat flow!");
        console.log(`   Booking ID: ${response.data.response.bookingId}`);
        break;
      }

      // Add delay between messages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(
        `❌ Step ${i + 1} failed:`,
        error.response?.data || error.message
      );
      break;
    }
  }
}

async function runDebugTests() {
  console.log("🔧 Starting debug tests for Railway deployment issues...\n");

  // Debug availability response format
  const slot = await debugAvailabilityResponse();

  // Debug booking creation with proper slot format
  await debugBookingCreation(slot);

  // Debug widget file access
  await debugWidgetFiles();

  // Debug public directory
  await debugPublicDirectory();

  // Test complete chat booking flow
  await testChatBookingFlow();

  console.log("\n🏁 Debug tests completed.");
}

if (require.main === module) {
  runDebugTests().catch(console.error);
}

module.exports = { runDebugTests };
