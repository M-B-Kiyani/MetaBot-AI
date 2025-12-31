#!/usr/bin/env node

/**
 * Debug booking creation issue
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Debugging Booking Creation Issue\n");

async function testBookingCreation() {
  // Create a booking for a weekday in business hours (London time)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // Next week

  // Ensure it's a weekday (Monday = 1, Friday = 5)
  while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
    futureDate.setDate(futureDate.getDate() + 1);
  }

  // Set to 2 PM London time (14:00)
  futureDate.setUTCHours(14, 0, 0, 0);

  const bookingData = {
    name: "Test User",
    email: "test@example.com",
    company: "Test Company Ltd",
    inquiry:
      "I would like to discuss your AI services and potential collaboration opportunities.",
    dateTime: futureDate.toISOString(),
    duration: 30,
    phone: "+44 20 1234 5678",
  };

  console.log("📅 Booking Details:");
  console.log(`   Date: ${futureDate.toDateString()}`);
  console.log(`   Time: ${futureDate.toTimeString()}`);
  console.log(`   UTC: ${futureDate.toISOString()}`);
  console.log(`   Day of week: ${futureDate.getDay()} (1=Mon, 5=Fri)`);
  console.log(`   Duration: ${bookingData.duration} minutes`);
  console.log("");

  return new Promise((resolve) => {
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
            console.log("\n✅ Booking created successfully!");
            console.log(`   Booking ID: ${response.data.booking.id}`);
            console.log(`   Status: ${response.data.booking.status}`);
          } else {
            console.log("\n❌ Booking creation failed");
            if (response.error && response.error.details) {
              console.log("   Validation errors:");
              response.error.details.forEach((error) => {
                console.log(`   - ${error.msg} (${error.path})`);
              });
            }
          }
        } catch (e) {
          console.log("❌ Could not parse response:", data);
        }
        resolve();
      });
    });

    req.on("error", (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

testBookingCreation();
