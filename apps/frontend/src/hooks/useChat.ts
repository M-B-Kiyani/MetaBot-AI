import { useState, useCallback } from 'react';
import { AIResponse, ConversationContext } from '@ai-booking/shared';
import { apiService } from '../services/api';
import { useAppContext } from '../contexts/AppContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useChat = () => {
  const { state, dispatch } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(
    () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const response: AIResponse = await apiService.sendChatMessage(
          content,
          sessionId
        );

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation context if provided
        if (response.context) {
          dispatch({
            type: 'SET_CONVERSATION_CONTEXT',
            payload: response.context as ConversationContext,
          });
        }

        // Handle function calls if any (e.g., booking creation)
        if (response.functionCalls && response.functionCalls.length > 0) {
          // Function calls are handled by the backend, but we might want to
          // trigger UI updates or show confirmations here
          console.log('Function calls executed:', response.functionCalls);
        }
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content:
            'Sorry, I encountered an error processing your message. Please try again.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);

        const message =
          error instanceof Error ? error.message : 'Failed to send message';
        dispatch({ type: 'SET_ERROR', payload: message });
      } finally {
        setLoading(false);
      }
    },
    [sessionId, dispatch]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    dispatch({ type: 'SET_CONVERSATION_CONTEXT', payload: null });
  }, [dispatch]);

  return {
    messages,
    loading,
    sessionId,
    conversationContext: state.conversationContext,
    sendMessage,
    clearMessages,
  };
};
