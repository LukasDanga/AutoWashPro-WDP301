/**
 * AutoWashPro Payment API Service
 * Payment management endpoints
 */

import { apiClient } from './client';
import type { Payment, CreatePaymentRequest } from '../types';

// Create payment
export const createPayment = async (data: CreatePaymentRequest): Promise<Payment> => {
  const response = await apiClient.post('/payments', data);
  return response.data;
};

// Get my payments
export const getMyPayments = async (): Promise<Payment[]> => {
  const response = await apiClient.get('/payments/my');
  return response.data;
};

// Get payment by booking ID
export const getPaymentByBooking = async (bookingId: string): Promise<Payment> => {
  const response = await apiClient.get(`/payments/booking/${bookingId}`);
  return response.data;
};

// Export all payment API functions
export const paymentApi = {
  createPayment,
  getMyPayments,
  getPaymentByBooking,
};

export default paymentApi;
