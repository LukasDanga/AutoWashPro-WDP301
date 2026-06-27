/**
 * AutoWashPro Notification API Service
 * Notification endpoints
 */

import { apiClient } from './client';
import type { Notification } from '../types';

export interface NotificationsListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Get my notifications
export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
}): Promise<NotificationsListResponse> => {
  const response = await apiClient.get('/notifications', { params });
  return response.data as NotificationsListResponse;
};

// Get unread notification count
export const getUnreadCount = async (): Promise<{ unread: number }> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data as { unread: number };
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<{ message: string }> => {
  const response = await apiClient.patch('/notifications/read-all');
  return response.data;
};

// Mark notification as read
export const markAsRead = async (id: string): Promise<Notification> => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data as Notification;
};

// Delete notification
export const deleteNotification = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/notifications/${id}`);
  return response.data;
};

// Delete all notifications
export const deleteAllNotifications = async (): Promise<{ message: string }> => {
  const response = await apiClient.delete('/notifications');
  return response.data;
};

// Export all notification API functions
export const notificationApi = {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
};

export default notificationApi;
