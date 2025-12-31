const crypto = require("crypto");

// Generate UUID v4 using crypto module
function generateUUID() {
  return crypto.randomUUID();
}

class BookingService {
  constructor() {
    this.bookings = new Map(); // In-memory storage for now
    this.validDurations = [15, 30, 45, 60]; // Valid meeting durations in minutes
    this.bookingStates = new Map(); // Track booking progress for each session
  }

  /**
   * Validate booking data structure
   * @param {Object} bookingData - The booking data to validate
   * @returns {Object} - Validation result with isValid and errors
   */
  validateBookingData(bookingData) {
    const errors = [];
    const requiredFields = [
      "name",
      "email",
      "company",
      "inquiry",
      "dateTime",
      "duration",
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (
        !bookingData[field] ||
        (typeof bookingData[field] === "string" &&
          bookingData[field].trim() === "")
      ) {
        errors.push(`${field} is required`);
      }
    }

    // Validate email format
    if (bookingData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(bookingData.email)) {
        errors.push("Invalid email format");
      }
    }

    // Validate duration
    if (
      bookingData.duration &&
      !this.validDurations.includes(parseInt(bookingData.duration))
    ) {
      errors.push(
        `Duration must be one of: ${this.validDurations.join(", ")} minutes`
      );
    }

    // Validate dateTime
    if (bookingData.dateTime) {
      const date = new Date(bookingData.dateTime);
      if (isNaN(date.getTime())) {
        errors.push("Invalid date/time format");
      } else if (date < new Date()) {
        errors.push("Booking time must be in the future");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate time slot availability and constraints
   * @param {string|Date} dateTime - The requested date/time
   * @param {number} duration - Meeting duration in minutes
   * @returns {Object} - Validation result with isValid and message
   */
  validateTimeSlot(dateTime, duration) {
    const date = new Date(dateTime);
    const now = new Date();

    // Check if date is in the future
    if (date <= now) {
      return {
        isValid: false,
        message: "Booking time must be in the future",
      };
    }

    // Check if duration is valid
    if (!this.validDurations.includes(parseInt(duration))) {
      return {
        isValid: false,
        message: `Duration must be one of: ${this.validDurations.join(
          ", "
        )} minutes`,
      };
    }

    // Check business hours (9 AM to 6 PM, Monday to Friday) in Europe/London timezone
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Convert to London timezone for business hours check
    const londonTime = new Date(
      date.toLocaleString("en-US", { timeZone: "Europe/London" })
    );
    const hour = londonTime.getHours();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isValid: false,
        message: "Bookings are only available Monday to Friday",
      };
    }

    if (hour < 9 || hour >= 18) {
      return {
        isValid: false,
        message:
          "Bookings are only available between 9 AM and 6 PM (London time)",
      };
    }

    // Check if the end time would exceed business hours (in London timezone)
    const endTime = new Date(date.getTime() + duration * 60 * 1000);
    const londonEndTime = new Date(
      endTime.toLocaleString("en-US", { timeZone: "Europe/London" })
    );
    if (londonEndTime.getHours() > 18) {
      return {
        isValid: false,
        message:
          "Meeting would extend beyond business hours (6 PM London time)",
      };
    }

    // Check for conflicts with existing bookings
    const conflicts = this.checkTimeSlotConflicts(date, duration);
    if (conflicts.length > 0) {
      return {
        isValid: false,
        message: "Time slot conflicts with existing booking",
      };
    }

    return {
      isValid: true,
      message: "Time slot is available",
    };
  }

  /**
   * Check for time slot conflicts with existing bookings
   * @param {Date} requestedStart - Requested start time
   * @param {number} duration - Duration in minutes
   * @returns {Array} - Array of conflicting bookings
   */
  checkTimeSlotConflicts(requestedStart, duration) {
    const requestedEnd = new Date(
      requestedStart.getTime() + duration * 60 * 1000
    );
    const conflicts = [];

    for (const [id, booking] of this.bookings) {
      if (booking.status === "cancelled") continue;

      const bookingStart = new Date(booking.dateTime);
      const bookingEnd = new Date(
        bookingStart.getTime() + booking.duration * 60 * 1000
      );

      // Check for overlap
      if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
        conflicts.push(booking);
      }
    }

