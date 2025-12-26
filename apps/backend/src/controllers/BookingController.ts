import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingService } from '../services/BookingService';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { logger } from '../config/logger';
import { 
  CreateBookingRequestSchema, 
  BookingResponseSchema,
  BookingStatus 
} from '../../../../packages/shared/src/types/booking';
import { ApiSuccessSchema } from '../../../../packages/shared/src/types/api';

// Additional validation schemas for controller endpoints
const BookingIdParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID format'),
});

const EmailQuerySchema = z.object({
  email: z.string().email('Invalid email format'),
});

const AvailabilityQuerySchema = z.object({
  startTime: z.coerce.date(),
  duration: z.coerce.number().refine(
    (val) => [15, 30, 45, 60, 90, 120].includes(val),
    'Duration must be 15, 30, 45, 60, 90, or 120 minutes'
  ),
});

const UpdateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export class BookingController {
  constructor(private bookingService: BookingService) {}

  // POST /api/bookings
  createBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = CreateBookingRequestSchema.parse(req.body);
      
      logger.info('Creating booking', { 
        email: validatedData.email, 
        startTime: validatedData.startTime,
        duration: validatedData.duration 
      });

      // Create booking through service
      const booking = await this.bookingService.createBooking(validatedData);

      // Validate response data
      const validatedResponse = BookingResponseSchema.parse(booking);

      logger.info('Booking created successfully', { bookingId: booking.id });

      res.status(201).json({
        data: validatedResponse,
        message: 'Booking created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', true, {
          validationErrors: error.errors,
        }));
      } else if (error instanceof Error) {
        // Handle business logic errors from service
        if (error.message.includes('not available') || error.message.includes('conflict')) {
          next(new AppError(409, 'BOOKING_CONFLICT', error.message));
        } else if (error.message.includes('past') || error.message.includes('business hours')) {
          next(new AppError(400, 'INVALID_TIME_SLOT', error.message));
        } else {
          next(error);
        }
      } else {
        next(error);
      }
    }
  });

  // GET /api/bookings/:id
  getBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate path parameters
      const { id } = BookingIdParamSchema.parse(req.params);

      logger.debug('Fetching booking', { bookingId: id });

      const booking = await this.bookingService.getBooking(id);

      if (!booking) {
        throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }

      // Validate response data
      const validatedResponse = BookingResponseSchema.parse(booking);

      res.json({
        data: validatedResponse,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid booking ID', true, {
          validationErrors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  });

  // GET /api/bookings/by-email?email=user@example.com
  getBookingsByEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const { email } = EmailQuerySchema.parse(req.query);

      logger.debug('Fetching bookings by email', { email });

      const bookings = await this.bookingService.getBookingsByEmail(email);

      // Validate response data
      const validatedBookings = bookings.map(booking => BookingResponseSchema.parse(booking));

      res.json({
        data: validatedBookings,
        message: `Found ${bookings.length} booking(s)`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid email parameter', true, {
          validationErrors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  });

  // PUT /api/bookings/:id
  updateBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate path parameters
      const { id } = BookingIdParamSchema.parse(req.params);

      // Validate request body (partial update)
      const updateData = CreateBookingRequestSchema.partial().parse(req.body);

      logger.info('Updating booking', { bookingId: id, updateData });

      const booking = await this.bookingService.updateBooking(id, updateData);

      // Validate response data
      const validatedResponse = BookingResponseSchema.parse(booking);

      logger.info('Booking updated successfully', { bookingId: id });

      res.json({
        data: validatedResponse,
        message: 'Booking updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', true, {
          validationErrors: error.errors,
        }));
      } else if (error instanceof Error) {
        if (error.message.includes('not found')) {
          next(new AppError(404, 'BOOKING_NOT_FOUND', error.message));
        } else if (error.message.includes('not available') || error.message.includes('conflict')) {
          next(new AppError(409, 'BOOKING_CONFLICT', error.message));
        } else if (error.message.includes('past') || error.message.includes('business hours')) {
          next(new AppError(400, 'INVALID_TIME_SLOT', error.message));
        } else {
          next(error);
        }
      } else {
        next(error);
      }
    }
  });

  // DELETE /api/bookings/:id (Cancel booking)
  cancelBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate path parameters
      const { id } = BookingIdParamSchema.parse(req.params);

      logger.info('Cancelling booking', { bookingId: id });

      const booking = await this.bookingService.cancelBooking(id);

      // Validate response data
      const validatedResponse = BookingResponseSchema.parse(booking);

      logger.info('Booking cancelled successfully', { bookingId: id });

      res.json({
        data: validatedResponse,
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid booking ID', true, {
          validationErrors: error.errors,
        }));
      } else if (error instanceof Error) {
        if (error.message.includes('not found')) {
          next(new AppError(404, 'BOOKING_NOT_FOUND', error.message));
        } else if (error.message.includes('already cancelled') || error.message.includes('Cannot cancel')) {
          next(new AppError(400, 'INVALID_OPERATION', error.message));
        } else {
          next(error);
        }
      } else {
        next(error);
      }
    }
  });

  // POST /api/bookings/:id/confirm
  confirmBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate path parameters
      const { id } = BookingIdParamSchema.parse(req.params);

      logger.info('Confirming booking', { bookingId: id });

      const booking = await this.bookingService.confirmBooking(id);

      // Validate response data
      const validatedResponse = BookingResponseSchema.parse(booking);

      logger.info('Booking confirmed successfully', { bookingId: id });

      res.json({
        data: validatedResponse,
        message: 'Booking confirmed successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid booking ID', true, {
          validationErrors: error.errors,
        }));
      } else if (error instanceof Error) {
        if (error.message.includes('not found')) {
          next(new AppError(404, 'BOOKING_NOT_FOUND', error.message));
        } else if (error.message.includes('Only pending')) {
          next(new AppError(400, 'INVALID_OPERATION', error.message));
        } else {
          next(error);
        }
      } else {
        next(error);
      }
    }
  });

  // PUT /api/bookings/:id/status
  updateBookingStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate path parameters
      const { id } = BookingIdParamSchema.parse(req.params);

      // Validate request body
      const { status } = UpdateBookingStatusSchema.parse(req.body);

      logger.info('Updating booking status', { bookingId: id, status });

      const booking = await this.bookingService.updateBookingStatus(id, status);

      // Validate response data
      const validatedResponse = BookingResponseSchema.parse(booking);

      logger.info('Booking status updated successfully', { bookingId: id, status });

      res.json({
        data: validatedResponse,
        message: 'Booking status updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', true, {
          validationErrors: error.errors,
        }));
      } else if (error instanceof Error) {
        if (error.message.includes('not found')) {
          next(new AppError(404, 'BOOKING_NOT_FOUND', error.message));
        } else if (error.message.includes('Invalid status transition')) {
          next(new AppError(400, 'INVALID_STATUS_TRANSITION', error.message));
        } else {
          next(error);
        }
      } else {
        next(error);
      }
    }
  });

  // GET /api/bookings/availability?startTime=2024-01-01T10:00:00Z&duration=60
  checkAvailability = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const { startTime, duration } = AvailabilityQuerySchema.parse(req.query);

      logger.debug('Checking availability', { startTime, duration });

      const isAvailable = await this.bookingService.checkAvailability(startTime, duration);

      res.json({
        data: {
          available: isAvailable,
          startTime,
          duration,
        },
        message: isAvailable ? 'Time slot is available' : 'Time slot is not available',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid availability parameters', true, {
          validationErrors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  });

  // GET /api/bookings
  getAllBookings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const { page, limit } = PaginationQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;

      logger.debug('Fetching all bookings', { page, limit });

      const bookings = await this.bookingService.getBookingsByEmail(''); // This will need to be updated to support pagination

      // For now, implement simple pagination in memory
      const paginatedBookings = bookings.slice(offset, offset + limit);

      // Validate response data
      const validatedBookings = paginatedBookings.map(booking => BookingResponseSchema.parse(booking));

      res.json({
        data: validatedBookings,
        pagination: {
          page,
          limit,
          total: bookings.length,
          totalPages: Math.ceil(bookings.length / limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'VALIDATION_ERROR', 'Invalid pagination parameters', true, {
          validationErrors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  });
}