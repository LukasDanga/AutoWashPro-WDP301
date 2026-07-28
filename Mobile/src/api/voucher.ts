/**
 * AutoWashPro Voucher API Service
 * Voucher management endpoints
 */

import { apiClient } from './client';
import type { Voucher, UserVoucher, ValidateVoucherRequest, ReserveVoucherRequest } from '../types';

// ────────────────────────────────────────────────────────────────────────────────
// Response shapes
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Shape of `GET /api/vouchers/available` when NO `type` query param is sent.
 * Backend returns snake_case keys: tier_exclusive / public / redeemable.
 * The mobile code historically expected camelCase, which made the rewards tab
 * silently empty. Normalise to camelCase in `getAvailableVouchers` below.
 */
export interface AvailableVouchersResponse {
  user?: {
    tier?: 'bronze' | 'silver' | 'gold' | 'diamond';
    loyaltyPoints?: number;
    lifetimePoints?: number;
  };
  tier_exclusive?: Voucher[];
  public?: Voucher[];
  redeemable?: Voucher[];
}

export interface AvailableVouchersNormalized {
  user?: AvailableVouchersResponse['user'];
  tierExclusive: Voucher[];
  public: Voucher[];
  redeemable: Voucher[];
}

/**
 * Shape of `GET /api/vouchers/available?type=...` (paginated).
 */
export interface PaginatedVouchersResponse {
  user?: AvailableVouchersResponse['user'];
  data?: Voucher[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get my vouchers (used vouchers — VoucherUsage history)
export const getMyVouchers = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<UserVoucher[]> => {
  const response = await apiClient.get('/vouchers/me', { params });
  // Backend may return either an array directly or { data, pagination }.
  const payload = response.data as UserVoucher[] | { data?: UserVoucher[] };
  return Array.isArray(payload) ? payload : payload.data || [];
};

// Get available vouchers for user (optionally filtered by branch).
// Returns the normalized camelCase shape consumed by the UI.
export const getAvailableVouchers = async (params?: {
  branchId?: string;
}): Promise<AvailableVouchersNormalized> => {
  const response = await apiClient.get('/vouchers/available', { params });
  const data = (response.data || {}) as AvailableVouchersResponse;
  return {
    user:          data.user,
    tierExclusive: data.tier_exclusive || [],
    public:        data.public        || [],
    redeemable:    data.redeemable    || [],
  };
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
