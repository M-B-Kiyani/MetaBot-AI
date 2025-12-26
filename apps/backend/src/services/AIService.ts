import {
  AIResponse,
  ConversationContext,
  FunctionCall,
  FunctionResult,
} from '../../../../packages/shared/src/types/ai';
import { GeminiService, GeminiServiceImpl } from './GeminiService';
import { KnowledgeService, KnowledgeServiceImpl } from './KnowledgeService';
import { BookingService } from './BookingService';
import { CreateBookingRequest } from '../../../../packages/shared/src/types/booking';
import logger from '../config/logger';

export interface AIService {
  processMessage(
    message: string,
    context?: ConversationContext
  ): Promise<AIResponse>;
  executeFunction(
    functionCall: FunctionCall,
    context?: ConversationContext
  ): Promise<FunctionResult>;
}

export class AIServiceImpl implements AIService {
  private geminiService: GeminiService;
  private knowledgeService: KnowledgeService;
  private bookingService: BookingService;
  private conversationContexts: Map<string, ConversationContext> = new Map();

  constructor(geminiApiKey: string, bookingService: BookingService) {
    this.geminiService = new GeminiServiceImpl(geminiApiKey);
    this.knowledgeService = new KnowledgeServiceImpl(geminiApiKey);
    this.bookingService = bookingService;
  }

  async processMessage(
    message: string,
    context?: ConversationContext
  ): Promise<AIResponse> {
    try {
      logger.info('Processing AI message', {
        messageLength: message.length,
        hasContext: !!context,
        sessionId: context?.sessionId,
      });

      // Update conversation context
      const updatedContext = this.updateConversationContext(message, context);

      // Determine if we need company information
      const needsCompanyInfo = this.detectCompanyInfoIntent(message);
      let knowledgeContext = '';

      if (needsCompanyInfo) {
        knowledgeContext =
          await this.knowledgeService.getRelevantContext(message);
        logger.info('Retrieved knowledge context', {
          contextLength: knowledgeContext.length,
        });
      }

      // Get function declarations for booking operations
      const functions = GeminiServiceImpl.getBookingFunctionDeclarations();
      const systemPrompt = GeminiServiceImpl.getBookingAssistantPrompt();

      // Create the full prompt with system instructions and conversation history
      const fullPrompt = this.buildFullPrompt(
        systemPrompt,
        message,
        updatedContext,
        knowledgeContext
      );

      // Generate response using Gemini
      const geminiResponse = await this.geminiService.generateResponse(
        fullPrompt,
        functions
      );

      // Execute any function calls
      const functionResults: FunctionResult[] = [];
      if (geminiResponse.functionCalls) {
        for (const functionCall of geminiResponse.functionCalls) {
          const result = await this.executeFunction(
            functionCall,
            updatedContext
          );
          functionResults.push(result);
        }
      }

      // Update conversation context with assistant response
      const finalContext = this.addAssistantMessage(
        updatedContext,
        geminiResponse.message
      );

      // Store updated context
      if (finalContext.sessionId) {
        this.conversationContexts.set(finalContext.sessionId, finalContext);
      }

      logger.info('AI message processed successfully', {
        responseLength: geminiResponse.message.length,
        functionCallsCount: geminiResponse.functionCalls?.length || 0,
        functionResultsCount: functionResults.length,
      });

      return {
        message: geminiResponse.message,
        functionCalls: geminiResponse.functionCalls,
        context: finalContext,
      };
    } catch (error) {
      logger.error('Error processing AI message:', error);
      return {
        message:
          'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        context,
      };
    }
  }

  async executeFunction(
    functionCall: FunctionCall,
    context?: ConversationContext
  ): Promise<FunctionResult> {
    try {
      logger.info('Executing function call', {
        functionName: functionCall.name,
        sessionId: context?.sessionId,
      });

      switch (functionCall.name) {
        case 'book_appointment':
          return await this.executeBookAppointment(functionCall.arguments);

        case 'check_availability':
          return await this.executeCheckAvailability(functionCall.arguments);

        case 'get_company_info':
          return await this.executeGetCompanyInfo(functionCall.arguments);

        default:
          logger.warn('Unknown function call', {
            functionName: functionCall.name,
          });
          return {
            success: false,
            error: `Unknown function: ${functionCall.name}`,
          };
      }
    } catch (error) {
      logger.error('Error executing function call:', error);
      return {
        success: false,
        error: 'Failed to execute function',
      };
    }
  }

