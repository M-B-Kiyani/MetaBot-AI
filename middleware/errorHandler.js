const logger = require("../utils/logger");

/**
 * Global error handling middleware
 * Handles all errors thrown in the application and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error("Application error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let error = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    },
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    error.error.code = "VALIDATION_ERROR";
    error.error.message = "Invalid input data";
    error.error.details = err.message;
    return res.status(400).json(error);
  }

  if (err.name === "UnauthorizedError") {
    error.error.code = "UNAUTHORIZED";
    error.error.message = "Authentication required";
    return res.status(401).json(error);
  }

  if (err.name === "ForbiddenError") {
    error.error.code = "FORBIDDEN";
    error.error.message = "Access denied";
    return res.status(403).json(error);
  }

  if (err.status === 429) {
    error.error.code = "RATE_LIMIT_EXCEEDED";
    error.error.message = "Too many requests, please try again later";
    return res.status(429).json(error);
  }

  // Handle API integration errors
  if (err.name === "APIError") {
    error.error.code = "EXTERNAL_API_ERROR";
    error.error.message = "External service temporarily unavailable";
    return res.status(503).json(error);
  }

  // Include error details in development mode only
  if (process.env.NODE_ENV === "development") {
    error.error.details = err.message;
    error.error.stack = err.stack;
  }

  // Default 500 response
  res.status(500).json(error);
};

module.exports = errorHandler;
