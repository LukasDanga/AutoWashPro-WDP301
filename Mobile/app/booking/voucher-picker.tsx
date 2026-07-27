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
import { AlertDialog } from '../../src/components/common/AlertDialog';
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
      AlertDialog.show({
        title: 'Xác nhận đổi điểm',
        subtitle: 'Dùng điểm tích lũy',
        message: `Bạn có muốn dùng ${item.requiredPoints} điểm tích lũy để đổi lấy voucher "${item.name || item.code}"?`,
        variant: 'confirm',
        iconName: Icons.star,
        actions: [
          {
            text: 'Hủy',
            style: 'cancel',
            variant: 'ghost',
          },
          {
            text: 'Đổi điểm ngay',
            variant: 'primary',
            onPress: async () => {
              setIsLoading(true);
              try {
                await voucherApi.redeemPoints(item._id);
                applyVoucher();
              } catch (error) {
                AlertDialog.show({
                  title: 'Đổi điểm thất bại',
                  message: 'Rất tiếc, điểm tích lũy của bạn không đủ hoặc voucher đã hết lượt đổi.',
                  variant: 'danger',
                  actions: [{ text: 'Đóng', variant: 'primary' }],
                });
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
      });
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
    const savings = isPercentage
      ? Math.min(Math.floor(orderAmount * (item.value || 0) / 100), item.maxDiscount || Infinity)
      : Math.min(item.value || 0, orderAmount);
    const expiryText = item.endDate
      ? `HSD: ${new Date(item.endDate).toLocaleDateString('vi-VN')}`
      : null;

    const discountMainText = isPercentage
      ? `-${item.value}%`
      : `-${formatCurrency(item.value || 0).replace(/\s+/g, '')}`;

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
            {/* Left Discount Badge */}
            <View style={[styles.discountBadge, { backgroundColor: isPercentage ? '#ECFDF5' : '#F0FDF4' }]}>
              <Text
                style={styles.discountBadgeMain}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {discountMainText}
              </Text>
              {isPercentage && savings > 0 ? (
                <Text style={styles.discountBadgeSub}>
                  ≈ -{formatCurrency(savings).replace(/\s+/g, '')}
                </Text>
              ) : (
                <Text style={styles.discountBadgeSubLabel}>
                  GIẢM
                </Text>
              )}
            </View>

            {/* Middle Details */}
            <View style={styles.cardBody}>
              <AppText variant="h4" color="textPrimary" numberOfLines={1} style={{ fontWeight: '700' }}>
                {item.name || item.code}
              </AppText>
              {item.description ? (
                <AppText variant="caption" color="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
                  {item.description}
                </AppText>
              ) : null}
              <View style={styles.cardMeta}>
                {item.minOrder && item.minOrder > 0 ? (
                  <View style={styles.metaChip}>
                    <AppText variant="labelSmall" color="primary" style={{ fontSize: 11, fontWeight: '600' }}>
                      Đơn từ {formatCurrency(item.minOrder).replace(/\s+/g, '')}
                    </AppText>
                  </View>
                ) : null}
                {expiryText ? (
                  <AppText variant="caption" color="textTertiary" numberOfLines={1} style={{ fontSize: 11 }}>
                    {expiryText}
                  </AppText>
                ) : null}
              </View>
            </View>

            {/* Right Action Button */}
            <View style={[
              styles.applyBtn,
              {
                backgroundColor: isSelected ? colors.primary : colors.primarySubtle,
                borderColor: colors.primary,
                borderWidth: isSelected ? 0 : 1,
              }
            ]}>
              <Text style={[
                styles.applyBtnText,
                { color: isSelected ? '#FFFFFF' : colors.primary }
              ]}>
                {isSelected ? 'Đã chọn' : 'Chọn'}
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
            placeholder="Nhập mã ưu đãi / coupon..."
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
    width: 86,
    height: 72,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountBadgeMain: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
  },
  discountBadgeSub: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    textAlign: 'center',
  },
  discountBadgeSubLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#059669',
    letterSpacing: 0.8,
    marginTop: 2,
    textAlign: 'center',
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
    marginTop: 4,
  },
  metaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#ECFDF5',
  },
  applyBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
  },
});
