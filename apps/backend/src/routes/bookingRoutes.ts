import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';
import { BookingService, BookingServiceImpl } from '../services/BookingService';
import { PrismaBookingRepository } from '../repositories/BookingRepository';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Initialize dependencies
const prisma = new PrismaClient();
const bookingRepository = new PrismaBookingRepository(prisma);
const bookingService = new BookingServiceImpl(bookingRepository);
const bookingController = new BookingController(bookingService);

// Booking routes
router.post('/', bookingController.createBooking);
router.get('/availability', bookingController.checkAvailability);
router.get('/by-email', bookingController.getBookingsByEmail);
router.get('/:id', bookingController.getBooking);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.cancelBooking);
router.post('/:id/confirm', bookingController.confirmBooking);
router.put('/:id/status', bookingController.updateBookingStatus);
router.get('/', bookingController.getAllBookings);

export default router;