import { useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function useSSE(token, eventName, onEvent) {
  const savedCallback = useRef(onEvent);
  savedCallback.current = onEvent;

  useEffect(() => {
    if (!token || !eventName) return;

    const base = API_BASE.replace(/\/api$/, '');
    let es;
    let retryTimeout;
    let retries = 0;
    const MAX_RETRIES = 3;

    function connect() {
      es = new EventSource(`${base}/api/sse?token=${encodeURIComponent(token)}`);

      es.addEventListener(eventName, () => {
        savedCallback.current?.();
        retries = 0;
      });

      es.onerror = () => {
        es?.close();
        retries++;
        if (retries < MAX_RETRIES) {
          retryTimeout = setTimeout(connect, 5000 * retries);
        }
      };
    }

    connect();
    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [token, eventName]);
}
