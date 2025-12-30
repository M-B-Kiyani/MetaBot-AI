const express = require("express");
const { body, validationResult } = require("express-validator");
const { serviceManager } = require("../services/serviceManager");
const logger = require("../utils/logger");
const { widgetMiddleware } = require("../middleware/widgetAuth");

const router = express.Router();

// Apply widget authentication middleware to all routes
router.use(widgetMiddleware);

/**
 * POST /api/chat
 * Handle chat messages and AI responses
 */
router.post(
  "/",
  [
    // Request validation
    body("message")
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Message must be between 1 and 1000 characters"),
    body("sessionId")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Session ID must be between 1 and 100 characters"),
    body("context")
      .optional()
      .isArray()
      .withMessage("Context must be an array"),
  ],
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn("Chat API validation failed", {
          errors: errors.array(),
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: errors.array(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { message, sessionId = "default", context = [] } = req.body;

      logger.info("Processing chat message", {
        sessionId,
        messageLength: message.length,
        hasContext: context.length > 0,
        ip: req.ip,
      });

      // Get services from service manager
      const aiService = serviceManager.getService("aiService");
      const bookingService = serviceManager.getService("bookingService");

      // Check for booking intent with circuit breaker protection
      const isBookingIntent = await serviceManager.executeServiceMethod(
        "aiService",
        "isBookingIntent",
        message
      );

      if (isBookingIntent) {
        // Handle booking flow with circuit breaker protection
        const extractedInfo = await serviceManager.executeServiceMethod(
          "aiService",
          "extractBookingInfo",
          message
        );

        const bookingResponse = bookingService.processBookingStep(
          sessionId,
          message,
          extractedInfo
        );

        logger.info("Booking intent detected", {
          sessionId,
          step: bookingResponse.step,
          isComplete: bookingResponse.isComplete,
          needsConfirmation: bookingResponse.needsConfirmation,
        });

        // Handle booking confirmation
        if (bookingResponse.needsConfirmation) {
          // Check if user is confirming the booking
          const confirmationKeywords = [
            "yes",
            "confirm",
            "correct",
            "right",
            "good",
            "ok",
            "okay",
            "looks good",
            "that's right",
          ];
          const isConfirming = confirmationKeywords.some((keyword) =>
            message.toLowerCase().includes(keyword)
          );

          if (isConfirming) {
            const confirmationResult = bookingService.confirmBooking(sessionId);

            if (confirmationResult.success) {
              logger.info("Booking confirmed successfully", {
                sessionId,
                bookingId: confirmationResult.booking.id,
              });

              return res.json({
                success: true,
                response: {
                  message: confirmationResult.message,
                  type: "booking_confirmed",
                  bookingId: confirmationResult.booking.id,
                  booking: confirmationResult.booking,
                },
                timestamp: new Date().toISOString(),
              });
            } else {
              logger.warn("Booking confirmation failed", {
                sessionId,
                error: confirmationResult.message,
              });

              return res.json({
                success: true,
                response: {
                  message: confirmationResult.message,
                  type: "booking_error",
                },
                timestamp: new Date().toISOString(),
              });
            }
          }
        }

        return res.json({
          success: true,
          response: {
            message: bookingResponse.message,
            type: "booking_flow",
            step: bookingResponse.step,
            isComplete: bookingResponse.isComplete,
            needsConfirmation: bookingResponse.needsConfirmation,
            data: bookingResponse.data,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Generate regular AI response with circuit breaker protection
      const aiResponse = await serviceManager.executeServiceMethod(
        "aiService",
        "generateResponse",
        message,
        sessionId
      );

      logger.info("AI response generated", {
        sessionId,
        responseLength: aiResponse.length,
      });

      return res.json({
        success: true,
        response: {
          message: aiResponse,
          type: "ai_response",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error processing chat message", {
        error: error.message,
        stack: error.stack,
        sessionId: req.body?.sessionId,
        ip: req.ip,
        circuitBreakerOpen: error.circuitBreakerOpen || false,
      });

      // Return fallback response
      let fallbackResponse;
      try {
        const aiService = serviceManager.getService("aiService");
        fallbackResponse = aiService.getFallbackResponse();
      } catch (fallbackError) {
        fallbackResponse =
          "I'm sorry, I'm currently experiencing technical difficulties. Please try again later or contact us at hello@metalogics.io.";
      }

      return res.status(500).json({
        success: false,
        error: {
          code: error.circuitBreakerOpen
            ? "SERVICE_CIRCUIT_OPEN"
            : "INTERNAL_ERROR",
          message: error.circuitBreakerOpen
            ? "Service temporarily unavailable due to high error rate"
            : "Unable to process your message at this time",
          timestamp: new Date().toISOString(),
        },
        response: {
          message: fallbackResponse,
          type: "fallback_response",
        },
      });
    }
  }
);

/**
 * POST /api/chat/context/clear
 * Clear conversation context for a session
 */
router.post(
  "/context/clear",
  [
    body("sessionId")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage(
        "Session ID is required and must be between 1 and 100 characters"
      ),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: errors.array(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { sessionId } = req.body;

      // Get services from service manager
      const aiService = serviceManager.getService("aiService");
      const bookingService = serviceManager.getService("bookingService");

      // Clear AI conversation context
      aiService.clearContext(sessionId);

      // Clear booking flow state
      bookingService.cancelBookingFlow(sessionId);

      logger.info("Context cleared", { sessionId, ip: req.ip });

      return res.json({
        success: true,
        message: "Context cleared successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error clearing context", {
        error: error.message,
        sessionId: req.body?.sessionId,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to clear context",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * GET /api/chat/context/:sessionId
 * Get conversation context for a session
 */
router.get("/context/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || sessionId.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid session ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get services from service manager
    const aiService = serviceManager.getService("aiService");
    const bookingService = serviceManager.getService("bookingService");

    const context = aiService.getContext(sessionId);
    const bookingState = bookingService.getBookingState(sessionId);

    return res.json({
      success: true,
      data: {
        sessionId,
        conversationContext: context,
        bookingState: bookingState,
        hasActiveBooking: bookingState && !bookingState.isComplete,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error getting context", {
      error: error.message,
      sessionId: req.params.sessionId,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to retrieve context",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

module.exports = router;
