#!/usr/bin/env node

/**
 * Server startup script
 * This file is used to start the server in production
 */

// Load environment variables first
require("dotenv").config();

// In production, also try to load from env.production file
if (
  process.env.NODE_ENV === "production" ||
  process.env.RAILWAY_DEPLOYMENT_ID
) {
  const path = require("path");
  const fs = require("fs");

  const prodEnvPath = path.join(__dirname, "env.production");
  if (fs.existsSync(prodEnvPath)) {
    console.log("Loading production environment variables from env.production");
    require("dotenv").config({ path: prodEnvPath });
  }
}

// Initialize production optimizations
const { initializeProductionOptimizations } = require("./config/production");
initializeProductionOptimizations();

// Validate configuration before starting
const { validateConfig, config } = require("./utils/config");
try {
  validateConfig();
} catch (error) {
  console.error("Configuration validation failed:", error.message);
  process.exit(1);
}

const app = require("./app");
const logger = require("./utils/logger");

const PORT = config.get("PORT", 3000);

// Configure server timeouts for production
const serverOptions = {};
if (process.env.NODE_ENV === "production") {
  serverOptions.keepAliveTimeout = parseInt(
    process.env.KEEP_ALIVE_TIMEOUT || "65000"
  );
  serverOptions.headersTimeout = parseInt(
    process.env.HEADERS_TIMEOUT || "66000"
  );
}

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`AI Booking Assistant server running on port ${PORT}`, {
    environment: config.get("NODE_ENV", "development"),
    port: PORT,
    host: "0.0.0.0",
    nodeVersion: process.version,
    platform: process.platform,
    railway: {
      deployment: process.env.RAILWAY_DEPLOYMENT_ID || null,
      service: process.env.RAILWAY_SERVICE_NAME || null,
      environment: process.env.RAILWAY_ENVIRONMENT || null,
    },
  });
});

// Apply server timeout configurations
if (process.env.NODE_ENV === "production") {
  server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT || "65000");
  server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT || "66000");
  server.timeout = parseInt(process.env.SERVER_TIMEOUT || "30000");
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);

  // Set a timeout to force shutdown if graceful shutdown takes too long
  const forceShutdownTimeout = setTimeout(() => {
    logger.error("Graceful shutdown timeout, forcing exit");
    process.exit(1);
  }, 30000); // 30 seconds timeout

  server.close((err) => {
    clearTimeout(forceShutdownTimeout);

    if (err) {
      logger.error("Error during server shutdown", { error: err.message });
      process.exit(1);
    }

    logger.info("Server closed successfully");

    // Close any other resources (database connections, etc.)
    // Add cleanup code here if needed

    process.exit(0);
  });

  // Stop accepting new connections immediately
  server.closeAllConnections?.();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // For nodemon restarts

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason?.message || reason,
    promise: promise.toString(),
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

module.exports = server;
