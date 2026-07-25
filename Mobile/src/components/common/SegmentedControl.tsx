/**
 * AutoWashPro SegmentedControl
 * Tab-like filter for in-page filtering (history, payment, voucher tabs).
 * Following UX guidelines: visible focus, accessible, consistent.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { useColors } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../theme/spacing';
import { opacity } from '../../theme/tokens';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  scrollable = false,
  fullWidth = false,
  style,
}: SegmentedControlProps<T>) {
  const colors = useColors();

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        horizontal: true,
        showsHorizontalScrollIndicator: false,
        contentContainerStyle: styles.scrollContent,
        style,
      }
    : { style: [styles.row, { backgroundColor: colors.surfaceDark }, fullWidth && styles.fullWidth, style] };

  return (
    <Container {...(containerProps as any)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        const handlePress = () => {
          if (opt.disabled || selected) return;
          try {
            Haptics.selectionAsync();
          } catch {}
          onChange(opt.value);
        };
        return (
          <Pressable
            key={opt.value}
            onPress={handlePress}
            disabled={opt.disabled}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected, disabled: !!opt.disabled }}
            hitSlop={4}
            style={({ pressed }) => [
              styles.segment,
              fullWidth && styles.segmentFlex,
              {
                backgroundColor: selected ? colors.primary : 'transparent',
                borderColor: selected ? 'transparent' : 'transparent',
                opacity: opt.disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
              },
              selected && styles.segmentActive,
            ]}
          >
            <Text
              variant="label"
              weight={selected ? '600' : '500'}
              color={selected ? 'textInverse' : 'textSecondary'}
            >
              {opt.label}
            </Text>
            {typeof opt.count === 'number' && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: selected
                      ? colors.background
                      : colors.surfaceDark,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  weight="600"
                  color={selected ? 'primary' : 'textSecondary'}
                >
                  {opt.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    padding: 4,
    borderRadius: borderRadius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md + 2,
    gap: 6,
    minHeight: 40,
  },
  segmentFlex: {
    flex: 1,
  },
  countBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default SegmentedControl;