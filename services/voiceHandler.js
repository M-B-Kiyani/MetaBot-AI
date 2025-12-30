const axios = require("axios");
const crypto = require("crypto");

class VoiceHandler {
  constructor(bookingService, aiService, calendarService, leadManager) {
    this.bookingService = bookingService;
    this.aiService = aiService;
    this.calendarService = calendarService;
    this.leadManager = leadManager;
    this.retellApiKey = process.env.RETELL_API_KEY;
    this.retellWebhookSecret = process.env.RETELL_WEBHOOK_SECRET;
    this.retellApiUrl = "https://api.retellai.com/v2";

    // Voice session states for tracking conversations
    this.voiceSessions = new Map();
  }

  /**
   * Verify webhook signature from Retell AI
   * @param {string} payload - Raw request body
   * @param {string} signature - Signature from request headers
   * @returns {boolean} - True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.retellWebhookSecret) {
      console.warn(
        "Retell webhook secret not configured, skipping signature verification"
      );
      return true; // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.retellWebhookSecret)
        .update(payload, "utf8")
        .digest("hex");

      const providedSignature = signature.replace("sha256=", "");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex")
      );
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return false;
    }
  }

  /**
   * Handle incoming webhook from Retell AI
   * @param {Object} webhookData - Webhook payload from Retell
   * @param {string} signature - Webhook signature
   * @returns {Object} - Response for Retell AI
   */
  async handleWebhook(webhookData, signature) {
    try {
      // Verify webhook signature
      if (
        !this.verifyWebhookSignature(JSON.stringify(webhookData), signature)
      ) {
        console.error("Invalid webhook signature");
        return {
          success: false,
          error: "Invalid signature",
        };
      }

      const { event_type, call_id, transcript, user_message } = webhookData;

      console.log(`Received Retell webhook: ${event_type} for call ${call_id}`);

      switch (event_type) {
        case "call_started":
          return await this.handleCallStarted(call_id, webhookData);

        case "call_ended":
          return await this.handleCallEnded(call_id, webhookData);

        case "user_message":
          return await this.handleUserMessage(
            call_id,
            user_message,
            webhookData
          );

        case "transcript_update":
          return await this.handleTranscriptUpdate(
            call_id,
            transcript,
            webhookData
          );

        default:
          console.log(`Unhandled webhook event: ${event_type}`);
          return { success: true, message: "Event received" };
      }
    } catch (error) {
      console.error("Error handling Retell webhook:", error);
      return {
        success: false,
        error: "Internal server error",
        message:
          "I'm sorry, I'm experiencing technical difficulties. Please try again or contact us at hello@metalogics.io.",
      };
    }
  }

  /**
   * Handle call started event
   * @param {string} callId - Retell call ID
   * @param {Object} webhookData - Full webhook data
   * @returns {Object} - Response with initial greeting
   */
  async handleCallStarted(callId, webhookData) {
    try {
      // Initialize voice session
      const voiceSession = {
        callId,
        sessionId: `voice_${callId}`,
        startTime: new Date(),
        bookingInProgress: false,
        conversationHistory: [],
        bookingData: {},
      };

      this.voiceSessions.set(callId, voiceSession);

      // Generate initial greeting
      const greeting = await this.generateVoiceGreeting();

      return {
        success: true,
        response: {
          message: greeting,
          end_call: false,
        },
      };
    } catch (error) {
      console.error("Error handling call started:", error);
      return {
        success: false,
        error: "Failed to initialize call",
      };
    }
  }

  /**
   * Handle call ended event
   * @param {string} callId - Retell call ID
   * @param {Object} webhookData - Full webhook data
   * @returns {Object} - Response acknowledging call end
   */
  async handleCallEnded(callId, webhookData) {
    try {
      const voiceSession = this.voiceSessions.get(callId);

      if (voiceSession) {
        console.log(
          `Voice call ${callId} ended. Duration: ${
            Date.now() - voiceSession.startTime.getTime()
          }ms`
        );

        // Clean up session
        this.voiceSessions.delete(callId);

        // Clean up any booking state
        if (voiceSession.bookingInProgress) {
          this.bookingService.cancelBookingFlow(voiceSession.sessionId);
        }
      }

      return {
        success: true,
        message: "Call ended successfully",
      };
    } catch (error) {
      console.error("Error handling call ended:", error);
      return {
        success: false,
        error: "Failed to end call properly",
      };
    }
  }

