const logger = require("../utils/logger");

/**
 * Widget authentication middleware
 * Validates widget requests and provides secure communication
 */

// Simple API key validation for widget requests
const validateWidgetApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;

  // If no API key is provided, allow the request but mark it as unauthenticated
  if (!apiKey) {
    req.widgetAuth = {
      authenticated: false,
      source: "public",
    };
    return next();
  }

  // Validate API key format (basic validation)
  if (typeof apiKey !== "string" || apiKey.length < 10) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_API_KEY",
        message: "Invalid API key format",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Check against allowed widget API keys
  const allowedKeys = process.env.WIDGET_API_KEYS
    ? process.env.WIDGET_API_KEYS.split(",")
    : [];

  const isValidKey = allowedKeys.includes(apiKey);

  if (!isValidKey && process.env.NODE_ENV === "production") {
    logger.warn("Invalid widget API key attempted", {
      keyPrefix: apiKey.substring(0, 8) + "...",
      ip: req.ip,
      origin: req.headers.origin,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid API key",
        timestamp: new Date().toISOString(),
      },
    });
  }

  req.widgetAuth = {
    authenticated: true,
    apiKey: apiKey,
    source: "widget",
  };

  logger.info("Widget API key validated", {
    authenticated: true,
    keyPrefix: apiKey.substring(0, 8) + "...",
    ip: req.ip,
  });

  next();
};

// Rate limiting specifically for widget requests
const widgetRateLimit = (req, res, next) => {
  // More lenient rate limiting for authenticated widget requests
  if (req.widgetAuth && req.widgetAuth.authenticated) {
    // Authenticated widgets get higher limits
    const authLimit =
      parseInt(process.env.WIDGET_RATE_LIMIT_AUTHENTICATED) || 200;
    req.rateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: authLimit,
      message: "Too many requests from this widget",
    };
  } else {
    // Unauthenticated requests get standard limits
    const publicLimit = parseInt(process.env.WIDGET_RATE_LIMIT_PUBLIC) || 50;
    req.rateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: publicLimit,
      message: "Too many requests from this IP",
    };
  }

  next();
};

// Widget origin validation
const validateWidgetOrigin = (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  const widgetOrigin = req.headers["x-widget-origin"];

  // Log widget usage for analytics
  if (origin || widgetOrigin) {
    logger.info("Widget request received", {
      origin: origin,
      widgetOrigin: widgetOrigin,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      authenticated: req.widgetAuth?.authenticated || false,
    });
  }

  // Store origin information for potential filtering
  req.widgetOrigin = {
    origin: origin,
    widgetOrigin: widgetOrigin,
    timestamp: new Date().toISOString(),
  };

  next();
};

// Security headers for widget responses
const widgetSecurityHeaders = (req, res, next) => {
  // Allow embedding in iframes for widget functionality
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Content Security Policy for widget
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https:; " +
      "font-src 'self' https:;"
  );

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  next();
};

// Widget request logging
const logWidgetRequest = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info("Widget API request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    authenticated: req.widgetAuth?.authenticated || false,
    origin: req.headers.origin,
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info("Widget API response", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      ip: req.ip,
    });
  });

  next();
};

// Combined widget middleware
const widgetMiddleware = [
  validateWidgetApiKey,
  widgetRateLimit,
  validateWidgetOrigin,
  widgetSecurityHeaders,
  logWidgetRequest,
];

module.exports = {
  validateWidgetApiKey,
  widgetRateLimit,
  validateWidgetOrigin,
  widgetSecurityHeaders,
  logWidgetRequest,
  widgetMiddleware,
};
