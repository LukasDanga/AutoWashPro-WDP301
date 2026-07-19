/**
 * AutoWashPro Voucher API Service
 * Voucher management endpoints
 */

import { apiClient } from './client';
import type { Voucher, UserVoucher, ValidateVoucherRequest, ReserveVoucherRequest } from '../types';

// Get my vouchers (used vouchers)
export const getMyVouchers = async (): Promise<UserVoucher[]> => {
  const response = await apiClient.get('/vouchers/me');
  return response.data;
};

// Get available vouchers for user (optionally filtered by branch)
export const getAvailableVouchers = async (params?: {
  branchId?: string;
}): Promise<{
  tierExclusive: Voucher[];
  public: Voucher[];
  redeemable: Voucher[];
}> => {
  const response = await apiClient.get('/vouchers/available', { params });
  return response.data;
};

// Get voucher by ID
export const getVoucher = async (id: string): Promise<Voucher> => {
  const response = await apiClient.get(`/vouchers/${id}`);
  return response.data;
};

// Get voucher by code
export const getVoucherByCode = async (code: string): Promise<Voucher> => {
  const response = await apiClient.get(`/vouchers/code/${code}`);
  return response.data;
};

// Validate voucher for booking
export const validateVoucher = async (data: ValidateVoucherRequest) => {
  const response = await apiClient.post('/vouchers/validate', data);
  return response.data;
};

// Reserve voucher for booking
export const reserveVoucher = async (data: ReserveVoucherRequest) => {
  const response = await apiClient.post('/vouchers/reserve', data);
  return response.data;
};

// Rollback voucher reservation
export const rollbackVoucher = async (data: { code: string; bookingId: string }): Promise<{ message: string }> => {
  const response = await apiClient.post('/vouchers/rollback', data);
  return response.data;
};

// Redeem points for voucher
export const redeemPoints = async (templateId: string) => {
  const response = await apiClient.post('/vouchers/redeem-points', { templateId });
  return response.data;
};

// Export all voucher API functions
export const voucherApi = {
  getMyVouchers,
  getAvailableVouchers,
  getVoucher,
  getVoucherByCode,
  validateVoucher,
  reserveVoucher,
  rollbackVoucher,
  redeemPoints,
};

export default voucherApi;
