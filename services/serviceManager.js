const AIService = require("./aiService");
const BookingService = require("./bookingService");
const CalendarService = require("./calendarService");
const LeadManager = require("./leadManager");
const VoiceHandler = require("./voiceHandler");
const { logger } = require("../utils/logger");
const {
  ErrorClassifier,
  RetryHandler,
  gracefulDegradationHandler,
  ExternalAPIError,
  ServiceUnavailableError,
  CircuitBreakerError,
  ErrorTypes,
} = require("../utils/errorHandler");

/**
 * Circuit breaker states
 */
const CircuitBreakerState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

/**
 * Circuit breaker implementation for external API calls
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute

    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.successCount = 0;
    this.totalRequests = 0;

    // Statistics for monitoring
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      averageResponseTime: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {Object} context - Context for logging
   * @returns {Promise} - Result of function execution
   */
  async execute(fn, context = {}) {
    this.stats.totalRequests++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new CircuitBreakerError(this.name, {
          ...context,
          nextAttempt: this.nextAttempt,
          failureCount: this.failureCount,
        });

        logger.warn("Circuit breaker blocked request", {
          service: this.name,
          state: this.state,
          nextAttempt: this.nextAttempt,
          context,
        });
        throw error;
      } else {
        // Transition to half-open
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info("Circuit breaker transitioning to HALF_OPEN", {
          service: this.name,
          context,
        });
      }
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      const responseTime = Date.now() - startTime;

      // Update statistics
      this.stats.totalSuccesses++;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.totalSuccesses - 1) +
          responseTime) /
        this.stats.totalSuccesses;

      this.onSuccess();

      logger.debug("Circuit breaker request succeeded", {
        service: this.name,
        state: this.state,
        responseTime,
        context,
      });

      return result;
    } catch (error) {
      this.stats.totalFailures++;

      // Classify the error for better handling
      const classifiedError = ErrorClassifier.classify(error, {
        ...context,
        service: this.name,
      });

      this.onFailure();

      logger.error("Circuit breaker request failed", {
        service: this.name,
        state: this.state,
        error: classifiedError.message,
        errorType: classifiedError.type,
        failureCount: this.failureCount,
        context,
      });

      throw classifiedError;
    }
  }

  /**
   * Handle successful request
   */
  onSuccess() {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      logger.info("Circuit breaker transitioned to CLOSED", {
        service: this.name,
        successCount: this.successCount,
      });
    }
  }

  /**
   * Handle failed request
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;

      logger.error("Circuit breaker opened", {
        service: this.name,
        failureCount: this.failureCount,
        failureThreshold: this.failureThreshold,
        nextAttempt: this.nextAttempt,
      });
    }
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      stats: { ...this.stats },
      healthPercentage:
        this.stats.totalRequests > 0
          ? Math.round(
              (this.stats.totalSuccesses / this.stats.totalRequests) * 100
            )
          : 100,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.successCount = 0;

    logger.info("Circuit breaker manually reset", {
      service: this.name,
    });
  }
}

/**
 * Service manager with dependency injection and circuit breaker patterns
 */
class ServiceManager {
  constructor() {
    this.services = new Map();
    this.circuitBreakers = new Map();
    this.initialized = false;
    this.initializationPromise = null;

    // Service health status
    this.serviceHealth = new Map();

    // Graceful degradation handlers
    this.fallbackHandlers = new Map();

    logger.info("ServiceManager created");
  }

