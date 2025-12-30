/**
 * Production-specific configuration and optimizations
 */

const os = require("os");
const { logger } = require("../utils/logger");

/**
 * Configure production optimizations
 */
function configureProductionOptimizations() {
  // Set production-specific Node.js flags
  if (process.env.NODE_ENV === "production") {
    // Optimize garbage collection for production
    if (!process.env.NODE_OPTIONS) {
      process.env.NODE_OPTIONS = "--max-old-space-size=512 --optimize-for-size";
    }

    // Set production-specific timeouts
    process.env.HEALTH_CHECK_TIMEOUT =
      process.env.HEALTH_CHECK_TIMEOUT || "10000";
    process.env.EXTERNAL_API_TIMEOUT =
      process.env.EXTERNAL_API_TIMEOUT || "15000";

    // Production logging optimizations
    process.env.LOG_LEVEL = process.env.LOG_LEVEL || "warn";

    // Railway-specific optimizations
    if (process.env.RAILWAY_DEPLOYMENT_ID) {
      logger.info(
        "Railway deployment detected, applying Railway optimizations",
        {
          deployment: process.env.RAILWAY_DEPLOYMENT_ID,
          service: process.env.RAILWAY_SERVICE_NAME,
          environment: process.env.RAILWAY_ENVIRONMENT,
        }
      );

      // Railway-specific settings
      process.env.TRUST_PROXY = "true";
      process.env.KEEP_ALIVE_TIMEOUT = "65000"; // Railway load balancer timeout is 60s
    }
  }
}

/**
 * Production health monitoring
 */
function setupProductionMonitoring() {
  if (process.env.NODE_ENV !== "production") return;

  // Monitor memory usage
  const memoryMonitorInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    // Log warning if memory usage is high
    if (memUsedMB > 400) {
      // 400MB threshold
      logger.warn("High memory usage detected", {
        memoryUsed: memUsedMB,
        memoryTotal: memTotalMB,
        memoryLimit: Math.round(os.totalmem() / 1024 / 1024),
      });
    }
  }, 60000); // Check every minute

  // Monitor CPU usage
  let lastCpuUsage = process.cpuUsage();
  const cpuMonitorInterval = setInterval(() => {
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const cpuPercent =
      (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // Convert to seconds

    if (cpuPercent > 0.8) {
      // 80% CPU usage threshold
      logger.warn("High CPU usage detected", {
        cpuUsage: Math.round(cpuPercent * 100),
        loadAverage: os.loadavg(),
      });
    }

    lastCpuUsage = process.cpuUsage();
  }, 60000); // Check every minute

  // Clean up intervals on shutdown
  process.on("SIGTERM", () => {
    clearInterval(memoryMonitorInterval);
    clearInterval(cpuMonitorInterval);
  });

  process.on("SIGINT", () => {
    clearInterval(memoryMonitorInterval);
    clearInterval(cpuMonitorInterval);
  });
}

/**
 * Production error handling
 */
function setupProductionErrorHandling() {
  if (process.env.NODE_ENV !== "production") return;

  // Handle process warnings
  process.on("warning", (warning) => {
    logger.warn("Process warning", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });

  // Handle deprecation warnings
  process.on("deprecation", (deprecation) => {
    logger.warn("Deprecation warning", {
      message: deprecation.message,
      stack: deprecation.stack,
    });
  });
}

/**
 * Railway-specific optimizations
 */
function setupRailwayOptimizations() {
  if (!process.env.RAILWAY_DEPLOYMENT_ID) return;

  // Railway provides these environment variables
  const railwayConfig = {
    deployment: process.env.RAILWAY_DEPLOYMENT_ID,
    service: process.env.RAILWAY_SERVICE_NAME,
    environment: process.env.RAILWAY_ENVIRONMENT,
    region: process.env.RAILWAY_REGION,
    replica: process.env.RAILWAY_REPLICA_ID,
  };

  logger.info("Railway configuration detected", railwayConfig);

  // Set Railway-specific timeouts and limits
  process.env.SERVER_TIMEOUT = process.env.SERVER_TIMEOUT || "30000";
  process.env.KEEP_ALIVE_TIMEOUT = process.env.KEEP_ALIVE_TIMEOUT || "65000";
  process.env.HEADERS_TIMEOUT = process.env.HEADERS_TIMEOUT || "66000";

  return railwayConfig;
}

/**
 * Initialize all production optimizations
 */
function initializeProductionOptimizations() {
  configureProductionOptimizations();
  setupProductionMonitoring();
  setupProductionErrorHandling();

  const railwayConfig = setupRailwayOptimizations();

  if (process.env.NODE_ENV === "production") {
    logger.info("Production optimizations initialized", {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      railway: railwayConfig || false,
    });
  }
}

module.exports = {
  configureProductionOptimizations,
  setupProductionMonitoring,
  setupProductionErrorHandling,
  setupRailwayOptimizations,
  initializeProductionOptimizations,
};
