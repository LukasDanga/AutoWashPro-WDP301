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
  Platform,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { spacing, shadows, ShadowKey, layout } from '../../theme/spacing';
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
  accentBlob?: boolean;
  blobColor?: string;
  blobStyle?: any;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  shadow = 'md',
  padding = 'md',
  children,
  style,
  onPress,
  onLongPress,
  disabled = false,
  pressFeedback = 'both',
  accentBlob = false,
  blobColor,
  blobStyle,
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

  const isElevated = variant === 'elevated' || variant === 'default';

  const cardContent = (
    <Animated.View
      style={[
        {
          backgroundColor: variant === 'flat' ? colors.surface : colors.surfaceElevated,
          borderRadius: layout.cardRadius,
          padding: paddingValue,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
          borderWidth: variant === 'outlined' ? 1 : (isElevated ? 1 : 0),
          borderColor: variant === 'outlined' ? colors.border : (isElevated ? 'rgba(0,0,0,0.04)' : 'transparent'),
          overflow: 'hidden',
          ...(isElevated ? shadows[shadow] : {}),
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
      {...props}
    >
      {accentBlob && (
        <View
          style={[
            styles.cardBlob,
            { backgroundColor: blobColor || `${colors.primary}14` },
            blobStyle,
          ]}
        />
      )}
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
  cardBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -30,
    zIndex: -1,
  },
});

export default Card;