/**
 * AutoWashPro Auth API Service
 * Authentication endpoints
 */

import { apiClient } from './client';
import type { User, LoginRequest, RegisterRequest } from '../types';

// Register new user
export const register = async (data: RegisterRequest): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

// Login user
export const login = async (identifier: string, password: string) => {
  const response = await apiClient.post('/auth/login', { identifier, password });
  return response.data; // { accessToken, refreshToken, user }
};

// Login with Google
export const loginWithGoogle = async (idToken: string) => {
  const response = await apiClient.post('/auth/google', { idToken });
  return response.data; // { accessToken, refreshToken, user }
};

// Refresh token
export const refreshToken = async (refreshToken: string) => {
  const response = await apiClient.post('/auth/refresh-token', { refreshToken });
  return response.data; // { accessToken, refreshToken }
};

// Logout
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

// Get user profile
export const getProfile = async (): Promise<User> => {
  const response = await apiClient.get('/auth/profile');
  return response.data;
};

// Get customer profile with vehicles
export const getCustomerProfile = async (): Promise<User & { vehicles: any[] }> => {
  const response = await apiClient.get('/auth/customer/profile');
  return response.data;
};

// Update customer profile
export const updateCustomerProfile = async (data: Partial<User>): Promise<User> => {
  const response = await apiClient.put('/auth/customer/profile', data);
  return response.data;
};

// Update user profile
export const updateProfile = async (data: Partial<User>): Promise<User> => {
  const response = await apiClient.put('/auth/profile', data);
  return response.data;
};

// Change password
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data;
};

// ──────────────────────────────────────────────────────────────────────────────
// Forgot-password / OTP / reset
//
// TODO(BACKEND): these endpoints do not yet exist on the BE side. The Mobile
// UI currently calls them anyway and gracefully handles 404 by surfacing a
// clear error to the user (instead of the previous setTimeout-based mock which
// silently "succeeded"). As soon as the corresponding routes land in
// `BE/src/routes/authRoutes.js`, these calls will start working without any
// further Mobile changes.
// ──────────────────────────────────────────────────────────────────────────────

/** Request a one-time code to be sent to the user's email. */
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data;
};

/** Verify the OTP code that was emailed to the user. */
export const verifyOtp = async (email: string, otp: string): Promise<{ valid: boolean; resetToken?: string }> => {
  const response = await apiClient.post('/auth/verify-otp', { email, otp });
  return response.data;
};

/** Reset the password using a verified reset token (or verified OTP). */
export const resetPassword = async (payload: {
  email: string;
  otp?: string;
  resetToken?: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const response = await apiClient.post('/auth/reset-password', payload);
  return response.data;
};

// Export all auth API functions
export const authApi = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  getCustomerProfile,
  updateCustomerProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
};

export default authApi;
