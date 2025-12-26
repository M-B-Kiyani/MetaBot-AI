import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui';
import { VoiceButton } from './VoiceButton';
import { VoiceCallModal } from './VoiceCallModal';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const [showVoiceCallModal, setShowVoiceCallModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setMessage(transcript);
    // Auto-focus textarea after voice input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleVoiceCall = () => {
    setShowVoiceCallModal(true);
  };

  useEffect(() => {
    // Focus input on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex items-end space-x-3 p-4 bg-white border-t border-gray-200"
      >
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none max-h-32 overflow-y-auto"
          />
          <p className="text-xs text-gray-500 mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>

        <VoiceButton
          onVoiceInput={handleVoiceInput}
          onVoiceCall={handleVoiceCall}
          disabled={disabled}
        />

        <Button type="submit" disabled={!message.trim() || disabled} size="sm">
          Send
        </Button>
      </form>

      <VoiceCallModal
        isOpen={showVoiceCallModal}
        onClose={() => setShowVoiceCallModal(false)}
      />
    </>
  );
};
