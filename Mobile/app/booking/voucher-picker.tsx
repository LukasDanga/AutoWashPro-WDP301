import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import { setPendingVoucher } from '../../src/utils/voucherStore';

type VoucherItem = {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  maxDiscount?: number;
  minOrder?: number;
  expiresAt?: string;
  validTo?: string;
  tierExclusive?: string;
  requiredPoints?: number;
};

export default function VoucherPickerScreen() {
  const router = useRouter();
  const colors = useColors();
  const { branchId, orderAmount: amountParam } = useLocalSearchParams<{
    branchId?: string;
    orderAmount?: string;
  }>();

  const orderAmount = parseFloat(amountParam || '0') || 0;

  const [publicVouchers, setPublicVouchers] = useState<VoucherItem[]>([]);
  const [tierVouchers, setTierVouchers] = useState<VoucherItem[]>([]);
  const [redeemableVouchers, setRedeemableVouchers] = useState<VoucherItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    loadVouchers();
  }, [branchId]);

  const loadVouchers = async () => {
    setIsLoading(true);
    try {
      const res = await voucherApi.getAvailableVouchers(
        branchId ? { branchId } : undefined,
      );
      const data = res as any;
      setPublicVouchers(data?.public || []);
      setTierVouchers(data?.tier_exclusive || []);
      setRedeemableVouchers(data?.redeemable || []);
    } catch {
      setPublicVouchers([]);
      setTierVouchers([]);
      setRedeemableVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: VoucherItem) => {
    const savings = item.type === 'percentage'
      ? Math.min(Math.floor(orderAmount * item.value! / 100), item.maxDiscount || Infinity)
      : Math.min(item.value || 0, orderAmount);
    setSelectedCode(item.code);
    setPendingVoucher({ code: item.code, name: item.name || item.code, discount: savings });
    setTimeout(() => router.back(), 150);
  };

  const sections = useMemo(() => {
    const result: { title: string; data: VoucherItem[] }[] = [];
    if (publicVouchers.length > 0) {
      result.push({ title: 'Ưu đãi công khai', data: publicVouchers });
    }
    if (tierVouchers.length > 0) {
      result.push({ title: 'Đặc quyền hạng thành viên', data: tierVouchers });
    }
    if (redeemableVouchers.length > 0) {
      result.push({ title: 'Đổi điểm', data: redeemableVouchers });
    }
    return result;
  }, [publicVouchers, tierVouchers, redeemableVouchers]);

  const renderVoucher = ({ item }: { item: VoucherItem }) => {
    const isSelected = selectedCode === item.code;
    const isPercentage = item.type === 'percentage';
    const savings = item.type === 'percentage'
      ? Math.min(Math.floor(orderAmount * item.value! / 100), item.maxDiscount || Infinity)
      : Math.min(item.value || 0, orderAmount);
    const expiryText = item.expiresAt || item.validTo
      ? `HSD: ${new Date(item.expiresAt || item.validTo!).toLocaleDateString('vi-VN')}`
      : null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleSelect(item)}
        style={styles.cardOuter}
      >
        <View style={[
          styles.voucherCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
          isSelected && { shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
        ]}>
          <View style={styles.cardRow}>
            <View style={[styles.discountBadge, { backgroundColor: isPercentage ? '#dcfce7' : '#dbeafe' }]}>
              <Text style={[styles.discountValue, { color: isPercentage ? '#16a34a' : '#2563eb' }]}>
                {isPercentage ? `-${item.value}%` : `-${formatCurrency(item.value!)}`}
              </Text>
              {savings > 0 && (
                <Text style={[styles.discountHint, { color: isPercentage ? '#16a34a' : '#2563eb' }]}>
                  ≈ -{formatCurrency(savings)}
                </Text>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.voucherName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name || item.code}
              </Text>
              {item.description ? (
                <Text style={[styles.voucherDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.cardMeta}>
                {item.minOrder && item.minOrder > 0 ? (
                  <View style={styles.metaChip}>
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                      Đơn từ {formatCurrency(item.minOrder)}
                    </Text>
                  </View>
                ) : null}
                {expiryText ? (
                  <Text style={[styles.expiryText, { color: colors.textTertiary }]} numberOfLines={1}>
                    {expiryText}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.applyBtn, { backgroundColor: isSelected ? colors.primary : colors.primaryLight }]}>
              <Text style={[styles.applyBtnText, { color: isSelected ? '#fff' : colors.primary }]}>
                {isSelected ? '✓' : 'Chọn'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <Header showBack title="Chọn ưu đãi" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải ưu đãi...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const hasVouchers = publicVouchers.length > 0 || tierVouchers.length > 0 || redeemableVouchers.length > 0;

  return (
    <ScreenContainer>
      <Header showBack title="Chọn ưu đãi" />

      {!hasVouchers ? (
        <EmptyState
          icon={<Icon name={Icons.gift} size={48} color={colors.textTertiary} />}
          title="Không có ưu đãi"
          message="Chi nhánh này hiện chưa có voucher khả dụng cho bạn"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderVoucher}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardOuter: {
    marginBottom: spacing.sm,
  },
  voucherCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountBadge: {
    width: 80,
    height: 72,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  discountHint: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  voucherName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  voucherDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  metaText: {
    fontSize: 10,
    fontWeight: '500',
  },
  expiryText: {
    fontSize: 10,
    flexShrink: 1,
  },
  applyBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
