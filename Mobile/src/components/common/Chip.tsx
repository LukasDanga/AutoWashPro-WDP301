/**
 * AutoWashPro Chip Component
 * Pill-shaped tag/filter with optional icon
 * Following UX guidelines: touch-target-size, color-not-only, scale-feedback
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type ChipSize = 'small' | 'medium';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: string;
  selected?: boolean;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  icon,
  selected = false,
  style,
}) => {
  const colors = useColors();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primarySubtle, text: colors.primary, selBg: colors.primary, selText: colors.textInverse };
      case 'success':
        return { bg: colors.successLight, text: colors.success, selBg: colors.success, selText: colors.textInverse };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning, selBg: colors.warning, selText: colors.textInverse };
      case 'error':
        return { bg: colors.errorLight, text: colors.error, selBg: colors.error, selText: colors.textInverse };
      case 'info':
        return { bg: colors.infoLight, text: colors.info, selBg: colors.info, selText: colors.textInverse };
      case 'default':
      default:
        return { bg: colors.surface, text: colors.textSecondary, selBg: colors.primary, selText: colors.textInverse };
    }
  };

  const c = getColors();
  const bg = selected ? c.selBg : c.bg;
  const fg = selected ? c.selText : c.text;

  return (
    <View
      style={[
        styles.container,
        size === 'small' && styles.containerSmall,
        { backgroundColor: bg },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={selected ? `${label}, đã chọn` : label}
    >
      {icon ? (
        <Icon
          name={icon}
          size={size === 'small' ? 12 : 14}
          color={fg}
        />
      ) : null}
      <Text
        style={[
          size === 'small' ? styles.textSmall : styles.text,
          { color: fg },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 32,
  },
  containerSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});

export default Chip;