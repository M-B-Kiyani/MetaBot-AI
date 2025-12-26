import * as fc from 'fast-check';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { BookingServiceImpl } from './BookingService';
import { AIServiceImpl } from './AIService';
import { VoiceServiceImpl } from './VoiceService';
import { BookingRepository } from '../repositories/BookingRepository';
import { CreateBookingRequest } from '../../../../packages/shared/src/types/booking';
import logger from '../config/logger';

// Feature: ai-booking-voice-assistant, Property 20: Service Operation Logging
// **Validates: Requirements 9.3**

describe('Service Operation Logging Property Tests', () => {
  let mockRepository: jest.Mocked<BookingRepository>;
  let bookingService: BookingServiceImpl;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock the logger
    loggerSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});

    // Mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      checkAvailability: jest.fn(),
      findConflictingBookings: jest.fn(),
      updateStatus: jest.fn(),
      findAll: jest.fn(),
    };

    bookingService = new BookingServiceImpl(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Property 20: Service Operation Logging
  it('should log all booking service operations with appropriate log levels and structured information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({
            min: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Next year
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
        }),
        async ({ name, email, phone, inquiry, startTime, duration }) => {
          // Ensure start time is during business hours
          const businessStartTime = new Date(startTime);
          businessStartTime.setHours(10, 0, 0, 0);

          // Set to a weekday if it's a weekend
          while (
            businessStartTime.getDay() === 0 ||
            businessStartTime.getDay() === 6
          ) {
            businessStartTime.setDate(businessStartTime.getDate() + 1);
          }

          const bookingRequest: CreateBookingRequest = {
            name,
            email,
            phone: phone || undefined,
            inquiry: inquiry || undefined,
            startTime: businessStartTime,
            duration,
          };

          // Mock successful booking creation
          const mockBooking = {
            id: 'test-booking-id',
            ...bookingRequest,
            phone: phone || null,
            inquiry: inquiry || null,
            status: 'PENDING' as const,
            confirmationSent: false,
            reminderSent: false,
            calendarEventId: null,
            crmContactId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockRepository.checkAvailability.mockResolvedValue(true);
          mockRepository.create.mockResolvedValue(mockBooking);

          // Clear previous log calls
          loggerSpy.mockClear();

          // Execute the booking creation
          const result = await bookingService.createBooking(bookingRequest);

          // Verify that logging occurred
          expect(loggerSpy).toHaveBeenCalled();

          // Check that log entries contain structured information
          const logCalls = loggerSpy.mock.calls;

          // Should have at least one log entry for the operation
          expect(logCalls.length).toBeGreaterThan(0);

          // Find booking creation log entries
          const bookingCreationLogs = logCalls.filter(
            (call) =>
              call[0] &&
              typeof call[0] === 'string' &&
              call[0].toLowerCase().includes('booking')
          );

          expect(bookingCreationLogs.length).toBeGreaterThan(0);

          // Verify structured logging - each log call should have a message and metadata
          for (const logCall of bookingCreationLogs) {
            expect(logCall.length).toBeGreaterThanOrEqual(1);

            // First argument should be a string message
            expect(typeof logCall[0]).toBe('string');

            // If there's a second argument, it should be an object with metadata
            if (logCall.length > 1 && logCall[1]) {
              expect(typeof logCall[1]).toBe('object');

              // Should contain relevant booking information
              const metadata = logCall[1] as any;
              if (metadata.bookingId) {
                expect(typeof metadata.bookingId).toBe('string');
              }
              if (metadata.email) {
                expect(typeof metadata.email).toBe('string');
              }
              if (metadata.duration) {
                expect(typeof metadata.duration).toBe('number');
              }
            }
          }

          // Verify the booking was actually created
          expect(result.id).toBe('test-booking-id');
          expect(result.name).toBe(name);
          expect(result.email).toBe(email);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log availability check operations with structured information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          startTime: fc.date({
            min: new Date(Date.now() + 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          isAvailable: fc.boolean(),
        }),
        async ({ startTime, duration, isAvailable }) => {
          // Ensure start time is during business hours
          const businessStartTime = new Date(startTime);
          businessStartTime.setHours(10, 0, 0, 0);

          while (
            businessStartTime.getDay() === 0 ||
            businessStartTime.getDay() === 6
          ) {
            businessStartTime.setDate(businessStartTime.getDate() + 1);
          }

          // Mock availability check
          mockRepository.checkAvailability.mockResolvedValue(isAvailable);

          // Clear previous log calls
          loggerSpy.mockClear();

          // Execute availability check
          const result = await bookingService.checkAvailability(
            businessStartTime,
            duration
          );

          // Verify that logging occurred
          expect(loggerSpy).toHaveBeenCalled();

          // Check that log entries contain structured information
          const logCalls = loggerSpy.mock.calls;
          expect(logCalls.length).toBeGreaterThan(0);

          // Find availability check log entries
          const availabilityLogs = logCalls.filter(
            (call) =>
              call[0] &&
              typeof call[0] === 'string' &&
              (call[0].toLowerCase().includes('availability') ||
                call[0].toLowerCase().includes('check'))
          );

          expect(availabilityLogs.length).toBeGreaterThan(0);

          // Verify structured logging
          for (const logCall of availabilityLogs) {
            expect(logCall.length).toBeGreaterThanOrEqual(1);
            expect(typeof logCall[0]).toBe('string');

            if (logCall.length > 1 && logCall[1]) {
              expect(typeof logCall[1]).toBe('object');

              const metadata = logCall[1] as any;
              if (metadata.duration) {
                expect(typeof metadata.duration).toBe('number');
              }
              if (metadata.startTime) {
                expect(typeof metadata.startTime).toBe('string');
              }
            }
          }

          // Verify the result matches the mock
          expect(result).toBe(isAvailable);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log error conditions with appropriate error level and context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          bookingId: fc.string({ minLength: 1, maxLength: 50 }),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        async ({ bookingId, errorMessage }) => {
          // Mock repository to throw an error
          const testError = new Error(errorMessage);
          mockRepository.findById.mockRejectedValue(testError);

          // Spy on error logging
          const errorLogSpy = jest.spyOn(logger, 'error');
          errorLogSpy.mockClear();

          // Execute operation that should fail
          try {
            await bookingService.getBooking(bookingId);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            // Expected to throw
            expect(error).toBeDefined();
          }

          // Verify error logging occurred
          expect(errorLogSpy).toHaveBeenCalled();

          // Check error log structure
          const errorLogCalls = errorLogSpy.mock.calls;
          expect(errorLogCalls.length).toBeGreaterThan(0);

          // Verify error log contains appropriate information
          for (const logCall of errorLogCalls) {
            expect(logCall.length).toBeGreaterThanOrEqual(1);

            // Should have error message
            expect(typeof logCall[0]).toBe('string');

            // Should have error object or metadata
            if (logCall.length > 1) {
              const errorInfo = logCall[1];
              expect(errorInfo).toBeDefined();

              // Could be the error object itself or metadata containing error info
              if (errorInfo instanceof Error) {
                expect(errorInfo.message).toBe(errorMessage);
              } else if (typeof errorInfo === 'object') {
                // Should contain relevant context
                expect(errorInfo).toBeTruthy();
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
