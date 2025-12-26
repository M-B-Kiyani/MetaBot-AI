import React, { useEffect } from 'react';
import { BookingStatus } from '@ai-booking/shared';
import { Card, CardContent, Button } from './ui';
import { useBookings } from '../hooks/useBookings';

interface BookingStatusProps {
  onNewBooking?: () => void;
}

export const BookingStatusDisplay: React.FC<BookingStatusProps> = ({
  onNewBooking,
}) => {
  const { bookings, loading, error, fetchBookings } = useBookings();

  useEffect(() => {
    fetchBookings();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'text-green-600 bg-green-100';
      case BookingStatus.PENDING:
        return 'text-yellow-600 bg-yellow-100';
      case BookingStatus.CANCELLED:
        return 'text-red-600 bg-red-100';
      case BookingStatus.COMPLETED:
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'Confirmed';
      case BookingStatus.PENDING:
        return 'Pending';
      case BookingStatus.CANCELLED:
        return 'Cancelled';
      case BookingStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading bookings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchBookings}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedBookings.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bookings yet
            </h3>
            <p className="text-gray-500 mb-6">
              You haven't made any appointments yet.
            </p>
            {onNewBooking && (
              <Button onClick={onNewBooking}>
                Book Your First Appointment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Bookings</h2>
        {onNewBooking && <Button onClick={onNewBooking}>New Booking</Button>}
      </div>

      <div className="space-y-4">
        {sortedBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatDate(booking.startTime)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {booking.duration} minutes
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {getStatusText(booking.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Name:</span>
                  <span className="ml-2 text-gray-900">{booking.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Email:</span>
                  <span className="ml-2 text-gray-900">{booking.email}</span>
                </div>
                {booking.phone && (
                  <div>
                    <span className="font-medium text-gray-500">Phone:</span>
                    <span className="ml-2 text-gray-900">{booking.phone}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-500">Booking ID:</span>
                  <span className="ml-2 text-gray-900 font-mono text-xs">
                    {booking.id}
                  </span>
                </div>
              </div>

              {booking.inquiry && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-500 text-sm">
                    Inquiry:
                  </span>
                  <p className="mt-1 text-sm text-gray-900">
                    {booking.inquiry}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
