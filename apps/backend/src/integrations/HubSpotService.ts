import { Client } from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';
import { Booking } from '../../../../packages/shared/src/types/booking';
import { logger } from '../config/logger';

export interface ContactData {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  lead_status?: string;
}

export interface ContactProperties {
  [key: string]: string;
}

export class HubSpotService {
  private client: Client;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
    this.isEnabled = !!apiKey;

    if (this.isEnabled && apiKey) {
      this.client = new Client({ accessToken: apiKey });
    } else {
      logger.warn('HubSpot API key not provided, CRM integration disabled');
      // Create a mock client for when HubSpot is not configured
      this.client = {} as Client;
    }
  }

  /**
   * Create or update a contact in HubSpot
   */
  async createOrUpdateContact(contactData: ContactData): Promise<string> {
    if (!this.isEnabled) {
      logger.warn('HubSpot integration disabled, skipping contact creation');
      throw new Error('HubSpot integration is not configured');
    }

    try {
      // First, try to find existing contact by email
      const existingContact = await this.findContactByEmail(contactData.email);

      if (existingContact) {
        // Update existing contact
        const updatedContact = await this.updateContact(existingContact.id, contactData);
        logger.info('HubSpot contact updated successfully', {
          contactId: updatedContact.id,
          email: contactData.email,
        });
        return updatedContact.id;
      } else {
        // Create new contact
        const newContact = await this.createContact(contactData);
        logger.info('HubSpot contact created successfully', {
          contactId: newContact.id,
          email: contactData.email,
        });
        return newContact.id;
      }
    } catch (error) {
      logger.error('Failed to create or update HubSpot contact', {
        email: contactData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`HubSpot contact operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add booking metadata to a contact
   */
  async addBookingToContact(contactId: string, booking: Booking): Promise<void> {
    if (!this.isEnabled) {
      logger.warn('HubSpot integration disabled, skipping booking metadata update');
      return;
    }

    try {
      const bookingProperties: ContactProperties = {
        last_booking_date: booking.startTime.toISOString().split('T')[0] as string,
        last_booking_duration: booking.duration.toString(),
        last_booking_status: booking.status,
        last_booking_inquiry: booking.inquiry || '',
        total_bookings: (await this.incrementBookingCount(contactId)).toString(),
      };

      await this.client.crm.contacts.basicApi.update(contactId, {
        properties: bookingProperties,
      });

      logger.info('Booking metadata added to HubSpot contact', {
        contactId,
        bookingId: booking.id,
      });
    } catch (error) {
      logger.error('Failed to add booking metadata to HubSpot contact', {
        contactId,
        bookingId: booking.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to update contact with booking metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find a contact by email address
   */
  private async findContactByEmail(email: string): Promise<{ id: string } | null> {
    try {
      const searchRequest = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: FilterOperatorEnum.Eq,
                value: email,
              },
            ],
          },
        ],
        properties: ['email', 'firstname', 'lastname'],
        limit: 1,
      };

      const searchResult = await this.client.crm.contacts.searchApi.doSearch(searchRequest);

      if (searchResult.results && searchResult.results.length > 0) {
        const firstResult = searchResult.results[0];
        if (firstResult && firstResult.id) {
          return { id: firstResult.id };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to search for contact by email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  private async createContact(contactData: ContactData): Promise<{ id: string }> {
    const properties: ContactProperties = {
      email: contactData.email,
    };

    // Add optional properties if provided
    if (contactData.firstname) properties.firstname = contactData.firstname;
    if (contactData.lastname) properties.lastname = contactData.lastname;
    if (contactData.phone) properties.phone = contactData.phone;
    if (contactData.company) properties.company = contactData.company;
    if (contactData.website) properties.website = contactData.website;
    if (contactData.lifecyclestage) properties.lifecyclestage = contactData.lifecyclestage;
    if (contactData.lead_status) properties.lead_status = contactData.lead_status;

    // Set default lifecycle stage if not provided
    if (!properties.lifecyclestage) {
      properties.lifecyclestage = 'lead';
    }

    const createRequest = {
      properties,
    };

    const result = await this.client.crm.contacts.basicApi.create(createRequest);
    return { id: result.id };
  }

  /**
   * Update an existing contact
   */
  private async updateContact(contactId: string, contactData: ContactData): Promise<{ id: string }> {
    const properties: ContactProperties = {};

    // Only update provided properties
    if (contactData.firstname) properties.firstname = contactData.firstname;
    if (contactData.lastname) properties.lastname = contactData.lastname;
    if (contactData.phone) properties.phone = contactData.phone;
    if (contactData.company) properties.company = contactData.company;
    if (contactData.website) properties.website = contactData.website;
    if (contactData.lifecyclestage) properties.lifecyclestage = contactData.lifecyclestage;
    if (contactData.lead_status) properties.lead_status = contactData.lead_status;

    const updateRequest = {
      properties,
    };

    await this.client.crm.contacts.basicApi.update(contactId, updateRequest);
    return { id: contactId };
  }

  /**
   * Increment the booking count for a contact
   */
  private async incrementBookingCount(contactId: string): Promise<number> {
    try {
      // Get current booking count
      const contact = await this.client.crm.contacts.basicApi.getById(contactId, ['total_bookings']);
      const currentCount = contact.properties?.total_bookings ? parseInt(contact.properties.total_bookings as string, 10) : 0;
      const newCount = currentCount + 1;

      return newCount;
    } catch (error) {
      logger.warn('Failed to get current booking count, defaulting to 1', {
        contactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 1;
    }
  }

  /**
   * Extract contact data from booking information
   */
  static extractContactDataFromBooking(booking: Booking): ContactData {
    const nameParts = booking.name.trim().split(' ').filter(part => part.length > 0);
    const firstname = nameParts[0] || undefined;
    const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

    const result: ContactData = {
      email: booking.email,
      lifecyclestage: 'lead',
      lead_status: 'new',
    };

    if (firstname) {
      result.firstname = firstname;
    }
    if (lastname) {
      result.lastname = lastname;
    }
    if (booking.phone) {
      result.phone = booking.phone;
    }

    return result;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Test the HubSpot connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // Try to get account info to test the connection
      await this.client.crm.contacts.basicApi.getPage(1);
      return true;
    } catch (error) {
      logger.error('HubSpot connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}