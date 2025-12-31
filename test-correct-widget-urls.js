#!/usr/bin/env node

/**
 * Test the correct widget URLs based on the actual route configuration
 */

const axios = require("axios");

const BASE_URL = "https://metabot-ai-production.up.railway.app";

async function testWidgetUrls() {
  console.log("🔍 Testing correct widget URLs...\n");

  const urlsToTest = [
    { url: "/embed.js", description: "Embed Script" },
    { url: "/widget/demo", description: "Widget Demo Page" },
    { url: "/widget", description: "Widget Base" },
    { url: "/widget.js", description: "Widget JavaScript" },
    { url: "/widget.css", description: "Widget CSS" },
  ];

  for (const { url, description } of urlsToTest) {
    try {
      const response = await axios.get(`${BASE_URL}${url}`, {
        timeout: 10000,
      });

      const contentType = response.headers["content-type"] || "";
      const size = response.data.length;

      console.log(`✅ ${description}`);
      console.log(`   URL: ${BASE_URL}${url}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Size: ${size} characters`);

      // Show preview for JavaScript files
      if (url.endsWith(".js") && size < 5000) {
        console.log(`   Preview: ${response.data.substring(0, 100)}...`);
      }

      console.log("");
    } catch (error) {
      console.log(`❌ ${description}`);
      console.log(`   URL: ${BASE_URL}${url}`);
      console.log(`   Status: ${error.response?.status || "No response"}`);
      console.log(`   Error: ${error.message}`);
      console.log("");
    }
  }
}

async function testChatWithBookingFlow() {
  console.log("🔍 Testing chat booking flow with persistent session...\n");

  const sessionId = "persistent-test-" + Date.now();
  const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

  const conversationFlow = [
    {
      message: "I want to book a meeting",
      expectedType: "booking_flow",
      description: "Initial booking request",
    },
    {
      message: "John Smith",
      expectedType: "booking_flow",
      description: "Provide name",
    },
    {
      message: "john.smith@testcompany.com",
      expectedType: "booking_flow",
      description: "Provide email",
    },
    {
      message: "Test Company LLC",
      expectedType: "booking_flow",
      description: "Provide company",
    },
    {
      message: "I need help with AI automation for our business processes",
      expectedType: "booking_flow",
      description: "Provide inquiry",
    },
  ];

  for (let i = 0; i < conversationFlow.length; i++) {
    const { message, expectedType, description } = conversationFlow[i];

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
        }
      );

      const responseType = response.data.response.type;
      const responseMessage = response.data.response.message;

      console.log(`📥 Response Type: ${responseType}`);
      console.log(`   Message: ${responseMessage.substring(0, 150)}...`);

      if (responseType === expectedType) {
        console.log("   ✅ Expected response type received");
      } else {
        console.log(`   ⚠️  Expected ${expectedType}, got ${responseType}`);
      }

      if (responseType === "booking_flow" && response.data.response.step) {
        console.log(`   📋 Booking Step: ${response.data.response.step}`);
        console.log(`   🔄 Complete: ${response.data.response.isComplete}`);
      }

      console.log("");

      // Add delay between messages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Step ${i + 1} failed:`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${JSON.stringify(error.response?.data, null, 2)}`);
      break;
    }
  }
}

async function runTests() {
  console.log("🚀 Testing corrected widget URLs and booking flow...\n");

  await testWidgetUrls();
  await testChatWithBookingFlow();

  console.log("🏁 All tests completed.");
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWidgetUrls, testChatWithBookingFlow };
