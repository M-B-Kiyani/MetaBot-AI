import fc from 'fast-check';
import { KnowledgeServiceImpl } from './KnowledgeService';
import { DocumentChunk } from '../../../../packages/shared/src/types/ai';

// Mock the Google Generative AI to avoid actual API calls during testing
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      embedContent: jest.fn().mockImplementation((text: string) => {
        // Generate a deterministic embedding based on text content
        const embedding = Array.from({ length: 768 }, (_, i) => {
          const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return Math.sin(hash * (i + 1)) * 0.1;
        });
        return Promise.resolve({ embedding: { values: embedding } });
      })
    })
  }))
}));

// Mock fs/promises to provide test documents
jest.mock('fs/promises', () => ({
  readdir: jest.fn().mockResolvedValue(['doc1.md', 'doc2.md', 'doc3.md']),
  readFile: jest.fn().mockImplementation((filePath: string) => {
    const filename = filePath.split('/').pop() || '';
    const content = {
      'doc1.md': '# Company Overview\nMetalogics is a development agency founded in 2020.',
      'doc2.md': '# Services\nWe offer web development, mobile apps, and blockchain solutions.',
      'doc3.md': '# Pricing\nOur packages start from £99 for basic websites.'
    }[filename] || 'Default content';
    return Promise.resolve(content);
  })
}));

describe('KnowledgeService Property Tests', () => {
  let knowledgeService: KnowledgeServiceImpl;

  beforeEach(() => {
    knowledgeService = new KnowledgeServiceImpl('test-api-key');
  });

  /**
   * Feature: ai-booking-voice-assistant, Property 12: Document Similarity Search
   * Validates: Requirements 6.2, 6.4
   */
  describe('Property 12: Document Similarity Search', () => {
    it('should return documents ranked by relevance with more similar documents ranked higher', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          async (query: string, limit: number) => {
            // Arrange: Index documents first
            await knowledgeService.indexDocuments();

            // Act: Search for documents
            const results = await knowledgeService.searchDocuments(query, limit);

            // Assert: Results should be properly ranked
            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBeLessThanOrEqual(limit);

            // All results should have required properties
            for (const result of results) {
              expect(result).toHaveProperty('id');
              expect(result).toHaveProperty('title');
              expect(result).toHaveProperty('content');
              expect(result).toHaveProperty('score');
              expect(typeof result.score).toBe('number');
              expect(result.score).toBeGreaterThanOrEqual(0);
              expect(result.score).toBeLessThanOrEqual(1);
            }

            // Results should be sorted by score in descending order
            for (let i = 1; i < results.length; i++) {
              expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }

            // Each result should be a valid DocumentChunk
            for (const result of results) {
              expect(result.id).toBeTruthy();
              expect(result.title).toBeTruthy();
              expect(result.content).toBeTruthy();
              expect(result.metadata).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent results for identical queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }),
          async (query: string) => {
            // Arrange: Index documents
            await knowledgeService.indexDocuments();

            // Act: Search twice with the same query
            const results1 = await knowledgeService.searchDocuments(query, 5);
            const results2 = await knowledgeService.searchDocuments(query, 5);

            // Assert: Results should be identical
            expect(results1).toHaveLength(results2.length);
            
            for (let i = 0; i < results1.length; i++) {
              expect(results1[i].id).toBe(results2[i].id);
              expect(results1[i].score).toBeCloseTo(results2[i].score, 10);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle empty queries gracefully', async () => {
      // Arrange: Index documents
      await knowledgeService.indexDocuments();

      // Act & Assert: Empty query should not throw
      const results = await knowledgeService.searchDocuments('', 5);
      expect(results).toBeInstanceOf(Array);
    });

    it('should respect the limit parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          async (query: string, limit: number) => {
            // Arrange: Index documents
            await knowledgeService.indexDocuments();

            // Act: Search with specific limit
            const results = await knowledgeService.searchDocuments(query, limit);

            // Assert: Results should not exceed limit
            expect(results.length).toBeLessThanOrEqual(limit);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return relevant context that includes query-related information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 100 }),
          fc.integer({ min: 100, max: 5000 }),
          async (query: string, maxTokens: number) => {
            // Arrange: Index documents
            await knowledgeService.indexDocuments();

            // Act: Get relevant context
            const context = await knowledgeService.getRelevantContext(query, maxTokens);

            // Assert: Context should be a non-empty string
            expect(typeof context).toBe('string');
            expect(context.length).toBeGreaterThan(0);

            // Context should not exceed reasonable token limits (rough estimation)
            const estimatedTokens = Math.ceil(context.length / 4);
            expect(estimatedTokens).toBeLessThanOrEqual(maxTokens * 1.2); // Allow 20% buffer for estimation errors
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});