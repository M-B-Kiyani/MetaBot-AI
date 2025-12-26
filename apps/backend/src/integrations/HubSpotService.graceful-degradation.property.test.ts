import * as fc from 'fast-check';
import {
  Booking,
  BookingStatus,
} from '../../../../packages/shared/src/types/booking';

// Feature: ai-booking-voice-assistant, Property 6: CRM Failure Graceful Degradation
// **Validates: Requirements 3.4**

// Mock the logger before importing HubSpotService
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

// Mock HubSpot API client
const mockHubSpotClient = {
  crm: {
    contacts: {
      basicApi: {
        create: jest.fn(),
        update: jest.fn(),
        getById: jest.fn(),
        getPage: jest.fn(),
      },
      searchApi: {
        doSearch: jest.fn(),
      },
    },
  },
};

jest.mock('@hubspot/api-client', () => ({
  Client: jest.fn().mockImplementation(() => mockHubSpotClient),
}));

import { HubSpotService, ContactData } from './HubSpotService';

describe('HubSpotService Graceful Degradation Property Tests', () => {
  let hubspotService: HubSpotService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Property 6: CRM Failure Graceful Degradation
  // For any booking creation where CRM integration fails, the booking should still be created successfully
  // and the error should be logged.
  test('Property 6: CRM Failure Graceful Degradation - Service Disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          firstname: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          lastname: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
        }),
        async (contactData: ContactData) => {
          // Test when HubSpot is not configured (no API key)
          delete process.env.HUBSPOT_API_KEY;
          hubspotService = new HubSpotService();

          // For any contact data, when HubSpot is disabled, operations should fail gracefully
          await expect(
            hubspotService.createOrUpdateContact(contactData)
          ).rejects.toThrow('HubSpot integration is not configured');

          // Service should report as not configured
          expect(hubspotService.isConfigured()).toBe(false);

          // Test connection should return false
          const connectionTest = await hubspotService.testConnection();
          expect(connectionTest).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 6a: CRM API Failure Graceful Degradation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          firstname: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          lastname: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
        }),
        fc.string({ minLength: 1, maxLength: 100 }), // Error message
        async (contactData: ContactData, errorMessage: string) => {
          // Set up HubSpot as configured
          process.env.HUBSPOT_API_KEY = 'test-hubspot-api-key';
          hubspotService = new HubSpotService();

          // Mock API failures
          const apiError = new Error(errorMessage);
          mockHubSpotClient.crm.contacts.searchApi.doSearch.mockRejectedValue(
            apiError
          );

          // For any contact data and any API error, the service should throw an error with context
          await expect(
            hubspotService.createOrUpdateContact(contactData)
          ).rejects.toThrow();

          // The error should be logged (verify logger was called)
          const { logger } = require('../config/logger');
          expect(logger.error).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 6b: Booking Metadata Addition Failure Graceful Degradation', async () => {
    // Set up HubSpot as configured BEFORE the test runs
    process.env.HUBSPOT_API_KEY = 'test-hubspot-api-key';
    hubspotService = new HubSpotService();

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // contactId
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({
            min: new Date(),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
          ),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        fc.string({ minLength: 5, maxLength: 100 }), // Error message - ensure it's not empty
        async (contactId: string, booking: Booking, errorMessage: string) => {
          // Clear mocks for each iteration
          jest.clearAllMocks();

          // Mock booking metadata addition failure
          const apiError = new Error(errorMessage);
          mockHubSpotClient.crm.contacts.basicApi.getById.mockRejectedValue(
            apiError
          );
          mockHubSpotClient.crm.contacts.basicApi.update.mockRejectedValue(
            apiError
          );

          // For any booking metadata addition failure, the service should throw an error
          await expect(
            hubspotService.addBookingToContact(contactId, booking)
          ).rejects.toThrow();

          // The error should be logged
          const { logger } = require('../config/logger');
          expect(logger.error).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 6c: Service Disabled Graceful Degradation for Booking Metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // contactId
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({
            min: new Date(),
            max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
          ),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (contactId: string, booking: Booking) => {
          // Test when HubSpot is not configured (no API key)
          delete process.env.HUBSPOT_API_KEY;
          hubspotService = new HubSpotService();

          // For any booking metadata addition when HubSpot is disabled, it should complete without error
          await expect(
            hubspotService.addBookingToContact(contactId, booking)
          ).resolves.not.toThrow();

          // Warning should be logged
          const { logger } = require('../config/logger');
          expect(logger.warn).toHaveBeenCalledWith(
            'HubSpot integration disabled, skipping booking metadata update'
          );

          // No API calls should be made
          expect(
            mockHubSpotClient.crm.contacts.basicApi.update
          ).not.toHaveBeenCalled();
          expect(
            mockHubSpotClient.crm.contacts.basicApi.getById
          ).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 6d: Connection Test Failure Graceful Degradation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // Error message
        async (errorMessage: string) => {
          // Set up HubSpot as configured
          process.env.HUBSPOT_API_KEY = 'test-hubspot-api-key';
          hubspotService = new HubSpotService();

          // Mock connection test failure
          const apiError = new Error(errorMessage);
          mockHubSpotClient.crm.contacts.basicApi.getPage.mockRejectedValue(
            apiError
          );

          // For any connection test failure, it should return false and log the error
          const result = await hubspotService.testConnection();
          expect(result).toBe(false);

          // The error should be logged
          const { logger } = require('../config/logger');
          expect(logger.error).toHaveBeenCalledWith(
            'HubSpot connection test failed',
            expect.objectContaining({
              error: errorMessage,
            })
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
