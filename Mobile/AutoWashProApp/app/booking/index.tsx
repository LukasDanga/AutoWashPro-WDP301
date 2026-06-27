/**
 * AutoWashPro Booking Flow Screens
 * Step-by-step booking process
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { branchApi, packageApi, vehicleApi, bookingApi } from '../../src/api';
import { 
  Text as AppText, 
  Card, 
  Button,
  Loading,
  EmptyState,
  Input,
} from '../../src/components/common';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import type { Branch, Package, Vehicle, AvailableSlot } from '../../src/types';

type BookingStep = 'branch' | 'package' | 'vehicle' | 'datetime' | 'confirm';

const STEPS: { key: BookingStep; label: string }[] = [
  { key: 'branch', label: 'Chi nhánh' },
  { key: 'package', label: 'Gói dịch vụ' },
  { key: 'vehicle', label: 'Phương tiện' },
  { key: 'datetime', label: 'Thời gian' },
  { key: 'confirm', label: 'Xác nhận' },
];

export default function BookingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams();

  const [step, setStep] = useState<BookingStep>('branch');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [voucherCode, setVoucherCode] = useState('');

  // Store slots for each date
  const [dateSlots, setDateSlots] = useState<Record<string, AvailableSlot[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter packages by selected branch
  const filteredPackages = packages.filter(
    (pkg) => !pkg.branchId || pkg.branchId === selectedBranch?._id
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch slots for all dates when entering datetime step
  useEffect(() => {
    if (step === 'datetime' && selectedBranch?._id && selectedPackage?._id) {
      fetchAllDateSlots();
    }
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

  const fetchSlots = async (branchId: string, date: string, packageId: string) => {
    setIsLoadingSlots(true);
    try {
      console.log('Fetching slots:', { branchId, date, packageId });
      const response = await bookingApi.getAvailableSlots({
        branchId,
        date,
        packageId,
      });
      console.log('Slots fetched:', response);
      setDateSlots((prev) => ({ ...prev, [date]: response }));
    } catch (error: any) {
      console.error('Error fetching slots:', error?.response?.data || error);
      setDateSlots((prev) => ({ ...prev, [date]: [] }));
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Fetch slots for all available dates when entering datetime step
  const fetchAllDateSlots = useCallback(() => {
    if (!selectedBranch?._id || !selectedPackage?._id) return;

    const dates = generateDateOptions();
    dates.forEach((date) => {
      fetchSlots(selectedBranch._id, date.value, selectedPackage._id);
    });
  }, [selectedBranch?._id, selectedPackage?._id]);

  const getStepIndex = (): number => STEPS.findIndex((s) => s.key === step);

  const canGoNext = (): boolean => {
    switch (step) {
      case 'branch': return !!selectedBranch;
      case 'package': return !!selectedPackage;
      case 'vehicle': return !!selectedVehicle;
      case 'datetime': return !!selectedDate && !!selectedTime;
      case 'confirm': return true;
      default: return false;
    }
  };

  const handleNext = () => {
    const currentIndex = getStepIndex();
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].key);
    }
  };

  const handleBack = () => {
    const currentIndex = getStepIndex();
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].key);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!selectedBranch || !selectedPackage || !selectedVehicle || !selectedDate || !selectedTime) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await bookingApi.createBooking({
        branchId: selectedBranch._id,
        packageId: selectedPackage._id,
        vehicleId: selectedVehicle._id,
        bookingDate: selectedDate,
        startTime: selectedTime,
        voucherCode: voucherCode || undefined,
      });

      Alert.alert(
        'Đặt lịch thành công!',
        `Mã đặt lịch: ${response._id}`,
        [
          {
            text: 'Xem chi tiết',
            onPress: () => router.replace(`/booking/${response._id}`),
          },
          {
            text: 'Về trang chủ',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể tạo đơn đặt lịch'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount || isNaN(amount)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `${date.getDate()}/${date.getMonth() + 1}`,
        dayOfWeek: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
      });
    }
    return dates;
  };

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <AppText variant="h4">Đặt lịch rửa xe</AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {STEPS.map((s, index) => (
          <View key={s.key} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                index <= getStepIndex() && styles.progressDotActive,
              ]}
            >
              <Text style={[
                styles.progressDotText,
                index <= getStepIndex() && styles.progressDotTextActive,
              ]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[
              styles.progressLabel,
              index <= getStepIndex() && styles.progressLabelActive,
            ]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Branch */}
        {step === 'branch' && (
          <View>
            <AppText variant="h3" style={styles.stepTitle}>
              Chọn chi nhánh
            </AppText>
            {branches.map((branch) => (
              <TouchableOpacity
                key={branch._id}
                onPress={() => {
                  setSelectedBranch(branch);
                  setSelectedPackage(null); // Reset package when branch changes
                  setDateSlots({}); // Clear date slots cache
                  setSelectedDate('');
                  setSelectedTime('');
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
        )}

        {/* Step 2: Select Package */}
        {step === 'package' && (
          <View>
            <AppText variant="h3" style={styles.stepTitle}>
              Chọn gói dịch vụ
            </AppText>
            {filteredPackages.map((pkg) => (
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
                        {pkg.duration} phút • {pkg.category === 'full' ? 'Toàn diện' : pkg.category === 'external' ? 'Rửa ngoài' : 'Dọn nội thất'}
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
        )}

        {/* Step 3: Select Vehicle */}
        {step === 'vehicle' && (
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
              vehicles.map((vehicle) => (
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
        )}

        {/* Step 4: Select Date/Time */}
        {step === 'datetime' && (
          <View>
            <AppText variant="h3" style={styles.stepTitle}>
              Chọn ngày và giờ
            </AppText>

            {/* Date Selection */}
            <AppText variant="label" style={styles.sectionLabel}>
              Chọn ngày
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {generateDateOptions().map((date) => {
                const dateSlotData = dateSlots[date.value];
                const isLoadingDate = dateSlotData === undefined;
                const hasAvailableSlots = dateSlotData?.some((s) => s.available) ?? false;
                const isDateFullyBooked = dateSlotData !== undefined && !hasAvailableSlots && (dateSlotData?.length ?? 0) > 0;

                return (
                  <TouchableOpacity
                    key={date.value}
                    style={[
                      styles.dateCard,
                      selectedDate === date.value && styles.dateCardSelected,
                      isDateFullyBooked && styles.dateCardDisabled,
                    ]}
                    onPress={() => {
                      if (isDateFullyBooked) return;
                      setSelectedDate(date.value);
                      setSelectedTime('');
                      if (selectedPackage && selectedBranch) {
                        fetchSlots(selectedBranch._id, date.value, selectedPackage._id);
                      }
                    }}
                  >
                    {isLoadingDate ? (
                      <View style={styles.dateLoading}>
                        <Text style={styles.dateLoadingText}>...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={[
                          styles.dateDay,
                          (selectedDate === date.value || isDateFullyBooked) && styles.dateDaySelected,
                          isDateFullyBooked && styles.dateTextDisabled,
                        ]}>
                          {date.dayOfWeek}
                        </Text>
                        <Text style={[
                          styles.dateValue,
                          (selectedDate === date.value || isDateFullyBooked) && styles.dateValueSelected,
                          isDateFullyBooked && styles.dateTextDisabled,
                        ]}>
                          {date.label}
                        </Text>
                        {isDateFullyBooked && (
                          <Text style={styles.dateFullText}>Đầy</Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time Selection */}
            {selectedDate && (
              <>
                <AppText variant="label" style={styles.sectionLabel}>
                  Chọn giờ
                </AppText>
                <View style={styles.timeGrid}>
                  {dateSlots[selectedDate] === undefined ? (
                    <View style={styles.timeLoadingContainer}>
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <View key={i} style={styles.timeCardSkeleton}>
                          <Text style={styles.timeLoadingText}>--:--</Text>
                        </View>
                      ))}
                    </View>
                  ) : (dateSlots[selectedDate] || []).length === 0 ? (
                    <AppText variant="body" color="textSecondary">
                      Không có khung giờ trống cho ngày này
                    </AppText>
                  ) : (
                    (dateSlots[selectedDate] || []).map((slot, idx) => (
                      <TouchableOpacity
                        key={`${slot.startTime}-${idx}`}
                        style={[
                          styles.timeCard,
                          !slot.available && styles.timeCardDisabled,
                          selectedTime === slot.startTime && styles.timeCardSelected,
                        ]}
                        onPress={() => slot.available && setSelectedTime(slot.startTime)}
                        disabled={!slot.available}
                      >
                        <Text style={[
                          styles.timeText,
                          !slot.available && styles.timeTextDisabled,
                          selectedTime === slot.startTime && styles.timeTextSelected,
                        ]}>
                          {slot.startTime}
                        </Text>
                        {!slot.available && (
                          <Text style={styles.timeSlotFull}>Kín</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && (
          <View>
            <AppText variant="h3" style={styles.stepTitle}>
              Xác nhận đặt lịch
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
                <Text style={styles.summaryLabel}>Ngày</Text>
                <Text style={styles.summaryValue}>{selectedDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Giờ</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng tiền</Text>
                <Text style={styles.summaryPrice}>{formatCurrency(selectedPackage?.price || 0)}</Text>
              </View>
            </Card>

            {/* Voucher Input */}
            <Input
              label="Mã giảm giá (tùy chọn)"
              placeholder="Nhập mã voucher"
              value={voucherCode}
              onChangeText={setVoucherCode}
              containerStyle={styles.voucherInput}
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <Button
          title={step === 'confirm' ? 'Xác nhận đặt lịch' : 'Tiếp tục'}
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
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  dateScroll: {
    marginBottom: spacing.md,
  },
  dateCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    minWidth: 80,
  },
  dateCardSelected: {
    backgroundColor: colors.primary,
  },
  dateCardDisabled: {
    backgroundColor: colors.surfaceDark,
    opacity: 0.6,
  },
  dateLoading: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLoadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  dateDay: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateDaySelected: {
    color: colors.textInverse,
  },
  dateValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dateValueSelected: {
    color: colors.textInverse,
  },
  dateTextDisabled: {
    color: colors.textTertiary,
  },
  dateFullText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    marginTop: spacing.xs,
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
    minWidth: 70,
    alignItems: 'center',
  },
  timeCardDisabled: {
    backgroundColor: colors.surfaceDark,
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
  timeLoadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeCardSkeleton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: 'center',
    opacity: 0.5,
  },
  timeLoadingText: {
    ...typography.body,
    color: colors.textTertiary,
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
  voucherInput: {
    marginTop: spacing.md,
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
