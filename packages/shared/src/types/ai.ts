import { z } from 'zod';

export const FunctionCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()),
});

export const AIResponseSchema = z.object({
  message: z.string(),
  functionCalls: z.array(FunctionCallSchema).optional(),
  context: z.record(z.any()).optional(),
});

export const ConversationContextSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date(),
  })),
  metadata: z.record(z.any()).optional(),
});

export type FunctionCall = z.infer<typeof FunctionCallSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}