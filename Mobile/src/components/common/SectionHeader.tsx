/**
 * AutoWashPro Section Header
 * Standardized section title with optional action button
 * Following UX guidelines: visual-hierarchy, content-priority, semantic spacing
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon, Icons } from './Icon';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  align?: 'left' | 'center';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  style,
  titleStyle,
  align = 'left',
}) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        align === 'center' && styles.alignCenter,
        style,
      ]}
    >
      <View style={styles.titleGroup}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Icon name={icon} size={20} color={colors.primary} />
          </View>
        ) : null}
        <View style={styles.titleTextWrap}>
          <Text
            style={[styles.title, { color: colors.textPrimary }, titleStyle]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {action ? (
        <TouchableOpacity
          onPress={action.onPress}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>{action.label}</Text>
          <Icon name={Icons.forward} size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  alignCenter: {
    justifyContent: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleTextWrap: {
    flex: 1,
  },
  title: {
    ...typography.h4,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 32,
  },
  actionText: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default SectionHeader;