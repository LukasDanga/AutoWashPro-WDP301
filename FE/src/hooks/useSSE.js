import { useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function useSSE(token, eventName, onEvent) {
  const savedCallback = useRef(onEvent);
  savedCallback.current = onEvent;

  useEffect(() => {
    if (!eventName) return;

    const base = API_BASE.replace(/\/api$/, '');
    let es;
    let retryTimeout;
    let retries = 0;
    const MAX_RETRIES = 3;

    function connect() {
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '?token=null';
      es = new EventSource(`${base}/api/sse${tokenParam}`);

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
