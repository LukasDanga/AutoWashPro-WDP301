/**
 * AutoWashPro Rewards Screen — Premium UI Refactor
 * All business logic preserved. Layout, spacing, typography, and
 * visual hierarchy improved to production quality.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  Animated,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { voucherApi, giftApi } from '../../src/api';
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
import { spacing, borderRadius, shadows, layout } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Voucher, UserVoucher, UserTier, Gift } from '../../src/types';

// ─── Constants ─────────────────────────────────────────────────────────────────
type TabKey = 'available' | 'my';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'available', label: 'Mã giảm giá', icon: Icons.giftOutline },
  { key: 'my',        label: 'Của tôi',      icon: Icons.bookmarkOutline },
];

const TIERS: UserTier[] = ['bronze', 'silver', 'gold', 'diamond'];

const TIER_LABELS: Record<UserTier, string> = {
  bronze:  'Bronze',
  silver:  'Silver',
  gold:    'Gold',
  diamond: 'Diamond',
};

const TIER_GRADIENTS: Record<UserTier, [string, string, string]> = {
  bronze:  ['#92400E', '#B45309', '#D97706'],
  silver:  ['#475569', '#64748B', '#94A3B8'],
  gold:    ['#B45309', '#D97706', '#FBBF24'],
  diamond: ['#0369A1', '#38BDF8', '#BAE6FD'],
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function nextTier(t: UserTier): string {
  if (t === 'bronze') return 'Silver';
  if (t === 'silver') return 'Gold';
  if (t === 'gold')   return 'Diamond';
  return '';
}

function computePointsToNext(tier: UserTier, points: number) {
  const thresholds: Record<UserTier, number> = { bronze: 500, silver: 2000, gold: 5000, diamond: 5000 };
  const prev: Record<UserTier, number>       = { bronze: 0,   silver: 500,  gold: 2000,  diamond: 5000 };
  if (tier === 'diamond') return null;
  const next     = thresholds[tier];
  const from     = prev[tier];
  const progress = Math.min(1, Math.max(0, (points - from) / (next - from)));
  const remaining = Math.max(0, next - points);
  return { progress, remaining, target: next };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Không giới hạn';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ─── CouponTab Segmented Control ───────────────────────────────────────────────
const CouponTabs: React.FC<{ value: TabKey; onChange: (v: TabKey) => void }> = ({ value, onChange }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = useState(0);
  const activeIndex = TABS.findIndex((t) => t.key === value);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / TABS.length;
    setTabWidth(w);
    slideAnim.setValue(activeIndex * w);
  };

  const handlePress = (key: TabKey) => {
    const idx = TABS.findIndex((t) => t.key === key);
    Animated.spring(slideAnim, { toValue: idx * tabWidth, tension: 80, friction: 12, useNativeDriver: true }).start();
    onChange(key);
  };

  return (
    <View style={ctab.wrapper} onLayout={onLayout}>
      {tabWidth > 0 && (
        <Animated.View style={[ctab.pill, { width: tabWidth, transform: [{ translateX: slideAnim }] }]} />
      )}
      {TABS.map((tab) => {
        const isActive = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={ctab.tab}
            onPress={() => handlePress(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon name={tab.icon} size={18} color={isActive ? '#10B981' : '#94A3B8'} />
            <Text style={[ctab.label, isActive && ctab.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const ctab = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    height: 48,
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#94A3B8',
  },
  labelActive: {
    fontFamily: 'Outfit_700Bold',
    color: '#10B981',
  },
});

// ─── Tier Selector ─────────────────────────────────────────────────────────────
const TierSelector: React.FC<{ currentTier: UserTier }> = ({ currentTier }) => {
  const colors = useColors();
  return (
    <View style={[ts.container, { backgroundColor: colors.surface }]}>
      {TIERS.map((tier, idx) => {
        const isActive   = tier === currentTier;
        const isAchieved = TIERS.indexOf(tier) <= TIERS.indexOf(currentTier);
        return (
          <View
            key={tier}
            style={[
              ts.item,
              isActive && { backgroundColor: colors.primarySubtle, borderColor: colors.primary },
            ]}
          >
            <View style={{ opacity: isAchieved ? 1 : 0.35 }}>
              <TierBadge tier={tier} />
            </View>
            <Text style={[ts.label, isActive && { color: colors.primary, fontWeight: '700' }]}>
              {TIER_LABELS[tier]}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const ts = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: '#64748B',
  },
});

// ─── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: progress, duration: 800, useNativeDriver: false }).start();
  }, [progress]);

  return (
    <View style={pb.track}>
      <Animated.View
        style={[pb.fill, { width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
};

const pb = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  fill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
  },
});

// ─── Reward Hero Card ──────────────────────────────────────────────────────────
const RewardHeroCard: React.FC<{
  tier: UserTier;
  points: number;
  pointsToNext: ReturnType<typeof computePointsToNext>;
  onRedeem: () => void;
  onSpin: () => void;
}> = ({ tier, points, pointsToNext, onRedeem, onSpin }) => {
  const colors = useColors();
  return (
    <LinearGradient
      colors={TIER_GRADIENTS[tier]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={hero.card}
    >
      {/* Decorative blobs */}
      <View style={hero.blob1} />
      <View style={hero.blob2} />

      {/* Top row: label + badge */}
      <View style={hero.topRow}>
        <Text style={hero.cardLabel}>Điểm tích lũy</Text>
        <TierBadge tier={tier} />
      </View>

      {/* Points */}
      <View style={hero.pointsRow}>
        <Icon name={Icons.star} size={28} color="#FFFFFF" style={{ marginTop: 2 }} />
        <Text style={hero.pointsValue}>{points.toLocaleString('vi-VN')}</Text>
        <Text style={hero.pointsUnit}>điểm</Text>
      </View>

      {/* Progress */}
      {pointsToNext && (
        <>
          <ProgressBar progress={pointsToNext.progress} />
          <Text style={hero.hint}>
            Còn {pointsToNext.remaining.toLocaleString('vi-VN')} điểm để lên hạng {nextTier(tier)}
          </Text>
        </>
      )}
      {!pointsToNext && (
        <Text style={hero.hint}>Bạn đang ở hạng cao nhất — tận hưởng đặc quyền Diamond ✦</Text>
      )}

      {/* Redeem CTA */}
      <PressableScale
        style={hero.redeemBtn}
        onPress={onRedeem}
        accessibilityLabel="Đổi điểm lấy voucher"
      >
        <Icon name={Icons.refreshOutline} size={18} color={colors.primary} />
        <Text style={[hero.redeemText, { color: colors.primary }]}>Đổi điểm lấy voucher</Text>
        <Icon name={Icons.forward} size={16} color={colors.primary} />
      </PressableScale>

      {/* Spin CTA — opens the lucky wheel (mirrors Web GiftStorePage "Vòng quay") */}
      <PressableScale
        style={[hero.redeemBtn, hero.spinBtn]}
        onPress={onSpin}
        accessibilityLabel="Vòng quay may mắn"
      >
        <Icon name={Icons.sparkle} size={18} color="#FFFFFF" />
        <Text style={[hero.redeemText, hero.spinBtnText]}>Vòng quay may mắn</Text>
        <Icon name={Icons.forward} size={16} color="#FFFFFF" />
      </PressableScale>
    </LinearGradient>
  );
};

