import React from 'react';
import { Card, CardHeader, CardContent } from '../components/ui';

export const BookingPage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Book Your Appointment
          </h1>
          <p className="text-lg text-gray-600">
            Fill out the form below to schedule your appointment
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              Appointment Details
            </h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500">
                Booking form component will be implemented in the next subtask
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
