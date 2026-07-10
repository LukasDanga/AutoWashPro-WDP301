/**
 * AutoWashPro Package API Service
 * Service package endpoints
 */

import { apiClient } from './client';
import type { Package } from '../types';

// Get all packages
export const getPackages = async (params?: {
  status?: 'active' | 'inactive';
  name?: string;
  branchId?: string;
  category?: string;
  limit?: number | 'all';
}): Promise<Package[]> => {
  const response = await apiClient.get('/packages', { params });
  return response.data;
};

// Get package by ID
export const getPackage = async (id: string): Promise<Package> => {
  const response = await apiClient.get(`/packages/${id}`);
  return response.data;
};

// Export all package API functions
export const packageApi = {
  getPackages,
  getPackage,
};

export default packageApi;
