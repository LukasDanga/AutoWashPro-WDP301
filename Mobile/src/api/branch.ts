/**
 * AutoWashPro Branch API Service
 * Branch/location endpoints
 */

import { apiClient } from './client';
import type { Branch, Package } from '../types';

// Get public branches (no auth required)
// Optional packageId filter — when present, backend returns only branches
// that offer the package. Falls back to client-side filter on the caller if
// the backend ignores the param.
export const getPublicBranches = async (params?: {
  packageId?: string;
}): Promise<Branch[]> => {
  const response = await apiClient.get('/branches/public', { params });
  return response.data;
};

// Get all branches (auth required)
export const getBranches = async (params?: {
  status?: 'active' | 'inactive';
  search?: string;
}): Promise<Branch[]> => {
  const response = await apiClient.get('/branches', { params });
  return response.data;
};

// Get branch by ID
export const getBranch = async (id: string): Promise<Branch> => {
  const response = await apiClient.get(`/branches/${id}`);
  return response.data;
};

// Get packages for a branch
export const getBranchPackages = async (branchId: string): Promise<Package[]> => {
  const response = await apiClient.get('/packages', { params: { branchId, status: 'active' } });
  return response.data;
};

// Export all branch API functions
export const branchApi = {
  getPublicBranches,
  getBranches,
  getBranch,
  getBranchPackages,
};

export default branchApi;
