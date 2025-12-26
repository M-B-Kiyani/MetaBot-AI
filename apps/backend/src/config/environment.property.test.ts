import * as fc from 'fast-check';

// Feature: ai-booking-voice-assistant, Property 19: Environment Validation Round Trip
// **Validates: Requirements 9.5, 11.3**

describe('Environment Validation Property Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  describe('Property 19: Environment Validation Round Trip', () => {
    test('For any system startup, all required environment variables should be validated, and the system should fail fast with clear error messages if any are missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Test different combinations of missing required variables
            missingVars: fc.subarray(
              ['DATABASE_URL'], // Only DATABASE_URL is truly required
              { minLength: 1, maxLength: 1 }
            ),
            validVars: fc.record({
              NODE_ENV: fc.constantFrom('development', 'production', 'test'),
              PORT: fc.integer({ min: 1000, max: 9999 }).map(String),
              GOOGLE_SERVICE_ACCOUNT_KEY: fc.option(
                fc.string({ minLength: 10 }),
                { nil: undefined }
              ),
              GOOGLE_CALENDAR_ID: fc.option(fc.string({ minLength: 5 }), {
                nil: undefined,
              }),
              HUBSPOT_API_KEY: fc.option(fc.string({ minLength: 10 }), {
                nil: undefined,
              }),
              RETELL_API_KEY: fc.option(fc.string({ minLength: 10 }), {
                nil: undefined,
              }),
              GEMINI_API_KEY: fc.option(fc.string({ minLength: 10 }), {
                nil: undefined,
              }),
              ALLOWED_ORIGINS: fc.option(fc.string(), { nil: undefined }),
            }),
          }),
          async ({ missingVars, validVars }) => {
            // Set up environment with valid variables
            Object.entries(validVars).forEach(([key, value]) => {
              if (value !== undefined) {
                process.env[key] = value;
              }
            });

            // Remove the missing variables
            missingVars.forEach((varName) => {
              delete process.env[varName];
            });

            // Mock console.error and process.exit
            const consoleSpy = jest
              .spyOn(console, 'error')
              .mockImplementation();
            const exitSpy = jest
              .spyOn(process, 'exit')
              .mockImplementation((code?: number) => {
                throw new Error(`Process exit called with code: ${code}`);
              });

            try {
              // Try to import the environment config (this should trigger validation)
              await import('../config/environment');

              // If we get here, validation didn't fail as expected
              expect(exitSpy).toHaveBeenCalledWith(1);
            } catch (error: any) {
              // Should have called process.exit(1)
              expect(exitSpy).toHaveBeenCalledWith(1);

              // Should have logged an error
              expect(consoleSpy).toHaveBeenCalledWith(
                'Environment validation failed:',
                expect.any(Object)
              );
            }

            consoleSpy.mockRestore();
            exitSpy.mockRestore();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('For any valid environment configuration, the system should start successfully and provide access to all configuration values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            NODE_ENV: fc.constantFrom('development', 'production', 'test'),
            PORT: fc.integer({ min: 1000, max: 9999 }),
            DATABASE_URL: fc
              .string({ minLength: 20 })
              .map((url) => `postgresql://user:pass@localhost:5432/${url}`),
            GOOGLE_SERVICE_ACCOUNT_KEY: fc.option(
              fc.string({ minLength: 10 }),
              { nil: undefined }
            ),
            GOOGLE_CALENDAR_ID: fc.option(fc.string({ minLength: 5 }), {
              nil: undefined,
            }),
            HUBSPOT_API_KEY: fc.option(fc.string({ minLength: 10 }), {
              nil: undefined,
            }),
            RETELL_API_KEY: fc.option(fc.string({ minLength: 10 }), {
              nil: undefined,
            }),
            GEMINI_API_KEY: fc.option(fc.string({ minLength: 10 }), {
              nil: undefined,
            }),
            ALLOWED_ORIGINS: fc.option(fc.string(), { nil: undefined }),
          }),
          async (envVars) => {
            // Set up environment with all valid variables
            Object.entries(envVars).forEach(([key, value]) => {
              if (value !== undefined) {
                process.env[key] = String(value);
              }
            });

            // Mock console.error and process.exit to ensure they're not called
            const consoleSpy = jest
              .spyOn(console, 'error')
              .mockImplementation();
            const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

            try {
              // Import the environment config
              const { config, isDevelopment, isProduction, isTest } =
                await import('../config/environment');

              // Should not have called console.error or process.exit
              expect(consoleSpy).not.toHaveBeenCalled();
              expect(exitSpy).not.toHaveBeenCalled();

              // Verify configuration values are accessible and correct
              expect(config).toBeDefined();
              expect(config.NODE_ENV).toBe(envVars.NODE_ENV);
              expect(config.PORT).toBe(Number(envVars.PORT));
              expect(config.DATABASE_URL).toBe(envVars.DATABASE_URL);

              // Verify optional values
              if (envVars.GOOGLE_SERVICE_ACCOUNT_KEY) {
                expect(config.GOOGLE_SERVICE_ACCOUNT_KEY).toBe(
                  envVars.GOOGLE_SERVICE_ACCOUNT_KEY
                );
              }
              if (envVars.HUBSPOT_API_KEY) {
                expect(config.HUBSPOT_API_KEY).toBe(envVars.HUBSPOT_API_KEY);
              }

              // Verify environment flags
              expect(isDevelopment).toBe(envVars.NODE_ENV === 'development');
              expect(isProduction).toBe(envVars.NODE_ENV === 'production');
              expect(isTest).toBe(envVars.NODE_ENV === 'test');
            } catch (error) {
              // Should not throw any errors with valid configuration
              expect(error).toBeUndefined();
            }

            consoleSpy.mockRestore();
            exitSpy.mockRestore();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('For any environment with invalid values, the system should fail with descriptive error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            invalidScenario: fc.constantFrom(
              'invalid_node_env',
              'invalid_port',
              'empty_database_url'
            ),
          }),
          async ({ invalidScenario }) => {
            // Set up base valid environment
            process.env.DATABASE_URL =
              'postgresql://user:pass@localhost:5432/testdb';
            process.env.NODE_ENV = 'development';
            process.env.PORT = '3000';

            // Introduce specific invalid values
            switch (invalidScenario) {
              case 'invalid_node_env':
                process.env.NODE_ENV = 'invalid_env';
                break;
              case 'invalid_port':
                process.env.PORT = 'not_a_number';
                break;
              case 'empty_database_url':
                process.env.DATABASE_URL = '';
                break;
            }

            // Mock console.error and process.exit
            const consoleSpy = jest
              .spyOn(console, 'error')
              .mockImplementation();
            const exitSpy = jest
              .spyOn(process, 'exit')
              .mockImplementation((code?: number) => {
                throw new Error(`Process exit called with code: ${code}`);
              });

            try {
              // Try to import the environment config
              await import('../config/environment');

              // If we get here, validation didn't fail as expected
              expect(true).toBe(false); // Force failure
            } catch (error: any) {
              // Should have called process.exit(1)
              expect(error.message).toContain(
                'Process exit called with code: 1'
              );

              // Should have logged a descriptive error
              expect(consoleSpy).toHaveBeenCalledWith(
                'Environment validation failed:',
                expect.any(Object)
              );
            }

            consoleSpy.mockRestore();
            exitSpy.mockRestore();
          }
        ),
        { numRuns: 15 }
      );
    });

    test('Environment validation should be deterministic and consistent', async () => {
      // Set up a valid environment
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3000';

      // Import multiple times and verify consistency
      const config1 = (await import('../config/environment')).config;
      const config2 = (await import('../config/environment')).config;
      const config3 = (await import('../config/environment')).config;

      // All imports should return the same configuration
      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
      expect(config1.NODE_ENV).toBe('development');
      expect(config1.PORT).toBe(3000);
      expect(config1.DATABASE_URL).toBe(
        'postgresql://user:pass@localhost:5432/testdb'
      );
    });
  });
});
