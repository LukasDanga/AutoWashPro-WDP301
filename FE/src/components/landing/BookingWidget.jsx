import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Clock, ShieldCheck, Car, Truck, Bike, Calendar, Tag, Check, 
  ArrowLeft, ArrowRight, RefreshCw, AlertCircle, Sparkles, Sun, Sunset, 
  Copy, Info, CheckCircle2, X
} from 'lucide-react';
import VoucherPicker from '../VoucherPicker.jsx';
import SlotPackFlow from '../customer/SlotPackFlow.jsx';
import useSSE from '../../hooks/useSSE.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const WEEKS_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

const WEEKDAY_OPTIONS = [
  { label: 'T2', value: 1 },
  { label: 'T3', value: 2 },
  { label: 'T4', value: 3 },
  { label: 'T5', value: 4 },
  { label: 'T6', value: 5 },
  { label: 'T7', value: 6 },
  { label: 'CN', value: 0 },
];

const TIME_SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

function buildBookingDates() {
  const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      id: `${date.getFullYear()}-${month}-${day}`,
      label: index === 0 ? 'Hôm nay' : weekdayFormatter.format(date).toUpperCase(),
      day, month, iso: `${date.getFullYear()}-${month}-${day}`,
    };
  });
}

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
];

export default function BookingWidget({ onOpenAuth, user, vehicles: userVehicles = [], apiBase, token, onGoToHistory, pendingBooking, onSetPendingBooking, onVehicleCreated, initialBranchId, initialTab }) {
  const isLoggedIn = !!user && !!token;
  const bookingDates = useMemo(() => buildBookingDates(), []);

  const [tab, setTab] = useState(initialTab || 'regular');
  const [step, setStep] = useState(1);
  const [spCanAdvance, setSpCanAdvance] = useState(false);

  // Data from API
  const [branches, setBranches] = useState([]);
  const [packages, setPackages] = useState([]);
  const [mySlotPacks, setMySlotPacks] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [todaySlots, setTodaySlots] = useState([]);
  const [todaySlotsLoading, setTodaySlotsLoading] = useState(false);

  // Selections
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedSubServices, setSelectedSubServices] = useState({});
  const [selectedDate, setSelectedDate] = useState(bookingDates[1]?.id || bookingDates[0]?.id);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [weeks, setWeeks] = useState(4);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [selectedSlotPack, setSelectedSlotPack] = useState(null);

  // Guest vehicle form
  const [guestVehicle, setGuestVehicle] = useState({ licensePlate: '', brand: '', model: '', type: 'sedan' });
  const [vehicleError, setVehicleError] = useState('');

  // Booking state
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingCode, setBookingCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  const [result, setResult] = useState(null);

  // Deposit payment state
  const [pendingDeposit, setPendingDeposit] = useState(null);
  const [depositPayment, setDepositPayment] = useState(null);
  const [depositQrStep, setDepositQrStep] = useState('select'); // 'select' | 'qr' | 'success'
  const [depositMethod, setDepositMethod] = useState('bank');
  const [paymentMode, setPaymentMode] = useState('deposit'); // 'deposit' or 'full'
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositPollCount, setDepositPollCount] = useState(0);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  // Process pending booking after login
  const [processingPending, setProcessingPending] = useState(false);

  // Recurring conflict check
  const [conflictCheck, setConflictCheck] = useState({ status: 'idle', results: [], totalConflicts: 0 });

  // SSE update trigger
  const [slotsUpdateTick, setSlotsUpdateTick] = useState(0);
  useSSE(token, 'slots_updated', () => setSlotsUpdateTick(t => t + 1));

  // Load branches (public)
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch(`${API_BASE}/branches/public`);
        const payload = await res.json();
        const data = payload?.data || payload || [];
        setBranches(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) setSelectedBranch(data[0]);
      } catch (e) { console.error('Failed to load branches', e); }
    }
    loadBranches();
  }, []);

  // Load packages when branch changes
  useEffect(() => {
    if (!selectedBranch) { setPackages([]); return; }
    async function loadPackages() {
      try {
        const branchId = selectedBranch._id || selectedBranch.id;
        const res = await fetch(`${API_BASE}/packages?branchId=${branchId}`);
        const payload = await res.json();
        const data = payload?.data || payload || [];
        const activePkgs = (Array.isArray(data) ? data : []).filter(p => p.status === 'active');
        setPackages(activePkgs);
        if (activePkgs.length > 0 && !activePkgs.find(p => (p._id || p.id) === (selectedPackage?._id || selectedPackage?.id))) {
          setSelectedPackage(activePkgs[0]);
        }
      } catch (e) { console.error('Failed to load packages', e); }
    }
    loadPackages();
  }, [selectedBranch]);

  // Fetch today slots preview when branch + first package are available
  useEffect(() => {
    if (!selectedBranch) { setTodaySlots([]); return; }
    const firstPkg = packages[0];
    if (!firstPkg) { setTodaySlots([]); return; }
    const today = bookingDates[0]?.iso;
    if (!today) return;
    setTodaySlotsLoading(true);
    const branchId = selectedBranch._id || selectedBranch.id;
    const pkgId = firstPkg._id || firstPkg.id;
    fetch(`${API_BASE}/bookings/slots?branchId=${branchId}&date=${today}&packageId=${pkgId}`)
      .then(r => r.json())
      .then(payload => setTodaySlots(payload?.data || []))
      .catch(() => setTodaySlots([]))
      .finally(() => setTodaySlotsLoading(false));
  }, [selectedBranch, packages, slotsUpdateTick]);

  // Load slot packs (when logged in)
  useEffect(() => {
    if (!isLoggedIn) return;
    async function loadPacks() {
      try {
        const res = await fetch(`${apiBase}/slot-packs/my`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = await res.json();
        setMySlotPacks(Array.isArray(payload?.data) ? payload.data : []);
      } catch (e) { console.error(e); }
    }
    loadPacks();
  }, [isLoggedIn, apiBase, token]);

  // Auto-select first vehicle
  useEffect(() => {
    if (!selectedVehicle && userVehicles[0]) {
      setSelectedVehicle(userVehicles[0]._id || userVehicles[0].id || '');
    }
  }, [userVehicles, selectedVehicle]);

  // Fetch available slots
  const currentDate = bookingDates.find(d => d.id === selectedDate) || bookingDates[0];
  useEffect(() => {
    if (!selectedBranch || !selectedPackage || !currentDate?.iso) return;
    async function fetchSlots() {
      setSlotsLoading(true);
      try {
        const branchId = selectedBranch._id || selectedBranch.id;
        const pkgId = selectedPackage._id || selectedPackage.id;
        const url = `${API_BASE}/bookings/slots?branchId=${branchId}&date=${currentDate.iso}&packageId=${pkgId}`;
        const res = isLoggedIn
          ? await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
          : await fetch(url);
        const payload = await res.json();
        if (res.ok) setAvailableSlots(payload.data || []);
        else setAvailableSlots([]);
      } catch (err) { console.error(err); }
      finally { setSlotsLoading(false); }
    }
    fetchSlots();
  }, [selectedBranch, selectedPackage, currentDate?.iso, isLoggedIn, apiBase, token, slotsUpdateTick]);

  // Restore pending booking selections after login, show step 5 for review
  useEffect(() => {
    if (!pendingBooking || !isLoggedIn || processingPending) return;
    const pb = pendingBooking;
    if (pb.tab) setTab(pb.tab);
    const restoreBranch = branches.find(b => (b._id || b.id) === pb.branchId);
    if (restoreBranch) setSelectedBranch(restoreBranch);
    const restorePkg = packages.find(p => (p._id || p.id) === pb.packageId);
    if (restorePkg) setSelectedPackage(restorePkg);
    if (pb.selectedDate) setSelectedDate(pb.selectedDate);
    if (pb.selectedTime) setSelectedTime(pb.selectedTime);
    if (pb.selectedDays) setSelectedDays(pb.selectedDays);
    if (pb.weeks) setWeeks(pb.weeks);
    if (pb.selectedSubServices) setSelectedSubServices(pb.selectedSubServices);
    setStep(5);
  }, [pendingBooking, isLoggedIn, branches, packages]);

  // Auto-select branch from URL param and jump to step 2
  useEffect(() => {
    if (!initialBranchId || branches.length === 0) return;
    const match = branches.find(b => (b._id || b.id) === initialBranchId);
    if (match) {
      setSelectedBranch(match);
      setStep(2);
    }
  }, [initialBranchId, branches]);

    const executeCreateBooking = async (options = {}) => {
    const isRecurring = options.tab === 'recurring';
    const endpoint = isRecurring ? `${apiBase}/bookings/recurring` : `${apiBase}/bookings`;
    
    let vehicleId = selectedVehicle || (userVehicles && userVehicles.length > 0 ? (userVehicles[0]._id || userVehicles[0].id) : '');
    
    const body = {
      branchId: selectedBranch?._id || selectedBranch?.id,
      packageId: pkg?._id || pkg?.id,
      vehicleId,
      bookingDate: isRecurring ? undefined : (currentDate?.iso || currentDate?.toISOString().split('T')[0]),
      startTime: selectedTime,
      voucherCode: appliedVoucher?.code || undefined,
      selectedSubServices: currentSubServices || [],
      note: '',
      isDraft: options.isDraft || false
    };

    if (isRecurring) {
      body.selectedDays = selectedDays;
      body.durationWeeks = durationWeeks;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || errData?.error || 'Create booking failed');
    }
    
    const payload = await res.json();
    return payload?.data || payload;
  };

  async function processPendingBooking() {
    const pb = pendingBooking;
    if (!pb) return;
    setProcessingPending(true);
    setBookingLoading(true);
    setError('');

    try {
      // Create vehicle if guest provided info
      let vehicleId = '';
      const gv = pb.guestVehicle;
      if (gv && gv.licensePlate && gv.licensePlate.trim()) {
        // Check if vehicle already exists (from a previous failed attempt)
        const existing = userVehicles.find(v =>
          (v.licensePlate || '').replace(/\s+/g, '').toUpperCase() === gv.licensePlate.trim().replace(/\s+/g, '').toUpperCase()
        );
        if (existing) {
          vehicleId = existing._id || existing.id || '';
        }
        if (!vehicleId) {
          const vehRes = await fetch(`${apiBase}/vehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              licensePlate: gv.licensePlate.trim(),
              brand: gv.brand?.trim() || 'Khác',
              model: gv.model?.trim() || '',
              vehicleType: gv.type || 'sedan',
              color: 'Khác',
            }),
          });
          if (!vehRes.ok) {
            const errData = await vehRes.json().catch(() => null);
            // If duplicate, vehicle was already created — fetch it
            if (vehRes.status === 409) {
              const found = userVehicles.find(v =>
                (v.licensePlate || '').replace(/\s+/g, '').toUpperCase() === gv.licensePlate.trim().replace(/\s+/g, '').toUpperCase()
              );
              if (found) {
                vehicleId = found._id || found.id || '';
              } else {
                throw new Error('Xe đã tồn tại nhưng không tìm thấy trong danh sách');
              }
            } else {
              console.error('Vehicle creation failed:', vehRes.status, errData);
              throw new Error(errData?.message || 'Không thể lưu thông tin xe');
            }
          } else {
            const vehData = await vehRes.json();
            const newVehicle = vehData?.data || vehData;
            vehicleId = newVehicle?._id || newVehicle?.id || '';
            if (onVehicleCreated && newVehicle) onVehicleCreated(newVehicle);
          }
        }
      } else {
        // Use selected or first existing vehicle
        vehicleId = selectedVehicle || userVehicles[0]?._id || userVehicles[0]?.id || '';
      }

      // Show payment modal first; booking is only created after user picks payment method
      const estimatedTotal = totalBase || 0;
      const calculatedDeposit = Math.round((estimatedTotal * 0.3) / 1000) * 1000;

      if (calculatedDeposit > 0 && !pb.isPayingWithPack) {
        setPendingDeposit({
          isDraft: true,
          tab: pb.tab || 'regular',
          finalPrice: estimatedTotal,
          totalAmount: estimatedTotal,
          depositAmount: calculatedDeposit,
          depositPaid: false,
          _vehicleId: vehicleId,
          _pendingData: pb,
        });
        setDepositQrStep('select');
        setDepositPayment(null);
        onSetPendingBooking(null);
      } else {
        // No deposit needed - create booking directly
        const isRec = pb.tab === 'recurring';
        const ep = isRec ? `${apiBase}/bookings/recurring` : `${apiBase}/bookings`;
        const directBody = isRec
          ? { branchId: pb.branchId, packageId: pb.packageId, vehicleId, weekdays: pb.selectedDays, startTime: pb.selectedTime, weeks: pb.weeks, voucherCode: pb.appliedVoucher?.code || undefined, selectedSubServices: pb.selectedSubServices || [], note: '' }
          : { branchId: pb.branchId, packageId: pb.packageId, vehicleId, bookingDate: pb.selectedDate || undefined, startTime: pb.selectedTime, voucherCode: pb.appliedVoucher?.code || undefined, selectedSubServices: pb.selectedSubServices || [], note: '' };
        const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(directBody) });
        if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message || 'Không thể tạo lịch hẹn'); }
        const p2 = await r.json();
        const bk = p2?.data || p2;
        const code = bk?.bookingCode || bk?.code || '';
        setBookingCode(code);
        setLastBooking({
          branch: selectedBranch || { name: '' },
          vehicle: { licensePlate: gv?.licensePlate || '', name: gv?.brand || '' },
          pkg: pkg || { name: '' },
          currentDate: pb.selectedDate ? bookingDates.find(d => d.id === pb.selectedDate) : null,
          selectedTime: pb.selectedTime, total: estimatedTotal, discount: 0, points: 0, isPayingWithPack: false, bookingCode: code,
          subServices: (pb.selectedSubServices || []).map(n => { const s = pkg?.subServices?.find(x => x.name === n); return s ? { name: s.name, price: s.price } : { name: n, price: 0 }; }),
          recurringCount: isRec ? bk?.totalCreated || 0 : undefined, depositAmount: 0, depositPaid: false,
        });
        setShowSuccessModal(true);
        onSetPendingBooking(null);
      }
    } catch (err) {
      console.error('processPendingBooking error:', err);
      setError(err.message || 'Không thể tạo lịch hẹn');
      onSetPendingBooking(null);
    } finally {
      setBookingLoading(false);
    }
  }

  async function payDeposit() {
    if (!pendingDeposit) return;
    setDepositLoading(true);
    setError('');
    try {
      let bookingId = pendingDeposit._id;
      let actualDepositAmount = pendingDeposit.depositAmount;

      if (pendingDeposit.isDraft) {
        // Create booking first, then pay
        const pb = pendingDeposit._pendingData;
        const isRec = pendingDeposit.tab === 'recurring';
        const vId = pendingDeposit._vehicleId || selectedVehicle || (userVehicles[0]?._id || userVehicles[0]?.id || '');
        const ep = isRec ? `${apiBase}/bookings/recurring` : `${apiBase}/bookings`;
        const bBody = pb
          ? (isRec
            ? { branchId: pb.branchId, packageId: pb.packageId, vehicleId: vId, weekdays: pb.selectedDays, startTime: pb.selectedTime, weeks: pb.weeks, voucherCode: pb.appliedVoucher?.code || undefined, selectedSubServices: pb.selectedSubServices || [], note: '' }
            : { branchId: pb.branchId, packageId: pb.packageId, vehicleId: vId, bookingDate: pb.selectedDate || undefined, startTime: pb.selectedTime, voucherCode: pb.appliedVoucher?.code || undefined, selectedSubServices: pb.selectedSubServices || [], note: '' })
          : (isRec
            ? { branchId: selectedBranch?._id || selectedBranch?.id, packageId: pkg?._id || pkg?.id, vehicleId: vId, weekdays: selectedDays, startTime: selectedTime, weeks, voucherCode: appliedVoucher?.code || undefined, selectedSubServices: currentSubServices, note: '' }
            : { branchId: selectedBranch?._id || selectedBranch?.id, packageId: pkg?._id || pkg?.id, vehicleId: vId, bookingDate: currentDate?.iso, startTime: selectedTime, voucherCode: isPayingWithPack ? undefined : (appliedVoucher?.code || undefined), selectedSubServices: currentSubServices, slotPackId: selectedSlotPack || undefined, note: '' });
        const br = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(bBody) });
        const bd = await br.json();
        if (!br.ok) throw new Error(bd.message || bd.error || 'Không thể tạo lịch hẹn');
        const newBk = bd?.data || bd;
        bookingId = newBk._id || newBk.id;
        actualDepositAmount = newBk.depositAmount || actualDepositAmount;
        const newCode = newBk?.bookingCode || newBk?.code || '';
        setBookingCode(newCode);
        setLastBooking({
          branch: selectedBranch || { name: '' },
          vehicle: vehicle || { licensePlate: vId },
          pkg: pkg || { name: '' },
          currentDate: isRec ? null : currentDate,
          selectedTime: pb ? pb.selectedTime : selectedTime,
          total: pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0,
          discount, points, isPayingWithPack: false, bookingCode: newCode,
          subServices: (currentSubServices || pb?.selectedSubServices || []).map(n => { const s = pkg?.subServices?.find(x => x.name === n); return s ? { name: s.name, price: s.price } : { name: n, price: 0 }; }),
          recurringCount: isRec ? (newBk.totalCreated || 1) : undefined,
          depositAmount: actualDepositAmount, depositPaid: false,
        });
        setPendingDeposit(prev => ({ ...prev, _id: bookingId, isDraft: false }));
      }

      const bodyObj = { bookingId, method: depositMethod, paymentType: paymentMode };
      if (actualDepositAmount > 0 && paymentMode === 'deposit') { bodyObj.amount = actualDepositAmount; }
      const res = await fetch(`${apiBase}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyObj),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi thanh toán cọc');

      const payment = data?.data || data;

      // Show QR code for bank transfer
      setDepositPayment(payment);
      setDepositQrStep('qr');
      setDepositPollCount(0);
    } catch (err) {
      setError(err.message || 'Lỗi thanh toán cọc');
    } finally {
      setDepositLoading(false);
    }
  }

  // Poll payment status when QR is shown
  const checkPaymentStatus = useCallback(async () => {
    if (depositQrStep !== 'qr' || !depositPayment || !pendingDeposit) return;
    try {
      const res = await fetch(`${apiBase}/payments/booking/${pendingDeposit?._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const p = data?.data || data;
      if (p?.status === 'paid') {
        setLastBooking(prev => prev ? { ...prev, depositPaid: true, paymentMode } : prev);
        setDepositQrStep('success');
        setTimeout(() => {
          setPendingDeposit(null);
          setDepositPayment(null);
          setDepositQrStep('select');
          setShowSuccessModal(true);
        }, 1500);
      }
      setDepositPollCount(c => c + 1);
    } catch (e) { /* ignore errors */ }
  }, [depositQrStep, depositPayment, pendingDeposit, apiBase, token, paymentMode]);

  useSSE(token, 'payment_new', checkPaymentStatus);

  // Fallback check once every 10s just in case SSE drops
  useEffect(() => {
    if (depositQrStep !== 'qr' || !depositPayment) return;
    const interval = setInterval(checkPaymentStatus, 10000);
    return () => clearInterval(interval);
  }, [depositQrStep, depositPayment, checkPaymentStatus]);

  // Simulate payment confirmation (for demo)
  async function simulatePaymentConfirm() {
    if (!depositPayment) return;
    try {
      const res = await fetch(`${apiBase}/payments/simulate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId: depositPayment.transactionId,
          gatewayTransactionId: `SIM${Date.now()}`,
          success: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xác nhận thanh toán');
      setLastBooking(prev => prev ? { ...prev, depositPaid: true, paymentMode } : prev);
      setDepositQrStep('success');
      setTimeout(() => {
        setPendingDeposit(null);
        setDepositPayment(null);
        setDepositQrStep('select');
        setShowSuccessModal(true);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Lỗi xác nhận thanh toán');
    }
  }

  // Sub-services
  const pkg = selectedPackage;
  const currentSubServices = selectedSubServices[pkg?._id || pkg?.id] || [];
  let extraDuration = 0, extraPrice = 0;
  if (pkg && pkg.subServices) {
    for (const sub of pkg.subServices) {
      if (currentSubServices.includes(sub.name)) {
        extraDuration += sub.duration || 0;
        extraPrice += sub.price || 0;
      }
    }
  }
  const basePrice = pkg ? pkg.price : 0;
  const totalBase = basePrice + extraPrice;

  const validPacks = useMemo(() => {
    if (!isLoggedIn) return [];
    return mySlotPacks.filter(p => {
      if (p.status !== 'active' || p.remainingSlots <= 0) return false;
      const pPkgId = p.packageId?._id || p.packageId?.id || p.packageId;
      const selPkgId = pkg?._id || pkg?.id;
      if (pPkgId !== selPkgId) return false;
      const branchId = selectedBranch?._id || selectedBranch?.id;
      const pBranchId = p.branchId?._id || p.branchId?.id || p.branchId;
      if (pBranchId && pBranchId !== branchId) return false;
      return true;
    });
  }, [mySlotPacks, pkg, selectedBranch, isLoggedIn]);

  useEffect(() => {
    if (selectedSlotPack && !validPacks.find(p => (p._id || p.id) === selectedSlotPack)) {
      setSelectedSlotPack(null);
    }
  }, [validPacks, selectedSlotPack]);

  let pointMultiplier = 1;
  if (user?.tier === 'diamond') pointMultiplier = 2.0;
  else if (user?.tier === 'gold') pointMultiplier = 1.5;
  else if (user?.tier === 'silver') pointMultiplier = 1.2;

  const discount = appliedVoucher
    ? appliedVoucher.savings || (appliedVoucher.type === 'percentage' ? Math.floor(totalBase * appliedVoucher.value / 100) : appliedVoucher.value)
    : 0;
  const isPayingWithPack = !!selectedSlotPack;
  const total = isPayingWithPack ? 0 : Math.max(0, totalBase - discount);
  const points = Math.floor((isPayingWithPack ? totalBase : total) * 0.05 * pointMultiplier);

  const vehicle = userVehicles.find(v => (v._id || v.id) === selectedVehicle) || null;

  const previewDates = useMemo(() => {
    if (tab !== 'recurring' || selectedDays.length === 0) return [];
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const c = new Date(today);
        c.setDate(today.getDate() + w * 7 + d);
        if (selectedDays.includes(c.getDay()) && c >= today) dates.push(c);
      }
    }
    return dates;
  }, [selectedDays, weeks, tab]);

  const toggleDay = (value) => {
    setSelectedDays(prev => prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]);
    setConflictCheck({ status: 'idle', results: [], totalConflicts: 0 });
  };


  const totalSteps = tab === 'slot_pack' ? 4 : 5;

  const canNextStep = () => {
    if (tab === 'slot_pack') return spCanAdvance;
    if (step === 1) return selectedBranch;
    if (step === 2) return selectedPackage;
    if (step === 3) {
      if (isLoggedIn) return selectedVehicle || userVehicles.length > 0;
      return guestVehicle.licensePlate.trim().length > 0 && guestVehicle.brand.trim().length > 0;
    }
    if (step === 4) {
      if (tab === 'regular') return selectedDate && selectedTime;
      return selectedDays.length > 0 && selectedTime;
    }
    return true;
  };

  function storePendingAndAuth() {
    const data = {
      tab,
      branchId: selectedBranch?._id || selectedBranch?.id,
      packageId: pkg?._id || pkg?.id,
      selectedSubServices: currentSubServices,
      selectedDate: tab === 'regular' ? currentDate.iso : undefined,
      selectedTime,
      selectedDays: tab === 'recurring' ? selectedDays : undefined,
      weeks: tab === 'recurring' ? weeks : undefined,
      appliedVoucher,
      guestVehicle: { ...guestVehicle },
    };
    onSetPendingBooking(data);
    onOpenAuth();
  }

  async function confirmBooking() {
    if (!isLoggedIn) { storePendingAndAuth(); return; }
    if (pendingBooking) { await processPendingBooking(); return; }
    if (!selectedTime) { setError('Vui lòng chọn khung giờ.'); return; }
    if (!vehicle) { setError('Vui lòng chọn xe.'); return; }
    setBookingLoading(true); setMessage(''); setError(''); setBookingCode('');

    try {
      const branchId = selectedBranch._id || selectedBranch.id;
      const pkgId = pkg._id || pkg.id;
      const calculatedDeposit = Math.round((total * 0.3) / 1000) * 1000;
      if (calculatedDeposit > 0 && !isPayingWithPack) {
        setPendingDeposit({
          isDraft: true, tab: 'regular', finalPrice: total, totalAmount: total, depositAmount: calculatedDeposit, depositPaid: false
        });
        setDepositQrStep('select');
        setDepositPayment(null);
        setBookingLoading(false);
        return;
      }
      
      const booking = await executeCreateBooking({ tab: 'regular' });
      setBookingCode(booking?.bookingCode || booking?.code || '');
      setLastBooking({
        branch: selectedBranch, vehicle, pkg, currentDate, selectedTime, total, discount, points, isPayingWithPack,
        bookingCode: booking?.bookingCode || booking?.code || '',
        subServices: (currentSubServices || []).map(n => {
          const s = pkg?.subServices?.find(x => x.name === n);
          return s ? { name: s.name, price: s.price } : { name: n, price: 0 };
        }),
        depositAmount: booking?.depositAmount || 0,
        depositPaid: booking?.depositPaid || false,
      });
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message || 'Không thể tạo lịch hẹn');
    } finally {
      setBookingLoading(false);
    }
  }

  async function confirmRecurringBooking() {
    if (!isLoggedIn) { storePendingAndAuth(); return; }
    if (pendingBooking) { await processPendingBooking(); return; }
    if (!selectedBranch || !selectedPackage || selectedDays.length === 0 || !selectedTime) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (isLoggedIn && !selectedVehicle) { setError('Vui lòng chọn xe.'); return; }
    setBookingLoading(true); setError(''); setResult(null); setShowSuccessModal(false);

    try {
      const branchId = selectedBranch._id || selectedBranch.id;
      const pkgId = pkg._id || pkg.id;
      const body = {
        branchId,
        packageId: pkgId,
        vehicleId: vehicle?._id || vehicle?.id || '',
        weekdays: selectedDays,
        startTime: selectedTime,
        weeks,
        voucherCode: appliedVoucher?.code || undefined,
        selectedSubServices: currentSubServices,
        note: '',
      };
      const res = await fetch(`${apiBase}/bookings/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo lịch định kỳ');
      const resultData = data.data || data;
      setResult(resultData);
      if (resultData.totalCreated > 0) {
        const totalPrice = (totalBase - discount) * resultData.totalCreated;
        const firstBooking = resultData.created?.[0];
        const totalDeposit = firstBooking?.depositAmount || resultData.depositAmount || 0;
        const totalRemaining = Math.max(0, totalPrice - totalDeposit);
        setLastBooking({
          branch: selectedBranch, vehicle, pkg, currentDate: null, selectedTime,
          total: totalPrice,
          discount: discount * resultData.totalCreated,
          points: points * resultData.totalCreated,
          isPayingWithPack: false,
          bookingCode: resultData.recurringGroupId || '',
          subServices: (currentSubServices || []).map(n => {
            const s = pkg?.subServices?.find(x => x.name === n);
            return s ? { name: s.name, price: s.price } : { name: n, price: 0 };
          }),
          recurringCount: resultData.totalCreated,
          depositAmount: totalDeposit,
          depositPaid: false,
          totalRemaining,
        });
        setBookingCode(resultData.recurringGroupId || '');
        if (totalDeposit > 0 && firstBooking?._id) {
          setPendingDeposit({
            _id: firstBooking._id,
            finalPrice: totalPrice,
            depositAmount: totalDeposit,
            depositPaid: false,
          });
          setDepositQrStep('select');
          setDepositPayment(null);
        } else {
          setShowSuccessModal(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingLoading(false);
    }
  }

  const checkRecurringConflicts = async () => {
    if (!token || !selectedBranch || !pkg || !vehicle?._id) return;
    setConflictCheck({ status: 'checking', results: [], totalConflicts: 0 });
    setError('');
    try {
      const body = {
        branchId: selectedBranch._id || selectedBranch.id,
        packageId: pkg._id || pkg.id,
        vehicleId: vehicle._id || vehicle.id,
        weekdays: selectedDays,
        startTime: selectedTime,
        weeks,
        selectedSubServices: currentSubServices,
      };
      const res = await fetch(`${apiBase}/bookings/recurring/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi kiểm tra lịch');
      const results = data.data || data || [];
      const totalConflicts = Array.isArray(results) ? results.filter(r => r.conflict).length : 0;
      setConflictCheck({ status: 'done', results: Array.isArray(results) ? results : [], totalConflicts });
    } catch (err) {
      setError(err.message);
      setConflictCheck({ status: 'idle', results: [], totalConflicts: 0 });
    }
  };

  const reset = () => {
    setStep(initialBranchId ? 2 : 1);
    setSelectedVehicle('');
    setSelectedPackage(null);
    setSelectedSubServices({});
    setSelectedDate(bookingDates[1]?.id || bookingDates[0]?.id);
    setSelectedTime('');
    setSelectedDays([]);
    setWeeks(4);
    setAppliedVoucher(null);
    setSelectedSlotPack(null);
    setMessage('');
    setError('');
    setBookingCode('');
    setResult(null);
    setConflictCheck({ status: 'idle', results: [], totalConflicts: 0 });
    setGuestVehicle({ licensePlate: '', brand: '', model: '', type: 'sedan' });
    setVehicleError('');
    setSpCanAdvance(false);
  };

  const getVehicleIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('motor') || t.includes('máy')) {
      return <Bike className="w-5 h-5" />;
    }
    if (t.includes('suv') || t.includes('truck') || t.includes('pickup') || t.includes('van')) {
      return <Truck className="w-5 h-5" />;
    }
    return <Car className="w-5 h-5" />;
  };

  const groupedSlots = useMemo(() => {
    if (availableSlots.length === 0) return { morning: [], afternoon: [] };
    
    const morning = [];
    const afternoon = [];
    
    availableSlots.forEach(slot => {
      const hour = parseInt((slot.startTime || '').split(':')[0], 10);
      if (hour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    });
    
    return { morning, afternoon };
  }, [availableSlots]);

  const renderStepIndicator = (labels) => (
    <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto mb-6 px-4">
      {/* Background connecting line */}
      <div className="absolute left-8 right-8 top-5 h-[2px] bg-slate-200 z-0" />
      {/* Active progress fill */}
      <div 
        className="absolute left-8 top-5 h-[2px] bg-gradient-to-r from-emerald-400 to-emerald-600 z-0 transition-all duration-500 ease-in-out" 
        style={{ width: `${((step - 1) / (labels.length - 1)) * 100}%` }}
      />

      {labels.map((lbl, i) => {
        const s = i + 1;
        const isCompleted = step > s;
        const isActive = step === s;
        return (
          <div key={lbl} className="relative z-10 flex flex-col items-center flex-1">
            <button
              type="button"
              disabled={s > step && !canNextStep()}
              onClick={() => { if (s < step || canNextStep()) setStep(s); }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-110 ring-4 ring-emerald-100'
                  : isCompleted 
                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200'
                    : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : s}
            </button>
            <span className={`mt-3 text-[11px] md:text-xs font-semibold tracking-wide text-center transition-all duration-300 hidden sm:block ${
              isActive ? 'text-emerald-600 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
            }`}>
              {lbl}
            </span>
          </div>
        );
      })}
    </div>
  );

  const dayLabel = (value) => WEEKDAY_OPTIONS.find(o => o.value === value)?.label || String(value);

  return (
    <section id="booking" className="relative bg-white min-h-[calc(100dvh-64px)] overflow-hidden pt-16">

      <div className="max-w-[1000px] mx-auto px-6 md:px-12 py-6">

        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] rounded-3xl p-6 md:p-8">

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/50 w-fit mx-auto mb-6 shadow-inner">
            <button onClick={() => { setTab('regular'); reset(); }}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tab === 'regular' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 scale-[1.02]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}>
              Đặt lịch thường
            </button>
            <button onClick={() => { setTab('recurring'); reset(); }}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tab === 'recurring' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 scale-[1.02]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}>
              Đặt lịch định kì
            </button>
            <button onClick={() => { setTab('slot_pack'); reset(); }}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tab === 'slot_pack' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 scale-[1.02]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}>
              Gói lượt
            </button>
          </div>

          {/* ── Slot Pack Tab ── */}
          {tab === 'slot_pack' && (
            isLoggedIn ? (
              <>
                {renderStepIndicator(['Chi nhánh', 'Xe & gói', 'Số lần', 'Thanh toán'])}
                <SlotPackFlow step={step} setStep={setStep} user={user} vehicles={userVehicles} apiBase={apiBase} token={token} onCanAdvanceChange={setSpCanAdvance} onGoToHistory={onGoToHistory} />
              </>
            ) : (
              <div className="text-center py-16 space-y-4">
                <div className="text-5xl mb-2">🎫</div>
                <p className="text-slate-600 font-medium">Đăng nhập để mua và quản lý gói lượt rửa xe</p>
                <button onClick={onOpenAuth}
                  className="inline-block px-8 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors">
                  Đăng nhập ngay
                </button>
              </div>
            )
          )}

          {/* ── Regular + Recurring Step Flow ── */}
          {tab !== 'slot_pack' && (
            <>
              {renderStepIndicator(tab === 'recurring'
                ? ['Chi nhánh', 'Gói DV', 'Xe', 'Lịch định kỳ', 'Xác nhận']
                : ['Chi nhánh', 'Gói DV', 'Xe', 'Thời gian', 'Xác nhận']
              )}

              {/* STEP 1: Chi nhánh */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-800">Chọn chi nhánh gần bạn</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {branches.length === 0 ? (
                      <div className="col-span-2 text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
                        <span>Đang tải danh sách chi nhánh...</span>
                      </div>
                    ) : branches.map((b) => {
                      const isSelected = (selectedBranch?._id || selectedBranch?.id) === (b._id || b.id);
                      return (
                        <button 
                          key={b._id || b.id} 
                          type="button"
                          onClick={() => setSelectedBranch(b)}
                          className={`group text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-4 ring-emerald-500/5'
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                          }`}
                        >
                          <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 blur-xl transition-all duration-300 ${
                            isSelected ? 'bg-emerald-500 scale-125' : 'bg-slate-300 group-hover:bg-emerald-300'
                          }`} />

                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl transition-all duration-300 ${
                              isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'
                            }`}>
                              <MapPin className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-slate-900">{b.name}</h4>
                                {isSelected && (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{b.address}</p>
                              
                              <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-50">
                                {b.openingTime && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Clock className="w-3.5 h-3.5" />
                                    {b.openingTime} – {b.closingTime}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                                  🟢 Đang hoạt động
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Gói dịch vụ */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-800">
                      Chọn gói dịch vụ{isLoggedIn && selectedBranch ? ` tại ${selectedBranch.name}` : ''}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.length === 0 ? (
                      <div className="col-span-2 text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-3">
                        <Info className="w-8 h-8 text-slate-300" />
                        <span>Chi nhánh này chưa có gói dịch vụ nào.</span>
                      </div>
                    ) : packages.map((p, index) => {
                      const pId = p._id || p.id;
                      const isActive = pId === (selectedPackage?._id || selectedPackage?.id);
                      const isPopular = p.price >= 150000 || index === 1;

                      return (
                        <div 
                          key={pId}
                          className={`group rounded-2xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${
                            isActive 
                              ? 'border-emerald-500 bg-emerald-50/10 shadow-md ring-4 ring-emerald-500/5' 
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute right-0 top-0 bg-gradient-to-l from-emerald-600 to-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase shadow-sm">
                              Khuyên Dùng
                            </div>
                          )}

                          <button 
                            type="button"
                            onClick={() => setSelectedPackage(p)} 
                            className="w-full text-left p-6 flex-1 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between pr-16 mb-2">
                                <span className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{p.name}</span>
                              </div>
                              <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">{p.description}</p>
                            </div>
                            
                            <div className="flex items-baseline justify-between mt-auto pt-4 border-t border-slate-50">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {p.duration} phút
                              </span>
                              <span className="text-xl font-extrabold text-emerald-600">{formatCurrency(p.price)}</span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Sub-services below packages */}
                  {selectedPackage && selectedPackage.subServices && selectedPackage.subServices.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-6 rounded-2xl bg-slate-100/50 border border-slate-200/50"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-sm font-bold text-slate-700">Dịch vụ đi kèm nâng cao (Tùy chọn)</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedPackage.subServices.map(sub => {
                          const pId = selectedPackage._id || selectedPackage.id;
                          const checked = currentSubServices.includes(sub.name);
                          return (
                            <button
                              type="button"
                              key={sub.name}
                              disabled={!sub.isOptional}
                              onClick={() => {
                                setSelectedSubServices(prev => {
                                  const current = prev[pId] || [];
                                  return { 
                                    ...prev, 
                                    [pId]: checked ? current.filter(x => x !== sub.name) : [...current, sub.name] 
                                  };
                                });
                              }}
                              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-300 ${
                                checked
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-medium'
                                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                              } ${!sub.isOptional ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                  checked 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'border-slate-300 bg-white'
                                }`}>
                                  {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className="text-sm font-medium">{sub.name}</span>
                              </div>
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-lg">
                                {sub.price > 0 ? `+${formatCurrency(sub.price)}` : 'Miễn phí'}
                              </span>
                            </button>
                          );
                        })}
                  </div>

                  {/* ── Today availability preview ── */}
                  {selectedBranch && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-5 text-emerald-600" />
                        <h4 className="text-sm font-bold text-slate-700">Lịch trống hôm nay</h4>
                        {todaySlotsLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                      </div>
                      {todaySlotsLoading ? (
                        <p className="text-xs text-slate-400">Đang kiểm tra lịch trống...</p>
                      ) : todaySlots.filter(s => s.available).length === 0 ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">Hôm nay đã hết lịch trống. Bạn có thể chọn ngày khác ở bước chọn thời gian.</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 mb-2">Còn <span className="font-bold text-emerald-600">{todaySlots.filter(s => s.available).length}</span> khung giờ trống:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {todaySlots.filter(s => s.available).slice(0, 12).map(s => (
                              <span key={s.startTime} className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
                                {s.startTime}
                              </span>
                            ))}
                            {todaySlots.filter(s => s.available).length > 12 && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-500">
                                +{todaySlots.filter(s => s.available).length - 12}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Xe */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {isLoggedIn ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Car className="w-5 h-5 text-emerald-600" />
                          <h3 className="text-lg font-bold text-slate-800">Chọn xe của bạn</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userVehicles.length === 0 ? (
                          <div className="col-span-2 text-center text-slate-400 py-8">Chưa có xe nào.</div>
                        ) : userVehicles.map(v => {
                          const vId = v._id || v.id;
                          const isSelected = selectedVehicle === vId;
                          return (
                            <button 
                              key={vId} 
                              type="button"
                              onClick={() => setSelectedVehicle(vId)}
                              className={`group text-left p-5 rounded-2xl border-2 transition-all duration-300 relative flex items-start gap-4 ${
                                isSelected 
                                  ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-4 ring-emerald-500/5' 
                                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                              }`}
                            >
                              <div className={`p-3 rounded-xl transition-all duration-300 ${
                                isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500'
                              }`}>
                                {getVehicleIcon(v.vehicleType || v.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate">
                                  {v.name || `${v.brand || ''} ${v.model || ''}`.trim() || 'Xe chưa đặt tên'}
                                </div>
                                <div className="text-xs text-slate-400 capitalize mt-0.5">{v.vehicleType || v.type || 'Sedan'}</div>
                                
                                <div className="inline-flex items-center mt-3 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 tracking-wider shadow-sm font-mono">
                                  {v.licensePlate || v.plate}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-lg font-bold text-slate-800">Thông tin xe của bạn</h3>
                      </div>
                      <p className="text-sm text-slate-500 mb-6">Nhập thông tin xe để tiếp tục. Sau khi đăng nhập, xe sẽ tự động lưu vào tài khoản.</p>
                      
                      <div className="max-w-xl mx-auto bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1.5 uppercase tracking-wide">Biển số xe *</label>
                            <input 
                              type="text" 
                              value={guestVehicle.licensePlate} 
                              placeholder="Ví dụ: 30A-12345"
                              onChange={e => setGuestVehicle(prev => ({ ...prev, licensePlate: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold uppercase tracking-wider font-mono" 
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-bold block mb-1.5 uppercase tracking-wide">Hãng xe *</label>
                            <input 
                              type="text" 
                              value={guestVehicle.brand} 
                              placeholder="Ví dụ: Toyota, Honda, Hyundai..."
                              onChange={e => setGuestVehicle(prev => ({ ...prev, brand: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500 font-bold block mb-1.5 uppercase tracking-wide">Dòng xe (Model)</label>
                          <input 
                            type="text" 
                            value={guestVehicle.model} 
                            placeholder="Ví dụ: Camry, Tucson, SH..."
                            onChange={e => setGuestVehicle(prev => ({ ...prev, model: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-500 font-bold block mb-3 uppercase tracking-wide">Loại xe *</label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {VEHICLE_TYPES.map(t => {
                              const isSelected = guestVehicle.type === t.value;
                              return (
                                <button
                                  type="button"
                                  key={t.value}
                                  onClick={() => setGuestVehicle(prev => ({ ...prev, type: t.value }))}
                                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-2 transition-all ${
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800 font-bold'
                                      : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                                    {getVehicleIcon(t.value)}
                                  </div>
                                  <span className="text-xs">{t.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* STEP 4: Thời gian */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-800">
                      {tab === 'regular' ? 'Chọn ngày & giờ hẹn' : 'Lịch định kỳ'}
                    </h3>
                  </div>

                  {tab === 'regular' ? (
                    <div className="mb-6">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-3">Chọn ngày</label>
                      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                        {bookingDates.map((d) => {
                          const isSelected = selectedDate === d.id;
                          return (
                            <button 
                              key={d.id} 
                              type="button"
                              onClick={() => setSelectedDate(d.id)}
                              className={`flex flex-col items-center justify-between min-w-[76px] p-4 rounded-2xl border-2 transition-all duration-300 ${
                                isSelected 
                                  ? 'border-emerald-500 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105' 
                                  : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                {d.label}
                              </span>
                              <span className="text-xl font-extrabold my-1">{d.day}</span>
                              <span className={`text-[10px] font-semibold ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                                Thg {d.month}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-3">Các ngày trong tuần</label>
                      <div className="flex gap-2">
                        {WEEKDAY_OPTIONS.map(({ label, value }) => (
                          <button 
                            key={value} 
                            type="button"
                            onClick={() => toggleDay(value)}
                            className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                              selectedDays.includes(value) 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-3">Chọn khung giờ{tab === 'recurring' ? ' cố định' : ''}</label>
                    <div className="space-y-6">
                      {slotsLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                          <span className="text-sm">Đang tìm lịch trống...</span>
                        </div>
                      ) : availableSlots.filter(s => s.available).length === 0 ? (
                        (() => {
                          // Distinguish: store closed today vs. genuinely fully booked
                          const today = new Date();
                          const todayStr = today.toISOString().split('T')[0];
                          const isToday = currentDate?.iso === todayStr;
                          const hasSlots = availableSlots.length > 0;
                          const allPast = hasSlots && availableSlots.every(s => !s.available);
                          const isTodayClosed = isToday && allPast;
                          return (
                            <div className={`flex items-center gap-3 p-5 rounded-2xl border ${
                              isTodayClosed 
                                ? 'bg-slate-50 border-slate-200' 
                                : 'bg-amber-50 border-amber-200'
                            }`}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                                isTodayClosed ? 'bg-slate-100' : 'bg-amber-100'
                              }`}>
                                {isTodayClosed ? '🔒' : '📅'}
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${
                                  isTodayClosed ? 'text-slate-700' : 'text-amber-800'
                                }`}>
                                  {isTodayClosed ? 'Cửa hàng hôm nay đã đóng cửa' : 'Hết lịch trống'}
                                </p>
                                <p className={`text-xs mt-0.5 ${
                                  isTodayClosed ? 'text-slate-500' : 'text-amber-600'
                                }`}>
                                  {isTodayClosed 
                                    ? 'Đã hết giờ tiếp nhận cho hôm nay. Vui lòng chọn ngày khác từ ngày mai.'
                                    : 'Ngày này đã hết chỗ. Vui lòng chọn ngày khác.'
                                  }
                                </p>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          {/* Morning Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-amber-600">
                              <Sun className="w-4 h-4" />
                              <h4 className="text-xs font-bold uppercase tracking-wider">Khung giờ buổi sáng</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {groupedSlots.morning.length === 0 ? (
                                <span className="text-xs text-slate-400 py-2">Không có lịch trống buổi sáng</span>
                              ) : groupedSlots.morning.map(s => {
                                const timeLabel = s.startTime;
                                const isDisabled = !s.available;
                                const isSelected = selectedTime === timeLabel;
                                return (
                                  <button 
                                    key={timeLabel} 
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setSelectedTime(timeLabel)}
                                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                      isSelected
                                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/10 scale-105'
                                        : isDisabled
                                          ? 'border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    {timeLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Afternoon Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-600">
                              <Sunset className="w-4 h-4" />
                              <h4 className="text-xs font-bold uppercase tracking-wider">Khung giờ buổi chiều</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {groupedSlots.afternoon.length === 0 ? (
                                <span className="text-xs text-slate-400 py-2">Không có lịch trống buổi chiều</span>
                              ) : groupedSlots.afternoon.map(s => {
                                const timeLabel = s.startTime;
                                const isDisabled = !s.available;
                                const isSelected = selectedTime === timeLabel;
                                return (
                                  <button 
                                    key={timeLabel} 
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setSelectedTime(timeLabel)}
                                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                      isSelected
                                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/10 scale-105'
                                        : isDisabled
                                          ? 'border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    {timeLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {tab === 'recurring' && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wide block mb-3">Số tuần lặp lại</label>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {WEEKS_OPTIONS.map(w => (
                          <button 
                            key={w} 
                            type="button"
                            onClick={() => { setWeeks(w); setConflictCheck({ status: 'idle', results: [], totalConflicts: 0 }); }}

                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                              weeks === w 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {w} tuần
                          </button>
                        ))}
                      </div>
                      {previewDates.length > 0 && (
                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">📋 Danh sách buổi dự kiến</p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">{previewDates.length} buổi</span>
                          </div>
                          <div className="p-3 max-h-52 overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {previewDates.map((d, i) => {
                                const conflictResult = conflictCheck.results.find(r => r.date === d.toISOString().split('T')[0]);
                                const hasConflict = conflictResult?.conflict;
                                const conflictReason = conflictResult?.reason || '';
                                const hasAlt = hasConflict && conflictReason.includes('thay thế');
                                const noSlot = hasConflict && !hasAlt;
                                return (
                                  <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                    noSlot
                                      ? 'bg-red-50 border-red-200 text-red-700'
                                      : hasAlt
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : 'bg-slate-50 border-slate-100 text-slate-600'
                                  }`}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                                      noSlot ? 'bg-red-100' : hasAlt ? 'bg-amber-100' : 'bg-emerald-100'
                                    }`}>
                                      {noSlot ? '✕' : hasAlt ? '⚠' : '✓'}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-semibold truncate">
                                        {d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                                      </div>
                                      {noSlot && <div className="text-[9px] text-red-500 mt-0.5">Hết slot — bỏ qua</div>}
                                      {hasAlt && <div className="text-[9px] text-amber-600 mt-0.5">Trùng giờ — đổi tự động</div>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {conflictCheck.status === 'idle' && isLoggedIn && selectedTime && (
                            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <p className="text-[10px] text-slate-500">Bấm &quot;Kiểm tra lịch trống&quot; để xem buổi nào bị trùng giờ</p>
                            </div>
                          )}
                          {conflictCheck.totalConflicts > 0 && (
                            <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                                <span className="text-[10px] text-red-600 font-semibold">{conflictCheck.results.filter(r => r.conflict && !r.reason?.includes('thay thế')).length} buổi sẽ bị bỏ qua</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-[10px] text-amber-600 font-semibold">{conflictCheck.results.filter(r => r.conflict && r.reason?.includes('thay thế')).length} buổi đổi giờ tự động</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 5: Xác nhận */}
              {step === 5 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-500">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Xác nhận lịch hẹn của bạn</h3>
                    <p className="text-sm text-slate-500 mt-1">Vui lòng kiểm tra lại thông tin chi tiết trước khi đặt chỗ</p>
                  </div>

                  {/* Booking Ticket Card */}
                  <div className="bg-white rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-100/30 overflow-hidden relative">
                    {/* Top ticket strip decoration */}
                    <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                    
                    {/* Ticket circles decoration at sides */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200/60 z-10 -translate-y-1/2" />
                    <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200/60 z-10 -translate-y-1/2" />
                    
                    <div className="p-6 md:p-8 space-y-6">
                      {/* Grid details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-dashed border-slate-200">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Chi nhánh</span>
                            <span className="text-sm font-bold text-slate-700">{selectedBranch?.name}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Car className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Phương tiện</span>
                            <span className="text-sm font-bold text-slate-700">
                              {pendingBooking?.guestVehicle?.licensePlate ? (
                                `${pendingBooking.guestVehicle.licensePlate} (${pendingBooking.guestVehicle.brand} ${pendingBooking.guestVehicle.model})`
                              ) : isLoggedIn && vehicle ? (
                                `${vehicle.licensePlate || vehicle.name}`
                              ) : !isLoggedIn && guestVehicle.licensePlate ? (
                                `${guestVehicle.licensePlate} (${guestVehicle.brand} ${guestVehicle.model})`
                              ) : (
                                'Chưa chọn xe'
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Dịch vụ chính</span>
                            <span className="text-sm font-bold text-slate-700">{pkg?.name}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Thời gian</span>
                            <span className="text-sm font-bold text-slate-700">
                              {tab === 'regular'
                                ? `${currentDate?.label || ''}, ${selectedTime}`
                                : `${selectedTime} (${selectedDays.map(dayLabel).join(', ')}) · ${weeks} tuần (${previewDates.length} buổi)`
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Optional Sub-services summary */}
                      {currentSubServices.length > 0 && (
                        <div className="pb-6 border-b border-dashed border-slate-200">
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide block mb-2">Dịch vụ chọn thêm</span>
                          <div className="flex flex-wrap gap-2">
                            {currentSubServices.map(subName => (
                              <span key={subName} className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                                {subName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment Options */}
                      {isLoggedIn && (
                        <div className="space-y-4 pb-6 border-b border-dashed border-slate-200">
                          {tab === 'regular' && validPacks.length > 0 && (
                            <div className="rounded-2xl border border-emerald-200 overflow-hidden">
                              <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center gap-2">
                                <span className="text-base">🎫</span>
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Thanh toán bằng Gói Lượt</span>
                                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">{validPacks.length} gói</span>
                              </div>
                              <div className="p-3 space-y-2">
                                <button
                                  type="button"
                                  onClick={() => { setSelectedSlotPack(null); }}
                                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm transition-all ${
                                    !selectedSlotPack
                                      ? 'border-slate-300 bg-slate-50 text-slate-600'
                                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    !selectedSlotPack ? 'border-slate-500 bg-slate-500' : 'border-slate-300'
                                  }`}>
                                    {!selectedSlotPack && <span className="w-2 h-2 rounded-full bg-white" />}
                                  </span>
                                  <span className="font-medium">Không sử dụng gói lượt</span>
                                </button>
                                {validPacks.map(p => (
                                  <button
                                    key={p._id || p.id}
                                    type="button"
                                    onClick={() => { setSelectedSlotPack(p._id || p.id); setAppliedVoucher(null); }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm transition-all ${
                                      selectedSlotPack === (p._id || p.id)
                                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-800'
                                        : 'border-slate-100 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/20'
                                    }`}
                                  >
                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                      selectedSlotPack === (p._id || p.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                    }`}>
                                      {selectedSlotPack === (p._id || p.id) && <span className="w-2 h-2 rounded-full bg-white" />}
                                    </span>
                                    <div className="flex-1 text-left">
                                      <div className="font-semibold">{p.packageId?.name || 'Gói lượt'}</div>
                                      <div className="text-xs opacity-70">Còn {p.remainingSlots} lần sử dụng · Miễn đặt cọc</div>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700">{p.remainingSlots} lần</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {!isPayingWithPack && (
                            <>
                              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex justify-between items-center cursor-pointer transition-colors hover:bg-emerald-100/50" onClick={() => setVoucherModalOpen(true)}>
                                <div>
                                   <h4 className="text-emerald-800 font-bold text-sm">VOUCHER & ƯU ĐÃI</h4>
                                   {appliedVoucher ? <p className="text-emerald-600 font-medium text-xs mt-1">Đã áp dụng: {appliedVoucher.code}</p> : <p className="text-emerald-600 font-medium text-xs mt-1">Bấm để chọn ưu đãi</p>}
                                </div>
                                <span className="text-emerald-600 text-xs font-bold border border-emerald-200 px-3 py-1.5 rounded-full bg-white shadow-sm">Chọn</span>
                              </div>

                              
                            </>
                          )}
                        </div>
                      )}

                      {/* Financial Breakdown */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>Giá gốc dịch vụ</span>
                          <span className="font-semibold">{formatCurrency(totalBase)}</span>
                        </div>
                        {isLoggedIn && discount > 0 && (
                          <div className="flex justify-between text-sm text-emerald-600">
                            <span>Mã giảm giá</span>
                            <span>-{formatCurrency(discount)}</span>
                          </div>
                        )}
                        {isLoggedIn && points > 0 && (
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Tích điểm thành viên</span>
                            <span>+{points} điểm</span>
                          </div>
                        )}
                        {tab === 'recurring' && pkg && previewDates.length > 0 && (
                          <div className="flex justify-between text-xs text-slate-400 border-t border-slate-100 pt-2.5">
                            <span>Tổng số buổi định kỳ</span>
                            <span>{previewDates.length} buổi</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-baseline pt-4 mt-2 border-t border-slate-100">
                          <span className="text-base font-bold text-slate-800">
                            {tab === 'recurring' ? 'Tổng dự kiến (tạm tính)' : 'Thành tiền'}
                          </span>
                          <span className="text-2xl font-extrabold text-emerald-600">
                            {tab === 'recurring' 
                              ? formatCurrency((totalBase - discount) * previewDates.length) 
                              : formatCurrency(total)
                            }
                          </span>
                        </div>
                        {total > 0 && (
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm font-semibold text-amber-600">Đặt cọc (30%)</span>
                            <span className="text-lg font-bold text-amber-600">{formatCurrency(tab === 'recurring' ? Math.round((totalBase - discount) * previewDates.length * 0.3 / 1000) * 1000 : Math.round(total * 0.3 / 1000) * 1000)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {tab === 'recurring' && isLoggedIn && !result && (
                    <div className="pt-4">
                      {conflictCheck.status === 'idle' && (
                        <button
                          type="button"
                          onClick={checkRecurringConflicts}
                          disabled={!selectedTime || previewDates.length === 0}
                          className="w-full py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-bold text-sm hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Kiểm tra lịch trống ({previewDates.length} buổi)
                        </button>
                      )}
                      {conflictCheck.status === 'checking' && (
                        <div className="flex items-center justify-center gap-2 py-3 text-slate-500 text-sm font-semibold">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang kiểm tra lịch trống...</span>
                        </div>
                      )}
                      {conflictCheck.status === 'done' && conflictCheck.totalConflicts === 0 && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <span>Tất cả {previewDates.length} buổi đều trống lịch ✓</span>
                        </div>
                      )}
                      {conflictCheck.status === 'done' && conflictCheck.totalConflicts > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-amber-700 font-semibold">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>Có {conflictCheck.totalConflicts}/{previewDates.length} buổi bị trùng lịch</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {conflictCheck.results.filter(r => r.conflict).map(r => (
                              <span key={r.date} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium" title={r.reason || ''}>
                                <AlertCircle className="w-3 h-3" />
                                {new Date(r.date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                              </span>
                            ))}
                          </div>
                          {conflictCheck.results.some(r => r.conflict && r.reason?.includes('thay thế')) && (
                            <p className="text-xs text-amber-600">Một số ngày có giờ thay thế — hệ thống sẽ tự động đổi giờ nếu tạo.</p>
                          )}
                          {conflictCheck.results.some(r => r.conflict && r.reason?.includes('không có giờ thay thế')) && (
                            <p className="text-xs text-rose-600">Một số ngày không còn slot trống — những ngày này sẽ bị bỏ qua.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {result && tab === 'recurring' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
                      {result.totalCreated > 0 && <div className="text-sm text-emerald-700 font-bold">✓ Đã tạo thành công {result.totalCreated} lịch hẹn!</div>}
                      {result.totalFailed > 0 && <div className="text-sm text-amber-600 font-semibold">⚠ {result.totalFailed} ngày bị bỏ qua do trùng lịch.</div>}
                    </div>
                  )}

                  {error && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {processingPending && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Đang xử lý đặt lịch sau đăng nhập...</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="text-center pt-4">
                    {tab === 'regular' ? (
                      <button 
                        type="button"
                        onClick={confirmBooking} 
                        disabled={bookingLoading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {bookingLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Đang tạo lịch hẹn...</span>
                          </>
                        ) : isLoggedIn ? (
                          'Xác nhận đặt chỗ ngay'
                        ) : (
                          'Đăng nhập để đặt lịch'
                        )}
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={confirmRecurringBooking} 
                        disabled={bookingLoading || previewDates.length === 0}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {bookingLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Đang tạo lịch hẹn...</span>
                          </>
                        ) : isLoggedIn ? (
                          `Xác nhận ${previewDates.length} buổi đặt định kỳ`
                        ) : (
                          'Đăng nhập để đặt lịch định kỳ'
                        )}
                      </button>
                    )}
                    
                    {!isLoggedIn && (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-left">
                        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Bạn cần đăng nhập để hoàn tất đặt chỗ. Thông tin xe bạn nhập ở bước trước sẽ được tự động lưu vào tài khoản sau khi đăng nhập thành công.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* ── Shared Navigation ── */}
          {(tab !== 'slot_pack' || isLoggedIn) && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
              {step > 1 ? (
                <button 
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors active:scale-[0.98]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </button>
              ) : <div />}
              
              {step < totalSteps ? (
                <button 
                  type="button"
                  onClick={() => setStep(step + 1)} 
                  disabled={!canNextStep()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-emerald-600 text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-505"
                  style={{
                    backgroundColor: canNextStep() ? '#10b981' : '#f1f5f9',
                    color: canNextStep() ? '#ffffff' : '#94a3b8',
                    cursor: canNextStep() ? 'pointer' : 'not-allowed'
                  }}
                >
                  <span>Tiếp theo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm font-bold hover:bg-slate-50 hover:text-slate-700 transition-colors active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Đặt lại từ đầu
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal && lastBooking && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowSuccessModal(false); reset(); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100/80 max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header block (Light and simple) */}
              <div className="pt-8 pb-4 text-center px-6 bg-white border-b border-slate-50">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3"
                >
                  <Check className="w-8 h-8 text-emerald-600 stroke-[3]" />
                </motion.div>
                
                <h3 className="text-xl font-bold text-slate-800">
                  {lastBooking.depositPaid 
                    ? (lastBooking.paymentMode === 'full' ? 'Thanh toán thành công' : 'Đặt cọc thành công') 
                    : 'Đặt lịch thành công'}
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {lastBooking.depositPaid
                    ? (lastBooking.paymentMode === 'full' 
                       ? `Đã thanh toán ${formatCurrency(lastBooking.total || 0)}` 
                       : `Đã đặt cọc ${formatCurrency(lastBooking.depositAmount || 0)}`)
                    : 'Cảm ơn bạn đã sử dụng dịch vụ của AutoWash Pro'}
                </p>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Booking Code Callout */}
                <div className="text-center bg-slate-50 border border-slate-100/60 p-4 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Mã đặt lịch của bạn</span>
                  <div className="flex items-center justify-center gap-2 mt-1.5 font-mono">
                    <span className="text-xl font-extrabold text-emerald-600 tracking-wider">
                      {lastBooking.bookingCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lastBooking.bookingCode);
                        alert('Đã copy mã đặt lịch!');
                      }}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                      title="Sao chép"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between py-3">
                    <span className="text-slate-400 text-xs font-semibold">Chi nhánh</span>
                    <span className="font-bold text-slate-700 text-sm">{lastBooking.branch?.name}</span>
                  </div>
                  {lastBooking.vehicle && (
                    <div className="flex justify-between py-3">
                      <span className="text-slate-400 text-xs font-semibold">Xe</span>
                      <span className="font-bold text-slate-700 text-sm">{lastBooking.vehicle.licensePlate || lastBooking.vehicle.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3">
                    <span className="text-slate-400 text-xs font-semibold">Thời gian hẹn</span>
                    <span className="font-bold text-slate-700 text-sm">
                      {lastBooking.currentDate
                        ? `${lastBooking.currentDate.label} ${lastBooking.selectedTime}`
                        : `${lastBooking.selectedTime} · ${lastBooking.recurringCount || 0} buổi định kỳ`}
                    </span>
                  </div>

                  {/* Bill Section */}
                  <div className="bg-slate-50/60 -mx-6 px-6 py-4 space-y-2.5 mt-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">CHI TIẾT THANH TOÁN</div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">{lastBooking.pkg?.name}</span>
                      <span className="font-bold text-slate-800 text-sm">{formatCurrency(lastBooking.pkg?.price || 0)}</span>
                    </div>

                    {lastBooking.subServices?.filter(s => s).map((svc, i) => {
                      const n = typeof svc === 'string' ? svc : svc?.name;
                      const p = typeof svc === 'object' && svc !== null ? (svc.price || 0) : 0;
                      return (
                        <div className="flex justify-between items-center" key={i}>
                          <span className="text-slate-500 text-xs pl-3">+ {n}</span>
                          <span className="font-bold text-slate-600 text-xs">{p > 0 ? formatCurrency(p) : 'Miễn phí'}</span>
                        </div>
                      );
                    })}

                    {lastBooking.discount > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-emerald-600 font-semibold">Giảm giá</span>
                        <span className="font-bold text-emerald-600">-{formatCurrency(lastBooking.discount)}</span>
                      </div>
                    )}

                    <div className="!mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-700">Tổng dịch vụ</span>
                      <span className="font-extrabold text-base text-emerald-600">{formatCurrency(lastBooking.total || 0)}</span>
                    </div>

                    {lastBooking.paymentMode === 'full' ? (
                      <>
                        <div className="flex justify-between items-center pt-1">
                          <div>
                            <span className="font-semibold text-sm text-emerald-600">Thanh toán (100%)</span>
                            {lastBooking.depositPaid && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">ĐÃ THANH TOÁN</span>
                            )}
                          </div>
                          <span className="font-bold text-base text-emerald-600">{formatCurrency(lastBooking.total || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-medium">Còn lại (thanh toán sau)</span>
                          <span className="font-bold text-slate-500">0đ</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center pt-1">
                          <div>
                            <span className="font-semibold text-sm text-amber-600">Đặt cọc (30%)</span>
                            {lastBooking.depositPaid && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">ĐÃ CỌC</span>
                            )}
                          </div>
                          <span className="font-bold text-base text-amber-600">{formatCurrency(lastBooking.depositAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-medium">Còn lại (thanh toán sau)</span>
                          <span className="font-bold text-slate-500">{formatCurrency(Math.max(0, (lastBooking.total || 0) - (lastBooking.depositAmount || 0)))}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowSuccessModal(false); reset(); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors active:scale-[0.98]"
                >
                  Đóng
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowSuccessModal(false); reset(); onGoToHistory?.(lastBooking._id); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition-colors active:scale-[0.98]"
                >
                  Lịch sử đặt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Payment Modal */}
      <AnimatePresence>
        {pendingDeposit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!depositLoading && depositQrStep === 'select') { setPendingDeposit(null); setError(''); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100/80"
              onClick={e => e.stopPropagation()}
            >
              {depositQrStep === 'qr' && depositPayment?.qrCode ? (
                <>
                  {/* QR Code View */}
                  <div className="pt-8 pb-4 text-center px-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-emerald-50 border-2 border-emerald-100">
                      <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M2 12v4h20v-4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Chuyển khoản ngân hàng</h3>
                    <p className="text-slate-400 text-xs mt-1">Quét mã QR bằng app ngân hàng bất kỳ</p>
                  </div>

                  <div className="px-8 pb-2 flex justify-center">
                    <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm">
                      <img src={depositPayment.qrCode} alt="QR code" className="w-56 h-56" />
                    </div>
                  </div>

                  <div className="px-8 py-4 space-y-2">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-slate-400 mb-1">Số tiền cần chuyển</div>
                      <div className="text-2xl font-black text-emerald-600">{formatCurrency(depositPayment.amount || 0)}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {paymentMode === 'full' 
                          ? 'Thanh toán 100%'
                          : `Đặt cọc ${Math.round(((depositPayment.amount || pendingDeposit.depositAmount || 0) / (pendingDeposit.finalPrice || pendingDeposit.totalAmount || 1)) * 100)}% · Còn lại ${formatCurrency(Math.max(0, (pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0) - (depositPayment.amount || pendingDeposit.depositAmount || 0)))} (thanh toán sau)`
                        }
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold">Mã giao dịch</span>
                      <span className="text-sm font-bold text-slate-700 font-mono">{depositPayment.transactionId}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 pt-1">
                      <RefreshCw className={`w-3 h-3 ${depositPollCount % 2 === 0 ? 'animate-spin' : ''}`} />
                      Đang kiểm tra thanh toán...
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-2">
                    <button type="button" onClick={simulatePaymentConfirm}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition-colors active:scale-[0.98]">
                      Đã chuyển khoản
                    </button>
                    <button type="button" onClick={() => { setPendingDeposit(null); setDepositPayment(null); setDepositQrStep('select'); setError(''); }}
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                      Hủy
                    </button>
                  </div>
                </>
              ) : depositQrStep === 'success' ? (
                <>
                  {/* Success animation */}
                  <div className="pt-12 pb-8 text-center px-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">
                      {paymentMode === 'full' ? 'Thanh toán thành công!' : 'Đặt cọc thành công!'}
                    </h3>
                    <p className="text-slate-400 text-sm mt-2">
                      {paymentMode === 'full' ? 'Thanh toán 100% hoàn tất, lịch hẹn đã được xác nhận.' : 'Cảm ơn bạn, lịch hẹn đã được xác nhận.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Selection View (default) */}
                  {/* Header */}
                  <div className="pt-8 pb-4 text-center px-6 bg-white border-b border-slate-50">
                    <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {paymentMode === 'full' ? 'Thanh toán' : 'Thanh toán đặt cọc'}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      {paymentMode === 'full' ? 'Vui lòng thanh toán để hoàn tất đặt lịch' : 'Vui lòng đặt cọc để hoàn tất đặt lịch'}
                    </p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <div className="bg-slate-50 border border-slate-100/60 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-semibold">Tổng dịch vụ</span>
                          <span className="font-bold text-slate-700">{formatCurrency(pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0)}</span>
                        </div>
                        {paymentMode === 'deposit' ? (
                          <>
                            <div className="flex justify-between items-end">
                              <div>
                                <span className="text-amber-600 font-semibold text-sm">Đặt cọc ({Math.round(((pendingDeposit.depositAmount || 0) / (pendingDeposit.finalPrice || pendingDeposit.totalAmount || 1)) * 100)}%)</span>
                                <div className="text-[11px] text-slate-400 mt-0.5">{Math.round(((pendingDeposit.depositAmount || 0) / (pendingDeposit.finalPrice || pendingDeposit.totalAmount || 1)) * 100)}% × {formatCurrency(pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0)}</div>
                              </div>
                              <span className="font-black text-xl text-amber-600">{formatCurrency(pendingDeposit.depositAmount || 0)}</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400 font-semibold">Còn lại (thanh toán sau)</span>
                              <span className="font-bold text-slate-500">{formatCurrency(Math.max(0, (pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0) - (pendingDeposit.depositAmount || 0)))}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-end">
                              <div>
                                <span className="text-emerald-600 font-semibold text-sm">Thanh toán (100%)</span>
                                <div className="text-[11px] text-slate-400 mt-0.5">Thanh toán toàn bộ hóa đơn</div>
                              </div>
                              <span className="font-black text-xl text-emerald-600">{formatCurrency(pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0)}</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400 font-semibold">Còn lại (thanh toán sau)</span>
                              <span className="font-bold text-slate-500">0đ</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Số tiền cần thanh toán</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setPaymentMode('deposit')} 
                          className={`p-4 border-2 rounded-xl text-left transition-all ${paymentMode === 'deposit' ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-slate-200 hover:border-amber-200 hover:bg-amber-50/50'}`}
                        >
                          <div className={`font-bold text-sm ${paymentMode === 'deposit' ? 'text-amber-700' : 'text-slate-500'}`}>Thanh toán cọc {Math.round(((pendingDeposit.depositAmount || 0) / (pendingDeposit.finalPrice || pendingDeposit.totalAmount || 1)) * 100)}%</div>
                          <div className={`mt-1 text-lg font-black ${paymentMode === 'deposit' ? 'text-amber-600' : 'text-slate-700'}`}>{formatCurrency(pendingDeposit.depositAmount || 0)}</div>
                        </button>
                        <button 
                          onClick={() => setPaymentMode('full')} 
                          className={`p-4 border-2 rounded-xl text-left transition-all ${paymentMode === 'full' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50'}`}
                        >
                          <div className={`font-bold text-sm ${paymentMode === 'full' ? 'text-emerald-700' : 'text-slate-500'}`}>Thanh toán 100%</div>
                          <div className={`mt-1 text-lg font-black ${paymentMode === 'full' ? 'text-emerald-600' : 'text-slate-700'}`}>{formatCurrency(pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0)}</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Chọn phương thức</span>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { value: 'bank', label: 'Ngân hàng', color: '#10b981', icon: '' },
                        ].map(m => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setDepositMethod(m.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                              depositMethod === m.value
                                ? 'border-emerald-500 bg-emerald-50/30 shadow-sm'
                                : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ backgroundColor: m.color }}>
                              {m.value === 'bank' ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M2 12v4h20v-4" />
                                </svg>
                              ) : m.icon}
                            </div>
                            <span className={`text-xs font-bold ${depositMethod === m.value ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {m.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-500 font-semibold">{error}</div>
                    )}
                  </div>

                  <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={() => { if (!depositLoading) { setPendingDeposit(null); setError(''); } }} disabled={depositLoading}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <ArrowLeft className="w-4 h-4" />
                      Quay lại
                    </button>
                    <button type="button" onClick={payDeposit} disabled={depositLoading}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                      {depositLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" />{'ĐANG XỬ LÝ...'}</>
                      ) : paymentMode === 'full' ? (
                        'THANH TOÁN ' + formatCurrency(pendingDeposit.finalPrice || pendingDeposit.totalAmount || 0)
                      ) : (
                        'ĐẶT CỌC ' + formatCurrency(pendingDeposit.depositAmount || 0)
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {voucherModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setVoucherModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-slate-100 px-5 py-4 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg">Chọn Ưu Đãi</h3>
                <button
                  onClick={() => setVoucherModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <VoucherPicker
                  apiBase={apiBase} token={token} selected={appliedVoucher}
                  onSelect={(v) => { setAppliedVoucher(v); setVoucherModalOpen(false); }}
                  orderAmount={totalBase} compact branchId={selectedBranch?._id || selectedBranch?.id}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
