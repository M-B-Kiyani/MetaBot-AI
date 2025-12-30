const express = require("express");
const { body, query, validationResult } = require("express-validator");
const BookingService = require("../services/bookingService");
const CalendarService = require("../services/calendarService");
const LeadManager = require("../services/leadManager");
const logger = require("../utils/logger");
const { widgetMiddleware } = require("../middleware/widgetAuth");

const router = express.Router();

// Apply widget authentication middleware to all routes
router.use(widgetMiddleware);

// Initialize services
const bookingService = new BookingService();
const calendarService = new CalendarService();
const leadManager = new LeadManager();

/**
 * POST /api/booking
 * Create a new booking
 */
router.post(
  "/",
  [
    // Request validation
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name is required and must be between 1 and 100 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email address is required"),
    body("company")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage(
        "Company is required and must be between 1 and 200 characters"
      ),
    body("inquiry")
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage(
        "Inquiry is required and must be between 1 and 1000 characters"
      ),
    body("dateTime")
      .isISO8601()
      .withMessage("Valid ISO 8601 date/time is required"),
    body("duration")
      .isInt({ min: 15, max: 60 })
      .custom((value) => {
        const validDurations = [15, 30, 45, 60];
        if (!validDurations.includes(parseInt(value))) {
          throw new Error("Duration must be 15, 30, 45, or 60 minutes");
        }
        return true;
      }),
    body("phone")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Phone number must be less than 20 characters"),
  ],
  async (req, res) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn("Booking API validation failed", {
          errors: errors.array(),
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid booking data",
            details: errors.array(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      const bookingData = req.body;

      logger.info("Creating new booking", {
        email: bookingData.email,
        company: bookingData.company,
        dateTime: bookingData.dateTime,
        duration: bookingData.duration,
        ip: req.ip,
      });

      // Create the booking
      const bookingResult = bookingService.createBooking(bookingData);

      if (!bookingResult.success) {
        logger.warn("Booking creation failed", {
          errors: bookingResult.errors,
          email: bookingData.email,
        });

        return res.status(400).json({
          success: false,
          error: {
            code: "BOOKING_ERROR",
            message: "Unable to create booking",
            details: bookingResult.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const booking = bookingResult.booking;

      // Process integrations in parallel
      const integrationResults = await processBookingIntegrations(booking);

      // Update booking status to confirmed if integrations succeeded
      if (
        integrationResults.calendar.success ||
        integrationResults.hubspot.success
      ) {
        bookingService.updateBookingStatus(booking.id, "confirmed");
        booking.status = "confirmed";
      }

      logger.info("Booking created successfully", {
        bookingId: booking.id,
        email: booking.email,
        calendarSuccess: integrationResults.calendar.success,
        hubspotSuccess: integrationResults.hubspot.success,
      });

      return res.status(201).json({
        success: true,
        data: {
          booking: {
            id: booking.id,
            name: booking.name,
            email: booking.email,
            company: booking.company,
            inquiry: booking.inquiry,
            dateTime: booking.dateTime,
            duration: booking.duration,
            status: booking.status,
            createdAt: booking.createdAt,
          },
          integrations: {
            calendar: {
              success: integrationResults.calendar.success,
              eventId: integrationResults.calendar.eventId,
              meetingLink: integrationResults.calendar.meetingLink,
            },
            hubspot: {
              success: integrationResults.hubspot.success,
              contactId: integrationResults.hubspot.contactId,
            },
          },
        },
        message: "Booking created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error creating booking", {
        error: error.message,
        stack: error.stack,
        bookingData: req.body,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to create booking at this time",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * GET /api/booking/availability
 * Get available time slots for a given date
 */
router.get(
  "/availability",
  [
    query("date")
      .isISO8601({ strict: true })
      .withMessage("Valid ISO 8601 date is required"),
    query("duration")
      .optional()
      .isInt({ min: 15, max: 60 })
      .custom((value) => {
        if (value) {
          const validDurations = [15, 30, 45, 60];
          if (!validDurations.includes(parseInt(value))) {
            throw new Error("Duration must be 15, 30, 45, or 60 minutes");
          }
        }
        return true;
      }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: errors.array(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { date, duration = 30 } = req.query;
      const requestedDate = new Date(date);

      logger.info("Checking availability", {
        date: requestedDate.toISOString(),
        duration: parseInt(duration),
        ip: req.ip,
      });

      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      requestedDate.setHours(0, 0, 0, 0);

      if (requestedDate < today) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE",
            message: "Cannot check availability for past dates",
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check if date is a weekend
      const dayOfWeek = requestedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.json({
          success: true,
          data: {
            date: date,
            duration: parseInt(duration),
            availableSlots: [],
            message:
              "No availability on weekends. We're open Monday to Friday.",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get available slots
      const availableSlots = bookingService.getAvailableSlots(
        requestedDate,
        parseInt(duration)
      );

      return res.json({
        success: true,
        data: {
          date: date,
          duration: parseInt(duration),
          availableSlots: availableSlots,
          totalSlots: availableSlots.length,
          businessHours: "9:00 AM - 6:00 PM (Monday to Friday)",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error checking availability", {
        error: error.message,
        date: req.query.date,
        duration: req.query.duration,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to check availability",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * GET /api/booking/:bookingId
 * Get booking details by ID
 */
router.get("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId || bookingId.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid booking ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const booking = bookingService.getBooking(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info("Booking retrieved", {
      bookingId: booking.id,
      status: booking.status,
      ip: req.ip,
    });

    return res.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          name: booking.name,
          email: booking.email,
          company: booking.company,
          inquiry: booking.inquiry,
          dateTime: booking.dateTime,
          duration: booking.duration,
          status: booking.status,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving booking", {
      error: error.message,
      bookingId: req.params.bookingId,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to retrieve booking",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * PUT /api/booking/:bookingId/status
 * Update booking status
 */
router.put(
  "/:bookingId/status",
  [
    body("status")
      .isIn(["pending", "confirmed", "cancelled"])
      .withMessage("Status must be pending, confirmed, or cancelled"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status",
            details: errors.array(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { bookingId } = req.params;
      const { status } = req.body;

      const booking = bookingService.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BOOKING_NOT_FOUND",
            message: "Booking not found",
            timestamp: new Date().toISOString(),
          },
        });
      }

      const updateSuccess = bookingService.updateBookingStatus(
        bookingId,
        status
      );

      if (!updateSuccess) {
        return res.status(500).json({
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message: "Failed to update booking status",
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.info("Booking status updated", {
        bookingId,
        oldStatus: booking.status,
        newStatus: status,
        ip: req.ip,
      });

      return res.json({
        success: true,
        data: {
          bookingId,
          status,
          updatedAt: new Date().toISOString(),
        },
        message: "Booking status updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating booking status", {
        error: error.message,
        bookingId: req.params.bookingId,
        status: req.body.status,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to update booking status",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * Process booking integrations with Calendar and HubSpot
 * @param {Object} booking - Booking object
 * @returns {Object} - Integration results
 */
async function processBookingIntegrations(booking) {
  const integrationResults = {
    calendar: { success: false, error: null, eventId: null, meetingLink: null },
    hubspot: { success: false, error: null, contactId: null },
  };

  // Calendar integration
  try {
    logger.info(`Creating calendar event for booking: ${booking.id}`);
    const calendarResult = await calendarService.createEvent(booking);

    if (calendarResult.success) {
      integrationResults.calendar.success = true;
      integrationResults.calendar.eventId = calendarResult.eventId;
      integrationResults.calendar.meetingLink = calendarResult.meetingLink;

      // Update booking with calendar event ID
      booking.calendarEventId = calendarResult.eventId;

      logger.info(
        `Calendar event created successfully: ${calendarResult.eventId}`
      );
    } else {
      integrationResults.calendar.error = calendarResult.error;
      logger.warn(`Calendar event creation failed: ${calendarResult.error}`);
    }
  } catch (error) {
    integrationResults.calendar.error = error.message;
    logger.error("Error creating calendar event:", error);
  }

  // HubSpot integration
  try {
    logger.info(`Creating HubSpot contact for booking: ${booking.email}`);
    const hubspotResult = await leadManager.createOrUpdateContact(booking);

    if (hubspotResult.success) {
      integrationResults.hubspot.success = true;
      integrationResults.hubspot.contactId = hubspotResult.contactId;

      // Update booking with HubSpot contact ID
      booking.hubspotContactId = hubspotResult.contactId;

      logger.info(
        `HubSpot contact ${
          hubspotResult.created ? "created" : "updated"
        } successfully: ${hubspotResult.contactId}`
      );
    } else if (!hubspotResult.skipped) {
      integrationResults.hubspot.error = hubspotResult.error;
      logger.warn(`HubSpot contact management failed: ${hubspotResult.error}`);
    }
  } catch (error) {
    integrationResults.hubspot.error = error.message;
    logger.error("Error creating HubSpot contact:", error);
  }

  return integrationResults;
}

module.exports = router;
