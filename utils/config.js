const logger = require("./logger");

/**
 * Configuration validation and loading utility
 * Validates required environment variables and provides secure configuration loading
 */

class ConfigValidator {
  constructor() {
    this.requiredVars = {
      // Server configuration
      PORT: { type: "number", default: 3000 },
      NODE_ENV: { type: "string", default: "development" },

      // API Keys (required in production)
      GEMINI_API_KEY: { type: "string", required: false, sensitive: true },
      HUBSPOT_ACCESS_TOKEN: {
        type: "string",
        required: false,
        sensitive: true,
      },
      HUBSPOT_API_KEY: {
        type: "string",
        required: false,
        sensitive: true,
      },
      HUBSPOT_PERSONAL_ACCESS_KEY: {
        type: "string",
        required: false,
        sensitive: true,
      },
      GOOGLE_SERVICE_ACCOUNT_EMAIL: { type: "string", required: false },
      GOOGLE_SERVICE_ACCOUNT_KEY: {
        type: "string",
        required: false,
        sensitive: true,
      },
      GOOGLE_CALENDAR_ID: { type: "string", required: false },

      // Optional API Keys
      RETELL_API_KEY: { type: "string", required: false, sensitive: true },
      RETELL_WEBHOOK_SECRET: {
        type: "string",
        required: false,
        sensitive: true,
      },

      // Company configuration
      COMPANY_NAME: { type: "string", default: "Metalogics.io" },
      COMPANY_DOMAIN: { type: "string", default: "metalogics.io" },

      // Security configuration
      CORS_ORIGINS: { type: "string", default: "http://localhost:3000" },
      WIDGET_ALLOWED_DOMAINS: {
        type: "string",
        default: "localhost,127.0.0.1",
      },

      // Logging configuration
      LOG_LEVEL: {
        type: "string",
        default: "info",
        enum: ["error", "warn", "info", "http", "debug"],
      },
      LOG_FILE_PATH: { type: "string", default: "logs/" },

      // Timeouts and limits
      HEALTH_CHECK_TIMEOUT: { type: "number", default: 5000 },
      EXTERNAL_API_TIMEOUT: { type: "number", default: 10000 },
      RATE_LIMIT_WINDOW_MS: { type: "number", default: 900000 },
      RATE_LIMIT_MAX_REQUESTS: { type: "number", default: 100 },

      // Calendar configuration
      TIMEZONE: { type: "string", default: "America/New_York" },
    };

    this.config = {};
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate all environment variables
   * @returns {Object} Configuration object with validated values
   */
  validate() {
    logger.info("Starting environment configuration validation...");

    // Check each required variable
    for (const [key, rules] of Object.entries(this.requiredVars)) {
      this.validateVariable(key, rules);
    }

    // Check for development vs production requirements
    this.validateEnvironmentSpecificRequirements();

    // Log results
    this.logValidationResults();

    // Throw error if critical validation failed
    if (this.errors.length > 0) {
      throw new Error(
        `Configuration validation failed:\n${this.errors.join("\n")}`
      );
    }

    return this.config;
  }

  /**
   * Validate a single environment variable
   * @param {string} key - Environment variable name
   * @param {Object} rules - Validation rules
   */
  validateVariable(key, rules) {
    const value = process.env[key];

    // Check if required variable is missing
    if (rules.required && !value) {
      this.errors.push(`Missing required environment variable: ${key}`);
      return;
    }

    // Use default value if not provided
    if (!value && rules.default !== undefined) {
      this.config[key] = rules.default;
      this.warnings.push(
        `Using default value for ${key}: ${
          rules.sensitive ? "[REDACTED]" : rules.default
        }`
      );
      return;
    }

    // Skip validation if optional and not provided
    if (!value && !rules.required) {
      return;
    }

    // Type validation
    const validatedValue = this.validateType(key, value, rules);
    if (validatedValue !== null) {
      this.config[key] = validatedValue;
    }
  }

  /**
   * Validate variable type and constraints
   * @param {string} key - Variable name
   * @param {string} value - Variable value
   * @param {Object} rules - Validation rules
   * @returns {*} Validated value or null if invalid
   */
  validateType(key, value, rules) {
    switch (rules.type) {
      case "number":
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          this.errors.push(`${key} must be a valid number, got: ${value}`);
          return null;
        }
        return numValue;

      case "string":
        if (typeof value !== "string") {
          this.errors.push(`${key} must be a string`);
          return null;
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          this.errors.push(
            `${key} must be one of: ${rules.enum.join(", ")}, got: ${value}`
          );
          return null;
        }

        return value;

      default:
        return value;
    }
  }

