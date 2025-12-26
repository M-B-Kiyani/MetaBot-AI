import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fc from 'fast-check';
import { VoiceServiceImpl } from './VoiceService';
import { BookingService } from './BookingService';
import { RetellService } from '../integrations/RetellService';
import { Booking, BookingStatus } from '@prisma/client';
import { VoiceFunctionCall } from '../../../../packages/shared/src/types/voice';
import { BookingDurations } from '../../../../packages/shared/src/types/booking';

// Mock the dependencies
const mockBookingService: jest.Mocked<BookingService> = {
  createBooking: jest.fn(),
  getBooking: jest.fn(),
  getBookingsByEmail: jest.fn(),
  updateBooking: jest.fn(),
  cancelBooking: jest.fn(),
  confirmBooking: jest.fn(),
  checkAvailability: jest.fn(),
  getSuggestedTimes: jest.fn(),
  updateBookingStatus: jest.fn(),
};

const mockRetellService: jest.Mocked<RetellService> = {
  verifyWebhook: jest.fn(),
  parseWebhookPayload: jest.fn(),
  parseVoiceFunction: jest.fn(),
};

describe('VoiceService Property Tests', () => {
  let voiceService: VoiceServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    voiceService = new VoiceServiceImpl(mockBookingService, mockRetellService);
  });

  /**
   * Feature: ai-booking-voice-assistant, Property 8: Voice Booking Integration
   * Validates: Requirements 4.3, 4.4
   */
  describe('Property 8: Voice Booking Integration', () => {
    it('should delegate voice booking requests to booking service and provide spoken confirmation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid voice function calls for booking
          fc.record({
            name: fc.constant('book_appointment'),
            arguments: fc.record({
              name: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => s.trim().length > 0),
              email: fc.emailAddress(),
              phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
              inquiry: fc.option(fc.string({ maxLength: 200 })),
              time: fc.constantFrom('9am', '10am', '2pm', '3pm', '4pm'),
              duration: fc.constantFrom(...BookingDurations),
            }),
            callId: fc.string({ minLength: 5, maxLength: 20 }),
          }),
          // Generate corresponding booking response
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            inquiry: fc.option(fc.string({ maxLength: 200 })),
            startTime: fc.date({ min: new Date(Date.now() + 86400000) }), // Tomorrow or later
            duration: fc.constantFrom(...BookingDurations),
            status: fc.constant(BookingStatus.PENDING),
            confirmationSent: fc.boolean(),
            reminderSent: fc.boolean(),
            calendarEventId: fc.option(fc.string()),
            crmContactId: fc.option(fc.string()),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          async (
            voiceFunctionCall: VoiceFunctionCall,
            mockBooking: Booking
          ) => {
            // Setup mock to return the booking
            mockBookingService.createBooking.mockResolvedValue(mockBooking);

            // Process the voice function call
            const result =
              await voiceService.processVoiceFunction(voiceFunctionCall);

            // Verify booking service was called
            expect(mockBookingService.createBooking).toHaveBeenCalledWith(
              expect.objectContaining({
                name: voiceFunctionCall.arguments.name.trim(),
                email: voiceFunctionCall.arguments.email.trim(),
                duration: voiceFunctionCall.arguments.duration,
              })
            );

            // Verify successful result
            expect(result.success).toBe(true);
            expect(result.message).toContain('successfully booked');
            expect(result.message).toContain(mockBooking.email);
            expect(result.message).toContain(`${mockBooking.duration}-minute`);
            expect(result.data).toEqual(mockBooking);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle booking service errors gracefully and provide helpful voice responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.constant('book_appointment'),
            arguments: fc.record({
              name: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => s.trim().length > 0),
              email: fc.emailAddress(),
              time: fc.constantFrom('9am', '10am', '2pm', '3pm', '4pm'),
              duration: fc.constantFrom(...BookingDurations),
            }),
            callId: fc.string({ minLength: 5, maxLength: 20 }),
          }),
          fc.constantFrom(
            'Time slot is not available',
            'Cannot book appointments in the past',
            'Bookings are only available Monday through Friday',
            'Valid email address is required'
          ),
          async (
            voiceFunctionCall: VoiceFunctionCall,
            errorMessage: string
          ) => {
            // Setup mock to throw error
            mockBookingService.createBooking.mockRejectedValue(
              new Error(errorMessage)
            );

            // Process the voice function call
            const result =
              await voiceService.processVoiceFunction(voiceFunctionCall);

            // Verify booking service was called
            expect(mockBookingService.createBooking).toHaveBeenCalled();

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
            expect(result.message.length).toBeGreaterThan(0);

            // Verify appropriate error responses
            if (errorMessage.includes('not available')) {
              expect(result.message).toContain("isn't available");
            } else if (errorMessage.includes('past')) {
              expect(result.message).toContain(
                "can't book appointments in the past"
              );
            } else if (errorMessage.includes('business hours')) {
              expect(result.message).toContain('Monday through Friday');
            } else if (errorMessage.includes('email')) {
              expect(result.message).toContain('valid email address');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle availability checks and provide appropriate voice responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.constant('check_availability'),
            arguments: fc.record({
              time: fc.constantFrom('9am', '10am', '2pm', '3pm', '4pm'),
              duration: fc.constantFrom(...BookingDurations),
            }),
            callId: fc.string({ minLength: 5, maxLength: 20 }),
          }),
          fc.boolean(),
          fc.array(fc.date({ min: new Date(Date.now() + 86400000) }), {
            maxLength: 3,
          }),
          async (
            voiceFunctionCall: VoiceFunctionCall,
            isAvailable: boolean,
            suggestedTimes: Date[]
          ) => {
            // Setup mocks
            mockBookingService.checkAvailability.mockResolvedValue(isAvailable);
            if (!isAvailable) {
              mockBookingService.getSuggestedTimes.mockResolvedValue(
                suggestedTimes
              );
            }

            // Process the voice function call
            const result =
              await voiceService.processVoiceFunction(voiceFunctionCall);

            // Verify availability check was called
            expect(mockBookingService.checkAvailability).toHaveBeenCalled();

            // Verify successful result
            expect(result.success).toBe(true);
            expect(result.message).toBeDefined();
            expect(result.data).toEqual({
              available: isAvailable,
              suggestedTimes: isAvailable ? [] : suggestedTimes,
            });

            // Verify appropriate responses
            if (isAvailable) {
              expect(result.message).toContain('available');
              expect(result.message).toContain('book it for you');
            } else {
              expect(result.message).toContain("isn't available");
              if (suggestedTimes.length > 0) {
                expect(result.message).toContain('alternative times');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate required fields and provide helpful error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.constant('book_appointment'),
            arguments: fc.record({
              name: fc.option(fc.string()),
              email: fc.option(fc.string()),
              time: fc.option(fc.string()),
              duration: fc.option(fc.integer()),
            }),
            callId: fc.string({ minLength: 5, maxLength: 20 }),
          }),
          async (voiceFunctionCall: VoiceFunctionCall) => {
            const args = voiceFunctionCall.arguments;
            const hasName = args.name && args.name.trim().length > 0;
            const hasEmail = args.email && args.email.trim().length > 0;
            const hasTime = args.time && args.time.trim().length > 0;

            // Process the voice function call
            const result =
              await voiceService.processVoiceFunction(voiceFunctionCall);

            // If missing required fields, should return error
            if (!hasName || !hasEmail) {
              expect(result.success).toBe(false);
              expect(result.message).toContain('need');
              if (!hasName) {
                expect(result.message).toContain('name');
              }
              if (!hasEmail) {
                expect(result.message).toContain('email');
              }
            } else if (!hasTime) {
              expect(result.success).toBe(false);
              expect(result.message).toContain('time');
            }

            // Should not call booking service if validation fails
            if (!hasName || !hasEmail || !hasTime) {
              expect(mockBookingService.createBooking).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate consistent spoken confirmations for successful bookings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            inquiry: fc.option(fc.string({ maxLength: 200 })),
            startTime: fc.date({ min: new Date(Date.now() + 86400000) }),
            duration: fc.constantFrom(...BookingDurations),
            status: fc.constant(BookingStatus.PENDING),
            confirmationSent: fc.boolean(),
            reminderSent: fc.boolean(),
            calendarEventId: fc.option(fc.string()),
            crmContactId: fc.option(fc.string()),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          async (booking: Booking) => {
            // Generate spoken confirmation
            const confirmation =
              voiceService.generateSpokenConfirmation(booking);

            // Verify confirmation contains essential information
            expect(confirmation).toContain(`${booking.duration}-minute`);
            expect(confirmation).toContain(booking.email);
            expect(confirmation).toContain(booking.id.slice(-8));
            expect(confirmation).toContain('successfully booked');
            expect(confirmation).toContain('confirmation');

            // Verify confirmation is a reasonable length (not too short or too long)
            expect(confirmation.length).toBeGreaterThan(50);
            expect(confirmation.length).toBeLessThan(500);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
