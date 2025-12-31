#!/usr/bin/env node

/**
 * Test the fixed booking flow context to ensure conversational booking works
 */

const axios = require("axios");

const BASE_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

async function testBookingFlowFix() {
  console.log("🔧 Testing Fixed Booking Flow Context...\n");

  const sessionId = "booking-flow-test-" + Date.now();

  const conversationSteps = [
    {
      message: "I want to book a meeting to discuss my project",
      expectedType: "booking_flow",
      expectedStep: "name",
      description: "Initial booking request",
    },
    {
      message: "John Smith",
      expectedType: "booking_flow",
      expectedStep: "email",
      description: "Provide name",
    },
    {
      message: "john.smith@testcompany.com",
      expectedType: "booking_flow",
      expectedStep: "company",
      description: "Provide email",
    },
    {
      message: "Test Company LLC",
      expectedType: "booking_flow",
      expectedStep: "inquiry",
      description: "Provide company",
    },
    {
      message: "I need help building a custom web application with AI features",
      expectedType: "booking_flow",
      expectedStep: "dateTime",
      description: "Provide project inquiry",
    },
    {
      message: "tomorrow at 2 PM",
      expectedType: "booking_flow",
      expectedStep: "duration",
      description: "Provide preferred time",
    },
    {
      message: "30 minutes",
      expectedType: "booking_flow",
      expectedStep: "confirmation",
      description: "Provide duration",
    },
    {
      message: "yes, that looks perfect",
      expectedType: "booking_confirmed",
      description: "Confirm booking",
    },
  ];

  let allStepsWorked = true;
  let bookingId = null;

  for (let i = 0; i < conversationSteps.length; i++) {
    const { message, expectedType, expectedStep, description } =
      conversationSteps[i];

    try {
      console.log(`📤 Step ${i + 1}: ${description}`);
      console.log(`   Message: "${message}"`);

      const response = await axios.post(
        `${BASE_URL}/api/chat`,
        {
          message: message,
          sessionId: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          timeout: 30000,
        }
      );

      const responseData = response.data;
      const responseType = responseData.response.type;
      const responseMessage = responseData.response.message;

      console.log(`📥 Response Type: ${responseType}`);
      console.log(`   Message: ${responseMessage.substring(0, 100)}...`);

      // Check if response type matches expected
      if (responseType === expectedType) {
        console.log("   ✅ Correct response type");

        // Check booking flow specific details
        if (responseType === "booking_flow") {
          const actualStep = responseData.response.step;
          console.log(`   📋 Current Step: ${actualStep}`);
          console.log(`   🔄 Complete: ${responseData.response.isComplete}`);

          if (actualStep === expectedStep) {
            console.log("   ✅ Correct booking step");
          } else {
            console.log(
              `   ⚠️  Expected step ${expectedStep}, got ${actualStep}`
            );
            allStepsWorked = false;
          }

          // Show collected data
          if (responseData.response.data) {
            console.log("   📊 Collected Data:");
            Object.entries(responseData.response.data).forEach(
              ([key, value]) => {
                if (value) {
                  console.log(`     ${key}: ${value}`);
                }
              }
            );
          }
        }

        // Check for booking confirmation
        if (responseType === "booking_confirmed") {
          bookingId = responseData.response.bookingId;
          console.log(`   🎉 Booking confirmed! ID: ${bookingId}`);
        }
      } else {
        console.log(`   ❌ Expected ${expectedType}, got ${responseType}`);
        allStepsWorked = false;
      }

      console.log("");

      // Add delay between messages to simulate real conversation
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Step ${i + 1} failed:`);
      console.log(`   Status: ${error.response?.status || "No response"}`);
      console.log(`   Error: ${error.message}`);
      if (error.response?.data) {
        console.log(
          `   Details: ${JSON.stringify(error.response.data, null, 2)}`
        );
      }
      allStepsWorked = false;
      break;
    }
  }

  // Test booking retrieval if we got a booking ID
  if (bookingId) {
    console.log("🔍 Testing booking retrieval...");
    try {
      const bookingResponse = await axios.get(
        `${BASE_URL}/api/booking/${bookingId}`,
        {
          headers: { "X-API-Key": API_KEY },
        }
      );

      console.log("✅ Booking retrieved successfully:");
      const booking = bookingResponse.data.data.booking;
      console.log(`   Name: ${booking.name}`);
      console.log(`   Email: ${booking.email}`);
      console.log(`   Company: ${booking.company}`);
      console.log(`   Inquiry: ${booking.inquiry.substring(0, 50)}...`);
      console.log(`   DateTime: ${booking.dateTime}`);
      console.log(`   Duration: ${booking.duration} minutes`);
      console.log(`   Status: ${booking.status}`);
    } catch (error) {
      console.log("❌ Booking retrieval failed:", error.message);
      allStepsWorked = false;
    }
  }

  // Summary
  console.log("\n📊 BOOKING FLOW TEST RESULTS");
  console.log("================================");

  if (allStepsWorked && bookingId) {
    console.log("🎉 SUCCESS: Complete booking flow working!");
    console.log("✅ Context maintained throughout conversation");
    console.log("✅ All booking steps completed correctly");
    console.log("✅ Booking created and retrievable");
    console.log(`✅ Final booking ID: ${bookingId}`);
  } else if (allStepsWorked) {
    console.log("⚠️  PARTIAL SUCCESS: Flow worked but no booking created");
  } else {
    console.log("❌ FAILED: Booking flow context still has issues");
  }

  return { success: allStepsWorked && !!bookingId, bookingId };
}

async function testSimpleBookingFlow() {
  console.log("\n🔧 Testing Simple Booking Flow (3 steps)...\n");

  const sessionId = "simple-booking-" + Date.now();

  const simpleSteps = [
    "I want to schedule a consultation",
    "My name is Jane Doe",
    "jane.doe@example.com",
  ];

  for (let i = 0; i < simpleSteps.length; i++) {
    try {
      console.log(`📤 Step ${i + 1}: "${simpleSteps[i]}"`);

      const response = await axios.post(
        `${BASE_URL}/api/chat`,
        {
          message: simpleSteps[i],
          sessionId: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
        }
      );

      const responseType = response.data.response.type;
      console.log(`📥 Response Type: ${responseType}`);

      if (responseType === "booking_flow") {
        console.log(`   📋 Step: ${response.data.response.step}`);
        console.log("   ✅ Booking flow maintained");
      } else {
        console.log("   ❌ Lost booking context");
      }

      console.log("");
    } catch (error) {
      console.log(`❌ Step ${i + 1} failed: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log("🚀 Testing Booking Flow Context Fix...\n");

  const fullFlowResult = await testBookingFlowFix();
  await testSimpleBookingFlow();

  console.log("\n🏁 All booking flow tests completed.");

  if (fullFlowResult.success) {
    console.log("\n🎯 CONCLUSION: Booking flow context fix is working!");
    console.log("Users can now complete bookings through conversational chat.");
  } else {
    console.log("\n⚠️  CONCLUSION: Booking flow still needs attention.");
  }

  return fullFlowResult;
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testBookingFlowFix, testSimpleBookingFlow };
