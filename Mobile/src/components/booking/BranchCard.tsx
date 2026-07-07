/**
 * AutoWashPro Branch Card
 *
 * Selectable card for a branch. Surfaces the most decision-relevant signals:
 * name, address, opening hours, distance (optional), and a right-side badge
 * when the branch offers the currently-selected package.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../../theme/ThemeContext';
import { spacing, borderRadius } from '../../../theme/spacing';
import { Icon, Icons } from '../common/Icon';
import { Text } from '../common/Text';
import { PressableScale } from '../common/PressableScale';
import { Card } from '../common/Card';
import type { Branch } from '../../../types';

interface BranchCardProps {
  branch: Branch;
  selected?: boolean;
  onPress?: () => void;
  /** Show "Phù hợp" pill when this branch offers the selected package */
  matchPill?: boolean;
  /** Optional sub-line (e.g. distance, package count) */
  subline?: string;
  style?: ViewStyle;
}

export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  selected = false,
  onPress,
  matchPill = false,
  subline,
  style,
}) => {
  const colors = useColors();

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${branch.name}, ${branch.address}`}
      accessibilityState={{ selected }}
      style={style}
    >
      <Card
        padding="md"
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
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: selected ? colors.primary : colors.primarySubtle,
              },
            ]}
          >
            <Icon
              name={Icons.locationOutline}
              size={22}
              color={selected ? colors.textInverse : colors.primary}
            />
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text
                variant="body"
                weight="600"
                numberOfLines={1}
                style={styles.title}
              >
                {branch.name}
              </Text>
              {matchPill ? (
                <View
                  style={[
                    styles.matchPill,
                    { backgroundColor: colors.successLight },
                  ]}
                >
                  <Icon
                    name={Icons.checkmark}
                    size={11}
                    color={colors.success}
                  />
                  <Text
                    variant="labelSmall"
                    style={{ color: colors.success, fontSize: 10 }}
                  >
                    Phù hợp
                  </Text>
                </View>
              ) : null}
              {selected ? (
                <View
                  style={[
                    styles.selectedPill,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon
                    name={Icons.checkmark}
                    size={11}
                    color={colors.textInverse}
                  />
                </View>
              ) : null}
            </View>

            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={2}
              style={styles.address}
            >
              {branch.address}
            </Text>

            <View style={styles.metaRow}>
              <Icon
                name={Icons.timeOutline}
                size={12}
                color={colors.textTertiary}
              />
              <Text variant="caption" color="textTertiary">
                {branch.openingTime} - {branch.closingTime}
              </Text>
              {subline ? (
                <>
                  <View style={styles.dotSep} />
                  <Text variant="caption" color="textTertiary" numberOfLines={1}>
                    {subline}
                  </Text>
                </>
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
    alignItems: 'flex-start',
    borderRadius: borderRadius.lg,
    minHeight: 80,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  address: {
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
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  selectedPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BranchCard;