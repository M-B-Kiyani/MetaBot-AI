import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import logger from '../config/logger';

// Middleware to capture raw body for webhook signature verification
export const captureRawBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only capture raw body for webhook endpoints
  if (req.path.includes('/webhook')) {
    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });

    req.on('end', () => {
      (req as any).rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
};

// Middleware specifically for Retell webhook verification
export const verifyRetellWebhook = (retellService: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-retell-signature'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      if (!signature) {
        logger.warn('Missing webhook signature', {
          path: req.path,
          headers: req.headers,
        });
        return next(
          new AppError(
            401,
            'MISSING_SIGNATURE',
            'Webhook signature is required'
          )
        );
      }

      if (!retellService.verifyWebhook(signature, rawBody)) {
        logger.warn('Invalid webhook signature', {
          signature,
          bodyLength: rawBody.length,
          path: req.path,
        });
        return next(
          new AppError(
            401,
            'INVALID_SIGNATURE',
            'Webhook signature verification failed'
          )
        );
      }

      logger.info('Webhook signature verified successfully', {
        path: req.path,
        signatureLength: signature.length,
      });

      next();
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      next(
        new AppError(
          500,
          'VERIFICATION_ERROR',
          'Failed to verify webhook signature'
        )
      );
    }
  };
};
