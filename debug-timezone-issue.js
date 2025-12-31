#!/usr/bin/env node

/**
 * Debug timezone issue in booking creation
 */

const https = require("https");

const API_URL = "https://metabot-ai-production.up.railway.app";
const API_KEY = "wk_ad06e8526e194703c8886e53a7b15ace9a754ad0";

console.log("🔍 Debugging Timezone Issue\n");

async function testDifferentTimes() {
  const testTimes = [
    { name: "10 AM UTC (11 AM London)", utcHour: 10 },
    { name: "12 PM UTC (1 PM London)", utcHour: 12 },
    { name: "2 PM UTC (3 PM London)", utcHour: 14 },
    { name: "4 PM UTC (5 PM London)", utcHour: 16 },
  ];

  for (const timeTest of testTimes) {
    console.log(`Testing: ${timeTest.name}`);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    // Ensure it's a weekday
    while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
      futureDate.setDate(futureDate.getDate() + 1);
    }

    futureDate.setUTCHours(timeTest.utcHour, 0, 0, 0);

    console.log(`   Date: ${futureDate.toDateString()}`);
    console.log(`   UTC: ${futureDate.toISOString()}`);
    console.log(
      `   London: ${futureDate.toLocaleString("en-GB", {
        timeZone: "Europe/London",
      })}`
    );

    const result = await testBooking(futureDate);
    console.log(`   Result: ${result ? "✅ Success" : "❌ Failed"}\n`);
  }
}

async function testBooking(dateTime) {
  return new Promise((resolve) => {
    const bookingData = {
      name: "Timezone Test User",
      email: "timezone-test@example.com",
      company: "Timezone Test Company",
      inquiry: "Testing timezone handling in booking system.",
      dateTime: dateTime.toISOString(),
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

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 201) {
          console.log("   ✅ Booking created successfully!");
          resolve(true);
        } else {
          try {
            const response = JSON.parse(data);
            console.log(
              `   ❌ Failed: ${
                response.error?.details?.[0] ||
                response.error?.message ||
                "Unknown error"
              }`
            );
          } catch (e) {
            console.log(`   ❌ Failed: Status ${res.statusCode}`);
          }
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.log(`   ❌ Network error: ${error.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

testDifferentTimes();
