import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Clock, ShieldCheck, Car, Truck, Bike, Calendar, Tag, Check, 
  ArrowLeft, ArrowRight, RefreshCw, AlertCircle, Sparkles, Sun, Sunset, 
  Copy, Info, CheckCircle2 
} from 'lucide-react';
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

export default function BookingWidget({ onOpenAuth, user, vehicles: userVehicles = [], apiBase, token, onGoToHistory, pendingBooking, onSetPendingBooking, onVehicleCreated, initialBranchId }) {
  const isLoggedIn = !!user && !!token;
  const bookingDates = useMemo(() => buildBookingDates(), []);

  const [tab, setTab] = useState('regular');
  const [step, setStep] = useState(1);
  const [spCanAdvance, setSpCanAdvance] = useState(false);

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

  // Auto-select branch from URL param and jump to step 2
  useEffect(() => {
    if (!initialBranchId || branches.length === 0) return;
    const match = branches.find(b => (b._id || b.id) === initialBranchId);
    if (match) {
      setSelectedBranch(match);
      setStep(2);
    }
  }, [initialBranchId, branches]);

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
    const list = availableSlots.length > 0 
      ? availableSlots 
      : ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'].map(t => ({ startTime: t, available: true }));
    
    const morning = [];
    const afternoon = [];
    
    list.forEach(slot => {
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
    <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto mb-12 px-4">
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

        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] rounded-3xl p-6 md:p-10">

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/50 w-fit mx-auto mb-10 shadow-inner">
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
                            onClick={() => setWeeks(w)}
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
                        <div className="p-4 rounded-xl bg-white border border-slate-150 shadow-sm">
                          <p className="text-xs text-slate-500 mb-2.5 font-semibold">📋 Danh sách buổi giặt dự kiến ({previewDates.length} buổi):</p>
                          <div className="flex flex-wrap gap-1.5">
                            {previewDates.slice(0, 10).map((d, i) => (
                              <span key={i} className="text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                                {d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                              </span>
                            ))}
                            {previewDates.length > 10 && (
                              <span className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                +{previewDates.length - 10} buổi nữa
                              </span>
                            )}
                          </div>
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
                            <div className="p-4 rounded-2xl bg-emerald-50/20 border border-emerald-100 space-y-2">
                              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wide block">Thanh toán bằng Gói Lượt:</label>
                              <select 
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                                value={selectedSlotPack || ''}
                                onChange={e => { 
                                  setSelectedSlotPack(e.target.value || null); 
                                  if (e.target.value) setAppliedVoucher(null); 
                                }}
                              >
                                <option value="">Không sử dụng gói lượt</option>
                                {validPacks.map(p => (
                                  <option key={p._id || p.id} value={p._id || p.id}>
                                    Gói {p.packageId?.name} (Còn {p.remainingSlots} lần)
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {!isPayingWithPack && (
                            <VoucherPicker apiBase={apiBase} token={token} selected={appliedVoucher} onSelect={setAppliedVoucher} orderAmount={totalBase} compact />
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
                      </div>
                    </div>
                  </div>

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
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100/80 overflow-hidden max-h-[90vh] flex flex-col"
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
                
                <h3 className="text-xl font-bold text-slate-800">Đặt lịch thành công</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">Cảm ơn bạn đã sử dụng dịch vụ của AutoWash Pro</p>
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
                    <span className="text-slate-400 text-xs font-semibold">Gói dịch vụ</span>
                    <span className="font-bold text-slate-700 text-sm">{lastBooking.pkg?.name}</span>
                  </div>
                  {lastBooking.subServices?.length > 0 && (
                    <div className="flex justify-between py-3 text-right">
                      <span className="text-slate-400 text-xs font-semibold shrink-0">Dịch vụ phụ</span>
                      <span className="font-bold text-slate-700 text-sm pl-4">{lastBooking.subServices.join(', ')}</span>
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
                  <div className="flex justify-between items-center py-4">
                    <span className="font-bold text-sm text-slate-500">Tổng thanh toán</span>
                    <span className="font-black text-lg text-emerald-600">{formatCurrency(lastBooking.total)}</span>
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
                  onClick={() => { setShowSuccessModal(false); reset(); onGoToHistory?.(); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition-colors active:scale-[0.98]"
                >
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
