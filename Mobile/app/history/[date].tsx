import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { bookingApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  EmptyState,
  Icon,
  Icons,
  ScreenContainer,
  BookingStatusBadge,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/types';

function getStatusBg(status: BookingStatus, colors: any): string {
  switch (status) {
    case 'pending': return colors.warningLight;
    case 'confirmed': return colors.primarySubtle;
    case 'checked_in': case 'in_progress': return colors.infoLight;
    case 'completed': return colors.successLight;
    case 'cancelled': return colors.errorLight;
    default: return colors.surface;
  }
}

function getStatusFg(status: BookingStatus, colors: any): string {
  switch (status) {
    case 'pending': return colors.warning;
    case 'confirmed': return colors.primary;
    case 'checked_in': case 'in_progress': return colors.info;
    case 'completed': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.textSecondary;
  }
}

export default function HistoryDayScreen() {
  const router = useRouter();
  const colors = useColors();
  const toast = useToast();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const result = await bookingApi.getMyBookings();
      setBookings(result.data || []);
    } catch {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const dayBookings = useMemo(() => {
    if (!date) return [];
    return bookings.filter(b => {
      const bd = new Date(b.bookingDate).toISOString().split('T')[0];
      return bd === date;
    });
  }, [bookings, date]);

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      } as any)
    : '';

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const branchName = typeof item.branchId === 'object' ? (item.branchId as any).name : '';
    const packageName = typeof item.packageId === 'object' ? (item.packageId as any).name : 'Dịch vụ';
    const vehiclePlate = typeof item.vehicleId === 'object' ? (item.vehicleId as any).licensePlate : '';

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/booking/${item._id}` as any)}>
        <Card style={styles.card}>
          {/* Top: package + status */}
          <View style={styles.cardTop}>
            <View style={styles.packageRow}>
              <View style={[styles.iconCircle, { backgroundColor: getStatusBg(item.status, colors) }]}>
                <Icon name={Icons.carOutline} size={14} color={getStatusFg(item.status, colors)} />
              </View>
              <AppText variant="bodySmall" color="textPrimary" style={styles.packageName} numberOfLines={1}>
                {packageName}
              </AppText>
            </View>
            <BookingStatusBadge status={item.status} />
          </View>

          {/* Branch */}
          <View style={styles.infoLine}>
            <Icon name={Icons.locationOutline} size={12} color={colors.textTertiary} />
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {branchName}
            </AppText>
          </View>

          {/* Time & date */}
          <View style={styles.infoLine}>
            <Icon name={Icons.timeOutline} size={12} color={colors.textTertiary} />
            <AppText variant="caption" color="textSecondary">
              {item.startTime} · {format(parseISO(item.bookingDate), 'dd/MM/yyyy')}
            </AppText>
          </View>

          {/* Bottom: price + plate */}
          <View style={styles.cardBottom}>
            {vehiclePlate ? (
              <View style={styles.plateTag}>
                <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 10 }}>
                  {vehiclePlate}
                </AppText>
              </View>
            ) : null}
            <AppText variant="bodySmall" color="primary" style={styles.price}>
              {formatCurrency(item.finalPrice)}
            </AppText>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer background="subtle" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name={Icons.back} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <AppText variant="body" color="textPrimary" style={styles.headerDate}>
            {formattedDate}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {dayBookings.length > 0 ? `${dayBookings.length} lịch đặt` : 'Không có lịch đặt'}
          </AppText>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : dayBookings.length === 0 ? (
        <EmptyState
          iconName={Icons.calendarOutline}
          title="Không có lịch đặt"
          message="Không có lịch đặt nào trong ngày này."
        />
      ) : (
        <FlatList
          data={dayBookings}
          keyExtractor={item => item._id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor={colors.primary} colors={[colors.primary]} />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    gap: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerDate: {
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageName: {
    fontWeight: '700',
    flex: 1,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  plateTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  price: {
    fontWeight: '800',
    fontSize: 15,
  },
});
