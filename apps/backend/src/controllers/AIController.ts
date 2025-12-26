import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIService } from '../services/AIService';
import { AppError } from '../middlewares/errorHandler';
import logger from '../config/logger';

// Request validation schemas
const ChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
  sessionId: z.string().optional(),
  context: z
    .object({
      sessionId: z.string(),
      history: z.array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
          timestamp: z.string().datetime(),
        })
      ),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
});

export class AIController {
  constructor(private aiService: AIService) {}

  processMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = ChatMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        logger.warn('Invalid chat message request', {
          errors: validationResult.error.errors,
          body: req.body,
        });
        return next(
          new AppError(
            400,
            'INVALID_REQUEST',
            'Invalid message format: ' +
              validationResult.error.errors.map((e) => e.message).join(', ')
          )
        );
      }

      const { message, sessionId, context } = validationResult.data;

      logger.info('Processing chat message', {
        messageLength: message.length,
        sessionId: sessionId || context?.sessionId,
        hasContext: !!context,
      });

      // Convert context if provided
      let conversationContext;
      if (context) {
        conversationContext = {
          ...context,
          history: context.history.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        };
      } else if (sessionId) {
        // Try to get existing context by session ID
        conversationContext = this.aiService.getConversationContext(sessionId);
      }

      // Process the message
      const response = await this.aiService.processMessage(
        message,
        conversationContext
      );

      logger.info('Chat message processed successfully', {
        sessionId: response.context?.sessionId,
        responseLength: response.message.length,
        functionCallsCount: response.functionCalls?.length || 0,
      });

      // Return response with serialized context
      res.json({
        message: response.message,
        functionCalls: response.functionCalls,
        context: response.context
          ? {
              ...response.context,
              history: response.context.history.map((msg) => ({
                ...msg,
                timestamp: msg.timestamp.toISOString(),
              })),
            }
          : undefined,
      });
    } catch (error) {
      logger.error('Error processing chat message:', error);
      next(
        new AppError(500, 'AI_SERVICE_ERROR', 'Failed to process chat message')
      );
    }
  };

  getConversationContext = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return next(
          new AppError(400, 'INVALID_REQUEST', 'Session ID is required')
        );
      }

      logger.info('Retrieving conversation context', { sessionId });

      const context = this.aiService.getConversationContext(sessionId);

      if (!context) {
        return next(
          new AppError(
            404,
            'CONTEXT_NOT_FOUND',
            'Conversation context not found'
          )
        );
      }

      // Return context with serialized timestamps
      res.json({
        ...context,
        history: context.history.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Error retrieving conversation context:', error);
      next(
        new AppError(
          500,
          'AI_SERVICE_ERROR',
          'Failed to retrieve conversation context'
        )
      );
    }
  };

  clearOldContexts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const maxAgeHours = parseInt(req.query.maxAgeHours as string) || 24;

      logger.info('Clearing old conversation contexts', { maxAgeHours });

      this.aiService.clearOldContexts(maxAgeHours);

      res.json({
        message: 'Old conversation contexts cleared successfully',
        maxAgeHours,
      });
    } catch (error) {
      logger.error('Error clearing old contexts:', error);
      next(
        new AppError(
          500,
          'AI_SERVICE_ERROR',
          'Failed to clear old conversation contexts'
        )
      );
    }
  };
}
