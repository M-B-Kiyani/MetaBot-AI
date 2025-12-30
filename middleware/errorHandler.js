const logger = require("../utils/logger");
const {
  AppError,
  ErrorClassifier,
  UserFriendlyErrorMessages,
  ErrorTypes,
} = require("../utils/errorHandler");

/**
 * Enhanced global error handling middleware with user-friendly responses
 * Handles all errors thrown in the application and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Classify the error
  const classifiedError = ErrorClassifier.classify(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Log the error with appropriate level
  const logLevel = classifiedError.statusCode >= 500 ? "error" : "warn";

  logger[logLevel]("Request error", {
    error: classifiedError.message,
    type: classifiedError.type,
    statusCode: classifiedError.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    stack: classifiedError.stack,
    context: classifiedError.context,
  });

  // Generate user-friendly response
  const userFriendlyResponse =
    UserFriendlyErrorMessages.getUserFriendlyResponse(classifiedError);

  // Add additional headers for specific error types
  if (
    classifiedError.type === ErrorTypes.RATE_LIMIT_ERROR &&
    classifiedError.retryAfter
  ) {
    res.set("Retry-After", classifiedError.retryAfter);
  }

  if (classifiedError.type === ErrorTypes.CIRCUIT_BREAKER_ERROR) {
    res.set("X-Service-Status", "degraded");
  }

  // Set appropriate status code and send response
  res.status(classifiedError.statusCode).json(userFriendlyResponse);
};

module.exports = errorHandler;
