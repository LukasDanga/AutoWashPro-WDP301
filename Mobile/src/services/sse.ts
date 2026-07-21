/**
 * AutoWashPro SSE Service
 *
 * Real-time notifications via Server-Sent Events.
 *
 * React Native doesn't expose `EventSource`, but since Expo SDK 50+ the
 * underlying `fetch` implementation supports streaming via a `ReadableStream`
 * body. We open a streaming GET, parse the SSE frames on the fly, and emit
 * typed events to subscribers.
 *
 * Auto-reconnects with exponential backoff when the stream drops.
 */

import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'aw_accessToken';

export type SSEEventType =
  | 'notification'
  | 'booking_update'
  | 'payment_update'
  | 'system'
  | 'booking_new'
  | 'ping';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

type EventCallback = (event: SSEEvent) => void;

const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;

class SSEService {
  private listeners: Map<SSEEventType | 'all', Set<EventCallback>> = new Map();
  private isConnected = false;
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private intentionalClose = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Connect to the server's SSE stream for a given user.
   */
  async connect(userId: string): Promise<void> {
    if (this.isConnected && this.currentUserId === userId) {
      return;
    }
    this.disconnect();
    this.currentUserId = userId;
    this.intentionalClose = false;
    await this.openStream();
  }

  /**
   * Disconnect and cancel any pending reconnect.
   */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        /* noop */
      }
      this.abortController = null;
    }
    this.isConnected = false;
    this.currentUserId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to events. Returns an unsubscribe function.
   */
  subscribe(type: SSEEventType | 'all', callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Check if connected.
   */
  isConnectedFn(): boolean {
    return this.isConnected;
  }

  // ---------- internals ----------

  private async openStream(): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) {
      console.warn('[SSE] No auth token, skipping stream');
      return;
    }

    const baseUrl =
      (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace(
        /\/api$/,
        '',
      );
    const url = `${baseUrl}/api/sse`;

    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          // Pass token via header rather than `?token=` query string to avoid
          // logging it in reverse-proxy access logs and browser history. The
          // backend SSE controller reads `req.headers.authorization`.
          Authorization: `Bearer ${token}`,
        },
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connect failed: HTTP ${response.status}`);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[SSE] Connected');

      // Watchdog — if no data arrives for 60s, assume dead and reconnect.
      const resetWatchdog = () => {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          console.warn('[SSE] No data for 60s, reconnecting');
          this.disconnect();
          this.scheduleReconnect();
        }, 60_000);
      };
      resetWatchdog();

      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!this.intentionalClose) {
        const { done, value } = await reader.read();
        if (done) break;

        resetWatchdog();
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line (\n\n).
        let frameEnd: number;
        while ((frameEnd = buffer.indexOf('\n\n')) !== -1) {
          const rawFrame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);
          this.parseAndDispatch(rawFrame);
        }
      }

      this.isConnected = false;
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    } catch (err: any) {
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('canceled') ||
        err?.message?.includes('fetch failed')
      ) {
        this.isConnected = false;
        return;
      }
      console.warn('[SSE] Stream error:', err?.message || err);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private parseAndDispatch(rawFrame: string): void {
    let eventName: string | null = null;
    const dataLines: string[] = [];

    for (const line of rawFrame.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);

      if (field === 'event') eventName = value;
      else if (field === 'data') dataLines.push(value);
    }

    if (!eventName) return;

    const dataStr = dataLines.join('\n').trim() || '{}';
    let data: any;
    try {
      data = JSON.parse(dataStr);
    } catch {
      data = dataStr;
    }

    const mappedType = this.mapEventType(eventName);
    this.emit(mappedType, {
      type: mappedType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  private mapEventType(name: string): SSEEventType {
    switch (name) {
      case 'notification':
        return 'notification';
      case 'booking_new':
        return 'booking_new';
      case 'ping':
        return 'ping';
      default:
        return 'system';
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || !this.currentUserId) return;
    if (this.reconnectTimer) return;

    this.reconnectAttempts += 1;
    const delay = Math.min(
      INITIAL_BACKOFF_MS * Math.pow(2, this.reconnectAttempts - 1),
      MAX_BACKOFF_MS,
    );
    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openStream().catch(() => {
        /* openStream already schedules next attempt on failure */
      });
    }, delay);
  }

  private emit(type: SSEEventType | 'all', event: SSEEvent): void {
    // Emit to exact-type listeners and 'all' listeners
    const keys: Array<SSEEventType | 'all'> = [type, 'all'];
    keys.forEach(key => {
      const set = this.listeners.get(key);
      if (!set) return;
      set.forEach(cb => {
        try {
          cb(event);
        } catch (err) {
          console.error('[SSE] Listener error:', err);
        }
      });
    });
  }

  // Legacy stubs — kept for backward compatibility with existing imports.
  emitNotification(data: any): void {
    this.emit('notification', {
      type: 'notification',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitBookingUpdate(data: any): void {
    this.emit('booking_update', {
      type: 'booking_update',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitPaymentUpdate(data: any): void {
    this.emit('payment_update', {
      type: 'payment_update',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const sseService = new SSEService();
export default sseService;