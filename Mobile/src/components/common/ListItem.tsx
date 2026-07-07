/**
 * AutoWashPro ListItem
 * Standardized row pattern used across Settings, Profile, Vehicle, Voucher screens.
 * Following UX guidelines: list-pattern, accessibility, consistent spacing, clear tap targets.
 */

import React, { ReactNode } from 'react';
import {
  AccessibilityRole,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, IconName } from './Icon';
import { Text } from './Text';
import { useColors } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { opacity } from '../../theme/tokens';

interface ListItemProps {
  title: string;
  subtitle?: string;
  caption?: string;
  leading?: ReactNode;
  leadingIcon?: IconName | string;
  leadingIconVariant?: 'default' | 'tinted' | 'outline';
  trailing?: ReactNode;
  trailingIcon?: IconName | string;
  trailingText?: string;
  showChevron?: boolean;
  showDivider?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  hapticFeedback?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  caption,
  leading,
  leadingIcon,
  leadingIconVariant = 'tinted',
  trailing,
  trailingIcon,
  trailingText,
  showChevron = false,
  showDivider = true,
  onPress,
  disabled,
  destructive,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = onPress ? 'button' : 'text',
  hapticFeedback = true,
  padding = 'md',
  style,
}) => {
  const colors = useColors();
  const isInteractive = !!onPress && !disabled;

  const verticalPad = padding === 'sm' ? spacing.sm + 2 : padding === 'lg' ? spacing.lg : spacing.md + 2;

  const titleColor = destructive
    ? colors.error
    : colors.textPrimary;

  const handlePress = () => {
    if (disabled || !onPress) return;
    if (hapticFeedback) {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    onPress();
  };

  const renderLeading = () => {
    if (leading) return <View style={styles.leading}>{leading}</View>;
    if (!leadingIcon) return null;
    const iconBg = (() => {
      switch (leadingIconVariant) {
        case 'tinted':
          return destructive ? colors.errorLight : colors.primarySubtle;
        case 'outline':
          return 'transparent';
        default:
          return colors.surfaceDark;
      }
    })();
    const iconColor = destructive ? colors.error : colors.primary;
    const iconBorder = leadingIconVariant === 'outline' ? 1 : 0;
    return (
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: iconBg,
            borderWidth: iconBorder,
            borderColor: colors.border,
          },
        ]}
      >
        <Icon name={leadingIcon} size={20} color={iconColor} />
      </View>
    );
  };

  const renderTrailing = () => {
    if (trailing) return <View style={styles.trailing}>{trailing}</View>;
    if (trailingText) {
      return (
        <View style={styles.trailing}>
          <Text variant="bodySmall" color="textSecondary">
            {trailingText}
          </Text>
          {showChevron && isInteractive && (
            <Icon
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
              style={styles.chevronAfter}
            />
          )}
        </View>
      );
    }
    if (trailingIcon) {
      return (
        <View style={styles.trailing}>
          <Icon name={trailingIcon} size={18} color={colors.textTertiary} />
        </View>
      );
    }
    if (showChevron && isInteractive) {
      return (
        <View style={styles.trailing}>
          <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      );
    }
    return null;
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, selected: false }}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.surfaceDark : 'transparent',
          opacity: disabled ? opacity.disabled : 1,
          paddingVertical: verticalPad,
        },
        style,
      ]}
    >
      {renderLeading()}
      <View style={styles.body}>
        <Text
          variant="body"
          weight={subtitle ? '600' : '500'}
          color={titleColor}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="caption"
            color="textSecondary"
            numberOfLines={2}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        ) : null}
        {caption ? (
          <Text variant="caption" color="textTertiary" style={styles.caption}>
            {caption}
          </Text>
        ) : null}
      </View>
      {renderTrailing()}
      {showDivider && (
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.divider, left: leading || leadingIcon ? 72 : 20 },
          ]}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  leading: {
    marginRight: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  body: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 2,
  },
  caption: {
    marginTop: 2,
  },
  trailing: {
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chevronAfter: {
    marginLeft: 2,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});

export default ListItem;