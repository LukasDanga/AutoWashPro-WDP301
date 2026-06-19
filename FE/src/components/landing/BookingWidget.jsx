import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoucherPicker from '../VoucherPicker.jsx';
import SlotPackFlow from '../customer/SlotPackFlow.jsx';

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
  { value: 'motorcycle', label: 'Xe máy' },
];

export default function BookingWidget({ onOpenAuth, user, vehicles: userVehicles = [], apiBase, token, onGoToHistory, pendingBooking, onSetPendingBooking, onVehicleCreated }) {
  const isLoggedIn = !!user && !!token;
  const bookingDates = useMemo(() => buildBookingDates(), []);

  const [tab, setTab] = useState('regular');
  const [step, setStep] = useState(1);

  // Data from API
  const [branches, setBranches] = useState([]);
  const [packages, setPackages] = useState([]);
  const [mySlotPacks, setMySlotPacks] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

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

  // Process pending booking after login
  const [processingPending, setProcessingPending] = useState(false);

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
  }, [selectedBranch, selectedPackage, currentDate?.iso, isLoggedIn, apiBase, token]);

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

      // Create booking
      const body = {
        branchId: pb.branchId,
        packageId: pb.packageId,
        vehicleId,
        bookingDate: pb.selectedDate || undefined,
        startTime: pb.selectedTime,
        voucherCode: pb.appliedVoucher?.code || undefined,
        selectedSubServices: pb.selectedSubServices || [],
        note: '',
      };

      const endpoint = pb.tab === 'recurring' ? `${apiBase}/bookings/recurring` : `${apiBase}/bookings`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pb.tab === 'recurring' ? {
          ...body,
          weekdays: pb.selectedDays,
          weeks: pb.weeks,
          vehicleId: vehicleId || undefined,
          selectedSubServices: pb.selectedSubServices || [],
        } : body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error('Pending booking creation failed:', res.status, JSON.stringify(errData));
        throw new Error(errData?.message || errData?.error || 'Không thể tạo lịch hẹn');
      }

      const payload = await res.json();
      const booking = payload?.data || payload;
      const code = booking?.bookingCode || booking?.code || '';
      setBookingCode(code);
      setLastBooking({
        branch: selectedBranch || { name: '' },
        vehicle: { licensePlate: gv?.licensePlate || '', name: gv?.brand || '' },
        pkg: pkg || { name: '' },
        currentDate: pb.selectedDate ? bookingDates.find(d => d.id === pb.selectedDate) : null,
        selectedTime: pb.selectedTime,
        total: pb.tab === 'recurring' ? (totalBase - discount) * (booking?.totalCreated || 1) : total,
        discount: pb.tab === 'recurring' ? discount * (booking?.totalCreated || 1) : discount,
        points: pb.tab === 'recurring' ? points * (booking?.totalCreated || 1) : points,
        isPayingWithPack: false,
        bookingCode: code,
        subServices: pb.selectedSubServices || [],
        recurringCount: pb.tab === 'recurring' ? booking?.totalCreated || 0 : undefined,
      });
      setShowSuccessModal(true);
      onSetPendingBooking(null);
    } catch (err) {
      console.error('processPendingBooking error:', err);
      setError(err.message || 'Không thể tạo lịch hẹn');
      onSetPendingBooking(null);
    } finally {
      setBookingLoading(false);
      setProcessingPending(false);
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
  };

  const totalSteps = 5;

  const canNextStep = () => {
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
      const body = {
        branchId,
        packageId: pkgId,
        vehicleId: vehicle._id || vehicle.id || vehicle.licensePlate,
        bookingDate: currentDate.iso,
        startTime: selectedTime,
        voucherCode: isPayingWithPack ? undefined : (appliedVoucher?.code || undefined),
        selectedSubServices: currentSubServices,
        slotPackId: selectedSlotPack || undefined,
        note: '',
      };
      const res = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || 'Không thể tạo lịch hẹn');
      }
      const payload = await res.json();
      const booking = payload?.data || payload;
      setBookingCode(booking?.bookingCode || booking?.code || '');
      setLastBooking({
        branch: selectedBranch, vehicle, pkg, currentDate, selectedTime,
        total, discount, points, isPayingWithPack,
        bookingCode: booking?.bookingCode || booking?.code || '',
        subServices: currentSubServices,
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
        setLastBooking({
          branch: selectedBranch, vehicle, pkg, currentDate: null, selectedTime,
          total: (totalBase - discount) * resultData.totalCreated,
          discount: discount * resultData.totalCreated,
          points: points * resultData.totalCreated,
          isPayingWithPack: false,
          bookingCode: resultData.recurringGroupId || '',
          subServices: currentSubServices,
          recurringCount: resultData.totalCreated,
        });
        setBookingCode(resultData.recurringGroupId || '');
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingLoading(false);
    }
  }

  const reset = () => {
    setStep(1);
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
    setGuestVehicle({ licensePlate: '', brand: '', model: '', type: 'sedan' });
    setVehicleError('');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-10">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === s ? 'bg-emerald-600 text-white shadow-md'
              : step > s ? 'bg-emerald-100 text-emerald-600'
              : 'bg-slate-100 text-slate-400'
          }`}>
            {step > s ? '✓' : s}
          </div>
          {s < totalSteps && <div className={`w-8 md:w-12 h-0.5 ${step > s ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );

  const dayLabel = (value) => WEEKDAY_OPTIONS.find(o => o.value === value)?.label || String(value);

  return (
    <section id="booking" className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">Đặt lịch</span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900 mb-4">
            Trải nghiệm đặt lịch
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">Chọn chi nhánh, chọn gói dịch vụ, chọn thời gian - và chúng tôi lo phần còn lại.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 md:p-10">

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit mx-auto mb-8">
            <button onClick={() => { setTab('regular'); reset(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'regular' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Đặt lịch thường
            </button>
            <button onClick={() => { setTab('recurring'); reset(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'recurring' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Đặt lịch định kì
            </button>
            <button onClick={() => { setTab('slot_pack'); reset(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'slot_pack' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Gói lượt
            </button>
          </div>

          {/* ── Slot Pack Tab ── */}
          {tab === 'slot_pack' && (
            isLoggedIn ? (
              <SlotPackFlow user={user} vehicles={userVehicles} apiBase={apiBase} token={token} />
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
              {renderStepIndicator()}

              {/* STEP 1: Chi nhánh */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn chi nhánh</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {branches.length === 0 ? (
                      <div className="col-span-2 text-center text-slate-400 py-8">Đang tải danh sách chi nhánh...</div>
                    ) : branches.map((b) => (
                      <button key={b._id || b.id} onClick={() => setSelectedBranch(b)}
                        className={`text-left p-5 rounded-xl border transition-all ${
                          (selectedBranch?._id || selectedBranch?.id) === (b._id || b.id)
                            ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 mt-0.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
                          </svg>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{b.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{b.address}</div>
                            {b.openingTime && <div className="text-xs text-slate-400 mt-1">⏰ {b.openingTime} – {b.closingTime}</div>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Gói dịch vụ */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="text-lg font-semibold text-slate-800 mb-6">
                    Chọn gói dịch vụ{isLoggedIn && selectedBranch ? ` tại ${selectedBranch.name}` : ''}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {packages.length === 0 ? (
                      <div className="col-span-2 text-center text-slate-400 py-8">Chi nhánh này chưa có gói dịch vụ nào.</div>
                    ) : packages.map(p => {
                      const pId = p._id || p.id;
                      const isActive = pId === (selectedPackage?._id || selectedPackage?.id);
                      return (
                        <div key={pId}
                          className={`rounded-xl border transition-all ${isActive ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                          <button onClick={() => setSelectedPackage(p)} className="w-full text-left p-5">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold text-slate-800">{p.name}</span>
                              <span className="text-emerald-600 font-bold">{formatCurrency(p.price)}</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">{p.description}</p>
                            <span className="text-xs text-slate-400">{p.duration} phút</span>
                          </button>
                          {isActive && p.subServices && p.subServices.length > 0 && (
                            <div className="px-5 pb-4 pt-2 border-t border-slate-100">
                              <strong className="text-xs text-emerald-600 block mb-2">Dịch vụ chọn thêm:</strong>
                              {p.subServices.map(sub => {
                                const checked = currentSubServices.includes(sub.name);
                                return (
                                  <label key={sub.name} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                                    <input type="checkbox" checked={checked} disabled={!sub.isOptional}
                                      onChange={() => {
                                        setSelectedSubServices(prev => {
                                          const current = prev[pId] || [];
                                          return { ...prev, [pId]: checked ? current.filter(x => x !== sub.name) : [...current, sub.name] };
                                        });
                                      }} />
                                    <span className="flex-1 text-slate-700">{sub.name}</span>
                                    <span className="text-emerald-600 font-medium text-xs">{sub.price > 0 ? `+${formatCurrency(sub.price)}` : 'Miễn phí'}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Xe (logged-in: select; guest: form) */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {isLoggedIn ? (
                    <>
                      <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn xe</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {userVehicles.length === 0 ? (
                          <div className="col-span-2 text-center text-slate-400 py-8">Chưa có xe nào.</div>
                        ) : userVehicles.map(v => {
                          const vId = v._id || v.id;
                          return (
                            <button key={vId} onClick={() => setSelectedVehicle(vId)}
                              className={`text-left p-5 rounded-xl border transition-all ${
                                selectedVehicle === vId ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}>
                              <div className="font-semibold text-slate-800 text-sm">{v.name || `${v.brand || ''} ${v.model || ''}`.trim() || v.licensePlate}</div>
                              <div className="text-xs text-slate-400 mt-1">{v.licensePlate || v.plate}</div>
                              <div className="text-xs text-slate-400">{v.vehicleType || v.type || ''}</div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-slate-800 mb-6">Thông tin xe của bạn</h3>
                      <p className="text-sm text-slate-500 mb-6">Nhập thông tin xe để tiếp tục. Sau khi đăng nhập, xe sẽ tự động lưu vào tài khoản.</p>
                      <div className="max-w-md mx-auto space-y-4">
                        <div>
                          <label className="text-sm text-slate-500 block mb-1.5">Biển số xe *</label>
                          <input type="text" value={guestVehicle.licensePlate} placeholder="Ví dụ: 30A-12345"
                            onChange={e => setGuestVehicle(prev => ({ ...prev, licensePlate: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                        </div>
                        <div>
                          <label className="text-sm text-slate-500 block mb-1.5">Hãng xe *</label>
                          <input type="text" value={guestVehicle.brand} placeholder="Ví dụ: Toyota, Honda, Hyundai..."
                            onChange={e => setGuestVehicle(prev => ({ ...prev, brand: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                        </div>
                        <div>
                          <label className="text-sm text-slate-500 block mb-1.5">Dòng xe</label>
                          <input type="text" value={guestVehicle.model} placeholder="Ví dụ: Camry, Tucson, SH..."
                            onChange={e => setGuestVehicle(prev => ({ ...prev, model: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                        </div>
                        <div>
                          <label className="text-sm text-slate-500 block mb-1.5">Loại xe *</label>
                          <select value={guestVehicle.type}
                            onChange={e => setGuestVehicle(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all">
                            {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* STEP 4: Thời gian */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="text-lg font-semibold text-slate-800 mb-6">
                    {tab === 'regular' ? 'Chọn thời gian' : 'Lịch định kỳ'}
                  </h3>

                  {tab === 'regular' ? (
                    <div className="mb-8">
                      <label className="text-sm text-slate-500 block mb-3">Chọn ngày</label>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {bookingDates.map((d) => (
                          <button key={d.id} onClick={() => setSelectedDate(d.id)}
                            className={`min-w-[60px] p-3 rounded-xl border text-center transition-all ${
                              selectedDate === d.id ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}>
                            <div className="text-xs text-slate-400 font-medium">{d.label}</div>
                            <div className="text-base font-bold text-slate-800 mt-1">{d.day}</div>
                            <div className="text-xs text-slate-400">Thg {d.month}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8">
                      <label className="text-sm text-slate-500 block mb-3">Các ngày trong tuần</label>
                      <div className="flex gap-2">
                        {WEEKDAY_OPTIONS.map(({ label, value }) => (
                          <button key={value} onClick={() => toggleDay(value)}
                            className={`w-10 h-10 rounded-xl text-xs font-medium transition-all ${
                              selectedDays.includes(value) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <label className="text-sm text-slate-500 block mb-3">Chọn khung giờ{tab === 'recurring' ? ' cố định' : ''}</label>
                    <div className="flex flex-wrap gap-2">
                      {tab === 'regular' ? (
                        slotsLoading ? (
                          <div className="text-slate-400 text-sm py-2">Đang tải lịch trống...</div>
                        ) : availableSlots.length > 0 ? (
                          availableSlots.map(s => {
                            const timeLabel = s.startTime;
                            const isDisabled = !s.available;
                            return (
                              <button key={timeLabel} disabled={isDisabled}
                                onClick={() => setSelectedTime(timeLabel)}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                                  selectedTime === timeLabel
                                    ? 'border-emerald-400 bg-emerald-50/50 text-emerald-700 shadow-sm'
                                    : isDisabled
                                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                }`}>
                                {timeLabel}
                              </button>
                            );
                          })
                        ) : (
                          ['07:00','08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                            <button key={t} onClick={() => setSelectedTime(t)}
                              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                                selectedTime === t ? 'border-emerald-400 bg-emerald-50/50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                              }`}>{t}</button>
                          ))
                        )
                      ) : (
                        TIME_SLOTS.map(t => (
                          <button key={t} onClick={() => setSelectedTime(t)}
                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                              selectedTime === t ? 'border-emerald-400 bg-emerald-50/50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                            }`}>{t}</button>
                        ))
                      )}
                    </div>
                  </div>

                  {tab === 'recurring' && (
                    <div>
                      <label className="text-sm text-slate-500 block mb-3">Số tuần lặp lại</label>
                      <div className="flex gap-2 flex-wrap">
                        {WEEKS_OPTIONS.map(w => (
                          <button key={w} onClick={() => setWeeks(w)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              weeks === w ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>{w} tuần</button>
                        ))}
                      </div>
                      {previewDates.length > 0 && (
                        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-2">📋 Dự kiến: <strong className="text-slate-700">{previewDates.length} buổi</strong></p>
                          <div className="flex flex-wrap gap-1">
                            {previewDates.slice(0, 10).map((d, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                {d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                              </span>
                            ))}
                            {previewDates.length > 10 && <span className="text-[10px] text-slate-400">+{previewDates.length - 10}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 5: Confirm */}
              {step === 5 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Xác nhận đặt lịch</h3>

                  <div className="max-w-sm mx-auto mt-8 space-y-3 text-left">
                    <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-500 text-sm">Chi nhánh</span>
                      <span className="text-slate-800 font-medium text-sm">{selectedBranch?.name}</span>
                    </div>
                    {pendingBooking?.guestVehicle?.licensePlate ? (
                      <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 text-sm">Xe</span>
                        <span className="text-slate-800 font-medium text-sm">{pendingBooking.guestVehicle.licensePlate} ({pendingBooking.guestVehicle.brand} {pendingBooking.guestVehicle.model})</span>
                      </div>
                    ) : isLoggedIn && vehicle && (
                      <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 text-sm">Xe</span>
                        <span className="text-slate-800 font-medium text-sm">{vehicle.licensePlate || vehicle.name}</span>
                      </div>
                    )}
                    {!isLoggedIn && guestVehicle.licensePlate && (
                      <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 text-sm">Xe</span>
                        <span className="text-slate-800 font-medium text-sm">{guestVehicle.licensePlate} ({guestVehicle.brand} {guestVehicle.model})</span>
                      </div>
                    )}
                    <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-500 text-sm">Gói dịch vụ</span>
                      <span className="text-slate-800 font-medium text-sm">{pkg?.name}</span>
                    </div>
                    <div className="flex justify-between p-4 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-500 text-sm">Thời gian</span>
                      <span className="text-slate-800 font-medium text-sm">
                        {tab === 'regular'
                          ? `${currentDate?.label} ${selectedTime}`
                          : `${selectedTime} (${selectedDays.map(dayLabel).join(', ')}) · ${weeks} tuần · ${previewDates.length} buổi`
                        }
                      </span>
                    </div>

                    {isLoggedIn && (
                      <div className="pt-4 border-t border-slate-200 space-y-3">
                        {tab === 'regular' && validPacks.length > 0 && (
                          <div className="p-4 rounded-xl bg-white border border-slate-200">
                            <label className="text-xs text-slate-500 block mb-2">Thanh toán bằng Gói Lượt:</label>
                            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={selectedSlotPack || ''}
                              onChange={e => { setSelectedSlotPack(e.target.value || null); if (e.target.value) setAppliedVoucher(null); }}>
                              <option value="">Không sử dụng gói lượt</option>
                              {validPacks.map(p => (
                                <option key={p._id || p.id} value={p._id || p.id}>Còn {p.remainingSlots} lần</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {!isPayingWithPack && (
                          <VoucherPicker apiBase={apiBase} token={token} selected={appliedVoucher} onSelect={setAppliedVoucher} orderAmount={totalBase} compact />
                        )}
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-emerald-700 font-semibold text-sm">Tổng cộng</span>
                        <span className="text-emerald-700 font-bold">{formatCurrency(total)}</span>
                      </div>
                      {isLoggedIn && discount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600">Khuyến mãi</span>
                          <span className="text-emerald-600">-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      {isLoggedIn && points > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600">Tích điểm</span>
                          <span className="text-emerald-600">+{points} điểm</span>
                        </div>
                      )}
                      {tab === 'recurring' && pkg && previewDates.length > 0 && (
                        <>
                          <div className="border-t border-emerald-200 pt-2 mt-2" />
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-600">Tổng dự kiến ({previewDates.length} buổi)</span>
                            <span className="text-emerald-600 font-bold">{formatCurrency((totalBase - discount) * previewDates.length)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {result && tab === 'recurring' && (
                    <div className="mt-4 space-y-1">
                      {result.totalCreated > 0 && <div className="text-sm text-emerald-600 font-semibold">✓ Đã tạo {result.totalCreated} lịch hẹn!</div>}
                      {result.totalFailed > 0 && <div className="text-sm text-amber-500 font-medium">⚠ {result.totalFailed} ngày bị bỏ qua do trùng slot.</div>}
                    </div>
                  )}

                  {error && <div className="mt-4 text-red-500 font-medium text-sm">{error}</div>}
                  {processingPending && (
                    <div className="mt-4 text-emerald-600 font-medium text-sm">Đang xử lý đặt lịch sau đăng nhập...</div>
                  )}

                  {tab === 'regular' ? (
                    <button onClick={confirmBooking} disabled={bookingLoading}
                      className="mt-8 px-10 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:opacity-50">
                      {bookingLoading ? 'Đang tạo...' : isLoggedIn ? 'Xác nhận đặt chỗ' : 'Đăng nhập để xác nhận'}
                    </button>
                  ) : (
                    <button onClick={confirmRecurringBooking} disabled={bookingLoading || previewDates.length === 0}
                      className="mt-8 px-10 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:opacity-50">
                      {bookingLoading ? 'Đang tạo lịch...' : isLoggedIn ? `Xác nhận ${previewDates.length} buổi` : 'Đăng nhập để xác nhận'}
                    </button>
                  )}
                  {!isLoggedIn && <p className="text-slate-400 text-xs mt-3">Bạn cần đăng nhập để hoàn tất đặt lịch. Thông tin xe sẽ tự động lưu vào tài khoản.</p>}
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
                {step > 1 ? (
                  <button onClick={() => setStep(step - 1)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Quay lại
                  </button>
                ) : <div />}
                {step < totalSteps ? (
                  <button onClick={() => setStep(step + 1)} disabled={!canNextStep()}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      canNextStep() ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}>
                    Tiếp theo
                  </button>
                ) : (
                  <button onClick={reset}
                    className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Đặt lại
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal && lastBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => { setShowSuccessModal(false); reset(); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[1.5rem] w-full max-w-lg p-8 shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Đặt lịch thành công!</h3>
                <p className="text-sm text-slate-500 mt-1">Mã đặt chỗ: <span className="font-semibold text-emerald-600">{lastBooking.bookingCode}</span></p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Chi nhánh</span>
                  <span className="font-medium text-slate-800">{lastBooking.branch?.name}</span>
                </div>
                {lastBooking.vehicle && (
                  <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Xe</span>
                    <span className="font-medium text-slate-800">{lastBooking.vehicle.licensePlate || lastBooking.vehicle.name}</span>
                  </div>
                )}
                <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Gói dịch vụ</span>
                  <span className="font-medium text-slate-800">{lastBooking.pkg?.name}</span>
                </div>
                {lastBooking.subServices?.length > 0 && (
                  <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">DV chọn thêm</span>
                    <span className="font-medium text-slate-800">{lastBooking.subServices.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Thời gian</span>
                  <span className="font-medium text-slate-800">
                    {lastBooking.currentDate
                      ? `${lastBooking.currentDate.label} ${lastBooking.selectedTime}`
                      : `${lastBooking.selectedTime} · ${lastBooking.recurringCount || 0} buổi định kỳ`}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 font-semibold">Tổng thanh toán</span>
                  <span className="text-emerald-700 font-bold">{formatCurrency(lastBooking.total)}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => { setShowSuccessModal(false); reset(); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Đóng
                </button>
                <button onClick={() => { setShowSuccessModal(false); reset(); onGoToHistory?.(); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
                  Lịch sử đặt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
