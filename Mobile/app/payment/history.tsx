/**
 * AutoWashPro Payment History Screen
 * User's payment history with premium card design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  EmptyState,
  Icon,
  Icons,
  ScreenContainer,
  Header,
  Badge,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Payment } from '../../src/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'error' | 'info' | 'default'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'info',
};

const METHOD_INFO: Record<string, { icon: string; label: string }> = {
  cash: { icon: Icons.walletOutline, label: 'Tiền mặt' },
  momo: { icon: Icons.cardOutline, label: 'MoMo' },
  vnpay: { icon: Icons.cardOutline, label: 'VNPay' },
  stripe: { icon: Icons.cardOutline, label: 'Stripe' },
};

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const data = await paymentApi.getMyPayments();
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMethodInfo = (method: string) =>
    METHOD_INFO[method] || { icon: 'card-outline', label: method };

  const renderPaymentCard = ({ item }: { item: Payment }) => {
    const booking = typeof item.bookingId === 'object' ? item.bookingId as any : null;
    const bookingCode = booking?.bookingCode || (typeof item.bookingId === 'string' ? item.bookingId.slice(-8).toUpperCase() : 'N/A');
    const paymentTypeLabel = item.type === 'deposit' ? 'Đặt cọc' : item.type === 'remaining' ? 'Còn lại' : 'Toàn bộ';
    
    return (
      <Card
        style={styles.paymentCard}
        onPress={() => router.push({ pathname: '/payment/detail', params: { id: item._id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.methodContainer}>
            <View
              style={[
                styles.methodIconWrap,
                { backgroundColor: colors.primarySubtle },
              ]}
            >
              <Icon
                name={getMethodInfo(item.method).icon}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.methodText}>
              <AppText variant="body" weight="600">
                {getMethodInfo(item.method).label}
              </AppText>
              <AppText variant="caption" color="textTertiary">
                GD: #{item.transactionId ? item.transactionId : item._id.slice(-8).toUpperCase()}
              </AppText>
            </View>
          </View>
          <Badge
            label={STATUS_LABELS[item.status] || item.status}
            variant={STATUS_VARIANTS[item.status] || 'default'}
            size="small"
            showIcon
          />
        </View>

        <View style={[styles.cardContent, { borderTopColor: colors.divider }]}>
          <View style={styles.infoRow}>
            <Icon name={Icons.calendarOutline} size={16} color={colors.textTertiary} />
            <AppText variant="bodySmall" color="textSecondary">
              {item.paidAt ? `Đã thanh toán: ${formatDate(item.paidAt)}` : `Tạo lúc: ${formatDate(item.createdAt)}`}
            </AppText>
          </View>
          {item.bookingId ? (
            <View style={styles.infoRow}>
              <Icon name={Icons.receiptOutline} size={16} color={colors.textTertiary} />
              <AppText variant="bodySmall" color="textSecondary">
                Mã đặt lịch: <AppText variant="bodySmall" color="primary" weight="600">#{bookingCode}</AppText>
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
          <View>
            <AppText variant="caption" color="textSecondary">
              Số tiền ({paymentTypeLabel})
            </AppText>
            {item.status === 'refunded' && item.refundedAt && (
              <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                Đã hoàn: {formatDate(item.refundedAt)}
              </AppText>
            )}
          </View>
          <AppText
            variant="price"
            color={item.status === 'refunded' ? 'textSecondary' : 'primary'}
          >
            {item.status === 'refunded' ? '-' : ''}
            {formatCurrency(item.amount)}
          </AppText>
        </View>
      </Card>
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <Header title="Lịch sử thanh toán" showBack />
        <EmptyState
          iconName={Icons.lockOutline}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem lịch sử thanh toán"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải lịch sử..." />;
  }

  return (
    <ScreenContainer background="subtle">
      <Header title="Lịch sử thanh toán" showBack />
      <FlatList
        data={payments}
        renderItem={renderPaymentCard}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            iconName={Icons.cardOutline}
            title="Không có giao dịch"
            message="Bạn chưa có giao dịch thanh toán nào"
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  paymentCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodText: {
    flex: 1,
  },
  cardContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});