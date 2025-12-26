import { Router } from 'express';
import { VoiceController } from '../controllers/VoiceController';
import { VoiceServiceImpl } from '../services/VoiceService';
import { BookingService, BookingServiceImpl } from '../services/BookingService';
import { PrismaBookingRepository } from '../repositories/BookingRepository';
import { RetellService } from '../integrations/RetellService';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment';

const router = Router();

// Initialize dependencies
const prisma = new PrismaClient();
const bookingRepository = new PrismaBookingRepository(prisma);
const bookingService = new BookingServiceImpl(bookingRepository);

// Initialize Retell service
const retellApiKey = config.RETELL_API_KEY;
if (!retellApiKey) {
  throw new Error('RETELL_API_KEY is required for voice service');
}

const retellService = new RetellService(retellApiKey);
const voiceService = new VoiceServiceImpl(bookingService, retellService);
const voiceController = new VoiceController(voiceService, retellService);

// Voice webhook routes
router.post('/webhook', voiceController.handleWebhook);
router.get('/health', voiceController.healthCheck);

export default router;
