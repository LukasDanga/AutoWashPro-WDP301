import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SectionList,
  Alert,
  TextInput,
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
  startDate?: string;
  endDate?: string;
  applicableTiers?: string[];
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
  const [manualCode, setManualCode] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    loadVouchers();
  }, [branchId]);

  const loadVouchers = async () => {
    setIsLoading(true);
    try {
      // voucherApi.getAvailableVouchers() now normalises backend snake_case
      // (`tier_exclusive` / `public` / `redeemable`) into camelCase keys.
      const res = await voucherApi.getAvailableVouchers(
        branchId ? { branchId } : undefined,
      );
      setPublicVouchers(res.public || []);
      setTierVouchers(res.tierExclusive || []);
      setRedeemableVouchers(res.redeemable || []);
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

    const applyVoucher = () => {
      setSelectedCode(item.code);
      setPendingVoucher({ code: item.code, name: item.name || item.code, discount: savings });
      setTimeout(() => router.back(), 150);
    };

    if (item.requiredPoints && item.requiredPoints > 0) {
      Alert.alert(
        'Đổi điểm',
        `Bạn muốn đổi ${item.requiredPoints} điểm lấy voucher này?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đổi điểm',
            onPress: async () => {
              setIsLoading(true);
              try {
                await voucherApi.redeemPoints(item._id);
                applyVoucher();
              } catch (error) {
                Alert.alert('Lỗi', 'Đổi điểm thất bại hoặc không đủ điểm.');
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
      return;
    }

    applyVoucher();
  };

  const applyManualCode = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      setManualMsg('Nhập mã coupon để áp dụng.');
      return;
    }
    setManualLoading(true);
    setManualMsg('');
    try {
      const voucher = await voucherApi.getVoucherByCode(code);
      if (!voucher) throw new Error('Mã không hợp lệ');
      // Calculate savings the same way as handleSelect
      const savings = voucher.type === 'percentage'
        ? Math.min(Math.floor(orderAmount * (voucher.value || 0) / 100), voucher.maxDiscount || Infinity)
        : Math.min(voucher.value || 0, orderAmount);
      setSelectedCode(voucher.code);
      setPendingVoucher({ code: voucher.code, name: voucher.name || voucher.code, discount: savings });
      setManualMsg('✓ Đã áp dụng mã coupon!');
      setManualCode('');
      setTimeout(() => router.back(), 500);
    } catch (error: any) {
      setManualMsg(error?.response?.data?.message || error?.message || 'Mã không hợp lệ');
    } finally {
      setManualLoading(false);
    }
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
    const expiryText = item.endDate
      ? `HSD: ${new Date(item.endDate).toLocaleDateString('vi-VN')}`
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
            <View style={[styles.discountBadge, { backgroundColor: isPercentage ? '#dcfce7' : '#ecfdf5' }]}>
              <AppText variant="h3" style={{ color: isPercentage ? '#16a34a' : '#10b981' }}>
                {isPercentage ? `-${item.value}%` : `-${formatCurrency(item.value!)}`}
              </AppText>
              {savings > 0 && (
                <AppText variant="labelSmall" style={{ color: isPercentage ? '#16a34a' : '#10b981', marginTop: 2 }}>
                  ≈ -{formatCurrency(savings)}
                </AppText>
              )}
            </View>
            <View style={styles.cardBody}>
              <AppText variant="subtitle1" color="textPrimary" numberOfLines={1}>
                {item.name || item.code}
              </AppText>
              {item.description ? (
                <AppText variant="bodySmall" color="textSecondary" numberOfLines={2}>
                  {item.description}
                </AppText>
              ) : null}
              <View style={styles.cardMeta}>
                {item.minOrder && item.minOrder > 0 ? (
                  <View style={styles.metaChip}>
                    <AppText variant="labelSmall" color="textTertiary">
                      Đơn từ {formatCurrency(item.minOrder)}
                    </AppText>
                  </View>
                ) : null}
                {expiryText ? (
                  <AppText variant="labelSmall" color="textTertiary" numberOfLines={1}>
                    {expiryText}
                  </AppText>
                ) : null}
              </View>
            </View>
            <View style={[styles.applyBtn, { backgroundColor: isSelected ? colors.primary : colors.primaryLight }]}>
              <AppText variant="button" style={{ color: isSelected ? '#fff' : colors.primary }}>
                {isSelected ? '✓' : 'Chọn'}
              </AppText>
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
          <AppText variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.md }}>Đang tải ưu đãi...</AppText>
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
        <>
        {/* Manual coupon code input — web parity (VoucherPicker.jsx:316-351) */}
        <View style={styles.manualCodeRow}>
          <TextInput
            value={manualCode}
            onChangeText={(t) => { setManualCode(t.toUpperCase()); setManualMsg(''); }}
            placeholder="NHẬP MÃ COUPON..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            returnKeyType="go"
            onSubmitEditing={applyManualCode}
            style={[
              styles.manualCodeInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
            ]}
          />
          <TouchableOpacity
            onPress={applyManualCode}
            disabled={manualLoading}
            style={[styles.manualCodeBtn, { backgroundColor: colors.primary }]}
          >
            <AppText variant="button" style={{ color: '#fff' }}>
              {manualLoading ? '...' : 'Áp dụng'}
            </AppText>
          </TouchableOpacity>
        </View>
        {manualMsg ? (
          <View style={[
            styles.manualMsgBox,
            {
              backgroundColor: manualMsg.startsWith('✓') ? '#dcfce7' : '#fef2f2',
              borderColor: manualMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca',
            },
          ]}>
            <AppText variant="bodySmall" style={{ color: manualMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
              {manualMsg}
            </AppText>
          </View>
        ) : null}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderVoucher}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <AppText variant="label" color="textSecondary" style={styles.sectionTitle}>{title}</AppText>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  manualCodeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  manualCodeInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  manualCodeBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualCodeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  manualMsgBox: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  manualMsgText: {
    fontSize: 13,
    fontWeight: '600',
  },
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
  cardBody: {
    flex: 1,
    marginRight: spacing.sm,
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
