#!/usr/bin/env node

/**
 * Server startup script
 * This file is used to start the server in production
 */

const app = require("./app");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`AI Booking Assistant server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || "development",
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
