/**
 * AutoWashPro Empty State Component
 * Display when no data available
 * Following UX guidelines: empty-states, accessibility, helpful messaging + action
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import Button from './Button';
import { Icon, Icons } from './Icon';

interface EmptyStateProps {
  icon?: React.ReactNode;
  iconName?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconName,
  title,
  message,
  actionLabel,
  onAction,
  style,
  variant = 'default',
}) => {
  const colors = useColors();
  const compact = variant === 'compact';

  return (
    <View
      style={[styles.container, compact && styles.compact, style]}
      accessibilityRole="text"
      accessibilityLabel={`Không có dữ liệu: ${title}. ${message || ''}`}
    >
      {(icon || iconName) && (
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          {icon || (
            <Icon
              name={iconName || Icons.info}
              size={compact ? 48 : 56}
              color={colors.textTertiary}
            />
          )}
        </View>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  compact: {
    flex: 0,
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 12,
    minWidth: 160,
  },
});

export default EmptyState;