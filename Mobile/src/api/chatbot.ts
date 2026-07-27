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
 *
 * Token handling: the SSE connection uses a long-lived fetch, which sidesteps
 * the axios 401-refresh interceptor. We therefore implement a minimal retry:
 * if the initial request returns 401 we trigger a refresh via axios (so the
 * SecureStore tokens get updated) and retry once with the new access token.
 */
export const sendMessageStream = async (
  message: string,
  sessionId: string,
  onEvent: (event: StreamEvent) => void
): Promise<string> => {
  const STREAM_URL = `${API_BASE_URL}/chat/stream`;

  const attempt = async (tokenOverride?: string): Promise<Response> => {
    let token = tokenOverride;
    if (!token) {
      try { token = (await SecureStore.getItemAsync('aw_accessToken')) ?? undefined; } catch {}
    }
    return fetch(STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, sessionId }),
    });
  };

  let response = await attempt();

  // 401 → refresh via the axios interceptor (which updates SecureStore) and retry once.
  if (response.status === 401) {
    try {
      await apiClient.post('/auth/refresh-token', {
        refreshToken: await SecureStore.getItemAsync('aw_refreshToken'),
      });
    } catch {
      // refresh failed — fall through with the 401 response below.
    }
    response = await attempt();
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // React Native's fetch polyfill does not support response.body.getReader()
  // If not supported, fallback to non-streaming API
  const reader = typeof response.body?.getReader === 'function' ? response.body.getReader() : null;
  if (!reader) {
    const normalRes = await sendMessage(message, sessionId);
    const replyText = normalRes.reply || '';
    onEvent({ type: 'token', token: replyText });
    return replyText;
  }

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
