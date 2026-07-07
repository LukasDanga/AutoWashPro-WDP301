/**
 * AutoWashPro Card Component
 * Container for content sections with polished interactive states
 * Following UX guidelines:
 *   - elevation-consistent shadows
 *   - touch-feedback (scale + opacity on press)
 *   - state-clarity (pressed, focused, disabled)
 *   - border-radius consistent with style
 */

import React from 'react';
import {
  View,
  ViewProps,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { spacing, shadows, ShadowKey } from '../../theme/spacing';
import { duration, scale } from '../../theme/tokens';

interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'flat';
  shadow?: ShadowKey;
  padding?: keyof typeof spacing | number;
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  pressFeedback?: 'opacity' | 'scale' | 'both';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  shadow = 'sm',
  padding = 'md',
  children,
  style,
  onPress,
  onLongPress,
  disabled = false,
  pressFeedback = 'both',
  ...props
}) => {
  const colors = useColors();
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding] || spacing.md;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (pressFeedback === 'opacity' || pressFeedback === 'both') {
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: duration.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
    if (pressFeedback === 'scale' || pressFeedback === 'both') {
      Animated.timing(scaleAnim, {
        toValue: scale.pressedLarge,
        duration: duration.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (pressFeedback === 'opacity' || pressFeedback === 'both') {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    if (pressFeedback === 'scale' || pressFeedback === 'both') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  };

  const cardContent = (
    <Animated.View
      style={[
        {
          backgroundColor: variant === 'flat' ? colors.surface : colors.surfaceElevated,
          borderRadius: 16,
          padding: paddingValue,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: variant === 'outlined' ? colors.border : 'transparent',
          ...(variant === 'elevated' ? shadows[shadow] : {}),
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  // Intentionally minimal — visual styling is applied inline via useColors()
});

export default Card;