/**
 * AutoWashPro Toast / Snackbar
 * Replacing Alert.alert for non-blocking feedback
 * Following UX guidelines: toast-dismiss (3-5s), toast-accessibility (aria-live),
 *   no-blocking-animation, scale-feedback
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
  StyleProp,
  ViewStyle,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Icons } from './Icon';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { duration, zIndex } from '../../theme/tokens';

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

interface ToastConfig {
  id: string;
  message: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface ToastContextValue {
  show: (cfg: Omit<ToastConfig, 'id'>) => string;
  hide: (id: string) => void;
  success: (message: string, description?: string) => string;
  error: (message: string, description?: string) => string;
  warning: (message: string, description?: string) => string;
  info: (message: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastItemProps extends ToastConfig {
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  id,
  message,
  description,
  variant = 'default',
  duration: dur = 4000,
  action,
  onDismiss,
}) => {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacityVal = useRef(new Animated.Value(0)).current;
  const [exiting, setExiting] = useState(false);

  const variantCfg = (() => {
    switch (variant) {
      case 'success':
        return { bg: colors.success, icon: Icons.success, fg: '#FFFFFF' };
      case 'error':
        return { bg: colors.error, icon: Icons.error, fg: '#FFFFFF' };
      case 'warning':
        return { bg: colors.warning, icon: Icons.warning, fg: '#FFFFFF' };
      case 'info':
        return { bg: colors.info, icon: Icons.info, fg: '#FFFFFF' };
      case 'default':
      default:
        return { bg: colors.textPrimary, icon: Icons.info, fg: colors.textInverse };
    }
  })();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityVal, {
        toValue: 1,
        duration: duration.normal,
        useNativeDriver: true,
      }),
    ]).start();

    AccessibilityInfo.announceForAccessibility?.(`${variant}: ${message}`);

    const timer = setTimeout(() => {
      setExiting(true);
    }, dur);

    return () => clearTimeout(timer);
  }, [translateY, opacityVal, dur, variant, message]);

  useEffect(() => {
    if (!exiting) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityVal, {
        toValue: 0,
        duration: duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  }, [exiting, translateY, opacityVal, id, onDismiss]);

  const dismiss = () => setExiting(true);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: variantCfg.bg,
          transform: [{ translateY }],
          opacity: opacityVal,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={description ? `${message}. ${description}` : message}
    >
      <Icon name={variantCfg.icon} size={22} color={variantCfg.fg} />
      <View style={styles.content}>
        <Text style={[styles.message, { color: variantCfg.fg }]} numberOfLines={2}>
          {message}
        </Text>
        {description ? (
          <Text
            style={[styles.description, { color: variantCfg.fg, opacity: 0.85 }]}
            numberOfLines={3}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {action ? (
        <TouchableOpacity
          onPress={() => {
            action.onPress();
            dismiss();
          }}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[styles.actionText, { color: variantCfg.fg }]}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={dismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Đóng thông báo"
      >
        <Icon name={Icons.close} size={18} color={variantCfg.fg} />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ToastProviderProps {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  containerStyle,
}) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const counterRef = useRef(0);

  const hide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((cfg: Omit<ToastConfig, 'id'>) => {
    counterRef.current += 1;
    const id = `toast-${Date.now()}-${counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { ...cfg, id }];
      return next.length > 3 ? next.slice(-3) : next;
    });
    return id;
  }, []);

  const value: ToastContextValue = {
    show,
    hide,
    success: (message, description) => show({ message, description, variant: 'success' }),
    error: (message, description) => show({ message, description, variant: 'error' }),
    warning: (message, description) => show({ message, description, variant: 'warning' }),
    info: (message, description) => show({ message, description, variant: 'info' }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView
        pointerEvents="box-none"
        style={[styles.container, containerStyle]}
        edges={['bottom']}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={hide} />
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

let externalShow: ((cfg: Omit<ToastConfig, 'id'>) => string) | null = null;

export function registerToastBridge(showFn: (cfg: Omit<ToastConfig, 'id'>) => string) {
  externalShow = showFn;
}

export const Toast = {
  show: (cfg: Omit<ToastConfig, 'id'>) => externalShow?.(cfg) ?? '',
  success: (m: string, d?: string) =>
    externalShow?.({ message: m, description: d, variant: 'success' }) ?? '',
  error: (m: string, d?: string) =>
    externalShow?.({ message: m, description: d, variant: 'error' }) ?? '',
  warning: (m: string, d?: string) =>
    externalShow?.({ message: m, description: d, variant: 'warning' }) ?? '',
  info: (m: string, d?: string) =>
    externalShow?.({ message: m, description: d, variant: 'info' }) ?? '',
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Render at the bottom so we never overlap the top app bar / header
    // (avatar + greeting + screen title) of any tab. The previous top
    // position pushed the toast over "Chào buổi tối, Đồng!" on the home
    // tab, which read like a glitch.
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.toast,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  content: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  message: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  description: {
    ...typography.caption,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 32,
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Toast;