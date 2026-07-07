/**
 * AutoWashPro Loading Component
 * Loading spinner and overlay with dark-mode support
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Text,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color,
  message,
  fullScreen = false,
}) => {
  const colors = useColors();
  const spinnerColor = color ?? colors.primary;

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <ActivityIndicator size={size} color={spinnerColor} />
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
};

// Modal loading overlay
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Đang xử lý...',
}) => {
  const colors = useColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.overlayContent, { backgroundColor: colors.surfaceElevated }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.overlayText, { color: colors.textSecondary }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

// Button loading state
interface ButtonLoadingProps {
  loading?: boolean;
  children: React.ReactNode;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
}) => {
  const colors = useColors();
  if (loading) {
    return (
      <View style={styles.buttonLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  message: {
    ...typography.body,
    marginTop: 16,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 150,
  },
  overlayText: {
    ...typography.body,
    marginTop: 16,
  },
  buttonLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Loading;