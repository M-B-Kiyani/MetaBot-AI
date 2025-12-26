import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import { PrismaClient, Booking } from '@prisma/client';
import { PrismaBookingRepository } from './BookingRepository';
import { CreateBookingRequest, BookingDurations, BookingStatus } from '../../../../packages/shared/src/types/booking';

// Feature: ai-booking-voice-assistant, Property 1: Booking Creation Completeness
// **Validates: Requirements 1.1, 1.4, 8.2**

describe('BookingRepository Property Tests', () => {
  let prisma: PrismaClient;
  let repository: PrismaBookingRepository;
  let mockBookingCreate: jest.MockedFunction<any>;
  let mockTransaction: jest.MockedFunction<any>;

  beforeEach(() => {
    // Mock Prisma client
    mockBookingCreate = jest.fn();
    mockTransaction = jest.fn();
    
    prisma = {
      $transaction: mockTransaction,
      booking: {
        create: mockBookingCreate,
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    
    repository = new PrismaBookingRepository(prisma);
  });

  // Property 1: Booking Creation Completeness
  it('should create booking with all required fields for any valid booking request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ maxLength: 500 })),
          startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
          duration: fc.constantFrom(...BookingDurations),
        }),
        async (bookingRequest: CreateBookingRequest) => {
          // Mock the expected booking response
          const expectedBooking: Booking = {
            id: 'test-id-' + Math.random().toString(36).substr(2, 9),
            name: bookingRequest.name,
            email: bookingRequest.email,
            phone: bookingRequest.phone || null,
            inquiry: bookingRequest.inquiry || null,
            startTime: bookingRequest.startTime,
            duration: bookingRequest.duration,
            status: BookingStatus.PENDING,
            confirmationSent: false,
            reminderSent: false,
            calendarEventId: null,
            crmContactId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Mock transaction to simulate availability check and creation
          mockTransaction.mockImplementation(async (callback) => {
            return callback({
              booking: {
                findMany: jest.fn().mockResolvedValue([]), // No conflicts
                create: jest.fn().mockResolvedValue(expectedBooking),
              },
              $queryRaw: jest.fn().mockResolvedValue([]), // No conflicts in raw query
            });
          });

          const createdBooking = await repository.create(bookingRequest);

          // Verify all required fields are present and correct
          expect(createdBooking.id).toBeDefined();
          expect(typeof createdBooking.id).toBe('string');
          expect(createdBooking.id.length).toBeGreaterThan(0);
          
          expect(createdBooking.name).toBe(bookingRequest.name);
          expect(createdBooking.email).toBe(bookingRequest.email);
          expect(createdBooking.phone).toBe(bookingRequest.phone || null);
          expect(createdBooking.inquiry).toBe(bookingRequest.inquiry || null);
          expect(createdBooking.startTime).toEqual(bookingRequest.startTime);
          expect(createdBooking.duration).toBe(bookingRequest.duration);
          
          // Verify default values
          expect(createdBooking.status).toBe(BookingStatus.PENDING);
          expect(createdBooking.confirmationSent).toBe(false);
          expect(createdBooking.reminderSent).toBe(false);
          expect(createdBooking.calendarEventId).toBeNull();
          expect(createdBooking.crmContactId).toBeNull();
          
          // Verify timestamps
          expect(createdBooking.createdAt).toBeInstanceOf(Date);
          expect(createdBooking.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Double Booking Prevention
  // **Validates: Requirements 1.2, 1.3**
  it('should reject second booking for overlapping time slots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name1: fc.string({ minLength: 1, maxLength: 100 }),
          email1: fc.emailAddress(),
          name2: fc.string({ minLength: 1, maxLength: 100 }),
          email2: fc.emailAddress(),
          startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
          duration1: fc.constantFrom(...BookingDurations),
          duration2: fc.constantFrom(...BookingDurations),
        }),
        async ({ name1, email1, name2, email2, startTime, duration1, duration2 }) => {
          const booking1: CreateBookingRequest = {
            name: name1,
            email: email1,
            startTime,
            duration: duration1,
          };

          // Create second booking that overlaps with first
          const overlapStartTime = new Date(startTime.getTime() + (duration1 * 60 * 1000) / 2); // Start halfway through first booking
          const booking2: CreateBookingRequest = {
            name: name2,
            email: email2,
            startTime: overlapStartTime,
            duration: duration2,
          };

          // Mock first booking creation (successful)
          const firstBooking: Booking = {
            id: 'first-booking-id',
            name: booking1.name,
            email: booking1.email,
            phone: null,
            inquiry: null,
            startTime: booking1.startTime,
            duration: booking1.duration,
            status: BookingStatus.PENDING,
            confirmationSent: false,
            reminderSent: false,
            calendarEventId: null,
            crmContactId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          let callCount = 0;
          mockTransaction.mockImplementation(async (callback) => {
            callCount++;
            if (callCount === 1) {
              // First booking - no conflicts
              return callback({
                booking: {
                  findMany: jest.fn().mockResolvedValue([]),
                  create: jest.fn().mockResolvedValue(firstBooking),
                },
                $queryRaw: jest.fn().mockResolvedValue([]),
              });
            } else {
              // Second booking - has conflict
              return callback({
                booking: {
                  findMany: jest.fn().mockResolvedValue([firstBooking]),
                  create: jest.fn(),
                },
                $queryRaw: jest.fn().mockResolvedValue([{ id: 'first-booking-id' }]),
              });
            }
          });

          // First booking should succeed
          const createdBooking1 = await repository.create(booking1);
          expect(createdBooking1.id).toBe('first-booking-id');

          // Second booking should fail due to conflict
          await expect(repository.create(booking2)).rejects.toThrow('Time slot is not available');
        }
      ),
      { numRuns: 100 }
    );
  });
});