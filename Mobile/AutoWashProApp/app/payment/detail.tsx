/**
 * AutoWashPro Payment Detail Screen
 * Shows detailed payment/invoice information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading,
  Button,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Payment } from '../../src/types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warning },
  completed: { bg: colors.successLight, text: colors.success },
  failed: { bg: colors.errorLight, text: colors.error },
  refunded: { bg: colors.infoLight, text: colors.info },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const METHOD_ICONS: Record<string, string> = {
  cash: '💵',
  momo: '📱',
  vnpay: '💳',
};

export default function PaymentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
🧾 Thông tin thanh toán AutoWashPro

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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Chi tiết thanh toán</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❌</Text>
          <AppText variant="body" color="textSecondary">
            Không tìm thấy thông tin thanh toán
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Chi tiết thanh toán</AppText>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareButton}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <Card style={[styles.invoiceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceIcon}>🧾</Text>
            <AppText variant="h2" color="textInverse">
              {formatCurrency(payment.amount)}
            </AppText>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {STATUS_LABELS[payment.status] || payment.status}
              </Text>
            </View>
          </View>
        </Card>

        {/* Transaction Info */}
        <Card style={styles.infoCard}>
          <AppText variant="h4" style={styles.cardTitle}>
            Thông tin giao dịch
          </AppText>
          
          <View style={styles.infoRow}>
            <AppText variant="body" color="textSecondary">Mã giao dịch</AppText>
            <AppText variant="body" style={styles.infoValue}>
              #{payment._id.slice(-8).toUpperCase()}
            </AppText>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <AppText variant="body" color="textSecondary">Phương thức</AppText>
            <View style={styles.methodValue}>
              <Text style={styles.methodIcon}>
                {METHOD_ICONS[payment.method] || '💳'}
              </Text>
              <AppText variant="body">
                {getMethodLabel(payment.method)}
              </AppText>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <AppText variant="body" color="textSecondary">Ngày giao dịch</AppText>
            <AppText variant="body" style={styles.infoValue}>
              {formatDate(payment.createdAt)}
            </AppText>
          </View>
        </Card>

        {/* Booking Info */}
        {payment.bookingId && (
          <Card style={styles.infoCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Thông tin đặt lịch
            </AppText>
            
            <TouchableOpacity 
              style={styles.bookingLink}
              onPress={() => router.push(`/booking/${payment.bookingId}` as any)}
            >
              <View style={styles.infoRow}>
                <AppText variant="body" color="textSecondary">Mã đặt lịch</AppText>
                <View style={styles.linkValue}>
                  <AppText variant="body" color="primary">
                    #{typeof payment.bookingId === 'string' 
                      ? payment.bookingId.slice(-8).toUpperCase() 
                      : 'N/A'}
                  </AppText>
                  <Text style={styles.linkArrow}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {/* Transaction Details */}
        {payment.transactionId && (
          <Card style={styles.infoCard}>
            <AppText variant="h4" style={styles.cardTitle}>
              Chi tiết giao dịch
            </AppText>
            
            <View style={styles.infoRow}>
              <AppText variant="body" color="textSecondary">Mã giao dịch {payment.method}</AppText>
              <AppText variant="bodySmall" style={styles.infoValue}>
                {payment.transactionId}
              </AppText>
            </View>
          </Card>
        )}

        {/* Payment Notes */}
        {payment.status === 'failed' && (
          <Card style={[styles.infoCard, { backgroundColor: colors.errorLight }]}>
            <View style={styles.errorRow}>
              <Text style={styles.errorIcon}>⚠️</Text>
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
        )}

        {payment.status === 'refunded' && (
          <Card style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
            <View style={styles.errorRow}>
              <Text style={styles.errorIcon}>💰</Text>
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
        )}

        {/* Help Card */}
        <Card style={styles.helpCard}>
          <Text style={styles.helpIcon}>❓</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
  },
  shareButton: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  invoiceCard: {
    margin: spacing.md,
    marginBottom: 0,
  },
  invoiceHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  invoiceIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
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
  },
  infoValue: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  methodValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  bookingLink: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  linkValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkArrow: {
    fontSize: 20,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorIcon: {
    fontSize: 24,
    marginRight: spacing.md,
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
    backgroundColor: colors.warningLight,
  },
  helpIcon: {
    fontSize: 24,
    marginRight: spacing.md,
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
