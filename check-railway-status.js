#!/usr/bin/env node

/**
 * Railway Status Checker
 * Helps diagnose Railway deployment issues
 */

const https = require("https");
const dns = require("dns");

console.log("🔍 Railway Deployment Status Checker");
console.log("=====================================\n");

const domain = "metabot-ai-production.up.railway.app";

// Test 1: DNS Resolution
console.log("📋 Test 1: DNS Resolution");
console.log(`Checking DNS for: ${domain}`);

dns.lookup(domain, (err, address, family) => {
  if (err) {
    console.log(`❌ DNS Resolution Failed: ${err.code}`);
    console.log(`   Error: ${err.message}`);

    if (err.code === "EAI_AGAIN") {
      console.log("\n💡 EAI_AGAIN Error Explanation:");
      console.log("   - This usually means the domain doesn't exist");
      console.log("   - Railway deployment might be down or deleted");
      console.log("   - Domain might have changed");
      console.log("   - Temporary DNS issues");
    }
  } else {
    console.log(`✅ DNS Resolution Successful`);
    console.log(`   IP Address: ${address}`);
    console.log(`   Family: IPv${family}`);
  }

  console.log("\n📋 Test 2: Alternative Domain Check");

  // Test some common Railway domain patterns
  const alternativeDomains = [
    "metabot-ai-production.up.railway.app",
    "metalogics-ai-production.up.railway.app",
    "ai-booking-assistant-production.up.railway.app",
    "booking-assistant-production.up.railway.app",
  ];

  console.log("Testing alternative domain patterns...\n");

  alternativeDomains.forEach((testDomain, index) => {
    setTimeout(() => {
      dns.lookup(testDomain, (err, address) => {
        if (err) {
          console.log(`❌ ${testDomain} - Not found`);
        } else {
          console.log(`✅ ${testDomain} - Found! IP: ${address}`);
        }

        // If this is the last domain, show recommendations
        if (index === alternativeDomains.length - 1) {
          setTimeout(() => {
            console.log("\n🔧 Troubleshooting Recommendations:");
            console.log("=====================================");
            console.log("1. Check Railway Dashboard:");
            console.log("   - Login to https://railway.app");
            console.log("   - Verify your deployment status");
            console.log("   - Check if service is running");
            console.log("");
            console.log("2. Verify Domain Configuration:");
            console.log("   - Check if domain has changed");
            console.log("   - Look for new deployment URLs");
            console.log("");
            console.log("3. Redeploy if necessary:");
            console.log("   - Run: railway up");
            console.log("   - Or use Railway dashboard to redeploy");
            console.log("");
            console.log("4. Check Railway CLI:");
            console.log("   - Run: railway status");
            console.log("   - Run: railway logs");
            console.log("");
            console.log("5. Update configuration files:");
            console.log("   - Update API_BASE_URL in .env.railway");
            console.log("   - Update WIDGET_INSTALLATION.md");
            console.log("   - Update test-connection.js");
          }, 1000);
        }
      });
    }, index * 500); // Stagger the requests
  });
});
