/**
 * AutoWashPro Badge Component
 * Status badges and labels
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary';
type BadgeSize = 'small' | 'medium';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
}) => {
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
        return { bg: colors.primaryLight, text: colors.primary };
      default:
        return { bg: colors.surface, text: colors.textSecondary };
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
    >
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
  return <Badge label={config.label} variant={config.variant} />;
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
  return <Badge label={config.label} variant={config.variant} />;
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
  return <Badge label={config.label} variant={config.variant} size="small" />;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
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
