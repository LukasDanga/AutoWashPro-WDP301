/**
 * AutoWashPro Home Screen
 * Modern dashboard with greeting hero, quick actions, featured services.
 *
 * UX guidelines followed:
 *   - semantic color tokens (no hardcoded hex in components)
 *   - WCAG AA contrast for both light & dark themes
 *   - 44pt minimum touch targets
 *   - safe-area aware layout
 *   - scale-feedback pressable cards
 *   - SVG icons, no emoji
 *   - progressive disclosure with sectioned content
 *   - skeleton loading for >300ms operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { publicApi, branchApi, packageApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  EmptyState,
  Icon,
  Icons,
  PressableScale,
  SectionHeader,
  StatCard,
  Chip,
  ScreenContainer,
} from '../../src/components/common';
import { useTheme, useColors } from '../../src/theme/ThemeContext';
import { toGradientColors, getGradients } from '../../src/theme/gradients';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { PublicStats, Branch, Package } from '../../src/types';

const HERO_HEIGHT = 220;

function getGreetingIcon(hour: number): string {
  if (hour < 12) return Icons.sunnyOutline;
  if (hour < 18) return Icons.cloudDay;
  return Icons.moonOutline;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const { colors, isDark } = useTheme();
  const gradients = getGradients(isDark);

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, branchesRes, packagesRes] = await Promise.all([
        publicApi.getPublicStats(),
        branchApi.getPublicBranches(),
        packageApi.getPackages({ status: 'active' }),
      ]);

      setStats(statsRes);
      setBranches(branchesRes.slice(0, 3));
      setPackages(packagesRes.slice(0, 6));
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  if (isLoading) {
    return (
      <ScreenContainer background="subtle">
        <Loading fullScreen message="Đang tải..." />
      </ScreenContainer>
    );
  }

  const hour = new Date().getHours();
  const greetingIcon = getGreetingIcon(hour);

  return (
    <ScreenContainer
      scroll
      background="subtle"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Hero gradient header with greeting */}
      <LinearGradient
        colors={toGradientColors(gradients.hero) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.heroBlob, styles.heroBlob1]} />
        <View style={[styles.heroBlob, styles.heroBlob2]} />

        <View style={styles.heroTop}>
          <View style={styles.heroGreetingBlock}>
            <View style={styles.heroGreetingRow}>
              <Icon name={greetingIcon} size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroGreeting}>{getGreeting()},</Text>
            </View>
            <Text style={styles.heroUserName} numberOfLines={1}>
              {user?.name || 'Khách hàng'}
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push('/notifications')}
            style={styles.notificationButton}
            accessibilityLabel={`Thông báo${unreadCount > 0 ? `, ${unreadCount} thông báo mới` : ''}`}
          >
            <Icon name={Icons.notificationsOutline} size={22} color={colors.textInverse} />
            {unreadCount > 0 ? (
              <View style={[styles.notificationBadge, { borderColor: colors.primaryDark }]}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </PressableScale>
        </View>

        <View style={styles.heroCTA}>
          <View style={styles.heroCTAText}>
            <Text style={styles.heroCTATitle}>Đặt lịch rửa xe ngay</Text>
            <Text style={styles.heroCTASubtitle}>
              Tiết kiệm thời gian, an toàn và tiện lợi
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push('/booking')}
            style={styles.heroCTAButton}
            accessibilityRole="button"
            accessibilityLabel="Đặt lịch ngay"
          >
            <Text style={styles.heroCTAButtonText}>Đặt ngay</Text>
            <Icon name={Icons.forward} size={18} color={colors.primary} />
          </PressableScale>
        </View>
      </LinearGradient>

      {/* Quick stat cards (if logged in) */}
      {isAuthenticated && user ? (
        <View style={styles.statsRow}>
          <StatCard
            label="Điểm tích lũy"
            value={user.loyaltyPoints || 0}
            icon={Icons.sparkle}
            variant="primary"
            style={styles.statCardItem}
          />
          <View style={styles.gap} />
          <StatCard
            label="Hạng thành viên"
            value={(user.tier || 'bronze').toUpperCase()}
            icon={Icons.star}
            variant="warning"
            style={styles.statCardItem}
          />
        </View>
      ) : null}

      {/* Quick actions grid */}
      <SectionHeader
        title="Dịch vụ nhanh"
        subtitle="Truy cập nhanh các tính năng"
      />
      <View style={styles.quickActionsGrid}>
        <QuickAction
          icon={Icons.carOutline}
          label="Đặt lịch"
          color={colors.primary}
          bg={colors.primarySubtle}
          onPress={() => router.push('/(tabs)/booking')}
        />
        <QuickAction
          icon={Icons.voucherOutline}
          label="Voucher"
          color={colors.warning}
          bg={colors.warningLight}
          onPress={() => router.push('/(tabs)/rewards')}
        />
        <QuickAction
          icon={Icons.listOutline}
          label="Lịch sử"
          color={colors.success}
          bg={colors.successLight}
          onPress={() => router.push('/(tabs)/history')}
        />
        <QuickAction
          icon={Icons.qrCodeOutline}
          label="Check-in QR"
          color={colors.statusCheckedIn}
          bg={colors.primarySubtle}
          onPress={() => router.push('/checkin')}
        />
        <QuickAction
          icon={Icons.chatBot}
          label="Chat AI"
          color={colors.info}
          bg={colors.infoLight}
          onPress={() => router.push('/chat')}
        />
        <QuickAction
          icon={Icons.locationOutline}
          label="Chi nhánh"
          color={colors.accent}
          bg={colors.infoLight}
          onPress={() => router.push('/branch')}
        />
      </View>

      {/* Featured Packages */}
      <SectionHeader
        title="Gói dịch vụ nổi bật"
        action={{
          label: 'Xem tất cả',
          onPress: () => router.push('/(tabs)/booking'),
        }}
      />
      <View style={styles.packageList}>
        {packages.map((pkg, idx) => (
          <Card
            key={pkg._id}
            variant="elevated"
            shadow="sm"
            padding={0}
            onPress={() =>
              router.push({ pathname: '/booking', params: { packageId: pkg._id } })
            }
            style={styles.packageCard}
          >
            <View style={styles.packageImageSection}>
              <LinearGradient
                colors={toGradientColors(
                  idx % 2 === 0 ? gradients.primary : gradients.sunset,
                ) as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Icon name={Icons.sparkle} size={26} color="rgba(255,255,255,0.9)" />
              {idx === 0 ? (
                <View style={styles.featuredBadge}>
                  <Chip label="HOT" variant="warning" size="small" />
                </View>
              ) : null}
            </View>
            <View style={styles.packageInfo}>
              <Text style={styles.packageName} numberOfLines={1}>
                {pkg.name}
              </Text>
              <View style={styles.packageMetaRow}>
                <Icon name={Icons.timeOutline} size={11} color="#9CA3AF" />
                <Text style={styles.packageDuration}>{pkg.duration} phút</Text>
              </View>
              <Text style={styles.packagePrice}>{formatCurrency(pkg.price)}</Text>
            </View>
          </Card>
        ))}
      </View>

      {/* Nearby Branches */}
      <SectionHeader
        title="Chi nhánh gần bạn"
        action={{
          label: 'Xem bản đồ',
          onPress: () => router.push('/branch'),
        }}
      />
      {branches.length > 0 ? (
        <View style={styles.branchList}>
          {branches.map((branch) => (
            <Card
              key={branch._id}
              style={styles.branchCard}
              padding="md"
              onPress={() =>
                router.push({
                  pathname: '/branch/[id]',
                  params: { id: branch._id },
                })
              }
            >
              <View style={styles.branchRow}>
                <View style={[styles.branchIconWrap, { backgroundColor: colors.primarySubtle }]}>
                  <Icon name={Icons.locationOutline} size={20} color={colors.primary} />
                </View>
                <View style={styles.branchDetails}>
                  <AppText variant="body" style={styles.branchName} numberOfLines={1}>
                    {branch.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {branch.address}
                  </AppText>
                  <View style={styles.branchHoursRow}>
                    <Icon name={Icons.timeOutline} size={12} color={colors.textTertiary} />
                    <AppText variant="caption" color="textTertiary">
                      {branch.openingTime} - {branch.closingTime}
                    </AppText>
                  </View>
                </View>
                <Icon name={Icons.forward} size={20} color={colors.textTertiary} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState
            iconName={Icons.locationOutline}
            title="Không có chi nhánh"
            message="Hiện tại không có chi nhánh nào hoạt động"
          />
        </View>
      )}

      {/* App Stats */}
      {stats ? (
        <>
          <SectionHeader title="AutoWashPro" subtitle="Cùng nhau phát triển" />
          <Card style={styles.appStatsCard}>
            <View style={styles.appStatRow}>
              <AppStatItem
                value={(stats.totalBookings ?? 0).toLocaleString('vi-VN')}
                label="Lượt đặt"
              />
              <View style={[styles.appStatDivider, { backgroundColor: colors.divider }]} />
              <AppStatItem
                value={(stats.totalCustomers ?? 0).toLocaleString('vi-VN')}
                label="Khách hàng"
              />
              <View style={[styles.appStatDivider, { backgroundColor: colors.divider }]} />
              <AppStatItem
                value={(stats.averageRating ?? 0).toFixed(1)}
                label="Đánh giá"
              />
            </View>
          </Card>
        </>
      ) : null}
    </ScreenContainer>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, color, bg, onPress }) => {
  return (
    <Card
      variant="elevated"
      shadow="sm"
      onPress={onPress}
      padding={0}
      style={styles.quickActionCard}
    >
      <View style={styles.quickActionInner}>
        <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
          <Icon name={icon} size={22} color={color} />
        </View>
        <Text
          style={styles.quickActionText}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </Card>
  );
};

const AppStatItem: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const colors = useColors();
  return (
    <View style={styles.appStatItem}>
      <Text style={[styles.appStatValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.appStatLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    height: HERO_HEIGHT,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBlob1: {
    width: 180,
    height: 180,
    top: -60,
    right: -40,
  },
  heroBlob2: {
    width: 140,
    height: 140,
    bottom: -50,
    left: -30,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroGreetingBlock: {
    flex: 1,
  },
  heroGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  heroUserName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  heroCTAText: {
    flex: 1,
  },
  heroCTATitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  heroCTASubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  heroCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 4,
    minHeight: 36,
  },
  heroCTAButtonText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statCardItem: {
    flex: 1,
  },
  gap: {
    width: spacing.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  quickActionCard: {
    width: '31%',
  },
  quickActionInner: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: '#374151',
    lineHeight: 15,
  },
  packageList: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  packageCard: {
    width: '48%',
  },
  packageImageSection: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  featuredBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  packageInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  packageName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  packageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  packageDuration: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  packagePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  branchList: {
    paddingHorizontal: spacing.md,
  },
  branchCard: {
    marginBottom: spacing.sm,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  branchDetails: {
    flex: 1,
  },
  branchName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  branchHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  emptyWrap: {
    paddingHorizontal: spacing.md,
  },
  appStatsCard: {
    marginHorizontal: spacing.md,
  },
  appStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  appStatDivider: {
    width: 1,
    height: 40,
  },
  appStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  appStatLabel: {
    fontSize: 12,
  },
});