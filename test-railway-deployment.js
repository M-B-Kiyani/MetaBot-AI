#!/usr/bin/env node

/**
 * Comprehensive test of the Railway-deployed AI Booking Assistant
 * Tests all major functionality: chat, booking, availability, and integrations
 */

const axios = require("axios");

// Configuration
const BASE_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

// Test data
const testBooking = {
  name: "John Test User",
  email: "john.test@example.com",
  company: "Test Company Inc",
  inquiry: "I would like to discuss AI solutions for my business",
  phone: "+1-555-0123",
};

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        ...headers,
      },
      timeout: 30000,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
      message: error.message,
    };
  }
}

// Test functions
async function testServerStatus() {
  console.log("\n🔍 Testing server status...");

  const result = await makeRequest("GET", "/");

  if (result.success) {
    console.log("✅ Server is running");
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Version: ${result.data.version}`);
    console.log(`   Service: ${result.data.service}`);
    return true;
  } else {
    console.log("❌ Server is not responding");
    console.log(`   Error: ${result.message}`);
    return false;
  }
}

async function testHealthCheck() {
  console.log("\n🏥 Testing health endpoints...");

  const healthResult = await makeRequest("GET", "/health");

  if (healthResult.success) {
    console.log("✅ Health check passed");
    console.log(`   Overall Status: ${healthResult.data.status}`);

    if (healthResult.data.services) {
      console.log("   Service Status:");
      Object.entries(healthResult.data.services).forEach(
        ([service, status]) => {
          console.log(`     ${service}: ${status.status}`);
        }
      );
    }
    return true;
  } else {
    console.log("❌ Health check failed");
    console.log(`   Error: ${healthResult.message}`);
    return false;
  }
}

async function testChatAPI() {
  console.log("\n💬 Testing chat API...");

  // Test basic chat
  const chatResult = await makeRequest("POST", "/api/chat", {
    message: "Hello, what services does Metalogics offer?",
    sessionId: "test-session-" + Date.now(),
  });

  if (chatResult.success && chatResult.data.success) {
    console.log("✅ Chat API working");
    console.log(
      `   Response: ${chatResult.data.response.message.substring(0, 100)}...`
    );
    console.log(`   Type: ${chatResult.data.response.type}`);
    return true;
  } else {
    console.log("❌ Chat API failed");
    console.log(`   Error: ${chatResult.error || chatResult.message}`);
    return false;
  }
}

async function testBookingIntent() {
  console.log("\n📅 Testing booking intent detection...");

  const bookingIntentResult = await makeRequest("POST", "/api/chat", {
    message: "I would like to schedule a meeting to discuss your AI services",
    sessionId: "booking-test-" + Date.now(),
  });

  if (bookingIntentResult.success && bookingIntentResult.data.success) {
    console.log("✅ Booking intent detection working");
    console.log(`   Response Type: ${bookingIntentResult.data.response.type}`);
    console.log(
      `   Message: ${bookingIntentResult.data.response.message.substring(
        0,
        100
      )}...`
    );

    if (bookingIntentResult.data.response.type === "booking_flow") {
      console.log(`   Booking Step: ${bookingIntentResult.data.response.step}`);
      return true;
    }
  }

  console.log("❌ Booking intent detection failed or not triggered");
  return false;
}

async function testAvailabilityAPI() {
  console.log("\n📊 Testing availability API...");

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const availabilityResult = await makeRequest(
    "GET",
    `/api/booking/availability?date=${dateStr}&duration=30`
  );

  if (availabilityResult.success && availabilityResult.data.success) {
    console.log("✅ Availability API working");
    console.log(`   Date: ${availabilityResult.data.data.date}`);
    console.log(
      `   Available Slots: ${availabilityResult.data.data.totalSlots}`
    );

    if (availabilityResult.data.data.availableSlots.length > 0) {
      console.log(
        `   First Slot: ${availabilityResult.data.data.availableSlots[0]}`
      );
      return availabilityResult.data.data.availableSlots[0]; // Return first available slot
    } else {
      console.log("   No available slots (weekend or fully booked)");
      return null;
    }
  } else {
    console.log("❌ Availability API failed");
    console.log(
      `   Error: ${availabilityResult.error || availabilityResult.message}`
    );
    return null;
  }
}

async function testBookingCreation(availableSlot) {
  console.log("\n📝 Testing booking creation...");

  if (!availableSlot) {
    console.log("⚠️  Skipping booking creation - no available slots");
    return false;
  }

  // Create booking data with available slot
  const bookingData = {
    ...testBooking,
    dateTime: availableSlot,
    duration: 30,
  };

  const bookingResult = await makeRequest("POST", "/api/booking", bookingData);

  if (bookingResult.success && bookingResult.data.success) {
    console.log("✅ Booking creation working");
    console.log(`   Booking ID: ${bookingResult.data.data.booking.id}`);
    console.log(`   Status: ${bookingResult.data.data.booking.status}`);
    console.log(
      `   Calendar Integration: ${
        bookingResult.data.data.integrations.calendar.success ? "✅" : "❌"
      }`
    );
    console.log(
      `   HubSpot Integration: ${
        bookingResult.data.data.integrations.hubspot.success ? "✅" : "❌"
      }`
    );

    if (bookingResult.data.data.integrations.calendar.success) {
      console.log(
        `   Calendar Event ID: ${bookingResult.data.data.integrations.calendar.eventId}`
      );
    }

    if (bookingResult.data.data.integrations.hubspot.success) {
      console.log(
        `   HubSpot Contact ID: ${bookingResult.data.data.integrations.hubspot.contactId}`
      );
    }

    return bookingResult.data.data.booking.id;
  } else {
    console.log("❌ Booking creation failed");
    console.log(`   Error: ${bookingResult.error || bookingResult.message}`);
    return false;
  }
}

async function testBookingRetrieval(bookingId) {
  console.log("\n🔍 Testing booking retrieval...");

  if (!bookingId) {
    console.log("⚠️  Skipping booking retrieval - no booking ID");
    return false;
  }

  const retrievalResult = await makeRequest("GET", `/api/booking/${bookingId}`);

  if (retrievalResult.success && retrievalResult.data.success) {
    console.log("✅ Booking retrieval working");
    console.log(
      `   Retrieved Booking: ${retrievalResult.data.data.booking.name}`
    );
    console.log(`   Email: ${retrievalResult.data.data.booking.email}`);
    console.log(`   Status: ${retrievalResult.data.data.booking.status}`);
    return true;
  } else {
    console.log("❌ Booking retrieval failed");
    console.log(
      `   Error: ${retrievalResult.error || retrievalResult.message}`
    );
    return false;
  }
}

async function testWidgetFiles() {
  console.log("\n🎨 Testing widget files...");

  // Test embed.js
  const embedResult = await makeRequest("GET", "/public/embed.js");
  if (embedResult.success) {
    console.log("✅ Embed script accessible");
  } else {
    console.log("❌ Embed script not accessible");
  }

  // Test widget demo
  const demoResult = await makeRequest("GET", "/public/widget-demo.html");
  if (demoResult.success) {
    console.log("✅ Widget demo accessible");
  } else {
    console.log("❌ Widget demo not accessible");
  }

  return embedResult.success && demoResult.success;
}

// Main test runner
async function runAllTests() {
  console.log("🚀 Starting comprehensive Railway deployment test...");
  console.log(`📍 Testing server: ${BASE_URL}`);

  const results = {
    serverStatus: false,
    healthCheck: false,
    chatAPI: false,
    bookingIntent: false,
    availabilityAPI: false,
    bookingCreation: false,
    bookingRetrieval: false,
    widgetFiles: false,
  };

  try {
    // Test server status
    results.serverStatus = await testServerStatus();

    if (!results.serverStatus) {
      console.log("\n❌ Server is not responding. Cannot continue tests.");
      return results;
    }

    // Test health check
    results.healthCheck = await testHealthCheck();

    // Test chat API
    results.chatAPI = await testChatAPI();

    // Test booking intent
    results.bookingIntent = await testBookingIntent();

    // Test availability API
    const availableSlot = await testAvailabilityAPI();
    results.availabilityAPI = !!availableSlot;

    // Test booking creation
    const bookingId = await testBookingCreation(availableSlot);
    results.bookingCreation = !!bookingId;

    // Test booking retrieval
    results.bookingRetrieval = await testBookingRetrieval(bookingId);

    // Test widget files
    results.widgetFiles = await testWidgetFiles();
  } catch (error) {
    console.log(`\n💥 Unexpected error during testing: ${error.message}`);
  }

  // Print summary
  console.log("\n📊 TEST SUMMARY");
  console.log("================");

  const testNames = {
    serverStatus: "Server Status",
    healthCheck: "Health Check",
    chatAPI: "Chat API",
    bookingIntent: "Booking Intent Detection",
    availabilityAPI: "Availability API",
    bookingCreation: "Booking Creation",
    bookingRetrieval: "Booking Retrieval",
    widgetFiles: "Widget Files",
  };

  let passedTests = 0;
  let totalTests = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${testNames[test]}`);
    if (passed) passedTests++;
  });

  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log(
      "🎉 All tests passed! Your booking system is fully functional."
    );
  } else if (passedTests >= totalTests * 0.75) {
    console.log("⚠️  Most tests passed. Some minor issues detected.");
  } else {
    console.log("❌ Multiple issues detected. System needs attention.");
  }

  console.log(`\n🌐 Widget Demo: ${BASE_URL}/public/widget-demo.html`);
  console.log(`📜 Embed Script: ${BASE_URL}/public/embed.js`);

  return results;
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, BASE_URL, API_KEY };
