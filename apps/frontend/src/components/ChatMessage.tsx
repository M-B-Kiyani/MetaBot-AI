import React from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessage;
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
}) => {
  const isUser = message.role === 'user';

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`flex max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isUser ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
            }`}
          >
            {isUser ? 'U' : 'AI'}
          </div>
        </div>

        {/* Message Content */}
        <div
          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`px-4 py-2 rounded-lg ${
              isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-xs text-gray-500 mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};
