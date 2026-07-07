/**
 * AutoWashPro PressableScale Component
 * Interactive wrapper with scale animation on press
 * Following UX guidelines: scale-feedback (0.95-1.05 on press)
 */

import React from 'react';
import { Pressable, PressableProps, StyleSheet, Animated } from 'react-native';

interface PressableScaleProps extends PressableProps {
  scaleValue?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  scaleValue = 0.97,
  disabled = false,
  children,
  style,
  ...props
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          style as any,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default PressableScale;
