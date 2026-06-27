/**
 * AutoWashPro Button Component
 * Supports multiple variants: primary, secondary, outline, ghost
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle[] => {
    const styles: ViewStyle[] = [baseStyles.container];

    // Size styles
    switch (size) {
      case 'small':
        styles.push(baseStyles.containerSmall);
        break;
      case 'large':
        styles.push(baseStyles.containerLarge);
        break;
      default:
        styles.push(baseStyles.containerMedium);
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        styles.push(baseStyles.containerSecondary);
        break;
      case 'outline':
        styles.push(baseStyles.containerOutline);
        break;
      case 'ghost':
        styles.push(baseStyles.containerGhost);
        break;
      default:
        styles.push(baseStyles.containerPrimary);
    }

    // Disabled state
    if (isDisabled) {
      styles.push(baseStyles.containerDisabled);
    }

    // Full width
    if (fullWidth) {
      styles.push(baseStyles.fullWidth);
    }

    return styles;
  };

  const getTextStyle = (): TextStyle[] => {
    const styles: TextStyle[] = [baseStyles.text];

    // Size styles
    switch (size) {
      case 'small':
        styles.push(baseStyles.textSmall);
        break;
      case 'large':
        styles.push(baseStyles.textLarge);
        break;
      default:
        styles.push(baseStyles.textMedium);
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        styles.push(baseStyles.textSecondary);
        break;
      case 'outline':
        styles.push(baseStyles.textOutline);
        break;
      case 'ghost':
        styles.push(baseStyles.textGhost);
        break;
      default:
        styles.push(baseStyles.textPrimary);
    }

    // Disabled state
    if (isDisabled) {
      styles.push(baseStyles.textDisabled);
    }

    return styles;
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textInverse}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </>
  );

  return (
    <TouchableOpacity
      style={[...getContainerStyle(), style as ViewStyle]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  containerSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  containerMedium: {
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  containerLarge: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  containerPrimary: {
    backgroundColor: colors.primary,
  },
  containerSecondary: {
    backgroundColor: colors.primaryDark,
  },
  containerOutline: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  containerGhost: {
    backgroundColor: colors.transparent,
  },
  containerDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...typography.button,
  },
  textSmall: {
    ...typography.buttonSmall,
  },
  textMedium: {
    ...typography.button,
  },
  textLarge: {
    ...typography.button,
    fontSize: 18,
  },
  textPrimary: {
    color: colors.textInverse,
  },
  textSecondary: {
    color: colors.textInverse,
  },
  textOutline: {
    color: colors.primary,
  },
  textGhost: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textTertiary,
  },
});

export default Button;