  /**
   * Handle user message from voice call
   * @param {string} callId - Retell call ID
   * @param {string} userMessage - Transcribed user message
   * @param {Object} webhookData - Full webhook data
   * @returns {Object} - Response with AI-generated reply
   */
  async handleUserMessage(callId, userMessage, webhookData) {
    try {
      const voiceSession = this.voiceSessions.get(callId);

      if (!voiceSession) {
        console.error(`No voice session found for call ${callId}`);
        return {
          success: false,
          error: "Session not found",
        };
      }

      // Add user message to conversation history
      voiceSession.conversationHistory.push({
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      });

      // Process the voice message through the same logic as chat
      const response = await this.processVoiceMessage(callId, userMessage);

      // Add assistant response to conversation history
      voiceSession.conversationHistory.push({
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
      });

      return {
        success: true,
        response: {
          message: response.message,
          end_call: response.endCall || false,
        },
      };
    } catch (error) {
      console.error("Error handling user message:", error);
      return {
        success: false,
        error: "Failed to process message",
        response: {
          message:
            "I'm sorry, I didn't catch that. Could you please repeat your message?",
          end_call: false,
        },
      };
    }
  }

  /**
   * Handle transcript update from voice call
   * @param {string} callId - Retell call ID
   * @param {string} transcript - Updated transcript
   * @param {Object} webhookData - Full webhook data
   * @returns {Object} - Acknowledgment response
   */
  async handleTranscriptUpdate(callId, transcript, webhookData) {
    try {
      const voiceSession = this.voiceSessions.get(callId);

      if (voiceSession) {
        voiceSession.fullTranscript = transcript;
        voiceSession.lastUpdate = new Date();
      }

      return {
        success: true,
        message: "Transcript updated",
      };
    } catch (error) {
      console.error("Error handling transcript update:", error);
      return {
        success: false,
        error: "Failed to update transcript",
      };
    }
  }

  /**
   * Process voice message through AI and booking logic
   * @param {string} callId - Retell call ID
   * @param {string} userMessage - User's voice message
   * @returns {Object} - Processed response
   */
  async processVoiceMessage(callId, userMessage) {
    try {
      const voiceSession = this.voiceSessions.get(callId);

      if (!voiceSession) {
        throw new Error("Voice session not found");
      }

      // Check for booking intent
      const isBookingIntent = await this.aiService.isBookingIntent(userMessage);

      if (isBookingIntent || voiceSession.bookingInProgress) {
        return await this.processVoiceBooking(callId, userMessage);
      }

      // Generate regular AI response for non-booking queries
      const aiResponse = await this.aiService.generateResponse(
        userMessage,
        voiceSession.sessionId
      );

      // Adapt response for voice (make it more conversational)
      const voiceResponse = await this.adaptResponseForVoice(aiResponse);

      return {
        message: voiceResponse,
        endCall: false,
      };
    } catch (error) {
      console.error("Error processing voice message:", error);
      return {
        message:
          "I'm sorry, I'm having trouble processing your request. Could you please try again?",
        endCall: false,
      };
    }
  }

