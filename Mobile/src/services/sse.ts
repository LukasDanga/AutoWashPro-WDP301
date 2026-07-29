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
  SOCKET_EVENTS.MY_VEHICLES_UPDATED
];

class SSEService {
  private listeners: Map<SSEEventType | 'all', Set<EventCallback>> = new Map();
  private socket: Socket | null = null;
  private currentUserId: string | null = null;

  async connect(userId: string): Promise<void> {
    if (this.socket && this.socket.connected && this.currentUserId === userId) {
      return;
    }
    this.disconnect();
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
      
      // Reconnect recovery strategy: force mounted components to re-fetch critical data
      SYNC_EVENTS.forEach(eventName => {
        this.emit(eventName, {
          type: eventName,
          data: { isSync: true },
          timestamp: new Date().toISOString()
        });
      });
      
      this.emit('sync_request', {
        type: 'sync_request',
        data: {},
        timestamp: new Date().toISOString()
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

  private mapEventType(name: string): SSEEventType {
    switch (name) {
      case SOCKET_EVENTS.NOTIFICATION: return SOCKET_EVENTS.NOTIFICATION;
      case SOCKET_EVENTS.BOOKING_NEW: return SOCKET_EVENTS.BOOKING_NEW;
      case SOCKET_EVENTS.WALLET_TOPUP_SUCCESS: return SOCKET_EVENTS.WALLET_TOPUP_SUCCESS;
      case SOCKET_EVENTS.SPIN_ADDED: return SOCKET_EVENTS.SPIN_ADDED;
      case SOCKET_EVENTS.SLOT_PACK_PAID: return SOCKET_EVENTS.SLOT_PACK_PAID;
      case SOCKET_EVENTS.MY_BOOKINGS_UPDATED: return SOCKET_EVENTS.MY_BOOKINGS_UPDATED;
      case SOCKET_EVENTS.SLOTS_UPDATED: return SOCKET_EVENTS.SLOTS_UPDATED;
      case SOCKET_EVENTS.PING: return SOCKET_EVENTS.PING;
      default: return SOCKET_EVENTS.SYSTEM;
    }
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