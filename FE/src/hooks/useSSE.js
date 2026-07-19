import { useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class SSEManager {
  constructor() {
    this.es = null;
    this.token = null;
    this.listeners = new Map(); // eventName -> Set(callback)
    this.retries = 0;
    this.retryTimeout = null;
    this.base = API_BASE.replace(/\/api$/, '');
  }

  connect(token) {
    if (this.es && this.token === token) return;
    
    this.disconnect();
    this.token = token;
    
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '?token=null';
    this.es = new EventSource(`${this.base}/api/sse${tokenParam}`);

    this.es.onerror = () => {
      this.es.close();
      this.es = null;
      this.retries++;
      if (this.retries < 5) {
        this.retryTimeout = setTimeout(() => this.connect(this.token), 5000 * this.retries);
      }
    };

    // Re-attach all existing event listeners to the new EventSource
    for (const [eventName, callbacks] of this.listeners.entries()) {
      this.es.addEventListener(eventName, (e) => {
        this.retries = 0;
        let data = null;
        try { data = e.data ? JSON.parse(e.data) : null; } catch { data = e.data; }
        callbacks.forEach(cb => cb(data));
      });
    }
  }

  disconnect() {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    clearTimeout(this.retryTimeout);
  }

  subscribe(token, eventName, callback) {
    if (!this.es || this.token !== token) {
      this.connect(token);
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
      if (this.es) {
        this.es.addEventListener(eventName, (e) => {
          this.retries = 0;
          let data = null;
          try { data = e.data ? JSON.parse(e.data) : null; } catch { data = e.data; }
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
        }
      }
      
      let total = 0;
      for (const set of this.listeners.values()) total += set.size;
      if (total === 0) {
        this.disconnect();
      }
    };
  }
}

const sseManager = new SSEManager();

export default function useSSE(token, eventName, onEvent) {
  const savedCallback = useRef(onEvent);
  savedCallback.current = onEvent;

  useEffect(() => {
    if (!eventName) return;
    return sseManager.subscribe(token, eventName, (data) => {
      savedCallback.current?.(data);
    });
  }, [token, eventName]);
}
