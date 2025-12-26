import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import { BookingServiceImpl } from './BookingService';
import { BookingRepository } from '../repositories/BookingRepository';
import {
  CreateBookingRequest,
  BookingDurations,
} from '../../../../packages/shared/src/types/booking';

// Feature: ai-booking-voice-assistant, Property 3: Valid Duration Enforcement
// **Validates: Requirements 1.5**

describe('BookingService Property Tests', () => {
  let bookingService: BookingServiceImpl;
  let mockRepository: jest.Mocked<BookingRepository>;

  beforeEach(() => {
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

  // Property 3: Valid Duration Enforcement
  it('should accept only valid durations and reject invalid ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
          email: fc.emailAddress(),
          startTime: fc.date({
            min: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Next year
          }),
          duration: fc.integer({ min: 1, max: 300 }), // Wide range of durations
        }),
        async ({ name, email, startTime, duration }) => {
          // Ensure start time is during business hours (Monday-Friday, 9 AM - 5 PM)
          const businessStartTime = new Date(startTime);
          businessStartTime.setHours(10, 0, 0, 0); // 10 AM to avoid edge cases

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
            startTime: businessStartTime,
            duration,
          };

          // Mock repository to always return available
          mockRepository.checkAvailability.mockResolvedValue(true);

          const isValidDuration = BookingDurations.includes(duration as any);

          if (isValidDuration) {
            // Valid duration should be accepted
            const mockBooking = {
              id: 'test-id',
              ...bookingRequest,
              phone: null,
              inquiry: null,
              status: 'PENDING' as const,
              confirmationSent: false,
              reminderSent: false,
              calendarEventId: null,
              crmContactId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockRepository.create.mockResolvedValue(mockBooking);

            const result = await bookingService.createBooking(bookingRequest);
            expect(result.duration).toBe(duration);
            expect(mockRepository.create).toHaveBeenCalledWith(bookingRequest);
          } else {
            // Invalid duration should be rejected
            await expect(
              bookingService.createBooking(bookingRequest)
            ).rejects.toThrow(/Invalid duration/);
            expect(mockRepository.create).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test for checkAvailability duration validation
  it('should validate duration in checkAvailability method', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          startTime: fc.date({
            min: new Date(Date.now() + 24 * 60 * 60 * 1000),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.integer({ min: 1, max: 300 }),
        }),
        async ({ startTime, duration }) => {
          // Reset all mocks before each test
          jest.clearAllMocks();

          // Ensure start time is during business hours
          const businessStartTime = new Date(startTime);
          businessStartTime.setHours(10, 0, 0, 0);

          while (
            businessStartTime.getDay() === 0 ||
            businessStartTime.getDay() === 6
          ) {
            businessStartTime.setDate(businessStartTime.getDate() + 1);
          }

          const isValidDuration = BookingDurations.includes(duration as any);

          if (isValidDuration) {
            // Valid duration should proceed to repository check
            mockRepository.checkAvailability.mockResolvedValue(true);
            const result = await bookingService.checkAvailability(
              businessStartTime,
              duration
            );
            expect(result).toBe(true);
            expect(mockRepository.checkAvailability).toHaveBeenCalledWith(
              businessStartTime,
              duration
            );
          } else {
            // Invalid duration should throw error before repository call
            await expect(
              bookingService.checkAvailability(businessStartTime, duration)
            ).rejects.toThrow(/Invalid duration/);
            expect(mockRepository.checkAvailability).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 15: Booking Status State Machine
  // **Validates: Requirements 8.4**
  it('should only allow valid status transitions according to state machine', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          bookingId: fc.string({ minLength: 1, maxLength: 50 }),
          currentStatus: fc.constantFrom(
            'PENDING',
            'CONFIRMED',
            'CANCELLED',
            'NO_SHOW',
            'COMPLETED'
          ),
          newStatus: fc.constantFrom(
            'PENDING',
            'CONFIRMED',
            'CANCELLED',
            'NO_SHOW',
            'COMPLETED'
          ),
        }),
        async ({ bookingId, currentStatus, newStatus }) => {
          // Mock existing booking with current status
          const mockBooking = {
            id: bookingId,
            name: 'Test User',
            email: 'test@example.com',
            phone: null,
            inquiry: null,
            startTime: new Date(),
            duration: 30,
            status: currentStatus as any,
            confirmationSent: false,
            reminderSent: false,
            calendarEventId: null,
            crmContactId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockRepository.findById.mockResolvedValue(mockBooking);

          // Define valid transitions according to the state machine
          const validTransitions: Record<string, string[]> = {
            PENDING: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
            CANCELLED: [], // No transitions from cancelled
            NO_SHOW: [], // No transitions from no-show
            COMPLETED: [], // No transitions from completed
          };

          const isValidTransition =
            validTransitions[currentStatus]?.includes(newStatus) || false;

          if (isValidTransition) {
            // Valid transition should succeed
            const updatedBooking = { ...mockBooking, status: newStatus as any };
            mockRepository.updateStatus.mockResolvedValue(updatedBooking);

            const result = await bookingService.updateBookingStatus(
              bookingId,
              newStatus as any
            );
            expect(result.status).toBe(newStatus);
            expect(mockRepository.updateStatus).toHaveBeenCalledWith(
              bookingId,
              newStatus
            );
          } else {
            // Invalid transition should be rejected
            await expect(
              bookingService.updateBookingStatus(bookingId, newStatus as any)
            ).rejects.toThrow(/Invalid status transition/);
            expect(mockRepository.updateStatus).not.toHaveBeenCalled();
          }

          // Reset mocks for next iteration
          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
