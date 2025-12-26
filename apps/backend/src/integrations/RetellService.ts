import crypto from 'crypto';
import {
  RetellWebhookPayload,
  VoiceFunctionCall,
  RetellWebhookPayloadSchema,
} from '../../../../packages/shared/src/types/voice';
import { logger } from '../config/logger';

export interface RetellService {
  verifyWebhook(signature: string, payload: string): boolean;
  parseWebhookPayload(payload: string): RetellWebhookPayload;
  parseVoiceFunction(transcript: string): VoiceFunctionCall | null;
  initiateCall(config: CallInitiationConfig): Promise<CallResponse>;
  getCallStatus(callId: string): Promise<CallStatusResponse>;
}

export interface CallInitiationConfig {
  agent_id: string;
  to_number: string;
  from_number?: string;
  metadata?: Record<string, any>;
}

export interface CallResponse {
  call_id: string;
  call_status: string;
  agent_id: string;
  to_number: string;
  from_number?: string;
}

export interface CallStatusResponse {
  call_id: string;
  call_status: string;
  agent_id: string;
  to_number: string;
  from_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  metadata?: Record<string, any>;
}

export class RetellServiceImpl implements RetellService {
  private readonly webhookSecret: string;
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.retellai.com';

  constructor(apiKey?: string, webhookSecret?: string) {
    this.apiKey = apiKey || process.env.RETELL_API_KEY || '';
    this.webhookSecret =
      webhookSecret || process.env.RETELL_WEBHOOK_SECRET || '';

    if (!this.apiKey && process.env.RETELL_ENABLED === 'true') {
      logger.warn(
        'RETELL_API_KEY environment variable not provided but Retell is enabled'
      );
    }

    if (!this.webhookSecret && process.env.RETELL_ENABLED === 'true') {
      logger.warn(
        'RETELL_WEBHOOK_SECRET environment variable not provided but Retell is enabled'
      );
    }
  }

