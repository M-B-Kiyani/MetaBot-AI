#!/usr/bin/env node

/**
 * Production Validation Script
 * Validates that all services are properly configured for production
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating production configuration...\n');

// Check if .env file exists and has production values
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found in root directory');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'));

// Parse environment variables
const env = {};
envLines.forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts
      .join('=')
      .trim()
      .replace(/^["']|["']$/g, '');
  }
});

let hasErrors = false;

// Validation functions
function validateRequired(key, description) {
  if (
    !env[key] ||
    env[key] === 'to be generated' ||
    env[key] === 'your-' + key.toLowerCase()
  ) {
    console.error(`❌ ${key}: ${description} - MISSING OR PLACEHOLDER`);
    hasErrors = true;
    return false;
  }
  console.log(`✅ ${key}: ${description} - OK`);
  return true;
}

function validateOptional(key, description, enabled = true) {
  if (!enabled) {
    console.log(`⏭️  ${key}: ${description} - DISABLED`);
    return true;
  }

  if (
    !env[key] ||
    env[key] === 'to be generated' ||
    env[key].startsWith('your-')
  ) {
    console.warn(`⚠️  ${key}: ${description} - NOT CONFIGURED (optional)`);
    return false;
  }
  console.log(`✅ ${key}: ${description} - OK`);
  return true;
}

function validateUrl(key, description) {
  if (!validateRequired(key, description)) return false;

  try {
    new URL(env[key]);
    return true;
  } catch {
    console.error(`❌ ${key}: ${description} - INVALID URL FORMAT`);
    hasErrors = true;
    return false;
  }
}

function validateEmail(key, description) {
  if (!validateRequired(key, description)) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(env[key])) {
    console.error(`❌ ${key}: ${description} - INVALID EMAIL FORMAT`);
    hasErrors = true;
    return false;
  }
  return true;
}

// Core Configuration
console.log('📋 Core Configuration:');
validateRequired('NODE_ENV', 'Environment (should be "production")');
if (env.NODE_ENV !== 'production') {
  console.warn('⚠️  NODE_ENV is not set to "production"');
}
validateRequired('DATABASE_URL', 'Database connection string');
validateUrl('API_BASE_URL', 'API base URL');

// Security
console.log('\n🔐 Security Configuration:');
validateRequired('API_KEY', 'API authentication key');
validateRequired('WIDGET_API_KEY', 'Widget API key');
validateRequired('PUBLIC_WIDGET_KEY', 'Public widget key');

// Email Configuration
console.log('\n📧 Email Configuration:');
validateRequired('SMTP_HOST', 'SMTP server host');
validateRequired('SMTP_USER', 'SMTP username');
validateRequired('SMTP_PASSWORD', 'SMTP password');
validateEmail('ADMIN_EMAIL', 'Admin email address');
validateEmail('FROM_EMAIL', 'From email address');

// AI Configuration
console.log('\n🤖 AI Configuration:');
validateRequired('GEMINI_API_KEY', 'Gemini AI API key');

// Optional Services
console.log('\n🔌 Optional Services:');
const googleEnabled = env.GOOGLE_CALENDAR_ENABLED === 'true';
validateOptional(
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'Google Calendar service account',
  googleEnabled
);
validateOptional('GOOGLE_CALENDAR_ID', 'Google Calendar ID', googleEnabled);

const hubspotEnabled = env.HUBSPOT_ENABLED === 'true';
validateOptional(
  'HUBSPOT_ACCESS_TOKEN',
  'HubSpot access token',
  hubspotEnabled
);

const retellEnabled = env.RETELL_ENABLED === 'true';
validateOptional('RETELL_API_KEY', 'Retell AI API key', retellEnabled);
validateOptional('RETELL_AGENT_ID', 'Retell AI agent ID', retellEnabled);

// CORS Configuration
console.log('\n🌐 CORS Configuration:');
if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS !== '*') {
  const origins = env.ALLOWED_ORIGINS.split(',');
  origins.forEach((origin) => {
    try {
      new URL(origin.trim());
    } catch {
      console.error(`❌ ALLOWED_ORIGINS contains invalid URL: ${origin}`);
      hasErrors = true;
    }
  });
  if (!hasErrors) {
    console.log('✅ ALLOWED_ORIGINS: Valid URLs configured');
  }
} else if (env.ALLOWED_ORIGINS === '*') {
  console.warn(
    '⚠️  ALLOWED_ORIGINS: Set to wildcard (*) - consider restricting for production'
  );
}

// Rate Limiting
console.log('\n⏱️  Rate Limiting:');
const rateLimitWindow = parseInt(env.RATE_LIMIT_WINDOW_MS || '900000');
const rateLimitMax = parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100');
console.log(
  `✅ Rate limiting: ${rateLimitMax} requests per ${rateLimitWindow / 1000} seconds`
);

// Business Configuration
console.log('\n🏢 Business Configuration:');
validateRequired('BUSINESS_TIMEZONE', 'Business timezone');
validateRequired('BUSINESS_DAYS', 'Business days');
validateRequired('BUSINESS_START_HOUR', 'Business start hour');
validateRequired('BUSINESS_END_HOUR', 'Business end hour');

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('❌ Production validation FAILED');
  console.error('Please fix the above issues before deploying to production.');
  process.exit(1);
} else {
  console.log('✅ Production validation PASSED');
  console.log('All required configuration is present and valid.');

  // Count configured optional services
  const optionalServices = [
    googleEnabled && env.GOOGLE_SERVICE_ACCOUNT_KEY,
    hubspotEnabled && env.HUBSPOT_ACCESS_TOKEN,
    retellEnabled && env.RETELL_API_KEY,
  ].filter(Boolean).length;

  console.log(`📊 ${optionalServices}/3 optional services configured`);
}
