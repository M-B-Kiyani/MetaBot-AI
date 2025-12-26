import { z } from 'zod';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  COMPLETED = 'COMPLETED',
}

export const BookingDurations = [15, 30, 45, 60, 90, 120] as const;
export type BookingDuration = (typeof BookingDurations)[number];

// Zod schemas for validation
export const CreateBookingRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  inquiry: z.string().optional(),
  startTime: z.coerce.date(),
  duration: z.number().refine(
    (val) => BookingDurations.includes(val as BookingDuration),
    'Duration must be 15, 30, 45, 60, 90, or 120 minutes'
  ),
});

export const BookingResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  inquiry: z.string().optional(),
  startTime: z.date(),
  duration: z.number(),
  status: z.nativeEnum(BookingStatus),
  calendarEventId: z.string().optional(),
  crmContactId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// TypeScript types derived from schemas
export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;
export type BookingResponse = z.infer<typeof BookingResponseSchema>;

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone?: string;
  inquiry?: string;
  startTime: Date;
  duration: number;
  status: BookingStatus;
  confirmationSent: boolean;
  reminderSent: boolean;
  calendarEventId?: string;
  crmContactId?: string;
  createdAt: Date;
  updatedAt: Date;
}