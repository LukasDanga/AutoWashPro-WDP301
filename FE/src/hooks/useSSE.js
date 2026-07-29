import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SYNC_EVENTS = ['slots_updated', 'vouchers_updated', 'my_bookings_updated', 'feedback_new', 'booking_new', 'my_vehicles_updated'];

class SocketManager {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = new Map(); // eventName -> Set(callback)
    this.base = API_BASE.replace(/\/api$/, '');
  }

  connect(token) {
    if (this.socket && this.token === token) return;
    
    this.disconnect();
    this.token = token;
    
    this.socket = io(this.base, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      
      // Reconnect recovery: trigger sync events so mounted components refresh their data
      // We skip events like 'notification', 'wallet_topup_success', 'spin_added' which show toasts.
      SYNC_EVENTS.forEach(eventName => {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
          callbacks.forEach(cb => cb({ isSync: true }));
        }
      });
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connect Error:', err.message);
    });

    // Re-attach all existing event listeners to the new socket
    for (const [eventName, callbacks] of this.listeners.entries()) {
      this.socket.on(eventName, (data) => {
        callbacks.forEach(cb => cb(data));
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(token, eventName, callback) {
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
        this.disconnect();
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
