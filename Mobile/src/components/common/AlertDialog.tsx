/**
 * AutoWashPro AlertDialog
 * Themed, animated modal dialog that replaces the native Alert.alert.
 *
 * Features:
 *  - 5 semantic variants: info | success | warning | danger | confirm
 *  - Backdrop tap-to-dismiss (configurable)
 *  - Single / dual action buttons with semantic colors
 *  - Scale + fade entrance, smooth exit
 *  - iOS / Android consistent look, respects theme tokens
 *  - Optional icon avatar (circle, variant-tinted)
 *
 * Use the static `AlertDialog` API (matches native Alert.alert signature) or
 * the imperative `useAlertDialog` hook from the provider.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '../../theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { duration, zIndex } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Icon, Icons } from './Icon';
import { Button } from './Button';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

export interface AlertAction {
  text: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message?: string;
  variant?: AlertVariant;
  actions?: AlertAction[];
  cancelable?: boolean;
  iconName?: string;
}

interface ActiveAlert extends Required<Pick<AlertOptions, 'title' | 'variant' | 'cancelable'>> {
  message?: string;
  actions: AlertAction[];
  iconName?: string;
}

interface AlertContextValue {
  show: (options: AlertOptions) => void;
  hide: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

const getVariantConfig = (variant: AlertVariant, colors: any) => {
  switch (variant) {
    case 'success':
      return {
        iconBg: colors.successLight,
        iconColor: colors.success,
        icon: Icons.success,
      };
    case 'warning':
      return {
        iconBg: colors.warningLight,
        iconColor: colors.warning,
        icon: Icons.warning,
      };
    case 'danger':
    case 'confirm':
      return {
        iconBg: colors.errorLight,
        iconColor: colors.error,
        icon: variant === 'confirm' ? Icons.helpOutline : Icons.warning,
      };
    case 'info':
    default:
      return {
        iconBg: colors.primarySubtle,
        iconColor: colors.primary,
        icon: Icons.info,
      };
  }
};

const resolveActionVariant = (
  action: AlertAction,
  totalActions: number,
  cancelIndex: number,
): 'primary' | 'outline' | 'danger' => {
  if (action.variant) {
    if (action.variant === 'secondary') return 'primary';
    if (action.variant === 'ghost') return 'outline';
    return action.variant as 'primary' | 'outline' | 'danger';
  }
  if (action.style === 'cancel') return 'outline';
  if (action.style === 'destructive') return 'danger';
  // Auto-pick: in a 2-action dialog, the last one is "confirm"
  if (totalActions === 2 && cancelIndex !== -1 && cancelIndex !== totalActions - 1) {
    return 'primary';
  }
  return 'primary';
};

interface AlertDialogModalProps {
  alert: ActiveAlert | null;
  onDismiss: (actionIndex?: number) => void;
}

const AlertDialogModal: React.FC<AlertDialogModalProps> = ({ alert, onDismiss }) => {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (alert) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [alert, scaleAnim, opacityAnim, backdropAnim]);

  const close = (actionIndex?: number) => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(actionIndex));
  };

  if (!alert) return null;

  const variant = alert.variant;
  const cfg = getVariantConfig(variant, colors);
  const totalActions = alert.actions.length;
  const cancelIndex = alert.actions.findIndex((a) => a.style === 'cancel');

  return (
    <Modal
      transparent
      visible={!!alert}
      animationType="none"
      onRequestClose={() => alert.cancelable && close()}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.55],
              }),
            },
          ]}
        >
          <Pressable
            style={styles.flex}
            onPress={() => alert.cancelable && close()}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          />
        </Animated.View>

        <View style={styles.center} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.surfaceElevated,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
                borderColor: colors.border,
              },
              shadows.xl,
            ]}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={alert.title}
          >
            <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
              <Icon name={alert.iconName || cfg.icon} size={32} color={cfg.iconColor} />
            </View>

            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {alert.title}
            </Text>

            {alert.message ? (
              <Text
                style={[styles.message, { color: colors.textSecondary }]}
              >
                {alert.message}
              </Text>
            ) : null}

            <View style={styles.actions}>
              {alert.actions.map((action, index) => {
                const isCancel = action.style === 'cancel' || index === cancelIndex;
                const variantStyle = resolveActionVariant(action, totalActions, cancelIndex);
                const isSingle = totalActions === 1;

                return (
                  <View
                    key={`${action.text}-${index}`}
                    style={[
                      styles.actionWrap,
                      isSingle ? styles.actionWrapSingle : styles.actionWrapFlex,
                    ]}
                  >
                    <Button
                      title={action.text}
                      variant={variantStyle}
                      size="medium"
                      fullWidth
                      onPress={() => {
                        if (isCancel || action.style === 'destructive') {
                          try {
                            Haptics.selectionAsync();
                          } catch {}
                        } else {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          } catch {}
                        }
                        close(index);
                        if (action.onPress) {
                          // Defer so close animation starts first
                          setTimeout(() => action.onPress?.(), 50);
                        }
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const AlertDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveAlert | null>(null);
  const resolverRef = useRef<((index: number | undefined) => void) | null>(null);

  const hide = useCallback(() => setActive(null), []);

  const show = useCallback((options: AlertOptions) => {
    // Default actions: OK button only
    const defaultActions: AlertAction[] =
      options.actions && options.actions.length > 0
        ? options.actions
        : [{ text: 'OK', style: 'default' }];

    setActive({
      title: options.title,
      message: options.message,
      variant: options.variant || 'info',
      cancelable: options.cancelable !== false,
      actions: defaultActions,
      iconName: options.iconName,
    });
  }, []);

  const handleDismiss = useCallback((actionIndex?: number) => {
    setActive(null);
    resolverRef.current?.(actionIndex);
    resolverRef.current = null;
  }, []);

  const value = useMemo<AlertContextValue>(() => ({ show, hide }), [show, hide]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertDialogModal alert={active} onDismiss={handleDismiss} />
    </AlertContext.Provider>
  );
};

export function useAlertDialog(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlertDialog must be used within an AlertDialogProvider');
  }
  return ctx;
}

// Static imperative API — drop-in replacement for Alert.alert
let externalShow: ((options: AlertOptions) => void) | null = null;

export function registerAlertBridge(showFn: (options: AlertOptions) => void) {
  externalShow = showFn;
}

export const AlertDialog = {
  show: (options: AlertOptions) => externalShow?.(options),
  info: (title: string, message?: string, onOk?: () => void) =>
    externalShow?.({
      title,
      message,
      variant: 'info',
      actions: [{ text: 'OK', onPress: onOk }],
    }),
  success: (title: string, message?: string, onOk?: () => void) =>
    externalShow?.({
      title,
      message,
      variant: 'success',
      actions: [{ text: 'OK', onPress: onOk }],
    }),
  warning: (title: string, message?: string, onOk?: () => void) =>
    externalShow?.({
      title,
      message,
      variant: 'warning',
      actions: [{ text: 'OK', onPress: onOk }],
    }),
  error: (title: string, message?: string, onOk?: () => void) =>
    externalShow?.({
      title,
      message,
      variant: 'danger',
      actions: [{ text: 'OK', onPress: onOk }],
    }),
  confirm: (
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText: string = 'Xác nhận',
    cancelText: string = 'Hủy',
  ) => {
    externalShow?.({
      title,
      message,
      variant: 'confirm',
      cancelable: true,
      actions: [
        { text: cancelText, style: 'cancel', onPress: onCancel },
        { text: confirmText, style: 'destructive', onPress: onConfirm },
      ],
    });
  },
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: zIndex.modal,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: borderRadius['2xl'],
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
    paddingHorizontal: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  actionWrap: {
    minHeight: 48,
  },
  actionWrapFlex: {
    flex: 1,
  },
  actionWrapSingle: {
    width: '100%',
  },
});

export default AlertDialog;