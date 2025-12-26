import { Booking, BookingStatus } from '@prisma/client';
import {
  RetellWebhookPayload,
  VoiceFunctionCall,
  VoiceFunctionResult,
  WebhookResponse,
} from '../../../../packages/shared/src/types/voice';
import {
  CreateBookingRequest,
  BookingDurations,
} from '../../../../packages/shared/src/types/booking';
import { BookingService } from './BookingService';
import { RetellService } from '../integrations/RetellService';

export interface VoiceService {
  handleWebhook(payload: RetellWebhookPayload): Promise<WebhookResponse>;
  processVoiceFunction(
    functionCall: VoiceFunctionCall
  ): Promise<VoiceFunctionResult>;
  generateSpokenConfirmation(booking: Booking): string;
  generateAvailabilityResponse(
    isAvailable: boolean,
    suggestedTimes?: Date[]
  ): string;
}

export class VoiceServiceImpl implements VoiceService {
  constructor(
    private bookingService: BookingService,
    private retellService: RetellService
  ) {}

  async handleWebhook(payload: RetellWebhookPayload): Promise<WebhookResponse> {
    try {
      const { event, call } = payload;

      // Handle different webhook events
      switch (event) {
        case 'call_started':
          return {
            response:
              "Hello! I'm your AI booking assistant. How can I help you schedule an appointment today?",
            end_call: false,
          };

        case 'call_ended':
          return {
            response: 'Thank you for calling. Have a great day!',
            end_call: true,
          };

        case 'function_call':
        case 'transcript_updated':
          // Extract function calls from transcript
          const functionCall = this.retellService.parseVoiceFunction(
            call.transcript
          );

          if (functionCall) {
            const result = await this.processVoiceFunction(functionCall);
            return {
              response: result.message,
              end_call: false,
            };
          }

          // If no function call detected, provide a helpful response
          return {
            response:
              'I can help you book an appointment or check availability. Please provide your preferred date and time, along with your contact information.',
            end_call: false,
          };

        default:
          return {
            response:
              "I'm here to help with booking appointments. What would you like to schedule?",
            end_call: false,
          };
      }
    } catch (error) {
      console.error('Error handling voice webhook:', error);
      return {
        response:
          "I apologize, but I'm having trouble processing your request. Please try again or contact us directly.",
        end_call: false,
      };
    }
  }

  async processVoiceFunction(
    functionCall: VoiceFunctionCall
  ): Promise<VoiceFunctionResult> {
    try {
      switch (functionCall.name) {
        case 'book_appointment':
          return await this.handleBookingRequest(functionCall);

        case 'check_availability':
          return await this.handleAvailabilityCheck(functionCall);

        default:
          return {
            success: false,
            message:
              "I'm sorry, I don't understand that request. I can help you book appointments or check availability.",
          };
      }
    } catch (error) {
      console.error('Error processing voice function:', error);
      return {
        success: false,
        message:
          'I apologize, but I encountered an error processing your request. Please try again.',
      };
    }
  }

