/**
 * AutoWashPro Notification Context
 * Global notification state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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

  // Keep latest userId accessible without making it a state/effect dep
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?._id || null;

  // Fetch initial notifications
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [listRes, unreadRes] = await Promise.all([
        notificationApi.getNotifications({ limit: 50 }),
        notificationApi.getUnreadCount(),
      ]);
      const list = listRes?.notifications || (Array.isArray(listRes) ? listRes : []);
      setNotifications(list);
      const computedUnread = typeof unreadRes?.unread === 'number'
        ? unreadRes.unread
        : list.filter((n: any) => !n.isRead).length;
      setUnreadCount(computedUnread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Keep latest refreshNotifications ref so SSE subscriptions always call the latest version
  // without needing to re-subscribe (which would cause re-render loops)
  const refreshRef = useRef(refreshNotifications);
  refreshRef.current = refreshNotifications;

  // Cooldown flag to prevent cascading refreshes from SSE reconnect storms
  const lastRefreshAtRef = useRef<number>(0);
  const REFRESH_COOLDOWN_MS = 2000;

  const throttledRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) return;
    lastRefreshAtRef.current = now;
    refreshRef.current();
  }, []);

  // Connect to SSE/Socket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      sseService.disconnect();
      setIsConnected(false);
      return;
    }

    const userId = user._id;

    // Only connect if not already connected for this user
    if (!sseService.isConnectedFn() || sseService.getCurrentUserId() !== userId) {
      sseService.connect(userId).then(() => {
        setIsConnected(sseService.isConnectedFn());
      });
    } else {
      setIsConnected(true);
    }

    // Subscribe ONLY to 'all' — internal emit() already forwards to both 'type' and 'all',
    // so subscribing to a specific type plus 'all' would double-fire every event.
    // sync_request events are skipped via cooldown above.
    const unsubscribeAll = sseService.subscribe('all', throttledRefresh);

    return () => {
      unsubscribeAll();
      // Do NOT disconnect here — multiple providers may be listening.
      // Set isConnected state to false but leave the socket alive.
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?._id]);

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
