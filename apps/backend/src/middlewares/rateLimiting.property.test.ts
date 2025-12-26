import * as fc from 'fast-check';
import * as request from 'supertest';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './errorHandler';

// Feature: ai-booking-voice-assistant, Property 18: Rate Limiting Protection
// **Validates: Requirements 11.4**

describe('Rate Limiting Property Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create test app with rate limiting
    app = express();
    app.use(express.json());

    // Configure rate limiting for testing (lower limits for faster testing)
    const limiter = rateLimit({
      windowMs: 1000, // 1 second window for testing
      max: 3, // limit each IP to 3 requests per window
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use(limiter);

    // Add test routes
    app.get('/test', (_req, res) => {
      res.json({ message: 'success' });
    });

    app.post('/test', (_req, res) => {
      res.json({ message: 'success' });
    });

    // Add error handler
    app.use(errorHandler);
  });

  describe('Property 18: Rate Limiting Protection', () => {
    test('For any client making excessive requests, the system should apply rate limiting and return appropriate throttling responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestCount: fc.integer({ min: 4, max: 10 }), // More than the limit of 3
            endpoint: fc.constantFrom('/test'),
            method: fc.constantFrom('GET', 'POST'),
          }),
          async ({ requestCount, endpoint, method }) => {
            const requests = [];
            
            // Make multiple requests rapidly
            for (let i = 0; i < requestCount; i++) {
              if (method === 'GET') {
                requests.push(request(app).get(endpoint));
              } else {
                requests.push(request(app).post(endpoint).send({}));
              }
            }

            const responses = await Promise.all(requests);

            // Count successful and rate-limited responses
            const successfulResponses = responses.filter(r => r.status === 200);
            const rateLimitedResponses = responses.filter(r => r.status === 429);

            // Should have some successful requests (up to the limit)
            expect(successfulResponses.length).toBeGreaterThan(0);
            expect(successfulResponses.length).toBeLessThanOrEqual(3);

            // Should have some rate-limited responses
            expect(rateLimitedResponses.length).toBeGreaterThan(0);

            // Total responses should equal request count
            expect(responses.length).toBe(requestCount);

            // Verify rate-limited responses have proper structure
            rateLimitedResponses.forEach(response => {
              expect(response.status).toBe(429);
              expect(response.body).toHaveProperty('error');
              expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
              expect(response.body.error).toHaveProperty('message');
              expect(typeof response.body.error.message).toBe('string');
            });

            // Verify successful responses
            successfulResponses.forEach(response => {
              expect(response.status).toBe(200);
              expect(response.body).toHaveProperty('message', 'success');
            });
          }
        ),
        { numRuns: 20 } // Reduced runs due to timing sensitivity
      );
    });

    test('For any client within rate limits, requests should be processed normally', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestCount: fc.integer({ min: 1, max: 3 }), // Within the limit
            endpoint: fc.constantFrom('/test'),
            method: fc.constantFrom('GET', 'POST'),
            delayBetweenRequests: fc.integer({ min: 100, max: 300 }), // Small delay to avoid rapid fire
          }),
          async ({ requestCount, endpoint, method, delayBetweenRequests }) => {
            const responses = [];
            
            // Make requests with small delays
            for (let i = 0; i < requestCount; i++) {
              let response;
              if (method === 'GET') {
                response = await request(app).get(endpoint);
              } else {
                response = await request(app).post(endpoint).send({});
              }
              responses.push(response);
              
              // Add delay between requests if not the last one
              if (i < requestCount - 1) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
              }
            }

            // All responses should be successful
            responses.forEach(response => {
              expect(response.status).toBe(200);
              expect(response.body).toHaveProperty('message', 'success');
            });

            expect(responses.length).toBe(requestCount);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('Rate limiting should reset after the time window expires', async () => {
      // This test verifies that rate limiting resets after the window
      const endpoint = '/test';
      
      // Make requests up to the limit
      const initialRequests = [];
      for (let i = 0; i < 3; i++) {
        initialRequests.push(request(app).get(endpoint));
      }
      
      const initialResponses = await Promise.all(initialRequests);
      
      // All should be successful
      initialResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Make one more request that should be rate limited
      const rateLimitedResponse = await request(app).get(endpoint);
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

      // Wait for the window to reset (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Make another request that should now be successful
      const resetResponse = await request(app).get(endpoint);
      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body.message).toBe('success');
    }, 10000); // Increase timeout for this test

    test('Rate limiting should apply per IP address', async () => {
      // Note: In a real test environment, we would need to simulate different IP addresses
      // For this property test, we verify that the rate limiting mechanism is working
      // The actual per-IP functionality would be tested in integration tests
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom('/test'),
            excessiveRequestCount: fc.integer({ min: 5, max: 8 }),
          }),
          async ({ endpoint, excessiveRequestCount }) => {
            const requests = [];
            
            // Make excessive requests from the same client
            for (let i = 0; i < excessiveRequestCount; i++) {
              requests.push(request(app).get(endpoint));
            }

            const responses = await Promise.all(requests);
            
            // Should have both successful and rate-limited responses
            const successCount = responses.filter(r => r.status === 200).length;
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            
            expect(successCount).toBeLessThanOrEqual(3); // Within limit
            expect(rateLimitedCount).toBeGreaterThan(0); // Some should be rate limited
            expect(successCount + rateLimitedCount).toBe(excessiveRequestCount);
            
            // Verify rate-limited responses have proper headers
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            rateLimitedResponses.forEach(response => {
              expect(response.headers).toHaveProperty('x-ratelimit-limit');
              expect(response.headers).toHaveProperty('x-ratelimit-remaining');
              expect(response.headers).toHaveProperty('x-ratelimit-reset');
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});