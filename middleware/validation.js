const { body, query, param, validationResult } = require("express-validator");
const logger = require("../utils/logger");

/**
 * Input sanitization and validation middleware
 * Provides comprehensive validation for all API endpoints
 */

/**
 * Middleware to handle validation results
 * Returns formatted error response if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    logger.warn("Validation failed", {
      url: req.url,
      method: req.method,
      ip: req.ip,
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    });

    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: formattedErrors,
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Common validation rules for reuse across endpoints
 */
const commonValidations = {
  // Email validation with sanitization
  email: body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail()
    .trim()
    .escape(),

  // Name validation (first name, last name, company name)
  name: (fieldName) =>
    body(fieldName)
      .isLength({ min: 1, max: 100 })
      .withMessage(`${fieldName} must be between 1 and 100 characters`)
      .trim()
      .escape()
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage(
        `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`
      ),

  // Company name validation (more flexible than personal names)
  companyName: body("company")
    .isLength({ min: 1, max: 200 })
    .withMessage("Company name must be between 1 and 200 characters")
    .trim()
    .escape()
    .matches(/^[a-zA-Z0-9\s\-'\.&,()]+$/)
    .withMessage("Company name contains invalid characters"),

  // Message/inquiry validation
  message: (fieldName) =>
    body(fieldName)
      .isLength({ min: 1, max: 2000 })
      .withMessage(`${fieldName} must be between 1 and 2000 characters`)
      .trim()
      .escape(),

  // Date/time validation
  dateTime: body("dateTime")
    .isISO8601()
    .withMessage("Date must be in valid ISO 8601 format")
    .toDate()
    .custom((value) => {
      const now = new Date();
      const inputDate = new Date(value);

      // Must be in the future
      if (inputDate <= now) {
        throw new Error("Date must be in the future");
      }

      // Must be within reasonable booking window (e.g., 6 months)
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      if (inputDate > sixMonthsFromNow) {
        throw new Error("Date must be within 6 months from now");
      }

      return true;
    }),

  // Duration validation (15, 30, 45, 60 minutes only)
  duration: body("duration")
    .isInt({ min: 15, max: 60 })
    .withMessage("Duration must be a number between 15 and 60")
    .custom((value) => {
      const validDurations = [15, 30, 45, 60];
      if (!validDurations.includes(parseInt(value))) {
        throw new Error("Duration must be 15, 30, 45, or 60 minutes");
      }
      return true;
    }),

  // Phone number validation (optional)
  phone: body("phone")
    .optional()
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Must be a valid phone number")
    .trim(),

  // Session ID validation for conversation context
  sessionId: body("sessionId")
    .optional()
    .isUUID()
    .withMessage("Session ID must be a valid UUID"),

  // Generic text input sanitization
  sanitizeText: (fieldName) =>
    body(fieldName).trim().escape().blacklist("<>\"'&"),
};

/**
 * Validation rules for chat endpoint
 */
const validateChatInput = [
  body("message")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be between 1 and 1000 characters")
    .trim()
    .escape()
    .blacklist("<>\"'&")
    .custom((value) => {
      // Prevent potential injection patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /expression\s*\(/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          throw new Error("Message contains potentially malicious content");
        }
      }
      return true;
    }),

  commonValidations.sessionId,

  // Context validation (optional array of previous messages)
  body("context")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Context must be an array with maximum 10 items"),

  body("context.*.role")
    .optional()
    .isIn(["user", "assistant"])
    .withMessage("Context role must be 'user' or 'assistant'"),

  body("context.*.content")
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Context content must be between 1 and 1000 characters")
    .trim()
    .escape(),

  handleValidationErrors,
];

/**
 * Validation rules for booking endpoint
 */
const validateBookingInput = [
  commonValidations.name("name"),
  commonValidations.email,
  commonValidations.companyName,
  commonValidations.message("inquiry"),
  commonValidations.dateTime,
  commonValidations.duration,
  commonValidations.phone,
  commonValidations.sessionId,

  handleValidationErrors,
];

/**
 * Validation rules for voice webhook endpoint
 */
const validateVoiceWebhook = [
  body("call_id")
    .isLength({ min: 1, max: 100 })
    .withMessage("Call ID is required")
    .trim()
    .escape(),

  body("transcript")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Transcript too long")
    .trim()
    .escape(),

  body("call_status")
    .optional()
    .isIn(["in_progress", "completed", "failed"])
    .withMessage("Invalid call status"),

  handleValidationErrors,
];

/**
 * Validation rules for availability check
 */
const validateAvailabilityCheck = [
  query("date")
    .isISO8601()
    .withMessage("Date must be in valid ISO 8601 format")
    .toDate()
    .custom((value) => {
      const now = new Date();
      const inputDate = new Date(value);

      if (inputDate < now) {
        throw new Error("Date cannot be in the past");
      }

      return true;
    }),

  query("duration")
    .optional()
    .isInt({ min: 15, max: 60 })
    .withMessage("Duration must be between 15 and 60 minutes")
    .custom((value) => {
      if (value) {
        const validDurations = [15, 30, 45, 60];
        if (!validDurations.includes(parseInt(value))) {
          throw new Error("Duration must be 15, 30, 45, or 60 minutes");
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * General input sanitization middleware
 * Applies to all requests to prevent common injection attacks
 */
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize all string values in request body
  const sanitizeObject = (obj) => {
    if (typeof obj === "string") {
      // Remove potentially dangerous characters and patterns
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/eval\s*\(/gi, "")
        .replace(/expression\s*\(/gi, "")
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Request size validation middleware
 */
const validateRequestSize = (req, res, next) => {
  const contentLength = req.get("content-length");

  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    // 10MB limit
    return res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request payload too large",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

module.exports = {
  validateChatInput,
  validateBookingInput,
  validateVoiceWebhook,
  validateAvailabilityCheck,
  sanitizeInput,
  validateRequestSize,
  handleValidationErrors,
  commonValidations,
};
