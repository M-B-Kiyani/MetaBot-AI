const express = require("express");
const os = require("os");
const fs = require("fs").promises;
const path = require("path");
const { logger } = require("../utils/logger");
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
 */
router.get("/", (req, res) => {
  try {
    const healthData = getHealthMetrics();

    logger.info("Health check requested", {
      ip: req.ip,
      uptime: healthData.uptime,
      requestId: req.requestId,
    });

    res.status(200).json(healthData);
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

module.exports = router;
