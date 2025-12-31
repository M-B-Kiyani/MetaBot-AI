const express = require("express");
const { body, validationResult } = require("express-validator");
const { serviceManager } = require("../services/serviceManager");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/voice/webhook
 * Handle webhooks from Retell AI
 */
router.post("/webhook", async (req, res) => {
  try {
    // Get signature from headers
    const signature =
      req.get("X-Retell-Signature") || req.get("x-retell-signature");

    if (
      !signature &&
      process.env.NODE_ENV === "production" &&
      process.env.RETELL_WEBHOOK_SECRET
    ) {
      logger.warn("Missing webhook signature", { ip: req.ip });
      return res.status(401).json({
        success: false,
        error: {
          code: "MISSING_SIGNATURE",
          message: "Webhook signature required",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Parse the body (handle both raw and JSON)
    let webhookData;
    try {
      if (typeof req.body === "string") {
        webhookData = JSON.parse(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        webhookData = JSON.parse(req.body.toString());
      } else if (typeof req.body === "object") {
        webhookData = req.body;
      } else {
        throw new Error("Invalid body format");
      }
    } catch (parseError) {
      logger.error("Invalid webhook JSON", {
        error: parseError.message,
        bodyType: typeof req.body,
        body: req.body?.toString?.() || req.body,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON payload",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate required webhook fields
    const { event_type, call_id } = webhookData;

    if (!event_type || !call_id) {
      logger.warn("Missing required webhook fields", {
        event_type,
        call_id,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Missing required webhook fields (event_type, call_id)",
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info("Received Retell webhook", {
      event_type,
      call_id,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    // Get voice handler from service manager
    const voiceHandler = serviceManager.getService("voiceHandler");

    // Process webhook through voice handler
    const result = await voiceHandler.handleWebhook(
      webhookData,
      signature || ""
    );

    if (!result.success) {
      logger.error("Voice handler failed", {
        event_type,
        call_id,
        error: result.error,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_PROCESSING_FAILED",
          message: result.error || "Failed to process webhook",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Return appropriate response based on event type
    if (result.response) {
      logger.info("Webhook processed successfully with response", {
        event_type,
        call_id,
        hasMessage: !!result.response.message,
        endCall: result.response.end_call,
      });

      return res.json({
        success: true,
        response: result.response,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.info("Webhook processed successfully", {
        event_type,
        call_id,
        message: result.message,
      });

      return res.json({
        success: true,
        message: result.message || "Webhook processed successfully",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("Error processing voice webhook", {
      error: error.message,
      stack: error.stack,
      body: req.body?.toString(),
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to process webhook",
        timestamp: new Date().toISOString(),
      },
      response: {
        message:
          "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
        end_call: false,
      },
    });
  }
});

/**
 * GET /api/voice/sessions
 * Get active voice sessions (for monitoring)
 */
router.get("/sessions", async (req, res) => {
  try {
    // This endpoint might be used for monitoring/debugging
    // In production, you might want to add authentication

    // Get voice handler from service manager
    const voiceHandler = serviceManager.getService("voiceHandler");
    const activeSessions = voiceHandler.getActiveSessions();

    logger.info("Voice sessions requested", {
      activeSessionCount: activeSessions.length,
      ip: req.ip,
    });

    return res.json({
      success: true,
      data: {
        activeSessions: activeSessions.map((session) => ({
          callId: session.callId,
          sessionId: session.sessionId,
          startTime: session.startTime,
          bookingInProgress: session.bookingInProgress,
          conversationLength: session.conversationHistory?.length || 0,
        })),
        totalActiveSessions: activeSessions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error getting voice sessions", {
      error: error.message,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to retrieve voice sessions",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/voice/session/:callId
 * Get specific voice session details
 */
router.get("/session/:callId", async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callId || callId.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid call ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get voice handler from service manager
    const voiceHandler = serviceManager.getService("voiceHandler");
    const voiceSession = voiceHandler.getVoiceSession(callId);

    if (!voiceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Voice session not found",
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info("Voice session retrieved", {
      callId,
      sessionId: voiceSession.sessionId,
      ip: req.ip,
    });

    return res.json({
      success: true,
      data: {
        session: {
          callId: voiceSession.callId,
          sessionId: voiceSession.sessionId,
          startTime: voiceSession.startTime,
          bookingInProgress: voiceSession.bookingInProgress,
          conversationHistory: voiceSession.conversationHistory,
          bookingData: voiceSession.bookingData,
          fullTranscript: voiceSession.fullTranscript,
          lastUpdate: voiceSession.lastUpdate,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving voice session", {
      error: error.message,
      callId: req.params.callId,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to retrieve voice session",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * DELETE /api/voice/session/:callId
 * Clear/end a voice session
 */
router.delete("/session/:callId", async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callId || callId.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid call ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get voice handler from service manager
    const voiceHandler = serviceManager.getService("voiceHandler");
    const sessionExists = voiceHandler.getVoiceSession(callId);

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Voice session not found",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Clear the voice session
    const cleared = voiceHandler.clearVoiceSession(callId);

    if (cleared) {
      logger.info("Voice session cleared", {
        callId,
        ip: req.ip,
      });

      return res.json({
        success: true,
        message: "Voice session cleared successfully",
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: "CLEAR_FAILED",
          message: "Failed to clear voice session",
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    logger.error("Error clearing voice session", {
      error: error.message,
      callId: req.params.callId,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to clear voice session",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/voice/cleanup
 * Clean up expired voice sessions
 */
router.post("/cleanup", async (req, res) => {
  try {
    // This endpoint can be called periodically to clean up expired sessions
    // In production, this might be triggered by a cron job or scheduled task

    // Get voice handler from service manager
    const voiceHandler = serviceManager.getService("voiceHandler");
    const beforeCount = voiceHandler.getActiveSessions().length;

    voiceHandler.cleanupExpiredSessions();

    const afterCount = voiceHandler.getActiveSessions().length;
    const cleanedCount = beforeCount - afterCount;

    logger.info("Voice session cleanup completed", {
      beforeCount,
      afterCount,
      cleanedCount,
      ip: req.ip,
    });

    return res.json({
      success: true,
      data: {
        sessionsBeforeCleanup: beforeCount,
        sessionsAfterCleanup: afterCount,
        sessionsCleaned: cleanedCount,
      },
      message: `Cleaned up ${cleanedCount} expired voice sessions`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error during voice session cleanup", {
      error: error.message,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to cleanup voice sessions",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

module.exports = router;
