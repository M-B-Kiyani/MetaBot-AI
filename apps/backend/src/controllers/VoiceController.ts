import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VoiceService } from '../services/VoiceService';
import { RetellService } from '../integrations/RetellService';
import { AppError } from '../middlewares/errorHandler';
import logger from '../config/logger';

// Retell webhook payload validation schema
const RetellWebhookSchema = z.object({
  event: z.string(),
  call: z.object({
    call_id: z.string(),
    agent_id: z.string().optional(),
    transcript: z.string().optional(),
    call_status: z.string().optional(),
    start_timestamp: z.number().optional(),
    end_timestamp: z.number().optional(),
    call_type: z.string().optional(),
    phone_number: z.string().optional(),
    from_number: z.string().optional(),
    to_number: z.string().optional(),
    direction: z.string().optional(),
    recording_url: z.string().optional(),
    public_log_url: z.string().optional(),
    e164_phone_number: z.string().optional(),
    disconnection_reason: z.string().optional(),
    llm_websocket_url: z.string().optional(),
    agent_response_latency_p50: z.number().optional(),
    agent_response_latency_p90: z.number().optional(),
    agent_response_latency_p95: z.number().optional(),
    agent_response_latency_p99: z.number().optional(),
    agent_interruption_sensitivity: z.number().optional(),
    agent_responsiveness: z.number().optional(),
    agent_voice_id: z.string().optional(),
    agent_voice_speed: z.number().optional(),
    agent_voice_temperature: z.number().optional(),
    agent_boosted_keywords: z.array(z.string()).optional(),
    agent_ambient_sound: z.string().optional(),
    agent_backchannel_frequency: z.number().optional(),
    agent_backchannel_words: z.array(z.string()).optional(),
    agent_reminder_trigger_ms: z.number().optional(),
    agent_reminder_max_count: z.number().optional(),
    agent_enable_transcription_formatting: z.boolean().optional(),
    agent_opt_out_sensitive_data_storage: z.boolean().optional(),
    agent_pronunciation_dictionary: z
      .array(
        z.object({
          word: z.string(),
          pronunciation: z.string(),
        })
      )
      .optional(),
    agent_normalize_for_speech: z.boolean().optional(),
    agent_end_call_after_silence_ms: z.number().optional(),
    agent_max_call_duration_ms: z.number().optional(),
    agent_enable_voicemail_detection: z.boolean().optional(),
    agent_voicemail_message: z.string().optional(),
    agent_voicemail_detection_timeout_ms: z.number().optional(),
    agent_speed_coefficient: z.number().optional(),
    agent_enable_infinite_call: z.boolean().optional(),
    agent_enable_backchannel: z.boolean().optional(),
    agent_language: z.string().optional(),
    agent_webhook_url: z.string().optional(),
    agent_after_call_analysis_webhook_url: z.string().optional(),
    agent_fallback_voice_ids: z.array(z.string()).optional(),
    agent_enable_transcription_formatting_v2: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  retell_llm_dynamic_variables: z.record(z.any()).optional(),
});

export class VoiceController {
  constructor(
    private voiceService: VoiceService,
    private retellService: RetellService
  ) {}

  handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the raw body and signature for verification
      const signature = req.headers['x-retell-signature'] as string;
      const rawBody = JSON.stringify(req.body);

      logger.info('Received voice webhook', {
        event: req.body?.event,
        callId: req.body?.call?.call_id,
        hasSignature: !!signature,
      });

      // Verify webhook signature
      if (!this.retellService.verifyWebhook(signature, rawBody)) {
        logger.warn('Invalid webhook signature', {
          signature,
          bodyLength: rawBody.length,
        });
        return next(
          new AppError(
            401,
            'INVALID_SIGNATURE',
            'Webhook signature verification failed'
          )
        );
      }

      // Validate webhook payload
      const validationResult = RetellWebhookSchema.safeParse(req.body);
      if (!validationResult.success) {
        logger.warn('Invalid webhook payload', {
          errors: validationResult.error.errors,
          body: req.body,
        });
        return next(
          new AppError(
            400,
            'INVALID_WEBHOOK_PAYLOAD',
            'Invalid webhook payload: ' +
              validationResult.error.errors.map((e) => e.message).join(', ')
          )
        );
      }

      const payload = validationResult.data;

      logger.info('Processing voice webhook', {
        event: payload.event,
        callId: payload.call.call_id,
        transcript: payload.call.transcript?.substring(0, 100) + '...',
      });

      // Process the webhook
      const response = await this.voiceService.handleWebhook(payload);

      logger.info('Voice webhook processed successfully', {
        event: payload.event,
        callId: payload.call.call_id,
        responseLength: response.response.length,
        endCall: response.end_call,
      });

      // Return the response for Retell AI
      res.json(response);
    } catch (error) {
      logger.error('Error handling voice webhook:', error);

      // Return a safe response to Retell AI even on error
      res.json({
        response:
          "I apologize, but I'm experiencing technical difficulties. Please try again or contact us directly.",
        end_call: false,
      });
    }
  };

  // Health check endpoint for voice service
  healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          retell: process.env.RETELL_API_KEY ? 'configured' : 'not_configured',
          voice_service: 'operational',
        },
      };

      logger.info('Voice service health check', health);
      res.json(health);
    } catch (error) {
      logger.error('Voice service health check failed:', error);
      next(
        new AppError(
          503,
          'SERVICE_UNAVAILABLE',
          'Voice service health check failed'
        )
      );
    }
  };
}
