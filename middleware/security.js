const helmet = require("helmet");
const logger = require("../utils/logger");

/**
 * Comprehensive security middleware
 * Implements various security controls and monitoring
 */

/**
 * Enhanced helmet configuration for security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for widget functionality
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resources to be loaded by other origins
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Request logging and monitoring middleware
 */
const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentType: req.get("Content-Type"),
    contentLength: req.get("Content-Length"),
    timestamp: new Date().toISOString(),
  });

  // Monitor response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    // Log slow requests
    if (duration > 5000) {
      // 5 seconds
      logger.warn("Slow request detected", {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    }

    originalSend.call(this, data);
  };

  next();
};

/**
 * API key validation middleware for protected endpoints
 */
const validateApiKey = (req, res, next) => {
  // Skip API key validation for public endpoints
  const publicEndpoints = ["/health", "/api/status"];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  const apiKey = req.get("X-API-Key") || req.query.apiKey;
  const validApiKeys = process.env.API_KEYS
    ? process.env.API_KEYS.split(",")
    : [];

  // If no API keys are configured, skip validation (development mode)
  if (validApiKeys.length === 0 && process.env.NODE_ENV === "development") {
    return next();
  }

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    logger.warn("Invalid or missing API key", {
      ip: req.ip,
      url: req.url,
      method: req.method,
      providedKey: apiKey ? "***" : "none",
      timestamp: new Date().toISOString(),
    });

    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Valid API key required",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Request origin validation for widget endpoints
 */
const validateOrigin = (req, res, next) => {
  // Skip origin validation for non-widget endpoints
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  const origin = req.get("Origin") || req.get("Referer");
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"];

  // Allow requests without origin (direct API calls, mobile apps, etc.)
  if (!origin) {
    return next();
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === "*") return true;
    if (allowedOrigin.endsWith("*")) {
      const baseOrigin = allowedOrigin.slice(0, -1);
      return origin.startsWith(baseOrigin);
    }
    return origin === allowedOrigin;
  });

  if (!isAllowed) {
    logger.warn("Request from unauthorized origin", {
      origin,
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ORIGIN",
        message: "Request from unauthorized origin",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Content type validation middleware
 */
const validateContentType = (req, res, next) => {
  // Skip validation for GET requests and health checks
  if (
    req.method === "GET" ||
    req.path === "/health" ||
    req.path === "/api/status" ||
    req.path.startsWith("/widget") ||
    req.path === "/test" ||
    req.path.endsWith(".html") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".css")
  ) {
    return next();
  }

  const contentType = req.get("Content-Type");
  const allowedTypes = [
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
  ];

  if (
    !contentType ||
    !allowedTypes.some((type) => contentType.includes(type))
  ) {
    logger.warn("Invalid content type", {
      contentType,
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    return res.status(415).json({
      success: false,
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn("Request timeout", {
          method: req.method,
          url: req.url,
          ip: req.ip,
          timeout: `${timeoutMs}ms`,
          timestamp: new Date().toISOString(),
        });

        res.status(408).json({
          success: false,
          error: {
            code: "REQUEST_TIMEOUT",
            message: "Request timeout",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }, timeoutMs);

    res.on("finish", () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Security event logging middleware
 */
const securityEventLogger = (req, res, next) => {
  // Log security-relevant events
  const securityEvents = [];

  // Check for potential security issues
  if (req.get("User-Agent") && req.get("User-Agent").includes("bot")) {
    securityEvents.push("bot_user_agent");
  }

  if (req.url.includes("..") || req.url.includes("%2e%2e")) {
    securityEvents.push("path_traversal_attempt");
  }

  if (req.get("X-Forwarded-For")) {
    securityEvents.push("proxied_request");
  }

  if (securityEvents.length > 0) {
    logger.info("Security events detected", {
      events: securityEvents,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  requestMonitoring,
  validateApiKey,
  validateOrigin,
  validateContentType,
  requestTimeout,
  securityEventLogger,
};
