const express = require("express");
const os = require("os");
const fs = require("fs").promises;
const path = require("path");
const { logger } = require("../utils/logger");
const { serviceManager } = require("../services/serviceManager");
const {
  getHealthMetrics,
  getDetailedHealth,
} = require("../middleware/monitoring");

const router = express.Router();

// Service health status cache
let serviceHealthCache = {
  lastCheck: null,
  results: {},
  ttl: 30000, // 30 seconds cache
};

/**
 * GET /health
 * Basic health check endpoint with monitoring metrics
 * Optimized for Railway platform health checks
 */
router.get("/", (req, res) => {
  try {
    const healthData = getHealthMetrics();

    // Railway-specific optimizations
    const railwayHealth = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: healthData.uptime,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      // Railway uses this for health checks
      railway: {
        deployment: process.env.RAILWAY_DEPLOYMENT_ID || "unknown",
        service: process.env.RAILWAY_SERVICE_NAME || "ai-booking-assistant",
        environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV,
      },
      // Essential metrics for Railway monitoring
      metrics: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          limit: Math.round(os.totalmem() / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAverage: os.loadavg()[0],
        },
        uptime: process.uptime(),
      },
    };

    // Log health check in production with minimal details
    if (process.env.NODE_ENV === "production") {
      logger.info("Health check", {
        status: "healthy",
        uptime: railwayHealth.uptime,
        memory: railwayHealth.metrics.memory.used,
      });
    } else {
      logger.info("Health check requested", {
        ip: req.ip,
        uptime: healthData.uptime,
        requestId: req.requestId,
      });
    }

    res.status(200).json(railwayHealth);
  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
      ip: req.ip,
      requestId: req.requestId,
    });

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      railway: {
        deployment: process.env.RAILWAY_DEPLOYMENT_ID || "unknown",
        service: process.env.RAILWAY_SERVICE_NAME || "ai-booking-assistant",
      },
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with system information and monitoring data
 */
router.get("/detailed", async (req, res) => {
  try {
    const detailedHealth = getDetailedHealth();

    // Add additional system information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      hostname: os.hostname(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
    };

    const healthData = {
      ...detailedHealth,
      system: {
        ...detailedHealth.metrics.system,
        ...systemInfo,
      },
      dependencies: await checkDependencyHealth(),
    };

    logger.info("Detailed health check requested", {
      ip: req.ip,
      memoryUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptime: healthData.uptime,
      requestId: req.requestId,
    });

    res.status(200).json(healthData);
  } catch (error) {
    logger.error("Detailed health check failed", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      requestId: req.requestId,
    });

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Detailed health check failed",
      message: error.message,
    });
  }
});

/**
 * GET /health/services
 * Check health of external service dependencies
 */
router.get("/services", async (req, res) => {
  try {
    // Check if we have cached results that are still valid
    const now = Date.now();
    if (
      serviceHealthCache.lastCheck &&
      now - serviceHealthCache.lastCheck < serviceHealthCache.ttl
    ) {
      logger.info("Returning cached service health results", {
        ip: req.ip,
        cacheAge: now - serviceHealthCache.lastCheck,
      });

      return res.json({
        status: "cached",
        timestamp: new Date().toISOString(),
        lastCheck: new Date(serviceHealthCache.lastCheck).toISOString(),
        services: serviceHealthCache.results,
      });
    }

    // Perform fresh health checks
    const serviceChecks = await Promise.allSettled([
      checkGeminiAPIHealth(),
      checkHubSpotAPIHealth(),
      checkGoogleCalendarAPIHealth(),
      checkRetellAPIHealth(),
    ]);

    const services = {
      gemini:
        serviceChecks[0].status === "fulfilled"
          ? serviceChecks[0].value
          : { status: "error", error: serviceChecks[0].reason?.message },
      hubspot:
        serviceChecks[1].status === "fulfilled"
          ? serviceChecks[1].value
          : { status: "error", error: serviceChecks[1].reason?.message },
      googleCalendar:
        serviceChecks[2].status === "fulfilled"
          ? serviceChecks[2].value
          : { status: "error", error: serviceChecks[2].reason?.message },
      retell:
        serviceChecks[3].status === "fulfilled"
          ? serviceChecks[3].value
          : { status: "error", error: serviceChecks[3].reason?.message },
    };

    // Update cache
    serviceHealthCache.lastCheck = now;
    serviceHealthCache.results = services;

    // Determine overall status
    const allHealthy = Object.values(services).every(
      (service) =>
        service.status === "healthy" || service.status === "not_configured"
    );

    logger.info("Service health check completed", {
      ip: req.ip,
      overallStatus: allHealthy ? "healthy" : "degraded",
      services: Object.keys(services).map((key) => ({
        name: key,
        status: services[key].status,
      })),
    });

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services,
    });
  } catch (error) {
    logger.error("Service health check failed", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Service health check failed",
      message: error.message,
    });
  }
});

