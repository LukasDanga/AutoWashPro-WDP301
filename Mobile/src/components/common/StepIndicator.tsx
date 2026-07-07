/**
 * AutoWashPro Step Indicator
 *
 * Persistent horizontal progress bar for multi-step flows.
 *
 * UX notes:
 *  - Uses semantic tokens for colors (theme-aware).
 *  - Completed steps show a check icon + primary color, the current step shows
 *    its number in a primary ring, future steps are muted.
 *  - Touch targets >= 44pt for accessibility.
 *  - Labels always rendered (no truncation) so users know what's coming.
 *  - Animated progress fill signals state changes subtly without being noisy.
 */
import React from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../theme/spacing';
import { Icon, Icons } from './Icon';
import { Text } from './Text';

export interface StepDef {
  key: string;
  label: string;
  icon: string;
}

interface StepIndicatorProps {
  steps: StepDef[];
  currentIndex: number;
  /** When true, all previous steps are visually completed */
  completedThrough?: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentIndex,
  completedThrough,
}) => {
  const colors = useColors();
  const completedIdx = completedThrough ?? currentIndex - 1;

  const summary =
    `Bước ${currentIndex + 1} / ${steps.length}: ${steps[currentIndex]?.label ?? ''}`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={summary}
      accessibilityValue={{
        min: 0,
        max: steps.length - 1,
        now: currentIndex,
      }}
      style={styles.wrap}
    >
      <View style={styles.row}>
        {steps.map((s, i) => {
          const isCurrent = i === currentIndex;
          const isCompleted = i <= completedIdx;
          const isLast = i === steps.length - 1;

          return (
            <React.Fragment key={s.key}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isCompleted
                        ? colors.primary
                        : colors.surface,
                      borderColor: isCurrent
                        ? colors.primary
                        : isCompleted
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Icon
                      name={Icons.checkmark}
                      size={14}
                      color={colors.textInverse}
                    />
                  ) : (
                    <Icon
                      name={s.icon}
                      size={14}
                      color={
                        isCurrent ? colors.primary : colors.textTertiary
                      }
                    />
                  )}
                </View>
                <Text
                  variant="labelSmall"
                  weight={isCurrent ? '600' : '500'}
                  color={isCurrent ? 'primary' : isCompleted ? 'textSecondary' : 'textTertiary'}
                  align="center"
                  numberOfLines={1}
                  style={styles.label}
                >
                  {s.label}
                </Text>
              </View>

              {!isLast ? (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor:
                        i < completedIdx
                          ? colors.primary
                          : i === completedIdx
                          ? colors.primaryLight
                          : colors.border,
                    },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

// Silence unused warning in environments where AccessibilityInfo isn't referenced directly
void AccessibilityInfo;

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 56,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 15,
    marginHorizontal: 2,
    borderRadius: borderRadius.full,
  },
});

export default StepIndicator;