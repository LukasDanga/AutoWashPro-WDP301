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

  // Keep latest userId to avoid reconnecting socket when object reference changes
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?._id || null;

  // Handle app state changes — reconnect when app returns to foreground,
  // but only if no other provider is already managing the connection.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // sseService.connect guards against duplicate connections internally,
        // so multiple callers cannot trigger reconnect storms here.
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Subscribe to specific event types — NO automatic connect/disconnect.
  // Connection is managed centrally by NotificationContext so we don't
  // get into a connect/disconnect loop with other providers that also
  // depend on (isAuthenticated, user).
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
    // No-op: connection is centrally managed by NotificationContext.
    // Subscribers can still use this hook to listen for events.
  }, []);

  const disconnect = useCallback(() => {
    // No-op: connection is centrally managed by NotificationContext.
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
