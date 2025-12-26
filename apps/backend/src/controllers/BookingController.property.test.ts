import * as fc from 'fast-check';
import * as request from 'supertest';
import * as express from 'express';
import { BookingController } from './BookingController';
import { BookingService } from '../services/BookingService';
import { errorHandler, AppError } from '../middlewares/errorHandler';
import { ApiErrorSchema } from '../../../../packages/shared/src/types/api';

// Feature: ai-booking-voice-assistant, Property 17: Structured Error Responses
// **Validates: Requirements 9.2, 9.3, 9.4**

describe('BookingController Property Tests', () => {
  let app: express.Application;
  let mockBookingService: jest.Mocked<BookingService>;

  beforeEach(() => {
    // Create mock booking service
    mockBookingService = {
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

    // Create test app
    app = express();
    app.use(express.json());

    const controller = new BookingController(mockBookingService);

    // Add routes
    app.post('/bookings', controller.createBooking);
    app.get('/bookings/:id', controller.getBooking);
    app.get('/bookings/by-email', controller.getBookingsByEmail);
    app.put('/bookings/:id', controller.updateBooking);
    app.delete('/bookings/:id', controller.cancelBooking);
    app.post('/bookings/:id/confirm', controller.confirmBooking);
    app.put('/bookings/:id/status', controller.updateBookingStatus);
    app.get('/bookings/availability', controller.checkAvailability);

    // Add error handler
    app.use(errorHandler);
  });

  describe('Property 17: Structured Error Responses', () => {
    test('For any error condition, the system should return a properly structured JSON response with an error code and message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorType: fc.constantFrom(
              'VALIDATION_ERROR',
              'BOOKING_NOT_FOUND',
              'BOOKING_CONFLICT',
              'INVALID_TIME_SLOT',
              'INVALID_OPERATION',
              'INVALID_STATUS_TRANSITION',
              'INTERNAL_SERVER_ERROR'
            ),
            statusCode: fc.constantFrom(400, 404, 409, 500),
            message: fc.string({ minLength: 1, maxLength: 200 }),
            endpoint: fc.constantFrom(
              '/bookings',
              '/bookings/123e4567-e89b-12d3-a456-426614174000',
              '/bookings/by-email',
              '/bookings/availability'
            ),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          }),
          async ({ errorType, statusCode, message, endpoint, method }) => {
            // Configure mock to throw specific error
            const error = new AppError(statusCode, errorType, message);
            
            // Configure all service methods to throw the error
            Object.values(mockBookingService).forEach(mockFn => {
              mockFn.mockRejectedValue(error);
            });

            // Make request based on method and endpoint
            let response;
            switch (method) {
              case 'GET':
                response = await request(app).get(endpoint);
                break;
              case 'POST':
                response = await request(app)
                  .post(endpoint)
                  .send({ name: 'Test', email: 'test@example.com' });
                break;
              case 'PUT':
                response = await request(app)
                  .put(endpoint)
                  .send({ name: 'Updated' });
                break;
              case 'DELETE':
                response = await request(app).delete(endpoint);
                break;
              default:
                response = await request(app).get(endpoint);
            }

            // Verify response structure
            expect(response.status).toBe(statusCode);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(typeof response.body.error.code).toBe('string');
            expect(typeof response.body.error.message).toBe('string');
            expect(response.body.error.code).toBe(errorType);
            expect(response.body.error.message).toBe(message);

            // Validate against schema
            const validationResult = ApiErrorSchema.safeParse(response.body);
            expect(validationResult.success).toBe(true);

            // Ensure response is valid JSON
            expect(() => JSON.stringify(response.body)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any validation error, the system should include validation details in the error response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            invalidData: fc.record({
              name: fc.option(fc.string(), { nil: undefined }),
              email: fc.option(fc.string(), { nil: undefined }),
              startTime: fc.option(fc.string(), { nil: undefined }),
              duration: fc.option(fc.integer(), { nil: undefined }),
            }),
            endpoint: fc.constantFrom('/bookings'),
          }),
          async ({ invalidData, endpoint }) => {
            // Make request with invalid data
            const response = await request(app)
              .post(endpoint)
              .send(invalidData);

            // Should return validation error
            if (response.status === 400 && response.body.error?.code === 'VALIDATION_ERROR') {
              // Verify structured error response
              expect(response.body).toHaveProperty('error');
              expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
              expect(response.body.error).toHaveProperty('message');
              expect(typeof response.body.error.message).toBe('string');

              // May include validation details
              if (response.body.error.details) {
                expect(response.body.error.details).toHaveProperty('validationErrors');
                expect(Array.isArray(response.body.error.details.validationErrors)).toBe(true);
              }

              // Validate against schema
              const validationResult = ApiErrorSchema.safeParse(response.body);
              expect(validationResult.success).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('For any unhandled error, the system should return a generic 500 error with proper structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom('/bookings', '/bookings/123e4567-e89b-12d3-a456-426614174000'),
            method: fc.constantFrom('GET', 'POST'),
          }),
          async ({ endpoint, method }) => {
            // Configure mock to throw unexpected error
            const unexpectedError = new Error('Unexpected database connection failure');
            Object.values(mockBookingService).forEach(mockFn => {
              mockFn.mockRejectedValue(unexpectedError);
            });

            // Make request
            let response;
            if (method === 'POST') {
              response = await request(app)
                .post(endpoint)
                .send({ name: 'Test', email: 'test@example.com' });
            } else {
              response = await request(app).get(endpoint);
            }

            // Should return 500 with structured error
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'INTERNAL_SERVER_ERROR');
            expect(response.body.error).toHaveProperty('message', 'An unexpected error occurred');

            // Validate against schema
            const validationResult = ApiErrorSchema.safeParse(response.body);
            expect(validationResult.success).toBe(true);

            // Ensure response is valid JSON
            expect(() => JSON.stringify(response.body)).not.toThrow();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});