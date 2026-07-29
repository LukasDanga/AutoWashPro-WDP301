/**
 * AutoWashPro Socket Service (formerly SSE Service)
 *
 * Real-time notifications via Socket.IO.
 * Replaces the old fetch-based SSE for true WebSocket stability.
 */

import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_EVENTS, SocketEventType } from '../utils/socketEvents';

const ACCESS_TOKEN_KEY = 'aw_accessToken';

export type SSEEventType = SocketEventType | 'booking_update' | 'payment_update' | 'sync_request';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

type EventCallback = (event: SSEEvent) => void;

const SYNC_EVENTS: SSEEventType[] = [
  SOCKET_EVENTS.SLOTS_UPDATED,
  SOCKET_EVENTS.VOUCHERS_UPDATED,
  SOCKET_EVENTS.MY_BOOKINGS_UPDATED,
  SOCKET_EVENTS.FEEDBACK_NEW,
  SOCKET_EVENTS.BOOKING_NEW,
  SOCKET_EVENTS.MY_VEHICLES_UPDATED,
  SOCKET_EVENTS.REFUND_REQUEST_UPDATED,
  SOCKET_EVENTS.REFUND_REQUESTS_UPDATED,
  SOCKET_EVENTS.POINTS_UPDATED,
  SOCKET_EVENTS.PAYMENT_CONFIRMED,
  SOCKET_EVENTS.WALLET_TOPUP_SUCCESS,
  SOCKET_EVENTS.SPIN_ADDED,
  SOCKET_EVENTS.SLOT_PACK_PAID,
];

class SSEService {
  private listeners: Map<SSEEventType | 'all', Set<EventCallback>> = new Map();
  private socket: Socket | null = null;
  private currentUserId: string | null = null;

  async connect(userId: string): Promise<void> {
    // If already connected to socket AND for the same user, do nothing.
    if (this.socket?.connected && this.currentUserId === userId) {
      return;
    }
    // Tear down old socket if user changed OR socket is in a bad state.
    if (this.socket) {
      this.disconnect();
    }
    this.currentUserId = userId;

    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) {
      console.warn('[Socket] No auth token, skipping stream');
      return;
    }

    const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
    
    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);

      // Reconnect recovery: fire a single 'sync_request' event instead of
      // re-emitting every SYNC_EVENTS entry — that was causing the React
      // notification/auth contexts to re-fetch 13+ times per reconnect,
      // which combined with state updates triggered "Maximum update depth".
      this.emit('sync_request', {
        type: 'sync_request',
        data: { isSync: true },
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
    
    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connect Error:', err.message);
    });

    // Listen to all events generically
    this.socket.onAny((eventName: string, args: any) => {
      const mappedType = this.mapEventType(eventName);
      this.emit(mappedType, {
        type: mappedType,
        data: args,
        timestamp: new Date().toISOString(),
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
  }

  subscribe(type: SSEEventType | 'all', callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  isConnectedFn(): boolean {
    return this.socket ? this.socket.connected : false;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private mapEventType(name: string): SSEEventType {
    // Check if the event name matches any known SOCKET_EVENTS value
    const knownEvents = Object.values(SOCKET_EVENTS) as string[];
    if (knownEvents.includes(name)) {
      return name as SSEEventType;
    }
    // Also pass through known SSE-only types
    if (['booking_update', 'payment_update', 'sync_request'].includes(name)) {
      return name as SSEEventType;
    }
    return name as SSEEventType;
  }

  private emit(type: SSEEventType | 'all', event: SSEEvent): void {
    const keys: Array<SSEEventType | 'all'> = [type, 'all'];
    keys.forEach(key => {
      const set = this.listeners.get(key);
      if (!set) return;
      set.forEach(cb => {
        try {
          cb(event);
        } catch (err) {
          console.error('[Socket] Listener error:', err);
        }
      });
    });
  }

  emitNotification(data: any): void {
    this.emit('notification', { type: 'notification', data, timestamp: new Date().toISOString() });
  }

  emitBookingUpdate(data: any): void {
    this.emit('booking_update', { type: 'booking_update', data, timestamp: new Date().toISOString() });
  }

  emitPaymentUpdate(data: any): void {
    this.emit('payment_update', { type: 'payment_update', data, timestamp: new Date().toISOString() });
  }
}

export const sseService = new SSEService();
export default sseService;