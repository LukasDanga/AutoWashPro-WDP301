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

// H-6 SAFETY: xác định URL production rõ ràng để tránh app trỏ về localhost
// khi deploy mà quên set env. Thứ tự ưu tiên:
//   1. EXPO_PUBLIC_API_URL (chuẩn Expo)
//   2. REACT_NATIVE_API_URL hoặc API_URL (legacy)
//   3. Tùy __DEV__: localhost trong dev, fallback rõ ràng trong prod (throw lỗi)
//
// Trước đây: production build mà quên set env → app kết nối localhost → fail silent.
function resolveSocketBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.REACT_NATIVE_API_URL ||
    process.env.API_URL;

  if (fromEnv && fromEnv.trim()) {
    return fromEnv.replace(/\/api$/, '');
  }

  if (__DEV__) {
    // dev: cho phép localhost để dễ dev
    return 'http://localhost:5000';
  }

  // Production mà không có env → throw lỗi rõ ràng thay vì silent fail.
  throw new Error(
    '[Socket] EXPO_PUBLIC_API_URL chưa được set. Production build bắt buộc phải ' +
      'cấu hình URL backend (vd: https://autowash-be.onrender.com).',
  );
}

export type SSEEventType = SocketEventType | 'booking_update' | 'payment_update' | 'sync_request';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

type EventCallback = (event: SSEEvent) => void;

// L-2 CLEANUP: SYNC_EVENTS array trước đây dùng để fire 13+ events cho "reconnect
// recovery" — nhưng giờ chỉ cần 1 'sync_request' event là đủ. Sync-flood đó
// trước đây trigger "Maximum update depth exceeded" trong React vì:
//   1. SSE reconnect → fire 13 sync events
//   2. Mỗi event → component fetchBookings()
//   3. setState dồn dập → React loop
// Giờ chỉ 1 event, an toàn hơn. Array giữ ở đây để:
//   - Marketplace 1 re-mount có thể reference các SYNC_EVENTS nếu cần
//   - 13 entries → comment để cảnh báo dev tuyệt đối KHÔNG fire lại đồng loạt
// const SYNC_EVENTS_DEPRECATED = [
//   'slots_updated', 'vouchers_updated', 'my_bookings_updated',
//   'feedback_new', 'booking_new', 'my_vehicles_updated',
//   'refund_request_updated', 'refund_requests_updated', 'points_updated',
//   'payment_confirmed', 'wallet_topup_success', 'spin_added', 'slot_pack_paid',
// ];

class SSEService {
  private listeners: Map<SSEEventType | 'all', Set<EventCallback>> = new Map();
  private socket: Socket | null = null;
  private currentUserId: string | null = null;
  // L-2: chống "Maximum update depth" khi socket reconnect nhiều lần liên tiếp.
  // Mỗi reconnect fire 1 'sync_request' → nếu handler bên trong setState thì
  // dồn dập → React loop. Debounce 1s gom 1 burst thành 1 emission.
  private syncRequestTimer: ReturnType<typeof setTimeout> | null = null;
  private hasInitialSync = false;

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
    this.hasInitialSync = false;

    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) {
      console.warn('[Socket] No auth token, skipping stream');
      return;
    }

    const baseUrl = resolveSocketBaseUrl();
    console.log('[Socket] Connecting to:', baseUrl);
    
    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);

      // L-2: chỉ fire 1 sync_request ở lần initial connect. Reconnect (network blip,
      // mobile đổi 4G/wifi) sẽ KHÔNG re-sync để tránh "Maximum update depth".
      // User thấy UI reset → chỉ cần pull-to-refresh / explicit re-login.
      // Debounce 1s để nếu connect thực sự 2 lần liên tiếp (race), vẫn chỉ 1 emit.
      if (this.hasInitialSync) return;
      this.hasInitialSync = true;

      if (this.syncRequestTimer) clearTimeout(this.syncRequestTimer);
      this.syncRequestTimer = setTimeout(() => {
        this.syncRequestTimer = null;
        this.emit('sync_request', {
          type: 'sync_request',
          data: { isSync: true },
          timestamp: new Date().toISOString(),
        });
      }, 1000);
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      // Reset để lần reconnect sau (mất mạng lâu / server restart) sẽ re-sync.
      this.hasInitialSync = false;
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
    if (this.syncRequestTimer) {
      clearTimeout(this.syncRequestTimer);
      this.syncRequestTimer = null;
    }
    this.currentUserId = null;
    this.hasInitialSync = false;
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