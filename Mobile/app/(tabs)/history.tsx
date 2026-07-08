/**
 * AutoWashPro History Screen
 * Calendar + List views with booking management actions
 * Header + style matching booking tab
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, getDaysInMonth } from 'date-fns';
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
  ScreenContainer,
  BookingStatusBadge,
  Skeleton,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/types';

type ViewMode = 'calendar' | 'list';
type FilterKey = 'all' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'in_progress', label: 'Đang thực hiện' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VN = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function getDotColor(status: BookingStatus): string {
  switch (status) {
    case 'completed': return '#16A34A';
    case 'cancelled': return '#94A3B8';
    case 'pending': return '#F59E0B';
    default: return '#3B82F6';
  }
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Calendar state
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // List filter
  const [filter, setFilter] = useState<FilterKey>('all');

  // Detail modal
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cancel modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Review modal
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Rebook modal
  const [showRebook, setShowRebook] = useState(false);
  const [rebookDate, setRebookDate] = useState('');
  const [rebookTime, setRebookTime] = useState('');
  const [rebookLoading, setRebookLoading] = useState(false);
  const [rebookError, setRebookError] = useState('');

  // QR modal
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

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

  // Bookmarks by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      const key = new Date(b.bookingDate).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = getDaysInMonth(new Date(viewYear, viewMonth === 0 ? 11 : viewMonth - 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ date: new Date(y, m, prevMonthDays - i), isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(viewYear, viewMonth, d), isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ date: new Date(y, m, d), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    return bookingsByDate[localDateKey(selectedDate)] || [];
  }, [selectedDate, bookingsByDate]);

  // Navigation
  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else { setViewMonth(m => m - 1); }
    setSelectedDate(null);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else { setViewMonth(m => m + 1); }
    setSelectedDate(null);
  }, [viewMonth]);

  const goToday = useCallback(() => {
    const d = new Date();
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
    setSelectedDate(d);
  }, []);

  // List filter
  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => {
      if (filter === 'upcoming') return b.status === 'pending' || b.status === 'confirmed';
      if (filter === 'in_progress') return b.status === 'checked_in' || b.status === 'in_progress';
      if (filter === 'completed') return b.status === 'completed';
      if (filter === 'cancelled') return b.status === 'cancelled';
      return true;
    });
  }, [bookings, filter]);

  // Load detail
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const b = await bookingApi.getBooking(id);
      setDetailBooking(b);
    } catch {
      toast.error('Không thể tải chi tiết');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  // Cancel
  const handleCancel = useCallback(() => {
    if (!detailBooking) return;
    setCancelError('');
    setShowCancelConfirm(true);
  }, [detailBooking]);

  const confirmCancel = useCallback(async () => {
    if (!detailBooking) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      await bookingApi.cancelBooking(detailBooking._id, 'Khách hàng yêu cầu hủy');
      toast.success('Đã hủy đơn thành công');
      setShowCancelConfirm(false);
      setDetailBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
      fetchBookings();
    } catch (e: any) {
      setCancelError(e?.response?.data?.message || 'Hủy thất bại');
    } finally {
      setCancelLoading(false);
    }
  }, [detailBooking, toast, fetchBookings]);

  // Review
  const openReview = useCallback(() => {
    if (!detailBooking) return;
    setReviewRating(detailBooking.rating || 0);
    setReviewText(detailBooking.feedback || '');
    setReviewError('');
    setShowReview(true);
  }, [detailBooking]);

  const submitReview = useCallback(async () => {
    if (!detailBooking) return;
    if (reviewRating === 0) { setReviewError('Vui lòng chọn số sao'); return; }
    setReviewLoading(true);
    setReviewError('');
    try {
      const updated = await bookingApi.submitFeedback(detailBooking._id, { rating: reviewRating, feedback: reviewText.trim() || undefined });
      setDetailBooking(prev => prev ? { ...prev, ...updated } : null);
      setBookings(prev => prev.map(b => b._id === updated._id ? { ...b, ...updated } : b));
      setShowReview(false);
      toast.success('Đánh giá thành công!');
    } catch (e: any) {
      setReviewError(e?.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setReviewLoading(false);
    }
  }, [detailBooking, reviewRating, reviewText, toast]);

  // Rebook
  const handleRebook = useCallback(() => {
    if (!detailBooking) return;
    setRebookDate('');
    setRebookTime('');
    setRebookError('');
    setShowRebook(true);
  }, [detailBooking]);

  const submitRebook = useCallback(async () => {
    if (!detailBooking) return;
    setRebookError('');
    if (!rebookDate) { setRebookError('Vui lòng chọn ngày'); return; }
    if (!rebookTime) { setRebookError('Vui lòng chọn giờ'); return; }
    const selected = new Date(rebookDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) { setRebookError('Ngày phải từ hôm nay trở đi'); return; }
    setRebookLoading(true);
    try {
      await bookingApi.rebookBooking(detailBooking._id, { bookingDate: rebookDate, startTime: rebookTime });
      toast.success('Đặt lại thành công!');
      setShowRebook(false);
      fetchBookings();
    } catch (e: any) {
      setRebookError(e?.response?.data?.message || 'Đặt lại thất bại');
    } finally {
      setRebookLoading(false);
    }
  }, [detailBooking, rebookDate, rebookTime, toast, fetchBookings]);

  // QR
  const handleShowQR = useCallback(async () => {
    if (!detailBooking) return;
    setQrLoading(true);
    setQrCode('');
    setShowQR(true);
    try {
      const result = await bookingApi.getBookingQR(detailBooking._id);
      setQrCode(result.qrCode || '');
    } catch {
      toast.error('Không thể tạo mã QR');
      setShowQR(false);
    } finally {
      setQrLoading(false);
    }
  }, [detailBooking, toast]);

  const renderBookingItem = useCallback((b: Booking) => {
    const branchName = typeof b.branchId === 'object' ? (b.branchId as any).name : '';
    const packageName = typeof b.packageId === 'object' ? (b.packageId as any).name : '';
    const dateObj = parseISO(b.bookingDate);
    const dayLabel = !isNaN(dateObj.getTime()) ? format(dateObj, 'dd', { locale: vi }) : '';
    const monthLabel = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMM', { locale: vi }).toUpperCase() : '';
    const vehiclePlate = typeof b.vehicleId === 'object' ? (b.vehicleId as any).licensePlate : '';

    return (
      <PressableScale
        onPress={() => {
          setDetailBooking(b);
          loadDetail(b._id);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Đặt lịch ${packageName}`}
      >
        <Card style={styles.bookingCard}>
          <View style={styles.bookingRow}>
            <View style={[styles.dateBlock, { backgroundColor: getStatusBg(b.status, colors) }]}>
              <AppText style={[styles.dateBlockDay, { color: getStatusFg(b.status, colors) }]}>{dayLabel}</AppText>
              <AppText style={[styles.dateBlockMonth, { color: getStatusFg(b.status, colors) }]}>{monthLabel}</AppText>
            </View>
            <View style={styles.bookingInfo}>
              <View style={styles.bookingHeaderRow}>
                <AppText variant="body" style={styles.bookingTitle} numberOfLines={1}>
                  {packageName}
                </AppText>
                <BookingStatusBadge status={b.status} />
              </View>
              <View style={styles.bookingMetaRow}>
                <Icon name={Icons.locationOutline} size={12} color={colors.textTertiary} />
                <AppText variant="caption" color="textTertiary" numberOfLines={1} style={styles.flex1}>
                  {branchName}
                </AppText>
              </View>
              <View style={styles.bookingMetaRow}>
                <Icon name={Icons.timeOutline} size={12} color={colors.textSecondary} />
                <AppText variant="caption" color="textSecondary">{b.startTime}</AppText>
                <View style={[styles.metaDot, { backgroundColor: colors.divider }]} />
                <AppText variant="caption" color="textSecondary">{formatCurrency(b.finalPrice)}</AppText>
                {vehiclePlate ? (
                  <>
                    <View style={[styles.metaDot, { backgroundColor: colors.divider }]} />
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>{vehiclePlate}</AppText>
                  </>
                ) : null}
              </View>
            </View>
            <Icon name={Icons.forward} size={18} color={colors.textTertiary} />
          </View>
        </Card>
      </PressableScale>
    );
  }, [colors, loadDetail]);

  return (
    <ScreenContainer background="subtle" edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View>
          <AppText variant="h3" color="primary">
            Lịch sử đặt lịch
          </AppText>
          <AppText variant="label" color="textSecondary">
            Theo dõi các lịch đặt của bạn
          </AppText>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map(i => (
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
      ) : (
        <FlatList
          data={[0]}
          keyExtractor={() => 'main'}
          renderItem={() => (
            <View>
              {/* View toggle */}
              <View style={[styles.toggleRow, { backgroundColor: colors.surfaceDark }]}>
                <TouchableOpacity
                  onPress={() => setViewMode('calendar')}
                  style={[styles.toggleBtn, viewMode === 'calendar' && { backgroundColor: colors.background, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 2 } }) }]}
                  activeOpacity={0.7}
                >
                  <Icon name={Icons.calendarOutline} size={16} color={viewMode === 'calendar' ? colors.primary : colors.textTertiary} />
                  <AppText variant="labelSmall" color={viewMode === 'calendar' ? 'primary' : 'textTertiary'}>Lịch tháng</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('list')}
                  style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: colors.background, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 2 } }) }]}
                  activeOpacity={0.7}
                >
                  <Icon name={Icons.listOutline} size={16} color={viewMode === 'list' ? colors.primary : colors.textTertiary} />
                  <AppText variant="labelSmall" color={viewMode === 'list' ? 'primary' : 'textTertiary'}>Danh sách</AppText>
                </TouchableOpacity>
              </View>

              {/* Calendar view */}
              {viewMode === 'calendar' && (
                <View style={[styles.calendarWrap, { backgroundColor: colors.background }]}>
                  {/* Month header */}
                  <View style={[styles.calHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                      <Icon name={Icons.back} size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.calHeaderText}>
                      <AppText variant="h4" color="textPrimary">
                        {MONTHS_VN[viewMonth]} {viewYear}
                      </AppText>
                      <TouchableOpacity onPress={goToday} style={[styles.todayBtn, { backgroundColor: '#DCFCE7' }]} activeOpacity={0.7}>
                        <AppText variant="caption" style={{ color: '#16A34A', fontWeight: '700' }}>Hôm nay</AppText>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                      <Icon name={Icons.forward} size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  {/* DOW */}
                  <View style={[styles.dowRow, { borderBottomColor: colors.border }]}>
                    {DAYS_VN.map((d, i) => (
                      <View key={d} style={styles.dowCell}>
                        <AppText style={[styles.dowText, i === 0 && { color: '#EF4444' }]}>{d}</AppText>
                      </View>
                    ))}
                  </View>

                  {/* Grid */}
                  <View style={styles.calGrid}>
                    {calendarDays.map((day, idx) => {
                      const key = localDateKey(day.date);
                      const dayBks = bookingsByDate[key] || [];
                      const today = isSameDay(day.date, new Date());
                      const isSelected = selectedDate && isSameDay(day.date, selectedDate);

                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setSelectedDate(day.date)}
                          style={[
                            styles.dayCell,
                            {
                              backgroundColor: isSelected ? colors.primarySubtle : today ? '#FEFCE8' : day.isCurrentMonth ? 'transparent' : colors.surface,
                              borderRightWidth: (idx % 7) < 6 ? StyleSheet.hairlineWidth : 0,
                              borderBottomWidth: idx < 35 ? StyleSheet.hairlineWidth : 0,
                              borderRightColor: colors.border,
                              borderBottomColor: colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.dayNumber, today && !isSelected && { backgroundColor: colors.primary }]}>
                            <AppText style={[
                              styles.dayNumberText,
                              { color: today && !isSelected ? '#FFF' : isSelected ? colors.primary : day.isCurrentMonth ? colors.textPrimary : colors.textTertiary },
                            ]}>
                              {day.date.getDate()}
                            </AppText>
                          </View>
                          {dayBks.length > 0 && (
                            <View style={styles.dotRow}>
                              {dayBks.slice(0, 3).map((b, i) => (
                                <View key={i} style={[styles.dot, { backgroundColor: getDotColor(b.status) }]} />
                              ))}
                              {dayBks.length > 3 && (
                                <AppText style={styles.dotMore}>+{dayBks.length - 3}</AppText>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selected date panel */}
                  {selectedDate && (
                    <View style={[styles.selectedPanel, { borderTopColor: colors.border }]}>
                      <View style={[styles.selectedPanelHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                        <View>
                          <AppText variant="body" color="textPrimary" style={{ fontWeight: '700' }}>
                            {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as any)}
                          </AppText>
                          <AppText variant="caption" color="textSecondary">
                            {selectedDateBookings.length > 0 ? `${selectedDateBookings.length} lịch đặt` : 'Không có lịch đặt'}
                          </AppText>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.closeBtn} activeOpacity={0.7}>
                          <Icon name={Icons.close} size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </View>

                      {selectedDateBookings.length === 0 ? (
                        <View style={styles.emptyDay}>
                          <AppText variant="caption" color="textTertiary">Không có lịch đặt nào trong ngày này.</AppText>
                        </View>
                      ) : (
                        <View style={styles.dayBookingsList}>
                          {selectedDateBookings.map(b => (
                            <TouchableOpacity
                              key={b._id}
                              onPress={() => { setDetailBooking(b); loadDetail(b._id); }}
                              style={[styles.dayBookingCard, { backgroundColor: colors.background }]}
                              activeOpacity={0.7}
                            >
                              <View style={styles.dayBookingTop}>
                                <View style={styles.dayBookingInfo}>
                                  <AppText variant="body" color="textPrimary" numberOfLines={1}>
                                    {typeof b.packageId === 'object' ? (b.packageId as any).name : 'Dịch vụ'}
                                  </AppText>
                                  <AppText variant="caption" color="textSecondary">
                                    {typeof b.branchId === 'object' ? (b.branchId as any).name : ''} · {b.startTime}
                                  </AppText>
                                </View>
                                <BookingStatusBadge status={b.status} />
                              </View>
                              <View style={styles.dayBookingBottom}>
                                <AppText variant="caption" color="textTertiary">
                                  {typeof b.vehicleId === 'object' ? (b.vehicleId as any).licensePlate : ''}
                                </AppText>
                                <AppText variant="body" color="primary" style={{ fontWeight: '700' }}>
                                  {formatCurrency(b.finalPrice)}
                                </AppText>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* List view */}
              {viewMode === 'list' && (
                <View>
                  {/* Filter chips */}
                  <View style={styles.filterRow}>
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={FILTERS}
                      keyExtractor={item => item.key}
                      contentContainerStyle={styles.filterScroll}
                      renderItem={({ item: f }) => (
                        <TouchableOpacity
                          onPress={() => setFilter(f.key)}
                          style={[
                            styles.filterChip,
                            { backgroundColor: filter === f.key ? colors.primary : colors.surface, borderColor: filter === f.key ? colors.primary : colors.border },
                          ]}
                          activeOpacity={0.7}
                        >
                          <AppText variant="labelSmall" style={{ color: filter === f.key ? '#FFF' : colors.textSecondary }}>
                            {f.label}
                          </AppText>
                        </TouchableOpacity>
                      )}
                    />
                  </View>

                  {filteredBookings.length === 0 ? (
                    <EmptyState
                      iconName={Icons.calendarOutline}
                      title={filter === 'all' ? 'Chưa có đặt lịch' : 'Không có đặt lịch nào'}
                      message={filter === 'all' ? 'Hãy đặt lịch đầu tiên của bạn' : 'Thử chọn bộ lọc khác'}
                      actionLabel={filter === 'all' ? 'Đặt lịch ngay' : undefined}
                      onAction={() => router.push('/(tabs)/booking' as any)}
                    />
                  ) : (
                    <View style={styles.listContent}>
                      {filteredBookings.map(b => (
                        <View key={b._id}>{renderBookingItem(b)}</View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        />
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      <Modal visible={!!detailBooking} transparent animationType="slide" onRequestClose={() => setDetailBooking(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailBooking(null)}>
          <TouchableOpacity style={[styles.modalContent, { backgroundColor: colors.background }]} activeOpacity={1}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
              <View>
                <AppText variant="h4" color="textPrimary">Chi tiết đặt lịch</AppText>
                <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  #{detailBooking?._id.slice(-8).toUpperCase()}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => setDetailBooking(null)} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceDark }]} activeOpacity={0.7}>
                <Icon name={Icons.close} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Modal body */}
            {detailLoading ? (
              <View style={styles.modalBodyLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : detailBooking ? (
              <>
                <View style={styles.modalBody}>
                  <View style={styles.modalStatusRow}>
                    <BookingStatusBadge status={detailBooking.status} />
                  </View>

                  <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                    {detailInfoRows(detailBooking, colors).map(([label, value]) => (
                      <View key={label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                        <AppText variant="caption" color="textSecondary">{label}</AppText>
                        <AppText variant="bodySmall" color="textPrimary" style={styles.infoValue}>{value}</AppText>
                      </View>
                    ))}

                    {detailBooking.feedback ? (
                      <View style={[styles.feedbackBox, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                        <AppText variant="caption" style={{ color: '#D97706', fontWeight: '700', marginBottom: 4 }}>⭐ Đánh giá</AppText>
                        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 6 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <AppText key={s} style={{ color: s <= (detailBooking.rating || 0) ? '#F59E0B' : '#D1D5DB' }}>★</AppText>
                          ))}
                        </View>
                        <AppText variant="caption" style={{ color: '#92400E', fontStyle: 'italic' }}>"{detailBooking.feedback}"</AppText>
                      </View>
                    ) : null}
                  </ScrollView>
                </View>

                {/* Modal footer actions */}
                <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                  {(detailBooking.status === 'pending' || detailBooking.status === 'confirmed') && (
                    <View style={{ gap: spacing.sm }}>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button
                          title="Hủy đơn"
                          variant="outline"
                          onPress={handleCancel}
                          style={styles.modalActionBtn}
                          textStyle={{ color: colors.error }}
                        />
                        <Button
                          title="QR Check-in"
                          onPress={handleShowQR}
                          style={styles.modalActionBtn}
                        />
                      </View>
                    </View>
                  )}
                  {(detailBooking.status === 'completed' || detailBooking.status === 'cancelled') && (
                    <View style={{ gap: spacing.sm }}>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button
                          title="Đặt lại"
                          variant="outline"
                          onPress={handleRebook}
                          style={styles.modalActionBtn}
                          textStyle={{ color: colors.success }}
                        />
                        {detailBooking.status === 'completed' && (
                          <Button
                            title="Đánh giá"
                            onPress={openReview}
                            style={styles.modalActionBtn}
                          />
                        )}
                      </View>
                    </View>
                  )}
                  <Button
                    title="Đóng"
                    onPress={() => setDetailBooking(null)}
                    fullWidth
                  />
                </View>
              </>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══ CANCEL CONFIRM MODAL ═══ */}
      <Modal visible={showCancelConfirm} transparent animationType="fade" onRequestClose={() => setShowCancelConfirm(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { if (!cancelLoading) { setShowCancelConfirm(false); setCancelError(''); } }}>
          <TouchableOpacity style={[styles.confirmModal, { backgroundColor: colors.background }]} activeOpacity={1}>
            <AppText variant="h4" color="textPrimary" style={{ textAlign: 'center', marginBottom: spacing.sm }}>Xác nhận hủy đơn</AppText>
            <AppText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginBottom: spacing.lg }}>
              Bạn có chắc muốn hủy đơn này? Hành động này không thể hoàn tác.
            </AppText>
            {cancelError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                <AppText variant="caption" color="error">{cancelError}</AppText>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Không, giữ lại"
                variant="outline"
                onPress={() => { setShowCancelConfirm(false); setCancelError(''); }}
                disabled={cancelLoading}
                style={{ flex: 1 }}
              />
              <Button
                title={cancelLoading ? 'Đang hủy...' : 'Xác nhận hủy'}
                onPress={confirmCancel}
                disabled={cancelLoading}
                style={{ flex: 1, backgroundColor: colors.error }}
                textStyle={{ color: '#FFF' }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══ REVIEW MODAL ═══ */}
      <Modal visible={showReview} transparent animationType="slide" onRequestClose={() => setShowReview(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReview(false)}>
          <TouchableOpacity style={[styles.reviewModal, { backgroundColor: colors.background }]} activeOpacity={1}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <AppText variant="h4" color="textPrimary">Đánh giá dịch vụ</AppText>
              <TouchableOpacity onPress={() => setShowReview(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Icon name={Icons.close} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <AppText variant="label" color="textSecondary" style={{ marginBottom: spacing.sm, textAlign: 'center' }}>
                Chất lượng dịch vụ
              </AppText>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setReviewRating(s)} activeOpacity={0.7}>
                    <AppText style={[styles.star, { color: s <= reviewRating ? '#F59E0B' : colors.border }]}>★</AppText>
                  </TouchableOpacity>
                ))}
              </View>
              {reviewRating > 0 && (
                <AppText variant="caption" style={{ color: '#F59E0B', fontWeight: '600', textAlign: 'center', marginBottom: spacing.md }}>
                  {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][reviewRating]}
                </AppText>
              )}

              <AppText variant="label" color="textSecondary" style={{ marginBottom: spacing.xs }}>
                Nhận xét (tùy chọn)
              </AppText>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={500}
                multiline
                placeholder="Chia sẻ trải nghiệm của bạn..."
                style={[styles.reviewInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholderTextColor={colors.textTertiary}
              />
              <AppText variant="caption" color="textTertiary" style={{ textAlign: 'right', marginTop: 4 }}>{reviewText.length}/500</AppText>

              {reviewError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                  <AppText variant="caption" color="error">{reviewError}</AppText>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Hủy" variant="outline" onPress={() => setShowReview(false)} disabled={reviewLoading} style={{ flex: 1 }} />
                <Button
                  title={reviewLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
                  onPress={submitReview}
                  disabled={reviewLoading || reviewRating === 0}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══ REBOOK MODAL ═══ */}
      <Modal visible={showRebook} transparent animationType="slide" onRequestClose={() => setShowRebook(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { if (!rebookLoading) { setShowRebook(false); setRebookError(''); } }}>
          <TouchableOpacity style={[styles.rebookModal, { backgroundColor: colors.background }]} activeOpacity={1}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
              <View>
                <AppText variant="h4" color="textPrimary">Đặt lại lịch</AppText>
                <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  {typeof detailBooking?.packageId === 'object' ? (detailBooking.packageId as any).name : ''}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => { setShowRebook(false); setRebookError(''); }} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceDark }]} activeOpacity={0.7}>
                <Icon name={Icons.close} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <AppText variant="label" color="textSecondary" style={{ marginBottom: spacing.xs }}>Ngày mới</AppText>
              <TextInput
                value={rebookDate}
                onChangeText={setRebookDate}
                placeholder="YYYY-MM-DD"
                style={[styles.rebookInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholderTextColor={colors.textTertiary}
              />
              <AppText variant="label" color="textSecondary" style={{ marginBottom: spacing.xs, marginTop: spacing.md }}>Giờ mới</AppText>
              <TextInput
                value={rebookTime}
                onChangeText={setRebookTime}
                placeholder="HH:mm"
                style={[styles.rebookInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholderTextColor={colors.textTertiary}
              />
              <AppText variant="caption" color="textTertiary" style={{ marginTop: spacing.sm }}>
                Nhập ngày và giờ bạn muốn đặt lại. Ngày phải từ hôm nay trở đi.
              </AppText>

              {rebookError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight, marginTop: spacing.sm }]}>
                  <AppText variant="caption" color="error">{rebookError}</AppText>
                </View>
              ) : null}
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Hủy" variant="outline" onPress={() => { setShowRebook(false); setRebookError(''); }} disabled={rebookLoading} style={{ flex: 1 }} />
                <Button
                  title={rebookLoading ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}
                  onPress={submitRebook}
                  disabled={rebookLoading}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══ QR MODAL ═══ */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowQR(false)}>
          <TouchableOpacity style={[styles.qrModal, { backgroundColor: colors.background }]} activeOpacity={1}>
            <AppText variant="h4" color="textPrimary" style={{ textAlign: 'center' }}>Mã QR Check-in</AppText>
            <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 4, marginBottom: spacing.lg }}>
              Đưa mã này cho nhân viên khi đến rửa xe
            </AppText>

            {qrLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : qrCode ? (
              <View style={{ alignItems: 'center', padding: spacing.md }}>
                <AppText variant="body" color="textPrimary">QR Code sẵn sàng</AppText>
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <AppText variant="caption" color="textTertiary">Không có dữ liệu QR</AppText>
              </View>
            )}

            <Button title="Đóng" onPress={() => setShowQR(false)} fullWidth style={{ marginTop: spacing.lg }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

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

function detailInfoRows(b: Booking, colors: any): [string, string][] {
  const pkg = typeof b.packageId === 'object' ? (b.packageId as any).name : '—';
  const branch = typeof b.branchId === 'object' ? (b.branchId as any).name : '—';
  const vehicle = typeof b.vehicleId === 'object' ? (b.vehicleId as any).licensePlate : '—';
  const date = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('vi-VN') : '—';
  const payment = b.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán';
  const type = b.isRecurring ? 'Định kỳ' : '1 lần';

  return [
    ['Dịch vụ', pkg],
    ['Ngày', date],
    ['Giờ', b.startTime || '—'],
    ['Chi nhánh', branch],
    ['Biển số', vehicle],
    ['Thành tiền', formatCurrency(b.finalPrice)],
    ['Thanh toán', payment],
    ['Loại đặt', type],
  ];
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 80,
  },
  loadingWrap: {
    padding: spacing.md,
  },
  skeletonCard: {
    marginBottom: spacing.sm,
  },

  // View toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },

  // Calendar
  calendarWrap: {
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calHeaderText: {
    alignItems: 'center',
    gap: 4,
  },
  todayBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  dowRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dowCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    minHeight: 52,
    padding: 3,
    alignItems: 'center',
  },
  dayNumber: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotMore: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: '700',
  },

  // Selected date panel
  selectedPanel: {
    borderTopWidth: 2,
    maxHeight: 280,
  },
  selectedPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyDay: {
    padding: 30,
    alignItems: 'center',
  },
  dayBookingsList: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  dayBookingCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayBookingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  dayBookingInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  dayBookingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // List view filters
  filterRow: {
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },

  // List view
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
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
    width: 52,
    height: 60,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  dateBlockDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  dateBlockMonth: {
    fontSize: 10,
    fontWeight: '700',
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
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  flex1: { flex: 1 },

  // Modal base
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    padding: spacing.lg,
  },
  modalBodyLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalBodyScroll: {
    flex: 1,
  },
  modalStatusRow: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoValue: {
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
  feedbackBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  modalActionBtn: {
    flex: 1,
  },

  // Confirm modal
  confirmModal: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl + 4,
    padding: spacing.lg,
  },
  errorBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },

  // Review modal
  reviewModal: {
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    maxHeight: '85%',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  star: {
    fontSize: 28,
  },

  reviewInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Rebook modal
  rebookModal: {
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
  },
  rebookInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    fontSize: 14,
  },

  // QR modal
  qrModal: {
    marginHorizontal: spacing.lg + 20,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
});
