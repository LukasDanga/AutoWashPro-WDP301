/**
 * AutoWashPro Rewards Screen
 * Loyalty points and vouchers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { voucherApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading, 
  EmptyState,
  Badge,
  TierBadge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Voucher, UserVoucher } from '../../src/types';

const TABS = [
  { key: 'available', label: 'Mã giảm giá' },
  { key: 'my', label: 'Của tôi' },
];

export default function RewardsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('available');
  const [availableVouchers, setAvailableVouchers] = useState<{
    tierExclusive: Voucher[];
    public: Voucher[];
    redeemable: Voucher[];
  } | null>(null);
  const [myVouchers, setMyVouchers] = useState<UserVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const [availableRes, myRes] = await Promise.all([
        voucherApi.getAvailableVouchers(),
        voucherApi.getMyVouchers(),
      ]);

      setAvailableVouchers(availableRes);
      setMyVouchers(myRes);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getDiscountText = (voucher: Voucher) => {
    if (voucher.discountType === 'percent') {
      return `Giảm ${voucher.discountValue}%`;
    }
    return `Giảm ${formatCurrency(voucher.discountValue)}`;
  };

  const renderVoucherCard = (voucher: Voucher, isRedeemable?: boolean) => (
    <TouchableOpacity
      key={voucher._id}
      onPress={() => router.push({
        pathname: '/voucher/[id]',
        params: { id: voucher._id }
      })}
    >
      <Card style={styles.voucherCard}>
        <View style={styles.voucherContent}>
          <View style={[styles.voucherDiscount, { backgroundColor: colors.primary }]}>
            <Text style={styles.voucherDiscountText}>
              {voucher.discountType === 'percent' ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue)}
            </Text>
            <Text style={styles.voucherDiscountLabel}>
              GIẢM
            </Text>
          </View>
          <View style={styles.voucherInfo}>
            <AppText variant="body" style={styles.voucherName} numberOfLines={1}>
              {voucher.title || voucher.code}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {voucher.description || `Mã: ${voucher.code}`}
            </AppText>
            <View style={styles.voucherMeta}>
              {voucher.minOrderValue && voucher.minOrderValue > 0 && (
                <AppText variant="caption" color="textTertiary">
                  Đơn tối thiểu: {formatCurrency(voucher.minOrderValue)}
                </AppText>
              )}
              {voucher.maxDiscount && (
                <AppText variant="caption" color="textTertiary">
                  Tối đa: {formatCurrency(voucher.maxDiscount)}
                </AppText>
              )}
            </View>
            <View style={styles.voucherFooter}>
              <AppText variant="caption" color="warning">
                HSD: {formatDate(voucher.expiresAt || '')}
              </AppText>
              {isRedeemable && voucher.requiredPoints && (
                <Badge
                  label={`${voucher.requiredPoints} điểm`}
                  variant="warning"
                  size="small"
                />
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderMyVoucherCard = (voucher: UserVoucher) => (
    <TouchableOpacity
      key={voucher._id}
      onPress={() => router.push({
        pathname: '/voucher/[id]',
        params: { id: voucher._id }
      })}
    >
      <Card style={styles.voucherCard}>
        <View style={styles.voucherContent}>
          <View style={[
            styles.voucherDiscount,
            { backgroundColor: voucher.used ? colors.textTertiary : colors.primary }
          ]}>
            <Text style={styles.voucherDiscountText}>
              {voucher.discountType === 'percent' ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue)}
            </Text>
            <Text style={styles.voucherDiscountLabel}>
              {voucher.used ? 'ĐÃ DÙNG' : 'GIẢM'}
            </Text>
          </View>
          <View style={styles.voucherInfo}>
            <View style={styles.voucherHeader}>
              <AppText variant="body" style={styles.voucherName} numberOfLines={1}>
                {voucher.title || voucher.code}
              </AppText>
              <Badge
                label={voucher.used ? 'Đã dùng' : 'Còn hạn'}
                variant={voucher.used ? 'default' : 'success'}
                size="small"
              />
            </View>
            <AppText variant="caption" color="textSecondary">
              Mã: {voucher.code}
            </AppText>
            {voucher.usedAt && (
              <AppText variant="caption" color="textTertiary">
                Đã dùng: {formatDate(voucher.usedAt)}
              </AppText>
            )}
            <AppText variant="caption" color="warning">
              HSD: {formatDate(voucher.expiresAt || '')}
            </AppText>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem voucher và điểm thưởng"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  const allAvailableVouchers = [
    ...(availableVouchers?.public || []),
    ...(availableVouchers?.tierExclusive || []),
    ...(availableVouchers?.redeemable || []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="h2">Ưu đãi</AppText>
      </View>

      {/* Points Card */}
      <Card style={styles.pointsCard}>
        <View style={styles.pointsContent}>
          <View>
            <AppText variant="caption" color="textSecondary">
              Điểm tích lũy
            </AppText>
            <Text style={styles.pointsValue}>{user?.loyaltyPoints || 0}</Text>
          </View>
          <View style={styles.tierContainer}>
            <TierBadge tier={user?.tier || 'bronze'} />
            <AppText variant="caption" color="textSecondary" style={styles.tierLabel}>
              {user?.tier === 'bronze' ? 'Bronze - 0 điểm' : ''}
              {user?.tier === 'silver' ? 'Silver - 500+ điểm' : ''}
              {user?.tier === 'gold' ? 'Gold - 2000+ điểm' : ''}
              {user?.tier === 'diamond' ? 'Diamond - 5000+ điểm' : ''}
            </AppText>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.redeemButton}
          onPress={() => router.push('/rewards?tab=redeem')}
        >
          <AppText variant="bodySmall" color="primary">
            Đổi điểm →
          </AppText>
        </TouchableOpacity>
      </Card>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Voucher List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {activeTab === 'available' ? (
          allAvailableVouchers.length > 0 ? (
            allAvailableVouchers.map((voucher) =>
              renderVoucherCard(voucher, availableVouchers?.redeemable?.some(v => v._id === voucher._id))
            )
          ) : (
            <EmptyState
              icon={<Text style={{ fontSize: 48 }}>🎟️</Text>}
              title="Không có voucher"
              message="Hiện tại không có voucher nào khả dụng"
            />
          )
        ) : (
          myVouchers.length > 0 ? (
            myVouchers.map(renderMyVoucherCard)
          ) : (
            <EmptyState
              icon={<Text style={{ fontSize: 48 }}>📦</Text>}
              title="Chưa có voucher"
              message="Bạn chưa có voucher nào đã sử dụng"
            />
          )
        )}
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
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pointsCard: {
    margin: spacing.md,
    backgroundColor: colors.primary,
  },
  pointsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pointsValue: {
    ...typography.h1,
    color: colors.textInverse,
  },
  tierContainer: {
    alignItems: 'flex-end',
  },
  tierLabel: {
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  redeemButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  voucherCard: {
    marginBottom: spacing.md,
  },
  voucherContent: {
    flexDirection: 'row',
  },
  voucherDiscount: {
    width: 80,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  voucherDiscountText: {
    ...typography.h3,
    color: colors.textInverse,
  },
  voucherDiscountLabel: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.9,
  },
  voucherInfo: {
    flex: 1,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  voucherName: {
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  voucherMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
