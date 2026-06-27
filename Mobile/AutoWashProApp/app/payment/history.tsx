/**
 * AutoWashPro Payment History Screen
 * User's payment history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading, 
  EmptyState,
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

export default function PaymentHistoryScreen() {
  const router = useRouter();
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

  const onRefresh = useCallback

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

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      momo: 'MoMo',
      vnpay: 'VNPay',
    };
    return labels[method] || method;
  };

  const renderPaymentCard = ({ item }: { item: Payment }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    
    return (
      <TouchableOpacity
        onPress={() => router.push(`/payment/${item._id}` as any)}
      >
        <Card style={styles.paymentCard}>
          <View style={styles.cardHeader}>
            <View style={styles.methodContainer}>
              <Text style={styles.methodIcon}>
                {METHOD_ICONS[item.method] || '💳'}
              </Text>
              <View>
                <AppText variant="body" style={styles.methodLabel}>
                  {getMethodLabel(item.method)}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {item._id.slice(-8).toUpperCase()}
                </AppText>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg }
            ]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <AppText variant="bodySmall" color="textSecondary">
                {formatDate(item.createdAt)}
              </AppText>
            </View>
            {item.bookingId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📋</Text>
                <AppText variant="bodySmall" color="textSecondary">
                  Mã đặt lịch: #{typeof item.bookingId === 'string' 
                    ? item.bookingId.slice(-8).toUpperCase() 
                    : 'N/A'}
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <AppText variant="caption" color="textSecondary">
              Số tiền
            </AppText>
            <AppText variant="h3" color={item.status === 'refunded' ? 'textSecondary' : 'primary'}>
              {item.status === 'refunded' ? '-' : ''}{formatCurrency(item.amount)}
            </AppText>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Lịch sử thanh toán</AppText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem lịch sử thanh toán"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải lịch sử..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Lịch sử thanh toán</AppText>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={{ fontSize: 48 }}>💳</Text>}
            title="Không có giao dịch"
            message="Bạn chưa có giao dịch thanh toán nào"
          />
        }
      />
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  paymentCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  methodLabel: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  cardContent: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    width: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
