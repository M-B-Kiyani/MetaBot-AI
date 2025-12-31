#!/usr/bin/env node

/**
 * Test booking creation with correct slot format
 */

const axios = require("axios");

const BASE_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

async function testCorrectBookingFormat() {
  console.log("🔧 Testing booking with correct datetime format...");

  // Get availability first
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  try {
    const availResponse = await axios.get(
      `${BASE_URL}/api/booking/availability?date=${dateStr}&duration=30`,
      {
        headers: { "X-API-Key": API_KEY },
      }
    );

    const firstSlot = availResponse.data.data.availableSlots[0];
    console.log("📅 Using slot:", firstSlot);

    // Create booking with startTime from slot
    const bookingData = {
      name: "John Test User",
      email: "john.test@example.com",
      company: "Test Company Inc",
      inquiry: "I would like to discuss AI solutions for my business",
      dateTime: firstSlot.startTime, // Use startTime from the slot
      duration: 30,
      phone: "+1-555-0123",
    };

    console.log("📝 Booking data:");
    console.log(JSON.stringify(bookingData, null, 2));

    const bookingResponse = await axios.post(
      `${BASE_URL}/api/booking`,
      bookingData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log("✅ Booking created successfully!");
    console.log("📋 Booking Details:");
    console.log(`   ID: ${bookingResponse.data.data.booking.id}`);
    console.log(`   Status: ${bookingResponse.data.data.booking.status}`);
    console.log(`   DateTime: ${bookingResponse.data.data.booking.dateTime}`);

    console.log("🔗 Integrations:");
    console.log(
      `   Calendar: ${
        bookingResponse.data.data.integrations.calendar.success
          ? "✅ Success"
          : "❌ Failed"
      }`
    );
    if (bookingResponse.data.data.integrations.calendar.success) {
      console.log(
        `     Event ID: ${bookingResponse.data.data.integrations.calendar.eventId}`
      );
      if (bookingResponse.data.data.integrations.calendar.meetingLink) {
        console.log(
          `     Meeting Link: ${bookingResponse.data.data.integrations.calendar.meetingLink}`
        );
      }
    }

    console.log(
      `   HubSpot: ${
        bookingResponse.data.data.integrations.hubspot.success
          ? "✅ Success"
          : "❌ Failed"
      }`
    );
    if (bookingResponse.data.data.integrations.hubspot.success) {
      console.log(
        `     Contact ID: ${bookingResponse.data.data.integrations.hubspot.contactId}`
      );
    }

    return bookingResponse.data.data.booking.id;
  } catch (error) {
    console.log("❌ Test failed:");
    console.log("Status:", error.response?.status);
    console.log("Error:", JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

async function testBookingRetrieval(bookingId) {
  if (!bookingId) return;

  console.log("\n🔍 Testing booking retrieval...");

  try {
    const response = await axios.get(`${BASE_URL}/api/booking/${bookingId}`, {
      headers: { "X-API-Key": API_KEY },
    });

    console.log("✅ Booking retrieved successfully:");
    console.log(`   Name: ${response.data.data.booking.name}`);
    console.log(`   Email: ${response.data.data.booking.email}`);
    console.log(`   Company: ${response.data.data.booking.company}`);
    console.log(`   DateTime: ${response.data.data.booking.dateTime}`);
    console.log(`   Status: ${response.data.data.booking.status}`);
  } catch (error) {
    console.log("❌ Retrieval failed:", error.response?.data || error.message);
  }
}

async function runTest() {
  console.log("🚀 Testing corrected booking functionality...\n");

  const bookingId = await testCorrectBookingFormat();
  await testBookingRetrieval(bookingId);

  console.log("\n🏁 Test completed.");
}

if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { testCorrectBookingFormat };
