/**
 * AutoWashPro Button Component
 * Supports: primary, secondary, outline, ghost, gradient, danger, icon-only variants
 * Following UX guidelines:
 *   - scale-feedback (0.95-1.05 on press)
 *   - loading-buttons (disables + spinner)
 *   - touch-target-size >= 44pt iOS / 48dp Android
 *   - haptic-feedback (impactAsync + selectionAsync)
 *   - tap-feedback-speed (<100ms)
 *   - interruptible, accessibility
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
  PressableProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, layout } from '../../theme/spacing';
import { duration, scale } from '../../theme/tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'gradient'
  | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';
type IconPosition = 'left' | 'right';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: IconPosition;
  iconOnly?: boolean;
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'selection';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  fullWidth = false,
  hapticFeedback = true,
  hapticStyle = 'light',
  disabled,
  style,
  textStyle,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...props
}) => {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Helper function to safely start scale animation
  const animateScale = useCallback((toValue: number, animDuration: number, easing: any = Easing.out(Easing.quad)) => {
    // Stop any in-flight animation to prevent conflicts
    if (animationRef.current) {
      animationRef.current.stop();
    }
    animationRef.current = Animated.timing(scaleAnim, {
      toValue,
      duration: animDuration,
      easing,
      useNativeDriver: true,
    });
    animationRef.current.start(({ finished }) => {
      if (finished) animationRef.current = null;
    });
  }, [scaleAnim]);

  // Reset animation when transitioning to disabled/loading state
  useEffect(() => {
    if (isDisabled) {
      animateScale(1, duration.fast);
    }
  }, [isDisabled, animateScale]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, []);

  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || isDisabled) return;
    try {
      switch (hapticStyle) {
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'light':
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    } catch {
      // haptics not available on this platform
    }
  }, [hapticFeedback, hapticStyle, isDisabled]);

  const handlePressIn = (e: any) => {
    if (!isDisabled) {
      animateScale(scale.pressedLarge, duration.fast);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    animateScale(1, duration.normal, Easing.out(Easing.cubic));
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    triggerHaptic();
    onPress?.(e);
  };

  const sizeContainer =
    size === 'small'
      ? styles.containerSmall
      : size === 'large'
      ? styles.containerLarge
      : styles.containerMedium;

  const sizeText =
    size === 'small'
      ? styles.textSmall
      : size === 'large'
      ? styles.textLarge
      : styles.textMedium;

  const variantStyles = (() => {
    switch (variant) {
      case 'secondary':
        return { container: { backgroundColor: colors.primaryDark }, text: { color: colors.textInverse } };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
          text: { color: colors.primary },
        };
      case 'ghost':
        return { container: { backgroundColor: 'transparent' }, text: { color: colors.primary } };
      case 'gradient':
        return { container: { backgroundColor: colors.primary }, text: { color: colors.textInverse } };
      case 'danger':
        return { container: { backgroundColor: colors.error }, text: { color: colors.textInverse } };
      case 'primary':
      default:
        return { container: { backgroundColor: colors.primary }, text: { color: colors.textInverse } };
    }
  })();

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const {
    flex,
    flexGrow,
    flexShrink,
    flexBasis,
    alignSelf,
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    position,
    top,
    bottom,
    left,
    right,
    zIndex,
    ...innerStyle
  } = flattenedStyle;

  const wrapperStyle: ViewStyle = {
    transform: [{ scale: scaleAnim }],
    width: fullWidth ? '100%' : width,
    flex,
    flexGrow,
    flexShrink,
    flexBasis,
    alignSelf,
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    position,
    top,
    bottom,
    left,
    right,
    zIndex,
  };

  const containerStyles: (ViewStyle | false)[] = [
    styles.container as ViewStyle,
    sizeContainer as ViewStyle,
    variantStyles.container as ViewStyle,
    iconOnly ? (styles.containerIconOnly as ViewStyle) : false,
    (fullWidth || flex !== undefined || width !== undefined) ? (styles.fullWidth as ViewStyle) : false,
    isDisabled ? (styles.containerDisabled as ViewStyle) : false,
    innerStyle as ViewStyle,
  ];

  const disabledTextColor = (() => {
    if (!isDisabled) return false;
    if (variant === 'outline' || variant === 'ghost') {
      return { color: colors.textTertiary };
    }
    return { color: colors.textInverse || '#FFFFFF' };
  })();

  const textStyles: (TextStyle | false)[] = [
    styles.text as TextStyle,
    sizeText as TextStyle,
    variantStyles.text as TextStyle,
    disabledTextColor as TextStyle,
    textStyle as TextStyle,
  ];

  const loaderColor = (() => {
    if (variant === 'outline' || variant === 'ghost') return colors.primary;
    return colors.textInverse;
  })();

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={loaderColor}
          size="small"
        />
      );
    }

    if (iconOnly) {
      return icon ? <View style={styles.iconWrapper}>{icon}</View> : null;
    }

    return (
      <>
        {icon && iconPosition === 'left' ? (
          <View style={styles.iconWrapper}>{icon}</View>
        ) : null}
        <Text style={textStyles} numberOfLines={1}>
          {title}
        </Text>
        {icon && iconPosition === 'right' ? (
          <View style={styles.iconWrapperRight}>{icon}</View>
        ) : null}
      </>
    );
  };

  return (
    <Animated.View style={wrapperStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        testID={props.testID}
        style={{
          width: (fullWidth || flex !== undefined || width !== undefined) ? '100%' : undefined,
          flex: flex !== undefined ? 1 : undefined,
        }}
        {...props}
      >
        <View style={containerStyles}>
          {(variant === 'primary' || variant === 'gradient') && (
            <>
              <LinearGradient
                colors={['#10B981', '#059669']} // FE override accent to accent-2
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.ctaBlob} />
            </>
          )}
          {renderContent()}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.buttonRadius,
    gap: 6,
    overflow: 'hidden',
  },
  containerSmall: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  containerMedium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  containerLarge: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 56,
  },
  containerIconOnly: {
    paddingHorizontal: 8,
    width: 48,
    minWidth: 48,
  },
  containerDisabled: {
    opacity: 0.65,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...typography.button,
    textAlign: 'center',
    includeFontPadding: false,
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
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -60,
    right: -40,
  },
});

export default Button;