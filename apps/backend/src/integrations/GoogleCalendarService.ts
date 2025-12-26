import { google, calendar_v3 } from 'googleapis';
import Bottleneck from 'bottleneck';
import { Booking } from '../../../../packages/shared/src/types/booking';
import { logger } from '../config/logger';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private limiter: Bottleneck;
  private calendarId: string;
  private timeZone: string;

  constructor() {
    // Initialize Google Calendar API client
    let auth;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      // Use direct service account key from environment
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
      // Use service account key file
      auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    } else {
      // No authentication configured
      auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    this.timeZone = process.env.TIMEZONE || process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/New_York';

    // Initialize rate limiter with exponential backoff
    // Google Calendar API allows 1000 requests per 100 seconds per user
    // We'll be conservative with 5 requests per second
    this.limiter = new Bottleneck({
      minTime: 200, // 200ms between requests (5 requests/second)
      maxConcurrent: 1,
      reservoir: 100, // Initial reservoir
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 20 * 1000, // Refresh every 20 seconds
      retryCount: 3,
      retryDelayMultiplier: 2, // Exponential backoff
      retryDelayBase: 1000, // Start with 1 second delay
    });

    // Log rate limiter events
    this.limiter.on('failed', (error: any, jobInfo) => {
      logger.warn('Google Calendar API request failed', {
        error: error instanceof Error ? error.message : String(error),
        retryCount: jobInfo.retryCount,
      });
    });

    this.limiter.on('retry', (error: any, jobInfo) => {
      logger.info('Retrying Google Calendar API request', {
        error: error instanceof Error ? error.message : String(error),
        retryCount: jobInfo.retryCount,
      });
    });
  }

  /**
   * Create a calendar event for a booking
   */
  async createEvent(booking: Booking): Promise<string> {
    try {
      const event = this.buildCalendarEvent(booking);
      
      const response = await this.limiter.schedule(() =>
        this.calendar.events.insert({
          calendarId: this.calendarId,
          requestBody: event,
          sendUpdates: 'all',
        })
      );

      const eventId = response.data.id;
      if (!eventId) {
        throw new Error('Failed to create calendar event: No event ID returned');
      }

      logger.info('Calendar event created successfully', {
        bookingId: booking.id,
        eventId,
        startTime: booking.startTime,
      });

      return eventId;
    } catch (error) {
      logger.error('Failed to create calendar event', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Calendar event creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, booking: Booking): Promise<void> {
    try {
      const event = this.buildCalendarEvent(booking);

      await this.limiter.schedule(() =>
        this.calendar.events.update({
          calendarId: this.calendarId,
          eventId,
          requestBody: event,
          sendUpdates: 'all',
        })
      );

      logger.info('Calendar event updated successfully', {
        bookingId: booking.id,
        eventId,
        startTime: booking.startTime,
      });
    } catch (error) {
      logger.error('Failed to update calendar event', {
        bookingId: booking.id,
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Calendar event update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.limiter.schedule(() =>
        this.calendar.events.delete({
          calendarId: this.calendarId,
          eventId,
          sendUpdates: 'all',
        })
      );

      logger.info('Calendar event deleted successfully', {
        eventId,
      });
    } catch (error) {
      logger.error('Failed to delete calendar event', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Calendar event deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get calendar event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.limiter.schedule(() =>
        this.calendar.events.get({
          calendarId: this.calendarId,
          eventId,
        })
      );

      const event = response.data;
      if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
        return null;
      }

      const result: CalendarEvent = {
        id: event.id,
        summary: event.summary || '',
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone || this.timeZone,
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone || this.timeZone,
        },
      };

      if (event.description) {
        result.description = event.description;
      }

      if (event.attendees) {
        result.attendees = event.attendees.map(attendee => {
          const attendeeResult: { email: string; displayName?: string } = {
            email: attendee.email || '',
          };
          if (attendee.displayName) {
            attendeeResult.displayName = attendee.displayName;
          }
          return attendeeResult;
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to get calendar event', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Build a calendar event object from a booking
   */
  private buildCalendarEvent(booking: Booking): calendar_v3.Schema$Event {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(startTime.getTime() + booking.duration * 60 * 1000);

    const event: calendar_v3.Schema$Event = {
      summary: `Appointment with ${booking.name}`,
      description: booking.inquiry ? `Inquiry: ${booking.inquiry}` : 'Scheduled appointment',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: this.timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: this.timeZone,
      },
      attendees: [
        {
          email: booking.email,
          displayName: booking.name,
        },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 15 }, // 15 minutes before
        ],
      },
    };

    return event;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) &&
      process.env.GOOGLE_CALENDAR_ID
    );
  }

  /**
   * Get rate limiter status for monitoring
   */
  getRateLimiterStatus() {
    return {
      running: this.limiter.running(),
      queued: this.limiter.queued(),
      // Note: reservoir() method may not be available in all Bottleneck versions
    };
  }
}