/**
 * AutoWashPro Search Bar Component
 * Animated focus state, leading icon, optional clear & trailing action
 * Following UX guidelines: tap-feedback-speed, focus-states, debounce,
 *   accessibility, semantic input types
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { duration } from '../../theme/tokens';
import { Icon, Icons } from './Icon';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  trailing?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
  variant?: 'default' | 'floating';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  placeholder = 'Tìm kiếm...',
  trailing,
  style,
  inputStyle,
  containerStyle,
  variant = 'default',
  ...rest
}) => {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: duration.normal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const borderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.08],
  });

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <Animated.View
      style={[
        {
          backgroundColor: variant === 'floating' ? colors.surfaceElevated : colors.surface,
          borderRadius: 12,
          borderColor,
          borderWidth,
          shadowOpacity,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
            },
            android: { elevation: 1 },
            default: {},
          }),
        },
        styles.container,
        containerStyle,
        style,
      ]}
    >
      <Icon
        name={Icons.search}
        size={20}
        color={isFocused ? colors.primary : colors.textTertiary}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.textPrimary }, inputStyle]}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        returnKeyType="search"
        clearButtonMode="never"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Ô tìm kiếm"
        accessibilityHint="Nhập từ khóa để tìm kiếm"
        {...rest}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Xóa nội dung tìm kiếm"
        >
          <View style={[styles.clearInner, { backgroundColor: colors.surfaceDark }]}>
            <Icon name={Icons.close} size={14} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      ) : null}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  clearButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailing: {
    marginLeft: 8,
  },
});

export default SearchBar;