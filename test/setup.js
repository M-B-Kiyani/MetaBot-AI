// Test setup file
process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY = "test-key-for-testing";
process.env.HUBSPOT_ACCESS_TOKEN = "test-hubspot-token";
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@example.com";
process.env.GOOGLE_CALENDAR_ID = "test-calendar-id";
process.env.RETELL_API_KEY = "test-retell-key";
process.env.CORS_ORIGINS = "http://localhost:3000";

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Only suppress specific error messages during tests
  console.error = jest.fn((message, ...args) => {
    if (
      typeof message === "string" &&
      (message.includes("Error detecting booking intent") ||
        message.includes("Error extracting booking info") ||
        message.includes("API key not valid"))
    ) {
      return; // Suppress these expected errors in tests
    }
    originalConsoleError(message, ...args);
  });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});
