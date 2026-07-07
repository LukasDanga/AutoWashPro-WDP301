/**
 * AutoWashPro SSE Hook
 * React hook for SSE real-time notifications
 */

import { useEffect, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { sseService, SSEEvent, SSEEventType } from '../services/sse';
import { notificationApi } from '../api';

export interface UseSSEOptions {
  /** Enable notification events (default: true) */
  notifications?: boolean;
  /** Enable booking update events (default: true) */
  bookingUpdates?: boolean;
  /** Enable payment update events (default: true) */
  paymentUpdates?: boolean;
  /** Enable system events (default: false) */
  systemEvents?: boolean;
}

export interface UseSSEReturn {
  /** Whether SSE is connected */
  isConnected: boolean;
  /** Connect to SSE manually */
  connect: () => void;
  /** Disconnect from SSE manually */
  disconnect: () => void;
  /** Subscribe to a specific event type */
  subscribe: (type: SSEEventType | 'all', callback: (event: SSEEvent) => void) => () => void;
  /** Refresh notification count */
  refreshUnreadCount: () => Promise<number>;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  
  const {
    notifications = true,
    bookingUpdates = true,
    paymentUpdates = true,
    systemEvents = false,
  } = options;

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && user) {
        sseService.connect(user._id);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        sseService.disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, user]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      sseService.connect(user._id);
      setIsConnected(true);
    } else {
      sseService.disconnect();
      setIsConnected(false);
    }

    return () => {
      sseService.disconnect();
    };
  }, [isAuthenticated, user]);

  // Subscribe to specific event types
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (notifications) {
      unsubscribers.push(
        sseService.subscribe('notification', (event) => {
          console.log('New notification:', event.data);
        })
      );
    }

    if (bookingUpdates) {
      unsubscribers.push(
        sseService.subscribe('booking_update', (event) => {
          console.log('Booking update:', event.data);
        })
      );
    }

    if (paymentUpdates) {
      unsubscribers.push(
        sseService.subscribe('payment_update', (event) => {
          console.log('Payment update:', event.data);
        })
      );
    }

    if (systemEvents) {
      unsubscribers.push(
        sseService.subscribe('system', (event) => {
          console.log('System event:', event.data);
        })
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [notifications, bookingUpdates, paymentUpdates, systemEvents]);

  const connect = useCallback(() => {
    if (isAuthenticated && user) {
      sseService.connect(user._id);
      setIsConnected(true);
    }
  }, [isAuthenticated, user]);

  const disconnect = useCallback(() => {
    sseService.disconnect();
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((type: SSEEventType | 'all', callback: (event: SSEEvent) => void) => {
    return sseService.subscribe(type, callback);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      return response.unread;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    refreshUnreadCount,
  };
}

export default useSSE;
