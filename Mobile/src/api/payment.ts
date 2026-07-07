/**
 * AutoWashPro Payment API Service
 * Payment management endpoints
 */

import { apiClient } from './client';
import type { Payment, CreatePaymentRequest, PaymentMethod, PaymentType } from '../types';

export interface GetMyPaymentsParams {
  status?: Payment['status'];
  page?: number;
  limit?: number;
}

export interface PaymentsListResponse {
  payments: Payment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

// Create payment
export const createPayment = async (data: CreatePaymentRequest): Promise<Payment> => {
  const response = await apiClient.post('/payments', data);
  return response.data;
};

// Get my payments
export const getMyPayments = async (
  params?: GetMyPaymentsParams,
): Promise<Payment[]> => {
  const response = await apiClient.get('/payments/my', { params });
  // Backend may return { payments, pagination } or plain array
  const payload = response.data as Payment[] | { payments?: Payment[] };
  return Array.isArray(payload) ? payload : payload.payments || [];
};

// Get payment by booking ID
export const getPaymentByBooking = async (bookingId: string): Promise<Payment> => {
  const response = await apiClient.get(`/payments/booking/${bookingId}`);
  return response.data;
};

// Get payment detail by payment id (admin / manager only — kept for parity)
export const getPayment = async (id: string): Promise<Payment> => {
  const response = await apiClient.get(`/payments/${id}`);
  return response.data;
};

// Export all payment API functions
export const paymentApi = {
  createPayment,
  getMyPayments,
  getPaymentByBooking,
  getPayment,
};

export default paymentApi;
