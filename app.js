const express = require("express");
const cors = require("cors");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");
const {
  sanitizeInput,
  validateRequestSize,
} = require("./middleware/validation");
const {
  generalRateLimit,
  suspiciousActivityDetector,
  ipBlockingMiddleware,
} = require("./middleware/rateLimiting");
const {
  securityHeaders,
  requestMonitoring,
  validateOrigin,
  validateContentType,
  requestTimeout,
  securityEventLogger,
} = require("./middleware/security");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set("trust proxy", 1);

// Security headers
app.use(securityHeaders);

// Request monitoring and logging
app.use(requestMonitoring);

// Security event logging
app.use(securityEventLogger);

// IP blocking for known malicious IPs
app.use(ipBlockingMiddleware);

// Suspicious activity detection
app.use(suspiciousActivityDetector);

// General rate limiting
app.use(generalRateLimit);

// Request timeout (30 seconds)
app.use(requestTimeout(30000));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
};
app.use(cors(corsOptions));

// Origin validation for API endpoints
app.use(validateOrigin);

// Content type validation
app.use(validateContentType);

// Request size validation
app.use(validateRequestSize);

// Body parsing middleware with input sanitization
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization (applied after body parsing)
app.use(sanitizeInput);

// Request logging middleware (moved after body parsing for complete request info)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.method !== "GET" ? Object.keys(req.body || {}) : undefined,
    timestamp: new Date().toISOString(),
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API status endpoint
app.get("/api/status", (req, res) => {
  res.status(200).json({
    service: "AI Booking Assistant",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

// Routes will be added here as they are implemented
// app.use('/api/chat', require('./routes/chat'));
// app.use('/api/booking', require('./routes/booking'));
// app.use('/api/voice', require('./routes/voice'));

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`AI Booking Assistant server running on port ${PORT}`, {
      environment: process.env.NODE_ENV || "development",
      port: PORT,
    });
  });
}

module.exports = app;
