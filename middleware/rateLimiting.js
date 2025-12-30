const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

/**
 * Enhanced rate limiting middleware with different limits for different endpoints
 * Implements security controls to prevent abuse and DoS attacks
 */

/**
 * Custom rate limit handler that logs attempts and provides detailed responses
 */
const rateLimitHandler = (req, res) => {
  logger.warn("Rate limit exceeded", {
    ip: req.ip,
    url: req.url,
    method: req.method,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again later",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (req) => {
  // Skip rate limiting for health checks
  if (req.path === "/health" || req.path === "/api/status") {
    return true;
  }

  // Skip for trusted IPs in production (if configured)
  const trustedIPs = process.env.TRUSTED_IPS
    ? process.env.TRUSTED_IPS.split(",")
    : [];
  if (trustedIPs.includes(req.ip)) {
    return true;
  }

  return false;
};

/**
 * General rate limiter for all endpoints
 * 100 requests per 15 minutes per IP
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Strict rate limiter for chat endpoints
 * 30 requests per 5 minutes per IP (to prevent AI API abuse)
 */
const chatRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 chat requests per 5 minutes
  message: "Too many chat requests, please slow down",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use IP + session ID if available for more granular limiting
    const sessionId = req.body?.sessionId || req.query?.sessionId;
    return sessionId ? `${req.ip}:${sessionId}` : req.ip;
  },
});

/**
 * Booking rate limiter
 * 5 booking attempts per hour per IP (prevent spam bookings)
 */
const bookingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 booking attempts per hour
  message: "Too many booking attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use IP + email if available for more accurate limiting
    const email = req.body?.email;
    return email ? `${req.ip}:${email}` : req.ip;
  },
});

/**
 * Voice webhook rate limiter
 * 100 requests per minute (voice webhooks can be frequent during calls)
 */
const voiceWebhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 webhook calls per minute
  message: "Too many voice webhook requests",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use call_id if available for webhook-specific limiting
    const callId = req.body?.call_id;
    return callId ? `webhook:${callId}` : `webhook:${req.ip}`;
  },
});

/**
 * Availability check rate limiter
 * 20 requests per minute per IP (calendar checks can be frequent)
 */
const availabilityRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 availability checks per minute
  message: "Too many availability check requests",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Aggressive rate limiter for suspicious activity
 * Can be applied dynamically based on request patterns
 */
const suspiciousActivityRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // very restrictive limit
  message: "Suspicious activity detected, access temporarily restricted",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error("Suspicious activity rate limit triggered", {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      error: {
        code: "SUSPICIOUS_ACTIVITY",
        message: "Suspicious activity detected, access temporarily restricted",
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Middleware to detect and handle suspicious request patterns
 */
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|into|values)\b)/i,
    // XSS patterns
    /<script[^>]*>.*<\/script>/i,
    /javascript:\s*[^;]+/i,
    /on\w+\s*=\s*["'][^"']*["']/i,
    // Path traversal patterns
    /\.\.\//,
    // Command injection patterns (more specific)
    /[;&|`$]\s*\w+/,
    // More specific patterns to avoid false positives
    /<iframe[^>]*src\s*=/i,
    /eval\s*\(\s*[^)]+\s*\)/i,
  ];

  const requestString = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      logger.warn("Suspicious request pattern detected", {
        ip: req.ip,
        url: req.url,
        method: req.method,
        pattern: pattern.toString(),
        timestamp: new Date().toISOString(),
      });

      // Apply aggressive rate limiting for this IP
      return suspiciousActivityRateLimit(req, res, next);
    }
  }

  next();
};

/**
 * IP-based blocking middleware for known malicious IPs
 */
const ipBlockingMiddleware = (req, res, next) => {
  const blockedIPs = process.env.BLOCKED_IPS
    ? process.env.BLOCKED_IPS.split(",")
    : [];

  if (blockedIPs.includes(req.ip)) {
    logger.warn("Blocked IP attempted access", {
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    return res.status(403).json({
      success: false,
      error: {
        code: "IP_BLOCKED",
        message: "Access denied",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

module.exports = {
  generalRateLimit,
  chatRateLimit,
  bookingRateLimit,
  voiceWebhookRateLimit,
  availabilityRateLimit,
  suspiciousActivityRateLimit,
  suspiciousActivityDetector,
  ipBlockingMiddleware,
};
