import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, Button } from '../components/ui';

export const HomePage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to AI Booking Assistant
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Book appointments easily through our intelligent chat interface or
          traditional booking form. Our AI assistant is here to help you
          schedule meetings efficiently.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold text-gray-900">
              Quick Booking
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Use our traditional booking form to schedule your appointment
              quickly and easily.
            </p>
            <Link to="/booking">
              <Button variant="primary" className="w-full">
                Book Appointment
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold text-gray-900">
              AI Chat Assistant
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Chat with our AI assistant to book appointments, ask questions,
              and get help naturally.
            </p>
            <Link to="/chat">
              <Button variant="primary" className="w-full">
                Start Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-8">Features</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
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
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Smart Scheduling
            </h4>
            <p className="text-gray-600">
              Intelligent availability checking and conflict prevention
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              AI Assistant
            </h4>
            <p className="text-gray-600">
              Natural language booking and intelligent responses
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Instant Sync
            </h4>
            <p className="text-gray-600">
              Automatic calendar and CRM integration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
