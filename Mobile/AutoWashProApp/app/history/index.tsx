/**
 * AutoWashPro Booking History Screen
 * Shows user's booking history with filters
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
  PaymentStatusBadge,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatCurrency, parseBookingDateTime } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/types';

type FilterTab = 'all' | 'upcoming' | 'completed' | 'cancelled';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
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
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await bookingApi.getMyBookings();
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
        return bookings.filter(b => {
          if (!['pending', 'confirmed', 'checked_in', 'in_progress'].includes(b.status)) return false;
          const when = parseBookingDateTime(b.bookingDate, b.startTime);
          return when ? when > now : false;
        });
      case 'completed':
        return bookings.filter(b => b.status === 'completed');
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const getVehicleInfo = (booking: Booking) => {
    if (typeof booking.vehicleId === 'object' && booking.vehicleId) {
      return booking.vehicleId.licensePlate;
    }
    return 'N/A';
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const branchName = typeof item.branchId === 'object' ? item.branchId.name : 'Chi nhánh';
    const packageName = typeof item.packageId === 'object' ? item.packageId.name : 'Dịch vụ';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/booking/${item._id}`)}
      >
        <Card style={styles.bookingCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="bodySmall" color="textSecondary">
                {(() => {
                  try {
                    const d = parseISO(item.bookingDate);
                    return Number.isNaN(d.getTime())
                      ? `${item.bookingDate} • ${item.startTime}`
                      : `${format(d, 'dd/MM/yyyy')} • ${item.startTime}`;
                  } catch {
                    return `${item.bookingDate} • ${item.startTime}`;
                  }
                })()}
              </AppText>
              <AppText variant="h4" style={styles.bookingId}>
                #{item._id.slice(-8).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.badges}>
              <BookingStatusBadge status={item.status} />
              <View style={{ height: 4 }} />
              <PaymentStatusBadge status={item.paymentStatus} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <AppText variant="bodySmall">{branchName}</AppText>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✨</Text>
              <AppText variant="bodySmall">{packageName}</AppText>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🚗</Text>
              <AppText variant="bodySmall">{getVehicleInfo(item)}</AppText>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.priceContainer}>
              <AppText variant="caption" color="textSecondary">
                Tổng tiền
              </AppText>
              <AppText variant="h4" color="primary">
                {formatCurrency(item.finalPrice ?? item.totalPrice)}
              </AppText>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const filteredBookings = filterBookings(bookings);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <AppText variant="h4">Lịch sử đặt lịch</AppText>
          <View style={{ width: 24 }} />
        </View>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Lịch sử đặt lịch</AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === item.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === item.key && styles.filterTextActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

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
            title="Không có đặt lịch"
            message={
              activeFilter === 'all'
                ? 'Bạn chưa có đặt lịch nào'
                : `Không có đặt lịch ${activeFilter === 'upcoming' ? 'sắp tới' : activeFilter === 'completed' ? 'hoàn thành' : 'đã hủy'}`
            }
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
  filterContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.body,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingId: {
    marginTop: spacing.xs,
  },
  badges: {
    alignItems: 'flex-end',
  },
  cardContent: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    width: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
  },
});
