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
import { useAuth } from '../../src/contexts/AuthContext';
import { voucherApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading, 
  EmptyState,
  Icon,
  Icons,
  Header,
  ScreenContainer,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';

type TabType = 'available' | 'my';

export default function VouchersIndexScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { isAuthenticated } = useAuth();
  const colors = useColors();

  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'available');
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
    if (voucher.type === 'percentage') {
      return `${voucher.value}%`;
    } else if (voucher.type === 'fixed') {
      return formatCurrency(voucher.value);
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
            <Icon name={'pricetag-outline'} size={24} color={colors.primary} style={styles.discountIcon} />
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
        
        <AppText variant="h3" style={styles.voucherName}>
          {item.name || item.code}
        </AppText>
        
        {item.description && (
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {item.description}
          </AppText>
        )}
        
        <View style={styles.voucherFooter}>
          <AppText variant="caption" color="textTertiary">
            HSD: {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
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
              <Icon name={'pricetag-outline'} size={24} color={isUsed || isExpired ? colors.textTertiary : colors.primary} style={styles.discountIcon} />
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
      <ScreenContainer>
        <Header showBack title="Voucher" />
        <EmptyState
          icon={<Icon name={'pricetag-outline'} size={48} color={colors.textTertiary} />}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem voucher"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải voucher..." />;
  }

  const data = activeTab === 'available' ? availableVouchers : myVouchers;

  return (
    <ScreenContainer>
      <Header showBack title="Voucher" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('available')}
        >
          <View style={[styles.tabInner, activeTab === 'available' && styles.tabInnerActive]}>
            <Icon
              name={'gift-outline'}
              size={18}
              color={activeTab === 'available' ? colors.primary : colors.textSecondary}
              style={styles.tabIcon}
            />
            <AppText
              variant="body"
              color={activeTab === 'available' ? 'primary' : 'textSecondary'}
              style={styles.tabText}
            >
              Ưu đãi
            </AppText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('my')}
        >
          <View style={[styles.tabInner, activeTab === 'my' && styles.tabInnerActive]}>
            <Icon
              name={'pricetag-outline'}
              size={18}
              color={activeTab === 'my' ? colors.primary : colors.textSecondary}
              style={styles.tabIcon}
            />
            <AppText
              variant="body"
              color={activeTab === 'my' ? 'primary' : 'textSecondary'}
              style={styles.tabText}
            >
              Voucher của tôi
            </AppText>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={activeTab === 'available' ? renderVoucher : renderMyVoucher}
        keyExtractor={(item) => item._id}
        initialNumToRender={5}
        windowSize={5}
        maxToRenderPerBatch={5}
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
            icon={<Icon name={'pricetag-outline'} size={48} color={colors.textTertiary} />}
            title="Không có voucher"
            message={activeTab === 'available' 
              ? 'Hiện không có voucher nào khả dụng'
              : 'Bạn chưa có voucher nào'}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0,
    borderBottomColor: '#0286c8',
  },
  tabInnerActive: {
    borderBottomWidth: 2,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  voucherCard: {
    marginBottom: 16,
  },
  voucherCardDisabled: {
    opacity: 0.6,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountIcon: {
    marginRight: 8,
  },
  exclusiveBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  exclusiveText: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '600',
  },
  voucherName: {
    fontWeight: '600',
    marginBottom: 8,
  },
  voucherFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
