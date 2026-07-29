/**
 * AutoWashPro Badge Component
 * Status badges and labels
 * Following UX guidelines: accessibility, color-not-only (include text/icon)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { Icon, Icons } from './Icon';
import { useTranslation } from 'react-i18next';
import { translateDynamicText } from '../../utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary';
type BadgeSize = 'small' | 'medium';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showIcon?: boolean;
  accessibilityLabel?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
  showIcon = false,
  accessibilityLabel,
}) => {
  const colors = useColors();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'error':
        return { bg: colors.errorLight, text: colors.error };
      case 'info':
        return { bg: colors.infoLight, text: colors.info };
      case 'primary':
        return { bg: colors.primarySubtle, text: colors.primary };
      default:
        return { bg: colors.surface, text: colors.textSecondary };
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;

    const iconColor = getColors().text;
    switch (variant) {
      case 'success':
        return <Icon name={Icons.success} size={12} color={iconColor} />;
      case 'warning':
        return <Icon name={Icons.warning} size={12} color={iconColor} />;
      case 'error':
        return <Icon name={Icons.error} size={12} color={iconColor} />;
      case 'info':
        return <Icon name={Icons.info} size={12} color={iconColor} />;
      default:
        return null;
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.container,
        size === 'small' && styles.containerSmall,
        { backgroundColor: bg },
        style,
      ]}
      accessibilityLabel={accessibilityLabel || `${label} - ${variant} status`}
      accessibilityRole="text"
    >
      {getIcon()}
      <Text
        style={[
          styles.text,
          size === 'small' && styles.textSmall,
          { color: text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// Booking status badge helper
export const BookingStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
      pending: { variant: 'warning', label: 'Chờ xác nhận' },
      confirmed: { variant: 'primary', label: 'Đã xác nhận' },
      checked_in: { variant: 'primary', label: 'Đã check-in' },
      in_progress: { variant: 'primary', label: 'Đang rửa' },
      awaiting_payment: { variant: 'info', label: 'Chờ thanh toán' },
      completed: { variant: 'success', label: 'Hoàn thành' },
      cancelled: { variant: 'error', label: 'Đã hủy' },
    };

    return statusMap[String(status).toLowerCase()] || { variant: 'default', label: status || 'N/A' };
  };

  const { i18n } = useTranslation();
  const config = getStatusConfig();
  const translatedLabel = translateDynamicText(config.label, i18n.language);

  return (
    <Badge
      label={translatedLabel}
      variant={config.variant}
      showIcon
      accessibilityLabel={`Trạng thái đặt lịch: ${translatedLabel}`}
    />
  );
};

// Payment status badge helper
export const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
      unpaid: { variant: 'warning', label: 'Chưa thanh toán' },
      deposit_paid: { variant: 'info', label: 'Đã cọc' },
      paid: { variant: 'success', label: 'Đã thanh toán' },
      refunded: { variant: 'default', label: 'Đã hoàn tiền' },
    };

    return statusMap[String(status).toLowerCase()] || { variant: 'default', label: status || 'N/A' };
  };

  const { i18n } = useTranslation();
  const config = getStatusConfig();
  const translatedLabel = translateDynamicText(config.label, i18n.language);

  return (
    <Badge
      label={translatedLabel}
      variant={config.variant}
      showIcon
      accessibilityLabel={`Trạng thái thanh toán: ${translatedLabel}`}
    />
  );
};

import { getTierTheme } from '../../utils/tierHelper';
import { Ionicons } from '@expo/vector-icons';

// Tier badge helper
export const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
  const theme = getTierTheme(tier);
  const { i18n } = useTranslation();
  const translatedLabel = translateDynamicText(theme.label, i18n.language);

  return (
    <View
      style={[
        styles.container,
        styles.containerSmall,
        { backgroundColor: theme.bgColor, borderColor: theme.borderColor, borderWidth: 1 },
      ]}
      accessibilityLabel={`Hạng thành viên: ${translatedLabel}`}
      accessibilityRole="text"
    >
      <Ionicons name={theme.iconName as any} size={12} color={theme.textColor} />
      <Text style={[styles.textSmall, { color: theme.textColor, fontWeight: '700' }]}>
        {translatedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
    lineHeight: 14,
  },
});

export default Badge;