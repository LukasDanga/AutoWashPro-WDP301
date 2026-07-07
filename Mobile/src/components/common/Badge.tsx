/**
 * AutoWashPro Badge Component
 * Status badges and labels
 * Following UX guidelines: accessibility, color-not-only (include text/icon)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon, Icons } from './Icon';

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
      confirmed: { variant: 'info', label: 'Đã xác nhận' },
      checked_in: { variant: 'primary', label: 'Đã check-in' },
      in_progress: { variant: 'info', label: 'Đang rửa' },
      completed: { variant: 'success', label: 'Hoàn thành' },
      cancelled: { variant: 'error', label: 'Đã hủy' },
    };

    return statusMap[status.toLowerCase()] || { variant: 'default', label: status };
  };

  const config = getStatusConfig();
  return (
    <Badge
      label={config.label}
      variant={config.variant}
      showIcon
      accessibilityLabel={`Trạng thái đặt lịch: ${config.label}`}
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

    return statusMap[status.toLowerCase()] || { variant: 'default', label: status };
  };

  const config = getStatusConfig();
  return (
    <Badge
      label={config.label}
      variant={config.variant}
      showIcon
      accessibilityLabel={`Trạng thái thanh toán: ${config.label}`}
    />
  );
};

// Tier badge helper
export const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
  const getTierConfig = () => {
    const tierMap: Record<string, { variant: BadgeVariant; label: string }> = {
      bronze: { variant: 'warning', label: 'Bronze' },
      silver: { variant: 'info', label: 'Silver' },
      gold: { variant: 'warning', label: 'Gold' },
      diamond: { variant: 'primary', label: 'Diamond' },
    };

    return tierMap[tier.toLowerCase()] || { variant: 'default', label: tier };
  };

  const config = getTierConfig();
  return (
    <Badge
      label={config.label}
      variant={config.variant}
      size="small"
      accessibilityLabel={`Hạng thành viên: ${config.label}`}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 4,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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