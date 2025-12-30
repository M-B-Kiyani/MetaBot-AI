const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Validate configuration before starting the application
const { validateConfig, config } = require("./utils/config");
try {
  validateConfig();
} catch (error) {
  console.error("Configuration validation failed:", error.message);
  process.exit(1);
}

// Initialize service manager
const { serviceManager } = require("./services/serviceManager");

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
const { logger, requestLogger } = require("./utils/logger");
const {
  performanceMonitoring,
  errorTracking,
} = require("./middleware/monitoring");

const app = express();
const PORT = config.get("PORT", 3000);

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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    const allowedOrigins = (
      config.get("CORS_ORIGINS") ||
      config.get("ALLOWED_ORIGINS") ||
      "http://localhost:3000"
    ).split(",");

    // For widget embedding, allow all origins in development
    if (config.isDevelopment()) {
      return callback(null, true);
    }

    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // For widget routes, be more permissive
    if (
      origin &&
      (origin.includes("localhost") || origin.includes("127.0.0.1"))
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "X-Widget-Origin",
  ],
};
app.use(cors(corsOptions));

// Origin validation for API endpoints
app.use(validateOrigin);

// Content type validation
app.use(validateContentType);

// Request size validation
app.use(validateRequestSize);

// Serve static files for widget
app.use("/widget.css", express.static("public/widget.css"));
app.use("/widget.js", express.static("public/widget.js"));
app.use("/embed.js", express.static("public/embed.js"));

// Body parsing middleware with input sanitization
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization (applied after body parsing)
app.use(sanitizeInput);

// Enhanced request logging middleware
app.use(requestLogger);

// Performance monitoring
app.use(performanceMonitoring);

// API status endpoint (keep for backward compatibility)
app.get("/api/status", (req, res) => {
  res.status(200).json({
    service: "AI Booking Assistant",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint with API information
app.get("/", (req, res) => {
  res.status(200).json({
    service: "AI Booking Assistant",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      detailedHealth: "/health/detailed",
      chat: "/api/chat",
      booking: "/api/booking",
      voice: "/api/voice/webhook",
      status: "/api/status",
    },
  });
});

// API Routes - Initialize after service manager is ready
app.use(
  "/api/chat",
  (req, res, next) => {
    if (!serviceManager.initialized) {
      return res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Services are initializing, please try again shortly",
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  },
  require("./routes/chat")
);

app.use(
  "/api/booking",
  (req, res, next) => {
    if (!serviceManager.initialized) {
      return res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Services are initializing, please try again shortly",
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  },
  require("./routes/booking")
);

app.use(
  "/api/voice",
  (req, res, next) => {
    if (!serviceManager.initialized) {
      return res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Services are initializing, please try again shortly",
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  },
  require("./routes/voice")
);

// Widget routes
app.use("/widget", require("./routes/widget"));

// Health and monitoring routes
app.use("/health", require("./routes/health"));

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
app.use(errorTracking);
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    // Shutdown service manager
    await serviceManager.shutdown();
    logger.info("Service manager shutdown completed");
  } catch (error) {
    logger.error("Error during service manager shutdown", {
      error: error.message,
    });
  }

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Initialize services and start server
async function startServer() {
  try {
    // Initialize service manager
    logger.info("Initializing service manager...");
    await serviceManager.initialize();
    logger.info("Service manager initialized successfully");

    // Only start server if this file is run directly (not imported for testing)
    if (require.main === module) {
      app.listen(PORT, () => {
        logger.info(`AI Booking Assistant server running on port ${PORT}`, {
          environment: config.get("NODE_ENV", "development"),
          port: PORT,
          servicesInitialized: serviceManager.initialized,
        });
      });
    }
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
