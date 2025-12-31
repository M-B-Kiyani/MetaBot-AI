const { google } = require("googleapis");
const winston = require("winston");

class CalendarService {
  constructor() {
    this.auth = null;
    this.calendar = null;
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    this.timeZone = process.env.TIMEZONE || "Europe/London";

    // Initialize logger
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  /**
   * Initialize Google Calendar authentication using service account
   */
  async initializeAuth() {
    try {
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;

      let credentials;

      if (serviceAccountPath) {
        // Use service account file path
        this.logger.info("Using Google service account from file path");
        this.auth = new google.auth.GoogleAuth({
          keyFile: serviceAccountPath,
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });
      } else if (serviceAccountKey) {
        // Use service account from JSON string
        this.logger.info("Using Google service account from JSON string");
        credentials = JSON.parse(serviceAccountKey);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });
      } else if (serviceAccountEmail && privateKey) {
        // Use individual env variables
        this.logger.info(
          "Using Google service account from individual env vars"
        );
        credentials = {
          client_email: serviceAccountEmail,
          private_key: privateKey.replace(/\\n/g, "\n"),
          type: "service_account",
        };
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });
      } else {
        throw new Error(
          "Google Calendar service account credentials not found. Please provide either GOOGLE_SERVICE_ACCOUNT_PATH, GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY"
        );
      }

      // Initialize Calendar API
      this.calendar = google.calendar({ version: "v3", auth: this.auth });

      this.logger.info("Google Calendar service initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Google Calendar service:", error);
      throw error;
    }
  }

  /**
   * Generate event description with user information
   * @param {Object} eventData - Event data containing booking information
   * @returns {string} - Formatted event description
   */
  generateEventDescription(eventData) {
    return `Consultation Meeting - BOOKING CONFIRMED

Client Information:
• Name: ${eventData.name}
• Email: ${eventData.email}
• Company: ${eventData.company}

Project Details:
${eventData.inquiry}

Meeting Duration: ${eventData.duration} minutes.

IMPORTANT: This event was created via service account. 
Please manually invite the client: ${eventData.email}

---
This meeting was scheduled through the Metalogics.io booking system.
For any questions or changes, please contact: hello@metalogics.io`;
  }

  /**
   * Create a calendar event
   * @param {Object} eventData - Event data containing booking information
   * @returns {Promise<Object>} - Created event object or error
   */
  async createEvent(eventData) {
    try {
      // Validate required event data first (before checking calendar initialization)
      const requiredFields = [
        "name",
        "email",
        "company",
        "dateTime",
        "inquiry",
        "duration",
      ];
      for (const field of requiredFields) {
        if (!eventData[field]) {
          this.logger.error(`Missing required field: ${field}`);
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate that the event is in the future (before checking calendar initialization)
      const startTime = new Date(eventData.dateTime);
      const now = new Date();
      if (startTime <= now) {
        this.logger.error("Cannot create event in the past");
        throw new Error("Cannot create event in the past");
      }

      if (!this.calendar) {
        this.logger.error("Calendar service not initialized");
        throw new Error("Calendar service not initialized");
      }

      // Create event description with user information
      const description = this.generateEventDescription(eventData);

      // Calculate end time with proper timezone handling
      const endTime = new Date(
        startTime.getTime() + eventData.duration * 60 * 1000
      );

      const event = {
        summary: `Consultation - ${eventData.company}`,
        description: description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: this.timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: this.timeZone,
        },
        // Note: Attendees removed to avoid Domain-Wide Delegation requirement
        // The client email and details are included in the description instead
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 15 }, // 15 minutes before
          ],
        },
        // Note: Conference data removed due to service account limitations
        // Meeting link can be added manually or through a different method
      };

      // Create the event with proper error handling
      this.logger.info(
        `Creating calendar event for ${
          eventData.name
        } at ${startTime.toISOString()}`
      );

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
        sendUpdates: "none", // Don't send email invitations since we can't add attendees
      });

      this.logger.info(
        `Calendar event created successfully: ${response.data.id}`
      );

      return {
        success: true,
        eventId: response.data.id,
        event: response.data,
        meetingLink:
          response.data.hangoutLink ||
          response.data.conferenceData?.entryPoints?.[0]?.uri,
      };
    } catch (error) {
      this.logger.error("Failed to create calendar event:", error);

      // Provide graceful error handling - don't throw, return error info
      // This allows the booking flow to continue even if calendar creation fails
      return {
        success: false,
        error: error.message,
        // Return null for optional fields to allow graceful degradation
        eventId: null,
        event: null,
        meetingLink: null,
      };
    }
  }

  /**
   * Check availability for a specific time slot
   * @param {Date|string} startTime - Start time to check
   * @param {Date|string} endTime - End time to check
   * @returns {Promise<Object>} - Availability result
   */
  async checkAvailability(startTime, endTime) {
    try {
      if (!this.calendar) {
        this.logger.error("Calendar service not initialized");
        // Return available=true for graceful degradation
        return {
          available: true,
          conflicts: [],
          error: "Calendar service not initialized",
        };
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      // Query for events in the time range
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      // Check for conflicts that overlap with requested time
      const conflicts = events
        .filter((event) => {
          if (!event.start || !event.end) return false;

          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);

          // Check for overlap: requested time overlaps if start < eventEnd AND end > eventStart
          return start < eventEnd && end > eventStart;
        })
        .map((event) => ({
          id: event.id,
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
        }));

      return {
        available: conflicts.length === 0,
        conflicts: conflicts,
      };
    } catch (error) {
      this.logger.error("Failed to check availability:", error);

      // Return available=true to allow booking to continue (graceful degradation)
      return {
        available: true,
        conflicts: [],
        error: error.message,
      };
    }
  }

  /**
   * List available time slots for a given date and duration
   * @param {Date|string} date - The date to check
   * @param {number} duration - Meeting duration in minutes
   * @returns {Promise<Array>} - Array of available time slots
   */
  async listAvailableSlots(date, duration = 30) {
    try {
      if (!this.calendar) {
        this.logger.error("Calendar service not initialized");
        // Return empty array for graceful degradation
        return [];
      }

      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return [];
      }

      const availableSlots = [];

      // Generate 30-minute slots from 9 AM to 6 PM
      const startHour = 9; // 9 AM
      const endHour = 18; // 6 PM

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(targetDate);
          slotStart.setHours(hour, minute, 0, 0);

          // Check if slot is in the future
          if (slotStart <= new Date()) continue;

          // Check if slot would end before business hours end
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
          if (slotEnd.getHours() > endHour) continue;

          // Check availability with calendar
          const availability = await this.checkAvailability(slotStart, slotEnd);

          if (availability.available) {
            availableSlots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              date: slotStart.toLocaleDateString("en-GB"),
              time: slotStart.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              formatted: slotStart.toLocaleString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              duration: duration,
            });
          }
        }
      }

      return availableSlots;
    } catch (error) {
      this.logger.error("Failed to list available slots:", error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Update an existing calendar event
   * @param {string} eventId - The event ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Update result
   */
  async updateEvent(eventId, updateData) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar service not initialized");
      }

      // Get existing event first
      const existingEvent = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      // Merge update data with existing event data
      const updatedEvent = {
        ...existingEvent.data,
        ...updateData,
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: "all", // Update all attendees
      });

      this.logger.info(`Calendar event updated successfully: ${eventId}`);

      return {
        success: true,
        eventId: eventId,
        event: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to update calendar event ${eventId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a calendar event
   * @param {string} eventId - The event ID to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteEvent(eventId) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar service not initialized");
      }

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
        sendUpdates: "all",
      });

      this.logger.info(`Calendar event deleted successfully: ${eventId}`);

      return {
        success: true,
        eventId: eventId,
      };
    } catch (error) {
      this.logger.error(`Failed to delete calendar event ${eventId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get calendar service health status
   * @returns {Promise<Object>} - Health status
   */
  async getHealthStatus() {
    try {
      if (!this.calendar) {
        return {
          healthy: false,
          error: "Calendar service not initialized",
        };
      }

      // Try to list calendars to test connection
      const response = await this.calendar.calendarList.list({
        maxResults: 1,
      });

      return {
        healthy: true,
        calendarId: this.calendarId,
      };
    } catch (error) {
      this.logger.error("Calendar service health check failed:", error);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

module.exports = CalendarService;
