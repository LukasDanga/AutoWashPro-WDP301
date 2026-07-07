/**
 * AutoWashPro Admin Dashboard Screen
 * Admin/Manager overview and quick stats
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { publicApi, bookingApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Loading,
  Icon,
  IconButton,
  StatCard,
  ScreenContainer,
  Header,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const colors = useColors();

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
      <ScreenContainer>
        <Header title="Dashboard" showBack />
        <View style={styles.unauthorized}>
          <Icon name="lock-closed-outline" size={64} color={colors.textSecondary} />
          <AppText variant="h3" style={styles.unauthorizedTitle}>Không có quyền truy cập</AppText>
          <AppText variant="body" color="textSecondary" style={styles.unauthorizedText}>
            Chỉ quản trị viên và quản lý mới có quyền truy cập
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải dashboard..." />;
  }

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <Header
        title="Dashboard"
        showBack
        rightAction={
          <IconButton
            name="refresh-outline"
            onPress={onRefresh}
            accessibilityLabel="Làm mới"
          />
        }
      />

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
        <Icon name="stats-chart-outline" size={48} color="rgba(255,255,255,0.5)" />
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Đơn hàng hôm nay"
          value={stats?.todayBookings || 0}
          icon="calendar-outline"
          variant="primary"
          compact
          style={{ flex: 1 }}
        />
        <StatCard
          label="Chờ duyệt"
          value={stats?.pendingBookings || 0}
          icon="hourglass-outline"
          variant="warning"
          compact
          style={{ flex: 1 }}
        />
        <StatCard
          label="Khách hàng"
          value={stats?.totalCustomers || 0}
          icon="people-outline"
          variant="success"
          compact
          style={{ flex: 1 }}
        />
        <StatCard
          label="Doanh thu tháng"
          value={formatCurrency(stats?.revenue || 0)}
          icon="cash-outline"
          variant="info"
          compact
          style={{ flex: 1 }}
        />
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
            accessibilityLabel="Đơn đặt"
            accessibilityRole="button"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight }]}>
              <Icon name="list-outline" size={24} color={colors.primary} />
            </View>
            <AppText variant="caption">Đơn đặt</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/admin/customers' as any)}
            accessibilityLabel="Khách hàng"
            accessibilityRole="button"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.successLight }]}>
              <Icon name="people-outline" size={24} color={colors.success} />
            </View>
            <AppText variant="caption">Khách hàng</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/admin/branches' as any)}
            accessibilityLabel="Chi nhánh"
            accessibilityRole="button"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.warningLight }]}>
              <Icon name="storefront-outline" size={24} color={colors.warning} />
            </View>
            <AppText variant="caption">Chi nhánh</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/admin/packages' as any)}
            accessibilityLabel="Dịch vụ"
            accessibilityRole="button"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.infoLight }]}>
              <Icon name="cube-outline" size={24} color={colors.info} />
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
              accessibilityLabel={`Đơn hàng ${booking._id?.slice(-8).toUpperCase()}`}
              accessibilityRole="button"
            >
              <Card style={styles.activityCard}>
                <View style={styles.activityContent}>
                  <View style={[styles.activityIcon, { backgroundColor: colors.primaryLight }]}>
                    <Icon name="calendar-outline" size={18} color={colors.primary} />
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  unauthorized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unauthorizedTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  unauthorizedText: {
    textAlign: 'center',
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    padding: spacing.lg,
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  welcomeSubtext: {
    opacity: 0.8,
    marginBottom: spacing.xs,
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
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    backgroundColor: '#F8FAFC',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyText: {
    textAlign: 'center',
    padding: spacing.lg,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
