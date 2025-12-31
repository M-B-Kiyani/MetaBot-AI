#!/usr/bin/env node

/**
 * Test booking on a guaranteed weekday
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Testing Weekday Booking\n");

// Create a date that's definitely a Tuesday (day 2)
const testDate = new Date("2026-01-13T14:00:00.000Z"); // Tuesday, Jan 13, 2026 at 2 PM UTC

console.log(`Test Date: ${testDate.toDateString()}`);
console.log(`Day of Week: ${testDate.getDay()} (1=Mon, 2=Tue, etc.)`);
console.log(`UTC Time: ${testDate.toISOString()}`);
console.log(
  `London Time: ${testDate.toLocaleString("en-GB", {
    timeZone: "Europe/London",
  })}`
);
console.log("");

const bookingData = {
  name: "Weekday Test User",
  email: "weekday-test@example.com",
  company: "Weekday Test Company",
  inquiry: "Testing booking on a guaranteed weekday with proper timezone.",
  dateTime: testDate.toISOString(),
  duration: 30,
  phone: "+44 20 1234 5678",
};

const postData = JSON.stringify(bookingData);
const options = {
  hostname: "metabot-ai-production.up.railway.app",
  port: 443,
  path: "/api/booking",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
    "X-API-Key": API_KEY,
  },
};

console.log("📤 Sending booking request...");

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log(`📊 Status: ${res.statusCode}`);

    try {
      const response = JSON.parse(data);
      console.log("📄 Full Response:");
      console.log(JSON.stringify(response, null, 2));

      if (res.statusCode === 201) {
        console.log("\n✅ SUCCESS! Booking created successfully!");
        console.log(`   Booking ID: ${response.data.booking.id}`);
        console.log(`   Status: ${response.data.booking.status}`);
        console.log(`   Date/Time: ${response.data.booking.dateTime}`);
      } else {
        console.log("\n❌ FAILED! Booking creation failed");
        if (response.error && response.error.details) {
          console.log("   Validation errors:");
          response.error.details.forEach((error) => {
            console.log(`   - ${error}`);
          });
        }
      }
    } catch (e) {
      console.log("❌ Could not parse response:", data);
    }
  });
});

req.on("error", (error) => {
  console.error(`❌ Request failed: ${error.message}`);
});

req.write(postData);
req.end();