  private async executeBookAppointment(args: any): Promise<FunctionResult> {
    try {
      // Validate required arguments
      if (!args.name || !args.email || !args.startTime || !args.duration) {
        return {
          success: false,
          error:
            'Missing required booking information (name, email, startTime, duration)',
        };
      }

      // Parse start time
      const startTime = new Date(args.startTime);
      if (isNaN(startTime.getTime())) {
        return {
          success: false,
          error: 'Invalid start time format',
        };
      }

      // Create booking request
      const bookingRequest: CreateBookingRequest = {
        name: args.name,
        email: args.email,
        phone: args.phone || undefined,
        inquiry: args.inquiry || undefined,
        startTime,
        duration: parseInt(args.duration),
      };

      // Create the booking
      const booking = await this.bookingService.createBooking(bookingRequest);

      logger.info('Booking created successfully', { bookingId: booking.id });

      return {
        success: true,
        data: {
          bookingId: booking.id,
          name: booking.name,
          email: booking.email,
          startTime: booking.startTime.toISOString(),
          duration: booking.duration,
          status: booking.status,
        },
      };
    } catch (error: any) {
      logger.error('Error creating booking:', error);
      return {
        success: false,
        error: error.message || 'Failed to create booking',
      };
    }
  }

  private async executeCheckAvailability(args: any): Promise<FunctionResult> {
    try {
      // Validate required arguments
      if (!args.startTime || !args.duration) {
        return {
          success: false,
          error: 'Missing required parameters (startTime, duration)',
        };
      }

      // Parse start time
      const startTime = new Date(args.startTime);
      if (isNaN(startTime.getTime())) {
        return {
          success: false,
          error: 'Invalid start time format',
        };
      }

      const duration = parseInt(args.duration);
      const isAvailable = await this.bookingService.checkAvailability(
        startTime,
        duration
      );

      // If not available, get suggested times
      let suggestedTimes: Date[] = [];
      if (!isAvailable) {
        suggestedTimes = await this.bookingService.getSuggestedTimes(
          startTime,
          duration,
          3
        );
      }

      return {
        success: true,
        data: {
          available: isAvailable,
          requestedTime: startTime.toISOString(),
          duration,
          suggestedTimes: suggestedTimes.map((time) => time.toISOString()),
        },
      };
    } catch (error: any) {
      logger.error('Error checking availability:', error);
      return {
        success: false,
        error: error.message || 'Failed to check availability',
      };
    }
  }

  private async executeGetCompanyInfo(args: any): Promise<FunctionResult> {
    try {
      const query = args.query || '';
      const relevantInfo =
        await this.knowledgeService.getRelevantContext(query);

      return {
        success: true,
        data: {
          query,
          information: relevantInfo,
        },
      };
    } catch (error: any) {
      logger.error('Error getting company info:', error);
      return {
        success: false,
        error: error.message || 'Failed to retrieve company information',
      };
    }
  }

  private updateConversationContext(
    message: string,
    context?: ConversationContext
  ): ConversationContext {
    const now = new Date();

    if (!context) {
      // Create new context
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        sessionId,
        history: [
          {
            role: 'user',
            content: message,
            timestamp: now,
          },
        ],
        metadata: {},
      };
    }

    // Update existing context
    const updatedContext = { ...context };
    updatedContext.history = [
      ...context.history,
      {
        role: 'user',
        content: message,
        timestamp: now,
      },
    ];

    return updatedContext;
  }

  private addAssistantMessage(
    context: ConversationContext,
    message: string
  ): ConversationContext {
    const updatedContext = { ...context };
    updatedContext.history = [
      ...context.history,
      {
        role: 'assistant',
        content: message,
        timestamp: new Date(),
      },
    ];

    return updatedContext;
  }

  private buildFullPrompt(
    systemPrompt: string,
    message: string,
    context: ConversationContext,
    knowledgeContext?: string
  ): string {
    let prompt = systemPrompt + '\n\n';

    // Add knowledge context if available
    if (knowledgeContext) {
      prompt += `Knowledge Base Context:\n${knowledgeContext}\n\n`;
    }

    // Add conversation history (last 10 messages to keep context manageable)
    if (context.history.length > 1) {
      prompt += 'Conversation History:\n';
      const recentHistory = context.history.slice(-10);
      for (const msg of recentHistory) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `Current User Message: ${message}`;

    return prompt;
  }

  private detectCompanyInfoIntent(message: string): boolean {
    const companyKeywords = [
      'metalogics',
      'company',
      'service',
      'services',
      'price',
      'pricing',
      'cost',
      'about',
      'what do you do',
      'what does',
      'how much',
      'packages',
      'plans',
      'web development',
      'mobile app',
      'blockchain',
      'seo',
      'marketing',
      'design',
      'graphic',
      'landing page',
      'contact',
      'phone',
      'email',
      'address',
      'location',
      'team',
      'founded',
      'history',
    ];

    const lowerMessage = message.toLowerCase();
    return companyKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  // Method to get conversation context by session ID
  getConversationContext(sessionId: string): ConversationContext | undefined {
    return this.conversationContexts.get(sessionId);
  }

  // Method to clear old conversation contexts (for memory management)
  clearOldContexts(maxAgeHours = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [sessionId, context] of this.conversationContexts.entries()) {
      const lastMessageTime =
        context.history[context.history.length - 1]?.timestamp;
      if (lastMessageTime && lastMessageTime < cutoffTime) {
        this.conversationContexts.delete(sessionId);
        logger.info('Cleared old conversation context', { sessionId });
      }
    }
  }
}
