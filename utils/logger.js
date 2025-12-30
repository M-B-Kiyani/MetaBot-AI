const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logDir = process.env.LOG_FILE_PATH || "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to winston
winston.addColors(colors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;

    // Add stack trace for errors
    if (info.stack) {
      message += `\n${info.stack}`;
    }

    // Add metadata if present
    const metadata = { ...info };
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.message;
    delete metadata.stack;

    if (Object.keys(metadata).length > 0) {
      message += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    return message;
  })
);

// Custom format for production (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Ensure sensitive data is not logged
    const sanitized = { ...info };

    // Remove or redact sensitive fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.apiKey) sanitized.apiKey = "[REDACTED]";
    if (sanitized.token) sanitized.token = "[REDACTED]";
    if (sanitized.authorization) sanitized.authorization = "[REDACTED]";

    return JSON.stringify(sanitized);
  })
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || "info",
    format:
      process.env.NODE_ENV === "production"
        ? productionFormat
        : developmentFormat,
  }),
];

// Add file transports for production and when LOG_FILE_PATH is set
if (process.env.NODE_ENV === "production" || process.env.LOG_FILE_PATH) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: productionFormat,
      maxsize: process.env.LOG_MAX_SIZE || 20971520, // 20MB
      maxFiles: process.env.LOG_MAX_FILES || 5,
      tailable: true,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: productionFormat,
      maxsize: process.env.LOG_MAX_SIZE || 20971520, // 20MB
      maxFiles: process.env.LOG_MAX_FILES || 5,
      tailable: true,
    })
  );

  // HTTP requests log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "requests.log"),
      level: "http",
      format: productionFormat,
      maxsize: process.env.LOG_MAX_SIZE || 20971520, // 20MB
      maxFiles: process.env.LOG_MAX_FILES || 5,
      tailable: true,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format: winston.format.json(),
  transports,
  exitOnError: false,
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.log"),
      format: productionFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
      format: productionFormat,
    }),
  ],
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentLength: req.get("Content-Length"),
    referer: req.get("Referer"),
    timestamp: new Date().toISOString(),
    requestId:
      req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  });

  // Store request ID for correlation
  req.requestId =
    req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "warn" : "http";

    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: duration,
      contentLength: res.get("Content-Length"),
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

// Error logging helper
const logError = (error, context = {}) => {
  logger.error(error.message || "Unknown error", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Security event logging helper
const logSecurityEvent = (event, details = {}) => {
  logger.warn(`Security Event: ${event}`, {
    securityEvent: event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

// API call logging helper
const logApiCall = (service, method, url, duration, success, error = null) => {
  const level = success ? "info" : "error";
  logger.log(level, `API Call: ${service} ${method} ${url}`, {
    service,
    method,
    url,
    duration,
    success,
    error: error
      ? {
          message: error.message,
          code: error.code,
          status: error.status,
        }
      : null,
    timestamp: new Date().toISOString(),
  });
};

// Performance monitoring helper
const logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 5000 ? "warn" : "info"; // Warn if operation takes more than 5 seconds
  logger.log(level, `Performance: ${operation}`, {
    operation,
    duration,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

// Business event logging helper
const logBusinessEvent = (event, data = {}) => {
  logger.info(`Business Event: ${event}`, {
    businessEvent: event,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  logger,
  requestLogger,
  logError,
  logSecurityEvent,
  logApiCall,
  logPerformance,
  logBusinessEvent,
  // Backward compatibility
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger),
  http: logger.http.bind(logger),
};
