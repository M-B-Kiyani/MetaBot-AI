// External service integrations
export { GoogleCalendarService } from './GoogleCalendarService';
export { HubSpotService, type ContactData } from './HubSpotService';

// Service instances
export { googleCalendarService, hubspotService, testExternalServiceIntegrations } from './integration-test';

// Types
export type { CalendarEvent } from './GoogleCalendarService';
export type { ContactProperties } from './HubSpotService';