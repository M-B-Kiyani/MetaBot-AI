import React from 'react';
import { ChatInterface } from '../components/ChatInterface';

export const ChatPage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AI Chat Assistant
          </h1>
          <p className="text-lg text-gray-600">
            Chat with our AI assistant to book appointments and get help
          </p>
        </div>

        <ChatInterface className="h-[600px]" />

        {/* Additional Information */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            What can the AI assistant help you with?
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Booking Services</h4>
              <ul className="space-y-1">
                <li>• Schedule new appointments</li>
                <li>• Check availability</li>
                <li>• Modify existing bookings</li>
                <li>• Cancel appointments</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">General Assistance</h4>
              <ul className="space-y-1">
                <li>• Answer service questions</li>
                <li>• Provide company information</li>
                <li>• Help with technical issues</li>
                <li>• General inquiries</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
