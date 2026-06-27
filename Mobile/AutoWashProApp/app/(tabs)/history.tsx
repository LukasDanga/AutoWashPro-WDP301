/**
 * AutoWashPro History Screen
 * Booking history list
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { bookingApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Loading, 
  EmptyState,
  BookingStatusBadge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Booking } from '../../src/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { parseBookingDateTime } from '../../src/utils';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await bookingApi.getMyBookings({ limit: 50 });
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const filterBookings = (bookings: Booking[]): Booking[] => {
    const now = new Date();
    switch (activeFilter) {
      case 'upcoming':
        return bookings.filter((b) => {
          if (!['pending', 'confirmed', 'checked_in', 'in_progress'].includes(b.status)) return false;
          const when = parseBookingDateTime(b.bookingDate, b.startTime);
          return when ? when > now : false;
        });
      case 'completed':
        return bookings.filter((b) => b.status === 'completed');
      case 'cancelled':
        return bookings.filter((b) => b.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const bookingDate = parseISO(item.bookingDate);
    const isUpcoming = (() => {
      const when = parseBookingDateTime(item.bookingDate, item.startTime);
      return when ? when > new Date() : false;
    })();

    return (
      <TouchableOpacity
        onPress={() => router.push({
          pathname: '/booking/[id]',
          params: { id: item._id }
        })}
      >
        <Card style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateDay}>{format(bookingDate, 'dd')}</Text>
              <Text style={styles.dateMonth}>{format(bookingDate, 'MMM', { locale: vi })}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <AppText variant="body" style={styles.packageName}>
                  {typeof item.packageId === 'object' ? item.packageId.name : 'Package'}
                </AppText>
                <BookingStatusBadge status={item.status} />
              </View>
              <View style={styles.cardDetails}>
                <Text style={styles.detailIcon}>🕐</Text>
                <AppText variant="caption" color="textSecondary">
                  {item.startTime} - {item.endTime || '...'}
                </AppText>
              </View>
              <View style={styles.cardDetails}>
                <Text style={styles.detailIcon}>📍</Text>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {typeof item.branchId === 'object' ? item.branchId.name : 'Branch'}
                </AppText>
              </View>
              <View style={styles.cardFooter}>
                <AppText variant="bodySmall" color="primary" style={styles.price}>
                  {formatCurrency(item.finalPrice ?? item.totalPrice)}
                </AppText>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const filteredBookings = filterBookings(bookings);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          title="Vui lòng đăng nhập"
          message="Đăng nhập để xem lịch sử đặt lịch"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải lịch sử..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="h2">Lịch sử đặt lịch</AppText>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Booking List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item._id}
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
            icon={<Text style={{ fontSize: 48 }}>📋</Text>}
            title="Không có đơn đặt lịch"
            message={
              activeFilter === 'all'
                ? 'Bạn chưa có đơn đặt lịch nào'
                : `Không có đơn đặt lịch nào ở trạng thái "${STATUS_FILTERS.find((f) => f.key === activeFilter)?.label}"`
            }
            actionLabel="Đặt lịch ngay"
            onAction={() => router.push('/booking')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  dateContainer: {
    width: 60,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  dateDay: {
    ...typography.h2,
    color: colors.primary,
  },
  dateMonth: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  packageName: {
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  price: {
    fontWeight: '600',
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.primary,
  },
});
