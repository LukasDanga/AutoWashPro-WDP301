/**
 * AutoWashPro Booking Context
 *
 * Shared form state for the booking flow so each step can mount/unmount
 * without losing user progress. Persists lightweight selections (branch,
 * package, vehicle, voucher) to AsyncStorage so a user who backs out
 * accidentally can resume where they left off.
 *
 * Flow (branch-first — mirrors the web landing page BookingWidget):
 *   branch → package → vehicle → datetime → confirm
 *
 * UX notes:
 *  - the branch is picked FIRST so the package list can be scoped to exactly
 *    what that branch offers (no dead-ends, no PACKAGE_BRANCH_MISMATCH).
 *  - resetting is explicit (resetAll) so deep navigation never silently
 *    drops selections.
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
import type { Branch, Package, Vehicle } from '../types';

export type BookingStep =
  | 'branch'
  | 'package'
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
  selectedBranch: Branch | null;
  setSelectedBranch: (b: Branch | null) => void;

  selectedPackage: Package | null;
  setSelectedPackage: (p: Package | null) => void;
  // Replace the package WITHOUT clearing downstream selections (branch,
  // date, time). Use this when re-hydrating or auto-swapping to a
  // branch-scoped variant of the same product.
  replaceSelectedPackage: (p: Package | null) => void;

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
  'branch',
  'package',
  'vehicle',
  'datetime',
  'confirm',
];

const STORAGE_KEY = '@AutoWashPro:bookingDraft:v2';

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

interface BookingProviderProps {
  children: React.ReactNode;
  initialStep?: BookingStep;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({
  children,
  initialStep = 'branch',
}) => {
  const [step, setStepState] = useState<BookingStep>(initialStep);
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
  const [selectedPackage, setSelectedPackageState] = useState<Package | null>(null);
  const [selectedVehicle, setSelectedVehicleState] = useState<Vehicle | null>(null);
  const [selectedDate, setSelectedDateState] = useState<string | null>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
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
          if (draft.selectedBranch) setSelectedBranchState(draft.selectedBranch);
          if (draft.selectedPackage) setSelectedPackageState(draft.selectedPackage);
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
      selectedBranch,
      selectedPackage,
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
    selectedBranch,
    selectedPackage,
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
    setSelectedBranchState(null);
    setSelectedPackageState(null);
    setSelectedVehicleState(null);
    setSelectedDateState(null);
    setSelectedTimeState(null);
    setVoucherState(null);
    setStepState('branch');
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const setSelectedBranch = useCallback((b: Branch | null) => {
    setSelectedBranchState(b);
    // Packages are branch-scoped, so changing branch invalidates the
    // package (and therefore the date/time slots that depend on it).
    setSelectedPackageState(null);
    setSelectedDateState(null);
    setSelectedTimeState(null);
  }, []);

  const setSelectedPackage = useCallback((p: Package | null) => {
    setSelectedPackageState(p);
    // Switching package changes which slots are offered; reset date/time.
    // Branch is upstream and stays selected.
    setSelectedDateState(null);
    setSelectedTimeState(null);
  }, []);

  const replaceSelectedPackage = useCallback((p: Package | null) => {
    // Same as setSelectedPackageState — used by callers that already know
    // the downstream selections are still valid (e.g. branch-scoped swap).
    setSelectedPackageState(p);
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
      case 'branch':
        return !!selectedBranch;
      case 'package':
        return !!selectedPackage;
      case 'vehicle':
        return !!selectedVehicle;
      case 'datetime':
        return !!selectedDate && !!selectedTime;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [step, selectedBranch, selectedPackage, selectedVehicle, selectedDate, selectedTime]);

  const stepIndex = STEP_ORDER.indexOf(step);

  const value = useMemo<BookingContextValue>(
    () => ({
      step,
      setStep,
      goNext,
      goBack,
      resetAll,
      selectedBranch,
      setSelectedBranch,
      selectedPackage,
      setSelectedPackage,
      replaceSelectedPackage,
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
      selectedBranch,
      setSelectedBranch,
      selectedPackage,
      setSelectedPackage,
      replaceSelectedPackage,
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