/**
 * AutoWashPro IconButton
 * Touch-compliant icon-only button (≥44pt hit area).
 * Following UX guidelines: touch-target-size, accessibility, press feedback, safe-area-awareness.
 */

import React from 'react';
import {
  AccessibilityRole,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, IconName } from './Icon';
import { useColors } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { scale, opacity } from '../../theme/tokens';

interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  name: IconName | string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  variant?: 'ghost' | 'tinted' | 'filled' | 'outline';
  shape?: 'circle' | 'square' | 'rounded';
  buttonSize?: 'sm' | 'md' | 'lg';
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  hapticFeedback?: boolean;
  badge?: number;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP = {
  sm: 36,
  md: 44,
  lg: 52,
};

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 22,
  color,
  backgroundColor,
  variant = 'ghost',
  shape = 'circle',
  buttonSize = 'md',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  hapticFeedback = true,
  badge,
  onPress,
  disabled,
  style,
  ...rest
}) => {
  const colors = useColors();
  const dim = SIZE_MAP[buttonSize];

  const variantStyle = (() => {
    switch (variant) {
      case 'filled':
        return {
          bg: color ?? colors.textInverse,
          fg: backgroundColor ?? colors.primary,
        };
      case 'tinted':
        return {
          bg: backgroundColor ?? colors.primarySubtle,
          fg: color ?? colors.primary,
        };
      case 'outline':
        return {
          bg: 'transparent',
          fg: color ?? colors.primary,
          border: true,
        };
      case 'ghost':
      default:
        return {
          bg: 'transparent',
          fg: color ?? colors.textPrimary,
        };
    }
  })();

  const shapeStyle = (() => {
    if (shape === 'circle') return { borderRadius: dim / 2 };
    if (shape === 'square') return { borderRadius: 8 };
    return { borderRadius: 12 };
  })();

  const handlePress = (e: any) => {
    if (disabled) return;
    if (hapticFeedback) {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={accessibilityRole || 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        shapeStyle,
        {
          width: dim,
          height: dim,
          backgroundColor: variantStyle.bg,
          borderWidth: (variantStyle as any).border ? 1 : 0,
          borderColor: (variantStyle as any).border ? colors.border : 'transparent',
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
          transform: [{ scale: pressed ? scale.pressedSmall : scale.released }],
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={variantStyle.fg} />
      {typeof badge === 'number' && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <View style={[styles.badgeDot, { backgroundColor: colors.textInverse }]} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default IconButton;