/**
 * AutoWashPro Input Component
 * Text input with label, error, hint, and icon support
 * Following UX guidelines: accessibility, input-labels, error-placement, password-toggle, touch-target-size
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, layout } from '../../theme/spacing';
import { Icon, Icons } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  inputStyle,
  ...props
}, ref) => {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry !== undefined;

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  const inputId = props.id || props.testID || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[styles.label, { color: colors.textPrimary }]}
          id={`${inputId}-label`}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: getBorderColor(),
          },
          (isFocused || error) && { borderWidth: 2 },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: colors.textPrimary },
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon || isPassword ? styles.inputWithRightIcon : null,
            inputStyle as TextStyle,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !isPasswordVisible}
          accessibilityLabel={label}
          accessibilityHint={hint}
          aria-labelledby={label ? `${inputId}-label` : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={!!error}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            accessibilityRole="button"
          >
            <Icon
              name={isPasswordVisible ? Icons.eyeOffOutline : Icons.eyeOutline}
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessibilityLabel={props.accessibilityLabel}
            accessibilityRole="button"
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text
          style={[styles.error, { color: colors.error }]}
          id={`${inputId}-error`}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}

      {hint && !error && (
        <Text
          style={[styles.hint, { color: colors.textTertiary }]}
          id={`${inputId}-hint`}
        >
          {hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.label,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: layout.inputRadius,
    minHeight: 52,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: 4,
  },
  inputWithRightIcon: {
    paddingRight: 4,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  rightIcon: {
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  error: {
    ...typography.caption,
    marginTop: 4,
  },
  hint: {
    ...typography.caption,
    marginTop: 4,
  },
});

export default Input;