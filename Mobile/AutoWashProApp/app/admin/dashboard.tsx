/**
 * AutoWashPro Admin Dashboard Screen
 * Admin/Manager overview and quick stats
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { publicApi, bookingApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  change?: string;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [stats, setStats] = useState<{
    totalBookings: number;
    totalCustomers: number;
    totalBranches: number;
    averageRating: number;
    todayBookings: number;
    pendingBookings: number;
    revenue: number;
  } | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const publicStats = await publicApi.getPublicStats();
      setStats({
        ...publicStats,
        todayBookings: Math.floor(publicStats.totalBookings / 30), // Mock
        pendingBookings: Math.floor(publicStats.totalBookings / 10), // Mock
        revenue: publicStats.totalBookings * 150000, // Mock
      });

      // Fetch recent bookings
      const bookingsRes = await bookingApi.getMyBookings({ limit: 5 });
      setRecentBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'manager')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Dashboard</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <AppText variant="h3">Không có quyền truy cập</AppText>
          <AppText variant="body" color="textSecondary" style={styles.unauthorizedText}>
            Chỉ quản trị viên và quản lý mới có quyền truy cập
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải dashboard..." />;
  }

  const statCards: StatCard[] = [
    {
      title: 'Đơn hàng hôm nay',
      value: stats?.todayBookings || 0,
      icon: '📅',
      color: colors.primary,
    },
    {
      title: 'Chờ duyệt',
      value: stats?.pendingBookings || 0,
      icon: '⏳',
      color: colors.warning,
    },
    {
      title: 'Khách hàng',
      value: stats?.totalCustomers || 0,
      icon: '👥',
      color: colors.success,
    },
    {
      title: 'Doanh thu tháng',
      value: formatCurrency(stats?.revenue || 0),
      icon: '💰',
      color: colors.info,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Dashboard</AppText>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View>
            <AppText variant="bodySmall" color="textInverse" style={styles.welcomeSubtext}>
              Xin chào,
            </AppText>
            <AppText variant="h3" color="textInverse">
              {user?.name}
            </AppText>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'Quản trị viên' : 'Quản lý'}
              </Text>
            </View>
          </View>
          <Text style={styles.welcomeIcon}>📊</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCardWrapper}>
              <Card style={[styles.statCard, { borderLeftColor: stat.color, borderLeftWidth: 4 }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <AppText variant="h2" style={styles.statValue}>
                  {stat.value}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {stat.title}
                </AppText>
              </Card>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <AppText variant="h4" style={styles.sectionTitle}>
            Thao tác nhanh
          </AppText>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/admin/bookings' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.quickActionEmoji}>📋</Text>
              </View>
              <AppText variant="caption">Đơn đặt</AppText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/admin/customers' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.successLight }]}>
                <Text style={styles.quickActionEmoji}>👥</Text>
              </View>
              <AppText variant="caption">Khách hàng</AppText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/admin/branches' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.warningLight }]}>
                <Text style={styles.quickActionEmoji}>🏪</Text>
              </View>
              <AppText variant="caption">Chi nhánh</AppText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/admin/packages' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.infoLight }]}>
                <Text style={styles.quickActionEmoji}>📦</Text>
              </View>
              <AppText variant="caption">Dịch vụ</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h4">Hoạt động gần đây</AppText>
            <TouchableOpacity onPress={() => router.push('/admin/bookings' as any)}>
              <AppText variant="bodySmall" color="primary">
                Xem tất cả
              </AppText>
            </TouchableOpacity>
          </View>
          
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <TouchableOpacity
                key={booking._id}
                onPress={() => router.push(`/booking/${booking._id}`)}
              >
                <Card style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityEmoji}>📅</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <AppText variant="body" style={styles.activityTitle}>
                        #{booking._id?.slice(-8).toUpperCase()}
                      </AppText>
                      <AppText variant="caption" color="textSecondary">
                        {booking.bookingDate} • {booking.startTime}
                      </AppText>
                    </View>
                    <View style={[styles.statusBadge, {
                      backgroundColor: booking.status === 'completed' ? colors.successLight :
                                    booking.status === 'cancelled' ? colors.errorLight :
                                    colors.warningLight
                    }]}>
                      <Text style={styles.statusText}>
                        {booking.status === 'pending' ? 'Chờ' :
                         booking.status === 'confirmed' ? 'Xác nhận' :
                         booking.status === 'completed' ? 'Hoàn thành' :
                         booking.status === 'cancelled' ? 'Hủy' : booking.status}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Card>
              <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                Chưa có hoạt động gần đây
              </AppText>
            </Card>
          )}
        </View>

        <View style={styles.bottomPadding} />
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
  refreshIcon: {
    fontSize: 20,
  },
  unauthorized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unauthorizedIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  unauthorizedText: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    margin: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  welcomeSubtext: {
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  welcomeIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  roleText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  statCardWrapper: {
    width: '48%',
    flexGrow: 1,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  activityCard: {
    marginBottom: spacing.sm,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityEmoji: {
    fontSize: 18,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontWeight: '600',
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
  emptyText: {
    textAlign: 'center',
    padding: spacing.lg,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
