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
// BE controller (booking.controller.js#createPayment) destructures
// { bookingId, method, paymentType } from req.body — so we map the public
// `paymentMethod` field to `method` here, and default `paymentType` to 'full'
// (paid the entire booking in one shot). For deposit flow, pass
// `type: 'deposit'` from the caller (e.g. /payment/select?type=deposit).
export const createPayment = async (
  data: CreatePaymentRequest & { type?: PaymentType },
): Promise<Payment> => {
  const { bookingId, paymentMethod, type } = data;
  const response = await apiClient.post('/payments', {
    bookingId,
    method: paymentMethod,
    ...(type ? { paymentType: type } : {}),
  });
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

// Simulate payment confirmation (for bank transfer / demo)
export const simulatePayment = async (data: {
  transactionId: string;
  gatewayTransactionId?: string;
  success?: boolean;
}): Promise<any> => {
  const response = await apiClient.post('/payments/simulate', data);
  return response.data;
};

// Export all payment API functions
export const paymentApi = {
  createPayment,
  getMyPayments,
  getPaymentByBooking,
  getPayment,
  simulatePayment,
};

export default paymentApi;
