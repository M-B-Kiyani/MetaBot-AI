const {
  logPerformance,
  logError,
  logSecurityEvent,
} = require("../utils/logger");

/**
 * Monitoring middleware for tracking application performance and health
 */

// Track application metrics
const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    averageResponseTime: 0,
  },
  errors: {
    total: 0,
    byType: {},
    recent: [],
  },
  security: {
    blockedRequests: 0,
    suspiciousActivity: 0,
    rateLimitHits: 0,
  },
  startTime: Date.now(),
};

/**
 * Performance monitoring middleware
 * Tracks request performance and logs slow requests
 */
const performanceMonitoring = (req, res, next) => {
  const start = Date.now();

  // Track total requests
  metrics.requests.total++;

  res.on("finish", () => {
    const duration = Date.now() - start;

    // Update metrics
    if (res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.errors++;
    }

    // Update average response time (simple moving average)
    metrics.requests.averageResponseTime =
      (metrics.requests.averageResponseTime * (metrics.requests.total - 1) +
        duration) /
      metrics.requests.total;

    // Log slow requests
    if (duration > 5000) {
      // 5 seconds
      logPerformance(
        `Slow Request: ${req.method} ${req.originalUrl}`,
        duration,
        {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.requestId,
        }
      );
    }

    // Log very slow requests as warnings
    if (duration > 10000) {
      // 10 seconds
      logSecurityEvent("Very Slow Request", {
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
        ip: req.ip,
        requestId: req.requestId,
      });
    }
  });

  next();
};

/**
 * Error tracking middleware
 * Tracks and categorizes application errors
 */
const errorTracking = (error, req, res, next) => {
  // Update error metrics
  metrics.errors.total++;

  const errorType = error.name || "UnknownError";
  metrics.errors.byType[errorType] =
    (metrics.errors.byType[errorType] || 0) + 1;

  // Keep recent errors (last 100)
  metrics.errors.recent.unshift({
    type: errorType,
    message: error.message,
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    requestId: req.requestId,
  });

  if (metrics.errors.recent.length > 100) {
    metrics.errors.recent = metrics.errors.recent.slice(0, 100);
  }

  // Log the error with context
  logError(error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId: req.requestId,
    body: req.method !== "GET" ? req.body : undefined,
  });

  next(error);
};

/**
 * Security event tracking
 * Tracks security-related events and suspicious activity
 */
const securityEventTracking = {
  recordBlockedRequest: (reason, req) => {
    metrics.security.blockedRequests++;
    logSecurityEvent("Blocked Request", {
      reason,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });
  },

  recordSuspiciousActivity: (activity, req, details = {}) => {
    metrics.security.suspiciousActivity++;
    logSecurityEvent("Suspicious Activity", {
      activity,
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get("User-Agent"),
      ...details,
    });
  },

  recordRateLimitHit: (req, limit) => {
    metrics.security.rateLimitHits++;
    logSecurityEvent("Rate Limit Hit", {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      limit,
      userAgent: req.get("User-Agent"),
    });
  },
};

/**
 * Health check data provider
 * Provides application health and metrics data
 */
const getHealthMetrics = () => {
  const uptime = Date.now() - metrics.startTime;
  const memoryUsage = process.memoryUsage();

  return {
    status: "healthy",
    uptime: uptime,
    uptimeHuman: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    metrics: {
      requests: {
        total: metrics.requests.total,
        success: metrics.requests.success,
        errors: metrics.requests.errors,
        successRate:
          metrics.requests.total > 0
            ? (
                (metrics.requests.success / metrics.requests.total) *
                100
              ).toFixed(2) + "%"
            : "0%",
        averageResponseTime:
          Math.round(metrics.requests.averageResponseTime) + "ms",
      },
      errors: {
        total: metrics.errors.total,
        byType: metrics.errors.byType,
        recentCount: metrics.errors.recent.length,
      },
      security: {
        blockedRequests: metrics.security.blockedRequests,
        suspiciousActivity: metrics.security.suspiciousActivity,
        rateLimitHits: metrics.security.rateLimitHits,
      },
      system: {
        memoryUsage: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external),
        },
        cpuUsage: process.cpuUsage(),
      },
    },
  };
};

/**
 * Get detailed health information including recent errors
 */
const getDetailedHealth = () => {
  const health = getHealthMetrics();

  return {
    ...health,
    recentErrors: metrics.errors.recent.slice(0, 10), // Last 10 errors
    alerts: generateHealthAlerts(),
  };
};

/**
 * Generate health alerts based on metrics
 */
const generateHealthAlerts = () => {
  const alerts = [];

  // High error rate alert
  if (metrics.requests.total > 100) {
    const errorRate = (metrics.requests.errors / metrics.requests.total) * 100;
    if (errorRate > 10) {
      alerts.push({
        level: "warning",
        message: `High error rate: ${errorRate.toFixed(2)}%`,
        metric: "error_rate",
        value: errorRate,
      });
    }
  }

  // Slow response time alert
  if (metrics.requests.averageResponseTime > 5000) {
    alerts.push({
      level: "warning",
      message: `Slow average response time: ${Math.round(
        metrics.requests.averageResponseTime
      )}ms`,
      metric: "response_time",
      value: metrics.requests.averageResponseTime,
    });
  }

  // High memory usage alert
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent =
    (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (memoryUsagePercent > 80) {
    alerts.push({
      level: "warning",
      message: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      metric: "memory_usage",
      value: memoryUsagePercent,
    });
  }

  // Security alerts
  if (metrics.security.blockedRequests > 100) {
    alerts.push({
      level: "warning",
      message: `High number of blocked requests: ${metrics.security.blockedRequests}`,
      metric: "blocked_requests",
      value: metrics.security.blockedRequests,
    });
  }

  return alerts;
};

/**
 * Format uptime in human readable format
 */
const formatUptime = (uptime) => {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format bytes in human readable format
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

module.exports = {
  performanceMonitoring,
  errorTracking,
  securityEventTracking,
  getHealthMetrics,
  getDetailedHealth,
  metrics, // Export for testing
};
