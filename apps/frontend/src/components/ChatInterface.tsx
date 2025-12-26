import React, { useEffect, useRef } from 'react';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { Card, CardHeader, CardContent, Button } from './ui';
import { useChat } from '../hooks/useChat';

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className = '',
}) => {
  const { messages, loading, sendMessage, clearMessages, sessionId } =
    useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  const handleClearChat = () => {
    clearMessages();
  };

  return (
    <Card className={`flex flex-col h-96 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI Assistant
            </h2>
            <p className="text-sm text-gray-500">
              Ask me anything about booking appointments or our services
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 font-mono">
              Session: {sessionId.slice(-8)}
            </span>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to AI Assistant
              </h3>
              <p className="text-gray-500 mb-4">
                I can help you book appointments, answer questions about our
                services, or provide general assistance.
              </p>
              <div className="text-sm text-gray-400">
                <p>Try asking:</p>
                <ul className="mt-2 space-y-1">
                  <li>"I'd like to book an appointment"</li>
                  <li>"What services do you offer?"</li>
                  <li>"Check availability for tomorrow at 2 PM"</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}

          {loading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={loading}
          placeholder="Ask me about booking appointments or our services..."
        />
      </CardContent>
    </Card>
  );
};
