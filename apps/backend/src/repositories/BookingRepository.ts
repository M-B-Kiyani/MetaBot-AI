import { PrismaClient, Booking, BookingStatus } from '@prisma/client';
import { CreateBookingRequest } from '../../../../packages/shared/src/types/booking';

export interface BookingRepository {
  create(data: CreateBookingRequest): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByEmail(email: string): Promise<Booking[]>;
  update(id: string, data: Partial<Booking>): Promise<Booking>;
  delete(id: string): Promise<void>;
  checkAvailability(startTime: Date, duration: number, excludeId?: string): Promise<boolean>;
  findConflictingBookings(startTime: Date, duration: number, excludeId?: string): Promise<Booking[]>;
  updateStatus(id: string, status: BookingStatus): Promise<Booking>;
  findAll(limit?: number, offset?: number): Promise<Booking[]>;
}

export class PrismaBookingRepository implements BookingRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateBookingRequest): Promise<Booking> {
    return this.prisma.$transaction(async (tx) => {
      // Check availability within transaction to prevent race conditions
      const isAvailable = await this.checkAvailabilityWithTx(tx, data.startTime, data.duration);
      if (!isAvailable) {
        throw new Error('Time slot is not available');
      }

      return tx.booking.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          inquiry: data.inquiry || null,
          startTime: data.startTime,
          duration: data.duration,
          status: BookingStatus.PENDING,
        },
      });
    });
  }

  async findById(id: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: { email },
      orderBy: { startTime: 'desc' },
    });
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    return this.prisma.booking.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.booking.delete({
      where: { id },
    });
  }

  async checkAvailability(startTime: Date, duration: number, excludeId?: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      return this.checkAvailabilityWithTx(tx, startTime, duration, excludeId);
    });
  }

  private async checkAvailabilityWithTx(
    tx: any,
    startTime: Date,
    duration: number,
    excludeId?: string
  ): Promise<boolean> {
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    // Check for conflicting bookings (validation logic)
    await tx.booking.findMany({
      where: {
        AND: [
          {
            id: excludeId ? { not: excludeId } : undefined,
          },
          {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
          {
            OR: [
              // New booking starts during existing booking
              {
                AND: [
                  { startTime: { lte: startTime } },
                  {
                    startTime: {
                      gt: new Date(startTime.getTime() - 1000), // Account for millisecond precision
                    },
                  },
                ],
              },
              // New booking ends during existing booking
              {
                AND: [
                  { startTime: { lt: endTime } },
                  {
                    startTime: {
                      gte: new Date(endTime.getTime() - 1000), // Account for millisecond precision
                    },
                  },
                ],
              },
              // Existing booking is completely within new booking
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { startTime: { lt: endTime } },
                ],
              },
              // New booking is completely within existing booking
              {
                AND: [
                  { startTime: { lte: startTime } },
                  // Calculate existing booking end time and compare
                  {
                    startTime: {
                      lte: new Date(startTime.getTime() - 1000),
                    },
                  },
                ],
              },
            ],
          },
        ].filter(Boolean),
      },
    });

    // More precise conflict detection using raw SQL for better time overlap logic
    const conflicts = await tx.$queryRaw`
      SELECT id FROM bookings 
      WHERE 
        ${excludeId ? `id != ${excludeId} AND` : ''}
        status IN ('PENDING', 'CONFIRMED') AND
        (
          -- Overlap detection: two intervals overlap if start1 < end2 AND start2 < end1
          "startTime" < ${endTime}::timestamp AND
          ("startTime" + INTERVAL '1 minute' * duration) > ${startTime}::timestamp
        )
    `;

    return conflicts.length === 0;
  }

  async findConflictingBookings(startTime: Date, duration: number, excludeId?: string): Promise<Booking[]> {
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    return this.prisma.$queryRaw`
      SELECT * FROM bookings 
      WHERE 
        ${excludeId ? `id != ${excludeId} AND` : ''}
        status IN ('PENDING', 'CONFIRMED') AND
        (
          -- Overlap detection: two intervals overlap if start1 < end2 AND start2 < end1
          "startTime" < ${endTime}::timestamp AND
          ("startTime" + INTERVAL '1 minute' * duration) > ${startTime}::timestamp
        )
      ORDER BY "startTime"
    `;
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  async findAll(limit = 100, offset = 0): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      take: limit,
      skip: offset,
      orderBy: { startTime: 'desc' },
    });
  }
}