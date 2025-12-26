import { z } from 'zod';

export const RetellWebhookPayloadSchema = z.object({
  event: z.string(),
  call: z.object({
    call_id: z.string(),
    agent_id: z.string(),
    transcript: z.string(),
    call_status: z.string(),
    start_timestamp: z.number().optional(),
    end_timestamp: z.number().optional(),
    call_type: z.string().optional(),
    from_number: z.string().optional(),
    to_number: z.string().optional(),
  }),
});

export const VoiceFunctionCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()),
  callId: z.string(),
});

export const VoiceFunctionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

export const WebhookResponseSchema = z.object({
  response: z.string(),
  end_call: z.boolean().optional(),
});

export type RetellWebhookPayload = z.infer<typeof RetellWebhookPayloadSchema>;
export type VoiceFunctionCall = z.infer<typeof VoiceFunctionCallSchema>;
export type VoiceFunctionResult = z.infer<typeof VoiceFunctionResultSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;