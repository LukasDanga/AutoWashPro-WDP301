/**
 * AutoWashPro SlotPack API Service
 * Pre-paid slot pack endpoints
 */

import { apiClient } from './client';
import type { SlotPack, CreateSlotPackRequest } from '../types';

// Preview discount by slot count
export const previewDiscount = async (params: {
  totalSlots: number;
  unitPrice: number;
}): Promise<{
  originalPrice: number;
  discount: number;
  discountPercent: number;
  finalPrice: number;
}> => {
  const response = await apiClient.get('/slot-packs/preview', { params });
  return response.data;
};

// Buy/create slot pack
export const buySlotPack = async (data: CreateSlotPackRequest): Promise<SlotPack> => {
  const response = await apiClient.post('/slot-packs', data);
  return response.data;
};

// Get my slot packs
export const getMySlotPacks = async (): Promise<SlotPack[]> => {
  const response = await apiClient.get('/slot-packs/my');
  return response.data;
};

// Get slot pack by ID
export const getSlotPack = async (id: string): Promise<SlotPack> => {
  const response = await apiClient.get(`/slot-packs/${id}`);
  return response.data;
};

// Request cancel OTP for slot pack
export const requestCancelOtp = async (id: string): Promise<any> => {
  const response = await apiClient.post(`/slot-packs/${id}/request-cancel-otp`);
  return response.data;
};

// Cancel slot pack
export const cancelSlotPack = async (id: string, otp?: string): Promise<SlotPack> => {
  const response = await apiClient.post(`/slot-packs/${id}/cancel`, { otp });
  return response.data;
};

// Create payment for slot pack
export const paySlotPack = async (id: string, method: string, client: string = 'mobile'): Promise<any> => {
  const response = await apiClient.post(`/slot-packs/${id}/pay`, { method, client });
  return response.data;
};

// Export all slot pack API functions
export const slotPackApi = {
  previewDiscount,
  buySlotPack,
  getMySlotPacks,
  getSlotPack,
  requestCancelOtp,
  cancelSlotPack,
  paySlotPack,
};

export default slotPackApi;
