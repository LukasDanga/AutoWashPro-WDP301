/**
 * AutoWashPro Booking Context
 *
 * Shared form state for the booking flow so each step can mount/unmount
 * without losing user progress. Persists lightweight selections (category,
 * package, branch, vehicle, voucher) to AsyncStorage so a user who backs out
 * accidentally can resume where they left off.
 *
 * Flow (service-first):
 *   category → package → branch → vehicle → datetime → confirm
 *
 * UX notes:
 *  - the "category" step narrows the package list to what the user actually
 *    wants BEFORE they commit, so branch filtering can show only branches
 *    that offer that package (no dead-ends).
 *  - resetting is explicit (resetAll / resetFrom) so deep navigation never
 *    silently drops selections.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Branch, Package, Vehicle, PackageCategory } from '../types';

export type BookingStep =
  | 'category'
  | 'package'
  | 'branch'
  | 'vehicle'
  | 'datetime'
  | 'confirm';

export type VoucherState = {
  valid: boolean;
  code: string;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
};

type PersistedDraft = {
  category?: PackageCategory | null;
  selectedPackage?: Package | null;
  selectedBranch?: Branch | null;
  selectedVehicle?: Vehicle | null;
  selectedDate?: string | null;
  selectedTime?: string | null;
  voucher?: VoucherState | null;
};

interface BookingContextValue {
  // Step state
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  goNext: () => void;
  goBack: () => void;
  resetAll: () => void;

  // Selections
  category: PackageCategory | null;
  setCategory: (c: PackageCategory | null) => void;

  selectedPackage: Package | null;
  setSelectedPackage: (p: Package | null) => void;

  selectedBranch: Branch | null;
  setSelectedBranch: (b: Branch | null) => void;

  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (v: Vehicle | null) => void;

  selectedDate: string | null;
  selectedTime: string | null;
  setSelectedDateTime: (date: string | null, time: string | null) => void;

  voucher: VoucherState | null;
  setVoucher: (v: VoucherState | null) => void;

  // Step-order helper
  canGoNext: () => boolean;
  stepIndex: number;

  // Draft persistence
  isHydrated: boolean;
}

const STEP_ORDER: BookingStep[] = [
  'category',
  'package',
  'branch',
  'vehicle',
  'datetime',
  'confirm',
];

const STORAGE_KEY = '@AutoWashPro:bookingDraft:v1';

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

interface BookingProviderProps {
  children: React.ReactNode;
  initialStep?: BookingStep;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({
  children,
  initialStep = 'category',
}) => {
  const [step, setStepState] = useState<BookingStep>(initialStep);
  const [isHydrated, setIsHydrated] = useState(false);

  const [category, setCategoryState] = useState<PackageCategory | null>(null);
  const [selectedPackage, setSelectedPackageState] = useState<Package | null>(null);
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
  const [selectedVehicle, setSelectedVehicleState] = useState<Vehicle | null>(null);
  const [selectedDate, setSelectedDateState] = useState<string | null>(null);
  const [selectedTime, setSelectedTimeState] = useState<string | null>(null);
  const [voucher, setVoucherState] = useState<VoucherState | null>(null);

  // Track the last-written draft to avoid redundant writes
  const lastDraftRef = useRef<string>('');

  // Hydrate draft on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          const draft = JSON.parse(raw) as PersistedDraft;
          if (draft.category) setCategoryState(draft.category);
          if (draft.selectedPackage) setSelectedPackageState(draft.selectedPackage);
          if (draft.selectedBranch) setSelectedBranchState(draft.selectedBranch);
          if (draft.selectedVehicle) setSelectedVehicleState(draft.selectedVehicle);
          if (draft.selectedDate) setSelectedDateState(draft.selectedDate);
          if (draft.selectedTime) setSelectedTimeState(draft.selectedTime);
          if (draft.voucher) setVoucherState(draft.voucher);
        }
      } catch (err) {
        console.warn('[BookingContext] hydrate failed:', err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist draft (debounced via ref compare)
  useEffect(() => {
    if (!isHydrated) return;
    const draft: PersistedDraft = {
      category,
      selectedPackage,
      selectedBranch,
      selectedVehicle,
      selectedDate,
      selectedTime,
      voucher,
    };
    const serialized = JSON.stringify(draft);
    if (serialized === lastDraftRef.current) return;
    lastDraftRef.current = serialized;
    AsyncStorage.setItem(STORAGE_KEY, serialized).catch((err) =>
      console.warn('[BookingContext] persist failed:', err),
    );
  }, [
    isHydrated,
    category,
    selectedPackage,
    selectedBranch,
    selectedVehicle,
    selectedDate,
    selectedTime,
    voucher,
  ]);

  const setStep = useCallback((next: BookingStep) => setStepState(next), []);

  const goNext = useCallback(() => {
    setStepState((s) => {
      const i = STEP_ORDER.indexOf(s);
      if (i === -1 || i >= STEP_ORDER.length - 1) return s;
      return STEP_ORDER[i + 1];
    });
  }, []);

  const goBack = useCallback(() => {
    setStepState((s) => {
      const i = STEP_ORDER.indexOf(s);
      if (i <= 0) return s;
      return STEP_ORDER[i - 1];
    });
  }, []);

  const resetAll = useCallback(() => {
    setCategoryState(null);
    setSelectedPackageState(null);
    setSelectedBranchState(null);
    setSelectedVehicleState(null);
    setSelectedDateState(null);
    setSelectedTimeState(null);
    setVoucherState(null);
    setStepState('category');
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const setCategory = useCallback((c: PackageCategory | null) => {
    setCategoryState(c);
    // Changing category invalidates downstream selections
    setSelectedPackageState(null);
    setSelectedBranchState(null);
    setSelectedDateState(null);
    setSelectedTimeState(null);
  }, []);

  const setSelectedPackage = useCallback((p: Package | null) => {
    setSelectedPackageState(p);
    // Switching package may change which branches offer it; reset branch to force re-pick
    setSelectedBranchState(null);
    setSelectedDateState(null);
    setSelectedTimeState(null);
  }, []);

  const setSelectedBranch = useCallback((b: Branch | null) => {
    setSelectedBranchState(b);
    setSelectedDateState(null);
    setSelectedTimeState(null);
  }, []);

  const setSelectedVehicle = useCallback((v: Vehicle | null) => {
    setSelectedVehicleState(v);
  }, []);

  const setSelectedDateTime = useCallback((date: string | null, time: string | null) => {
    setSelectedDateState(date);
    setSelectedTimeState(time);
  }, []);

  const setVoucher = useCallback((v: VoucherState | null) => setVoucherState(v), []);

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case 'category':
        return !!category;
      case 'package':
        return !!selectedPackage;
      case 'branch':
        return !!selectedBranch;
      case 'vehicle':
        return !!selectedVehicle;
      case 'datetime':
        return !!selectedDate && !!selectedTime;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [step, category, selectedPackage, selectedBranch, selectedVehicle, selectedDate, selectedTime]);

  const stepIndex = STEP_ORDER.indexOf(step);

  const value = useMemo<BookingContextValue>(
    () => ({
      step,
      setStep,
      goNext,
      goBack,
      resetAll,
      category,
      setCategory,
      selectedPackage,
      setSelectedPackage,
      selectedBranch,
      setSelectedBranch,
      selectedVehicle,
      setSelectedVehicle,
      selectedDate,
      selectedTime,
      setSelectedDateTime,
      voucher,
      setVoucher,
      canGoNext,
      stepIndex,
      isHydrated,
    }),
    [
      step,
      setStep,
      goNext,
      goBack,
      resetAll,
      category,
      setCategory,
      selectedPackage,
      setSelectedPackage,
      selectedBranch,
      setSelectedBranch,
      selectedVehicle,
      setSelectedVehicle,
      selectedDate,
      selectedTime,
      setSelectedDateTime,
      voucher,
      setVoucher,
      canGoNext,
      stepIndex,
      isHydrated,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

export const useBooking = (): BookingContextValue => {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return ctx;
};

export const BOOKING_STEP_ORDER = STEP_ORDER;
export type { BookingStep as BookingStepKey };