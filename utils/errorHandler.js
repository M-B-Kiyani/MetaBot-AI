const { logger } = require("./logger");

/**
 * Error types for classification
 */
const ErrorTypes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  CIRCUIT_BREAKER_ERROR: "CIRCUIT_BREAKER_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
};

/**
 * Retry configuration for different error types
 */
const RetryConfig = {
  [ErrorTypes.EXTERNAL_API_ERROR]: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  [ErrorTypes.NETWORK_ERROR]: {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },
  [ErrorTypes.TIMEOUT_ERROR]: {
    maxRetries: 2,
    baseDelay: 1500,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  [ErrorTypes.RATE_LIMIT_ERROR]: {
    maxRetries: 5,
    baseDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
  },
};

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(
    message,
    type = ErrorTypes.INTERNAL_ERROR,
    statusCode = 500,
    isOperational = true,
    context = {}
  ) {
    super(message);

    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.type,
        message: this.message,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === "development" && {
          stack: this.stack,
          context: this.context,
        }),
      },
    };
  }
}

/**
 * Specific error classes for different scenarios
 */
class ValidationError extends AppError {
  constructor(message, details = [], context = {}) {
    super(message, ErrorTypes.VALIDATION_ERROR, 400, true, {
      ...context,
      details,
    });
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Authentication required", context = {}) {
    super(message, ErrorTypes.AUTHENTICATION_ERROR, 401, true, context);
  }
}

class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions", context = {}) {
    super(message, ErrorTypes.AUTHORIZATION_ERROR, 403, true, context);
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource", context = {}) {
    super(
      `${resource} not found`,
      ErrorTypes.NOT_FOUND_ERROR,
      404,
      true,
      context
    );
  }
}

class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    retryAfter = null,
    context = {}
  ) {
    super(message, ErrorTypes.RATE_LIMIT_ERROR, 429, true, {
      ...context,
      retryAfter,
    });
    this.retryAfter = retryAfter;
  }
}

class ExternalAPIError extends AppError {
  constructor(service, message, originalError = null, context = {}) {
    super(
      `${service} API error: ${message}`,
      ErrorTypes.EXTERNAL_API_ERROR,
      502,
      true,
      {
        ...context,
        service,
        originalError: originalError?.message,
      }
    );
    this.service = service;
    this.originalError = originalError;
  }
}

class CircuitBreakerError extends AppError {
  constructor(service, context = {}) {
    super(
      `${service} service temporarily unavailable`,
      ErrorTypes.CIRCUIT_BREAKER_ERROR,
      503,
      true,
      {
        ...context,
        service,
      }
    );
    this.service = service;
  }
}

class TimeoutError extends AppError {
  constructor(operation, timeout, context = {}) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      ErrorTypes.TIMEOUT_ERROR,
      504,
      true,
      {
        ...context,
        operation,
        timeout,
      }
    );
    this.operation = operation;
    this.timeout = timeout;
  }
}

class NetworkError extends AppError {
  constructor(message, context = {}) {
    super(
      `Network error: ${message}`,
      ErrorTypes.NETWORK_ERROR,
      502,
      true,
      context
    );
  }
}

class ServiceUnavailableError extends AppError {
  constructor(
    service,
    message = "Service temporarily unavailable",
    context = {}
  ) {
    super(`${service}: ${message}`, ErrorTypes.SERVICE_UNAVAILABLE, 503, true, {
      ...context,
      service,
    });
    this.service = service;
  }
}

/**
 * Error classifier to determine error type from various error sources
 */
class ErrorClassifier {
  /**
   * Classify an error and return appropriate AppError instance
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   * @returns {AppError} - Classified error
   */
  static classify(error, context = {}) {
    // If already an AppError, return as-is
    if (error instanceof AppError) {
      return error;
    }

    // Check for specific error patterns
    if (
      error.code === "ECONNRESET" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      return new NetworkError(error.message, { ...context, code: error.code });
    }

    if (error.code === "ECONNREFUSED") {
      return new ServiceUnavailableError(
        "External service",
        "Connection refused",
        {
          ...context,
          code: error.code,
        }
      );
    }

    // HTTP status code based classification
    if (error.response && error.response.status) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 400:
          return new ValidationError(message, [], context);
        case 401:
          return new AuthenticationError(message, context);
        case 403:
          return new AuthorizationError(message, context);
        case 404:
          return new NotFoundError("Resource", context);
        case 429:
          const retryAfter = error.response.headers?.["retry-after"];
          return new RateLimitError(message, retryAfter, context);
        case 502:
        case 503:
        case 504:
          return new ServiceUnavailableError(
            "External service",
            message,
            context
          );
        default:
          if (status >= 500) {
            return new ExternalAPIError(
              "External service",
              message,
              error,
              context
            );
          }
      }
    }

    // Circuit breaker specific errors
    if (error.circuitBreakerOpen) {
      return new CircuitBreakerError(
        error.service || "Unknown service",
        context
      );
    }

    // Timeout specific errors
    if (error.code === "TIMEOUT" || error.message.includes("timeout")) {
      return new TimeoutError(
        context.operation || "Unknown operation",
        context.timeout || 0,
        context
      );
    }

    // Default to internal error
    return new AppError(error.message, ErrorTypes.INTERNAL_ERROR, 500, true, {
      ...context,
      originalError: error.name,
      stack: error.stack,
    });
  }
}