const hero = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: layout.cardRadius,
    padding: 24,
    overflow: 'hidden',
    ...shadows.md,
  },
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -70,
    right: -60,
  },
  blob2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -50,
    left: -30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  pointsValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 44,
    color: '#FFFFFF',
    lineHeight: 50,
    letterSpacing: -1,
  },
  pointsUnit: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    lineHeight: 18,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  redeemText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    flex: 1,
    textAlign: 'center',
  },
  spinBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  spinBtnText: {
    color: '#FFFFFF',
  },
});

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title, subtitle, action,
}) => (
  <View style={sh.row}>
    <View style={sh.textCol}>
      <Text style={sh.title}>{title}</Text>
      {subtitle && <Text style={sh.subtitle}>{subtitle}</Text>}
    </View>
    {action}
  </View>
);

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  textCol: { flex: 1 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#0F172A', letterSpacing: 0.1 },
  subtitle: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#94A3B8', marginTop: 2 },
});

// ─── Voucher Card ──────────────────────────────────────────────────────────────
const VoucherCard: React.FC<{
  voucher: Voucher;
  tier: UserTier;
  isRedeemable?: boolean;
  onPress: () => void;
}> = ({ voucher, tier, isRedeemable, onPress }) => {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Voucher ${voucher.title || voucher.code}`}
    >
      <View style={vc.card}>
        {/* Left: discount preview */}
        <LinearGradient
          colors={TIER_GRADIENTS[tier]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={vc.discountSection}
        >
          <View style={vc.discountBlob} />
          <Text style={vc.discountValue}>
            {voucher.type === 'percentage'
              ? `${voucher.value}%`
              : formatCurrency(voucher.value)}
          </Text>
          <Text style={vc.discountLabel}>GIẢM</Text>
          {/* Perforation notches */}
          <View style={[vc.notchTop, { backgroundColor: colors.background }]} />
          <View style={[vc.notchBottom, { backgroundColor: colors.background }]} />
        </LinearGradient>

        {/* Dashed divider */}
        <View style={vc.divider} />

        {/* Right: details */}
        <View style={vc.infoSection}>
          <Text style={vc.voucherName} numberOfLines={1}>
            {voucher.name || voucher.code}
          </Text>
          <Text style={vc.description} numberOfLines={2}>
            {voucher.description || `Mã: ${voucher.code}`}
          </Text>

          {/* Meta row */}
          {(voucher.minOrder && voucher.minOrder > 0) || voucher.maxDiscount ? (
            <View style={vc.metaRow}>
              {voucher.minOrder && voucher.minOrder > 0 ? (
                <View style={vc.metaItem}>
                  <Icon name={Icons.cartOutline} size={12} color="#94A3B8" />
                  <Text style={vc.metaText}>Tối thiểu {formatCurrency(voucher.minOrder)}</Text>
                </View>
              ) : null}
              {voucher.maxDiscount ? (
                <View style={vc.metaItem}>
                  <Icon name={Icons.arrowUp} size={12} color="#94A3B8" />
                  <Text style={vc.metaText}>Tối đa {formatCurrency(voucher.maxDiscount)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Footer */}
          <View style={vc.footer}>
            <View style={vc.expiryRow}>
              <Icon name={Icons.timeOutline} size={13} color="#F59E0B" />
              <Text style={vc.expiry}>HSD: {formatDate(voucher.endDate)}</Text>
            </View>
            {isRedeemable && voucher.requiredPoints ? (
              <Badge label={`${voucher.requiredPoints} điểm`} variant="warning" size="small" />
            ) : null}
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

const MyVoucherCard: React.FC<{
  voucher: UserVoucher;
  onPress: () => void;
}> = ({ voucher, onPress }) => {
  const colors = useColors();
  const isUsed = !!voucher.used;

  return (
    <PressableScale onPress={onPress} accessibilityRole="button">
      <View style={[vc.card, isUsed && vc.cardUsed]}>
        {/* Left: discount preview */}
        <View
          style={[
            vc.discountSection,
            { backgroundColor: isUsed ? '#CBD5E1' : colors.primary },
          ]}
        >
          <Text style={vc.discountValue}>
            {voucher.type === 'percentage'
              ? `${voucher.value}%`
              : formatCurrency(voucher.value)}
          </Text>
          <Text style={vc.discountLabel}>{isUsed ? 'ĐÃ DÙNG' : 'GIẢM'}</Text>
          <View style={[vc.notchTop, { backgroundColor: colors.background }]} />
          <View style={[vc.notchBottom, { backgroundColor: colors.background }]} />
        </View>

        <View style={vc.divider} />

        {/* Right: details */}
        <View style={vc.infoSection}>
          <View style={vc.myVoucherHeader}>
            <Text style={vc.voucherName} numberOfLines={1}>{voucher.name || voucher.code}</Text>
            <Badge label={isUsed ? 'Đã dùng' : 'Còn hạn'} variant={isUsed ? 'default' : 'success'} size="small" />
          </View>
          <Text style={vc.description} numberOfLines={1}>Mã: {voucher.code}</Text>
          {voucher.usedAt ? (
            <Text style={vc.usedAt}>Đã dùng: {formatDate(voucher.usedAt)}</Text>
          ) : null}
          <View style={vc.expiryRow}>
            <Icon name={Icons.timeOutline} size={13} color="#F59E0B" />
            <Text style={vc.expiry}>HSD: {formatDate(voucher.endDate)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

const vc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: layout.cardRadius,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    minHeight: 110,
    ...shadows.md,
  },
  cardUsed: { opacity: 0.65 },
  discountSection: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: 16,
  },
  discountBlob: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -28,
    right: -28,
  },
  discountValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  discountLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  notchTop: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    top: -9,
    right: -1,
  },
  notchBottom: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    bottom: -9,
    right: -1,
  },
  divider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  infoSection: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    gap: 4,
  },
  myVoucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  voucherName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiry: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  usedAt: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
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
  const [myVouchers, setMyVouchers]   = useState<UserVoucher[]>([]);
  const [gifts, setGifts]             = useState<Gift[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setIsLoading(false); return; }
    try {
      const [availableRes, myRes, giftsRes] = await Promise.all([
        voucherApi.getAvailableVouchers(),
        voucherApi.getMyVouchers(),
        // Public gifts power the "Phần thưởng vòng quay" preview strip below.
        // Endpoint is unauthenticated; safe to call even if the user is a
        // guest (response is empty in that case anyway).
        giftApi.getPublicGifts().catch(() => [] as Gift[]),
      ]);
      setAvailableVouchers(availableRes);
      setMyVouchers(myRes);
      setGifts(Array.isArray(giftsRes) ? giftsRes : []);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Not authenticated ─────────────────────────────────────────────────────
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

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Data ──────────────────────────────────────────────────────────────────
  const allAvailable = [
    ...(availableVouchers?.public || []),
    ...(availableVouchers?.tierExclusive || []),
    ...(availableVouchers?.redeemable || []),
  ];
  const tier         = (user?.tier || 'bronze') as UserTier;
  const points       = user?.loyaltyPoints || 0;
  const pointsToNext = computePointsToNext(tier, points);

  return (
    <ScreenContainer background="subtle">
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ưu đãi</Text>
          <Text style={styles.headerSubtitle}>Tích điểm, đổi quà và nhiều ưu đãi hấp dẫn</Text>
        </View>
        <PressableScale
          onPress={() => router.push({ pathname: '/voucher', params: { tab: 'my' } })}
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
        {/* ── Hero Card ── */}
        <RewardHeroCard
          tier={tier}
          points={points}
          pointsToNext={pointsToNext}
          onRedeem={() => setActiveTab('available')}
          onSpin={() => router.push('/gifts/spin' as any)}
        />

        {/* ── Tier Selector ── */}
        <SectionHeader title="Hạng thành viên" subtitle="Tích điểm để nâng hạng đặc quyền" />
        <TierSelector currentTier={tier} />

        {/* ── Prize Preview — shows the gifts the user can win on the wheel.
              Mirrors FE GiftStoreSection "Vòng quay" tab: each gift becomes a
              card with a probability pill so the user knows what's at stake
              before tapping "Vòng quay may mắn". Skips render if the BE
              returned no active gifts. ── */}
        {gifts.length > 0 && (
          <>
            <SectionHeader
              title="Phần thưởng vòng quay"
              subtitle={`${gifts.length} giải đang chờ bạn`}
              action={
                <PressableScale
                  onPress={() => router.push('/gifts/spin' as any)}
                  style={styles.viewAllBtn}
                  accessibilityLabel="Mở vòng quay may mắn"
                >
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>Quay ngay</Text>
                  <Icon name={Icons.forward} size={14} color={colors.primary} />
                </PressableScale>
              }
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prizeScroll}
            >
              {gifts.map((g) => {
                const isFixed = g.type === 'fixed';
                const isPercent = g.type === 'percentage';
                const labelText =
                  g.type === 'none'
                    ? (g.name || 'May mắn')
                    : isPercent
                      ? `Giảm ${g.value}%`
                      : isFixed
                        ? `Giảm ${formatCurrency(g.value ?? 0)}`
                        : (g.name || 'Phần thưởng');
                const probability = typeof g.probability === 'number' ? g.probability : null;
                const accent = g.color || colors.primary;
                return (
                  <View
                    key={g._id || g.id}
                    style={[styles.prizeCard, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <View style={[styles.prizeAccent, { backgroundColor: accent }]} />
                    <View style={styles.prizeBody}>
                      <AppText variant="label" color="textTertiary" style={styles.prizeLabel}>
                        Phần thưởng
                      </AppText>
                      <AppText variant="h4" color="textPrimary" numberOfLines={1} style={styles.prizeTitle}>
                        {labelText}
                      </AppText>
                      {g.description ? (
                        <AppText variant="caption" color="textSecondary" numberOfLines={2} style={styles.prizeDesc}>
                          {g.description}
                        </AppText>
                      ) : null}
                      {probability !== null ? (
                        <View style={[styles.probPill, { backgroundColor: `${accent}22` }]}>
                          <Text style={[styles.probText, { color: accent }]}>Tỉ lệ {probability}%</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Coupon Section ── */}
        <SectionHeader
          title="Voucher & Ưu đãi"
          subtitle={activeTab === 'available' ? `${allAvailable.length} voucher khả dụng` : `${myVouchers.length} voucher của bạn`}
          action={
            <PressableScale
              onPress={() => router.push({ pathname: '/voucher', params: { tab: 'my' } })}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>Xem tất cả</Text>
              <Icon name={Icons.forward} size={14} color={colors.primary} />
            </PressableScale>
          }
        />

        {/* ── Tab Switcher ── */}
        <CouponTabs value={activeTab} onChange={setActiveTab} />

        {/* ── Voucher List ── */}
        <View style={styles.voucherList}>
          {activeTab === 'available' ? (
            allAvailable.length > 0 ? (
              allAvailable.map((voucher) => (
                <VoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  tier={tier}
                  isRedeemable={!!availableVouchers?.redeemable?.some((v) => v._id === voucher._id)}
                  onPress={() => router.push({ pathname: '/voucher/[id]' as any, params: { id: voucher._id } })}
                />
              ))
            ) : (
              <View style={styles.emptyWrapper}>
                <EmptyState
                  iconName={Icons.voucherOutline}
                  title="Không có voucher"
                  message="Hiện tại không có voucher nào khả dụng"
                />
              </View>
            )
          ) : myVouchers.length > 0 ? (
            myVouchers.map((voucher) => (
              <MyVoucherCard
                key={voucher._id}
                voucher={voucher}
                onPress={() => router.push({ pathname: '/voucher/[id]' as any, params: { id: voucher._id } })}
              />
            ))
          ) : (
            <View style={styles.emptyWrapper}>
              <EmptyState
                iconName={Icons.voucherOutline}
                title="Chưa có voucher"
                message="Bạn chưa có voucher nào. Hãy đổi điểm để nhận voucher!"
                actionLabel="Khám phá ưu đãi"
                onAction={() => setActiveTab('available')}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Screen-level Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '400',
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 48,
  },
  voucherList: {
    paddingTop: 8,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyWrapper: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  skeletonHeader: { padding: 20 },
  skeletonList:   { paddingHorizontal: 20 },
  skeletonCard:   { marginBottom: 12, borderRadius: 16 },

  // Prize preview (gifts/spin wheel)
  prizeScroll: {
    paddingHorizontal: 20,
    gap: spacing.sm,
    paddingBottom: 4,
  },
  prizeCard: {
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.sm,
  },
  prizeAccent: {
    width: 6,
  },
  prizeBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  prizeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
    fontWeight: '700',
  },
  prizeTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  prizeDesc: {
    lineHeight: 16,
  },
  probPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
  },
  probText: {
    fontSize: 11,
    fontWeight: '700',
  },
});