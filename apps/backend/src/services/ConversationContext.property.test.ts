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
            text: () => 'I understand your message and will help you.',
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
  readdir: jest.fn().mockResolvedValue(['company.md']),
  readFile: jest
    .fn()
    .mockResolvedValue('# Company\nMetalogics is a development agency.'),
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

describe('Conversation Context Property Tests', () => {
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
    mockBookingService.getSuggestedTimes.mockResolvedValue([]);

    aiService = new AIServiceImpl('test-api-key', mockBookingService);
  });

  /**
   * Feature: ai-booking-voice-assistant, Property 10: Conversation Context Preservation
   * Validates: Requirements 5.4
   */
  describe('Property 10: Conversation Context Preservation', () => {
    it('should maintain context across all messages in a conversation session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
            minLength: 2,
            maxLength: 8,
          }),
          fc.string({ minLength: 5, maxLength: 20 }),
          async (messages: string[], userId?: string) => {
            let context: ConversationContext | undefined;
            const sessionId = `test_session_${Date.now()}`;

            // Process messages sequentially in the same session
            for (let i = 0; i < messages.length; i++) {
              const message = messages[i];

              // For the first message, create initial context
              if (i === 0) {
                context = {
                  sessionId,
                  userId,
                  history: [],
                  metadata: {},
                };
              }

              const response = await aiService.processMessage(message, context);
              context = response.context;

              // Assert: Context should be preserved and updated
              expect(context).toBeDefined();
              expect(context?.sessionId).toBe(sessionId);
              expect(context?.history).toBeInstanceOf(Array);

              // History should contain at least the messages processed so far
              const userMessages = context?.history
                .filter((msg) => msg.role === 'user')
                .map((msg) => msg.content);

              // All processed messages should be in history
              for (let j = 0; j <= i; j++) {
                expect(userMessages).toContain(messages[j]);
              }

              // History should have proper structure
              for (const historyItem of context?.history || []) {
                expect(historyItem).toHaveProperty('role');
                expect(historyItem).toHaveProperty('content');
                expect(historyItem).toHaveProperty('timestamp');
                expect(historyItem.timestamp).toBeInstanceOf(Date);
                expect(['user', 'assistant']).toContain(historyItem.role);
                expect(typeof historyItem.content).toBe('string');
              }
            }

            // Final assertions
            expect(context?.sessionId).toBe(sessionId);
            if (userId) {
              expect(context?.userId).toBe(userId);
            }

            // All original messages should be preserved
            const finalUserMessages = context?.history
              .filter((msg) => msg.role === 'user')
              .map((msg) => msg.content);

            expect(finalUserMessages).toHaveLength(messages.length);
            for (const originalMessage of messages) {
              expect(finalUserMessages).toContain(originalMessage);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve conversation context when retrieved by session ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (sessionId: string, message: string) => {
            // Create initial context
            const initialContext: ConversationContext = {
              sessionId,
              history: [],
              metadata: { testData: 'preserved' },
            };

            // Process a message
            const response = await aiService.processMessage(
              message,
              initialContext
            );

            // Retrieve context by session ID
            const retrievedContext =
              aiService.getConversationContext(sessionId);

            // Assert: Retrieved context should match the updated context
            if (retrievedContext) {
              expect(retrievedContext.sessionId).toBe(sessionId);
              expect(retrievedContext.history).toBeInstanceOf(Array);
              expect(retrievedContext.history.length).toBeGreaterThan(0);

              // Should contain the original message
              const userMessages = retrievedContext.history
                .filter((msg) => msg.role === 'user')
                .map((msg) => msg.content);
              expect(userMessages).toContain(message);

              // Metadata should be preserved
              expect(retrievedContext.metadata).toEqual({
                testData: 'preserved',
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain chronological order of messages in conversation history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 3,
            maxLength: 6,
          }),
          async (messages: string[]) => {
            let context: ConversationContext | undefined;
            const timestamps: Date[] = [];

            // Process messages with small delays to ensure different timestamps
            for (const message of messages) {
              const beforeTime = new Date();
              const response = await aiService.processMessage(message, context);
              const afterTime = new Date();

              context = response.context;
              timestamps.push(beforeTime);

              // Small delay to ensure timestamp differences
              await new Promise((resolve) => setTimeout(resolve, 1));
            }

            // Assert: Messages should be in chronological order
            expect(context?.history).toBeDefined();

            const userMessages =
              context?.history.filter((msg) => msg.role === 'user') || [];
            expect(userMessages.length).toBe(messages.length);

            // Check chronological order
            for (let i = 1; i < userMessages.length; i++) {
              expect(
                userMessages[i].timestamp.getTime()
              ).toBeGreaterThanOrEqual(userMessages[i - 1].timestamp.getTime());
            }

            // Check that messages are in the correct order
            for (let i = 0; i < messages.length; i++) {
              expect(userMessages[i].content).toBe(messages[i]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle context updates without losing previous conversation data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sessionId: fc.string({ minLength: 1, maxLength: 30 }),
            userId: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
            initialHistory: fc.array(
              fc.record({
                role: fc.constantFrom('user', 'assistant'),
                content: fc.string({ minLength: 1, maxLength: 100 }),
                timestamp: fc.date(),
              }),
              { maxLength: 5 }
            ),
            metadata: fc.record({
              customField: fc.string({ minLength: 1, maxLength: 20 }),
            }),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (initialContext: ConversationContext, newMessage: string) => {
            // Process new message with existing context
            const response = await aiService.processMessage(
              newMessage,
              initialContext
            );
            const updatedContext = response.context;

            // Assert: All original data should be preserved
            expect(updatedContext?.sessionId).toBe(initialContext.sessionId);
            expect(updatedContext?.userId).toBe(initialContext.userId);
            expect(updatedContext?.metadata).toEqual(initialContext.metadata);

            // Original history should be preserved
            const originalUserMessages = initialContext.history
              .filter((msg) => msg.role === 'user')
              .map((msg) => msg.content);

            const updatedUserMessages =
              updatedContext?.history
                .filter((msg) => msg.role === 'user')
                .map((msg) => msg.content) || [];

            // All original messages should still be present
            for (const originalMsg of originalUserMessages) {
              expect(updatedUserMessages).toContain(originalMsg);
            }

            // New message should be added
            expect(updatedUserMessages).toContain(newMessage);

            // History should have grown
            expect(updatedContext?.history.length).toBeGreaterThan(
              initialContext.history.length
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create unique session IDs for different conversations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 2,
            maxLength: 5,
          }),
          async (messages: string[]) => {
            const sessionIds = new Set<string>();

            // Create separate conversations for each message
            for (const message of messages) {
              const response = await aiService.processMessage(message); // No context = new session
              const sessionId = response.context?.sessionId;

              expect(sessionId).toBeTruthy();
              expect(typeof sessionId).toBe('string');

              // Session ID should be unique
              expect(sessionIds.has(sessionId!)).toBe(false);
              sessionIds.add(sessionId!);
            }

            // All session IDs should be unique
            expect(sessionIds.size).toBe(messages.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