/**
 * Retry mechanism with exponential backoff
 */
class RetryHandler {
  /**
   * Execute a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} options - Retry options
   * @param {Object} context - Context for logging
   * @returns {Promise} - Function result
   */
  static async executeWithRetry(fn, options = {}, context = {}) {
    const config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryCondition: (error) => RetryHandler.isRetryableError(error),
      ...options,
    };

    let lastError;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const result = await fn();

        if (attempt > 0) {
          logger.info("Retry succeeded", {
            attempt: attempt + 1,
            totalAttempts: config.maxRetries + 1,
            context,
          });
        }

        return result;
      } catch (error) {
        lastError = ErrorClassifier.classify(error, context);
        attempt++;

        // Check if we should retry
        if (attempt > config.maxRetries || !config.retryCondition(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = RetryHandler.calculateDelay(attempt - 1, config);

        logger.warn("Retry attempt failed, retrying...", {
          attempt,
          maxRetries: config.maxRetries,
          delay,
          error: lastError.message,
          errorType: lastError.type,
          context,
        });

        await RetryHandler.sleep(delay);
      }
    }

    // All retries exhausted
    logger.error("All retry attempts failed", {
      totalAttempts: attempt,
      maxRetries: config.maxRetries,
      finalError: lastError.message,
      errorType: lastError.type,
      context,
    });

    throw lastError;
  }

  /**
   * Determine if an error is retryable
   * @param {AppError} error - Error to check
   * @returns {boolean} - True if retryable
   */
  static isRetryableError(error) {
    const retryableTypes = [
      ErrorTypes.EXTERNAL_API_ERROR,
      ErrorTypes.NETWORK_ERROR,
      ErrorTypes.TIMEOUT_ERROR,
      ErrorTypes.RATE_LIMIT_ERROR,
      ErrorTypes.SERVICE_UNAVAILABLE,
    ];

    return retryableTypes.includes(error.type);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt (0-based)
   * @param {Object} config - Retry configuration
   * @returns {number} - Delay in milliseconds
   */
  static calculateDelay(attempt, config) {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * Math.random();

    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after delay
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration for error type
   * @param {string} errorType - Error type
   * @returns {Object} - Retry configuration
   */
  static getRetryConfig(errorType) {
    return RetryConfig[errorType] || RetryConfig[ErrorTypes.EXTERNAL_API_ERROR];
  }
}

/**
 * Graceful degradation handler
 */
class GracefulDegradationHandler {
  constructor() {
    this.fallbackStrategies = new Map();
  }

  /**
   * Register a fallback strategy for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} strategy - Fallback strategy
   */
  registerFallback(serviceName, strategy) {
    this.fallbackStrategies.set(serviceName, strategy);
    logger.info(`Fallback strategy registered for ${serviceName}`);
  }

  /**
   * Execute with graceful degradation
   * @param {string} serviceName - Name of the service
   * @param {string} operation - Operation name
   * @param {Function} primaryFn - Primary function to execute
   * @param {Array} args - Function arguments
   * @param {Object} context - Context for logging
   * @returns {Promise} - Result or fallback result
   */
  async executeWithFallback(
    serviceName,
    operation,
    primaryFn,
    args = [],
    context = {}
  ) {
    try {
      return await primaryFn(...args);
    } catch (error) {
      const classifiedError = ErrorClassifier.classify(error, {
        ...context,
        service: serviceName,
        operation,
      });

      logger.warn("Primary operation failed, attempting fallback", {
        service: serviceName,
        operation,
        error: classifiedError.message,
        errorType: classifiedError.type,
        context,
      });

      // Try fallback strategy
      const fallbackStrategy = this.fallbackStrategies.get(serviceName);
      if (fallbackStrategy && fallbackStrategy[operation]) {
        try {
          const fallbackResult = await fallbackStrategy[operation](...args);

          logger.info("Fallback operation succeeded", {
            service: serviceName,
            operation,
            context,
          });

          return {
            ...fallbackResult,
            _fallbackUsed: true,
            _originalError: classifiedError.message,
          };
        } catch (fallbackError) {
          logger.error("Fallback operation also failed", {
            service: serviceName,
            operation,
            primaryError: classifiedError.message,
            fallbackError: fallbackError.message,
            context,
          });
        }
      }

      // No fallback available or fallback failed
      throw classifiedError;
    }
  }

  /**
   * Get registered fallback strategies
   * @returns {Map} - Map of service names to fallback strategies
   */
  getFallbackStrategies() {
    return new Map(this.fallbackStrategies);
  }
}

/**
 * User-friendly error message generator
 */
class UserFriendlyErrorMessages {
  static getMessages() {
    return {
      [ErrorTypes.VALIDATION_ERROR]: {
        title: "Invalid Input",
        message: "Please check your input and try again.",
        action: "Correct the highlighted fields and resubmit.",
      },
      [ErrorTypes.AUTHENTICATION_ERROR]: {
        title: "Authentication Required",
        message: "You need to be authenticated to access this resource.",
        action: "Please log in and try again.",
      },
      [ErrorTypes.AUTHORIZATION_ERROR]: {
        title: "Access Denied",
        message: "You don't have permission to perform this action.",
        action: "Contact support if you believe this is an error.",
      },
      [ErrorTypes.NOT_FOUND_ERROR]: {
        title: "Not Found",
        message: "The requested resource could not be found.",
        action: "Please check the URL or contact support.",
      },
      [ErrorTypes.RATE_LIMIT_ERROR]: {
        title: "Too Many Requests",
        message: "You've made too many requests. Please slow down.",
        action: "Wait a moment and try again.",
      },
      [ErrorTypes.EXTERNAL_API_ERROR]: {
        title: "Service Temporarily Unavailable",
        message: "We're experiencing issues with an external service.",
        action: "Please try again in a few minutes.",
      },
      [ErrorTypes.CIRCUIT_BREAKER_ERROR]: {
        title: "Service Temporarily Unavailable",
        message:
          "This service is temporarily unavailable due to high error rates.",
        action: "Please try again later.",
      },
      [ErrorTypes.TIMEOUT_ERROR]: {
        title: "Request Timeout",
        message: "The request took too long to complete.",
        action: "Please try again.",
      },
      [ErrorTypes.NETWORK_ERROR]: {
        title: "Connection Problem",
        message: "We're having trouble connecting to our services.",
        action: "Please check your connection and try again.",
      },
      [ErrorTypes.SERVICE_UNAVAILABLE]: {
        title: "Service Unavailable",
        message: "This service is temporarily unavailable.",
        action: "Please try again later.",
      },
      [ErrorTypes.INTERNAL_ERROR]: {
        title: "Something Went Wrong",
        message: "We encountered an unexpected error.",
        action: "Please try again or contact support if the problem persists.",
      },
    };
  }

  /**
   * Get user-friendly error response
   * @param {AppError} error - Application error
   * @returns {Object} - User-friendly error response
   */
  static getUserFriendlyResponse(error) {
    const messages = UserFriendlyErrorMessages.getMessages();
    const errorInfo =
      messages[error.type] || messages[ErrorTypes.INTERNAL_ERROR];

    return {
      success: false,
      error: {
        code: error.type,
        title: errorInfo.title,
        message: errorInfo.message,
        action: errorInfo.action,
        timestamp: error.timestamp,
        ...(error.type === ErrorTypes.VALIDATION_ERROR &&
          error.details && {
            details: error.details,
          }),
        ...(error.type === ErrorTypes.RATE_LIMIT_ERROR &&
          error.retryAfter && {
            retryAfter: error.retryAfter,
          }),
      },
    };
  }
}

// Create singleton instances
const gracefulDegradationHandler = new GracefulDegradationHandler();

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalAPIError,
  CircuitBreakerError,
  TimeoutError,
  NetworkError,
  ServiceUnavailableError,

  // Utilities
  ErrorTypes,
  ErrorClassifier,
  RetryHandler,
  GracefulDegradationHandler,
  UserFriendlyErrorMessages,

  // Singleton instances
  gracefulDegradationHandler,

  // Configuration
  RetryConfig,
};
