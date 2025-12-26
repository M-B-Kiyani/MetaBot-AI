import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  CreateBookingRequest,
  BookingResponse,
  AIResponse,
  ApiError,
  HealthCheckResponse,
} from '@ai-booking/shared';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth headers here if needed
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data?.error) {
          // Transform API error format
          const apiError: ApiError = error.response.data;
          throw new Error(apiError.error.message);
        }
        throw error;
      }
    );
  }

  // Booking endpoints
  async createBooking(data: CreateBookingRequest): Promise<BookingResponse> {
    const response: AxiosResponse<BookingResponse> = await this.client.post(
      '/bookings',
      data
    );
    return response.data;
  }

  async getBookings(): Promise<BookingResponse[]> {
    const response: AxiosResponse<BookingResponse[]> =
      await this.client.get('/bookings');
    return response.data;
  }

  async getBooking(id: string): Promise<BookingResponse> {
    const response: AxiosResponse<BookingResponse> = await this.client.get(
      `/bookings/${id}`
    );
    return response.data;
  }

  async updateBooking(
    id: string,
    data: Partial<CreateBookingRequest>
  ): Promise<BookingResponse> {
    const response: AxiosResponse<BookingResponse> = await this.client.put(
      `/bookings/${id}`,
      data
    );
    return response.data;
  }

  async cancelBooking(id: string): Promise<void> {
    await this.client.delete(`/bookings/${id}`);
  }

  async checkAvailability(startTime: Date, duration: number): Promise<boolean> {
    const response: AxiosResponse<{ available: boolean }> =
      await this.client.post('/bookings/check-availability', {
        startTime: startTime.toISOString(),
        duration,
      });
    return response.data.available;
  }

  // AI Chat endpoints
  async sendChatMessage(
    message: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const response: AxiosResponse<AIResponse> = await this.client.post(
      '/chat',
      {
        message,
        sessionId,
      }
    );
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response: AxiosResponse<HealthCheckResponse> =
      await this.client.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
