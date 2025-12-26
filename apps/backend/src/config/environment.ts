import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().optional(),
  REQUEST_TIMEOUT: z.coerce.number().default(30000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_CONNECTION_TIMEOUT: z.coerce.number().default(10000),
  DATABASE_POOL_SIZE: z.coerce.number().default(20),
  DATABASE_QUERY_TIMEOUT: z.coerce.number().default(10000),

  // Authentication
  API_KEY: z.string().optional(),
  WIDGET_API_KEY: z.string().optional(),
  PUBLIC_WIDGET_KEY: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  API_KEY_HEADER: z.string().default('Authorization'),

  // CORS Configuration
  ALLOWED_ORIGINS: z.string().optional(),
  ALLOWED_METHODS: z.string().default('GET,POST,PUT,PATCH,DELETE,OPTIONS'),
  ALLOWED_HEADERS: z.string().default('Content-Type,Authorization,x-api-key'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  CORS_MAX_AGE: z.coerce.number().default(86400),

  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  FROM_NAME: z.string().optional(),
  EMAIL_RETRY_ATTEMPTS: z.coerce.number().default(3),
  EMAIL_RETRY_DELAY: z.coerce.number().default(2000),

  // Google Calendar
  GOOGLE_CALENDAR_ENABLED: z.coerce.boolean().default(false),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  GOOGLE_CALENDAR_TIMEZONE: z.string().default('Europe/London'),
  GOOGLE_CALENDAR_RETRY_ATTEMPTS: z.coerce.number().default(3),
  GOOGLE_CALENDAR_RETRY_DELAY: z.coerce.number().default(1000),

  // HubSpot CRM
  HUBSPOT_ENABLED: z.coerce.boolean().default(false),
  HUBSPOT_API_KEY: z.string().optional(),
  HUBSPOT_ACCESS_TOKEN: z.string().optional(),
  HUBSPOT_CLIENT_SECRET: z.string().optional(),
  HUBSPOT_PERSONAL_ACCESS_KEY: z.string().optional(),
  HUBSPOT_RETRY_ATTEMPTS: z.coerce.number().default(3),
  HUBSPOT_RETRY_DELAY: z.coerce.number().default(1000),

  // Retell AI Voice
  RETELL_ENABLED: z.coerce.boolean().default(false),
  RETELL_API_KEY: z.string().optional(),
  RETELL_AGENT_ID: z.string().optional(),
  RETELL_LLM_ID: z.string().optional(),
  RETELL_WEBHOOK_SECRET: z.string().optional(),
  RETELL_AGENT_WEBHOOK_URL: z.string().optional(),
  RETELL_CUSTOM_LLM_WEBSOCKET_URL: z.string().optional(),

  // Gemini AI
  GEMINI_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.string().default('info'),
  LOG_ENABLE_CONSOLE: z.coerce.boolean().default(true),
  LOG_ENABLE_FILE: z.coerce.boolean().default(true),
  LOG_MAX_FILE_SIZE: z.string().default('20m'),
  LOG_MAX_FILES: z.string().default('14d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL: z.coerce.boolean().default(false),

  // Business Rules
  BUSINESS_DAYS: z.string().default('1,2,3,4,5'),
  BUSINESS_START_HOUR: z.coerce.number().default(9),
  BUSINESS_END_HOUR: z.coerce.number().default(17),
  BUSINESS_TIMEZONE: z.string().default('Europe/London'),
  BUFFER_MINUTES: z.coerce.number().default(15),
  MIN_ADVANCE_HOURS: z.coerce.number().default(1),
  MAX_ADVANCE_HOURS: z.coerce.number().default(24),
  MAX_BOOKINGS_PER_EMAIL: z.coerce.number().default(100),
  FREQUENCY_WINDOW_DAYS: z.coerce.number().default(365),
});

function validateEnvironment(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}

export const config = validateEnvironment();

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