  /**
   * Initialize all services with dependency injection
   * @returns {Promise} - Initialization promise
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual service initialization
   * @private
   */
  async _performInitialization() {
    try {
      logger.info("Initializing services...");

      // Initialize circuit breakers for external services
      this.circuitBreakers.set(
        "gemini",
        new CircuitBreaker("gemini", {
          failureThreshold: 3,
          resetTimeout: 30000,
        })
      );

      this.circuitBreakers.set(
        "hubspot",
        new CircuitBreaker("hubspot", {
          failureThreshold: 5,
          resetTimeout: 60000,
        })
      );

      this.circuitBreakers.set(
        "calendar",
        new CircuitBreaker("calendar", {
          failureThreshold: 3,
          resetTimeout: 45000,
        })
      );

      this.circuitBreakers.set(
        "retell",
        new CircuitBreaker("retell", {
          failureThreshold: 3,
          resetTimeout: 30000,
        })
      );

      // Initialize core services
      await this._initializeAIService();
      await this._initializeBookingService();
      await this._initializeCalendarService();
      await this._initializeLeadManager();
      await this._initializeVoiceHandler();

      // Set up fallback handlers
      this._setupFallbackHandlers();

      // Perform health checks
      await this._performInitialHealthChecks();

      this.initialized = true;
      logger.info("All services initialized successfully");
    } catch (error) {
      logger.error("Service initialization failed", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Initialize AI Service
   * @private
   */
  async _initializeAIService() {
    try {
      const aiService = new AIService();

      // Wrap AI service methods with circuit breaker
      const originalGenerateResponse =
        aiService.generateResponse.bind(aiService);
      aiService.generateResponse = async (message, sessionId) => {
        const circuitBreaker = this.circuitBreakers.get("gemini");
        return circuitBreaker.execute(
          () => originalGenerateResponse(message, sessionId),
          { operation: "generateResponse", sessionId }
        );
      };

      const originalIsBookingIntent = aiService.isBookingIntent.bind(aiService);
      aiService.isBookingIntent = async (message) => {
        const circuitBreaker = this.circuitBreakers.get("gemini");
        return circuitBreaker.execute(() => originalIsBookingIntent(message), {
          operation: "isBookingIntent",
        });
      };

      const originalExtractBookingInfo =
        aiService.extractBookingInfo.bind(aiService);
      aiService.extractBookingInfo = async (message, currentInfo) => {
        const circuitBreaker = this.circuitBreakers.get("gemini");
        return circuitBreaker.execute(
          () => originalExtractBookingInfo(message, currentInfo),
          { operation: "extractBookingInfo" }
        );
      };

      this.services.set("aiService", aiService);
      this.serviceHealth.set("aiService", {
        healthy: true,
        lastCheck: new Date(),
      });

      logger.info("AI Service initialized with circuit breaker protection");
    } catch (error) {
      logger.error("Failed to initialize AI Service", { error: error.message });
      this.serviceHealth.set("aiService", {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      });
      throw error;
    }
  }

  /**
   * Initialize Booking Service
   * @private
   */
  async _initializeBookingService() {
    try {
      const bookingService = new BookingService();
      this.services.set("bookingService", bookingService);
      this.serviceHealth.set("bookingService", {
        healthy: true,
        lastCheck: new Date(),
      });

      logger.info("Booking Service initialized");
    } catch (error) {
      logger.error("Failed to initialize Booking Service", {
        error: error.message,
      });
      this.serviceHealth.set("bookingService", {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      });
      throw error;
    }
  }

  /**
   * Initialize Calendar Service
   * @private
   */
  async _initializeCalendarService() {
    try {
      const calendarService = new CalendarService();

      // Initialize authentication
      await calendarService.initializeAuth();

      // Wrap calendar service methods with circuit breaker
      const originalCreateEvent =
        calendarService.createEvent.bind(calendarService);
      calendarService.createEvent = async (eventData) => {
        const circuitBreaker = this.circuitBreakers.get("calendar");
        return circuitBreaker.execute(() => originalCreateEvent(eventData), {
          operation: "createEvent",
          email: eventData.email,
        });
      };

      const originalCheckAvailability =
        calendarService.checkAvailability.bind(calendarService);
      calendarService.checkAvailability = async (startTime, endTime) => {
        const circuitBreaker = this.circuitBreakers.get("calendar");
        return circuitBreaker.execute(
          () => originalCheckAvailability(startTime, endTime),
          { operation: "checkAvailability" }
        );
      };

      this.services.set("calendarService", calendarService);
      this.serviceHealth.set("calendarService", {
        healthy: true,
        lastCheck: new Date(),
      });

      logger.info(
        "Calendar Service initialized with circuit breaker protection"
      );
    } catch (error) {
      logger.warn(
        "Calendar Service initialization failed - continuing with degraded functionality",
        {
          error: error.message,
        }
      );

      // Create a fallback calendar service
      const fallbackCalendarService = {
        createEvent: async (eventData) => ({
          success: false,
          error: "Calendar service unavailable",
          eventId: null,
          meetingLink: null,
        }),
        checkAvailability: async (startTime, endTime) => ({
          available: true,
          conflicts: [],
          error: "Calendar service unavailable",
        }),
        getHealthStatus: async () => ({
          healthy: false,
          error: "Calendar service not initialized",
        }),
      };

      this.services.set("calendarService", fallbackCalendarService);
      this.serviceHealth.set("calendarService", {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      });
    }
  }

  /**
   * Initialize Lead Manager
   * @private
   */
  async _initializeLeadManager() {
    try {
      const leadManager = new LeadManager();

      // Wrap lead manager methods with circuit breaker
      const originalCreateOrUpdateContact =
        leadManager.createOrUpdateContact.bind(leadManager);
      leadManager.createOrUpdateContact = async (bookingData) => {
        const circuitBreaker = this.circuitBreakers.get("hubspot");
        return circuitBreaker.execute(
          () => originalCreateOrUpdateContact(bookingData),
          { operation: "createOrUpdateContact", email: bookingData.email }
        );
      };

      const originalCheckExistingContact =
        leadManager.checkExistingContact.bind(leadManager);
      leadManager.checkExistingContact = async (email) => {
        const circuitBreaker = this.circuitBreakers.get("hubspot");
        return circuitBreaker.execute(
          () => originalCheckExistingContact(email),
          { operation: "checkExistingContact", email }
        );
      };

      this.services.set("leadManager", leadManager);
      this.serviceHealth.set("leadManager", {
        healthy: true,
        lastCheck: new Date(),
      });

      logger.info("Lead Manager initialized with circuit breaker protection");
    } catch (error) {
      logger.warn(
        "Lead Manager initialization failed - continuing with degraded functionality",
        {
          error: error.message,
        }
      );

      // Create a fallback lead manager
      const fallbackLeadManager = {
        createOrUpdateContact: async (bookingData) => ({
          success: false,
          message: "HubSpot integration not available",
          skipped: true,
        }),
        checkExistingContact: async (email) => null,
        isAvailable: () => false,
        validateConnection: async () => ({
          connected: false,
          message: "HubSpot not initialized",
        }),
      };

      this.services.set("leadManager", fallbackLeadManager);
      this.serviceHealth.set("leadManager", {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      });
    }
  }

  /**
   * Initialize Voice Handler
   * @private
   */
  async _initializeVoiceHandler() {
    try {
      const bookingService = this.services.get("bookingService");
      const aiService = this.services.get("aiService");
      const calendarService = this.services.get("calendarService");
      const leadManager = this.services.get("leadManager");

      const voiceHandler = new VoiceHandler(
        bookingService,
        aiService,
        calendarService,
        leadManager
      );

      this.services.set("voiceHandler", voiceHandler);
      this.serviceHealth.set("voiceHandler", {
        healthy: true,
        lastCheck: new Date(),
      });

      logger.info("Voice Handler initialized with service dependencies");
    } catch (error) {
      logger.error("Failed to initialize Voice Handler", {
        error: error.message,
      });
      this.serviceHealth.set("voiceHandler", {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      });
      throw error;
    }
  }

  /**
   * Set up fallback handlers for graceful degradation
   * @private
   */
  _setupFallbackHandlers() {
    // AI Service fallback
    gracefulDegradationHandler.registerFallback("aiService", {
      generateResponse: async (message, sessionId) => {
        const aiService = this.services.get("aiService");
        return aiService.getFallbackResponse();
      },
      isBookingIntent: async (message) => {
        // Simple keyword-based fallback
        const bookingKeywords = [
          "book",
          "schedule",
          "appointment",
          "meeting",
          "consultation",
        ];
        return bookingKeywords.some((keyword) =>
          message.toLowerCase().includes(keyword)
        );
      },
      extractBookingInfo: async (message, currentInfo) => {
        // Return current info without extraction
        return currentInfo;
      },
    });

    // Calendar Service fallback
    gracefulDegradationHandler.registerFallback("calendarService", {
      createEvent: async (eventData) => ({
        success: false,
        error: "Calendar service temporarily unavailable",
        eventId: null,
        meetingLink: null,
        _fallbackUsed: true,
      }),
      checkAvailability: async (startTime, endTime) => ({
        available: true,
        conflicts: [],
        error: "Calendar service temporarily unavailable",
        _fallbackUsed: true,
      }),
    });

    // Lead Manager fallback
    gracefulDegradationHandler.registerFallback("leadManager", {
      createOrUpdateContact: async (bookingData) => ({
        success: false,
        message: "Lead management temporarily unavailable",
        skipped: true,
        _fallbackUsed: true,
      }),
    });

    logger.info("Fallback handlers configured for graceful degradation");
  }

  /**
   * Perform initial health checks on all services
   * @private
   */
  async _performInitialHealthChecks() {
    const healthCheckPromises = [];

    // Check Calendar Service
    if (this.services.has("calendarService")) {
      healthCheckPromises.push(
        this._checkServiceHealth("calendarService", async () => {
          const calendarService = this.services.get("calendarService");
          return await calendarService.getHealthStatus();
        })
      );
    }

    // Check Lead Manager
    if (this.services.has("leadManager")) {
      healthCheckPromises.push(
        this._checkServiceHealth("leadManager", async () => {
          const leadManager = this.services.get("leadManager");
          return await leadManager.validateConnection();
        })
      );
    }

    // Wait for all health checks to complete
    await Promise.allSettled(healthCheckPromises);

    logger.info("Initial health checks completed", {
      serviceHealth: Object.fromEntries(this.serviceHealth),
    });
  }

  /**
   * Check health of a specific service
   * @param {string} serviceName - Name of the service
   * @param {Function} healthCheckFn - Function to perform health check
   * @private
   */
  async _checkServiceHealth(serviceName, healthCheckFn) {
    try {
      const result = await healthCheckFn();
      const isHealthy = result.healthy || result.connected || result.success;

      this.serviceHealth.set(serviceName, {
        healthy: isHealthy,
        lastCheck: new Date(),
        details: result,
      });

      logger.debug(`Health check for ${serviceName}`, {
        healthy: isHealthy,
        details: result,
      });
    } catch (error) {
      this.serviceHealth.set(serviceName, {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      });

      logger.warn(`Health check failed for ${serviceName}`, {
        error: error.message,
      });
    }
  }

  /**
   * Get a service instance
   * @param {string} serviceName - Name of the service
   * @returns {Object} - Service instance
   */
  getService(serviceName) {
    if (!this.initialized) {
      throw new Error(
        "ServiceManager not initialized. Call initialize() first."
      );
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    return service;
  }

  /**
   * Execute a service method with circuit breaker and fallback support
   * @param {string} serviceName - Name of the service
   * @param {string} methodName - Name of the method
   * @param {Array} args - Method arguments
   * @returns {Promise} - Method result
   */
  async executeServiceMethod(serviceName, methodName, ...args) {
    const context = {
      service: serviceName,
      method: methodName,
      argsCount: args.length,
    };

    try {
      const service = this.getService(serviceName);
      const method = service[methodName];

      if (!method || typeof method !== "function") {
        throw new Error(
          `Method '${methodName}' not found on service '${serviceName}'`
        );
      }

      // Execute with retry logic for external API calls
      const isExternalAPIMethod = this._isExternalAPIMethod(
        serviceName,
        methodName
      );

      if (isExternalAPIMethod) {
        const retryConfig = RetryHandler.getRetryConfig(
          ErrorTypes.EXTERNAL_API_ERROR
        );
        return await RetryHandler.executeWithRetry(
          () => method.apply(service, args),
          retryConfig,
          context
        );
      } else {
        return await method.apply(service, args);
      }
    } catch (error) {
      // Use graceful degradation handler
      return await gracefulDegradationHandler.executeWithFallback(
        serviceName,
        methodName,
        () => {
          throw error;
        }, // This will always fail, triggering fallback
        args,
        context
      );
    }
  }

  /**
   * Check if a method is an external API method that should use retry logic
   * @param {string} serviceName - Service name
   * @param {string} methodName - Method name
   * @returns {boolean} - True if external API method
   * @private
   */
  _isExternalAPIMethod(serviceName, methodName) {
    const externalAPIMethods = {
      aiService: ["generateResponse", "isBookingIntent", "extractBookingInfo"],
      calendarService: [
        "createEvent",
        "checkAvailability",
        "listAvailableSlots",
      ],
      leadManager: ["createOrUpdateContact", "checkExistingContact"],
    };

    return externalAPIMethods[serviceName]?.includes(methodName) || false;
  }

  /**
   * Get overall system health status
   * @returns {Object} - System health information
   */
  getSystemHealth() {
    const services = {};
    const circuitBreakers = {};

    // Collect service health
    for (const [name, health] of this.serviceHealth) {
      services[name] = health;
    }

    // Collect circuit breaker status
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakers[name] = breaker.getStatus();
    }

    // Calculate overall health
    const totalServices = this.serviceHealth.size;
    const healthyServices = Array.from(this.serviceHealth.values()).filter(
      (health) => health.healthy
    ).length;

    const overallHealthPercentage =
      totalServices > 0
        ? Math.round((healthyServices / totalServices) * 100)
        : 100;

    return {
      initialized: this.initialized,
      overallHealth: overallHealthPercentage,
      services,
      circuitBreakers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset a circuit breaker
   * @param {string} serviceName - Name of the service
   */
  resetCircuitBreaker(serviceName) {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      logger.info(`Circuit breaker reset for ${serviceName}`);
    } else {
      throw new Error(`Circuit breaker for '${serviceName}' not found`);
    }
  }

  /**
   * Perform health checks on all services
   * @returns {Promise} - Health check results
   */
  async performHealthChecks() {
    const results = {};

    for (const [serviceName] of this.services) {
      try {
        let healthResult;

        switch (serviceName) {
          case "calendarService":
            healthResult = await this.services
              .get(serviceName)
              .getHealthStatus();
            break;
          case "leadManager":
            healthResult = await this.services
              .get(serviceName)
              .validateConnection();
            break;
          case "aiService":
            // AI service doesn't have a health check method, assume healthy if initialized
            healthResult = { healthy: true };
            break;
          default:
            healthResult = { healthy: true };
        }

        const isHealthy =
          healthResult.healthy ||
          healthResult.connected ||
          healthResult.success;

        this.serviceHealth.set(serviceName, {
          healthy: isHealthy,
          lastCheck: new Date(),
          details: healthResult,
        });

        results[serviceName] = {
          healthy: isHealthy,
          details: healthResult,
        };
      } catch (error) {
        this.serviceHealth.set(serviceName, {
          healthy: false,
          error: error.message,
          lastCheck: new Date(),
        });

        results[serviceName] = {
          healthy: false,
          error: error.message,
        };
      }
    }

    logger.info("Health checks completed", { results });
    return results;
  }

  /**
   * Gracefully shutdown all services
   * @returns {Promise} - Shutdown completion
   */
  async shutdown() {
    logger.info("Shutting down ServiceManager...");

    try {
      // Clear any intervals or timeouts
      // Close database connections if any
      // Clean up resources

      this.services.clear();
      this.circuitBreakers.clear();
      this.serviceHealth.clear();
      this.fallbackHandlers.clear();

      this.initialized = false;
      this.initializationPromise = null;

      logger.info("ServiceManager shutdown completed");
    } catch (error) {
      logger.error("Error during ServiceManager shutdown", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
const serviceManager = new ServiceManager();

module.exports = {
  ServiceManager,
  serviceManager,
  CircuitBreaker,
  CircuitBreakerState,
};
