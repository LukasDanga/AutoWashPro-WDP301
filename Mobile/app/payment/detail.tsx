/**
 * AutoWashPro Payment Detail Screen
 * Shows detailed payment/invoice information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { paymentApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  Button,
  Icon,
  Icons,
  PressableScale,
  ScreenContainer,
  Header,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Payment } from '../../src/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const METHOD_ICONS: Record<string, string> = {
  cash: Icons.walletOutline,
  momo: Icons.cardOutline,
  vnpay: Icons.cardOutline,
};

export default function PaymentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending: { bg: colors.warningLight, text: colors.warning },
    paid: { bg: colors.successLight, text: colors.success },
    failed: { bg: colors.errorLight, text: colors.error },
    refunded: { bg: colors.infoLight, text: colors.info },
  };

  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPayment();
    }
  }, [id]);

  const fetchPayment = async () => {
    // In a real app, you'd have a getPaymentById endpoint
    // For now, we fetch all payments and find the one we need
    try {
      setIsLoading(true);
      const payments = await paymentApi.getMyPayments();
      const found = payments.find((p: Payment) => p._id === id);
      setPayment(found || null);
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes}, ${day}/${month}/${year}`;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      momo: 'MoMo',
      vnpay: 'VNPay',
    };
    return labels[method] || method;
  };

  const handleShare = async () => {
    if (!payment) return;

    const message = `
Thông tin thanh toán AutoWashPro

Mã giao dịch: ${payment._id.slice(-8).toUpperCase()}
Phương thức: ${getMethodLabel(payment.method)}
Số tiền: ${formatCurrency(payment.amount)}
Trạng thái: ${STATUS_LABELS[payment.status] || payment.status}
Ngày: ${formatDate(payment.createdAt)}

Cảm ơn bạn đã sử dụng dịch vụ AutoWashPro!
    `.trim();

    try {
      await Share.share({
        message,
        title: 'Thông tin thanh toán AutoWashPro',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  if (!payment) {
    return (
      <ScreenContainer>
        <Header title="Chi tiết thanh toán" showBack />
        <View style={styles.emptyContainer}>
          <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
            <Icon name={Icons.closeCircleOutline} size={48} color={colors.error} />
          </View>
          <AppText variant="body" color="textSecondary">
            Không tìm thấy thông tin thanh toán
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const statusStyle = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;

  return (
    <ScreenContainer>
      <Header
        title="Chi tiết thanh toán"
        showBack
        rightAction={
          <PressableScale onPress={handleShare} style={styles.shareButton} accessibilityLabel="Chia sẻ">
            <Icon name={Icons.shareOutline} size={22} color={colors.primary} />
          </PressableScale>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <Card style={[styles.invoiceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.invoiceHeader}>
            <Icon name={Icons.receiptOutline} size={48} color="#FFFFFF" />
            <AppText variant="h2" color="textInverse">
              {formatCurrency(payment.amount)}
            </AppText>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <AppText variant="caption" style={{ color: statusStyle.text, fontWeight: '600' }}>
                {STATUS_LABELS[payment.status] || payment.status}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Transaction Info */}
        <Card style={styles.infoCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Thông tin giao dịch
          </AppText>

          <View style={styles.infoRow}>
            <AppText variant="body" color="textSecondary" style={styles.infoLabel}>Mã giao dịch</AppText>
            <AppText variant="body" style={styles.infoValue} numberOfLines={1}>
              #{payment._id.slice(-8).toUpperCase()}
            </AppText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <View style={styles.infoRow}>
            <AppText variant="body" color="textSecondary" style={styles.infoLabel}>Phương thức</AppText>
            <View style={styles.methodValue}>
              <Icon
                name={METHOD_ICONS[payment.method] || Icons.cardOutline}
                size={20}
                color={colors.textPrimary}
                style={{ marginRight: spacing.xs }}
              />
              <AppText variant="body">
                {getMethodLabel(payment.method)}
              </AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <View style={styles.infoRow}>
            <AppText variant="body" color="textSecondary" style={styles.infoLabel}>Ngày giao dịch</AppText>
            <AppText variant="body" style={styles.infoValue} numberOfLines={1}>
              {formatDate(payment.createdAt)}
            </AppText>
          </View>
        </Card>

        {/* Booking Info */}
        {payment.bookingId ? (
          <Card style={styles.infoCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Thông tin đặt lịch
            </AppText>

            <PressableScale
              style={styles.bookingLink}
              onPress={() => router.push(`/booking/${payment.bookingId}` as any)}
              accessibilityRole="link"
            >
              <View style={styles.infoRow}>
                <AppText variant="body" color="textSecondary">Mã đặt lịch</AppText>
                <View style={styles.linkValue}>
                  <AppText variant="body" color="primary">
                    #{typeof payment.bookingId === 'string'
                      ? payment.bookingId.slice(-8).toUpperCase()
                      : 'N/A'}
                  </AppText>
                  <Icon name={Icons.chevronForward} size={20} color={colors.primary} />
                </View>
              </View>
            </PressableScale>
          </Card>
        ) : null}

        {/* Transaction Details */}
        {payment.transactionId && (
          <Card style={styles.infoCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Chi tiết giao dịch
            </AppText>

            <View style={styles.infoRow}>
              <AppText variant="body" color="textSecondary" style={styles.infoLabel}>
                Mã {getMethodLabel(payment.method)}
              </AppText>
              <AppText variant="bodySmall" style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                {payment.transactionId}
              </AppText>
            </View>
          </Card>
        )}

        {/* Payment Notes */}
        {payment.status === 'failed' ? (
          <Card style={[styles.infoCard, { backgroundColor: colors.errorLight }]}>
            <View style={styles.errorRow}>
              <Icon name={Icons.warning} size={24} color={colors.error} />
              <View style={styles.errorContent}>
                <AppText variant="body" style={styles.errorTitle}>
                  Giao dịch thất bại
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  Vui lòng thử lại hoặc liên hệ hỗ trợ
                </AppText>
              </View>
            </View>
          </Card>
        ) : null}

        {payment.status === 'refunded' ? (
          <Card style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
            <View style={styles.errorRow}>
              <Icon name={Icons.walletOutline} size={24} color={colors.info} />
              <View style={styles.errorContent}>
                <AppText variant="body" style={styles.errorTitle}>
                  Đã hoàn tiền
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  Số tiền đã được hoàn vào tài khoản của bạn
                </AppText>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Help Card */}
        <Card style={[styles.helpCard, { backgroundColor: colors.warningLight }]}>
          <Icon name={Icons.helpCircleOutline} size={24} color={colors.warning} />
          <View style={styles.helpContent}>
            <AppText variant="body" style={styles.helpTitle}>
              Cần hỗ trợ?
            </AppText>
            <AppText variant="caption" color="textSecondary">
              Liên hệ hotline 1900 1234 hoặc email support@autowashpro.vn
            </AppText>
          </View>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shareButton: {
  padding: 8,
},
content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  invoiceCard: {
    margin: spacing.md,
    marginBottom: 0,
  },
  invoiceHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  infoCard: {
    margin: spacing.md,
    marginTop: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  infoLabel: {
    flexShrink: 0,
  },
  infoValue: {
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  methodValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingLink: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  linkValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    gap: spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
