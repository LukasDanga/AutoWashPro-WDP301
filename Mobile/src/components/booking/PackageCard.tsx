/**
 * AutoWashPro Package Card
 *
 * Selectable card for a service package. Shows the gradient hero, name,
 * duration, price, and an availability hint for the currently selected
 * branch. Designed to feel tactile and clearly communicate selection.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useTheme } from '../../../theme/ThemeContext';
import { toGradientColors, getGradients } from '../../../theme/gradients';
import { spacing, borderRadius } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Icon, Icons } from '../common/Icon';
import { Text } from '../common/Text';
import { PressableScale } from '../common/PressableScale';
import { Chip } from '../common/Chip';
import { Card } from '../common/Card';
import { formatCurrency } from '../../../utils';
import type { Package, PackageCategory } from '../../../types';

interface PackageCardProps {
  pkg: Package;
  selected?: boolean;
  onPress?: () => void;
  /** Optional right-side hint (e.g. "Có ở 3 chi nhánh") */
  metaHint?: string;
  metaHintTone?: 'positive' | 'neutral' | 'muted';
  style?: ViewStyle;
}

const CATEGORY_META: Record<PackageCategory, { label: string }> = {
  external: { label: 'Rửa ngoài' },
  internal: { label: 'Dọn nội thất' },
  full: { label: 'Toàn diện' },
};

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  selected = false,
  onPress,
  metaHint,
  metaHintTone = 'neutral',
  style,
}) => {
  const colors = useColors();
  const { isDark } = useTheme();
  const gradients = getGradients(isDark);
  const categoryMeta = CATEGORY_META[pkg.category] || CATEGORY_META.full;

  const hintColor =
    metaHintTone === 'positive'
      ? colors.success
      : metaHintTone === 'muted'
      ? colors.textTertiary
      : colors.info;

  const gradientStops =
    pkg.category === 'full'
      ? gradients.success
      : pkg.category === 'internal'
      ? gradients.sunset
      : gradients.primary;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${pkg.name}, ${formatCurrency(pkg.price)}`}
      accessibilityState={{ selected }}
      style={style}
    >
      <Card
        padding={0}
        variant={selected ? 'elevated' : 'default'}
        shadow={selected ? 'md' : 'sm'}
        pressFeedback="both"
      >
        <View
          style={[
            styles.row,
            selected && { borderWidth: 2, borderColor: colors.primary },
            !selected && { borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {/* Gradient hero with category icon */}
          <LinearGradient
            colors={toGradientColors(gradientStops)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Icon
              name={pkg.category === 'internal' ? Icons.star : Icons.sparkle}
              size={22}
              color="rgba(255,255,255,0.95)"
            />
          </LinearGradient>

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text
                variant="body"
                weight="600"
                numberOfLines={1}
                style={styles.title}
              >
                {pkg.name}
              </Text>
              {selected ? (
                <View
                  style={[
                    styles.selectedPill,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon
                    name={Icons.checkmark}
                    size={12}
                    color={colors.textInverse}
                  />
                  <Text
                    variant="labelSmall"
                    color="textInverse"
                    weight="600"
                    style={styles.selectedPillText}
                  >
                    Đã chọn
                  </Text>
                </View>
              ) : null}
            </View>

            {pkg.description ? (
              <Text
                variant="caption"
                color="textSecondary"
                numberOfLines={2}
                style={styles.desc}
              >
                {pkg.description}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <Chip
                label={categoryMeta.label}
                size="small"
                variant="default"
              />
              <View style={styles.dotSep} />
              <Icon
                name={Icons.timeOutline}
                size={12}
                color={colors.textTertiary}
              />
              <Text variant="caption" color="textTertiary">
                {pkg.duration} phút
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text
                style={[styles.price, typography.price]}
                numberOfLines={1}
              >
                {formatCurrency(pkg.price)}
              </Text>
              {metaHint ? (
                <Text
                  variant="labelSmall"
                  numberOfLines={1}
                  style={{ color: hintColor }}
                >
                  {metaHint}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    minHeight: 112,
  },
  hero: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  desc: {
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  price: {
    color: '#2563EB',
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  selectedPillText: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default PackageCard;