import React from 'react';
import { BookingResponse, BookingStatus } from '@ai-booking/shared';
import { Card, CardHeader, CardContent, Button } from './ui';

interface BookingConfirmationProps {
  booking: BookingResponse;
  onNewBooking?: () => void;
  onViewBookings?: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onNewBooking,
  onViewBookings,
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
        return 'Pending Confirmation';
      case BookingStatus.CANCELLED:
        return 'Cancelled';
      case BookingStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h1>
        <p className="text-lg text-gray-600">
          Your appointment has been successfully scheduled
        </p>
      </div>

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Appointment Details
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                booking.status
              )}`}
            >
              {getStatusText(booking.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Booking ID */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Booking ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {booking.id}
              </dd>
            </div>

            {/* Date and Time */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatDate(booking.startTime)}
              </dd>
            </div>

            {/* Duration */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {booking.duration} minutes
              </dd>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.email}</dd>
              </div>
            </div>

            {booking.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.phone}</dd>
              </div>
            )}

            {booking.inquiry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Inquiry Details
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {booking.inquiry}
                </dd>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="mt-6">
        <CardContent>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What's Next?
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Confirmation Email</p>
                <p>
                  You'll receive a confirmation email with all the details
                  shortly.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Calendar Sync</p>
                <p>
                  The appointment has been added to your calendar automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Reminder</p>
                <p>
                  We'll send you a reminder 24 hours before your appointment.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center space-x-4 mt-8">
        {onNewBooking && (
          <Button variant="outline" onClick={onNewBooking}>
            Book Another Appointment
          </Button>
        )}
        {onViewBookings && (
          <Button onClick={onViewBookings}>View All Bookings</Button>
        )}
      </div>
    </div>
  );
};
