/**
 * AutoWashPro Category Card
 *
 * Big tappable card for picking a service category on step 1 of the new
 * booking flow. Three options: external (rửa ngoài), internal (dọn nội
 * thất), full (toàn diện). Each card uses a category-specific gradient so
 * users can tell them apart at a glance.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useTheme } from '../../theme/ThemeContext';
import { toGradientColors, getGradients } from '../../theme/gradients';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Icon, Icons } from '../common/Icon';
import { Text } from '../common/Text';
import { PressableScale } from '../common/PressableScale';
import type { PackageCategory } from '../../types';

interface CategoryCardProps {
  category: PackageCategory;
  title: string;
  description: string;
  highlight?: string;
  selected?: boolean;
  onPress?: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  title,
  description,
  highlight,
  selected = false,
  onPress,
}) => {
  const colors = useColors();
  const { isDark } = useTheme();
  const gradients = getGradients(isDark);

  const stops =
    category === 'full'
      ? gradients.success
      : category === 'internal'
      ? gradients.sunset
      : gradients.primary;

  const iconName =
    category === 'internal'
      ? Icons.star
      : category === 'full'
      ? Icons.successOutline
      : Icons.sparkle;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ selected }}
      style={styles.wrap}
    >
      <LinearGradient
        colors={toGradientColors(stops) as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          selected && {
            borderWidth: 3,
            borderColor: colors.textInverse,
          },
        ]}
      >
        {/* Decorative blobs */}
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />

        <View style={styles.iconWrap}>
          <Icon name={iconName} size={26} color={colors.textInverse} />
        </View>
        <View style={styles.content}>
          <Text
            variant="h3"
            weight="700"
            color="textInverse"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            variant="bodySmall"
            color="textInverse"
            style={[styles.desc, { opacity: 0.9 }]}
            numberOfLines={2}
          >
            {description}
          </Text>
          {highlight ? (
            <View style={styles.highlightPill}>
              <Icon name={Icons.flash} size={12} color={colors.textInverse} />
              <Text
                variant="labelSmall"
                color="textInverse"
                weight="600"
                style={styles.highlightText}
              >
                {highlight}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.arrowWrap}>
          <Icon name={Icons.forward} size={20} color={colors.textInverse} />
        </View>
      </LinearGradient>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    minHeight: 96,
    overflow: 'hidden',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blob1: {
    width: 140,
    height: 140,
    top: -50,
    right: -30,
  },
  blob2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  desc: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
    marginTop: 4,
  },
  highlightText: {
    fontSize: 10,
    lineHeight: 14,
  },
  arrowWrap: {
    marginLeft: spacing.sm,
    opacity: 0.85,
  },
});

export default CategoryCard;