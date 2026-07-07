/**
 * AutoWashPro Rewards Screen
 * Loyalty points & vouchers — gradient hero card with tier badge,
 * tabbed voucher list with stub perforation look, semantic colors.
 *
 * UX guidelines: accessibility, no emoji icons, scale feedback,
 *                semantic color tokens (no hardcoded hex).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { voucherApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  EmptyState,
  Badge,
  TierBadge,
  Icon,
  Icons,
  PressableScale,
  SkeletonListItem,
  ScreenContainer,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Voucher, UserVoucher, UserTier } from '../../src/types';

type TabKey = 'available' | 'my';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'available', label: 'Mã giảm giá', icon: Icons.giftOutline },
  { key: 'my', label: 'Của tôi', icon: Icons.bookmarkOutline },
];

const TIER_GRADIENTS: Record<UserTier, [string, string, string]> = {
  bronze: ['#92400E', '#B45309', '#D97706'],
  silver: ['#475569', '#64748B', '#94A3B8'],
  gold: ['#B45309', '#D97706', '#FBBF24'],
  diamond: ['#1E40AF', '#3B82F6', '#A5B4FC'],
};

export default function RewardsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const colors = useColors();

  const [activeTab, setActiveTab] = useState<TabKey>('available');
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Không giới hạn';
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const renderVoucherCard = (voucher: Voucher, isRedeemable?: boolean) => (
    <PressableScale
      key={voucher._id}
      onPress={() => router.push({
        pathname: '/voucher/[id]' as any,
        params: { id: voucher._id },
      })}
      accessibilityRole="button"
      accessibilityLabel={`Voucher ${voucher.title || voucher.code}`}
    >
      <View style={[styles.voucherCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={TIER_GRADIENTS[user?.tier || 'bronze'] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.voucherDiscount}
        >
          <View style={styles.discountBlob} />
          <Text style={styles.voucherDiscountText}>
            {voucher.discountType === 'percent'
              ? `${voucher.discountValue}%`
              : formatCurrency(voucher.discountValue)}
          </Text>
          <Text style={styles.voucherDiscountLabel}>GIẢM</Text>
          <View style={styles.perfTop} />
          <View style={styles.perfBottom} />
        </LinearGradient>
        <View style={styles.voucherInfo}>
          <AppText variant="body" style={styles.voucherName} numberOfLines={1}>
            {voucher.title || voucher.code}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {voucher.description || `Mã: ${voucher.code}`}
          </AppText>
          <View style={styles.voucherMeta}>
            {voucher.minOrderValue && voucher.minOrderValue > 0 ? (
              <View style={styles.metaItem}>
                <Icon name={Icons.cartOutline} size={11} color={colors.textTertiary} />
                <AppText variant="caption" color="textTertiary">
                  Tối thiểu {formatCurrency(voucher.minOrderValue)}
                </AppText>
              </View>
            ) : null}
            {voucher.maxDiscount ? (
              <View style={styles.metaItem}>
                <Icon name={Icons.arrowUp} size={11} color={colors.textTertiary} />
                <AppText variant="caption" color="textTertiary">
                  Tối đa {formatCurrency(voucher.maxDiscount)}
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.voucherFooter}>
            <View style={styles.expiryContainer}>
              <Icon name={Icons.timeOutline} size={12} color={colors.warning} />
              <AppText variant="caption" color="warning">
                HSD: {formatDate(voucher.expiresAt)}
              </AppText>
            </View>
            {isRedeemable && voucher.requiredPoints ? (
              <Badge
                label={`${voucher.requiredPoints} điểm`}
                variant="warning"
                size="small"
              />
            ) : null}
          </View>
        </View>
      </View>
    </PressableScale>
  );

  const renderMyVoucherCard = (voucher: UserVoucher) => {
    const isUsed = !!voucher.used;
    return (
      <PressableScale
        key={voucher._id}
        onPress={() => router.push({
          pathname: '/voucher/[id]' as any,
          params: { id: voucher._id },
        })}
        accessibilityRole="button"
      >
        <View style={[styles.voucherCard, { backgroundColor: colors.surface }, isUsed && styles.voucherCardUsed]}>
          <View
            style={[
              styles.voucherDiscount,
              {
                backgroundColor: isUsed ? colors.textTertiary : colors.primary,
              },
            ]}
          >
            <Text style={styles.voucherDiscountText}>
              {voucher.discountType === 'percent'
                ? `${voucher.discountValue}%`
                : formatCurrency(voucher.discountValue)}
            </Text>
            <Text style={styles.voucherDiscountLabel}>
              {isUsed ? 'ĐÃ DÙNG' : 'GIẢM'}
            </Text>
            <View style={[styles.perfTop, { backgroundColor: colors.background }]} />
            <View style={[styles.perfBottom, { backgroundColor: colors.background }]} />
          </View>
          <View style={styles.voucherInfo}>
            <View style={styles.voucherHeader}>
              <AppText variant="body" style={styles.voucherName} numberOfLines={1}>
                {voucher.title || voucher.code}
              </AppText>
              <Badge
                label={isUsed ? 'Đã dùng' : 'Còn hạn'}
                variant={isUsed ? 'default' : 'success'}
                size="small"
              />
            </View>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              Mã: {voucher.code}
            </AppText>
            {voucher.usedAt ? (
              <AppText variant="caption" color="textTertiary">
                Đã dùng: {formatDate(voucher.usedAt)}
              </AppText>
            ) : null}
            <View style={styles.expiryContainer}>
              <Icon name={Icons.timeOutline} size={12} color={colors.warning} />
              <AppText variant="caption" color="warning">
                HSD: {formatDate(voucher.expiresAt)}
              </AppText>
            </View>
          </View>
        </View>
      </PressableScale>
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer background="subtle">
        <EmptyState
          iconName={Icons.giftOutline}
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem voucher và điểm thưởng"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer background="subtle">
        <View style={styles.skeletonHeader}>
          <AppText variant="h2">Ưu đãi</AppText>
        </View>
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonListItem />
            </View>
          ))}
        </View>
      </ScreenContainer>
    );
  }

  const allAvailableVouchers = [
    ...(availableVouchers?.public || []),
    ...(availableVouchers?.tierExclusive || []),
    ...(availableVouchers?.redeemable || []),
  ];

  const tier: UserTier = user?.tier || 'bronze';
  const pointsToNext = computePointsToNext(tier, user?.loyaltyPoints || 0);

  return (
    <ScreenContainer background="subtle">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View>
          <AppText variant="h2">Ưu đãi</AppText>
          <AppText variant="caption" color="textSecondary">
            Tích điểm, đổi quà và nhiều ưu đãi hấp dẫn
          </AppText>
        </View>
        <PressableScale
          onPress={() => router.push('/voucher/my' as any)}
          accessibilityLabel="Lịch sử voucher"
          style={[styles.historyBtn, { backgroundColor: colors.primarySubtle }]}
        >
          <Icon name={Icons.listOutline} size={20} color={colors.primary} />
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Points hero card */}
        <LinearGradient
          colors={TIER_GRADIENTS[tier] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsCard}
        >
          <View style={styles.pointsBlob} />
          <View style={styles.pointsBlob2} />
          <View style={styles.pointsContent}>
            <View>
              <AppText style={styles.pointsLabel}>Điểm tích lũy</AppText>
              <View style={styles.pointsRow}>
                <Icon name={Icons.star} size={28} color="#FFFFFF" />
                <Text style={styles.pointsValue}>{user?.loyaltyPoints || 0}</Text>
                <Text style={styles.pointsUnit}>điểm</Text>
              </View>
              {pointsToNext ? (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pointsToNext.progress * 100}%`,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                      },
                    ]}
                  />
                </View>
              ) : null}
              {pointsToNext ? (
                <AppText style={styles.pointsHint}>
                  Còn {pointsToNext.remaining} điểm để lên hạng {nextTier(tier)}
                </AppText>
              ) : (
                <AppText style={styles.pointsHint}>
                  Bạn đang ở hạng cao nhất — tận hưởng đặc quyền Diamond
                </AppText>
              )}
            </View>
            <View style={styles.tierContainer}>
              <TierBadge tier={tier} />
            </View>
          </View>

          <PressableScale
            style={styles.redeemButton}
            onPress={() => setActiveTab('available')}
            accessibilityLabel="Đổi điểm lấy voucher"
          >
            <Icon name={Icons.refreshOutline} size={16} color={colors.primary} />
            <AppText variant="bodySmall" style={styles.redeemText}>
              Đổi điểm
            </AppText>
            <Icon name={Icons.forward} size={16} color={colors.primary} />
          </PressableScale>
        </LinearGradient>

        {/* Tier explainer */}
        <View style={[styles.tierGrid, { backgroundColor: colors.surface }]}>
          {(['bronze', 'silver', 'gold', 'diamond'] as UserTier[]).map((t) => (
            <TierItem
              key={t}
              tier={t}
              active={t === tier}
              achieved={
                ['bronze', 'silver', 'gold', 'diamond'].indexOf(t) <=
                ['bronze', 'silver', 'gold', 'diamond'].indexOf(tier)
              }
            />
          ))}
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <PressableScale
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, active && { borderBottomColor: colors.primary }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Icon
                  name={tab.icon}
                  size={18}
                  color={active ? colors.primary : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? colors.primary : colors.textTertiary },
                    active && { fontWeight: '700' },
                  ]}
                >
                  {tab.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Voucher list */}
        {activeTab === 'available' ? (
          allAvailableVouchers.length > 0 ? (
            allAvailableVouchers.map((voucher) =>
              renderVoucherCard(
                voucher,
                !!availableVouchers?.redeemable?.some((v) => v._id === voucher._id),
              ),
            )
          ) : (
            <EmptyState
              iconName={Icons.voucherOutline}
              title="Không có voucher"
              message="Hiện tại không có voucher nào khả dụng"
            />
          )
        ) : myVouchers.length > 0 ? (
          myVouchers.map(renderMyVoucherCard)
        ) : (
          <EmptyState
            iconName={Icons.voucherOutline}
            title="Chưa có voucher"
            message="Bạn chưa có voucher nào"
            actionLabel="Khám phá ưu đãi"
            onAction={() => setActiveTab('available')}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

interface TierItemProps {
  tier: UserTier;
  active: boolean;
  achieved: boolean;
}

const TierItem: React.FC<TierItemProps> = ({ tier, active, achieved }) => {
  const colors = useColors();
  const labels: Record<UserTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    diamond: 'Diamond',
  };
  return (
    <View
      style={[
        styles.tierItem,
        active && {
          backgroundColor: colors.primarySubtle,
          borderColor: colors.primary,
        },
      ]}
    >
      <View style={{ opacity: achieved ? 1 : 0.4 }}>
        <TierBadge tier={tier} />
      </View>
      <AppText
        variant="caption"
        style={{
          marginTop: 4,
          fontWeight: active ? '700' : '500',
          color: active ? colors.primary : colors.textPrimary,
        }}
      >
        {labels[tier]}
      </AppText>
    </View>
  );
};

function nextTier(t: UserTier): string {
  if (t === 'bronze') return 'Silver';
  if (t === 'silver') return 'Gold';
  if (t === 'gold') return 'Diamond';
  return '';
}

function computePointsToNext(tier: UserTier, points: number) {
  const thresholds: Record<UserTier, number> = {
    bronze: 500,
    silver: 2000,
    gold: 5000,
    diamond: 5000,
  };
  const prev: Record<UserTier, number> = {
    bronze: 0,
    silver: 500,
    gold: 2000,
    diamond: 5000,
  };
  if (tier === 'diamond') return null;
  const next = thresholds[tier];
  const from = prev[tier];
  const progress = Math.min(1, Math.max(0, (points - from) / (next - from)));
  const remaining = Math.max(0, next - points);
  return { progress, remaining, target: next };
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  pointsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  pointsBlob: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -60,
    right: -60,
  },
  pointsBlob2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -40,
    left: -30,
  },
  pointsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: 4,
  },
  pointsValue: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
  },
  pointsUnit: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pointsHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: spacing.xs,
  },
  tierContainer: {
    alignItems: 'flex-end',
  },
  redeemButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
  },
  redeemText: {
    fontWeight: '600',
  },
  tierGrid: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  tierItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexDirection: 'row',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography.body,
  },
  skeletonHeader: {
    padding: spacing.md,
  },
  skeletonList: {
    padding: spacing.md,
  },
  skeletonCard: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  voucherCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    minHeight: 110,
  },
  voucherCardUsed: {
    opacity: 0.7,
  },
  voucherDiscount: {
    width: 96,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  discountBlob: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -30,
    right: -30,
  },
  voucherDiscountText: {
    ...typography.h3,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  voucherDiscountLabel: {
    ...typography.caption,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '600',
    letterSpacing: 1,
  },
  perfTop: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    top: -8,
    right: 40,
  },
  perfBottom: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    bottom: -8,
    right: 40,
  },
  voucherInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: spacing.xs,
  },
  voucherName: {
    fontWeight: '600',
    flex: 1,
  },
  voucherMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});