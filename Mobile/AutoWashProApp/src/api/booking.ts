/**
 * AutoWashPro Booking API Service
 * Booking management endpoints
 */

import { apiClient } from './client';
import type {
  Booking,
  CreateBookingRequest,
  CreateRecurringBookingRequest,
  RecurringBookingResult,
  AvailableSlot,
} from '../types';

// Create new booking
export const createBooking = async (data: CreateBookingRequest): Promise<Booking> => {
  const response = await apiClient.post('/bookings', data);
  return response.data;
};

// Create recurring booking
export const createRecurringBooking = async (
  data: CreateRecurringBookingRequest,
): Promise<RecurringBookingResult> => {
  const response = await apiClient.post('/bookings/recurring', data);
  return response.data as RecurringBookingResult;
};

// Cancel recurring booking group
export const cancelRecurringGroup = async (groupId: string): Promise<{ message: string }> => {
  const response = await apiClient.post(`/bookings/recurring/${groupId}/cancel`);
  return response.data;
};

// Get my bookings
export const getMyBookings = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Booking[]; pagination?: any }> => {
  const response = await apiClient.get('/bookings/my', { params });
  // Backend wraps list endpoints as { bookings: [...], pagination: {...} }
  // Mobile interceptor unwraps { success, data } → { bookings: [...], pagination: {...} }
  // So response.data is { bookings, pagination } — extract bookings array
  const payload = response.data as { bookings?: Booking[]; pagination?: any };
  return { data: payload.bookings || [], pagination: payload.pagination };
};

// Get available time slots
export const getAvailableSlots = async (params: {
  branchId: string;
  date: string;
  packageId: string;
}): Promise<AvailableSlot[]> => {
  const response = await apiClient.get('/bookings/slots', { params });
  return response.data;
};

// Get booking by ID
export const getBooking = async (id: string): Promise<Booking> => {
  const response = await apiClient.get(`/bookings/${id}`);
  return response.data;
};

// Cancel booking
export const cancelBooking = async (id: string, reason?: string): Promise<Booking> => {
  const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
  return response.data;
};

// Submit feedback/rating
export const submitFeedback = async (
  id: string,
  data: { rating?: number; feedback?: string }
): Promise<Booking> => {
  const response = await apiClient.patch(`/bookings/${id}/feedback`, data);
  return response.data;
};

// Rebook from existing booking
export const rebookBooking = async (
  id: string,
  data: { bookingDate: string; startTime: string }
): Promise<Booking> => {
  const response = await apiClient.post(`/bookings/${id}/rebook`, data);
  return response.data;
};

// Get booking QR code
export const getBookingQR = async (id: string): Promise<{ qrCode: string }> => {
  const response = await apiClient.get(`/bookings/${id}/qr`);
  return response.data;
};

// Export all booking API functions
export const bookingApi = {
  createBooking,
  createRecurringBooking,
  cancelRecurringGroup,
  getMyBookings,
  getAvailableSlots,
  getBooking,
  cancelBooking,
  submitFeedback,
  rebookBooking,
  getBookingQR,
};

export default bookingApi;
