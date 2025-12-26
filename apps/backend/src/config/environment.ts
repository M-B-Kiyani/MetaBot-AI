import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  TIMEZONE: z.string().optional(),
  GOOGLE_CALENDAR_TIMEZONE: z.string().optional(),
  HUBSPOT_API_KEY: z.string().optional(),
  HUBSPOT_ACCESS_TOKEN: z.string().optional(),
  RETELL_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
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