  /**
   * Process voice booking flow
   * @param {string} callId - Retell call ID
   * @param {string} userMessage - User's message
   * @returns {Object} - Booking flow response
   */
  async processVoiceBooking(callId, userMessage) {
    try {
      const voiceSession = this.voiceSessions.get(callId);
      voiceSession.bookingInProgress = true;

      // Extract booking information from the message
      const currentBookingState = this.bookingService.getBookingState(
        voiceSession.sessionId
      );
      const currentData = currentBookingState ? currentBookingState.data : {};

      const extractedInfo = await this.aiService.extractBookingInfo(
        userMessage,
        currentData
      );

      // Process booking step
      const bookingResponse = this.bookingService.processBookingStep(
        voiceSession.sessionId,
        userMessage,
        extractedInfo
      );

      // Handle booking completion
      if (bookingResponse.needsConfirmation) {
        const voiceConfirmation = await this.adaptBookingConfirmationForVoice(
          bookingResponse.message
        );
        return {
          message: voiceConfirmation,
          endCall: false,
        };
      }

      if (bookingResponse.isComplete) {
        // Confirm the booking and trigger integrations
        const confirmationResult = this.bookingService.confirmBooking(
          voiceSession.sessionId
        );

        if (confirmationResult.success) {
          // Wire voice bookings to HubSpot lead creation and calendar event creation
          const integrationResults = await this.processVoiceBookingIntegrations(
            confirmationResult.booking
          );

          voiceSession.bookingInProgress = false;
          const successMessage = await this.generateVoiceBookingSuccess(
            confirmationResult.booking,
            integrationResults
          );

          return {
            message: successMessage,
            endCall: true, // End call after successful booking
          };
        } else {
          return {
            message: `I'm sorry, there was an issue with your booking: ${confirmationResult.message}. Would you like to try again?`,
            endCall: false,
          };
        }
      }

      // Adapt booking step response for voice
      const voiceResponse = await this.adaptResponseForVoice(
        bookingResponse.message
      );

      return {
        message: voiceResponse,
        endCall: false,
      };
    } catch (error) {
      console.error("Error processing voice booking:", error);
      return {
        message:
          "I'm sorry, I'm having trouble with your booking request. Let me transfer you to our team. Please call us at +44 7368 580133.",
        endCall: true,
      };
    }
  }

