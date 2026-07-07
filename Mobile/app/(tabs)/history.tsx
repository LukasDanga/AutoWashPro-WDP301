/**
 * AutoWashPro History (Bookings list) Screen
 * - Filterable status chips
 * - Pull-to-refresh with skeleton placeholders
 * - Booking cards with status badge, semantic color tints
 * - Empty state with CTA to start booking
 * - 100% semantic theme tokens (no hardcoded hex)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { bookingApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  Loading,
  EmptyState,
  Icon,
  Icons,
  PressableScale,
  Header,
  ScreenContainer,
  Chip,
  BookingStatusBadge,
  PaymentStatusBadge,
  Skeleton,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/types';

type FilterKey = 'all' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'in_progress', label: 'Đang thực hiện' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const result = await bookingApi.getMyBookings();
      setBookings(result.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => {
      if (filter === 'upcoming') {
        return b.status === 'pending' || b.status === 'confirmed';
      }
      if (filter === 'in_progress') {
        return b.status === 'checked_in' || b.status === 'in_progress';
      }
      if (filter === 'completed') return b.status === 'completed';
      if (filter === 'cancelled') return b.status === 'cancelled';
      return true;
    });
  }, [bookings, filter]);

  const renderItem = ({ item }: { item: Booking }) => (
    <BookingCard booking={item} onPress={() => router.push(`/booking/${item._id}` as any)} />
  );

  return (
    <ScreenContainer edges={['top']} background="subtle">
      <Header
        title="Lịch sử đặt lịch"
        rightAction={
          <PressableScale
            onPress={() => router.push('/(tabs)/booking' as any)}
            accessibilityLabel="Đặt lịch mới"
            style={styles.headerAction}
          >
            <Icon name={Icons.add} size={22} color={colors.primary} />
          </PressableScale>
        }
      />

      <View style={[styles.filterRow, { backgroundColor: colors.background }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item: f }) => (
            <Chip
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
              style={{ marginRight: spacing.sm }}
            />
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.skeletonCard}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Skeleton width={48} height={48} borderRadius={14} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                  <Skeleton width="80%" height={12} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          iconName={Icons.calendarOutline}
          title={filter === 'all' ? 'Chưa có đặt lịch' : 'Không có đặt lịch nào'}
          message={
            filter === 'all'
              ? 'Hãy đặt lịch đầu tiên của bạn để trải nghiệm dịch vụ rửa xe chuyên nghiệp'
              : 'Thử chọn bộ lọc khác để xem thêm lịch sử'
          }
          actionLabel={filter === 'all' ? 'Đặt lịch ngay' : undefined}
          onAction={() => router.push('/(tabs)/booking' as any)}
        />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress }) => {
  const colors = useColors();

  const branchName = typeof booking.branchId === 'object' ? booking.branchId.name : '';
  const packageName =
    typeof booking.packageId === 'object' ? booking.packageId.name : '';
  const tint = getTintForStatus(booking.status, colors);
  const tintIcon = getIconForStatus(booking.status);
  const dateObj = parseISO(booking.bookingDate);
  const dayLabel = Number.isNaN(dateObj.getTime())
    ? ''
    : format(dateObj, 'dd', { locale: vi });
  const monthLabel = Number.isNaN(dateObj.getTime())
    ? ''
    : format(dateObj, 'MMM', { locale: vi }).toUpperCase();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Đặt lịch tại ${branchName}, ${packageName}, trạng thái ${booking.status}`}
    >
      <Card style={styles.bookingCard}>
        <View style={styles.bookingRow}>
          <View style={[styles.dateBlock, { backgroundColor: tint.bg }]}>
            <AppText style={[styles.dateBlockDay, { color: tint.fg }]}>{dayLabel}</AppText>
            <AppText style={[styles.dateBlockMonth, { color: tint.fg }]}>{monthLabel}</AppText>
            <View style={[styles.dateBlockIcon, { backgroundColor: tint.fg + '22' }]}>
              <Icon name={tintIcon} size={12} color={tint.fg} />
            </View>
          </View>
          <View style={styles.bookingInfo}>
            <View style={styles.bookingHeaderRow}>
              <AppText variant="body" style={styles.bookingTitle} numberOfLines={1}>
                {packageName}
              </AppText>
              <BookingStatusBadge status={booking.status} />
            </View>
            <View style={styles.bookingLocationRow}>
              <Icon name={Icons.locationOutline} size={12} color={colors.textTertiary} />
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {branchName}
              </AppText>
            </View>
            <View style={styles.bookingMetaRow}>
              <View style={styles.metaItem}>
                <Icon name={Icons.timeOutline} size={12} color={colors.textSecondary} />
                <AppText variant="caption" color="textSecondary">
                  {booking.startTime}
                </AppText>
              </View>
              <View style={[styles.metaDivider, { backgroundColor: colors.divider }]} />
              <AppText variant="caption" color="textSecondary">
                {formatCurrency(booking.finalPrice ?? booking.totalPrice)}
              </AppText>
              <View style={[styles.metaDivider, { backgroundColor: colors.divider }]} />
              <PaymentStatusBadge status={booking.paymentStatus} compact />
            </View>
          </View>
          <View style={styles.bookingChevron}>
            <Icon name={Icons.chevronForward} size={18} color={colors.textTertiary} />
          </View>
        </View>
      </Card>
    </PressableScale>
  );
};

function getTintForStatus(status: BookingStatus, colors: any): { bg: string; fg: string } {
  switch (status) {
    case 'pending':
      return { bg: colors.warningLight, fg: colors.warning };
    case 'confirmed':
      return { bg: colors.primarySubtle, fg: colors.primary };
    case 'checked_in':
    case 'in_progress':
      return { bg: colors.infoLight, fg: colors.statusCheckedIn };
    case 'completed':
      return { bg: colors.successLight, fg: colors.success };
    case 'cancelled':
      return { bg: colors.errorLight, fg: colors.error };
    default:
      return { bg: colors.surface, fg: colors.textSecondary };
  }
}

function getIconForStatus(status: BookingStatus): string {
  switch (status) {
    case 'pending':
      return Icons.timeOutline;
    case 'confirmed':
      return Icons.checkmark;
    case 'checked_in':
      return Icons.qrCodeOutline;
    case 'in_progress':
      return Icons.refreshOutline;
    case 'completed':
      return Icons.success;
    case 'cancelled':
      return Icons.close;
    default:
      return Icons.calendarOutline;
  }
}

const styles = StyleSheet.create({
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  skeletonCard: {
    marginBottom: spacing.sm,
  },
  bookingCard: {
    marginBottom: spacing.sm,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateBlock: {
    width: 56,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  dateBlockDay: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  dateBlockMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateBlockIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.xs,
  },
  bookingTitle: {
    fontWeight: '600',
    flex: 1,
  },
  bookingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  bookingChevron: {
    paddingLeft: spacing.xs,
  },
});