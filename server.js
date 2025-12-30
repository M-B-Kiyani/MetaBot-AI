#!/usr/bin/env node

/**
 * Server startup script
 * This file is used to start the server in production
 */

// Load environment variables first
require("dotenv").config();

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

// Start server
const server = app.listen(PORT, () => {
  logger.info(`AI Booking Assistant server running on port ${PORT}`, {
    environment: config.get("NODE_ENV", "development"),
    port: PORT,
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = server;
