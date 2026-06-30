/**
 * AutoWashPro Chatbot API Service
 * AI chat messaging endpoints
 */

import { apiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResponse {
  reply: string;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
}

/** Send a message to the AI chatbot */
export const sendMessage = async (message: string, sessionId: string): Promise<ChatResponse> => {
  const response = await apiClient.post('/chat/message', { message, sessionId });
  return response.data as ChatResponse;
};

/** Clear a chat session */
export const clearSession = async (sessionId: string): Promise<void> => {
  await apiClient.post('/chat/clear', { sessionId });
};

export const chatbotApi = { sendMessage, clearSession };
export default chatbotApi;
