/**
 * AutoWashPro Stat Card Component
 * Reusable metric card with icon, trend indicator
 * Following UX guidelines: visual-hierarchy, color-not-only (icon + label + value),
 *   elevation-consistent, semantic spacing
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, shadows } from '../../theme/spacing';
import { Icon } from './Icon';

type StatVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  variant?: StatVariant;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
  };
  style?: ViewStyle;
  compact?: boolean;
}

const trendIcons = {
  up: 'trending-up',
  down: 'trending-down',
  flat: 'remove',
} as const;

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  variant = 'primary',
  trend,
  style,
  compact = false,
}) => {
  const colors = useColors();

  const getVariant = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primarySubtle, text: colors.primary, iconColor: colors.primary };
      case 'success':
        return { bg: colors.successLight, text: colors.success, iconColor: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning, iconColor: colors.warning };
      case 'error':
        return { bg: colors.errorLight, text: colors.error, iconColor: colors.error };
      case 'info':
        return { bg: colors.infoLight, text: colors.info, iconColor: colors.info };
      case 'neutral':
      default:
        return { bg: colors.surface, text: colors.textPrimary, iconColor: colors.textSecondary };
    }
  };

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.error;
      default:
        return colors.textTertiary;
    }
  };

  const c = getVariant();

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.surfaceElevated },
        shadows.sm,
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${trend ? `, ${trend.value} ${trend.direction}` : ''}`}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
          <Icon name={icon} size={compact ? 16 : 18} color={c.iconColor} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>
          {value}
        </Text>
        {trend ? (
          <View style={styles.trendRow}>
            <Icon
              name={trendIcons[trend.direction]}
              size={12}
              color={getTrendColor()}
            />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trend.value}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
  },
  cardCompact: {
    padding: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  body: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatCard;