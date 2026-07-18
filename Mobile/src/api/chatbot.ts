/**
 * AutoWashPro Chatbot API Service
 * Supports streaming (SSE) for real-time token-by-token responses
 */

import { apiClient, API_BASE_URL } from './client';
import * as SecureStore from 'expo-secure-store';

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

export type StreamEvent =
  | { type: 'thinking' }
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Send a message (non-streaming fallback) */
export const sendMessage = async (message: string, sessionId: string): Promise<ChatResponse> => {
  const response = await apiClient.post('/chat/message', { message, sessionId });
  return response.data as ChatResponse;
};

/**
 * Send a message with streaming (SSE).
 * Calls onEvent for each token as it arrives.
 * Returns the full reply text when done.
 */
export const sendMessageStream = async (
  message: string,
  sessionId: string,
  onEvent: (event: StreamEvent) => void
): Promise<string> => {
  const STREAM_URL = `${API_BASE_URL}/chat/stream`;

  // Get auth token from secure store (same key as client.ts)
  let authHeader = '';
  try {
    const token = await SecureStore.getItemAsync('aw_accessToken');
    if (token) authHeader = `Bearer ${token}`;
  } catch {}

  const response = await fetch(STREAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming not supported');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE: split on double newlines
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? ''; // keep incomplete chunk in buffer

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data: ')) continue;

      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;

      try {
        const event: StreamEvent = JSON.parse(raw);
        onEvent(event);
        if (event.type === 'token') {
          fullText += event.token;
        }
      } catch {}
    }
  }

  return fullText;
};

/** Clear a chat session */
export const clearSession = async (sessionId: string): Promise<void> => {
  await apiClient.post('/chat/clear', { sessionId });
};

export const chatbotApi = { sendMessage, sendMessageStream, clearSession };
export default chatbotApi;
