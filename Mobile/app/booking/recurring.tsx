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
  const { isAuthenticated } = useAuth();
  const toast = useToast();

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

  // Fetch slots when entering recurrence step
  useEffect(() => {
    if (step !== 'recurrence') return;
    if (!selectedBranch?._id || !selectedPackage?._id) return;
    fetchSlotsForFirstWeekday();
  }, [step, selectedBranch?._id, selectedPackage?._id]);

  const fetchInitialData = async () => {
    try {
      const [branchesRes, packagesRes] = await Promise.all([
        branchApi.getPublicBranches(),
        packageApi.getPackages({ status: 'active' }),
      ]);
      setBranches(branchesRes);
      setPackages(packagesRes);
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
    setCustomWeeks(cleaned);
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

      AlertDialog.show({
        title: 'Đặt lịch định kỳ thành công!',
        message: `Đã tạo ${result.totalCreated} lịch hẹn${
          result.totalFailed > 0
            ? `, ${result.totalFailed} ngày bị bỏ qua do trùng slot`
            : ''
        }.`,
        variant: 'success',
        actions: [
          {
            text: 'Về lịch sử',
            onPress: () => router.replace('/(tabs)/history'),
          },
          {
            text: 'Xem chi tiết',
            onPress: () =>
              result.created[0]?._id
                ? router.replace(`/booking/${result.created[0]._id}`)
                : router.replace('/(tabs)/history'),
          },
        ],
      });
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message || error?.message || 'Không thể tạo lịch định kỳ';
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
            setSelectedBranch(branch);
            setSelectedPackage(null);
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
      {filteredPackages.map(pkg => (
        <TouchableOpacity
          key={pkg._id}
          onPress={() => setSelectedPackage(pkg)}
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
      ))}
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
            const available = slot.available;
            const active = selectedTime === slot.startTime;
            return (
              <TouchableOpacity
                key={`${slot.startTime}-${idx}`}
                style={[
                  styles.timeCard,
                  !available && styles.timeCardDisabled,
                  active && styles.timeCardSelected,
                ]}
                disabled={!available}
                onPress={() => available && setSelectedTime(slot.startTime)}
              >
                <Text
                  style={[
                    styles.timeText,
                    !available && styles.timeTextDisabled,
                    active && styles.timeTextSelected,
                  ]}
                >
                  {slot.startTime}
                </Text>
                {!available && (
                  <Text style={styles.timeSlotFull}>Kín</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
            <Text style={styles.summaryLabel}>Ước tính</Text>
            <Text style={styles.summaryPrice}>
              {formatCurrency(totalEstimate)}
            </Text>
          </View>
          <AppText variant="caption" color="textTertiary" style={styles.summaryFootnote}>
            * Đặt cọc 30% cho mỗi buổi. Tổng tiền có thể thay đổi nếu một số ngày bị trùng slot và bị backend bỏ qua.
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