  /**
   * Generate initial voice greeting
   * @returns {string} - Voice greeting message
   */
  async generateVoiceGreeting() {
    const greetings = [
      "Hello! Thank you for calling Metalogics.io. I'm your AI assistant, and I'm here to help you learn about our digital development services or schedule a consultation. How can I assist you today?",
      "Hi there! Welcome to Metalogics.io. I'm an AI assistant ready to help you with information about our web development, mobile apps, and digital marketing services. What would you like to know?",
      "Good day! You've reached Metalogics.io. I'm here to help you discover our digital solutions and can even help you book a consultation with our team. What brings you to us today?",
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Adapt text response for voice interaction
   * @param {string} textResponse - Original text response
   * @returns {string} - Voice-adapted response
   */
  async adaptResponseForVoice(textResponse) {
    try {
      // Remove markdown formatting
      let voiceResponse = textResponse
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/#{1,6}\s/g, "") // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks
        .replace(/`([^`]+)`/g, "$1") // Remove inline code
        .replace(/^\s*[-*+]\s/gm, "") // Remove bullet points
        .replace(/^\s*\d+\.\s/gm, "") // Remove numbered lists
        .replace(/\n{2,}/g, ". ") // Replace multiple newlines with periods
        .replace(/\n/g, ". ") // Replace single newlines with periods
        .replace(/\.\s*\./g, ".") // Remove duplicate periods
        .trim();

      // Make it more conversational for voice
      voiceResponse = voiceResponse
        .replace(/Please let me know/g, "Just let me know")
        .replace(/Could you please/g, "Could you")
        .replace(/I would be happy to/g, "I'd be happy to")
        .replace(/You can contact us/g, "You can reach us")
        .replace(/\bhello@metalogics\.io\b/g, "hello at metalogics dot i o");

      // Ensure it ends properly for voice
      if (
        !voiceResponse.endsWith(".") &&
        !voiceResponse.endsWith("?") &&
        !voiceResponse.endsWith("!")
      ) {
        voiceResponse += ".";
      }

      return voiceResponse;
    } catch (error) {
      console.error("Error adapting response for voice:", error);
      return textResponse;
    }
  }

  /**
   * Adapt booking confirmation for voice
   * @param {string} confirmationMessage - Original confirmation message
   * @returns {string} - Voice-adapted confirmation
   */
  async adaptBookingConfirmationForVoice(confirmationMessage) {
    try {
      let voiceConfirmation = await this.adaptResponseForVoice(
        confirmationMessage
      );

      // Add voice-specific confirmation request
      voiceConfirmation +=
        " Please say 'yes' to confirm this booking, or tell me what you'd like to change.";

      return voiceConfirmation;
    } catch (error) {
      console.error("Error adapting booking confirmation for voice:", error);
      return confirmationMessage;
    }
  }

  /**
   * Process voice booking integrations with HubSpot and Calendar
   * @param {Object} booking - Booking object
   * @returns {Object} - Integration results
   */
  async processVoiceBookingIntegrations(booking) {
    const integrationResults = {
      calendar: {
        success: false,
        error: null,
        eventId: null,
        meetingLink: null,
      },
      hubspot: { success: false, error: null, contactId: null },
    };

    // Add source information for voice bookings
    const bookingWithSource = {
      ...booking,
      source: "voice",
    };

    try {
      // Wire voice bookings to calendar event creation
      console.log(`Creating calendar event for voice booking: ${booking.id}`);

      if (this.calendarService) {
        const calendarResult = await this.calendarService.createEvent(
          bookingWithSource
        );

        if (calendarResult.success) {
          integrationResults.calendar.success = true;
          integrationResults.calendar.eventId = calendarResult.eventId;
          integrationResults.calendar.meetingLink = calendarResult.meetingLink;

          // Update booking with calendar event ID
          booking.calendarEventId = calendarResult.eventId;

          console.log(
            `Calendar event created successfully for voice booking: ${calendarResult.eventId}`
          );
        } else {
          integrationResults.calendar.error = calendarResult.error;
          console.warn(
            `Calendar event creation failed for voice booking: ${calendarResult.error}`
          );
        }
      } else {
        integrationResults.calendar.error = "Calendar service not available";
        console.warn("Calendar service not available for voice booking");
      }
    } catch (error) {
      integrationResults.calendar.error = error.message;
      console.error("Error creating calendar event for voice booking:", error);
    }

    try {
      // Wire voice bookings to HubSpot lead creation
      console.log(
        `Creating HubSpot contact for voice booking: ${booking.email}`
      );

      if (this.leadManager) {
        const hubspotResult = await this.leadManager.createOrUpdateContact(
          bookingWithSource
        );

        if (hubspotResult.success) {
          integrationResults.hubspot.success = true;
          integrationResults.hubspot.contactId = hubspotResult.contactId;

          // Update booking with HubSpot contact ID
          booking.hubspotContactId = hubspotResult.contactId;

          console.log(
            `HubSpot contact ${
              hubspotResult.created ? "created" : "updated"
            } successfully for voice booking: ${hubspotResult.contactId}`
          );
        } else if (!hubspotResult.skipped) {
          integrationResults.hubspot.error = hubspotResult.error;
          console.warn(
            `HubSpot contact management failed for voice booking: ${hubspotResult.error}`
          );
        }
      } else {
        integrationResults.hubspot.error = "HubSpot service not available";
        console.warn("HubSpot service not available for voice booking");
      }
    } catch (error) {
      integrationResults.hubspot.error = error.message;
      console.error("Error creating HubSpot contact for voice booking:", error);
    }

    // Log integration summary
    console.log("Voice booking integration results:", {
      bookingId: booking.id,
      calendar: integrationResults.calendar.success ? "success" : "failed",
      hubspot: integrationResults.hubspot.success ? "success" : "failed",
      calendarEventId: integrationResults.calendar.eventId,
      hubspotContactId: integrationResults.hubspot.contactId,
    });

    return integrationResults;
  }

  /**
   * Generate voice booking success message
   * @param {Object} booking - Booking object
   * @param {Object} integrationResults - Results from calendar and HubSpot integrations
   * @returns {string} - Success message for voice
   */
  async generateVoiceBookingSuccess(booking, integrationResults = {}) {
    const date = new Date(booking.dateTime);
    const formattedDate = date.toLocaleDateString("en-GB", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let successMessage = `Excellent! Your consultation has been successfully booked for ${formattedDate} at ${formattedTime}.`;

    // Add calendar confirmation if successful
    if (integrationResults.calendar && integrationResults.calendar.success) {
      successMessage += ` You'll receive a calendar invitation at ${booking.email} shortly.`;

      if (integrationResults.calendar.meetingLink) {
        successMessage += ` The meeting will include a video conference link.`;
      }
    } else {
      successMessage += ` We'll send you the meeting details at ${booking.email}.`;
    }

    // Add HubSpot confirmation if successful
    if (integrationResults.hubspot && integrationResults.hubspot.success) {
      successMessage += ` Your information has been added to our system for follow-up.`;
    }

    successMessage += ` We're looking forward to discussing your project with you. Thank you for choosing Metalogics.io, and have a great day!`;

    return successMessage;
  }

  /**
   * Get voice session information
   * @param {string} callId - Retell call ID
   * @returns {Object|null} - Voice session data
   */
  getVoiceSession(callId) {
    return this.voiceSessions.get(callId) || null;
  }

  /**
   * Clear voice session
   * @param {string} callId - Retell call ID
   * @returns {boolean} - Success status
   */
  clearVoiceSession(callId) {
    return this.voiceSessions.delete(callId);
  }

  /**
   * Get all active voice sessions (for monitoring)
   * @returns {Array} - Array of active sessions
   */
  getActiveSessions() {
    return Array.from(this.voiceSessions.values());
  }

  /**
   * Clean up expired sessions (older than 1 hour)
   */
  cleanupExpiredSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [callId, session] of this.voiceSessions) {
      if (session.startTime < oneHourAgo) {
        console.log(`Cleaning up expired voice session: ${callId}`);
        this.voiceSessions.delete(callId);

        // Clean up associated booking state
        if (session.bookingInProgress) {
          this.bookingService.cancelBookingFlow(session.sessionId);
        }
      }
    }
  }
  /**
   * Generate voice confirmation response for successful booking
   * @param {Object} booking - Booking object
   * @param {Object} integrationResults - Integration results
   * @returns {string} - Voice confirmation message
   */
  generateVoiceConfirmationResponse(booking, integrationResults) {
    const date = new Date(booking.dateTime);
    const formattedDate = date.toLocaleDateString("en-GB", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let confirmationMessage = `Perfect! I've successfully scheduled your consultation for ${formattedDate} at ${formattedTime}.`;

    // Add integration-specific confirmations
    if (integrationResults.calendar && integrationResults.calendar.success) {
      confirmationMessage += ` A calendar invitation has been sent to ${booking.email}.`;

      if (integrationResults.calendar.meetingLink) {
        confirmationMessage += ` The invitation includes a video conference link for your convenience.`;
      }
    }

    if (integrationResults.hubspot && integrationResults.hubspot.success) {
      confirmationMessage += ` Your details have been securely stored in our system.`;
    }

    confirmationMessage += ` Our team is excited to discuss your ${booking.inquiry} project with you. If you need to make any changes before the meeting, please contact us at hello@metalogics.io or +44 7368 580133. Thank you for choosing Metalogics.io!`;

    return confirmationMessage;
  }

  /**
   * Handle voice booking confirmation (when user says "yes" to confirm)
   * @param {string} callId - Retell call ID
   * @param {string} userResponse - User's confirmation response
   * @returns {Object} - Confirmation response
   */
  async handleVoiceBookingConfirmation(callId, userResponse) {
    try {
      const voiceSession = this.voiceSessions.get(callId);

      if (!voiceSession || !voiceSession.bookingInProgress) {
        return {
          message:
            "I don't have any booking to confirm right now. How can I help you?",
          endCall: false,
        };
      }

      // Check if user is confirming (yes, confirm, correct, etc.)
      const confirmationKeywords = [
        "yes",
        "confirm",
        "correct",
        "right",
        "good",
        "ok",
        "okay",
      ];
      const isConfirming = confirmationKeywords.some((keyword) =>
        userResponse.toLowerCase().includes(keyword)
      );

      if (isConfirming) {
        // Process the booking confirmation
        const confirmationResult = this.bookingService.confirmBooking(
          voiceSession.sessionId
        );

        if (confirmationResult.success) {
          // Process integrations
          const integrationResults = await this.processVoiceBookingIntegrations(
            confirmationResult.booking
          );

          voiceSession.bookingInProgress = false;
          const confirmationMessage = this.generateVoiceConfirmationResponse(
            confirmationResult.booking,
            integrationResults
          );

          return {
            message: confirmationMessage,
            endCall: true,
          };
        } else {
          return {
            message: `I'm sorry, there was an issue confirming your booking: ${confirmationResult.message}. Would you like to try again?`,
            endCall: false,
          };
        }
      } else {
        // User wants to make changes
        return {
          message:
            "No problem! What would you like to change about your booking? You can update your name, email, company, project details, date, time, or meeting duration.",
          endCall: false,
        };
      }
    } catch (error) {
      console.error("Error handling voice booking confirmation:", error);
      return {
        message:
          "I'm sorry, I'm having trouble processing your confirmation. Please contact us directly at +44 7368 580133 to complete your booking.",
        endCall: true,
      };
    }
  }
}

module.exports = VoiceHandler;
