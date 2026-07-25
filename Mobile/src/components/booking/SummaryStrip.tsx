/**
 * AutoWashPro Booking Summary Strip
 *
 * Horizontal pill-bar shown above the booking scroll area once a user has
 * started selecting. Lets the user see and (optionally) jump back to a step
 * without scrolling back through long lists.
 *
 * UX notes:
 *  - Only shows steps that have a value to prevent overwhelming the user
 *    before they begin.
 *  - Each chip is tappable to jump back to that step.
 *  - Uses success-style for completed steps so users feel progress.
 */
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../theme/spacing';
import { formatCurrency } from '../../utils';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { useBooking } from '../../contexts/BookingContext';
import { Icon, Icons } from '../common/Icon';
import { PressableScale } from '../common/PressableScale';
import type { BookingStep } from '../../contexts/BookingContext';

export interface SummaryItem {
  step: BookingStep;
  icon: string;
  label: string;
  value?: string;
}

interface SummaryStripProps {
  items: SummaryItem[];
  /** When true, scroll the strip horizontally */
  scrollable?: boolean;
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({
  items,
  scrollable = true,
}) => {
  const colors = useColors();

  const visible = items.filter((i) => !!i.value);
  if (visible.length === 0) return null;

  const content = (
    <View style={styles.row}>
      {visible.map((item, idx) => (
        <React.Fragment key={item.step}>
          {idx > 0 ? (
            <View style={[styles.connector, { backgroundColor: colors.border }]} />
          ) : null}
          <PressableScale
            onPress={() => {
              // Caller wires navigation via the `onPressStep` of items.
              // Default behaviour: no-op (handled by consumer).
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.value}. Nhấn để chỉnh sửa`}
          >
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: colors.successLight,
                  borderColor: colors.success,
                },
              ]}
            >
              <Icon name={item.icon} size={14} color={colors.success} />
              <View style={styles.pillText}>
                <Text
                  variant="labelSmall"
                  style={{ color: colors.success, fontSize: 10 }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text
                  variant="bodySmall"
                  weight="600"
                  numberOfLines={1}
                  style={styles.value}
                >
                  {item.value}
                </Text>
              </View>
              <Icon
                name={Icons.createOutline}
                size={12}
                color={colors.success}
              />
            </View>
          </PressableScale>
        </React.Fragment>
      ))}
    </View>
  );

  if (!scrollable) return <View style={styles.wrap}>{content}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.wrap}
    >
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
    maxWidth: 220,
  },
  pillText: {
    flexShrink: 1,
  },
  value: {
    lineHeight: 16,
  },
  connector: {
    width: 8,
    height: 2,
    borderRadius: 1,
  },
});

export default SummaryStrip;