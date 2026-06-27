/**
 * AutoWashPro Vouchers List Screen
 * Shows available and user's vouchers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { voucherApi } from '../../src/api';
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

type TabType = 'available' | 'my';

export default function VouchersIndexScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'available') {
        const data = await voucherApi.getAvailableVouchers();
        setAvailableVouchers([
          ...(data.tierExclusive || []),
          ...(data.public || []),
          ...(data.redeemable || []),
        ]);
      } else {
        const data = await voucherApi.getMyVouchers();
        setMyVouchers(data || []);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getDiscountText = (voucher: any) => {
    if (voucher.discountType === 'percent') {
      return `Giảm ${voucher.discountValue}%`;
    } else if (voucher.discountType === 'fixed') {
      return `Giảm ${formatCurrency(voucher.discountValue)}`;
    } else if (voucher.minOrder) {
      return `Đơn từ ${formatCurrency(voucher.minOrder)}`;
    }
    return 'Khuyến mãi';
  };

  const renderVoucher = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/voucher/${item._id}` as any)}>
      <Card style={styles.voucherCard}>
        <View style={styles.voucherHeader}>
          <View style={styles.discountContainer}>
            <Text style={styles.discountIcon}>🎫</Text>
            <AppText variant="h3" color="primary">
              {getDiscountText(item)}
            </AppText>
          </View>
          {item.exclusiveTier && (
            <View style={styles.exclusiveBadge}>
              <Text style={styles.exclusiveText}>{item.exclusiveTier.toUpperCase()}</Text>
            </View>
          )}
        </View>
        
        <AppText variant="body" style={styles.voucherName}>
          {item.name || item.code}
        </AppText>
        
        {item.description && (
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {item.description}
          </AppText>
        )}
        
        <View style={styles.voucherFooter}>
          <AppText variant="caption" color="textTertiary">
            {item.expiresAt 
              ? `Hết hạn: ${new Date(item.expiresAt).toLocaleDateString('vi-VN')}`
              : 'Không có hạn sử dụng'}
          </AppText>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderMyVoucher = ({ item }: { item: any }) => {
    const isUsed = item.usedAt || item.status === 'used';
    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
    
    return (
      <TouchableOpacity 
        onPress={() => router.push(`/voucher/${item._id}` as any)}
        disabled={isUsed || isExpired}
      >
        <Card style={[styles.voucherCard, (isUsed || isExpired) && styles.voucherCardDisabled]}>
          <View style={styles.voucherHeader}>
            <View style={styles.discountContainer}>
              <Text style={styles.discountIcon}>🎫</Text>
              <AppText variant="h3" color={isUsed || isExpired ? 'textTertiary' : 'primary'}>
                {item.code}
              </AppText>
            </View>
            <View style={[
              styles.statusBadge,
              { 
                backgroundColor: isUsed ? colors.errorLight : 
                                 isExpired ? colors.warningLight : colors.successLight 
              }
            ]}>
              <Text style={styles.statusText}>
                {isUsed ? 'Đã dùng' : isExpired ? 'Hết hạn' : 'Còn hiệu lực'}
              </Text>
            </View>
          </View>
          
          <AppText variant="body" style={styles.voucherName}>
            {item.name}
          </AppText>
          
          <View style={styles.voucherFooter}>
            <AppText variant="caption" color="textTertiary">
              {item.usedAt 
                ? `Đã dùng: ${new Date(item.usedAt).toLocaleDateString('vi-VN')}`
                : item.expiresAt 
                  ? `Hết hạn: ${new Date(item.expiresAt).toLocaleDateString('vi-VN')}`
                  : 'Không có hạn sử dụng'}
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
          <AppText variant="h4">Voucher</AppText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>🎫</Text>}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem voucher"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải voucher..." />;
  }

  const data = activeTab === 'available' ? availableVouchers : myVouchers;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Voucher</AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <AppText 
            variant="body" 
            color={activeTab === 'available' ? 'primary' : 'textSecondary'}
          >
            Ưu đãi
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
        >
          <AppText 
            variant="body" 
            color={activeTab === 'my' ? 'primary' : 'textSecondary'}
          >
            Voucher của tôi
          </AppText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={activeTab === 'available' ? renderVoucher : renderMyVoucher}
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
            icon={<Text style={{ fontSize: 48 }}>🎫</Text>}
            title="Không có voucher"
            message={activeTab === 'available' 
              ? 'Hiện không có voucher nào khả dụng'
              : 'Bạn chưa có voucher nào'}
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  voucherCard: {
    marginBottom: spacing.md,
  },
  voucherCardDisabled: {
    opacity: 0.6,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  exclusiveBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  exclusiveText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  voucherName: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  voucherFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
