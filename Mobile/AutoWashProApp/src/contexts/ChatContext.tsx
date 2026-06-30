/**
 * AutoWashPro Chat Context
 * Chat session and message state management
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { chatbotApi, type ChatMessage } from '../api/chatbot';

const generateSessionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string;
  sendMessage: (text: string) => Promise<void>;
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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: text.trim() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setError(null);
    setIsLoading(true);

    try {
      const result = await chatbotApi.sendMessage(text.trim(), sessionId);
      const modelMsg: ChatMessage = { role: 'model', text: result.reply };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

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
    <ChatContext.Provider value={{ messages, isLoading, sessionId, sendMessage, clearChat, error }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
