import { Router } from 'express';
import { AIController } from '../controllers/AIController';
import { AIServiceImpl } from '../services/AIService';
import { BookingService, BookingServiceImpl } from '../services/BookingService';
import { PrismaBookingRepository } from '../repositories/BookingRepository';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment';

const router = Router();

// Initialize dependencies
const prisma = new PrismaClient();
const bookingRepository = new PrismaBookingRepository(prisma);
const bookingService = new BookingServiceImpl(bookingRepository);

// Initialize AI service with Gemini API key
const geminiApiKey = config.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is required for AI service');
}

const aiService = new AIServiceImpl(geminiApiKey, bookingService);
const aiController = new AIController(aiService);

// AI chat routes
router.post('/chat', aiController.processMessage);
router.get('/context/:sessionId', aiController.getConversationContext);
router.delete('/contexts', aiController.clearOldContexts);

export default router;
