#!/usr/bin/env node

/**
 * Simple booking API test
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

// Test availability for January 15th, 2026 (definitely future)
const testDate = "2026-01-15";

console.log(`🔍 Testing Booking Availability for ${testDate}\n`);

const options = {
  hostname: "metabot-ai-production.up.railway.app",
  port: 443,
  path: `/api/booking/availability?date=${testDate}&duration=30`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  },
};

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log("✅ Booking API is working!");
        console.log(`📅 Date: ${response.data.date}`);
        console.log(`⏰ Available slots: ${response.data.totalSlots}`);
        console.log(`🕒 Business hours: ${response.data.businessHours}`);

        if (response.data.availableSlots.length > 0) {
          console.log(
            `🎯 First available slot: ${response.data.availableSlots[0].startTime}`
          );
        }
      } else {
        console.log("❌ Booking API returned an error:");
        console.log(JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.log("❌ Failed to parse response:", data);
    }
  });
});

req.on("error", (error) => {
  console.error(`❌ Request failed: ${error.message}`);
});

req.end();
