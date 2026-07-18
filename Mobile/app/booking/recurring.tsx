/**
 * AutoWashPro Recurring Booking Screen
 * 5-step flow: branch -> package -> vehicle -> recurrence (weekdays, time, weeks) -> confirm
 *
 * Backend constraints (see booking.service.js createRecurringBooking):
 *  - weeks: 1..12
 *  - weekdays: non-empty array of 0..6 (0 = Sunday)
 *  - startTime: HH:mm, must end before branch.closingTime
 *  - Backend begins from today (no startDate param); days in the past are skipped.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  branchApi,
  packageApi,
  vehicleApi,
  bookingApi,
} from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  Loading,
  EmptyState,
  Input,
  AlertDialog,
  useToast,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import {
  spacing,
  borderRadius,
  shadows,
} from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type {
  Branch,
  Package as ServicePackage,
  Vehicle,
  AvailableSlot,
  RecurringBookingResult,
} from '../../src/types';

type Step = 'branch' | 'package' | 'vehicle' | 'recurrence' | 'confirm';

const STEPS: { key: Step; label: string }[] = [
  { key: 'branch', label: 'Chi nhánh' },
  { key: 'package', label: 'Gói' },
  { key: 'vehicle', label: 'Xe' },
  { key: 'recurrence', label: 'Lịch' },
  { key: 'confirm', label: 'Xác nhận' },
];

const WEEKDAY_OPTIONS = [
  { value: 1, short: 'T2', long: 'Thứ Hai' },
  { value: 2, short: 'T3', long: 'Thứ Ba' },
  { value: 3, short: 'T4', long: 'Thứ Tư' },
  { value: 4, short: 'T5', long: 'Thứ Năm' },
  { value: 5, short: 'T6', long: 'Thứ Sáu' },
  { value: 6, short: 'T7', long: 'Thứ Bảy' },
  { value: 0, short: 'CN', long: 'Chủ Nhật' },
];

const WEEK_PRESETS = [4, 8, 12]; // backend allows up to 12

export default function RecurringBookingScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  // 'gold' | 'diamond' get full VIP treatment; everyone else sees VIP-only slots as locked.
  const userTier = (user as any)?.tier as
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'diamond'
    | undefined;
  const isVip = userTier === 'gold' || userTier === 'diamond';

  const [step, setStep] = useState<Step>('branch');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(
    null,
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Recurrence config
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([6]); // default: every Saturday
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [weeks, setWeeks] = useState<number>(4);
  const [weeksMode, setWeeksMode] = useState<'preset' | 'custom'>('preset');
  const [customWeeks, setCustomWeeks] = useState<string>('4');

  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');

  // Slots for selected day-of-week (first slot preview)
  const [daySlots, setDaySlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User's existing active bookings on the chosen branch — used to disable
  // slots the user already owns so they can't double-book themselves.
  const [userBookedSlotKeys, setUserBookedSlotKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const filteredPackages = useMemo(
    () =>
      packages.filter(
        (pkg) => !pkg.branchId || pkg.branchId === selectedBranch?._id,
      ),
    [packages, selectedBranch?._id],
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch slots when entering recurrence step or when the chosen weekday changes.
  useEffect(() => {
    if (step !== 'recurrence') return;
    if (!selectedBranch?._id || !selectedPackage?._id) return;
    if (selectedWeekdays.length === 0) return;
    fetchSlotsForFirstWeekday();
    fetchUserBookedSlotsForWeekdays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedBranch?._id, selectedPackage?._id, selectedWeekdays.join(',')]);

  // Pull the user's existing active bookings for this branch so we can disable
  // any slot they already own (similar to the single-booking flow). Cached by
  // (branch, weekdays) so toggling a weekday refreshes the relevant dates.
  const fetchUserBookedSlotsForWeekdays = useCallback(async () => {
    if (!isAuthenticated || !selectedBranch?._id || selectedWeekdays.length === 0) {
      setUserBookedSlotKeys(new Set());
      return;
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastCandidate = new Date(today);
      lastCandidate.setDate(lastCandidate.getDate() + weeks * 7);

      const candidateDates: string[] = [];
      const cursor = new Date(today);
      while (cursor <= lastCandidate) {
        if (selectedWeekdays.includes(cursor.getDay())) {
          candidateDates.push(cursor.toISOString().split('T')[0]);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      const keys = new Set<string>();
      // Fetch each weekday in date range, 1 query per date — but limit to
      // active statuses only. We don't filter by status (BE only supports
      // exact match) so we filter client-side after fetch.
      const activeStatuses = new Set(['pending', 'confirmed', 'checked_in', 'in_progress']);
      const results = await Promise.allSettled(
        candidateDates.map((d) =>
          bookingApi.getMyBookings({
            dateFrom: d,
            dateTo: d,
            branchId: selectedBranch._id,
            limit: 100,
          }),
        ),
      );
      results.forEach((r, idx) => {
        if (r.status !== 'fulfilled') return;
        for (const b of r.value.data) {
          if (b.startTime && activeStatuses.has(b.status)) {
            keys.add(`${candidateDates[idx]}|${b.startTime}`);
          }
        }
      });
      setUserBookedSlotKeys(keys);
    } catch (err) {
      console.warn('[recurring] failed to fetch user bookings', err);
      setUserBookedSlotKeys(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedBranch?._id, selectedWeekdays.join(','), weeks]);

  const fetchInitialData = async () => {
    try {
      const [branchesRes, packagesRes] = await Promise.all([
        branchApi.getPublicBranches(),
        // `limit: 'all'` so the recurring flow shows every active package the
        // user could pick from — without it, BE defaults to 9 sorted by price
        // and we end up with an empty category-filtered list (see booking/
        // index.tsx for the same rationale).
        packageApi.getPackages({ status: 'active', limit: 'all' }),
      ]);
      setBranches(branchesRes);
      setPackages(packagesRes || []);
      if (isAuthenticated) {
        const vehiclesRes = await vehicleApi.getVehicles();
        setVehicles(vehiclesRes);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlotsForFirstWeekday = useCallback(async () => {
    if (!selectedBranch?._id || !selectedPackage?._id) return;
    if (selectedWeekdays.length === 0) return;

    setIsLoadingSlots(true);
    try {
      // Pick the first upcoming date matching one of the selected weekdays
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let candidate = new Date(today);
      candidate.setDate(today.getDate() + 1); // tomorrow onwards
      for (let i = 0; i < 7; i++) {
        if (selectedWeekdays.includes(candidate.getDay())) break;
        candidate.setDate(candidate.getDate() + 1);
      }
      const dateStr = candidate.toISOString().split('T')[0];
      const response = await bookingApi.getAvailableSlots({
        branchId: selectedBranch._id,
        date: dateStr,
        packageId: selectedPackage._id,
      });
      setDaySlots(response);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setDaySlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedBranch?._id, selectedPackage?._id, selectedWeekdays]);

  const getStepIndex = (): number => STEPS.findIndex(s => s.key === step);

  const canGoNext = (): boolean => {
    switch (step) {
      case 'branch':
        return !!selectedBranch;
      case 'package':
        return !!selectedPackage;
      case 'vehicle':
        return !!selectedVehicle;
      case 'recurrence':
        return (
          selectedWeekdays.length > 0 &&
          !!selectedTime &&
          getEffectiveWeeks() >= 1 &&
          getEffectiveWeeks() <= 12
        );
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const idx = getStepIndex();
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const handleBack = () => {
    const idx = getStepIndex();
    if (idx > 0) setStep(STEPS[idx - 1].key);
    else router.back();
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort(),
    );
  };

  const selectPresetWeeks = (w: number) => {
    setWeeksMode('preset');
    setWeeks(w);
  };

  const selectCustomWeeks = () => {
    setWeeksMode('custom');
  };

  const handleCustomWeeksChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    if (cleaned === '') {
      setCustomWeeks('');
      return;
    }
    const n = parseInt(cleaned, 10);
    if (Number.isNaN(n)) return;
    // Clamp visually so the field always matches what we'll submit.
    if (n < 1) {
      setCustomWeeks('1');
    } else if (n > 12) {
      setCustomWeeks('12');
    } else {
      setCustomWeeks(String(n));
    }
  };

  // Returns the effective weeks value (always clamped to 1..12).
  const getEffectiveWeeks = (): number => {
    if (weeksMode === 'custom') {
      const n = parseInt(customWeeks, 10);
      if (isNaN(n) || n < 1) return 0;
      return Math.min(12, n);
    }
    return weeks;
  };

  const handleSubmit = async () => {
    if (
      !selectedBranch ||
      !selectedPackage ||
      !selectedVehicle ||
      selectedWeekdays.length === 0 ||
      !selectedTime
    ) {
      return;
    }

    const effectiveWeeks = getEffectiveWeeks();
    if (effectiveWeeks < 1 || effectiveWeeks > 12) return;

    setIsSubmitting(true);
    try {
      const result: RecurringBookingResult = await bookingApi.createRecurringBooking(
        {
          branchId: selectedBranch._id,
          packageId: selectedPackage._id,
          vehicleId: selectedVehicle._id,
          weekdays: selectedWeekdays,
          startTime: selectedTime,
          weeks: effectiveWeeks,
          voucherCode: voucherCode.trim() || undefined,
          note: note.trim() || undefined,
        },
      );

      toast.show({
        variant: 'success',
        message: `Đã tạo ${result.totalCreated} lịch hẹn${
          result.totalFailed > 0
            ? `, ${result.totalFailed} ngày bị bỏ qua do trùng slot`
            : ''
        }.`,
      });

      // Cọc gộp cho cả nhóm định kỳ: BE gắn toàn bộ deposit vào buổi đầu
      // (isRecurringFirst). Nếu buổi đầu tạo thất bại (trùng slot), thử
      // buổi kế tiếp trong nhóm đã tạo thành công để lấy depositAmount.
      const depositBooking = result.created.find(
        (b: any) => (b.depositAmount ?? 0) > 0,
      ) as any;
      const depositAmt = depositBooking?.depositAmount ?? 0;
      const depositBookingId = depositBooking?._id ?? result.created[0]?._id;

      AlertDialog.show({
        title: 'Đặt lịch định kỳ thành công!',
        message:
          `Đã tạo ${result.totalCreated} lịch hẹn` +
          (result.totalFailed > 0 ? `, ${result.totalFailed} ngày bị bỏ qua do trùng slot` : '') +
          (depositAmt > 0
            ? `\n\nCọc gộp cho cả nhóm: ${formatCurrency(depositAmt)}.\nĐặt cọc ngay để giữ chỗ cho tất cả các buổi.`
            : '\n\nĐơn không yêu cầu đặt cọc.'),
        variant: 'success',
        actions: [
          {
            text: 'Về lịch sử',
            onPress: () => router.replace('/(tabs)/history'),
          },
          {
            text: depositAmt > 0 ? 'Đặt cọc ngay' : 'Xem chi tiết',
            onPress: () => {
              if (!depositBookingId) {
                router.replace('/(tabs)/history');
                return;
              }
              const target = depositAmt > 0
                ? `/payment/select?bookingId=${depositBookingId}&type=deposit`
                : `/booking/${depositBookingId}`;
              router.replace(target as any);
            },
          },
        ],
      });
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message || error?.message || 'Không thể tạo lịch định kỳ';
      toast.show({ variant: 'error', message: apiMessage });
      AlertDialog.error('Lỗi', apiMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Render helpers ----------

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((s, index) => (
        <View key={s.key} style={styles.progressStep}>
          <View
            style={[
              styles.progressDot,
              index <= getStepIndex() && styles.progressDotActive,
            ]}
          >
            <Text
              style={[
                styles.progressDotText,
                index <= getStepIndex() && styles.progressDotTextActive,
              ]}
            >
              {index + 1}
            </Text>
          </View>
          <Text
            style={[
              styles.progressLabel,
              index <= getStepIndex() && styles.progressLabelActive,
            ]}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBranchStep = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>
        Chọn chi nhánh
      </AppText>
      {branches.map(branch => (
        <TouchableOpacity
          key={branch._id}
          onPress={() => {
            if (selectedBranch?._id === branch._id) return;
            setSelectedBranch(branch);
            setSelectedPackage(null);
            // Time slots are branch-specific; clear so the user re-picks them
            // at the recurrence step instead of silently keeping the old slot.
            setSelectedTime('');
            setDaySlots([]);
          }}
        >
          <Card
            style={[
              styles.optionCard,
              selectedBranch?._id === branch._id && styles.optionCardSelected,
            ]}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionIcon}>
                <Text style={styles.optionEmoji}>📍</Text>
              </View>
              <View style={styles.optionInfo}>
                <AppText variant="body" style={styles.optionTitle}>
                  {branch.name}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {branch.address}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  {branch.openingTime} - {branch.closingTime}
                </AppText>
              </View>
              {selectedBranch?._id === branch._id && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPackageStep = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>
        Chọn gói dịch vụ
      </AppText>
      {filteredPackages.length === 0 ? (
        <EmptyState
          icon={<Text style={styles.optionEmoji}>✨</Text>}
          title="Chưa có gói dịch vụ"
          message={
            selectedBranch
              ? `Chi nhánh "${selectedBranch.name}" chưa có gói nào. Bạn có thể chọn chi nhánh khác hoặc quay lại bước trước.`
              : 'Hiện không có gói dịch vụ nào khả dụng.'
          }
        />
      ) : (
        filteredPackages.map(pkg => (
        <TouchableOpacity
          key={pkg._id}
          onPress={() => {
            if (selectedPackage?._id === pkg._id) return;
            setSelectedPackage(pkg);
            // Slot duration depends on the package; clear the picked time so
            // it doesn't survive into the recurrence step.
            setSelectedTime('');
            setDaySlots([]);
          }}
        >
          <Card
            style={[
              styles.optionCard,
              selectedPackage?._id === pkg._id && styles.optionCardSelected,
            ]}
          >
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.optionEmoji}>✨</Text>
              </View>
              <View style={styles.optionInfo}>
                <AppText variant="body" style={styles.optionTitle}>
                  {pkg.name}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {pkg.duration} phút •{' '}
                  {pkg.category === 'full'
                    ? 'Toàn diện'
                    : pkg.category === 'external'
                      ? 'Rửa ngoài'
                      : 'Dọn nội thất'}
                </AppText>
                <AppText variant="body" color="primary" style={styles.optionPrice}>
                  {formatCurrency(pkg.price)}
                </AppText>
              </View>
              {selectedPackage?._id === pkg._id && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))
      )}
    </View>
  );

  const renderVehicleStep = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>
        Chọn phương tiện
      </AppText>
      {vehicles.length === 0 ? (
        <EmptyState
          title="Chưa có phương tiện"
          message="Vui lòng thêm phương tiện trước"
          actionLabel="Thêm xe"
          onAction={() => router.push('/vehicle/add')}
        />
      ) : (
        vehicles.map(vehicle => (
          <TouchableOpacity
            key={vehicle._id}
            onPress={() => setSelectedVehicle(vehicle)}
          >
            <Card
              style={[
                styles.optionCard,
                selectedVehicle?._id === vehicle._id && styles.optionCardSelected,
              ]}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIcon}>
                  <Text style={styles.optionEmoji}>🚗</Text>
                </View>
                <View style={styles.optionInfo}>
                  <AppText variant="body" style={styles.optionTitle}>
                    {vehicle.licensePlate}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {vehicle.brand} {vehicle.model && `• ${vehicle.model}`}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {vehicle.color} • {vehicle.vehicleType}
                  </AppText>
                </View>
                {selectedVehicle?._id === vehicle._id && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
      <Button
        title="+ Thêm phương tiện mới"
        variant="outline"
        onPress={() => router.push('/vehicle/add')}
        style={styles.addButton}
      />
    </View>
  );

  const renderRecurrenceStep = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>
        Cấu hình lịch định kỳ
      </AppText>

      {/* Weekday picker */}
      <AppText variant="label" style={styles.sectionLabel}>
        Chọn thứ trong tuần
      </AppText>
      <View style={styles.weekdayRow}>
        {WEEKDAY_OPTIONS.map(day => {
          const active = selectedWeekdays.includes(day.value);
          return (
            <TouchableOpacity
              key={day.value}
              style={[
                styles.weekdayChip,
                active && styles.weekdayChipActive,
              ]}
              onPress={() => toggleWeekday(day.value)}
            >
              <Text
                style={[
                  styles.weekdayChipText,
                  active && styles.weekdayChipTextActive,
                ]}
              >
                {day.short}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <AppText variant="caption" color="textSecondary" style={styles.helperText}>
        Có thể chọn nhiều thứ
      </AppText>

      {/* Time picker */}
      <AppText variant="label" style={styles.sectionLabel}>
        Khung giờ cố định
      </AppText>
      {selectedWeekdays.length === 0 ? (
        <AppText variant="body" color="textSecondary">
          Vui lòng chọn ít nhất một thứ trong tuần trước
        </AppText>
      ) : isLoadingSlots ? (
        <View style={styles.timeGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <View key={i} style={styles.timeCardSkeleton}>
              <Text style={styles.timeLoadingText}>--:--</Text>
            </View>
          ))}
        </View>
      ) : daySlots.length === 0 ? (
        <AppText variant="body" color="textSecondary">
          Không có khung giờ trống
        </AppText>
      ) : (
        <View style={styles.timeGrid}>
          {daySlots.map((slot, idx) => {
            // Determine the FIRST upcoming date matching one of the chosen
            // weekdays — same logic as fetchSlotsForFirstWeekday so the keys
            // line up with userBookedSlotKeys.
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let candidate = new Date(today);
            candidate.setDate(today.getDate() + 1);
            for (let i = 0; i < 7; i++) {
              if (selectedWeekdays.includes(candidate.getDay())) break;
              candidate.setDate(candidate.getDate() + 1);
            }
            const slotDateStr = candidate.toISOString().split('T')[0];
            const userHasThisSlot = userBookedSlotKeys.has(
              `${slotDateStr}|${slot.startTime}`,
            );
            const isUnavailable = !slot.available && !userHasThisSlot;
            const isVipOnly =
              !!slot.vipOnly && !isUnavailable && !userHasThisSlot && !isVip;
            const isLocked = userHasThisSlot || isUnavailable || isVipOnly;
            const canBook = slot.available && !isVipOnly;
            return (
              <TouchableOpacity
                key={`${slot.startTime}-${idx}`}
                style={[
                  styles.timeCard,
                  isLocked && styles.timeCardDisabled,
                  selectedTime === slot.startTime && styles.timeCardSelected,
                ]}
                disabled={!canBook}
                onPress={() => canBook && setSelectedTime(slot.startTime)}
              >
                <Text
                  style={[
                    styles.timeText,
                    isLocked && styles.timeTextDisabled,
                    selectedTime === slot.startTime && styles.timeTextSelected,
                  ]}
                >
                  {slot.startTime}
                </Text>
                {userHasThisSlot ? (
                  <Text style={[styles.timeSlotFull, { color: colors.primary }]}>
                    Bạn đã đặt
                  </Text>
                ) : isUnavailable ? (
                  <Text style={styles.timeSlotFull}>Kín</Text>
                ) : isVipOnly ? (
                  <Text style={[styles.timeSlotFull, { color: colors.warning }]}>
                    VIP
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <AppText variant="caption" color="textTertiary" style={styles.helperText}>
        Khoảng giờ hiển thị chỉ cho 1 ngày mẫu. Backend sẽ tự đổi sang giờ
        trống gần nhất (±2h) cho các ngày sau bị trùng, hoặc bỏ qua nếu cả
        ngày đã kín — bạn sẽ thấy số buổi tạo được / bị bỏ qua sau khi đặt.
      </AppText>

      {/* Weeks picker */}
      <AppText variant="label" style={styles.sectionLabel}>
        Số tuần
      </AppText>
      <View style={styles.weeksRow}>
        {WEEK_PRESETS.map(w => (
          <TouchableOpacity
            key={w}
            style={[
              styles.weekChip,
              weeksMode === 'preset' && weeks === w && styles.weekChipActive,
            ]}
            onPress={() => selectPresetWeeks(w)}
          >
            <Text
              style={[
                styles.weekChipText,
                weeksMode === 'preset' && weeks === w && styles.weekChipTextActive,
              ]}
            >
              {w} tuần
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.weekChip,
            weeksMode === 'custom' && styles.weekChipActive,
          ]}
          onPress={selectCustomWeeks}
        >
          <Text
            style={[
              styles.weekChipText,
              weeksMode === 'custom' && styles.weekChipTextActive,
            ]}
          >
            Khác…
          </Text>
        </TouchableOpacity>
      </View>

      {weeksMode === 'custom' && (
        <Input
          label="Nhập số tuần (1–12)"
          value={customWeeks}
          onChangeText={handleCustomWeeksChange}
          keyboardType="number-pad"
          placeholder="VD: 6"
          containerStyle={styles.customWeeksInput}
        />
      )}

      {/* Total sessions preview */}
      <Card style={styles.previewCard}>
        <AppText variant="label" color="textSecondary">
          Tổng số buổi ước tính
        </AppText>
        <AppText variant="h2" color="primary">
          {selectedWeekdays.length * getEffectiveWeeks()} buổi
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {selectedWeekdays.length} thứ × {getEffectiveWeeks()} tuần
          {selectedTime ? ` • lúc ${selectedTime}` : ''}
        </AppText>
      </Card>
    </View>
  );

  const renderConfirmStep = () => {
    const effectiveWeeks = getEffectiveWeeks();
    const totalSessions = selectedWeekdays.length * effectiveWeeks;
    const pricePerSession = selectedPackage?.price || 0;
    const totalEstimate = totalSessions * pricePerSession;
    // Cọc 30% × TỔNG tiền cả nhóm, làm tròn 1.000đ — match logic BE.
    // Quy ước: gộp 1 lần thanh toán thay vì tách theo từng buổi.
    const depositRate = userTier === 'gold' || userTier === 'diamond' ? 0.3 : 0.3;
    const depositAmount = Math.round((totalEstimate * depositRate) / 1000) * 1000;
    const weekdayLabels = selectedWeekdays
      .map(d => WEEKDAY_OPTIONS.find(o => o.value === d)?.long)
      .filter(Boolean)
      .join(', ');

    return (
      <View>
        <AppText variant="h3" style={styles.stepTitle}>
          Xác nhận đặt lịch định kỳ
        </AppText>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Chi nhánh</Text>
            <Text style={styles.summaryValue}>{selectedBranch?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Địa chỉ</Text>
            <Text style={styles.summaryValue}>{selectedBranch?.address}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gói dịch vụ</Text>
            <Text style={styles.summaryValue}>{selectedPackage?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phương tiện</Text>
            <Text style={styles.summaryValue}>{selectedVehicle?.licensePlate}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thứ</Text>
            <Text style={styles.summaryValue}>{weekdayLabels || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giờ</Text>
            <Text style={styles.summaryValue}>{selectedTime || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số tuần</Text>
            <Text style={styles.summaryValue}>{effectiveWeeks} tuần</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng buổi</Text>
            <Text style={styles.summaryValue}>{totalSessions} buổi</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Đơn giá</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(pricePerSession)} / buổi
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng cộng</Text>
            <Text style={styles.summaryPrice}>
              {formatCurrency(totalEstimate)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cọc trước (30%)</Text>
            <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>
              {formatCurrency(depositAmount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Còn lại khi hoàn thành</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(Math.max(0, totalEstimate - depositAmount))}
            </Text>
          </View>
          <AppText variant="caption" color="textTertiary" style={styles.summaryFootnote}>
            * Cọc gộp 1 lần cho cả nhóm ({totalSessions} buổi). Phần còn lại thanh toán sau buổi cuối.
            Tổng tiền có thể giảm nếu một số ngày bị trùng slot và bị backend bỏ qua.
          </AppText>
        </Card>

        <Input
          label="Mã giảm giá (tùy chọn)"
          placeholder="Nhập mã voucher"
          value={voucherCode}
          onChangeText={setVoucherCode}
          autoCapitalize="characters"
          containerStyle={styles.voucherInput}
        />

        <Input
          label="Ghi chú (tùy chọn)"
          placeholder="Ghi chú cho các buổi đặt lịch"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          containerStyle={styles.voucherInput}
        />
      </View>
    );
  };

  // ---------- Guards ----------

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="Vui lòng đăng nhập"
          message="Bạn cần đăng nhập để đặt lịch"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login')}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Đang tải..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Đặt lịch định kỳ</AppText>
        <View style={{ width: 24 }} />
      </View>

      {renderProgressBar()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'branch' && renderBranchStep()}
        {step === 'package' && renderPackageStep()}
        {step === 'vehicle' && renderVehicleStep()}
        {step === 'recurrence' && renderRecurrenceStep()}
        {step === 'confirm' && renderConfirmStep()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.bottomAction}>
        <Button
          title={step === 'confirm' ? 'Xác nhận đặt lịch định kỳ' : 'Tiếp tục'}
          onPress={step === 'confirm' ? handleSubmit : handleNext}
          disabled={!canGoNext()}
          loading={isSubmitting}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressDotText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  progressDotTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  progressLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  stepTitle: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  helperText: {
    marginTop: spacing.xs,
  },
  optionCard: {
    marginBottom: spacing.sm,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  optionPrice: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  checkIcon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  addButton: {
    marginTop: spacing.md,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekdayChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekdayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayChipText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  weekdayChipTextActive: {
    color: colors.textInverse,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  timeCardDisabled: {
    opacity: 0.5,
  },
  timeCardSelected: {
    backgroundColor: colors.primary,
  },
  timeText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  timeTextDisabled: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  timeTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  timeSlotFull: {
    ...typography.caption,
    color: colors.error,
    fontSize: 10,
    marginTop: 2,
  },
  timeCardSkeleton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    minWidth: 72,
    alignItems: 'center',
    opacity: 0.5,
  },
  timeLoadingText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  weeksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekChip: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  weekChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  weekChipText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  weekChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  previewCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.infoLight,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  summaryPrice: {
    ...typography.h3,
    color: colors.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  summaryFootnote: {
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  voucherInput: {
    marginTop: spacing.md,
  },
  customWeeksInput: {
    marginTop: spacing.sm,
  },
  bottomAction: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
