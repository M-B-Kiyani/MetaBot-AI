import { Booking, BookingStatus } from '@prisma/client';
import { CreateBookingRequest, BookingDurations } from '../../../../packages/shared/src/types/booking';
import { BookingRepository } from '../repositories/BookingRepository';

export interface BookingService {
  createBooking(data: CreateBookingRequest): Promise<Booking>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingsByEmail(email: string): Promise<Booking[]>;
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;
  cancelBooking(id: string): Promise<Booking>;
  confirmBooking(id: string): Promise<Booking>;
  checkAvailability(startTime: Date, duration: number): Promise<boolean>;
  getSuggestedTimes(requestedTime: Date, duration: number, count?: number): Promise<Date[]>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>;
}

export class BookingServiceImpl implements BookingService {
  constructor(private bookingRepository: BookingRepository) {}

  async createBooking(data: CreateBookingRequest): Promise<Booking> {
    // Validate booking data
    this.validateBookingRequest(data);

    // Check if the requested time is in the past
    if (data.startTime < new Date()) {
      throw new Error('Cannot book appointments in the past');
    }

    // Check if the requested time is within business hours (9 AM - 5 PM, Mon-Fri)
    this.validateBusinessHours(data.startTime);

    // Check availability
    const isAvailable = await this.bookingRepository.checkAvailability(data.startTime, data.duration);
    if (!isAvailable) {
      const suggestedTimes = await this.getSuggestedTimes(data.startTime, data.duration, 3);
      const suggestedTimesStr = suggestedTimes.map(t => t.toISOString()).join(', ');
      throw new Error(`Time slot is not available. Suggested alternatives: ${suggestedTimesStr}`);
    }

    // Create the booking
    return this.bookingRepository.create(data);
  }

  async getBooking(id: string): Promise<Booking | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid booking ID is required');
    }
    return this.bookingRepository.findById(id);
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email address is required');
    }
    return this.bookingRepository.findByEmail(email);
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    if (!id || typeof id !== 'string') {
      throw new Error('Valid booking ID is required');
    }

    // If updating startTime or duration, check availability
    if (data.startTime || data.duration) {
      const existingBooking = await this.bookingRepository.findById(id);
      if (!existingBooking) {
        throw new Error('Booking not found');
      }

      const newStartTime = data.startTime || existingBooking.startTime;
      const newDuration = data.duration || existingBooking.duration;

      // Validate new time if provided
      if (data.startTime) {
        if (newStartTime < new Date()) {
          throw new Error('Cannot reschedule appointments to the past');
        }
        this.validateBusinessHours(newStartTime);
      }

      // Validate new duration if provided
      if (data.duration && !BookingDurations.includes(data.duration as any)) {
        throw new Error(`Invalid duration. Must be one of: ${BookingDurations.join(', ')} minutes`);
      }

      // Check availability for new time slot (excluding current booking)
      const isAvailable = await this.bookingRepository.checkAvailability(newStartTime, newDuration, id);
      if (!isAvailable) {
        throw new Error('New time slot is not available');
      }
    }

    return this.bookingRepository.update(id, data);
  }

  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.getBooking(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new Error('Cannot cancel completed booking');
    }

    return this.updateBookingStatus(id, BookingStatus.CANCELLED);
  }

  async confirmBooking(id: string): Promise<Booking> {
    const booking = await this.getBooking(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Only pending bookings can be confirmed');
    }

    return this.updateBookingStatus(id, BookingStatus.CONFIRMED);
  }

  async checkAvailability(startTime: Date, duration: number): Promise<boolean> {
    // Validate inputs
    if (!startTime || !(startTime instanceof Date)) {
      throw new Error('Valid start time is required');
    }

    if (!duration || !BookingDurations.includes(duration as any)) {
      throw new Error(`Invalid duration. Must be one of: ${BookingDurations.join(', ')} minutes`);
    }

    // Check if time is in the past
    if (startTime < new Date()) {
      return false;
    }

    // Check business hours
    try {
      this.validateBusinessHours(startTime);
    } catch {
      return false;
    }

    return this.bookingRepository.checkAvailability(startTime, duration);
  }

  async getSuggestedTimes(requestedTime: Date, duration: number, count = 3): Promise<Date[]> {
    const suggestions: Date[] = [];
    const startOfDay = new Date(requestedTime);
    startOfDay.setHours(9, 0, 0, 0); // Start at 9 AM

    // Try to find available slots starting from the requested day
    let currentDay = new Date(startOfDay);
    let daysChecked = 0;
    const maxDaysToCheck = 14; // Check up to 2 weeks ahead

    while (suggestions.length < count && daysChecked < maxDaysToCheck) {
      // Skip weekends
      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
        currentDay.setDate(currentDay.getDate() + 1);
        daysChecked++;
        continue;
      }

      // Check time slots throughout the day (9 AM - 5 PM)
      for (let hour = 9; hour < 17; hour++) {
        if (suggestions.length >= count) break;

        const timeSlot = new Date(currentDay);
        timeSlot.setHours(hour, 0, 0, 0);

        // Skip if this time has already passed
        if (timeSlot <= new Date()) continue;

        // Check if this slot is available
        const isAvailable = await this.bookingRepository.checkAvailability(timeSlot, duration);
        if (isAvailable) {
          suggestions.push(new Date(timeSlot));
        }
      }

      currentDay.setDate(currentDay.getDate() + 1);
      daysChecked++;
    }

    return suggestions;
  }

  async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await this.getBooking(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate status transitions
    this.validateStatusTransition(booking.status, status);

    return this.bookingRepository.updateStatus(id, status);
  }

  private validateBookingRequest(data: CreateBookingRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email address is required');
    }

    if (!data.startTime || !(data.startTime instanceof Date)) {
      throw new Error('Valid start time is required');
    }

    if (!data.duration || !BookingDurations.includes(data.duration as any)) {
      throw new Error(`Invalid duration. Must be one of: ${BookingDurations.join(', ')} minutes`);
    }

    if (data.phone && data.phone.trim().length < 10) {
      throw new Error('Phone number must be at least 10 characters');
    }
  }

  private validateBusinessHours(startTime: Date): void {
    const dayOfWeek = startTime.getDay();
    const hour = startTime.getHours();

    // Check if it's a weekend (Sunday = 0, Saturday = 6)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error('Bookings are only available Monday through Friday');
    }

    // Check if it's within business hours (9 AM - 5 PM)
    if (hour < 9 || hour >= 17) {
      throw new Error('Bookings are only available between 9 AM and 5 PM');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      [BookingStatus.CANCELLED]: [], // No transitions from cancelled
      [BookingStatus.NO_SHOW]: [], // No transitions from no-show
      [BookingStatus.COMPLETED]: [], // No transitions from completed
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}