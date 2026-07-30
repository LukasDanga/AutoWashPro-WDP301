import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SYNC_EVENTS = ['slots_updated', 'vouchers_updated', 'my_bookings_updated', 'feedback_new', 'booking_new', 'my_vehicles_updated'];

// Khoảng thời gian chống "burst refetch": khi nhiều SYNC_EVENTS đến dồn dập trong thời
// gian ngắn (vd: tạo booking → bắn 'booking_new' + 'my_bookings_updated' + 'slots_updated'),
// chỉ fire 1 lần để tránh spam fetch.
const SYNC_DEBOUNCE_MS = 800;

class SocketManager {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = new Map(); // eventName -> Set(callback)
    this.base = API_BASE.replace(/\/api$/, '');
    this.hasInitialSync = false; // chỉ fire SYNC_EVENTS ở lần connect đầu tiên
    this.syncDebounceTimer = null;
    this.disconnectTimer = null;
  }

  connect(token) {
    if (this.socket && this.token === token) return;

    this.disconnect();
    this.token = token;

    // Reset cờ khi đổi user (login khác) hoặc lần đầu.
    this.hasInitialSync = false;

    this.socket = io(this.base, {
      auth: { token },
      transports: ['polling', 'websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);

      // Reconnect recovery: trigger sync events để mounted components refresh dữ liệu.
      // CHANGE: trước đây SYNC_EVENTS được fire MỖI LẦN reconnect (network blip, mobile
      // đổi 4G/wifi, corporate proxy timeout) → mỗi lần đều bắn toàn bộ fetch → user
      // thấy UI "reset" / "nhảy dữ liệu". Giờ chỉ fire 1 LẦN DUY NHẤT ở initial connect
      // của phiên. Các reconnect tiếp theo sẽ tin tưởng rằng server vẫn giữ state và
      // client sẽ refetch qua:
      //   - explicit re-login
      //   - tab focus event (handled in components)
      //   - explicit pull-to-refresh
      //   - real-time events khác (notification, wallet_topup_success, …)
      if (!this.hasInitialSync) {
        this.hasInitialSync = true;
        this.fireSyncEvents();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      // Reset để lần reconnect đầu tiên (sau khi mất mạng lâu) sẽ sync lại.
      // Đây là hành vi mong muốn: reconnect = recovery = re-sync.
      this.hasInitialSync = false;
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connect Error:', err.message);
    });

    for (const [eventName, callbacks] of this.listeners.entries()) {
      this.socket.on(eventName, (data) => {
        callbacks.forEach(cb => cb(data));
      });
    }
  }

  fireSyncEvents() {
    // Debounce: gom nhiều gọi trong SYNC_DEBOUNCE_MS thành 1 lần gọi listener cuối cùng.
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      this.syncDebounceTimer = null;
      SYNC_EVENTS.forEach((eventName) => {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              cb({ isSync: true });
            } catch (e) {
              console.error('[useSSE] sync listener error for', eventName, e);
            }
          });
        }
      });
    }, SYNC_DEBOUNCE_MS);
  }

  disconnect() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  }

  subscribe(token, eventName, callback) {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    if (!this.socket || this.token !== token) {
      this.connect(token);
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
      if (this.socket) {
        this.socket.on(eventName, (data) => {
          this.listeners.get(eventName)?.forEach(cb => cb(data));
        });
      }
    }

    this.listeners.get(eventName).add(callback);

    return () => {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventName);
          if (this.socket) {
            this.socket.off(eventName);
          }
        }
      }
      
      let total = 0;
      for (const set of this.listeners.values()) {
        total += set.size;
      }
      if (total === 0) {
        if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
        this.disconnectTimer = setTimeout(() => {
          let currentTotal = 0;
          for (const set of this.listeners.values()) {
            currentTotal += set.size;
          }
          if (currentTotal === 0) {
            this.disconnect();
          }
        }, 5000);
      }
    };
  }
}

const socketManager = new SocketManager();

export default function useSSE(token, eventName, onEvent) {
  const savedCallback = useRef(onEvent);
  savedCallback.current = onEvent;

  useEffect(() => {
    if (!eventName) return;
    
    const unsubscribe = socketManager.subscribe(token, eventName, (data) => {
      savedCallback.current?.(data);
    });

    return () => {
      unsubscribe();
    };
  }, [token, eventName]);
}