    return conflicts;
  }

  /**
   * Create a new booking with validation
   * @param {Object} bookingData - The booking data
   * @returns {Object} - Result with success status and booking or errors
   */
  createBooking(bookingData) {
    // Validate booking data
    const validation = this.validateBookingData(bookingData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Validate time slot
    const timeSlotValidation = this.validateTimeSlot(
      bookingData.dateTime,
      bookingData.duration
    );
    if (!timeSlotValidation.isValid) {
      return {
        success: false,
        errors: [timeSlotValidation.message],
      };
    }

    // Create booking object
    const booking = {
      id: generateUUID(),
      name: bookingData.name.trim(),
      email: bookingData.email.trim().toLowerCase(),
      company: bookingData.company.trim(),
      inquiry: bookingData.inquiry.trim(),
      dateTime: new Date(bookingData.dateTime),
      duration: parseInt(bookingData.duration),
      status: "pending",
      calendarEventId: null,
      hubspotContactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store booking
    this.bookings.set(booking.id, booking);

    return {
      success: true,
      booking,
    };
  }

  /**
   * Get booking by ID
   * @param {string} bookingId - The booking ID
   * @returns {Object|null} - The booking object or null if not found
   */
  getBooking(bookingId) {
    return this.bookings.get(bookingId) || null;
  }

  /**
   * Update booking status
   * @param {string} bookingId - The booking ID
   * @param {string} status - New status ('pending', 'confirmed', 'cancelled')
   * @returns {boolean} - Success status
   */
  updateBookingStatus(bookingId, status) {
    const booking = this.bookings.get(bookingId);
    if (!booking) return false;

    booking.status = status;
    booking.updatedAt = new Date();
    return true;
  }

  /**
   * Get available time slots for a given date
   * @param {string|Date} date - The date to check
   * @param {number} duration - Meeting duration in minutes
   * @returns {Array} - Array of available time slots
   */
  getAvailableSlots(date, duration = 30) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [];
    }

    const availableSlots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM

    // Generate 30-minute slots from 9 AM to 6 PM
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, minute, 0, 0);

        // Check if slot would end before business hours end
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        if (slotEnd.getHours() > endHour) continue;

        // Check if slot is in the future
        if (slotStart <= new Date()) continue;

        // Check for conflicts
        const conflicts = this.checkTimeSlotConflicts(slotStart, duration);
        if (conflicts.length === 0) {
          availableSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            duration: duration,
          });
        }
      }
    }

    return availableSlots;
  }

  /**
   * Get all bookings (for testing/admin purposes)
   * @returns {Array} - Array of all bookings
   */
  getAllBookings() {
    return Array.from(this.bookings.values());
  }

  /**
   * Clear all bookings (for testing purposes)
   */
  clearAllBookings() {
    this.bookings.clear();
  }

  /**
   * Initialize booking flow for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object} - Initial booking state
   */
  initializeBookingFlow(sessionId) {
    const bookingState = {
      sessionId,
      step: "name",
      data: {},
      isComplete: false,
      createdAt: new Date(),
    };

    this.bookingStates.set(sessionId, bookingState);
    return bookingState;
  }

  /**
   * Get current booking state for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} - Current booking state or null
   */
  getBookingState(sessionId) {
    return this.bookingStates.get(sessionId) || null;
  }

  /**
   * Process user input in conversational booking flow
   * @param {string} sessionId - Session identifier
   * @param {string} userInput - User's message
   * @param {Object} extractedInfo - Information extracted by AI
   * @returns {Object} - Response with next step and message
   */
  processBookingStep(sessionId, userInput, extractedInfo = {}) {
    let bookingState = this.getBookingState(sessionId);

    // Initialize if no state exists
    if (!bookingState) {
      bookingState = this.initializeBookingFlow(sessionId);
    }

    // Process the user input based on current step
    const processedInfo = this.processUserInputForCurrentStep(
      bookingState.step,
      userInput,
      extractedInfo,
      bookingState.data
    );

    // Update booking data with processed information
    bookingState.data = { ...bookingState.data, ...processedInfo };

    // Determine next step based on current state and available data
    const nextStep = this.determineNextStep(bookingState);
    const response = this.generateStepResponse(nextStep, bookingState);

    // Update state
    bookingState.step = nextStep;
    bookingState.updatedAt = new Date();

    // Check if booking is complete
    if (this.isBookingDataComplete(bookingState.data)) {
      bookingState.isComplete = true;
      bookingState.step = "confirmation";
    }

    this.bookingStates.set(sessionId, bookingState);

    return {
      step: nextStep,
      message: response.message,
      isComplete: bookingState.isComplete,
      data: bookingState.data,
      needsConfirmation: nextStep === "confirmation",
    };
  }

  /**
   * Process user input specifically for the current booking step
   * @param {string} currentStep - Current step in booking flow
   * @param {string} userInput - User's message
   * @param {Object} extractedInfo - AI-extracted information
   * @param {Object} currentData - Current booking data
   * @returns {Object} - Processed information for this step
   */
  processUserInputForCurrentStep(
    currentStep,
    userInput,
    extractedInfo,
    currentData
  ) {
    const processed = { ...extractedInfo };
    const input = userInput.trim();

    // Direct mapping based on current step if AI extraction didn't catch it
    switch (currentStep) {
      case "name":
        if (
          !processed.name &&
          input &&
          input.length < 100 &&
          !input.includes("@")
        ) {
          // Simple heuristic: if it looks like a name (2-3 words, no special chars)
          if (/^[a-zA-Z\s]{2,50}$/.test(input)) {
            processed.name = input;
          }
        }
        break;

      case "email":
        if (!processed.email) {
          const emailMatch = input.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
          );
          if (emailMatch) {
            processed.email = emailMatch[0];
          }
        }
        break;

      case "company":
        if (!processed.company && input && input.length < 200) {
          processed.company = input;
        }
        break;

      case "inquiry":
        if (!processed.inquiry && input) {
          processed.inquiry = input;
        }
        break;

      case "dateTime":
        if (!processed.dateTime) {
          const parsedDateTime = this.parseDateTime(input);
          if (parsedDateTime) {
            processed.dateTime = parsedDateTime;
          }
        }
        break;

      case "duration":
        if (!processed.duration) {
          const parsedDuration = this.parseDuration(input);
          if (parsedDuration) {
            processed.duration = parsedDuration;
          }
        }
        break;
    }

    return processed;
  }

  /**
   * Parse natural language date/time input
   * @param {string} input - User's date/time input
   * @returns {string|null} - ISO date string or null
   */
  parseDateTime(input) {
    const inputLower = input.toLowerCase();
    const now = new Date();

    try {
      // Handle "tomorrow"
      if (inputLower.includes("tomorrow")) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Extract time if mentioned
        const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2] || "0");
          const ampm = timeMatch[3]?.toLowerCase();

          if (ampm === "pm" && hour !== 12) hour += 12;
          if (ampm === "am" && hour === 12) hour = 0;

          tomorrow.setHours(hour, minute, 0, 0);
        } else {
          tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM
        }

        return tomorrow.toISOString();
      }

      // Handle "next week", "next monday", etc.
      if (inputLower.includes("next week")) {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(14, 0, 0, 0); // Default to 2 PM
        return nextWeek.toISOString();
      }

      // Handle specific days of the week
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
      for (let i = 0; i < days.length; i++) {
        if (inputLower.includes(days[i])) {
          const targetDay = new Date(now);
          const currentDay = now.getDay();
          const targetDayNum = i + 1; // Monday = 1, etc.

          let daysToAdd = targetDayNum - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week if day has passed

          targetDay.setDate(targetDay.getDate() + daysToAdd);
          targetDay.setHours(14, 0, 0, 0); // Default to 2 PM

          // Extract time if mentioned
          const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2] || "0");
            const ampm = timeMatch[3]?.toLowerCase();

            if (ampm === "pm" && hour !== 12) hour += 12;
            if (ampm === "am" && hour === 12) hour = 0;

            targetDay.setHours(hour, minute, 0, 0);
          }

          return targetDay.toISOString();
        }
      }

      // Try to parse as a regular date
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime()) && parsed > now) {
        return parsed.toISOString();
      }
    } catch (error) {
      console.error("Error parsing date/time:", error);
    }

    return null;
  }

  /**
   * Parse duration from natural language input
   * @param {string} input - User's duration input
   * @returns {number|null} - Duration in minutes or null
   */
  parseDuration(input) {
    const inputLower = input.toLowerCase();

    // Look for explicit numbers
    const numberMatch = input.match(
      /(\d+)\s*(min|minute|minutes|hour|hours)?/i
    );
    if (numberMatch) {
      let duration = parseInt(numberMatch[1]);
      const unit = numberMatch[2]?.toLowerCase();

      if (unit && unit.includes("hour")) {
        duration *= 60;
      }

      // Validate against allowed durations
      if (this.validDurations.includes(duration)) {
        return duration;
      }
    }

    // Handle common phrases
    if (inputLower.includes("half hour") || inputLower.includes("30")) {
      return 30;
    }
    if (inputLower.includes("hour") || inputLower.includes("60")) {
      return 60;
    }
    if (inputLower.includes("15") || inputLower.includes("quarter")) {
      return 15;
    }
    if (inputLower.includes("45")) {
      return 45;
    }

    return null;
  }

  /**
   * Determine the next step in the booking flow
   * @param {Object} bookingState - Current booking state
   * @returns {string} - Next step identifier
   */
  determineNextStep(bookingState) {
    const { data } = bookingState;
    const requiredFields = [
      "name",
      "email",
      "company",
      "inquiry",
      "dateTime",
      "duration",
    ];

    // Check which required field is missing
    for (const field of requiredFields) {
      if (
        !data[field] ||
        (typeof data[field] === "string" && data[field].trim() === "")
      ) {
        return field;
      }
    }

    // All fields present, move to confirmation
    return "confirmation";
  }

  /**
   * Generate appropriate response for the current step
   * @param {string} step - Current step
   * @param {Object} bookingState - Current booking state
   * @returns {Object} - Response object with message
   */
  generateStepResponse(step, bookingState) {
    const { data } = bookingState;

    const stepMessages = {
      name: {
        message:
          "I'd be happy to help you schedule a consultation! To get started, could you please tell me your full name?",
      },
      email: {
        message: `Thank you, ${data.name}! What's the best email address to reach you at?`,
      },
      company: {
        message: "Great! What's the name of your company or organization?",
      },
      inquiry: {
        message:
          "Perfect! Could you tell me a bit about your project or what service you're interested in? This will help us prepare for our conversation.",
      },
      dateTime: {
        message:
          "Excellent! When would you prefer to have this consultation? Please let me know your preferred date and time. We're available Monday to Friday, 9 AM to 6 PM.",
      },
      duration: {
        message:
          "How long would you like the meeting to be? We offer 15, 30, 45, or 60-minute consultations.",
      },
      confirmation: {
        message: this.generateConfirmationMessage(data),
      },
    };

    return (
      stepMessages[step] || {
        message:
          "I'm not sure what information I need next. Let me help you complete your booking.",
      }
    );
  }

  /**
   * Generate confirmation message with booking details
   * @param {Object} data - Booking data
   * @returns {string} - Confirmation message
   */
  generateConfirmationMessage(data) {
    const date = new Date(data.dateTime);
    const formattedDate = date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `Perfect! Let me confirm your booking details:

📅 **Consultation Details:**
• **Name:** ${data.name}
• **Email:** ${data.email}
• **Company:** ${data.company}
• **Project/Inquiry:** ${data.inquiry}
• **Date:** ${formattedDate}
• **Time:** ${formattedTime}
• **Duration:** ${data.duration} minutes

Does this look correct? If yes, I'll confirm your booking and send you a calendar invitation. If you need to change anything, just let me know!`;
  }

  /**
   * Check if all required booking data is present
   * @param {Object} data - Booking data
   * @returns {boolean} - True if complete
   */
  isBookingDataComplete(data) {
    const requiredFields = [
      "name",
      "email",
      "company",
      "inquiry",
      "dateTime",
      "duration",
    ];

    return requiredFields.every((field) => {
      const value = data[field];
      return value && (typeof value !== "string" || value.trim() !== "");
    });
  }

  /**
   * Confirm and create the booking
   * @param {string} sessionId - Session identifier
   * @returns {Object} - Booking creation result
   */
  confirmBooking(sessionId) {
    const bookingState = this.getBookingState(sessionId);

    if (!bookingState || !bookingState.isComplete) {
      return {
        success: false,
        message:
          "Booking information is incomplete. Please provide all required details first.",
      };
    }

    // Create the booking
    const result = this.createBooking(bookingState.data);

    if (result.success) {
      // Clear the booking state
      this.bookingStates.delete(sessionId);

      return {
        success: true,
        booking: result.booking,
        message: `🎉 **Booking Confirmed!**

Your consultation has been successfully scheduled. Here are your booking details:

**Booking ID:** ${result.booking.id}
**Date & Time:** ${new Date(result.booking.dateTime).toLocaleString("en-GB")}
**Duration:** ${result.booking.duration} minutes

You'll receive a calendar invitation shortly at ${result.booking.email}. 

We're looking forward to discussing your project with you! If you need to make any changes, please contact us at hello@metalogics.io or +44 7368 580133.`,
      };
    } else {
      return {
        success: false,
        message: `I'm sorry, there was an issue with your booking: ${result.errors.join(
          ", "
        )}. Please try again or contact us directly.`,
      };
    }
  }

  /**
   * Cancel booking flow for a session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} - Success status
   */
  cancelBookingFlow(sessionId) {
    return this.bookingStates.delete(sessionId);
  }

  /**
   * Get guided response for missing or invalid information
   * @param {string} field - Field that needs attention
   * @param {string} currentValue - Current value (if any)
   * @param {string} error - Error message (if validation failed)
   * @returns {string} - Guided response message
   */
  getGuidedResponse(field, currentValue = "", error = "") {
    const guidedMessages = {
      name: "I need your full name to proceed with the booking. Could you please provide your first and last name?",
      email: error
        ? `The email "${currentValue}" doesn't look valid. Could you please provide a valid email address?`
        : "I need your email address to send you the booking confirmation and calendar invitation.",
      company:
        "What's the name of your company or organization? If you're an individual, you can just put 'Individual' or 'Personal'.",
      inquiry:
        "Could you tell me more about your project or what service you're interested in? For example: website development, mobile app, SEO services, etc.",
      dateTime: error
        ? `${error}. Please choose a different date and time between Monday-Friday, 9 AM to 6 PM.`
        : "When would you like to schedule your consultation? Please provide your preferred date and time.",
      duration: error
        ? `${error}. Please choose from: 15, 30, 45, or 60 minutes.`
        : "How long would you like the consultation to be? We offer 15, 30, 45, or 60-minute sessions.",
    };

    return (
      guidedMessages[field] ||
      "I need some additional information to complete your booking."
    );
  }

  /**
   * Clear booking states (for testing purposes)
   */
  clearBookingStates() {
    this.bookingStates.clear();
  }
}

module.exports = BookingService;
