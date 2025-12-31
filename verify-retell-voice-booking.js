const axios = require("axios");

// Configuration
const BASE_URL =
  process.env.BASE_URL || "https://metabot-ai-production.up.railway.app";
const TEST_TIMEOUT = 30000; // 30 seconds

console.log("🎯 Starting Retell Voice Booking Verification");
console.log(`📍 Testing against: ${BASE_URL}`);

// Test scenarios for voice booking
const testScenarios = [
  {
    name: "Basic Booking Request",
    message: "I want to book an appointment for tomorrow at 2 PM",
    expectedKeywords: ["booking", "appointment", "tomorrow", "2 PM"],
  },
  {
    name: "Specific Date Booking",
    message: "Can I schedule a meeting for January 15th at 10:30 AM?",
    expectedKeywords: ["schedule", "meeting", "January 15", "10:30"],
  },
  {
    name: "Availability Check",
    message: "What times are available next week?",
    expectedKeywords: ["available", "times", "next week"],
  },
  {
    name: "Booking Modification",
    message: "I need to reschedule my appointment to Friday",
    expectedKeywords: ["reschedule", "appointment", "Friday"],
  },
];

// Helper function to test chat API
async function testChatAPI(message, scenario) {
  try {
    console.log(`\n🧪 Testing: ${scenario}`);
    console.log(`💬 Message: "${message}"`);

    const response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: message,
        sessionId: `test-session-${Date.now()}`,
        isVoice: true, // Indicate this is a voice interaction
      },
      {
        timeout: TEST_TIMEOUT,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Retell-Voice-Test/1.0",
        },
      }
    );

    if (response.status === 200) {
      console.log("✅ API Response received");
      console.log(`📊 Status: ${response.status}`);
      console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      return { success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(
        `📝 Response: ${JSON.stringify(error.response.data, null, 2)}`
      );
    }
    return { success: false, error: error.message };
  }
}

// Test booking API directly
async function testBookingAPI() {
  try {
    console.log("\n🧪 Testing Booking API directly");

    const bookingData = {
      date: "2025-01-15",
      time: "14:00",
      duration: 60,
      customerName: "Test User",
      customerEmail: "test@example.com",
      service: "Consultation",
    };

    const response = await axios.post(`${BASE_URL}/api/bookings`, bookingData, {
      timeout: TEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Booking API Response received");
    console.log(`📊 Status: ${response.status}`);
    console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ Booking API Error: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(
        `📝 Response: ${JSON.stringify(error.response.data, null, 2)}`
      );
    }
    return { success: false, error: error.message };
  }
}

// Test calendar availability
async function testCalendarAvailability() {
  try {
    console.log("\n🧪 Testing Calendar Availability");

    const response = await axios.get(`${BASE_URL}/api/calendar/availability`, {
      params: {
        date: "2025-01-15",
        duration: 60,
      },
      timeout: TEST_TIMEOUT,
    });

    console.log("✅ Calendar API Response received");
    console.log(`📊 Status: ${response.status}`);
    console.log(
      `📝 Available slots: ${JSON.stringify(response.data, null, 2)}`
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ Calendar API Error: ${error.message}`);
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(
        `📝 Response: ${JSON.stringify(error.response.data, null, 2)}`
      );
    }
    return { success: false, error: error.message };
  }
}

// Main test function
async function runVoiceBookingTests() {
  console.log("\n🚀 Starting comprehensive voice booking tests...\n");

  const results = {
    chatTests: [],
    bookingTest: null,
    calendarTest: null,
    totalTests: 0,
    passedTests: 0,
  };

  // Test chat API with voice scenarios
  for (const scenario of testScenarios) {
    const result = await testChatAPI(scenario.message, scenario.name);
    results.chatTests.push({
      scenario: scenario.name,
      success: result.success,
      data: result.data,
      error: result.error,
    });
    results.totalTests++;
    if (result.success) results.passedTests++;

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Test booking API
  const bookingResult = await testBookingAPI();
  results.bookingTest = bookingResult;
  results.totalTests++;
  if (bookingResult.success) results.passedTests++;

  // Test calendar availability
  const calendarResult = await testCalendarAvailability();
  results.calendarTest = calendarResult;
  results.totalTests++;
  if (calendarResult.success) results.passedTests++;

  // Print summary
  console.log("\n📊 TEST SUMMARY");
  console.log("================");
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passedTests}`);
  console.log(`Failed: ${results.totalTests - results.passedTests}`);
  console.log(
    `Success Rate: ${((results.passedTests / results.totalTests) * 100).toFixed(
      1
    )}%`
  );

  // Detailed results
  console.log("\n📋 DETAILED RESULTS");
  console.log("===================");

  results.chatTests.forEach((test, index) => {
    const status = test.success ? "✅" : "❌";
    console.log(`${status} Chat Test ${index + 1}: ${test.scenario}`);
    if (!test.success) {
      console.log(`   Error: ${test.error}`);
    }
  });

  const bookingStatus = results.bookingTest.success ? "✅" : "❌";
  console.log(`${bookingStatus} Booking API Test`);
  if (!results.bookingTest.success) {
    console.log(`   Error: ${results.bookingTest.error}`);
  }

  const calendarStatus = results.calendarTest.success ? "✅" : "❌";
  console.log(`${calendarStatus} Calendar API Test`);
  if (!results.calendarTest.success) {
    console.log(`   Error: ${results.calendarTest.error}`);
  }

  // Final verdict
  const overallSuccess = results.passedTests === results.totalTests;
  console.log(
    `\n🎯 OVERALL RESULT: ${
      overallSuccess ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"
    }`
  );

  if (overallSuccess) {
    console.log("🎉 Retell voice booking system is fully operational!");
  } else {
    console.log(
      "⚠️  Some issues detected. Please review the failed tests above."
    );
  }

  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runVoiceBookingTests()
    .then((results) => {
      process.exit(results.passedTests === results.totalTests ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test execution failed:", error);
      process.exit(1);
    });
}

module.exports = {
  runVoiceBookingTests,
  testChatAPI,
  testBookingAPI,
  testCalendarAvailability,
};
