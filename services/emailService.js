const nodemailer = require("nodemailer");
const winston = require("winston");
const { logger } = require("../utils/logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize the email service with transporter configuration
   */
  async initialize() {
    try {
      // Check if email configuration exists
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn(
          "Email configuration missing. Email service will be disabled."
        );
        return;
      }

      // Create transporter
      // Support for Gmail by default, or generic SMTP if host is provided
      const config = {
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };

      if (process.env.SMTP_HOST) {
        delete config.service;
        config.host = process.env.SMTP_HOST;
        config.port = parseInt(process.env.SMTP_PORT || "587");
        config.secure = process.env.SMTP_SECURE === "true";
      }

      this.transporter = nodemailer.createTransport(config);

      // Verify connection
      await this.transporter.verify();
      
      this.initialized = true;
      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service", {
        error: error.message,
      });
      // Don't throw, just leave uninitialized so app can start
    }
  }

  /**
   * Send booking confirmation email
   * @param {Object} booking - Booking details
   * @returns {Promise<Object>} - Result of sending email
   */
  async sendBookingConfirmation(booking) {
    if (!this.initialized || !this.transporter) {
        logger.warn("Email service not initialized, skipping confirmation email", { bookingId: booking.id });
        return { success: false, error: "Email service not initialized" };
    }

    try {
      const date = new Date(booking.dateTime);
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

      const emailContent = {
        from: `Metalogics AI <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `Booking Confirmed: Consultation with Metalogics.io`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb;">Booking Confirmed</h1>
            </div>
            
            <p>Hi ${booking.name},</p>
            
            <p>Thank you for booking a consultation with Metalogics.io. We're looking forward to speaking with you about your project.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Meeting Details</h3>
              <p style="margin: 5px 0;"><strong>Topic:</strong> ${booking.inquiry}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime} (London Time)</p>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
              ${booking.calendarEventId ? '<p style="margin-top: 15px; font-size: 0.9em; color: #4b5563;">A calendar invitation has been sent to your email.</p>' : ''}
            </div>

            <p>If you need to reschedule or cancel, please reply to this email.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.8em; color: #6b7280; text-align: center;">
              <p>Metalogics.io - AI & Software Solutions</p>
            </div>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(emailContent);
      
      logger.info("Booking confirmation email sent", { 
        bookingId: booking.id, 
        messageId: info.messageId 
      });

      return { success: true, messageId: info.messageId };

    } catch (error) {
      logger.error("Failed to send confirmation email", {
        bookingId: booking.id,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
