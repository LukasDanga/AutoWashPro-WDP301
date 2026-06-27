/**
 * AutoWashPro Public API Service
 * Public endpoints (no auth required)
 */

import axios from 'axios';
import type { PublicStats, Gift, SlotProduct, Testimonial } from '../types';

// Use direct axios to avoid auth interceptor
const publicClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - unwrap data from { success, data }
publicClient.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

// Get public stats
export const getPublicStats = async (): Promise<PublicStats> => {
  const response = await publicClient.get('/stats/public');
  return response.data;
};

// Get public gifts
export const getGifts = async (): Promise<Gift[]> => {
  const response = await publicClient.get('/gifts/public');
  return response.data;
};

// Get public slot products
export const getSlotProducts = async (): Promise<SlotProduct[]> => {
  const response = await publicClient.get('/slot-products/public');
  return response.data;
};

// Get testimonials
export const getTestimonials = async (): Promise<Testimonial[]> => {
  const response = await publicClient.get('/testimonials');
  return response.data;
};

// Chat with chatbot
export const sendChatMessage = async (
  message: string,
  sessionId?: string
): Promise<{ reply: string; sessionId: string }> => {
  const response = await publicClient.post('/chat/message', {
    message,
    sessionId,
  });
  return response.data;
};

// Clear chat session
export const clearChat = async (sessionId: string): Promise<{ message: string }> => {
  const response = await publicClient.post('/chat/clear', { sessionId });
  return response.data;
};

// Export all public API functions
export const publicApi = {
  getPublicStats,
  getGifts,
  getSlotProducts,
  getTestimonials,
  sendChatMessage,
  clearChat,
};

export default publicApi;
