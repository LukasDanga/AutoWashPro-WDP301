/**
 * AutoWashPro Vehicle API Service
 * Vehicle management endpoints
 */

import { apiClient } from './client';
import type { Vehicle, CreateVehicleRequest } from '../types';

// Get all vehicles for current user
export const getVehicles = async (): Promise<Vehicle[]> => {
  const response = await apiClient.get('/vehicles');
  return response.data;
};

// Add new vehicle
export const addVehicle = async (data: CreateVehicleRequest): Promise<Vehicle> => {
  const response = await apiClient.post('/vehicles', data);
  return response.data;
};

// Get vehicle by ID
export const getVehicle = async (id: string): Promise<Vehicle> => {
  const response = await apiClient.get(`/vehicles/${id}`);
  return response.data;
};

// Update vehicle
export const updateVehicle = async (id: string, data: Partial<CreateVehicleRequest>): Promise<Vehicle> => {
  const response = await apiClient.put(`/vehicles/${id}`, data);
  return response.data;
};

// Delete vehicle
export const deleteVehicle = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/vehicles/${id}`);
  return response.data;
};

// Export all vehicle API functions
export const vehicleApi = {
  getVehicles,
  addVehicle,
  getVehicle,
  updateVehicle,
  deleteVehicle,
};

export default vehicleApi;