  /**
   * Validate environment-specific requirements
   */
  validateEnvironmentSpecificRequirements() {
    const isProduction = this.config.NODE_ENV === "production";

    if (isProduction) {
      // In production, all API keys must be provided
      const productionRequired = [
        "GEMINI_API_KEY",
        "HUBSPOT_ACCESS_TOKEN", // Primary HubSpot access token
        "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        "GOOGLE_SERVICE_ACCOUNT_KEY", // Changed from GOOGLE_PRIVATE_KEY
        "GOOGLE_CALENDAR_ID",
      ];

      for (const key of productionRequired) {
        if (!process.env[key]) {
          this.errors.push(`${key} is required in production environment`);
        }
      }

      // Validate CORS origins in production
      if (this.config.CORS_ORIGINS && this.config.CORS_ORIGINS.includes("*")) {
        this.warnings.push(
          "CORS_ORIGINS contains wildcard (*) in production - consider restricting origins"
        );
      }
    } else {
      // In development, warn about missing API keys but don't fail
      const developmentOptional = [
        "GEMINI_API_KEY",
        "HUBSPOT_ACCESS_TOKEN", // Primary HubSpot access token
        "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        "GOOGLE_SERVICE_ACCOUNT_KEY", // Changed from GOOGLE_PRIVATE_KEY
        "GOOGLE_CALENDAR_ID",
      ];

      for (const key of developmentOptional) {
        if (!process.env[key]) {
          this.warnings.push(
            `${key} not configured - some features may not work in development`
          );
        }
      }
    }

    // Validate Google Service Account Key format if provided
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        // Try to parse as JSON or check if it's a proper private key format
        const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        if (
          !key.includes("BEGIN PRIVATE KEY") &&
          !key.includes("BEGIN RSA PRIVATE KEY")
        ) {
          // Try parsing as JSON
          JSON.parse(key);
        }
      } catch (error) {
        this.errors.push(
          "GOOGLE_SERVICE_ACCOUNT_KEY must be a valid private key or JSON string"
        );
      }
    }
  }

  /**
   * Log validation results
   */
  logValidationResults() {
    if (this.warnings.length > 0) {
      logger.warn("Configuration warnings:", { warnings: this.warnings });
    }

    if (this.errors.length > 0) {
      logger.error("Configuration errors:", { errors: this.errors });
    } else {
      logger.info(
        "Environment configuration validation completed successfully"
      );
    }

    // Log non-sensitive configuration
    const safeConfig = {};
    for (const [key, value] of Object.entries(this.config)) {
      const rules = this.requiredVars[key];
      safeConfig[key] = rules && rules.sensitive ? "[REDACTED]" : value;
    }

    logger.info("Loaded configuration:", safeConfig);
  }

  /**
   * Get a configuration value safely
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = undefined) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Check if running in production
   * @returns {boolean} True if production environment
   */
  isProduction() {
    return this.config.NODE_ENV === "production";
  }

  /**
   * Check if running in development
   * @returns {boolean} True if development environment
   */
  isDevelopment() {
    return this.config.NODE_ENV === "development";
  }

  /**
   * Get API timeout value
   * @returns {number} Timeout in milliseconds
   */
  getApiTimeout() {
    return this.config.EXTERNAL_API_TIMEOUT || 10000;
  }

  /**
   * Get health check timeout
   * @returns {number} Timeout in milliseconds
   */
  getHealthCheckTimeout() {
    return this.config.HEALTH_CHECK_TIMEOUT || 5000;
  }
}

// Create and export singleton instance
const configValidator = new ConfigValidator();

module.exports = {
  ConfigValidator,
  config: configValidator,
  validateConfig: () => configValidator.validate(),
};
