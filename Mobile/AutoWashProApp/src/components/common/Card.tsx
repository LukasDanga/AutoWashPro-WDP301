/**
 * AutoWashPro Card Component
 * Container for content sections
 */

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing, shadows, ShadowKey } from '../../theme/spacing';

interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated';
  shadow?: ShadowKey;
  padding?: keyof typeof spacing | number;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  shadow = 'md',
  padding = 'md',
  children,
  style,
  ...props
}) => {
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding] || spacing.md;

  return (
    <View
      style={[
        styles.base,
        variant === 'outlined' && styles.outlined,
        variant === 'elevated' && shadows[shadow],
        variant === 'elevated' && styles.elevated,
        { padding: paddingValue },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.background,
  },
});

export default Card;
