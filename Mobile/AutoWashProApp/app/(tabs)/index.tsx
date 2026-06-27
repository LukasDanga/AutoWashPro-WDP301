/**
 * AutoWashPro Home Screen
 * Dashboard with stats and quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { publicApi, branchApi, packageApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading, 
  EmptyState,
  Badge 
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { PublicStats, Branch, Package, Booking } from '../../src/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();

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
      setBranches(branchesRes.slice(0, 3)); // Top 3 branches
      setPackages(packagesRes.slice(0, 4)); // Top 4 packages
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
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <AppText variant="bodySmall" color="textSecondary">
              {getGreeting()}
            </AppText>
            <AppText variant="h2" style={styles.userName}>
              {user?.name || 'Khách hàng'}
            </AppText>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Welcome Banner */}
        <Card 
          style={styles.welcomeBanner}
          padding={spacing.lg}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeText}>
              <AppText variant="h3" color="textInverse">
                Rửa xe nhanh chóng
              </AppText>
              <AppText 
                variant="bodySmall" 
                color="textInverse" 
                style={styles.welcomeSubtext}
              >
                Đặt lịch rửa xe ngay hôm nay
              </AppText>
            </View>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => router.push('/booking')}
            >
              <AppText variant="buttonSmall" color="primary">
                Đặt ngay
              </AppText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* User Stats (if logged in) */}
        {isAuthenticated && user && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{user.loyaltyPoints}</Text>
                <Text style={styles.statLabel}>Điểm tích lũy</Text>
              </Card>
              <Card style={styles.statCard}>
                <Badge 
                  label={user.tier?.toUpperCase() || 'BRONZE'} 
                  variant="primary" 
                  size="small"
                />
                <Text style={styles.statLabel}>Hạng thành viên</Text>
              </Card>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <AppText variant="h4">Dịch vụ nhanh</AppText>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/booking')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.quickActionEmoji}>🚗</Text>
            </View>
            <AppText variant="bodySmall" style={styles.quickActionText}>
              Đặt lịch rửa
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/rewards')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.warningLight }]}>
              <Text style={styles.quickActionEmoji}>🎟️</Text>
            </View>
            <AppText variant="bodySmall" style={styles.quickActionText}>
              Voucher
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/history')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.successLight }]}>
              <Text style={styles.quickActionEmoji}>📋</Text>
            </View>
            <AppText variant="bodySmall" style={styles.quickActionText}>
              Lịch sử
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/profile')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.infoLight }]}>
              <Text style={styles.quickActionEmoji}>👤</Text>
            </View>
            <AppText variant="bodySmall" style={styles.quickActionText}>
              Tài khoản
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Featured Packages */}
        <View style={styles.sectionHeader}>
          <AppText variant="h4">Gói dịch vụ</AppText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/booking')}>
            <AppText variant="bodySmall" color="primary">
              Xem tất cả
            </AppText>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.packageList}
        >
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg._id}
              style={styles.packageCard}
              onPress={() => router.push({
                pathname: '/booking',
                params: { packageId: pkg._id }
              })}
            >
              <View style={styles.packageImagePlaceholder}>
                <Text style={styles.packageEmoji}>✨</Text>
              </View>
              <View style={styles.packageInfo}>
                <AppText variant="bodySmall" style={styles.packageName} numberOfLines={1}>
                  {pkg.name}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {pkg.duration} phút
                </AppText>
                <AppText variant="bodySmall" color="primary" style={styles.packagePrice}>
                  {formatCurrency(pkg.price)}
                </AppText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Nearby Branches */}
        <View style={styles.sectionHeader}>
          <AppText variant="h4">Chi nhánh gần bạn</AppText>
          <TouchableOpacity onPress={() => router.push('/branch/' as const)}>
            <AppText variant="bodySmall" color="primary">
              Xem bản đồ
            </AppText>
          </TouchableOpacity>
        </View>
        {branches.length > 0 ? (
          branches.map((branch) => (
            <TouchableOpacity
              key={branch._id}
              onPress={() => router.push({
                pathname: '/branch/[id]',
                params: { id: branch._id }
              })}
            >
              <Card style={styles.branchCard} padding={spacing.md}>
                <View style={styles.branchInfo}>
                  <View style={styles.branchIcon}>
                    <Text style={styles.branchEmoji}>📍</Text>
                  </View>
                  <View style={styles.branchDetails}>
                    <AppText variant="bodySmall" style={styles.branchName}>
                      {branch.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {branch.address}
                    </AppText>
                    <AppText variant="caption" color="textTertiary">
                      {branch.openingTime} - {branch.closingTime}
                    </AppText>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            title="Không có chi nhánh"
            message="Hiện tại không có chi nhánh nào hoạt động"
          />
        )}

        {/* App Stats */}
        {stats && (
          <View style={styles.sectionHeader}>
            <AppText variant="h4">AutoWashPro</AppText>
          </View>
        )}
        {stats && (
          <Card style={styles.appStatsCard}>
            <View style={styles.appStatsGrid}>
              <View style={styles.appStatItem}>
                <Text style={styles.appStatValue}>
                  {(stats.totalBookings ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.appStatLabel}>Lượt đặt</Text>
              </View>
              <View style={styles.appStatDivider} />
              <View style={styles.appStatItem}>
                <Text style={styles.appStatValue}>
                  {(stats.totalCustomers ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.appStatLabel}>Khách hàng</Text>
              </View>
              <View style={styles.appStatDivider} />
              <View style={styles.appStatItem}>
                <Text style={styles.appStatValue}>
                  {(stats.averageRating ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.appStatLabel}>Đánh giá</Text>
              </View>
            </View>
          </Card>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userName: {
    color: colors.textPrimary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  notificationBadgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  welcomeBanner: {
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    flex: 1,
  },
  welcomeSubtext: {
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  bookButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statsContainer: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  packageList: {
    paddingRight: spacing.md,
  },
  packageCard: {
    width: 140,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  packageImagePlaceholder: {
    height: 80,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageEmoji: {
    fontSize: 32,
  },
  packageInfo: {
    padding: spacing.sm,
  },
  packageName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  packagePrice: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  branchCard: {
    marginBottom: spacing.sm,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  branchEmoji: {
    fontSize: 18,
  },
  branchDetails: {
    flex: 1,
  },
  branchName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  appStatsCard: {
    marginBottom: spacing.lg,
  },
  appStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  appStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  appStatValue: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  appStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
