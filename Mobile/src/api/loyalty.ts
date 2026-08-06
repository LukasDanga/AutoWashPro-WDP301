/**
 * AutoWashPro Loyalty API Service
 * Loyalty points and history endpoints
 */

import { apiClient } from './client';

export const getMyHistory = async (params?: { page?: number; limit?: number }) => {
  const response = await apiClient.get('/loyalty/my-history', { params });
  return response.data;
};

export const getHistoryDetail = async (id: string) => {
  const response = await apiClient.get(`/loyalty/my-history/${id}`);
  return response.data;
};

export const loyaltyApi = {
  getMyHistory,
  getHistoryDetail,
};

export default loyaltyApi;