  verifyWebhook(signature: string, payload: string): boolean {
    try {
      // Retell AI uses HMAC-SHA256 for webhook signature verification
      // The signature format is typically "sha256=<hash>"
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      // Remove "sha256=" prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');

      // Use crypto.timingSafeEqual to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const actualBuffer = Buffer.from(cleanSignature, 'hex');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  parseWebhookPayload(payload: string): RetellWebhookPayload {
    try {
      const parsedPayload = JSON.parse(payload);
      return RetellWebhookPayloadSchema.parse(parsedPayload);
    } catch (error) {
      throw new Error(
        `Invalid webhook payload: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  parseVoiceFunction(transcript: string): VoiceFunctionCall | null {
    try {
      // Look for function call patterns in the transcript
      // Retell AI typically includes function calls in a structured format
      // This is a simplified parser - in production, you might need more sophisticated parsing

      // Pattern 1: Look for JSON-like function calls
      const jsonFunctionPattern =
        /\{[^}]*"function"[^}]*"name"[^}]*"arguments"[^}]*\}/gi;
      const jsonMatch = transcript.match(jsonFunctionPattern);

      if (jsonMatch) {
        try {
          const functionCall = JSON.parse(jsonMatch[0]);
          if (
            functionCall.function &&
            functionCall.function.name &&
            functionCall.function.arguments
          ) {
            return {
              name: functionCall.function.name,
              arguments: functionCall.function.arguments,
              callId: this.generateCallId(),
            };
          }
        } catch {
          // Continue to other patterns if JSON parsing fails
        }
      }

      // Pattern 2: Look for booking-specific keywords and extract parameters
      const bookingKeywords = ['book', 'schedule', 'appointment', 'meeting'];
      const availabilityKeywords = [
        'available',
        'check',
        'availability',
        'free',
      ];

      const lowerTranscript = transcript.toLowerCase();

      if (
        bookingKeywords.some((keyword) => lowerTranscript.includes(keyword))
      ) {
        return this.parseBookingFunction(transcript);
      }

      if (
        availabilityKeywords.some((keyword) =>
          lowerTranscript.includes(keyword)
        )
      ) {
        return this.parseAvailabilityFunction(transcript);
      }

      return null;
    } catch (error) {
      logger.error('Error parsing voice function:', error);
      return null;
    }
  }

  private parseBookingFunction(transcript: string): VoiceFunctionCall | null {
    try {
      // Extract booking details from natural language
      const args: Record<string, any> = {};

      // Extract name (look for "my name is", "I'm", "this is")
      const namePatterns = [
        /(?:my name is|i'm|this is|i am)\s+([a-zA-Z\s]+)/i,
        /name[:\s]+([a-zA-Z\s]+)/i,
      ];

      for (const pattern of namePatterns) {
        const nameMatch = transcript.match(pattern);
        if (nameMatch && nameMatch[1]) {
          args.name = nameMatch[1].trim();
          break;
        }
      }

      // Extract email
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
      const emailMatch = transcript.match(emailPattern);
      if (emailMatch) {
        args.email = emailMatch[1];
      }

      // Extract phone number
      const phonePattern =
        /(?:phone|number|call|contact)[:\s]*([0-9\-\(\)\s+]{10,})/i;
      const phoneMatch = transcript.match(phonePattern);
      if (phoneMatch) {
        args.phone = phoneMatch[1].replace(/[^\d]/g, '');
      }

      // Extract time/date information
      const timePatterns = [
        /(?:at|for|on)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
        /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
      ];

      for (const pattern of timePatterns) {
        const timeMatch = transcript.match(pattern);
        if (timeMatch) {
          args.time = timeMatch[1];
          break;
        }
      }

      // Extract duration
      const durationPatterns = [
        /(\d+)\s*(?:minute|min|hour|hr)/i,
        /(?:for|duration|lasting)\s*(\d+)/i,
      ];

      for (const pattern of durationPatterns) {
        const durationMatch = transcript.match(pattern);
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          // Convert hours to minutes if needed
          args.duration =
            transcript.toLowerCase().includes('hour') ||
            transcript.toLowerCase().includes('hr')
              ? value * 60
              : value;
          break;
        }
      }

      // Extract inquiry/reason
      const inquiryPatterns = [
        /(?:about|regarding|for)\s+([^.!?]+)/i,
        /(?:meeting|appointment|discussion)\s+(?:about|regarding|for)\s+([^.!?]+)/i,
      ];

      for (const pattern of inquiryPatterns) {
        const inquiryMatch = transcript.match(pattern);
        if (inquiryMatch && inquiryMatch[1]) {
          args.inquiry = inquiryMatch[1].trim();
          break;
        }
      }

      // Only return a function call if we have at least some essential information
      if (args.name || args.email || args.time) {
        return {
          name: 'book_appointment',
          arguments: args,
          callId: this.generateCallId(),
        };
      }

      return null;
    } catch (error) {
      logger.error('Error parsing booking function:', error);
      return null;
    }
  }

  private parseAvailabilityFunction(
    transcript: string
  ): VoiceFunctionCall | null {
    try {
      const args: Record<string, any> = {};

      // Extract time/date for availability check
      const timePatterns = [
        /(?:at|for|on)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
        /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
      ];

      for (const pattern of timePatterns) {
        const timeMatch = transcript.match(pattern);
        if (timeMatch) {
          args.time = timeMatch[1];
          break;
        }
      }

      // Extract duration for availability check
      const durationPatterns = [
        /(\d+)\s*(?:minute|min|hour|hr)/i,
        /(?:for|duration|lasting)\s*(\d+)/i,
      ];

      for (const pattern of durationPatterns) {
        const durationMatch = transcript.match(pattern);
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          args.duration =
            transcript.toLowerCase().includes('hour') ||
            transcript.toLowerCase().includes('hr')
              ? value * 60
              : value;
          break;
        }
      }

      return {
        name: 'check_availability',
        arguments: args,
        callId: this.generateCallId(),
      };
    } catch (error) {
      logger.error('Error parsing availability function:', error);
      return null;
    }
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const retellService = new RetellServiceImpl();
