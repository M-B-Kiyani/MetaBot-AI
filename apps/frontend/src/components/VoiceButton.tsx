import React, { useState, useEffect } from 'react';
import { Button } from './ui';
import { voiceService } from '../services/voiceService';

interface VoiceButtonProps {
  onVoiceInput?: (transcript: string) => void;
  onVoiceCall?: () => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onVoiceInput,
  onVoiceCall,
  disabled = false,
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setIsSupported(voiceService.isVoiceSupported());
  }, []);

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      voiceService.stopVoiceRecording();
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(true);
      const transcript = await voiceService.startVoiceRecording();

      if (transcript && onVoiceInput) {
        onVoiceInput(transcript);
      }
    } catch (error) {
      console.error('Voice input error:', error);
      alert('Voice input failed. Please check your microphone permissions.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleVoiceCall = () => {
    if (onVoiceCall) {
      onVoiceCall();
    }
    setShowOptions(false);
  };

  if (!isSupported) {
    return null; // Don't render if voice is not supported
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Voice Button */}
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled}
        className="flex items-center space-x-2"
      >
        {isRecording ? (
          <>
            <svg
              className="w-4 h-4 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
            <span>Recording...</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span>Voice</span>
          </>
        )}
      </Button>

      {/* Voice Options Dropdown */}
      {showOptions && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-10">
          <button
            onClick={handleVoiceInput}
            disabled={disabled}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
          >
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <div>
              <div className="font-medium">Voice Input</div>
              <div className="text-xs text-gray-500">Speak your message</div>
            </div>
          </button>

          <button
            onClick={handleVoiceCall}
            disabled={disabled}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
          >
            <svg
              className="w-4 h-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <div>
              <div className="font-medium">Voice Call</div>
              <div className="text-xs text-gray-500">Start a phone call</div>
            </div>
          </button>

          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              onClick={() => setShowOptions(false)}
              className="w-full px-4 py-1 text-left text-xs text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
};