/**
 * GET /health/readiness
 * Kubernetes/Railway readiness probe
 */
router.get("/readiness", async (req, res) => {
  try {
    // Check if essential services are ready
    const readinessChecks = {
      server: true, // If we're responding, server is ready
      environment: checkEnvironmentVariables(),
      filesystem: await checkFilesystemAccess(),
    };

    const isReady = Object.values(readinessChecks).every(
      (check) => check === true
    );

    if (isReady) {
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: readinessChecks,
      });
    } else {
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks: readinessChecks,
      });
    }
  } catch (error) {
    logger.error("Readiness check failed", {
      error: error.message,
      ip: req.ip,
    });

    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/liveness
 * Kubernetes/Railway liveness probe
 */
router.get("/liveness", (req, res) => {
  try {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error("Liveness check failed", {
      error: error.message,
      ip: req.ip,
    });

    res.status(503).json({
      status: "dead",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Check dependency health (package.json dependencies)
 */
async function checkDependencyHealth() {
  try {
    const packagePath = path.join(process.cwd(), "package.json");
    const packageData = await fs.readFile(packagePath, "utf8");
    const packageJson = JSON.parse(packageData);

    return {
      status: "healthy",
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length,
      nodeVersion: process.version,
      packageVersion: packageJson.version,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Check Gemini API health
 */
async function checkGeminiAPIHealth() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        status: "not_configured",
        message: "Gemini API key not configured",
      };
    }

    // We can't easily test the Gemini API without making a real request
    // So we'll just check if the key is configured
    return {
      status: "healthy",
      message: "Gemini API key configured",
      configured: true,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Check HubSpot API health
 */
async function checkHubSpotAPIHealth() {
  try {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      return {
        status: "not_configured",
        message: "HubSpot access token not configured",
      };
    }

    return {
      status: "healthy",
      message: "HubSpot access token configured",
      configured: true,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Check Google Calendar API health
 */
async function checkGoogleCalendarAPIHealth() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return {
        status: "not_configured",
        message: "Google service account key not configured",
      };
    }

    return {
      status: "healthy",
      message: "Google service account key configured",
      configured: true,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Check Retell API health
 */
async function checkRetellAPIHealth() {
  try {
    if (!process.env.RETELL_API_KEY) {
      return {
        status: "not_configured",
        message: "Retell API key not configured",
      };
    }

    return {
      status: "healthy",
      message: "Retell API key configured",
      configured: true,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Check essential environment variables
 */
function checkEnvironmentVariables() {
  const requiredEnvVars = ["NODE_ENV", "PORT"];

  const optionalEnvVars = [
    "GEMINI_API_KEY",
    "HUBSPOT_ACCESS_TOKEN",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "RETELL_API_KEY",
    "CORS_ORIGINS",
  ];

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    logger.warn("Missing required environment variables", { missing });
    return false;
  }

  return true;
}

/**
 * Check filesystem access
 */
async function checkFilesystemAccess() {
  try {
    // Check if we can read the knowledge base directory
    const knowledgeDir = path.join(process.cwd(), "metalogicsRAG");
    await fs.access(knowledgeDir, fs.constants.R_OK);

    // Check if we can write to a temp file
    const tempFile = path.join(process.cwd(), ".health-check-temp");
    await fs.writeFile(tempFile, "health check", "utf8");
    await fs.unlink(tempFile);

    return true;
  } catch (error) {
    logger.warn("Filesystem access check failed", { error: error.message });
    return false;
  }
}

/**
 * GET /health/system
 * Comprehensive system health including circuit breakers and service manager status
 */
router.get("/system", async (req, res) => {
  try {
    // Get system health from service manager
    const systemHealth = serviceManager.getSystemHealth();

    // Get detailed health metrics
    const detailedHealth = getDetailedHealth();

    // Combine all health information
    const comprehensiveHealth = {
      status: systemHealth.overallHealth >= 80 ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      overallHealth: systemHealth.overallHealth,
      serviceManager: {
        initialized: systemHealth.initialized,
        services: systemHealth.services,
        circuitBreakers: systemHealth.circuitBreakers,
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          limit: Math.round(os.totalmem() / 1024 / 1024),
          usage: Math.round(
            (process.memoryUsage().heapUsed / os.totalmem()) * 100
          ),
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAverage: os.loadavg()[0],
        },
        platform: os.platform(),
        nodeVersion: process.version,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        railway: {
          deployment: process.env.RAILWAY_DEPLOYMENT_ID || null,
          service: process.env.RAILWAY_SERVICE_NAME || null,
          environment: process.env.RAILWAY_ENVIRONMENT || null,
        },
      },
      degradationStatus: {
        circuitBreakersOpen: Object.values(systemHealth.circuitBreakers).filter(
          (cb) => cb.state === "OPEN"
        ).length,
        servicesUnhealthy: Object.values(systemHealth.services).filter(
          (service) => !service.healthy
        ).length,
        fallbacksActive: Object.values(systemHealth.circuitBreakers).some(
          (cb) => cb.state !== "CLOSED"
        ),
      },
    };

    // Log system health check
    logger.info("System health check", {
      overallHealth: comprehensiveHealth.overallHealth,
      circuitBreakersOpen:
        comprehensiveHealth.degradationStatus.circuitBreakersOpen,
      servicesUnhealthy:
        comprehensiveHealth.degradationStatus.servicesUnhealthy,
      ip: req.ip,
    });

    const statusCode = comprehensiveHealth.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(comprehensiveHealth);
  } catch (error) {
    logger.error("System health check failed", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "System health check failed",
      message: error.message,
    });
  }
});

/**
 * POST /health/circuit-breaker/:service/reset
 * Reset a circuit breaker for a specific service
 */
router.post("/circuit-breaker/:service/reset", (req, res) => {
  try {
    const { service } = req.params;

    // Reset the circuit breaker
    serviceManager.resetCircuitBreaker(service);

    logger.info("Circuit breaker reset", {
      service,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({
      success: true,
      message: `Circuit breaker for ${service} has been reset`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Circuit breaker reset failed", {
      service: req.params.service,
      error: error.message,
      ip: req.ip,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
router.get("/startup", async (req, res) => {
  try {
    // Check if all essential services are initialized
    const startupChecks = {
      server: true, // If we're responding, server is started
      environment: checkEnvironmentVariables(),
      filesystem: await checkFilesystemAccess(),
      dependencies: await checkDependencyHealth(),
      // Check if critical services are configured (not necessarily healthy)
      services: {
        gemini: !!process.env.GEMINI_API_KEY,
        hubspot: !!process.env.HUBSPOT_API_KEY,
        calendar: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        retell: !!process.env.RETELL_API_KEY,
      },
    };

    const isStarted =
      startupChecks.server &&
      startupChecks.environment &&
      startupChecks.filesystem &&
      startupChecks.dependencies.status === "healthy";

    const status = isStarted ? 200 : 503;

    res.status(status).json({
      status: isStarted ? "started" : "starting",
      timestamp: new Date().toISOString(),
      checks: startupChecks,
      railway: {
        deployment: process.env.RAILWAY_DEPLOYMENT_ID || "unknown",
        service: process.env.RAILWAY_SERVICE_NAME || "ai-booking-assistant",
        environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV,
      },
    });
  } catch (error) {
    logger.error("Startup check failed", {
      error: error.message,
      ip: req.ip,
    });

    res.status(503).json({
      status: "failed",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
