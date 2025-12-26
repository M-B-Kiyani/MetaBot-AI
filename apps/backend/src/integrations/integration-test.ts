import { GoogleCalendarService } from './GoogleCalendarService';
import { HubSpotService } from './HubSpotService';
import { logger } from '../config/logger';

/**
 * Integration test to verify external services are properly configured
 */
export async function testExternalServiceIntegrations(): Promise<void> {
  logger.info('Testing external service integrations...');

  // Test Google Calendar Service
  const calendarService = new GoogleCalendarService();
  const isCalendarConfigured = calendarService.isConfigured();
  
  logger.info('Google Calendar Service Configuration:', {
    configured: isCalendarConfigured,
    calendarId: process.env.GOOGLE_CALENDAR_ID ? 'Set' : 'Not set',
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'Set (direct)' : 
                      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ? 'Set (file)' : 'Not set',
    timezone: process.env.TIMEZONE || process.env.GOOGLE_CALENDAR_TIMEZONE || 'Default (Europe/London',
    rateLimiterStatus: calendarService.getRateLimiterStatus(),
  });

  // Test HubSpot Service
  const hubspotService = new HubSpotService();
  const isHubSpotConfigured = hubspotService.isConfigured();
  
  logger.info('HubSpot Service Configuration:', {
    configured: isHubSpotConfigured,
    apiKey: (process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN) ? 'Set' : 'Not set',
  });

  if (isHubSpotConfigured) {
    try {
      const connectionTest = await hubspotService.testConnection();
      logger.info('HubSpot Connection Test:', { success: connectionTest });
    } catch (error) {
      logger.warn('HubSpot Connection Test Failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Summary
  const servicesConfigured = {
    googleCalendar: isCalendarConfigured,
    hubspot: isHubSpotConfigured,
  };

  const totalConfigured = Object.values(servicesConfigured).filter(Boolean).length;
  const totalServices = Object.keys(servicesConfigured).length;

  logger.info('External Services Integration Summary:', {
    ...servicesConfigured,
    configuredCount: `${totalConfigured}/${totalServices}`,
    allConfigured: totalConfigured === totalServices,
  });

  if (totalConfigured === totalServices) {
    logger.info('✅ All external services are properly configured and ready');
  } else {
    logger.warn('⚠️ Some external services are not configured. Check environment variables.');
  }
}

// Export individual service instances for use in other parts of the application
export const googleCalendarService = new GoogleCalendarService();
export const hubspotService = new HubSpotService();