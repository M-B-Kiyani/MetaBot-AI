#!/usr/bin/env node

/**
 * Railway Environment Variables Setup Script
 * This script helps you set up environment variables in Railway from your env.production file
 */

const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Environment file not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const envVars = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Parse key=value pairs
    const equalIndex = trimmedLine.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    envVars[key] = value;
  }

  return envVars;
}

function generateRailwayCommands(envVars) {
  console.log("# Railway Environment Variables Setup Commands");
  console.log(
    "# Copy and paste these commands in your terminal (with Railway CLI installed)"
  );
  console.log("# Make sure you're in the correct Railway project directory\n");

  const commands = [];

  for (const [key, value] of Object.entries(envVars)) {
    // Escape special characters for shell
    const escapedValue = value.replace(/"/g, '\\"').replace(/\$/g, "\\$");
    const command = `railway variables set ${key}="${escapedValue}"`;
    commands.push(command);
  }

  return commands;
}

function main() {
  const envFilePath = path.join(__dirname, "env.production");

  console.log("Reading environment variables from:", envFilePath);

  try {
    const envVars = parseEnvFile(envFilePath);
    const commands = generateRailwayCommands(envVars);

    console.log(`Found ${Object.keys(envVars).length} environment variables\n`);

    // Output commands
    commands.forEach((command) => {
      console.log(command);
    });

    console.log("\n# Alternative: Set all variables at once");
    console.log(
      "# You can also copy the variables to Railway dashboard manually"
    );
    console.log(
      "# Go to your Railway project > Variables tab and add them there\n"
    );

    // Create a JSON file for easy import
    const jsonOutput = path.join(__dirname, "railway-env-vars.json");
    fs.writeFileSync(jsonOutput, JSON.stringify(envVars, null, 2));
    console.log(`Environment variables also saved to: ${jsonOutput}`);
    console.log(
      "You can use this JSON file to import variables into Railway dashboard\n"
    );
  } catch (error) {
    console.error("Error processing environment file:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseEnvFile, generateRailwayCommands };
