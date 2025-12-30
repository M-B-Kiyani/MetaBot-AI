const { Client } = require("@hubspot/api-client");

class LeadManager {
  constructor() {
    this.hubspotClient = null;
    this.isInitialized = false;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2,
    };
    this.rateLimitInfo = {
      remaining: null,
      resetTime: null,
      isLimited: false,
    };
    this.initializeClient();
  }

  /**
   * Initialize HubSpot client with API key
   */
  initializeClient() {
    try {
      const apiKey = process.env.HUBSPOT_API_KEY;

      if (!apiKey) {
        console.warn(
          "HubSpot API key not found. Lead management will be disabled."
        );
        return;
      }

      this.hubspotClient = new Client({ accessToken: apiKey });
      this.isInitialized = true;
      console.log("HubSpot client initialized successfully");
    } catch (error) {
      console.error("Error initializing HubSpot client:", error);
      this.isInitialized = false;
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} - Delay in milliseconds
   */
  calculateBackoffDelay(attempt) {
    const delay = Math.min(
      this.retryConfig.baseDelay *
        Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} - True if error should be retried
   */
  isRetryableError(error) {
    // Retry on network errors, timeouts, and server errors (5xx)
    if (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND"
    ) {
      return true;
    }

    // Check HTTP status codes
    if (error.response && error.response.status) {
      const status = error.response.status;

      // Retry on server errors (5xx) and rate limiting (429)
      if (status >= 500 || status === 429) {
        return true;
      }

      // Don't retry on client errors (4xx) except rate limiting
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }

    // Retry on unknown errors by default
    return true;
  }

  /**
   * Handle rate limiting information from response headers
   * @param {Object} response - HTTP response object
   */
  handleRateLimitHeaders(response) {
    if (response && response.headers) {
      const remaining = response.headers["x-hubspot-ratelimit-remaining"];
      const resetTime = response.headers["x-hubspot-ratelimit-reset"];

      if (remaining !== undefined) {
        this.rateLimitInfo.remaining = parseInt(remaining);
        this.rateLimitInfo.isLimited = this.rateLimitInfo.remaining <= 5; // Consider limited when < 5 requests remaining
      }

      if (resetTime !== undefined) {
        this.rateLimitInfo.resetTime = new Date(parseInt(resetTime) * 1000);
      }
    }
  }

  /**
   * Wait for rate limit reset if necessary
   * @returns {Promise} - Promise that resolves when safe to proceed
   */
  async waitForRateLimit() {
    if (this.rateLimitInfo.isLimited && this.rateLimitInfo.resetTime) {
      const now = new Date();
      const waitTime = this.rateLimitInfo.resetTime.getTime() - now.getTime();

      if (waitTime > 0 && waitTime < 60000) {
        // Only wait up to 1 minute
        console.log(
          `Rate limit detected. Waiting ${Math.ceil(
            waitTime / 1000
          )} seconds...`
        );
        await this.sleep(waitTime + 1000); // Add 1 second buffer
        this.rateLimitInfo.isLimited = false;
      }
    }
  }

  /**
   * Execute HubSpot API call with retry logic and error handling
   * @param {Function} apiCall - Function that makes the API call
   * @param {string} operation - Description of the operation for logging
   * @param {Object} context - Additional context for error logging
   * @returns {Promise} - Promise that resolves with API response
   */
  async executeWithRetry(apiCall, operation, context = {}) {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Wait for rate limit if necessary
        await this.waitForRateLimit();

        // Execute the API call
        const response = await apiCall();

        // Handle rate limit headers
        this.handleRateLimitHeaders(response);

        // Log successful operation
        if (attempt > 0) {
          console.log(
            `HubSpot ${operation} succeeded on attempt ${attempt + 1}`
          );
        }

        return response;
      } catch (error) {
        lastError = error;

        // Handle rate limit headers even on error
        if (error.response) {
          this.handleRateLimitHeaders(error.response);
        }

        // Log the error with context
        console.error(
          `HubSpot ${operation} failed on attempt ${attempt + 1}:`,
          {
            error: error.message,
            status: error.response?.status,
            context: context,
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries + 1,
          }
        );

        // Check if we should retry
        if (
          attempt < this.retryConfig.maxRetries &&
          this.isRetryableError(error)
        ) {
          const delay = this.calculateBackoffDelay(attempt);
          console.log(`Retrying HubSpot ${operation} in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // No more retries or non-retryable error
        break;
      }
    }

    // All retries exhausted, log final error and throw
    console.error(
      `HubSpot ${operation} failed after ${
        this.retryConfig.maxRetries + 1
      } attempts:`,
      {
        finalError: lastError.message,
        status: lastError.response?.status,
        context: context,
      }
    );

    throw lastError;
  }

  /**
   * Check if HubSpot integration is available
   * @returns {boolean} - True if HubSpot is available
   */
  isAvailable() {
    return this.isInitialized && this.hubspotClient !== null;
  }

  /**
   * Search for existing contact by email
   * @param {string} email - Contact email address
   * @returns {Object|null} - Existing contact or null if not found
   */
  async checkExistingContact(email) {
    if (!this.isAvailable()) {
      console.warn("HubSpot not available for contact search");
      return null;
    }

    const operation = "contact search";
    const context = { email: email };

    return await this.executeWithRetry(
      async () => {
        const searchRequest = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "email",
                  operator: "EQ",
                  value: email.toLowerCase().trim(),
                },
              ],
            },
          ],
          properties: [
            "email",
            "firstname",
            "lastname",
            "company",
            "phone",
            "createdate",
            "lastmodifieddate",
          ],
          limit: 1,
        };

        const response =
          await this.hubspotClient.crm.contacts.searchApi.doSearch(
            searchRequest
          );

        if (response.results && response.results.length > 0) {
          return response.results[0];
        }

        return null;
      },
      operation,
      context
    );
  }

  /**
   * Map booking data to HubSpot contact properties
   * @param {Object} bookingData - Booking information
   * @returns {Object} - HubSpot contact properties
   */
  mapBookingToContactProperties(bookingData) {
    // Split name into first and last name
    const nameParts = bookingData.name.trim().split(" ");
    const firstname = nameParts[0] || "";
    const lastname = nameParts.slice(1).join(" ") || "";

    // Format booking date for HubSpot
    const bookingDate = new Date(bookingData.dateTime);
    const formattedDate = bookingDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    return {
      email: bookingData.email.toLowerCase().trim(),
      firstname: firstname,
      lastname: lastname,
      company: bookingData.company.trim(),
      inquiry_details: bookingData.inquiry.trim(),
      booking_date: formattedDate,
      meeting_duration: bookingData.duration.toString(),
      lead_source: bookingData.source || "chat",
      lifecyclestage: "lead",
      // Add custom properties for better lead tracking
      original_booking_time: bookingDate.toISOString(),
      booking_status: bookingData.status || "pending",
      calendar_event_id: bookingData.calendarEventId || "",
    };
  }

  /**
   * Create a new contact in HubSpot
   * @param {Object} contactProperties - HubSpot contact properties
   * @returns {Object} - Created contact information
   */
  async createContact(contactProperties) {
    if (!this.isAvailable()) {
      throw new Error("HubSpot not available for contact creation");
    }

    const operation = "contact creation";
    const context = { email: contactProperties.email };

    return await this.executeWithRetry(
      async () => {
        const contactInput = {
          properties: contactProperties,
        };

        const response = await this.hubspotClient.crm.contacts.basicApi.create(
          contactInput
        );

        console.log(`Created new HubSpot contact: ${response.id}`);
        return {
          id: response.id,
          properties: response.properties,
          created: true,
        };
      },
      operation,
      context
    );
  }

  /**
   * Update an existing contact in HubSpot
   * @param {string} contactId - HubSpot contact ID
   * @param {Object} contactProperties - Properties to update
   * @returns {Object} - Updated contact information
   */
  async updateContact(contactId, contactProperties) {
    if (!this.isAvailable()) {
      throw new Error("HubSpot not available for contact update");
    }

    const operation = "contact update";
    const context = { contactId: contactId, email: contactProperties.email };

    return await this.executeWithRetry(
      async () => {
        const contactInput = {
          properties: contactProperties,
        };

        const response = await this.hubspotClient.crm.contacts.basicApi.update(
          contactId,
          contactInput
        );

        console.log(`Updated HubSpot contact: ${contactId}`);
        return {
          id: response.id,
          properties: response.properties,
          created: false,
        };
      },
      operation,
      context
    );
  }

  /**
   * Create or update a contact based on booking data
   * @param {Object} bookingData - Booking information
   * @returns {Object} - Result with contact information and operation status
   */
  async createOrUpdateContact(bookingData) {
    if (!this.isAvailable()) {
      console.warn("HubSpot not available. Skipping contact management.");
      return {
        success: false,
        message: "HubSpot integration not available",
        skipped: true,
      };
    }

    try {
      // Map booking data to HubSpot properties
      const contactProperties = this.mapBookingToContactProperties(bookingData);

      // Check for existing contact
      const existingContact = await this.checkExistingContact(
        bookingData.email
      );

      let result;
      if (existingContact) {
        // Update existing contact with new booking information
        result = await this.updateContact(
          existingContact.id,
          contactProperties
        );
        console.log(`Updated existing contact for ${bookingData.email}`);
      } else {
        // Create new contact
        result = await this.createContact(contactProperties);
        console.log(`Created new contact for ${bookingData.email}`);
      }

      return {
        success: true,
        contactId: result.id,
        created: result.created,
        message: result.created
          ? "New contact created in HubSpot"
          : "Existing contact updated in HubSpot",
      };
    } catch (error) {
      console.error("Error in createOrUpdateContact:", error);

      // Enhanced error logging with more context
      const errorContext = {
        operation: "createOrUpdateContact",
        email: bookingData.email,
        company: bookingData.company,
        errorType: error.constructor.name,
        statusCode: error.response?.status,
        rateLimitInfo: this.rateLimitInfo,
        timestamp: new Date().toISOString(),
      };

      console.error("Detailed error context:", errorContext);

      // Return graceful failure response
      return {
        success: false,
        error: error.message,
        message: "Failed to manage contact in HubSpot",
        errorContext: errorContext,
        retryable: this.isRetryableError(error),
      };
    }
  }

  /**
   * Create a lead/deal in HubSpot (optional - for more advanced lead tracking)
   * @param {Object} leadData - Lead information
   * @param {string} contactId - Associated contact ID
   * @returns {Object} - Created deal information
   */
  async createLead(leadData, contactId) {
    if (!this.isAvailable()) {
      throw new Error("HubSpot not available for lead creation");
    }

    const operation = "deal creation";
    const context = { contactId: contactId, company: leadData.company };

    return await this.executeWithRetry(
      async () => {
        const dealProperties = {
          dealname: `${leadData.company} - ${leadData.inquiry}`,
          dealstage: "appointmentscheduled", // Adjust based on your HubSpot pipeline
          amount: "0", // Will be updated after consultation
          closedate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days from now
          pipeline: "default", // Adjust based on your HubSpot setup
          hubspot_owner_id: "", // Set if you have specific owner assignment
          // Custom properties
          lead_source: leadData.source || "chat",
          inquiry_type: leadData.inquiry,
          booking_date: new Date(leadData.dateTime).toISOString().split("T")[0],
          meeting_duration: leadData.duration.toString(),
        };

        const dealInput = {
          properties: dealProperties,
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 3, // Contact to Deal association
                },
              ],
            },
          ],
        };

        const response = await this.hubspotClient.crm.deals.basicApi.create(
          dealInput
        );

        console.log(`Created new HubSpot deal: ${response.id}`);
        return {
          id: response.id,
          properties: response.properties,
        };
      },
      operation,
      context
    );
  }

  /**
   * Get contact by ID
   * @param {string} contactId - HubSpot contact ID
   * @returns {Object} - Contact information
   */
  async getContact(contactId) {
    if (!this.isAvailable()) {
      throw new Error("HubSpot not available");
    }

    const operation = "get contact";
    const context = { contactId: contactId };

    return await this.executeWithRetry(
      async () => {
        const response = await this.hubspotClient.crm.contacts.basicApi.getById(
          contactId,
          [
            "email",
            "firstname",
            "lastname",
            "company",
            "phone",
            "inquiry_details",
            "booking_date",
            "meeting_duration",
            "lead_source",
          ]
        );

        return response;
      },
      operation,
      context
    );
  }

  /**
   * Search contacts by company name
   * @param {string} companyName - Company name to search for
   * @returns {Array} - Array of matching contacts
   */
  async searchContactsByCompany(companyName) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const searchRequest = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "company",
                operator: "CONTAINS_TOKEN",
                value: companyName.trim(),
              },
            ],
          },
        ],
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          "createdate",
          "lastmodifieddate",
        ],
        limit: 10,
      };

      const response = await this.hubspotClient.crm.contacts.searchApi.doSearch(
        searchRequest
      );

      return response.results || [];
    } catch (error) {
      console.error("Error searching contacts by company:", error);
      return [];
    }
  }

  /**
   * Get recent contacts (for testing/admin purposes)
   * @param {number} limit - Number of contacts to retrieve
   * @returns {Array} - Array of recent contacts
   */
  async getRecentContacts(limit = 10) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await this.hubspotClient.crm.contacts.basicApi.getPage(
        limit,
        undefined,
        [
          "email",
          "firstname",
          "lastname",
          "company",
          "createdate",
          "lastmodifieddate",
        ]
      );

      return response.results || [];
    } catch (error) {
      console.error("Error getting recent contacts:", error);
      return [];
    }
  }

  /**
   * Validate HubSpot connection
   * @returns {Object} - Connection status and information
   */
  async validateConnection() {
    if (!this.isAvailable()) {
      return {
        connected: false,
        message: "HubSpot API key not configured",
      };
    }

    const operation = "connection validation";
    const context = {};

    try {
      const response = await this.executeWithRetry(
        async () => {
          // Try to get account info to validate connection
          return await this.hubspotClient.crm.contacts.basicApi.getPage(1);
        },
        operation,
        context
      );

      return {
        connected: true,
        message: "HubSpot connection successful",
        accountInfo: {
          hasContacts: response.results && response.results.length > 0,
          totalContacts: response.total || 0,
        },
        rateLimitInfo: this.rateLimitInfo,
      };
    } catch (error) {
      console.error("HubSpot connection validation failed:", error);
      return {
        connected: false,
        message: `HubSpot connection failed: ${error.message}`,
        error: error.message,
        rateLimitInfo: this.rateLimitInfo,
      };
    }
  }

  /**
   * Get current rate limit status
   * @returns {Object} - Rate limit information
   */
  getRateLimitStatus() {
    return {
      ...this.rateLimitInfo,
      retryConfig: this.retryConfig,
    };
  }

  /**
   * Reset rate limit tracking (for testing purposes)
   */
  resetRateLimitTracking() {
    this.rateLimitInfo = {
      remaining: null,
      resetTime: null,
      isLimited: false,
    };
  }

  /**
   * Handle graceful failure when HubSpot is unavailable
   * @param {Object} bookingData - Booking data that couldn't be processed
   * @returns {Object} - Fallback response
   */
  handleServiceFailure(bookingData) {
    console.warn(
      `HubSpot service unavailable for booking: ${bookingData.email}`
    );

    // Enhanced logging with more context
    const failureContext = {
      email: bookingData.email,
      name: bookingData.name,
      company: bookingData.company,
      inquiry: bookingData.inquiry,
      bookingDate: bookingData.dateTime,
      duration: bookingData.duration,
      timestamp: new Date().toISOString(),
      rateLimitInfo: this.rateLimitInfo,
      hubspotAvailable: this.isAvailable(),
    };

    console.log("Booking data for manual HubSpot entry:", failureContext);

    // Store failure for potential retry later
    // In a production system, this could be stored in a queue or database
    console.warn(
      "Consider implementing a retry queue for failed HubSpot operations"
    );

    return {
      success: false,
      message: "Lead management temporarily unavailable",
      fallback: true,
      bookingData: bookingData,
      failureContext: failureContext,
      retryRecommended: true,
    };
  }
}

module.exports = LeadManager;
