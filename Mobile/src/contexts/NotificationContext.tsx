/**
 * AutoWashPro Notification Context
 * Global notification state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notificationApi } from '../api';
import { sseService } from '../services/sse';
import { useAuth } from './AuthContext';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial notifications
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [listRes, unreadRes] = await Promise.all([
        notificationApi.getNotifications({ limit: 50 }),
        notificationApi.getUnreadCount(),
      ]);
      const list = listRes.notifications || [];
      setNotifications(list);
      setUnreadCount(unreadRes.unread ?? list.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Connect to SSE when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      sseService.disconnect();
      setIsConnected(false);
      return;
    }

    refreshNotifications();

    // Open the SSE stream for this user.
    sseService.connect(user._id).then(() => {
      setIsConnected(sseService.isConnectedFn());
    });

    // The server-side SSE payload only contains { title, message, type } —
    // no _id/isRead/createdAt. To avoid duplicate notifications in the list,
    // we re-fetch the page whenever a new event arrives. The list itself
    // stays in sync via refreshNotifications(); UI badges update instantly.
    const unsubscribe = sseService.subscribe('notification', () => {
      refreshNotifications();
    });

    return () => {
      unsubscribe();
      sseService.disconnect();
      setIsConnected(false);
    };
  }, [isAuthenticated, user, refreshNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      const notification = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
