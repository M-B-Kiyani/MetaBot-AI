#!/usr/bin/env node

/**
 * Railway Environment Setup Script
 * Sets up all required environment variables for Railway deployment
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up Railway Environment Variables...\n");

// Read environment variables from env.production
const envProductionPath = path.join(__dirname, "env.production");

if (!fs.existsSync(envProductionPath)) {
  console.error("❌ env.production file not found!");
  console.log(
    "Please ensure env.production exists with all required variables."
  );
  process.exit(1);
}

const envContent = fs.readFileSync(envProductionPath, "utf8");
const envVars = {};

// Parse environment variables
envContent.split("\n").forEach((line) => {
  line = line.trim();
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      let value = valueParts.join("=");
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
});

console.log(`📋 Found ${Object.keys(envVars).length} environment variables\n`);

// Critical variables that must be set
const criticalVars = [
  "NODE_ENV",
  "GEMINI_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "GOOGLE_CALENDAR_ID",
  "HUBSPOT_ACCESS_TOKEN",
  "API_KEY",
  "PUBLIC_WIDGET_KEY",
];

// Check for critical variables
const missingCritical = criticalVars.filter(
  (key) => !envVars[key] || envVars[key] === ""
);
if (missingCritical.length > 0) {
  console.warn("⚠️  Missing critical variables:");
  missingCritical.forEach((key) => console.log(`   - ${key}`));
  console.log("\nContinuing with available variables...\n");
}

// Set variables in Railway
let successCount = 0;
let errorCount = 0;

for (const [key, value] of Object.entries(envVars)) {
  if (!value || value === "") {
    console.log(`⏭️  Skipping empty variable: ${key}`);
    continue;
  }

  try {
    console.log(`📝 Setting ${key}...`);

    // Escape special characters for shell
    const escapedValue = value.replace(/"/g, '\\"');
    const command = `railway variables --set "${key}=${escapedValue}"`;

    execSync(command, { stdio: "pipe" });
    successCount++;
  } catch (error) {
    console.error(`❌ Failed to set ${key}: ${error.message}`);
    errorCount++;
  }
}

console.log("\n📊 Summary:");
console.log(`✅ Successfully set: ${successCount} variables`);
console.log(`❌ Failed to set: ${errorCount} variables`);

if (successCount > 0) {
  console.log("\n🎯 Next Steps:");
  console.log("1. Deploy your application: railway up");
  console.log("2. Check deployment status: railway status");
  console.log("3. View logs: railway logs");
  console.log("4. Get your new domain from Railway dashboard");
}
