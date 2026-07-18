/**
 * AutoWashPro Chat Context
 * Chat session and message state management with streaming support
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { chatbotApi, type ChatMessage } from '../api/chatbot';

const generateSessionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string;
  sendMessage: (text: string) => Promise<void>;
  addBotMessage: (text: string) => void;
  clearChat: () => void;
  error: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const MAX_HISTORY = 50;

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState<string>(() => generateSessionId());
  const [error, setError] = useState<string | null>(null);

  // Ref to track streaming message index so we can update it in-place
  const streamingIndexRef = useRef<number>(-1);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 1. Add user message
    const userMsg: ChatMessage = { role: 'user', text: text.trim() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setError(null);
    setIsLoading(true);

    // 2. Add empty bot placeholder for streaming
    setMessages((prev) => {
      streamingIndexRef.current = prev.length; // index of the placeholder
      return [...prev, { role: 'model', text: '' }];
    });

    try {
      await chatbotApi.sendMessageStream(text.trim(), sessionId, (event) => {
        if (event.type === 'token') {
          // Append token to the streaming placeholder
          setMessages((prev) => {
            const idx = streamingIndexRef.current;
            if (idx < 0 || idx >= prev.length) return prev;
            const updated = [...prev];
            updated[idx] = { role: 'model', text: updated[idx].text + event.token };
            return updated;
          });
        } else if (event.type === 'error') {
          setError(event.message);
          // Remove empty placeholder on error
          setMessages((prev) => {
            const idx = streamingIndexRef.current;
            if (idx < 0) return prev;
            return prev.filter((_, i) => i !== idx);
          });
        }
      });
    } catch (err: any) {
      const msg = err?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
      setError(msg);
      // Remove empty placeholder on error, remove user msg too
      setMessages((prev) => {
        const idx = streamingIndexRef.current;
        return prev.filter((_, i) => i !== idx && i !== idx - 1);
      });
    } finally {
      streamingIndexRef.current = -1;
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  /** Inject a bot message directly without calling the API (for welcome message) */
  const addBotMessage = useCallback((text: string) => {
    const modelMsg: ChatMessage = { role: 'model', text };
    setMessages((prev) => [...prev, modelMsg]);
  }, []);

  const clearChat = useCallback(async () => {
    setMessages([]);
    setError(null);
    try {
      await chatbotApi.clearSession(sessionId);
    } catch {
      // ignore
    }
  }, [sessionId]);

  return (
    <ChatContext.Provider value={{ messages, isLoading, sessionId, sendMessage, addBotMessage, clearChat, error }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
