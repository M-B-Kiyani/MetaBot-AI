import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  GenerativeModel,
} from '@google/generative-ai';
import {
  FunctionCall,
  FunctionResult,
} from '../../../../packages/shared/src/types/ai';
import { logger } from '../config/logger';

export interface GeminiService {
  generateResponse(
    prompt: string,
    functions?: FunctionDeclaration[]
  ): Promise<GeminiResponse>;
  generateResponseWithContext(
    prompt: string,
    context: string,
    functions?: FunctionDeclaration[]
  ): Promise<GeminiResponse>;
}

export interface GeminiResponse {
  message: string;
  functionCalls?: FunctionCall[];
}

export class GeminiServiceImpl implements GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateResponse(
    prompt: string,
    functions?: FunctionDeclaration[]
  ): Promise<GeminiResponse> {
    try {
      logger.info('Generating Gemini response', {
        promptLength: prompt.length,
        functionsCount: functions?.length || 0,
      });

      const modelWithFunctions =
        functions && functions.length > 0
          ? this.genAI.getGenerativeModel({
              model: 'gemini-1.5-flash',
              tools: [{ functionDeclarations: functions }],
            })
          : this.model;

      const result = await modelWithFunctions.generateContent(prompt);
      const response = result.response;

      // Check if the response contains function calls
      const functionCalls: FunctionCall[] = [];
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          functionCalls.push({
            name: call.name,
            arguments: call.args || {},
          });
        }
      }

      const message = response.text() || '';

      logger.info('Gemini response generated', {
        messageLength: message.length,
        functionCallsCount: functionCalls.length,
      });

      return {
        message,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      };
    } catch (error) {
      logger.error('Error generating Gemini response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateResponseWithContext(
    prompt: string,
    context: string,
    functions?: FunctionDeclaration[]
  ): Promise<GeminiResponse> {
    const contextualPrompt = `Context:\n${context}\n\nUser Query: ${prompt}\n\nPlease provide a helpful response based on the context provided. If the context doesn't contain relevant information, let the user know and provide general assistance.`;

    return this.generateResponse(contextualPrompt, functions);
  }

  // Static method to get function declarations for booking operations
  static getBookingFunctionDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'book_appointment',
        description: 'Book a new appointment for a customer',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Customer full name',
            },
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number (optional)',
            },
            inquiry: {
              type: 'string',
              description:
                'Brief description of what the customer needs help with',
            },
            startTime: {
              type: 'string',
              description:
                'Preferred appointment start time in ISO format (e.g., 2024-01-15T10:00:00Z)',
            },
            duration: {
              type: 'number',
              description:
                'Appointment duration in minutes (15, 30, 45, 60, 90, or 120)',
            },
          },
          required: ['name', 'email', 'startTime', 'duration'],
        },
      },
      {
        name: 'check_availability',
        description: 'Check if a specific time slot is available for booking',
        parameters: {
          type: 'object',
          properties: {
            startTime: {
              type: 'string',
              description:
                'Start time to check in ISO format (e.g., 2024-01-15T10:00:00Z)',
            },
            duration: {
              type: 'number',
              description: 'Duration in minutes (15, 30, 45, 60, 90, or 120)',
            },
          },
          required: ['startTime', 'duration'],
        },
      },
      {
        name: 'get_company_info',
        description:
          'Get information about Metalogics company, services, pricing, or general inquiries',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The specific question or topic the user is asking about',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  // Static method to get system prompt for booking assistant
  static getBookingAssistantPrompt(): string {
    return `You are a helpful AI assistant for Metalogics, a UK-based development agency. Your role is to:

1. Help customers book appointments by collecting their details (name, email, phone, inquiry, preferred time, duration)
2. Check availability for requested time slots
3. Provide information about Metalogics services, pricing, and company details
4. Be friendly, professional, and helpful

Key guidelines:
- Always collect required information (name, email, start time, duration) before booking
- Suggest alternative times if the requested slot is not available
- Use the get_company_info function when customers ask about services, pricing, or company details
- Be conversational and natural in your responses
- If you need to book an appointment, use the book_appointment function
- If you need to check availability, use the check_availability function
- Business hours are Monday-Friday, 9 AM to 5 PM (London time)
- Available durations are: 15, 30, 45, 60, 90, or 120 minutes

Remember to be helpful and guide customers through the booking process step by step.`;
  }
}
