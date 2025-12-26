import { useState, useEffect } from 'react';
import { CreateBookingRequest, BookingResponse } from '@ai-booking/shared';
import { apiService } from '../services/api';
import { useAppContext } from '../contexts/AppContext';

export const useBookings = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      const bookings = await apiService.getBookings();
      dispatch({ type: 'SET_BOOKINGS', payload: bookings });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch bookings';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      setLoading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createBooking = async (
    data: CreateBookingRequest
  ): Promise<BookingResponse | null> => {
    try {
      setLoading(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const booking = await apiService.createBooking(data);
      dispatch({ type: 'ADD_BOOKING', payload: booking });
      return booking;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create booking';
      dispatch({ type: 'SET_ERROR', payload: message });
      return null;
    } finally {
      setLoading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateBooking = async (
    id: string,
    data: Partial<CreateBookingRequest>
  ): Promise<BookingResponse | null> => {
    try {
      setLoading(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const booking = await apiService.updateBooking(id, data);
      dispatch({ type: 'UPDATE_BOOKING', payload: booking });
      return booking;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update booking';
      dispatch({ type: 'SET_ERROR', payload: message });
      return null;
    } finally {
      setLoading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const cancelBooking = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      await apiService.cancelBooking(id);
      // Remove from local state or refetch
      await fetchBookings();
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel booking';
      dispatch({ type: 'SET_ERROR', payload: message });
      return false;
    } finally {
      setLoading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const checkAvailability = async (
    startTime: Date,
    duration: number
  ): Promise<boolean> => {
    try {
      return await apiService.checkAvailability(startTime, duration);
    } catch (error) {
      console.error('Failed to check availability:', error);
      return false;
    }
  };

  return {
    bookings: state.bookings,
    currentBooking: state.currentBooking,
    loading: loading || state.loading,
    error: state.error,
    fetchBookings,
    createBooking,
    updateBooking,
    cancelBooking,
    checkAvailability,
  };
};
