/**
 * AutoWashPro Booking Flow
 *
 * 6-step booking flow backed by BookingContext:
 *   category → package → branch → vehicle → datetime → confirm
 *
 * State & persistence:
 *  - Selections + step live in `BookingContext` so the user can deep-link in or
 *    back out without losing progress (draft is persisted to AsyncStorage).
 *  - Step transitions (`goNext` / `goBack`) and validation (`canGoNext`) are
 *    owned by the context — this screen only renders the active step and
 *    orchestrates side-effects (data fetch, slot lookup, submit).
 *
 * UX guidelines:
 *  - multi-step-progress (persisted via StepIndicator)
 *  - progressive disclosure (only the relevant step is interactive)
 *  - 44pt minimum touch targets
 *  - bottom-sticky primary CTA with safe-area handling
 *  - color-semantic tokens (no hardcoded hex)
 *  - loading / empty / error states per step
 *  - inline validation feedback
 *  - accessible labels for every interactive control
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text as RNText,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  useBooking,
  type BookingStep,
  type VoucherState,
} from '../../src/contexts/BookingContext';
import { branchApi, packageApi, vehicleApi, bookingApi, voucherApi } from '../../src/api';
import {
  Text as AppText,
  Card,
  Button,
  Loading,
  EmptyState,
  Input,
  Icon,
  Icons,
  PressableScale,
  Header,
  ScreenContainer,
  StepIndicator,
  Chip,
  useToast,
} from '../../src/components/common';
import { useColors } from '../../src/theme/ThemeContext';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { formatCurrency } from '../../src/utils';
import type {
  Branch,
  Package,
  PackageCategory,
  Vehicle,
  AvailableSlot,
} from '../../src/types';

const STEP_META: { key: BookingStep; label: string }[] = [
  { key: 'category', label: 'Dịch vụ' },
  { key: 'package', label: 'Gói' },
  { key: 'branch', label: 'Chi nhánh' },
  { key: 'vehicle', label: 'Xe' },
  { key: 'datetime', label: 'Thời gian' },
  { key: 'confirm', label: 'Xác nhận' },
];

const STEP_ICONS: Record<BookingStep, string> = {
  category: Icons.sparkle,
  package: Icons.sparkle,
  branch: Icons.locationOutline,
  vehicle: Icons.carOutline,
  datetime: Icons.calendarOutline,
  confirm: Icons.checkmark,
};

const CATEGORY_OPTIONS: { value: PackageCategory; label: string; subtitle: string }[] = [
  { value: 'external', label: 'Rửa ngoài', subtitle: 'Rửa và làm sạch bề mặt xe' },
  { value: 'internal', label: 'Dọn nội thất', subtitle: 'Hút bụi, lau chùi bên trong xe' },
  { value: 'full', label: 'Rửa toàn diện', subtitle: 'Rửa ngoài + Dọn nội thất' },
];

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, user } = useAuth();
  const colors = useColors();
  const toast = useToast();

  const {
    step,
    setStep,
    goNext,
    goBack,
    canGoNext,
    stepIndex,
    category,
    setCategory,
    selectedPackage,
    setSelectedPackage,
    replaceSelectedPackage,
    selectedBranch,
    setSelectedBranch,
    selectedVehicle,
    setSelectedVehicle,
    selectedDate,
    selectedTime,
    setSelectedDateTime,
    voucher,
    setVoucher,
    resetAll,
    isHydrated,
  } = useBooking();

  // Local catalog state — kept per-screen because the catalog changes
  // frequently and isn't worth caching across flows.
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [dateSlots, setDateSlots] = useState<Record<string, AvailableSlot[]>>({});
  const [dateSlotsErrors, setDateSlotsErrors] = useState<Record<string, string>>({});

  // Slots the current user already has an active booking for, keyed by
  // `${bookingDate}|${startTime}`. We compute this from `/bookings/my` so
  // we can override the BE's `vipOnly` flag on those slots — the BE marks
  // a slot `vipOnly` whenever there is 1 free seat left in the slot
  // (capacity − 1 bookings), but if the *current user* is the one holding
  // one of those bookings, that seat is "theirs", so the remaining seat
  // is still implicitly reserved for VIPs — and the user already has
  // theirs, so showing them "VIP only" is misleading.
  //
  // Key format intentionally matches `bookingDate` from the Booking type
  // (ISO date string) + `startTime` (HH:mm).
  const [userBookedSlotKeys, setUserBookedSlotKeys] = useState<Set<string>>(new Set());

  // Tracks the last (branchId) for which we have already attempted the
  // branch-scoped `/packages?branchId=…` fetch. Used by the swap effect
  // below to know when it is safe to decide there is *no* swap candidate.
  const [branchPackagesAttempted, setBranchPackagesAttempted] = useState<string | null>(null);

  const [voucherCode, setVoucherCode] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateOptions = useMemo(() => generateDateOptions(), []);

  // Active = booking still occupies a slot in the capacity table (BE
  // rejects same-slot new bookings against these statuses). Anything
  // else (cancelled / completed / no_show) frees the slot.
  const ACTIVE_BOOKING_STATUSES: ReadonlyArray<string> = [
    'pending',
    'confirmed',
    'checked_in',
    'in_progress',
  ];

  // Tier gating — BE reserves `vipOnly` slots (capacity − 1 already booked)
  // for `gold` / `diamond` members and rejects everyone else with
  // `SLOT_VIP_ONLY` at booking time. We surface this restriction right
  // here on the slot grid so users don't pick something only to see a
  // toast saying their booking was rejected at submit.
  const isVip = user?.tier === 'gold' || user?.tier === 'diamond';

  // Reset the draft if the user is no longer authenticated.
  useEffect(() => {
    if (isHydrated && !isAuthenticated) resetAll();
  }, [isHydrated, isAuthenticated, resetAll]);

  // Initial catalog load + deep-link prefill.
  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const [branchesRes, packagesRes] = await Promise.all([
          branchApi.getPublicBranches(),
          // Pass `limit: 'all'` so the mobile booking flow receives the FULL
          // active catalog, not just the first 9 sorted by price. Without
          // this, the category-filtered view at step 2 can end up empty
          // because the chosen category's packages were all > 9th by price.
          packageApi.getPackages({ status: 'active', limit: 'all' }),
        ]);
        if (cancelled) return;
        setBranches(branchesRes);
        // Dedupe packages — backend has been observed to return the same
        // (name, price, duration, category) under multiple `_id`s (one per
        // branch), which made the picker show duplicates. We don't know
        // the branch yet at this point, so we just collapse them by
        // composite key and keep the first occurrence.
        setPackages(dedupePackages(packagesRes));

        if (isAuthenticated) {
          const vehiclesRes = await vehicleApi.getVehicles();
          if (!cancelled) setVehicles(vehiclesRes);
        }
      } catch (error) {
        console.error('Error fetching booking catalog:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Deep-link prefill (rebook / quick-book from other screens).
  useEffect(() => {
    if (!isHydrated || isLoading) return;
    (async () => {
      // Set package first; setSelectedPackage clears selectedBranch, so we
      // have to set package before branch when both params are present.
      if (params.packageId && (!selectedPackage || selectedPackage._id !== params.packageId)) {
        try {
          const p = await packageApi.getPackage(params.packageId as string);
          setSelectedPackage(p);
          if (p.category && !category) setCategory(p.category);
        } catch {
          /* swallow */
        }
      }
      if (params.branchId && (!selectedBranch || selectedBranch._id !== params.branchId)) {
        try {
          const b = await branchApi.getBranch(params.branchId as string);
          setSelectedBranch(b);
        } catch {
          /* swallow */
        }
      }
      if (params.vehicleId && (!selectedVehicle || selectedVehicle._id !== params.vehicleId)) {
        const v = vehicles.find((x) => x._id === (params.vehicleId as string));
        if (v) setSelectedVehicle(v);
      }
      if ((params.branchId || params.packageId) && step === 'category') {
        setStep('package');
      }
    })();
    // intentional: prefill should run once per params change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isLoading]);

  // Packages shown in step 2 — narrowed by category AND by branch availability.
  //
  // The backend's `getPackages` does not always respect a `branchId` filter,
  // and can return packages that don't belong to the selected branch. We
  // therefore narrow the visible list client-side:
  //   1. by the user-selected category (when present)
  //   2. by branch compatibility when a branch is selected.
  //
  // A package is considered "compatible" when it has no branchId (global
  // package) or its branchId matches the selected branch. This prevents the
  // BE from later rejecting the (branchId, packageId) pair with
  // PACKAGE_BRANCH_MISMATCH when we ask for slots.
  const filteredPackages = useMemo(() => {
    let list = packages;
    if (category) list = list.filter((p) => p.category === category);
    if (selectedBranch?._id) {
      list = list.filter((p) => {
        if (!p.branchId) return true; // global package — assume available
        const branchId =
          typeof p.branchId === 'object' && p.branchId !== null
            ? (p.branchId as any)._id
            : p.branchId;
        return branchId === selectedBranch._id;
      });
    }
    return dedupePackages(list, selectedBranch?._id ?? null);
  }, [packages, category, selectedBranch?._id]);

  // Fetch branch-specific packages once a branch is picked and merge them
  // into the catalog. The global `getPackages` endpoint does not always
  // include a row whose `branchId` matches the selected branch (especially
  // for branches that only have branch-scoped services), so without this
  // step the customer would see an empty list and then get a
  // `PACKAGE_BRANCH_MISMATCH` when we ask the BE for slots.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedBranch?._id) return;
      try {
        const list = await branchApi.getBranchPackages(selectedBranch._id);
        if (cancelled) return;
        if (Array.isArray(list) && list.length > 0) {
          setPackages((prev) => {
            const merged = [...prev, ...list];
            return dedupePackages(merged, selectedBranch._id);
          });
        }
      } catch {
        /* fall back to already-loaded catalog */
      } finally {
        if (!cancelled) {
          // Mark this branch as fully processed (either merged or empty) so
          // the swap effect can finalize its decision without deferring
          // forever when the branch truly has no extra rows.
          setBranchPackagesAttempted((prev) =>
            prev === selectedBranch._id ? prev : selectedBranch._id,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBranch?._id]);

  // When the user changes branch, drop any selected package that no longer
  // belongs to it. Otherwise we carry an invalid (branchId, packageId) pair
  // forward to the slot lookup and BE rejects with PACKAGE_BRANCH_MISMATCH.
  //
  // We do this in two passes:
  //   1. If we find a row whose composite key matches the currently selected
  //      package BUT its `branchId` matches the selected branch, swap to it
  //      (different `_id` for the same product, branch-scoped variant).
  //   2. If no such compatible row exists, the branch the user picked does
  //      not offer this product. Pop a confirmation dialog and offer to take
  //      them back to step 2 (re-pick package) or step 3 (re-pick branch).
  //      We do NOT silently clear the package — that's a frustrating dead
  //      end that leaves the user wondering what just happened.
  useEffect(() => {
    if (!selectedBranch?._id || !selectedPackage) return;
    const current = selectedPackage;
    const isCompatible = filteredPackages.some((p) => p._id === current._id);
    if (isCompatible) {
      console.log('[booking/swap-effect] current package still compatible, no-op');
      return;
    }
    console.log('[booking/swap-effect] current package not compatible, looking for swap candidate');

    // Wait for the branch-scoped package fetch to complete (success or empty)
    // before deciding there is *no* swap candidate. Without this guard we
    // race the `getBranchPackages` fetch and would clear a valid selection
    // just because the row for the new branch hadn't been merged yet — or
    // forever defer when the branch truly has no extra rows.
    if (branchPackagesAttempted !== selectedBranch._id) {
      console.log('[booking/swap-effect] branch-scoped packages not yet attempted, defer');
      return;
    }

    // Try swapping to the branch-scoped variant with the same business key.
    const swapCandidate = packages.find((p) => {
      if (p._id === current._id) return false;
      if (p.name !== current.name) return false;
      if (p.price !== current.price) return false;
      if (p.duration !== current.duration) return false;
      if (p.category !== current.category) return false;
      const bid =
        typeof p.branchId === 'object' && p.branchId !== null
          ? (p.branchId as any)._id
          : p.branchId;
      return bid === selectedBranch._id || !bid;
    });
    if (swapCandidate) {
      console.log('[booking/swap-effect] swap to', swapCandidate._id, '(branch-scoped variant)');
      // IMPORTANT: use replaceSelectedPackage (NOT setSelectedPackage) so we
      // don't wipe the user's branch selection as a side effect.
      replaceSelectedPackage(swapCandidate as any);
      setVoucher(null);
      return;
    }

    // No compatible variant for this branch. Instead of silently clearing
    // the package (which is confusing — the user just picked it!), send
    // them back to step 2 with an explanation. The branch they just chose
    // either has no packages of the selected category, or no packages at
    // all. Either way they need to make a different selection.
    console.log('[booking/swap-effect] no swap candidate, sending user back to step 2');
    Alert.alert(
      'Chi nhánh không phù hợp',
      'Chi nhánh bạn vừa chọn không có gói dịch vụ này. Vui lòng chọn chi nhánh khác hoặc đổi gói dịch vụ.',
      [
        {
          text: 'Chọn lại dịch vụ',
          onPress: () => {
            // Clear only the branch — keep category + package so the user
            // can immediately see the (working) list of packages and can
            // pick a branch-aware one if available, or change category.
            setSelectedBranch(null);
            setVoucher(null);
            setStep('package');
          },
        },
        {
          text: 'Chọn chi nhánh khác',
          onPress: () => {
            setSelectedBranch(null);
            setVoucher(null);
            setStep('branch');
          },
        },
      ],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch?._id, packages, filteredPackages, branchPackagesAttempted]);

  // Fetch slots for all visible dates whenever the user enters the datetime
  // step with a branch + package selected.
  //
  // Session tracking: each (branchId, packageId) pair is one "session". The
  // session is invalidated whenever the pair changes, so going back and
  // changing branch or package re-fetches everything.
  const [slotsSessionKey, setSlotsSessionKey] = useState<string | null>(null);
  useEffect(() => {
    console.log('[booking/slots-effect] step=', step, 'branchId=', selectedBranch?._id, 'packageId=', selectedPackage?._id, 'sessionKey=', slotsSessionKey);
    if (step !== 'datetime') {
      // Don't keep a session alive outside the datetime step so we refetch
      // every time the user comes back here with the same selections.
      if (slotsSessionKey !== null) setSlotsSessionKey(null);
      return;
    }
    if (!selectedBranch?._id || !selectedPackage?._id) {
      console.log('[booking/slots-effect] missing branch or package, skip');
      return;
    }

    const sessionKey = `${selectedBranch._id}|${selectedPackage._id}`;
    if (slotsSessionKey === sessionKey) {
      console.log('[booking/slots-effect] session already kicked off, skip');
      return; // already kicked off
    }

    console.log('[booking/slots-effect] kicking off new session', sessionKey);
    // New session: mark it and kick off fetches for every visible date.
    setSlotsSessionKey(sessionKey);
    // Reset any previously loaded slots so the user sees skeletons instead
    // of stale data while we wait for the first response.
    setDateSlots({});
    setDateSlotsErrors({});
    setUserBookedSlotKeys(new Set());
    dateOptions.forEach((date) => {
      console.log('[booking/slots-effect] fetch slot for', date.value);
      fetchSlots(selectedBranch._id, date.value, selectedPackage._id);
    });
    // Also fetch this user's bookings for the visible date range so we
    // can label "Bạn đã đặt" on slots they already hold — otherwise the
    // BE's `vipOnly` flag would mark their own slot as VIP-only and
    // confuse them.
    fetchUserBookings(selectedBranch._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedBranch?._id, selectedPackage?._id]);

  const fetchUserBookings = useCallback(
    async (branchId: string) => {
      if (!user?._id) return;
      try {
        const firstDate = dateOptions[0]?.value;
        const lastDate = dateOptions[dateOptions.length - 1]?.value;
        if (!firstDate || !lastDate) return;
        const { data: bookings } = await bookingApi.getMyBookings({
          dateFrom: firstDate,
          dateTo: lastDate,
          limit: 100,
        });
        // Filter by branch (BE may return bookings from other branches
        // when filters don't include branchId) and by active status only.
        const keys = new Set<string>();
        for (const b of bookings) {
          if (!b) continue;
          if (ACTIVE_BOOKING_STATUSES.indexOf(b.status) === -1) continue;
          const bBranchId =
            typeof b.branchId === 'string' ? b.branchId : b.branchId?._id;
          if (bBranchId !== branchId) continue;
          const dateStr =
            typeof b.bookingDate === 'string'
              ? b.bookingDate.split('T')[0]
              : new Date(b.bookingDate).toISOString().split('T')[0];
          if (!dateStr || !b.startTime) continue;
          keys.add(`${dateStr}|${b.startTime}`);
        }
        console.log('[booking/fetchUserBookings] user has', keys.size, 'active bookings in range');
        setUserBookedSlotKeys(keys);
      } catch (err: any) {
        // Non-fatal: the slot grid still works without this hint.
        console.warn('[booking/fetchUserBookings] failed', err?.message || String(err));
      }
    },
    [user?._id, dateOptions, ACTIVE_BOOKING_STATUSES],
  );

  const fetchSlots = useCallback(
    async (branchId: string, date: string, packageId: string) => {
      console.log('[booking/fetchSlots] start', { branchId, date, packageId });
      setIsLoadingSlots(true);
      try {
        const response = await bookingApi.getAvailableSlots({
          branchId,
          date,
          packageId,
        });
        console.log('[booking/fetchSlots] ok', date, response?.length, 'slots');
        setDateSlots((prev) => ({ ...prev, [date]: response }));
        setDateSlotsErrors((prev) => {
          if (!(date in prev)) return prev;
          const next = { ...prev };
          delete next[date];
          return next;
        });
      } catch (error: any) {
        const data = error?.response?.data;
        const code = data?.code;
        const message = code || error?.message || 'unknown';
        console.error('[booking/fetchSlots] error', date, data || error?.message);
        setDateSlots((prev) => ({ ...prev, [date]: [] }));
        setDateSlotsErrors((prev) => ({ ...prev, [date]: message }));
        // Surface a one-time hint to the user instead of an infinite spinner.
        if (code === 'PACKAGE_BRANCH_MISMATCH') {
          toast.warning(
            'Gói dịch vụ không khả dụng tại chi nhánh này',
            'Vui lòng quay lại bước chọn gói để cập nhật.',
          );
        } else if (error?.response?.status !== 401) {
          toast.error('Không tải được khung giờ', 'Vui lòng thử lại sau.');
        }
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [toast],
  );

  const handleNext = () => {
    if (!canGoNext()) return;
    goNext();
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    goBack();
  };

  const handleSubmit = async () => {
    if (
      !selectedBranch ||
      !selectedPackage ||
      !selectedVehicle ||
      !selectedDate ||
      !selectedTime
    ) {
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
        voucherCode: voucher?.code || undefined,
      });
      // Chuyển sang màn thanh toán cọc. BE mặc định áp cọc 30% cho mọi đơn
      // (trừ slot_pack_usage). Nếu booking vừa tạo không có depositAmount,
      // payment/select sẽ hiển thị cảnh báo "Không yêu cầu cọc" và disable
      // nút thanh toán — user vẫn có thể bấm "Xem chi tiết" từ trang kết quả.
      const depositAmt = (response as any)?.depositAmount ?? 0;
      toast.show({
        variant: 'success',
        message: 'Đặt lịch thành công!',
        description: depositAmt > 0
          ? `Vui lòng đặt cọc ${formatCurrency(depositAmt)} để giữ chỗ.`
          : 'Đơn của bạn đã được ghi nhận.',
        duration: 3000,
      });
      // Dùng replace để user không back về form đặt lịch cũ.
      router.replace(
        `/payment/select?bookingId=${response._id}&type=deposit` as any,
      );
    } catch (error: any) {
      toast.error(
        'Đặt lịch thất bại',
        error.response?.data?.message || 'Không thể tạo đơn đặt lịch, vui lòng thử lại',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateVoucher = async () => {
    const code = voucherCode.trim();
    if (!code) {
      toast.warning('Vui lòng nhập mã voucher trước');
      return;
    }
    if (!selectedPackage) return;
    setIsValidatingVoucher(true);
    try {
      const res = await voucherApi.validateVoucher({
        code,
        bookingData: {
          packageId: selectedPackage._id,
          branchId: selectedBranch?._id,
          amount: selectedPackage.price,
        },
      });
      const next: VoucherState = {
        valid: true,
        code,
        discountAmount: res.discountAmount,
        finalAmount: res.finalAmount,
      };
      setVoucher(next);
      toast.success('Áp dụng mã giảm giá thành công');
    } catch (error: any) {
      setVoucher({ valid: false, code, message: error.response?.data?.message || 'Mã giảm giá không hợp lệ' });
      toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          iconName={Icons.personOutline}
          title="Vui lòng đăng nhập"
          message="Bạn cần đăng nhập để đặt lịch"
          actionLabel="Đăng nhập"
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) return <Loading fullScreen message="Đang tải..." />;

  const basePrice = selectedPackage?.price ?? 0;
  const finalPrice =
    voucher?.valid && voucher.finalAmount != null ? voucher.finalAmount : basePrice;

  const stepsForIndicator = STEP_META.map((s) => ({
    key: s.key,
    label: s.label,
    icon: STEP_ICONS[s.key],
  }));

  return (
    <ScreenContainer edges={['top']} background="subtle">
      <Header title="Đặt lịch rửa xe" showBack onBackPress={handleBack} />

      <View style={[styles.progressContainer, { backgroundColor: colors.background }]}>
        <StepIndicator steps={stepsForIndicator} currentIndex={stepIndex} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Pick service category */}
        {step === 'category' && (
          <StepLayout
            title="Chọn loại dịch vụ"
            subtitle="Bước đầu tiên giúp gợi ý gói phù hợp với bạn"
            icon={Icons.sparkle}
          >
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = category === opt.value;
              return (
                <PressableScale
                  key={opt.value}
                  onPress={() => setCategory(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Card
                    style={[
                      styles.categoryCard,
                      isSelected && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                        backgroundColor: colors.primarySubtle,
                      },
                    ]}
                  >
                    <View style={styles.optionRow}>
                      <View
                        style={[
                          styles.optionIcon,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                          },
                        ]}
                      >
                        <Icon
                          name={STEP_ICONS.category}
                          size={22}
                          color={isSelected ? colors.textInverse : colors.primary}
                        />
                      </View>
                      <View style={styles.optionInfo}>
                        <AppText variant="body" style={styles.optionTitle}>
                          {opt.label}
                        </AppText>
                        <AppText variant="caption" color="textSecondary">
                          {opt.subtitle}
                        </AppText>
                      </View>
                      {isSelected ? (
                        <View style={[styles.optionCheck, { backgroundColor: colors.primary }]}>
                          <Icon name={Icons.checkmark} size={16} color={colors.textInverse} />
                        </View>
                      ) : (
                        <View
                          style={[styles.optionCheckEmpty, { borderColor: colors.border }]}
                        />
                      )}
                    </View>
                  </Card>
                </PressableScale>
              );
            })}
          </StepLayout>
        )}

        {/* Step 2: Pick package (filtered by category) */}
        {step === 'package' && (
          <StepLayout
            title="Chọn gói dịch vụ"
            subtitle={
              category
                ? `Gói ${labelForCategory(category)}`
                : 'Chọn gói phù hợp với xe của bạn'
            }
            icon={Icons.sparkle}
          >
            {filteredPackages.length === 0 ? (
              <EmptyState
                iconName={Icons.sparkle}
                title="Chưa có gói phù hợp"
                message={
                  category
                    ? `Hiện chưa có gói ${labelForCategory(category)} nào. Vui lòng chọn loại khác.`
                    : 'Vui lòng quay lại chọn loại dịch vụ trước.'
                }
                actionLabel="Chọn lại dịch vụ"
                onAction={() => goBack()}
              />
            ) : (
              filteredPackages.map((pkg) => (
                <SelectableCard
                  key={pkg._id}
                  selected={selectedPackage?._id === pkg._id}
                  onPress={() => setSelectedPackage(pkg)}
                  icon={Icons.sparkle}
                  title={pkg.name}
                  subtitle={
                    <View>
                      <AppText variant="caption" color="textSecondary">
                        {pkg.duration} phút •{' '}
                        {pkg.category === 'full'
                          ? 'Toàn diện'
                          : pkg.category === 'external'
                          ? 'Rửa ngoài'
                          : 'Dọn nội thất'}
                      </AppText>
                      <AppText variant="body" color="primary" style={styles.priceText}>
                        {formatCurrency(pkg.price)}
                      </AppText>
                    </View>
                  }
                />
              ))
            )}
          </StepLayout>
        )}

        {/* Step 3: Pick branch */}
        {step === 'branch' && (
          <StepLayout
            title="Chọn chi nhánh"
            subtitle="Chọn chi nhánh gần bạn nhất"
            icon={Icons.locationOutline}
          >
            {branches.length === 0 ? (
              <EmptyState
                iconName={Icons.locationOutline}
                title="Không có chi nhánh"
                message="Hiện tại không có chi nhánh nào hoạt động"
              />
            ) : (
              (() => {
                // Compute the set of branches that actually offer at least
                // one package of the currently selected category. Without
                // this filter the user can pick a branch only to be told
                // (later) that it has no compatible package.
                const branchesWithPackage = (() => {
                  if (!category) return null; // no category yet → show all
                  const set = new Set<string>();
                  for (const p of packages) {
                    if (p.category !== category) continue;
                    const bid =
                      typeof p.branchId === 'object' && p.branchId !== null
                        ? (p.branchId as any)._id
                        : p.branchId;
                    if (typeof bid === 'string' && bid) set.add(bid);
                  }
                  return set;
                })();
                const visibleBranches = branchesWithPackage
                  ? branches.filter((b) => branchesWithPackage.has(b._id))
                  : branches;
                if (visibleBranches.length === 0) {
                  return (
                    <EmptyState
                      iconName={Icons.locationOutline}
                      title="Chưa có chi nhánh phù hợp"
                      message="Hiện chưa có chi nhánh nào có gói dịch vụ này. Vui lòng chọn loại dịch vụ khác."
                    />
                  );
                }
                return visibleBranches.map((branch) => (
                <SelectableCard
                  key={branch._id}
                  selected={selectedBranch?._id === branch._id}
                  onPress={() => setSelectedBranch(branch)}
                  icon={Icons.locationOutline}
                  title={branch.name}
                  subtitle={
                    <View>
                      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                        {branch.address}
                      </AppText>
                      <View style={styles.cardRowMeta}>
                        <Icon name={Icons.timeOutline} size={12} color={colors.textTertiary} />
                        <AppText variant="caption" color="textTertiary">
                          {branch.openingTime} - {branch.closingTime}
                        </AppText>
                      </View>
                    </View>
                  }
                />
                ));
              })()
            )}
          </StepLayout>
        )}

        {/* Step 4: Pick vehicle */}
        {step === 'vehicle' && (
          <StepLayout
            title="Chọn phương tiện"
            subtitle="Chọn xe để rửa"
            icon={Icons.carOutline}
          >
            {vehicles.length === 0 ? (
              <View>
                <EmptyState
                  iconName={Icons.carOutline}
                  title="Chưa có phương tiện"
                  message="Vui lòng thêm phương tiện trước"
                />
                <Button
                  title="Thêm phương tiện mới"
                  variant="outline"
                  icon={<Icon name={Icons.add} size={20} color={colors.primary} />}
                  onPress={() => router.push('/vehicle/add' as any)}
                  style={styles.addVehicleBtn}
                  fullWidth
                />
              </View>
            ) : (
              vehicles.map((vehicle) => (
                <SelectableCard
                  key={vehicle._id}
                  selected={selectedVehicle?._id === vehicle._id}
                  onPress={() => setSelectedVehicle(vehicle)}
                  icon={vehicle.vehicleType === 'motorcycle' ? Icons.bicycleOutline : Icons.carOutline}
                  title={vehicle.licensePlate}
                  subtitle={
                    <View>
                      <AppText variant="caption" color="textSecondary">
                        {vehicle.brand}
                        {vehicle.model ? ` • ${vehicle.model}` : ''}
                      </AppText>
                      <AppText variant="caption" color="textTertiary">
                        {vehicle.color} • {vehicle.vehicleType}
                      </AppText>
                    </View>
                  }
                />
              ))
            )}
            {vehicles.length > 0 ? (
              <Button
                title="Thêm phương tiện mới"
                variant="outline"
                icon={<Icon name={Icons.add} size={20} color={colors.primary} />}
                onPress={() => router.push('/vehicle/add' as any)}
                style={styles.addVehicleBtn}
                fullWidth
              />
            ) : null}
          </StepLayout>
        )}

        {/* Step 5: Pick date & time */}
        {step === 'datetime' && (
          <StepLayout
            title="Chọn ngày và giờ"
            subtitle="Chọn khung giờ thuận tiện"
            icon={Icons.calendarOutline}
          >
            {isLoadingSlots && Object.keys(dateSlots).length === 0 ? (
              <Card style={{ backgroundColor: colors.infoLight, marginBottom: spacing.sm }}>
                <View style={styles.inlineRow}>
                  <ActivityIndicator size="small" color={colors.info} />
                  <AppText variant="bodySmall" color="textPrimary" style={styles.inlineRowText}>
                    Đang tải khung giờ trống, vui lòng đợi một chút…
                  </AppText>
                </View>
              </Card>
            ) : null}
            {!isLoadingSlots &&
            Object.keys(dateSlots).length > 0 &&
            Object.values(dateSlots).every((s) => Array.isArray(s) && s.length === 0) &&
            selectedBranch &&
            selectedPackage ? (
              <Card style={{ backgroundColor: colors.warningLight, marginBottom: spacing.sm }}>
                <View style={styles.inlineRow}>
                  <Icon name={Icons.warning} size={20} color={colors.warning} />
                  <AppText variant="bodySmall" color="textPrimary" style={styles.inlineRowText}>
                    Chưa tải được khung giờ. Có thể gói dịch vụ chưa được kích hoạt tại chi nhánh này.
                  </AppText>
                </View>
                <Button
                  title="Thử lại"
                  variant="outline"
                  size="small"
                  icon={<Icon name={Icons.refreshOutline} size={16} color={colors.primary} />}
                  onPress={() => {
                    if (!selectedBranch || !selectedPackage) return;
                    console.log('[booking/retry] manual retry for all dates');
                    setSlotsSessionKey(null);
                    setDateSlots({});
                    dateOptions.forEach((date) => {
                      fetchSlots(selectedBranch._id, date.value, selectedPackage._id);
                    });
                  }}
                  style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
                />
              </Card>
            ) : null}
            <AppText variant="label" style={styles.sectionLabel}>
              Ngày
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScroll}
            >
              {dateOptions.map((date) => {
                const slotData = dateSlots[date.value];
                const slotError = dateSlotsErrors[date.value];
                const isLoadingDate = slotData === undefined && !slotError;
                const hasAvailableSlots = slotData?.some((s) => s.available) ?? false;
                const isFullyBooked =
                  slotData !== undefined && !hasAvailableSlots && (slotData?.length ?? 0) > 0;
                const isFailed = !!slotError;
                const isSelected = selectedDate === date.value;

                return (
                  <PressableScale
                    key={date.value}
                    onPress={() => {
                      if (isFullyBooked) return;
                      setSelectedDateTime(date.value, null);
                      if (selectedBranch && selectedPackage) {
                        // Force a refetch on tap so the user can recover from a
                        // previous failure (PACKAGE_BRANCH_MISMATCH, network
                        // blip, etc.) without leaving the screen. We bypass
                        // the slotsSessionKey dedupe by clearing that date's
                        // cached result first.
                        setDateSlots((prev) => {
                          if (!(date.value in prev)) return prev;
                          const next = { ...prev };
                          delete next[date.value];
                          return next;
                        });
                        setDateSlotsErrors((prev) => {
                          if (!(date.value in prev)) return prev;
                          const next = { ...prev };
                          delete next[date.value];
                          return next;
                        });
                        fetchSlots(selectedBranch._id, date.value, selectedPackage._id);
                      }
                    }}
                    disabled={isFullyBooked}
                    accessibilityLabel={`Ngày ${date.label}${isSelected ? ', đang chọn' : ''}${
                      isFullyBooked ? ', đã đầy' : isFailed ? ', lỗi tải, chạm để thử lại' : ''
                    }`}
                  >
                    <View
                      style={[
                        styles.dateCard,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                        isFullyBooked && styles.dateCardMuted,
                      ]}
                    >
                      {isLoadingDate ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <RNText
                            style={[
                              styles.dateDay,
                              { color: isSelected ? colors.textInverse : colors.textSecondary },
                            ]}
                          >
                            {date.dayOfWeek}
                          </RNText>
                          <RNText
                            style={[
                              styles.dateValue,
                              {
                                color: isSelected ? colors.textInverse : colors.textPrimary,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {date.label}
                          </RNText>
                          {isFailed ? (
                            <RNText style={[styles.dateFullText, { color: colors.error }]}>
                              Lỗi
                            </RNText>
                          ) : isFullyBooked ? (
                            <RNText style={[styles.dateFullText, { color: colors.error }]}>
                              Đầy
                            </RNText>
                          ) : null}
                        </>
                      )}
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>

            {selectedDate ? (
              <>
                <AppText variant="label" style={styles.sectionLabel}>
                  Khung giờ
                </AppText>
                {!isVip &&
                (dateSlots[selectedDate] || []).some((s) => s.vipOnly && s.available) ? (
                  <Card style={{ backgroundColor: colors.warningLight, marginBottom: spacing.sm }}>
                    <View style={styles.inlineRow}>
                      <Icon name={Icons.warning} size={18} color={colors.warning} />
                      <AppText variant="caption" color="textPrimary" style={styles.inlineRowText}>
                        Một số khung giờ chỉ dành cho thành viên VIP (Gold/Diamond).
                      </AppText>
                    </View>
                  </Card>
                ) : null}
                {dateSlots[selectedDate] === undefined ? (
                  <View style={styles.timeGrid}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.timeCardSkeleton,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <RNText style={[styles.timeText, { color: colors.textTertiary }]}>
                          --:--
                        </RNText>
                      </View>
                    ))}
                  </View>
                ) : (dateSlots[selectedDate] || []).length === 0 ? (
                  <Card style={{ backgroundColor: colors.warningLight }}>
                    <View style={styles.inlineRow}>
                      <Icon name={Icons.warning} size={20} color={colors.warning} />
                      <AppText variant="body" color="textPrimary" style={styles.inlineRowText}>
                        Không có khung giờ trống cho ngày này. Hãy chọn ngày khác.
                      </AppText>
                    </View>
                  </Card>
                ) : (
                  <View style={styles.timeGrid}>
                    {(dateSlots[selectedDate] || []).map((slot, idx) => {
                      const isSelected = selectedTime === slot.startTime;
                      // State precedence (most specific → least):
                      //   1. userHasThisSlot — user already booked this slot.
                      //      Visually muted (same look as "Kín lịch") so it
                      //      doesn't look selectable, but with a primary-
                      //      coloured "Bạn đã đặt" badge so the user can
                      //      tell it's their own slot, not a stranger's.
                      //   2. unavailable (capacity reached) → disabled.
                      //   3. vipOnly    (capacity - 1 already booked) → only
                      //      gold/diamond can book.
                      //   4. free       → anyone can pick.
                      const userHasThisSlot = userBookedSlotKeys.has(
                        `${selectedDate}|${slot.startTime}`,
                      );
                      const isUnavailable = !slot.available && !userHasThisSlot;
                      const isVipOnly =
                        !!slot.vipOnly && !isUnavailable && !userHasThisSlot && !isVip;
                      const isLocked = userHasThisSlot || isUnavailable || isVipOnly;
                      // `canBook` keeps a user-owned slot clickable here so
                      // the user can re-select the same time (e.g. to change
                      // the vehicle) — but the visual treatment below makes
                      // it obvious the slot is taken. If you'd rather have
                      // the user pick a *new* slot to add a vehicle, flip
                      // this to `slot.available && !isVipOnly && !userHasThisSlot`.
                      const canBook = slot.available && !isVipOnly;
                      return (
                        <PressableScale
                          key={`${slot.startTime}-${idx}`}
                          onPress={() => canBook && setSelectedDateTime(selectedDate, slot.startTime)}
                          disabled={!canBook}
                          accessibilityLabel={
                            `${slot.startTime}` +
                            (userHasThisSlot
                              ? ', bạn đã đặt khung giờ này'
                              : isUnavailable
                              ? ', đã đầy'
                              : isVipOnly
                              ? ', chỉ dành cho thành viên VIP'
                              : '') +
                            (isSelected ? ', đang chọn' : '')
                          }
                          accessibilityState={{ disabled: !canBook, selected: isSelected }}
                        >
                          <View
                            style={[
                              styles.timeCard,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.surface,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              isLocked && styles.timeCardMuted,
                            ]}
                          >
                            <RNText
                              style={[
                                styles.timeText,
                                {
                                  color: isSelected ? colors.textInverse : colors.textPrimary,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                                isLocked && styles.timeTextDisabled,
                              ]}
                            >
                              {slot.startTime}
                            </RNText>
                            {userHasThisSlot ? (
                              <RNText style={[styles.timeSlotFull, { color: colors.primary }]}>
                                Bạn đã đặt
                              </RNText>
                            ) : isUnavailable ? (
                              <RNText style={[styles.timeSlotFull, { color: colors.error }]}>
                                Kín lịch
                              </RNText>
                            ) : isVipOnly ? (
                              <RNText style={[styles.timeSlotFull, { color: colors.warning }]}>
                                VIP
                              </RNText>
                            ) : null}
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              </>
            ) : null}
          </StepLayout>
        )}

        {/* Step 6: Confirm */}
        {step === 'confirm' && (
          <StepLayout
            title="Xác nhận đặt lịch"
            subtitle="Kiểm tra thông tin và thanh toán"
            icon={Icons.checkmark}
          >
            <Card style={{ backgroundColor: colors.surface, padding: spacing.md }}>
              <SummaryRow icon={Icons.sparkle} label="Dịch vụ" value={category ? labelForCategory(category) : ''} />
              <SummaryDivider />
              <SummaryRow icon={Icons.locationOutline} label="Chi nhánh" value={selectedBranch?.name} />
              <SummaryDivider />
              <SummaryRow icon={Icons.sparkle} label="Gói dịch vụ" value={selectedPackage?.name} />
              <SummaryDivider />
              <SummaryRow icon={Icons.carOutline} label="Phương tiện" value={selectedVehicle?.licensePlate} />
              <SummaryDivider />
              <SummaryRow
                icon={Icons.calendarOutline}
                label="Ngày"
                value={
                  selectedDate
                    ? new Date(selectedDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : ''
                }
              />
              <SummaryDivider />
              <SummaryRow icon={Icons.timeOutline} label="Giờ" value={selectedTime ?? undefined} />
            </Card>

            <View style={styles.voucherWrap}>
              <View style={styles.voucherInputRow}>
                <View style={styles.voucherInputCol}>
                  <Input
                    label="Mã giảm giá (tùy chọn)"
                    placeholder="Nhập mã voucher"
                    value={voucherCode}
                    onChangeText={(t) => {
                      setVoucherCode(t);
                      setVoucher(null);
                    }}
                    containerStyle={styles.noMarginInput}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.voucherApplyCol}>
                  <Button
                    title="Áp dụng"
                    size="medium"
                    onPress={handleValidateVoucher}
                    loading={isValidatingVoucher}
                  />
                </View>
              </View>
              {voucher ? (
                voucher.valid ? (
                  <Card style={[styles.voucherFeedback, { backgroundColor: colors.successLight }]}>
                    <View style={styles.voucherResultRow}>
                      <Icon name={Icons.success} size={20} color={colors.success} />
                      <AppText variant="bodySmall" style={[styles.voucherFeedbackText, { color: colors.textPrimary }]}>
                        Áp dụng thành công! Giảm {formatCurrency(voucher.discountAmount || 0)}
                      </AppText>
                    </View>
                  </Card>
                ) : (
                  <Card style={[styles.voucherFeedback, { backgroundColor: colors.errorLight }]}>
                    <View style={styles.voucherResultRow}>
                      <Icon name={Icons.error} size={20} color={colors.error} />
                      <AppText variant="bodySmall" style={[styles.voucherFeedbackText, { color: colors.textPrimary }]}>
                        {voucher.message}
                      </AppText>
                    </View>
                  </Card>
                )
              ) : null}
            </View>

            <Card style={styles.priceCard}>
              <View style={styles.priceRow}>
                <AppText variant="body" color="textSecondary">
                  Giá gốc
                </AppText>
                <AppText variant="body" color="textPrimary">
                  {formatCurrency(basePrice)}
                </AppText>
              </View>
              {voucher?.valid && voucher.discountAmount ? (
                <View style={styles.priceRow}>
                  <AppText variant="body" color="textSecondary">
                    Giảm giá
                  </AppText>
                  <AppText variant="body" color="success">
                    -{formatCurrency(voucher.discountAmount)}
                  </AppText>
                </View>
              ) : null}
              <View style={[styles.priceDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.priceRow}>
                <AppText variant="h4">Tổng thanh toán</AppText>
                <AppText variant="h3" color="primary">
                  {formatCurrency(finalPrice)}
                </AppText>
              </View>
              {/* Cọc 30% — match BE DEPOSIT_RATE. Booking slot_pack_usage
                  đi flow riêng (dùng gói slot), không qua form đặt lịch này. */}
              {(() => {
                const deposit = Math.round((finalPrice * 0.3) / 1000) * 1000;
                const remaining = Math.max(0, finalPrice - deposit);
                return (
                  <>
                    <View style={[styles.priceDivider, { backgroundColor: colors.divider }]} />
                    <View style={styles.priceRow}>
                      <AppText variant="body" color="textSecondary">
                        Cọc trước (30%)
                      </AppText>
                      <AppText
                        variant="body"
                        style={{ fontWeight: '700' }}
                        color={colors.primary}
                      >
                        {formatCurrency(deposit)}
                      </AppText>
                    </View>
                    <View style={styles.priceRow}>
                      <AppText variant="body" color="textSecondary">
                        Còn lại khi hoàn thành
                      </AppText>
                      <AppText variant="body" color="textPrimary">
                        {formatCurrency(remaining)}
                      </AppText>
                    </View>
                  </>
                );
              })()}
            </Card>

            <Card style={[styles.infoBanner, { backgroundColor: colors.infoLight }]}>
              <Icon name={Icons.info} size={20} color={colors.info} />
              <View style={styles.infoContent}>
                <AppText variant="bodySmall" style={styles.infoTitle}>
                  Sau khi đặt lịch
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  Bạn sẽ được chuyển sang trang thanh toán cọc. Có thể chọn MoMo,
                  VNPay hoặc thanh toán tiền mặt khi đến chi nhánh.
                </AppText>
              </View>
            </Card>
          </StepLayout>
        )}
      </ScrollView>

      {/* Bottom Action — sticky primary CTA */}
      <View
        style={[
          styles.bottomAction,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        {stepIndex > 0 ? (
          <View style={styles.bottomBackButton}>
            <Button title="Quay lại" variant="outline" onPress={handleBack} fullWidth />
          </View>
        ) : null}
        <View
          style={
            stepIndex > 0 ? styles.bottomNextButton : styles.bottomPrimaryButton
          }
        >
          <Button
            title={step === 'confirm' ? 'Xác nhận đặt lịch' : 'Tiếp tục'}
            onPress={step === 'confirm' ? handleSubmit : handleNext}
            disabled={!canGoNext() || isLoadingSlots}
            loading={isSubmitting}
            fullWidth
            accessibilityLabel={
              step === 'confirm' ? 'Xác nhận đặt lịch' : 'Tiếp tục bước tiếp theo'
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function labelForCategory(c: PackageCategory): string {
  if (c === 'external') return 'Rửa ngoài';
  if (c === 'internal') return 'Dọn nội thất';
  return 'Rửa toàn diện';
}

interface StepLayoutProps {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
}

const StepLayout: React.FC<StepLayoutProps> = ({ title, subtitle, icon, children }) => {
  const colors = useColors();
  return (
    <View>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: colors.primarySubtle }]}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.stepHeaderText}>
          <AppText variant="h3">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" color="textSecondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
};

interface SelectableCardProps {
  selected: boolean;
  onPress: () => void;
  icon: string;
  title: string;
  subtitle: React.ReactNode;
}

const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  onPress,
  icon,
  title,
  subtitle,
}) => {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
    >
      <Card
        style={[
          styles.optionCard,
          selected && {
            borderWidth: 2,
            borderColor: colors.primary,
            backgroundColor: colors.primarySubtle,
          },
        ]}
      >
        <View style={styles.optionRow}>
          <View
            style={[
              styles.optionIcon,
              { backgroundColor: selected ? colors.primary : colors.surface },
            ]}
          >
            <Icon
              name={icon}
              size={22}
              color={selected ? colors.textInverse : colors.primary}
            />
          </View>
          <View style={styles.optionInfo}>
            <AppText variant="body" style={styles.optionTitle} numberOfLines={1}>
              {title}
            </AppText>
            {subtitle}
          </View>
          {selected ? (
            <View style={[styles.optionCheck, { backgroundColor: colors.primary }]}>
              <Icon name={Icons.checkmark} size={16} color={colors.textInverse} />
            </View>
          ) : (
            <View style={[styles.optionCheckEmpty, { borderColor: colors.border }]} />
          )}
        </View>
      </Card>
    </PressableScale>
  );
};

const SummaryDivider: React.FC = () => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.summaryDivider,
        { backgroundColor: colors.divider },
      ]}
    />
  );
};

const SummaryRow: React.FC<{
  icon: string;
  label: string;
  value?: string;
}> = ({ icon, label, value }) => {
  const colors = useColors();
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLeft}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
        <AppText variant="bodySmall" color="textSecondary">
          {label}
        </AppText>
      </View>
      <AppText variant="bodySmall" style={styles.summaryValue}>
        {value || '—'}
      </AppText>
    </View>
  );
};

/**
 * Dedupe packages that the backend returns as multiple instances of what is
 * logically the same product.
 *
 * The Mobile BE has been observed returning several rows with **different**
 * `_id`s but the same `(name, price, duration, category)`. This is almost
 * certainly because each row is bound to a specific branch, but the global
 * `/packages` endpoint joins/inlines them back, so the customer sees
 * "Rửa xe cơ bản" 5 times in a row.
 *
 * Strategy:
 *   1. Group by composite key `name|price|duration|category`.
 *   2. Within each group, prefer the instance whose `branchId` matches the
 *      currently-selected branch (if any). That way, the `_id` we end up
 *      holding is guaranteed to be valid for the branch the user picked —
 *      no more `PACKAGE_BRANCH_MISMATCH` at slot lookup time.
 *   3. Fall back to the global instance (`branchId` is null/missing) when
 *      no branch-specific match exists.
 *   4. Finally fall back to whatever was returned first.
 */
type DedupeBranchField = string | { _id: string } | null | undefined;
type PackageForDedupe<T> = T & {
  _id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  branchId?: DedupeBranchField;
};

function packageBranchIdOf<T>(p: T & DedupeBranchField): string | null {
  const bid = p as DedupeBranchField;
  if (!bid) return null;
  if (typeof bid === 'string') return bid;
  if (typeof bid === 'object' && '_id' in (bid as object)) {
    const inner = (bid as { _id?: unknown })._id;
    return typeof inner === 'string' ? inner : null;
  }
  return null;
}

function hasPackageMeta<T>(item: T): item is T & PackageForDedupe<T> {
  if (!item || typeof item !== 'object') return false;
  const x = item as Record<string, unknown>;
  return (
    typeof x._id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.price === 'number' &&
    typeof x.duration === 'number' &&
    typeof x.category === 'string'
  );
}

function dedupePackages<T>(
  items: T[],
  selectedBranchId?: string | null,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    if (!hasPackageMeta(item)) continue;
    const key = `${item.name}|${item.price}|${item.duration}|${item.category}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const result: T[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length === 1) {
      result.push(bucket[0]);
      continue;
    }
    // Prefer a row whose branchId equals the selected branch.
    const branchMatch = selectedBranchId
      ? bucket.find(
          (p): p is T & DedupeBranchField =>
            hasPackageMeta(p) &&
            packageBranchIdOf(p as T & DedupeBranchField) === selectedBranchId,
        )
      : undefined;
    if (branchMatch) {
      result.push(branchMatch);
      continue;
    }
    // Then prefer a "global" row (no branchId).
    const globalMatch = bucket.find(
      (p): p is T & DedupeBranchField =>
        hasPackageMeta(p) && packageBranchIdOf(p as T & DedupeBranchField) == null,
    );
    if (globalMatch) {
      result.push(globalMatch);
      continue;
    }
    // Otherwise keep the first one returned.
    result.push(bucket[0]);
  }
  return result;
}

function generateDateOptions() {
  const dates: { value: string; label: string; dayOfWeek: string }[] = [];
  const today = new Date();
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const value = date.toISOString().split('T')[0];
    const label =
      i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `${date.getDate()}/${date.getMonth() + 1}`;
    dates.push({
      value,
      label,
      dayOfWeek: labels[date.getDay()],
    });
  }
  return dates;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  stepHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeaderText: { flex: 1 },
  // Cards
  categoryCard: {
    marginBottom: spacing.sm,
  },
  optionCard: {
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionInfo: { flex: 1 },
  optionTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  optionCheckEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginLeft: spacing.sm,
  },
  cardRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  priceText: {
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  // Vehicle
  addVehicleBtn: {
    marginTop: spacing.md,
  },
  // Date / time
  sectionLabel: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dateScroll: {
    paddingVertical: 4,
    gap: spacing.sm,
  },
  dateCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    minWidth: 76,
    borderWidth: 1,
  },
  dateCardMuted: { opacity: 0.5 },
  dateDay: {
    fontSize: 11,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
  },
  dateFullText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeCard: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 76,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeCardSkeleton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 76,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeCardMuted: {
    opacity: 0.45,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  timeTextDisabled: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  timeText: {
    fontSize: 14,
  },
  timeSlotFull: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 96,
  },
  summaryValue: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  // Voucher
  voucherWrap: { marginTop: spacing.md },
  voucherInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  voucherInputCol: { flex: 1 },
  noMarginInput: { marginBottom: 0 },
  voucherApplyCol: {
    marginLeft: spacing.sm,
    marginTop: 24,
  },
  voucherFeedback: {
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  voucherFeedbackText: {
    flex: 1,
  },
  voucherResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Price
  priceCard: {
    marginTop: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  // Info banner
  infoBanner: {
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  // Inline row (warning empty slot)
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineRowText: { flex: 1 },
  // Bottom CTA
  bottomAction: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  bottomBackButton: { flex: 1 },
  bottomNextButton: { flex: 1 },
  bottomPrimaryButton: { flex: 1 },
});
