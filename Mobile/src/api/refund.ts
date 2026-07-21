/**
 * AutoWashPro Refund API Service
 */

import { apiClient } from './client';

export const createRefundRequest = async (
  bookingId: string,
  reason: string
): Promise<any> => {
  const response = await apiClient.post('/refund-requests', {
    bookingId,
    reason,
  });
  return response.data;
};

export const getMyRefundRequests = async (): Promise<any[]> => {
  const response = await apiClient.get('/refund-requests/my');
  // Unwrap if necessary
  const payload = response.data as any[] | { requests?: any[] };
  return Array.isArray(payload) ? payload : payload.requests || [];
};

export const refundApi = {
  createRefundRequest,
  getMyRefundRequests,
};

export default refundApi;
