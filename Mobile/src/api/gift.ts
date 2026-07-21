/**
 * AutoWashPro Gifts / Spinning Wheel API Service
 *
 * Backend endpoints:
 *   GET  /api/gifts/public    — public gift catalog (no auth required)
 *   POST /api/gifts/spin       — consume one spin, returns { spinCount, prize, voucher }
 */

import { apiClient } from './client';
import type { Gift } from '../types';

export interface SpinResult {
  spinCount: number;
  prize: {
    _id: string;
    name: string;
    image?: string;
    type?: 'percentage' | 'fixed' | 'none';
    value?: number;
    probability?: number;
    description?: string;
  };
  voucher?: {
    _id: string;
    code: string;
    name: string;
    type?: string;
    value?: number;
    endDate?: string;
  };
}

export const getPublicGifts = async (): Promise<Gift[]> => {
  const response = await apiClient.get('/gifts/public');
  const payload = response.data as Gift[] | { data?: Gift[] };
  return Array.isArray(payload) ? payload : payload.data || [];
};

export const spin = async (): Promise<SpinResult> => {
  const response = await apiClient.post('/gifts/spin');
  return response.data;
};

export const giftApi = { getPublicGifts, spin };
export default giftApi;