  generateSpokenConfirmation(booking: Booking): string {
    const startTime = new Date(booking.startTime);
    const formattedDate = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      `Perfect! I've successfully booked your ${booking.duration}-minute appointment for ${formattedDate} at ${formattedTime}. ` +
      `Your booking confirmation number is ${booking.id.slice(-8)}. ` +
      `You should receive a confirmation email at ${booking.email} shortly. ` +
      `Is there anything else I can help you with today?`
    );
  }

  generateAvailabilityResponse(
    isAvailable: boolean,
    suggestedTimes?: Date[]
  ): string {
    if (isAvailable) {
      return (
        'Great news! That time slot is available. Would you like me to book it for you? ' +
        "I'll need your name, email address, and phone number to complete the booking."
      );
    }

    if (suggestedTimes && suggestedTimes.length > 0) {
      const suggestions = suggestedTimes
        .map((time) => {
          const date = time.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });
          const timeStr = time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          return `${date} at ${timeStr}`;
        })
        .join(', or ');

      return (
        `I'm sorry, that time slot isn't available. However, I have these alternative times: ${suggestions}. ` +
        'Would any of these work for you?'
      );
    }

    return (
      "I'm sorry, that time slot isn't available. Let me suggest some alternative times. " +
      'What days work best for you this week or next?'
    );
  }

  private async handleBookingRequest(
    functionCall: VoiceFunctionCall
  ): Promise<VoiceFunctionResult> {
    try {
      const args = functionCall.arguments;

      // Validate required fields
      if (!args.name || !args.email) {
        return {
          success: false,
          message:
            'I need your name and email address to book the appointment. Could you please provide those details?',
        };
      }

      // Parse and validate time
      let startTime: Date;
      if (args.time) {
        startTime = this.parseTimeString(args.time);
      } else {
        return {
          success: false,
          message:
            "I need to know what time you'd like to schedule the appointment. What time works best for you?",
        };
      }

      // Set default duration if not provided
      const duration = args.duration || 60; // Default to 60 minutes

      // Validate duration
      if (!BookingDurations.includes(duration as any)) {
        return {
          success: false,
          message: `I can book appointments for ${BookingDurations.join(', ')} minutes. What duration would you prefer?`,
        };
      }

      // Create booking request
      const bookingRequest: CreateBookingRequest = {
        name: args.name.trim(),
        email: args.email.trim(),
        phone: args.phone?.trim(),
        inquiry: args.inquiry?.trim() || 'Voice booking',
        startTime,
        duration,
      };

      // Attempt to create the booking
      const booking = await this.bookingService.createBooking(bookingRequest);

      return {
        success: true,
        message: this.generateSpokenConfirmation(booking),
        data: booking,
      };
    } catch (error) {
      console.error('Error handling booking request:', error);

      if (error instanceof Error) {
        // Handle specific booking errors
        if (error.message.includes('not available')) {
          // Extract suggested times if available
          const suggestedTimesMatch = error.message.match(
            /Suggested alternatives: (.+)/
          );
          if (suggestedTimesMatch) {
            const suggestedTimesStr = suggestedTimesMatch[1];
            const suggestedTimes = suggestedTimesStr
              .split(', ')
              .map((timeStr) => new Date(timeStr));
            return {
              success: false,
              message: this.generateAvailabilityResponse(false, suggestedTimes),
            };
          }

          return {
            success: false,
            message:
              "I'm sorry, that time slot isn't available. What other times work for you?",
          };
        }

        if (error.message.includes('past')) {
          return {
            success: false,
            message:
              "I can't book appointments in the past. Please choose a future date and time.",
          };
        }

        if (error.message.includes('business hours')) {
          return {
            success: false,
            message:
              "We're only available for appointments Monday through Friday, 9 AM to 5 PM. What time during business hours works for you?",
          };
        }

        if (error.message.includes('email')) {
          return {
            success: false,
            message:
              'I need a valid email address to send you the confirmation. Could you please provide your email?',
          };
        }
      }

      return {
        success: false,
        message:
          "I'm having trouble booking that appointment. Could you please repeat your preferred time and contact information?",
      };
    }
  }

  private async handleAvailabilityCheck(
    functionCall: VoiceFunctionCall
  ): Promise<VoiceFunctionResult> {
    try {
      const args = functionCall.arguments;

      // Parse time
      let startTime: Date;
      if (args.time) {
        startTime = this.parseTimeString(args.time);
      } else {
        return {
          success: false,
          message: 'What time would you like me to check availability for?',
        };
      }

      // Set default duration if not provided
      const duration = args.duration || 60;

      // Check availability
      const isAvailable = await this.bookingService.checkAvailability(
        startTime,
        duration
      );

      let suggestedTimes: Date[] = [];
      if (!isAvailable) {
        suggestedTimes = await this.bookingService.getSuggestedTimes(
          startTime,
          duration,
          3
        );
      }

      return {
        success: true,
        message: this.generateAvailabilityResponse(isAvailable, suggestedTimes),
        data: { available: isAvailable, suggestedTimes },
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        success: false,
        message:
          "I'm having trouble checking availability. What time were you looking for?",
      };
    }
  }

  private parseTimeString(timeStr: string): Date {
    // This is a simplified time parser - in production, you might want to use a more robust library
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Handle formats like "2pm", "2:30pm", "14:30"
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
    const match = timeStr.match(timePattern);

    if (!match) {
      throw new Error('Invalid time format');
    }

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const ampm = match[3]?.toLowerCase();

    // Convert to 24-hour format
    if (ampm === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }

    const appointmentTime = new Date(today);
    appointmentTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, assume they mean tomorrow
    if (appointmentTime <= now) {
      appointmentTime.setDate(appointmentTime.getDate() + 1);
    }

    return appointmentTime;
  }
}
