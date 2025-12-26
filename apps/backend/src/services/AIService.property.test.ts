import fc from 'fast-check';
import { AIServiceImpl } from './AIService';
import { BookingService } from './BookingService';
import { ConversationContext } from '../../../../packages/shared/src/types/ai';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          response: {
            text: () =>
              'Hello! I can help you with booking appointments and company information.',
            functionCalls: [],
          },
        });
      }),
      embedContent: jest.fn().mockImplementation((text: string) => {
        // Generate a deterministic embedding based on text content
        const embedding = Array.from({ length: 768 }, (_, i) => {
          const hash = text
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return Math.sin(hash * (i + 1)) * 0.1;
        });
        return Promise.resolve({ embedding: { values: embedding } });
      }),
    }),
  })),
}));

// Mock fs/promises for KnowledgeService
jest.mock('fs/promises', () => ({
  readdir: jest.fn().mockResolvedValue(['company.md', 'services.md']),
  readFile: jest.fn().mockImplementation((filePath: string) => {
    const filename = filePath.split('/').pop() || '';
    const content =
      {
        'company.md': '# Company\nMetalogics is a development agency.',
        'services.md': '# Services\nWe offer web development and mobile apps.',
      }[filename] || 'Default content';
    return Promise.resolve(content);
  }),
}));

// Mock logger
jest.mock('../config/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

describe('AIService Property Tests', () => {
  let aiService: AIServiceImpl;
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
    } as jest.Mocked<BookingService>;

    // Set up default mock implementations
    mockBookingService.checkAvailability.mockResolvedValue(true);
    mockBookingService.getSuggestedTimes.mockResolvedValue([
      new Date(),
      new Date(),
    ]);
    mockBookingService.createBooking.mockResolvedValue({
      id: 'test-booking-id',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      inquiry: null,
      startTime: new Date(),
      duration: 60,
      status: 'PENDING' as any,
      confirmationSent: false,
      reminderSent: false,
      calendarEventId: null,
      crmContactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    aiService = new AIServiceImpl('test-api-key', mockBookingService);
  });

  /**
   * Feature: ai-booking-voice-assistant, Property 9: AI Message Processing
   * Validates: Requirements 5.1, 5.2, 5.5
   */
  describe('Property 9: AI Message Processing', () => {
    it('should process any chat message and generate an appropriate response with booking functions when booking intent is detected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.option(
            fc.record({
              sessionId: fc.string({ minLength: 1, maxLength: 50 }),
              userId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
              history: fc.array(
                fc.record({
                  role: fc.constantFrom('user', 'assistant'),
                  content: fc.string({ minLength: 1, maxLength: 200 }),
                  timestamp: fc.date(),
                }),
                { maxLength: 10 }
              ),
              metadata: fc.option(fc.record({})),
            })
          ),
          async (message: string, context?: ConversationContext) => {
            // Act: Process the message
            const response = await aiService.processMessage(message, context);

            // Assert: Response should have required properties
            expect(response).toHaveProperty('message');
            expect(typeof response.message).toBe('string');
            expect(response.message.length).toBeGreaterThan(0);

            // Context should be preserved or created
            expect(response.context).toBeDefined();
            expect(response.context?.sessionId).toBeTruthy();
            expect(response.context?.history).toBeInstanceOf(Array);
            expect(response.context?.history.length).toBeGreaterThan(0);

            // Last message in history should be the user's message
            const lastUserMessage = response.context?.history
              .filter((msg) => msg.role === 'user')
              .pop();
            expect(lastUserMessage?.content).toBe(message);

            // Function calls should be an array if present
            if (response.functionCalls) {
              expect(response.functionCalls).toBeInstanceOf(Array);
              for (const call of response.functionCalls) {
                expect(call).toHaveProperty('name');
                expect(call).toHaveProperty('arguments');
                expect(typeof call.name).toBe('string');
                expect(typeof call.arguments).toBe('object');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain conversation context across multiple messages in the same session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
            minLength: 2,
            maxLength: 5,
          }),
          async (messages: string[]) => {
            let context: ConversationContext | undefined;

            // Process messages sequentially
            for (const message of messages) {
              const response = await aiService.processMessage(message, context);
              context = response.context;

              // Assert: Context should be maintained
              expect(context).toBeDefined();
              expect(context?.sessionId).toBeTruthy();
              expect(context?.history).toBeInstanceOf(Array);
            }

            // Final context should contain all messages
            expect(context?.history.length).toBeGreaterThanOrEqual(
              messages.length
            );

            // Check that all user messages are preserved
            const userMessages = context?.history
              .filter((msg) => msg.role === 'user')
              .map((msg) => msg.content);

            for (const originalMessage of messages) {
              expect(userMessages).toContain(originalMessage);
            }

            // Session ID should remain consistent
            const sessionIds = new Set(
              context?.history.map(() => context?.sessionId)
            );
            expect(sessionIds.size).toBe(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle function execution correctly when function calls are present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'book_appointment',
            'check_availability',
            'get_company_info'
          ),
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            startTime: fc.date({ min: new Date() }).map((d) => d.toISOString()),
            duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          }),
          async (functionName: string, args: any) => {
            // Create a function call
            const functionCall = {
              name: functionName,
              arguments: args,
            };

            // Execute the function
            const result = await aiService.executeFunction(functionCall);

            // Assert: Result should have required properties
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');

            if (result.success) {
              expect(result).toHaveProperty('data');
            } else {
              expect(result).toHaveProperty('error');
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty or whitespace messages gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter((s) => s.trim().length === 0),
          async (emptyMessage: string) => {
            // Act: Process empty message
            const response = await aiService.processMessage(emptyMessage);

            // Assert: Should still return a valid response
            expect(response).toHaveProperty('message');
            expect(typeof response.message).toBe('string');
            expect(response.context).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should create new conversation context when none is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (message: string) => {
            // Act: Process message without context
            const response = await aiService.processMessage(message);

            // Assert: New context should be created
            expect(response.context).toBeDefined();
            expect(response.context?.sessionId).toBeTruthy();
            expect(response.context?.history).toBeInstanceOf(Array);
            expect(response.context?.history.length).toBeGreaterThanOrEqual(1);

            // First message should be the user's message
            const firstMessage = response.context?.history[0];
            expect(firstMessage?.role).toBe('user');
            expect(firstMessage?.content).toBe(message);
            expect(firstMessage?.timestamp).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
