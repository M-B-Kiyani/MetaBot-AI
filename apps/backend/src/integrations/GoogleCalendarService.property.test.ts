import * as fc from 'fast-check';
import {
  Booking,
  BookingStatus,
} from '../../../../packages/shared/src/types/booking';

// Feature: ai-booking-voice-assistant, Property 4: Calendar Event Synchronization
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

// Mock the logger before importing GoogleCalendarService
jest.mock('../config/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

// Mock googleapis
const mockCalendarApi = {
  events: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
};

jest.mock('googleapis', () => ({
  google: {
    calendar: () => mockCalendarApi,
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
  },
}));

// Mock Bottleneck
jest.mock('bottleneck', () => {
  const MockBottleneck = jest.fn().mockImplementation(() => ({
    schedule: jest.fn((fn) => fn()),
    on: jest.fn(),
    running: jest.fn(() => 0),
    queued: jest.fn(() => 0),
    reservoir: jest.fn(() => 100),
  }));
  return { default: MockBottleneck };
});

import { GoogleCalendarService } from './GoogleCalendarService';

describe('GoogleCalendarService Property Tests', () => {
  let calendarService: GoogleCalendarService;

  beforeEach(() => {
    // Set required environment variables
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = 'test-key.json';
    process.env.GOOGLE_CALENDAR_ID = 'test@gmail.com';
    process.env.TIMEZONE = 'America/New_York';

    // Clear all mocks before each test
    jest.clearAllMocks();

    calendarService = new GoogleCalendarService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Property 4: Calendar Event Synchronization
  // For any booking status change (confirmed, cancelled, updated), the corresponding calendar event
  // should be created, deleted, or updated accordingly, and the calendar event ID should be stored in the booking record.
  test('Property 4: Calendar Event Synchronization', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid booking data
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({
            min: new Date(),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CANCELLED
          ),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (booking: Booking) => {
          // Test calendar event creation
          const mockEventId =
            'test-event-id-' + Math.random().toString(36).substr(2, 9);
          mockCalendarApi.events.insert.mockResolvedValue({
            data: { id: mockEventId },
          });

          const createdEventId = await calendarService.createEvent(booking);

          // Verify event creation was called with correct parameters
          expect(mockCalendarApi.events.insert).toHaveBeenCalledWith(
            expect.objectContaining({
              calendarId: 'test@gmail.com',
              requestBody: expect.objectContaining({
                summary: `Appointment with ${booking.name}`,
                start: expect.objectContaining({
                  dateTime: booking.startTime.toISOString(),
                  timeZone: 'America/New_York',
                }),
                end: expect.objectContaining({
                  dateTime: new Date(
                    booking.startTime.getTime() + booking.duration * 60 * 1000
                  ).toISOString(),
                  timeZone: 'America/New_York',
                }),
                attendees: expect.arrayContaining([
                  expect.objectContaining({
                    email: booking.email,
                    displayName: booking.name,
                  }),
                ]),
              }),
              sendUpdates: 'all',
            })
          );

          // Verify the event ID is returned
          expect(createdEventId).toBe(mockEventId);

          // Test calendar event update
          const updatedBooking = {
            ...booking,
            name: 'Updated ' + booking.name,
            startTime: new Date(booking.startTime.getTime() + 60 * 60 * 1000), // 1 hour later
          };

          mockCalendarApi.events.update.mockResolvedValue({ data: {} });

          await calendarService.updateEvent(mockEventId, updatedBooking);

          // Verify event update was called with correct parameters
          expect(mockCalendarApi.events.update).toHaveBeenCalledWith(
            expect.objectContaining({
              calendarId: 'test@gmail.com',
              eventId: mockEventId,
              requestBody: expect.objectContaining({
                summary: `Appointment with ${updatedBooking.name}`,
                start: expect.objectContaining({
                  dateTime: updatedBooking.startTime.toISOString(),
                }),
              }),
              sendUpdates: 'all',
            })
          );

          // Test calendar event deletion
          mockCalendarApi.events.delete.mockResolvedValue({ data: {} });

          await calendarService.deleteEvent(mockEventId);

          // Verify event deletion was called with correct parameters
          expect(mockCalendarApi.events.delete).toHaveBeenCalledWith(
            expect.objectContaining({
              calendarId: 'test@gmail.com',
              eventId: mockEventId,
              sendUpdates: 'all',
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4a: Calendar Event Creation Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({
            min: new Date(),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
          ),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (booking: Booking) => {
          // Clear mocks for each iteration
          jest.clearAllMocks();

          const mockEventId =
            'event-' + Math.random().toString(36).substr(2, 9);
          mockCalendarApi.events.insert.mockResolvedValue({
            data: { id: mockEventId },
          });

          const result = await calendarService.createEvent(booking);

          // For any valid booking, creating a calendar event should return a valid event ID
          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);

          // The calendar API should be called exactly once for this iteration
          expect(mockCalendarApi.events.insert).toHaveBeenCalledTimes(1);

          // The event should contain all required booking information
          const calledWith = mockCalendarApi.events.insert.mock.calls[0][0];
          expect(calledWith.requestBody.summary).toContain(booking.name);
          expect(calledWith.requestBody.attendees).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                email: booking.email,
                displayName: booking.name,
              }),
            ])
          );

          // The event duration should match the booking duration
          const startTime = new Date(calledWith.requestBody.start.dateTime);
          const endTime = new Date(calledWith.requestBody.end.dateTime);
          const actualDuration =
            (endTime.getTime() - startTime.getTime()) / (1000 * 60);
          expect(actualDuration).toBe(booking.duration);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4b: Calendar Event Error Handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({
            min: new Date(),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
          ),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (booking: Booking) => {
          // Test error handling when calendar API fails
          const errorMessage = 'Calendar API error';
          mockCalendarApi.events.insert.mockRejectedValue(
            new Error(errorMessage)
          );

          // For any booking, if calendar creation fails, it should throw an error
          await expect(calendarService.createEvent(booking)).rejects.toThrow();

          // Test error handling for update operations
          mockCalendarApi.events.update.mockRejectedValue(
            new Error(errorMessage)
          );
          await expect(
            calendarService.updateEvent('test-id', booking)
          ).rejects.toThrow();

          // Test error handling for delete operations
          mockCalendarApi.events.delete.mockRejectedValue(
            new Error(errorMessage)
          );
          await expect(
            calendarService.deleteEvent('test-id')
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });
});
