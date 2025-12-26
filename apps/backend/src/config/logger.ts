import * as winston from 'winston';
import { config } from './environment';

const logLevel =
  process.env.LOG_LEVEL || config.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-booking-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

if (
  config.NODE_ENV === 'production' &&
  process.env.LOG_ENABLE_FILE !== 'false'
) {
  logger.add(
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      maxsize: process.env.LOG_MAX_FILE_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'combined.log',
      maxsize: process.env.LOG_MAX_FILE_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
    })
  );
}
