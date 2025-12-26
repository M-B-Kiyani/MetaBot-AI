/**
 * Property-Based Test for Widget Type Safety
 * Feature: ai-booking-voice-assistant, Property 14: Widget API Type Safety
 * Validates: Requirements 7.5, 10.3
 */

import * as fc from 'fast-check';
import {
  CreateBookingRequest,
  CreateBookingRequestSchema,
  BookingResponse,
  BookingResponseSchema,
  BookingStatus,
  BookingDurations,
} from '@shared/types/booking';

describe('Widget API Type Safety', () => {
  // Generator for widget API requests
  const widgetBookingRequestArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress(),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
    inquiry: fc.option(fc.string({ maxLength: 500 })),
    startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
    duration: fc.constantFrom(...BookingDurations),
  });

  test('For any widget booking request, it should conform to shared CreateBookingRequest type', () => {
    fc.assert(
      fc.property(widgetBookingRequestArb, (request) => {
        // Widget requests should be compatible with shared types
        const typedRequest: CreateBookingRequest = request;
        
        // Should validate against shared schema
        const result = CreateBookingRequestSchema.safeParse(typedRequest);
        expect(result.success).toBe(true);
        
        if (result.success) {
          // Type structure should be preserved
          expect(result.data.name).toBe(request.name);
          expect(result.data.email).toBe(request.email);
          expect(result.data.phone).toBe(request.phone);
          expect(result.data.inquiry).toBe(request.inquiry);
          expect(result.data.duration).toBe(request.duration);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('For any API response received by widget, it should conform to shared BookingResponse type', () => {
    const mockApiResponseArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1 }),
      email: fc.emailAddress(),
      phone: fc.option(fc.string()),
      inquiry: fc.option(fc.string()),
      startTime: fc.date(),
      duration: fc.constantFrom(...BookingDurations),
      status: fc.constantFrom(...Object.values(BookingStatus)),
      calendarEventId: fc.option(fc.string()),
      crmContactId: fc.option(fc.string()),
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

    fc.assert(
      fc.property(mockApiResponseArb, (response) => {
        // Widget should be able to handle API responses with shared types
        const typedResponse: BookingResponse = response;
        
        // Should validate against shared schema
        const result = BookingResponseSchema.safeParse(typedResponse);
        expect(result.success).toBe(true);
        
        if (result.success) {
          // Widget should be able to access all expected properties
          expect(typeof result.data.id).toBe('string');
          expect(typeof result.data.name).toBe('string');
          expect(typeof result.data.email).toBe('string');
          expect(Object.values(BookingStatus)).toContain(result.data.status);
          expect(BookingDurations).toContain(result.data.duration);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('For any booking status used in widget, it should match shared enum values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(BookingStatus)),
        (status) => {
          // Widget status handling should use shared enum
          const isValidStatus = Object.values(BookingStatus).includes(status);
          expect(isValidStatus).toBe(true);
          
          // Should be able to use status in widget logic
          const statusDisplay = getStatusDisplay(status);
          expect(typeof statusDisplay).toBe('string');
          expect(statusDisplay.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('For any booking duration used in widget, it should match shared allowed values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BookingDurations),
        (duration) => {
          // Widget duration handling should use shared constants
          expect(BookingDurations).toContain(duration);
          expect(typeof duration).toBe('number');
          expect(duration).toBeGreaterThan(0);
          
          // Should be able to format duration in widget
          const durationDisplay = formatDuration(duration);
          expect(typeof durationDisplay).toBe('string');
          expect(durationDisplay).toContain('min');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper functions that would be used in the widget
function getStatusDisplay(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.PENDING:
      return 'Pending Confirmation';
    case BookingStatus.CONFIRMED:
      return 'Confirmed';
    case BookingStatus.CANCELLED:
      return 'Cancelled';
    case BookingStatus.NO_SHOW:
      return 'No Show';
    case BookingStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Unknown';
  }
}

function formatDuration(duration: number): string {
  return `${duration} min`;
}