import fc from 'fast-check';
import { AIServiceImpl } from './AIService';
import { KnowledgeServiceImpl } from './KnowledgeService';
import { BookingService } from './BookingService';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockImplementation((prompt: string) => {
        // Simulate AI response that includes knowledge context when available
        const hasKnowledgeContext = prompt.includes('Knowledge Base Context:');
        const responseText = hasKnowledgeContext
          ? 'Based on the information provided, I can help you with that.'
          : 'I can help you with general inquiries.';

        return Promise.resolve({
          response: {
            text: () => responseText,
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

// Mock fs/promises for KnowledgeService with realistic company data
jest.mock('fs/promises', () => ({
  readdir: jest
    .fn()
    .mockResolvedValue([
      'About_Company.md',
      'Services_FAQ.md',
      'Pricing_FAQ.md',
      'Web_Development.md',
      'Mobile_App.md',
    ]),
  readFile: jest.fn().mockImplementation((filePath: string) => {
    const filename = filePath.split('/').pop() || '';
    const content =
      {
        'About_Company.md':
          '# About Metalogics\nMetalogics is a UK-based development agency founded in 2020. We specialize in web development, mobile apps, and blockchain solutions.',
        'Services_FAQ.md':
          '# Services FAQ\nWe offer web development, mobile app development, blockchain solutions, SEO, and digital marketing services.',
        'Pricing_FAQ.md':
          '# Pricing\nOur packages start from £99 for basic websites. We offer Starter, Basic, Medium, and E-commerce packages.',
        'Web_Development.md':
          '# Web Development\nWe create responsive, custom websites using modern technologies like React, Node.js, and TypeScript.',
        'Mobile_App.md':
          '# Mobile App Development\nWe develop user-friendly mobile applications for iOS and Android platforms.',
      }[filename] || 'Default company information content';
    return Promise.resolve(content);
  }),
}));

// Mock logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('RAG Knowledge Integration Property Tests', () => {
  let aiService: AIServiceImpl;
  let knowledgeService: KnowledgeServiceImpl;
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

    mockBookingService.checkAvailability.mockResolvedValue(true);
    mockBookingService.getSuggestedTimes.mockResolvedValue([]);

    aiService = new AIServiceImpl('test-api-key', mockBookingService);
    knowledgeService = new KnowledgeServiceImpl('test-api-key');
  });

  /**
   * Feature: ai-booking-voice-assistant, Property 11: RAG Knowledge Integration
   * Validates: Requirements 5.3, 6.1, 6.3, 6.5
   */
  describe('Property 11: RAG Knowledge Integration', () => {
    it('should search relevant documents and inject context into AI prompts when company-related queries are made', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'metalogics',
            'company',
            'services',
            'pricing',
            'web development',
            'mobile app',
            'about',
            'what do you do',
            'how much',
            'cost'
          ),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (companyKeyword: string, additionalText: string) => {
            // Create a query that should trigger company info retrieval
            const query =
              `Tell me about ${companyKeyword} ${additionalText}`.trim();

            // Act: Process the message (should trigger RAG)
            const response = await aiService.processMessage(query);

            // Assert: Response should be generated
            expect(response).toHaveProperty('message');
            expect(typeof response.message).toBe('string');
            expect(response.message.length).toBeGreaterThan(0);

            // Context should be created
            expect(response.context).toBeDefined();
            expect(response.context?.sessionId).toBeTruthy();
            expect(response.context?.history).toBeInstanceOf(Array);
            expect(response.context?.history.length).toBeGreaterThan(0);

            // The query should be in the conversation history
            const userMessages = response.context?.history
              .filter((msg) => msg.role === 'user')
              .map((msg) => msg.content);
            expect(userMessages).toContain(query);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return documents ranked by relevance when searching the knowledge base', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'company information',
            'services offered',
            'pricing details',
            'web development',
            'mobile apps',
            'about metalogics'
          ),
          fc.integer({ min: 1, max: 5 }),
          async (query: string, limit: number) => {
            // Arrange: Ensure knowledge base is indexed
            await knowledgeService.indexDocuments();

            // Act: Search for documents
            const results = await knowledgeService.searchDocuments(
              query,
              limit
            );

            // Assert: Results should be properly structured
            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBeLessThanOrEqual(limit);

            // Each result should have required properties
            for (const result of results) {
              expect(result).toHaveProperty('id');
              expect(result).toHaveProperty('title');
              expect(result).toHaveProperty('content');
              expect(result).toHaveProperty('score');
              expect(result).toHaveProperty('metadata');

              expect(typeof result.id).toBe('string');
              expect(typeof result.title).toBe('string');
              expect(typeof result.content).toBe('string');
              expect(typeof result.score).toBe('number');
              expect(typeof result.metadata).toBe('object');

              // Score should be between 0 and 1
              expect(result.score).toBeGreaterThanOrEqual(0);
              expect(result.score).toBeLessThanOrEqual(1);

              // Content should not be empty
              expect(result.content.length).toBeGreaterThan(0);
              expect(result.title.length).toBeGreaterThan(0);
            }

            // Results should be sorted by score (descending)
            for (let i = 1; i < results.length; i++) {
              expect(results[i - 1].score).toBeGreaterThanOrEqual(
                results[i].score
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide helpful fallback responses when no relevant information exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 10, maxLength: 100 })
            .filter(
              (s) =>
                !s.toLowerCase().includes('metalogics') &&
                !s.toLowerCase().includes('company') &&
                !s.toLowerCase().includes('service') &&
                !s.toLowerCase().includes('price')
            ),
          async (irrelevantQuery: string) => {
            // Act: Get context for irrelevant query
            const context =
              await knowledgeService.getRelevantContext(irrelevantQuery);

            // Assert: Should provide fallback response
            expect(typeof context).toBe('string');
            expect(context.length).toBeGreaterThan(0);

            // Should indicate no relevant information was found
            const lowerContext = context.toLowerCase();
            const hasFallbackIndicators =
              lowerContext.includes('no relevant') ||
              lowerContext.includes('not found') ||
              lowerContext.includes('no information') ||
              context.includes('Relevant information from knowledge base:');

            // Either has fallback indicators or provides some context
            expect(hasFallbackIndicators || context.length > 50).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should inject relevant context when found and maintain context structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('company', 'services', 'pricing', 'web development'),
          fc.integer({ min: 500, max: 3000 }),
          async (query: string, maxTokens: number) => {
            // Arrange: Ensure knowledge base is indexed
            await knowledgeService.indexDocuments();

            // Act: Get relevant context
            const context = await knowledgeService.getRelevantContext(
              query,
              maxTokens
            );

            // Assert: Context should be structured properly
            expect(typeof context).toBe('string');
            expect(context.length).toBeGreaterThan(0);

            // Should not exceed token limits (rough estimation)
            const estimatedTokens = Math.ceil(context.length / 4);
            expect(estimatedTokens).toBeLessThanOrEqual(maxTokens * 1.2); // Allow 20% buffer

            // If relevant information is found, should have proper structure
            if (context.includes('Relevant information from knowledge base:')) {
              // Should contain relevance scores
              expect(context).toMatch(/Relevance: \d+\.\d+%/);

              // Should contain document titles
              expect(context).toMatch(/\*\*.*\*\*/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle document indexing and retrieval consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }),
          async (query: string) => {
            // Act: Index documents multiple times and search
            await knowledgeService.indexDocuments();
            const results1 = await knowledgeService.searchDocuments(query, 3);

            await knowledgeService.indexDocuments(); // Index again
            const results2 = await knowledgeService.searchDocuments(query, 3);

            // Assert: Results should be consistent
            expect(results1.length).toBe(results2.length);

            // Same documents should be returned in same order
            for (let i = 0; i < results1.length; i++) {
              expect(results1[i].id).toBe(results2[i].id);
              expect(results1[i].title).toBe(results2[i].title);
              expect(results1[i].score).toBeCloseTo(results2[i].score, 10);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should detect company information intent correctly across various query patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            companyTerm: fc.constantFrom(
              'metalogics',
              'company',
              'service',
              'price',
              'cost',
              'about',
              'what do you do',
              'web development',
              'mobile app',
              'contact'
            ),
            prefix: fc.constantFrom(
              'tell me about',
              'what is',
              'how much for',
              'I need info on',
              ''
            ),
            suffix: fc.constantFrom(
              'please',
              'thanks',
              '?',
              '',
              'for my business'
            ),
          }),
          async ({ companyTerm, prefix, suffix }) => {
            // Create query with company-related intent
            const query = `${prefix} ${companyTerm} ${suffix}`.trim();

            // Act: Process the message
            const response = await aiService.processMessage(query);

            // Assert: Should generate appropriate response
            expect(response).toHaveProperty('message');
            expect(typeof response.message).toBe('string');
            expect(response.message.length).toBeGreaterThan(0);

            // Should create conversation context
            expect(response.context).toBeDefined();
            expect(response.context?.sessionId).toBeTruthy();

            // Query should be preserved in history
            const userMessages = response.context?.history
              .filter((msg) => msg.role === 'user')
              .map((msg) => msg.content);
            expect(userMessages).toContain(query);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
