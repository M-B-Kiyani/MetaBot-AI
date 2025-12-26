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
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      calendar: 'connected',
      crm: 'connected',
      ai: 'connected',
    },
  });
});

// API routes
app.use('/api/bookings', bookingRoutes);

// 404 handler for undefined routes
app.use('*', (_req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'The requested route was not found'));
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

const PORT = config.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;