import React, { useState } from 'react';
import { BookingResponse } from '@ai-booking/shared';
import { BookingForm } from '../components/BookingForm';
import { BookingConfirmation } from '../components/BookingConfirmation';
import { BookingStatusDisplay } from '../components/BookingStatus';

type BookingPageView = 'form' | 'confirmation' | 'status';

export const BookingPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<BookingPageView>('form');
  const [confirmedBooking, setConfirmedBooking] =
    useState<BookingResponse | null>(null);

  const handleBookingSuccess = (booking: BookingResponse) => {
    setConfirmedBooking(booking);
    setCurrentView('confirmation');
  };

  const handleNewBooking = () => {
    setConfirmedBooking(null);
    setCurrentView('form');
  };

  const handleViewBookings = () => {
    setCurrentView('status');
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-4">
          <button
            onClick={() => setCurrentView('form')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'form'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            New Booking
          </button>
          <button
            onClick={() => setCurrentView('status')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'status'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            My Bookings
          </button>
        </nav>
      </div>

      {/* Content */}
      {currentView === 'form' && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Book Your Appointment
            </h1>
            <p className="text-lg text-gray-600">
              Fill out the form below to schedule your appointment
            </p>
          </div>
          <BookingForm onSuccess={handleBookingSuccess} />
        </div>
      )}

      {currentView === 'confirmation' && confirmedBooking && (
        <BookingConfirmation
          booking={confirmedBooking}
          onNewBooking={handleNewBooking}
          onViewBookings={handleViewBookings}
        />
      )}

      {currentView === 'status' && (
        <div className="max-w-4xl mx-auto">
          <BookingStatusDisplay onNewBooking={handleNewBooking} />
        </div>
      )}
    </div>
  );
};
