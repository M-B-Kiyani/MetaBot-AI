import { z } from 'zod';

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

export const ApiSuccessSchema = z.object({
  data: z.any(),
  message: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    calendar: 'connected' | 'disconnected';
    crm: 'connected' | 'disconnected';
    ai: 'connected' | 'disconnected';
  };
}