import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import { logger } from './config/logger';
import { errorHandler, AppError } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import bookingRoutes from './routes/bookingRoutes';

const app = express();

// Request logging middleware
app.use(requestLogger);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    methods: process.env.ALLOWED_METHODS?.split(',') || [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: process.env.ALLOWED_HEADERS?.split(',') || [
      'Content-Type',
      'Authorization',
      'x-api-key',
    ],
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400'),
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    services: {
      database: 'unknown',
      calendar: 'unknown',
      crm: 'unknown',
      ai: 'unknown',
      voice: 'unknown',
    },
  };

  try {
    // Check database connection (if you have a database service)
    // healthCheck.services.database = await checkDatabaseConnection() ? 'connected' : 'disconnected';
    healthCheck.services.database = process.env.DATABASE_URL
      ? 'configured'
      : 'not_configured';

    // Check Google Calendar
    healthCheck.services.calendar =
      process.env.GOOGLE_CALENDAR_ENABLED === 'true' &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
        ? 'configured'
        : 'not_configured';

    // Check HubSpot CRM
    healthCheck.services.crm =
      process.env.HUBSPOT_ENABLED === 'true' &&
      (process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY)
        ? 'configured'
        : 'not_configured';

    // Check Gemini AI
    healthCheck.services.ai = process.env.GEMINI_API_KEY
      ? 'configured'
      : 'not_configured';

    // Check Retell Voice
    healthCheck.services.voice =
      process.env.RETELL_ENABLED === 'true' && process.env.RETELL_API_KEY
        ? 'configured'
        : 'not_configured';

    res.json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      ...healthCheck,
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

// API routes
app.use('/api/bookings', bookingRoutes);

// 404 handler for undefined routes
app.use('*', (_req, _res, next) => {
  next(
    new AppError(404, 'ROUTE_NOT_FOUND', 'The requested route was not found')
  );
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

const PORT = config.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Set server timeout from environment variable
server.timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');

export default app;
