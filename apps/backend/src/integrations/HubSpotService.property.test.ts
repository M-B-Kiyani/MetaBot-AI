import * as fc from 'fast-check';
import { Booking, BookingStatus } from '../../../../packages/shared/src/types/booking';

// Feature: ai-booking-voice-assistant, Property 5: CRM Contact Integration
// **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

// Mock the logger before importing HubSpotService
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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

describe('HubSpotService Property Tests', () => {
  let hubspotService: HubSpotService;

  beforeEach(() => {
    // Set required environment variables
    process.env.HUBSPOT_API_KEY = 'test-hubspot-api-key';

    // Clear all mocks
    jest.clearAllMocks();

    hubspotService = new HubSpotService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Property 5: CRM Contact Integration
  // For any booking creation, a HubSpot contact should be created or updated with customer details 
  // and booking metadata, and the CRM contact ID should be stored in the booking record.
  test('Property 5: CRM Contact Integration', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid booking data
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (booking: Booking) => {
          // Clear mocks for this iteration
          jest.clearAllMocks();
          
          const mockContactId = 'contact-' + Math.random().toString(36).substr(2, 9);

          // Test scenario 1: New contact creation
          mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValue({
            results: [], // No existing contact found
          });

          mockHubSpotClient.crm.contacts.basicApi.create.mockResolvedValue({
            id: mockContactId,
          });

          const contactData = HubSpotService.extractContactDataFromBooking(booking);
          const createdContactId = await hubspotService.createOrUpdateContact(contactData);

          // Verify contact creation was called with correct parameters for this iteration
          expect(mockHubSpotClient.crm.contacts.searchApi.doSearch).toHaveBeenLastCalledWith(
            expect.objectContaining({
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: 'email',
                      operator: 'EQ',
                      value: booking.email,
                    },
                  ],
                },
              ],
            })
          );

          expect(mockHubSpotClient.crm.contacts.basicApi.create).toHaveBeenLastCalledWith(
            expect.objectContaining({
              properties: expect.objectContaining({
                email: booking.email,
                lifecyclestage: 'lead',
                lead_status: 'new',
              }),
            })
          );

          // Verify the contact ID is returned
          expect(createdContactId).toBe(mockContactId);

          // Test adding booking metadata to contact
          mockHubSpotClient.crm.contacts.basicApi.getById.mockResolvedValue({
            properties: { total_bookings: '0' },
          });

          mockHubSpotClient.crm.contacts.basicApi.update.mockResolvedValue({});

          await hubspotService.addBookingToContact(mockContactId, booking);

          // Verify booking metadata was added with the correct data for this iteration
          expect(mockHubSpotClient.crm.contacts.basicApi.update).toHaveBeenLastCalledWith(
            mockContactId,
            expect.objectContaining({
              properties: expect.objectContaining({
                last_booking_date: booking.startTime.toISOString().split('T')[0],
                last_booking_duration: booking.duration.toString(), // Convert to string to match implementation
                last_booking_status: booking.status,
                last_booking_inquiry: booking.inquiry || '',
                total_bookings: '1', // Convert to string to match implementation
              }),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5a: Contact Data Extraction Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(name => name.trim().length > 0), // Ensure non-empty after trim
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(BookingStatus.PENDING, BookingStatus.CONFIRMED),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (booking: Booking) => {
          // For any valid booking, extracting contact data should produce valid ContactData
          const contactData = HubSpotService.extractContactDataFromBooking(booking);

          // Email should always be preserved
          expect(contactData.email).toBe(booking.email);

          // Phone should be preserved if provided
          if (booking.phone) {
            expect(contactData.phone).toBe(booking.phone);
          }

          // Name should be split into firstname and lastname
          const nameParts = booking.name.trim().split(' ').filter(part => part.length > 0);
          if (nameParts.length > 0) {
            expect(contactData.firstname).toBe(nameParts[0]);
            if (nameParts.length > 1) {
              expect(contactData.lastname).toBe(nameParts.slice(1).join(' '));
            }
          }

          // Default lifecycle stage and lead status should be set
          expect(contactData.lifecyclestage).toBe('lead');
          expect(contactData.lead_status).toBe('new');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5b: Contact Update vs Create Logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          firstname: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          lastname: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
        }),
        fc.boolean(), // Whether contact exists
        async (contactData: ContactData, contactExists: boolean) => {
          // Clear mocks for each iteration
          jest.clearAllMocks();
          
          const mockContactId = 'contact-' + Math.random().toString(36).substr(2, 9);

          if (contactExists) {
            // Mock existing contact found
            mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValue({
              results: [{ id: mockContactId }],
            });

            mockHubSpotClient.crm.contacts.basicApi.update.mockResolvedValue({});

            const result = await hubspotService.createOrUpdateContact(contactData);

            // For any existing contact, update should be called instead of create
            expect(mockHubSpotClient.crm.contacts.basicApi.update).toHaveBeenCalledTimes(1);
            expect(mockHubSpotClient.crm.contacts.basicApi.create).not.toHaveBeenCalled();
            expect(result).toBe(mockContactId);
          } else {
            // Mock no existing contact found
            mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValue({
              results: [],
            });

            mockHubSpotClient.crm.contacts.basicApi.create.mockResolvedValue({
              id: mockContactId,
            });

            const result = await hubspotService.createOrUpdateContact(contactData);

            // For any new contact, create should be called instead of update
            expect(mockHubSpotClient.crm.contacts.basicApi.create).toHaveBeenCalledTimes(1);
            expect(mockHubSpotClient.crm.contacts.basicApi.update).not.toHaveBeenCalled();
            expect(result).toBe(mockContactId);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5c: Booking Count Increment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // contactId
        fc.integer({ min: 0, max: 100 }), // current booking count
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          inquiry: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
          duration: fc.constantFrom(15, 30, 45, 60, 90, 120),
          status: fc.constantFrom(BookingStatus.PENDING, BookingStatus.CONFIRMED),
          confirmationSent: fc.boolean(),
          reminderSent: fc.boolean(),
          calendarEventId: fc.option(fc.uuid()),
          crmContactId: fc.option(fc.uuid()),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        async (contactId: string, currentCount: number, booking: Booking) => {
          // Clear mocks for this iteration
          jest.clearAllMocks();
          
          // Mock getting current booking count
          mockHubSpotClient.crm.contacts.basicApi.getById.mockResolvedValue({
            properties: { total_bookings: currentCount.toString() },
          });

          mockHubSpotClient.crm.contacts.basicApi.update.mockResolvedValue({});

          await hubspotService.addBookingToContact(contactId, booking);

          // For any booking addition, the total booking count should be incremented by 1
          expect(mockHubSpotClient.crm.contacts.basicApi.update).toHaveBeenLastCalledWith(
            contactId,
            expect.objectContaining({
              properties: expect.objectContaining({
                total_bookings: (currentCount + 1).toString(), // Convert to string to match implementation
              }),
            })
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});