import React from 'react';
import { Card, CardHeader, CardContent } from '../components/ui';

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

        <Card className="h-96">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              Chat Interface
            </h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500">
                Chat interface component will be implemented in the next subtask
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
