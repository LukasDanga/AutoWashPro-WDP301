/**
 * AutoWashPro Custom Hooks
 * Reusable hooks for animation, motion preferences, network status
 */

import { useEffect, useState, useRef } from 'react';
import { AccessibilityInfo, AppState, AppStateStatus, Dimensions } from 'react-native';

export interface ScreenSize {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
}

/**
 * Get current screen dimensions and react to orientation changes
 * Following UX guideline: orientation-support, viewport-aware design
 */
export function useScreenSize(): ScreenSize {
  const [size, setSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isLandscape: width > height,
      isTablet: Math.min(width, height) >= 600,
    };
  });

  useEffect(() => {
    const onChange = ({ window }: { window: { width: number; height: number } }) => {
      setSize({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
        isTablet: Math.min(window.width, window.height) >= 600,
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  return size;
}

/**
 * Detect whether the user has enabled Reduce Motion / prefers reduced motion
 * Following UX guideline: reduced-motion respect
 * Note: RN doesn't expose prefers-reduced-motion API; we use AccessibilityInfo.isReduceMotionEnabled
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      if (mounted) setReduceMotion(value);
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}

/**
 * Track whether the app is in foreground (used to pause/resume animations)
 * Following UX guideline: animation interruptible, no blocking
 */
export function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub?.remove();
  }, []);

  return appState;
}

/**
 * Returns a value after a delay (ms), updated on `delay` change.
 * Useful for debouncing fade-in animations on mount.
 */
export function useDelayedValue<T>(value: T, delay: number): T {
  const [delayed, setDelayed] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDelayed(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return delayed;
}

/**
 * Debounce a value (delay between changes before the value is actually committed)
 * Following UX guideline: debounce-throttle for high-frequency events
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  return useDelayedValue(value, delay);
}
