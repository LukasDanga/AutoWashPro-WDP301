import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Copy, Check, Sun, Sunset } from 'lucide-react';
import { showToast } from '@/lib/toast';
import useSSE from '../../hooks/useSSE';
import QuickBookModal from '../customer/QuickBookModal.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_MAP = {
  pending:     { label: 'Chờ xử lý',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  confirmed:   { label: 'Đã xác nhận', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  checked_in:  { label: 'Đã check-in', cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  in_progress: { label: 'Đang rửa',    cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  completed:   { label: 'Hoàn thành',  cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  cancelled:   { label: 'Đã hủy',      cls: 'bg-red-50 text-red-500 border-red-200' },
  paid:        { label: 'Đã thanh toán', cls: 'bg-green-50 text-green-600 border-green-200' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VN = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function formatCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function formatDate(d) { return new Date(d).toLocaleDateString('vi-VN'); }

function isSameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }
function localDateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
            s <= value ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}>★</button>
      ))}
    </div>
  );
}

const PACK_STATUS_MAP = {
  active: { label: 'Còn hiệu lực', color: '#10b981', bg: '#ecfdf5' },
  exhausted: { label: 'Đã dùng hết', color: '#6b7280', bg: '#f9fafb' },
  expired: { label: 'Hết hạn', color: '#ef4444', bg: '#fef2f2' },
  cancelled: { label: 'Đã hủy', color: '#94a3b8', bg: '#f1f5f9' },
};

function SlotMeter({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Còn lại</span>
        <span className="font-bold">{remaining}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PackCard({ pack, onQuickBook, onCancelPack }) {
  const st = PACK_STATUS_MAP[pack.status] || { label: pack.status, color: '#6b7280', bg: '#f9fafb' };
  const pkg = pack.packageId;
  const branch = pack.branchId;
  const canQuickBook = pack.status === 'active' && pack.remainingSlots > 0 && pack.paymentStatus === 'paid';
  const canCancel = pack.status === 'active';

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md ${pack.status !== 'active' ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-xs font-bold text-slate-900 tracking-wider">{pack.packCode}</div>
          <div className="text-sm font-bold text-slate-900 mt-1">{pkg?.name || 'Gói dịch vụ'}</div>
          <div className="text-xs text-slate-400 mt-0.5">📍 {branch?.name || 'Áp dụng toàn hệ thống'}</div>
        </div>
        <div className="flex items-center gap-2">
          {pack.discountPercent > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              -{pack.discountPercent}%
            </span>
          )}
          <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5" style={{ color: st.color, background: st.bg }}>
            {st.label}
          </span>
        </div>
      </div>
      <SlotMeter total={pack.totalSlots} remaining={pack.remainingSlots} />
      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
        {[
          { label: 'Giá gói', value: formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice) },
          { label: 'Đã dùng', value: `${pack.usedSlots} lần` },
          { label: 'Hết hạn', value: pack.expiresAt ? new Date(pack.expiresAt).toLocaleDateString('vi-VN') : '—' },
          { label: 'Thanh toán', value: pack.paymentStatus === 'paid' ? '✓ Đã TT' : '⏳ Chờ TT', highlight: pack.paymentStatus === 'paid' },
        ].map(r => (
          <div key={r.label}>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{r.label}</div>
            <div className={`text-xs font-bold mt-0.5 ${r.highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{r.value}</div>
          </div>
        ))}
      </div>
      {pack.voucherCode && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          🏷 {pack.voucherCode} — tiết kiệm thêm {formatCurrency(pack.voucherDiscount)}
        </div>
      )}
      {(canQuickBook || canCancel) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {canCancel && onCancelPack && (
            <button
              type="button"
              onClick={() => onCancelPack(pack)}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
            >
              Hủy gói
            </button>
          )}
          {canQuickBook && onQuickBook && (
            <button
              type="button"
              onClick={() => onQuickBook(pack)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              ⚡ Đặt lịch nhanh
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage({ onBack, apiBase, token, vehicles: userVehicles = [] }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 50;

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('-createdAt'); // Mới nhất default
  const [viewMode, setViewMode] = useState('list');
  const [slotPacks, setSlotPacks] = useState([]);
  const [slotPacksLoading, setSlotPacksLoading] = useState(false);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0,0,0,0); return d;
  });

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [availableSubServices, setAvailableSubServices] = useState([]);
  const [selectedNewSubs, setSelectedNewSubs] = useState([]);
  const [addingService, setAddingService] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rebookLoading, setRebookLoading] = useState(false);

  // Cancel confirm modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelConfirmError, setCancelConfirmError] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Cancel recurring confirm modal
  const [showCancelRecurringConfirm, setShowCancelRecurringConfirm] = useState(false);
  const [cancelRecurringTarget, setCancelRecurringTarget] = useState(null);

  // Recurring group modal
  const [showRecurringGroupModal, setShowRecurringGroupModal] = useState(false);
  const [recurringGroupTarget, setRecurringGroupTarget] = useState(null);
  const [recurringGroupBookings, setRecurringGroupBookings] = useState([]);
  const [recurringGroupLoading, setRecurringGroupLoading] = useState(false);

  // Rebook modal
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [rebookTarget, setRebookTarget] = useState(null);
  const [rebookDate, setRebookDate] = useState('');
  const [rebookTime, setRebookTime] = useState('');
  const [rebookFormError, setRebookFormError] = useState('');
  const [rebookSlots, setRebookSlots] = useState([]);
  const [rebookSlotsLoading, setRebookSlotsLoading] = useState(false);
  const [rebookDepositMethod, setRebookDepositMethod] = useState('bank');
  const [rebookPaymentMode, setRebookPaymentMode] = useState('deposit'); // 'deposit' | 'full'
  const [rebookDraft, setRebookDraft] = useState(null);
  const [rebookDepositPayment, setRebookDepositPayment] = useState(null);
  const [rebookQrStep, setRebookQrStep] = useState('form'); // 'form' | 'qr' | 'success'
  const [rebookQrLoading, setRebookQrLoading] = useState(false);
  const [rebookVnpayLoading, setRebookVnpayLoading] = useState(false);
  const rebookPollRef = useRef(null);
  const [rebookSubServices, setRebookSubServices] = useState([]);
  const [rebookAvailableSubServices, setRebookAvailableSubServices] = useState([]);
  const [rebookVoucherCode, setRebookVoucherCode] = useState('');
  const [rebookVoucherDiscount, setRebookVoucherDiscount] = useState(0);
  const [rebookApplyingVoucher, setRebookApplyingVoucher] = useState(false);
  const [rebookAvailableVouchers, setRebookAvailableVouchers] = useState(null);
  const [rebookShowVoucherPicker, setRebookShowVoucherPicker] = useState(false);


  // Quick book modal
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [quickBookPack, setQuickBookPack] = useState(null);
  const [quickBookPrefill, setQuickBookPrefill] = useState(null); // from a booking item
  const [qbVehicleId, setQbVehicleId] = useState('');
  const [qbDate, setQbDate] = useState('');
  const [qbSlots, setQbSlots] = useState([]);
  const [qbSlotsLoading, setQbSlotsLoading] = useState(false);
  const [qbTime, setQbTime] = useState('');
  const [qbSubmitting, setQbSubmitting] = useState(false);
  const [qbError, setQbError] = useState('');
  const [cancelPackLoading, setCancelPackLoading] = useState(null);
  const [qbBranchId, setQbBranchId] = useState('');
  const [qbVoucherCode, setQbVoucherCode] = useState('');
  const [qbVoucherDiscount, setQbVoucherDiscount] = useState(0);
  const [qbApplyingVoucher, setQbApplyingVoucher] = useState(false);
  const [qbAvailableVouchers, setQbAvailableVouchers] = useState([]);
  const [qbVouchersLoading, setQbVouchersLoading] = useState(false);
  const [qbQrStep, setQbQrStep] = useState('form'); // 'form' | 'qr' | 'vnpay_redirect'
  const [qbDepositPayment, setQbDepositPayment] = useState(null);
  const [qbDraft, setQbDraft] = useState(null);
  const [qbQrPollCount, setQbQrPollCount] = useState(0);
  const [qbQrLoading, setQbQrLoading] = useState(false);
  const [qbBookingResult, setQbBookingResult] = useState(null);
  const qbPollRef = useRef(null);

  // Cleanup poll khi modal đóng
  useEffect(() => {
    if (!showQuickBookModal) {
      if (qbPollRef.current) clearInterval(qbPollRef.current);
    }
  }, [showQuickBookModal]);

  // Cleanup rebook poll khi modal đóng
  useEffect(() => {
    if (!showRebookModal) {
      if (rebookPollRef.current) clearInterval(rebookPollRef.current);
    }
  }, [showRebookModal]);

  const debounceRef = useRef(null);

  function showToastMsg(message, type = 'success') {
    showToast(message, type);
  }

  const doFetch = useCallback((kw, st, tp, df, dt, pg, so, gbr) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', pg);
    params.set('limit', limit);
    if (kw.trim()) params.set('keyword', kw.trim());
    if (st) params.set('status', st);
    if (tp) params.set('bookingType', tp);
    if (df) params.set('dateFrom', df);
    if (dt) params.set('dateTo', dt);
    if (so) params.set('sort', so);
    if (gbr) params.set('groupByRecurring', 'true');

    const url = `${apiBase || API_BASE}/bookings/my?${params.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(payload => {
        const result = payload?.data || payload;
        setBookings(Array.isArray(result) ? result : (result?.bookings || []));
        setPagination(result?.pagination || null);
      })
      .catch(e => { console.error(e); setBookings([]); })
      .finally(() => setLoading(false));
  }, [apiBase, token, limit]);

  const fetchSlotPacks = useCallback(() => {
    if (!token) return;
    setSlotPacksLoading(true);
    fetch(`${apiBase || API_BASE}/slot-packs/my?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(payload => {
        const data = payload?.data || payload;
        setSlotPacks(Array.isArray(data) ? data : (data?.packs || []));
      })
      .catch(err => {
        console.error('Lỗi khi fetch gói lượt', err);
        setSlotPacks([]);
      })
      .finally(() => setSlotPacksLoading(false));
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase || API_BASE}/branches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setBranches(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [apiBase, token]);



  useEffect(() => {
    if (viewMode === 'slot_packs') {
      fetchSlotPacks();
    }
  }, [viewMode, fetchSlotPacks]);

  useEffect(() => {
    if (!token) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const gbr = viewMode === 'list';
    debounceRef.current = setTimeout(() => {
      doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, gbr);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode, token, doFetch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bId = params.get('bookingId');
    if (bId && token) {
      loadDetail(bId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  async function loadDetail(id) {
    if (!id) return;
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setDetailBooking(payload.data || payload);
      }
    } catch (error) {
      console.error('Failed to load detail', error);
    }
  }

  const loadRecurringGroup = useCallback(async () => {
    if (!recurringGroupTarget?.recurringGroupId) return;
    setRecurringGroupLoading(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/my?recurringGroupId=${recurringGroupTarget.recurringGroupId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        const result = payload?.data || payload;
        setRecurringGroupBookings(Array.isArray(result) ? result : (result?.bookings || []));
      }
    } catch (e) {
      console.error(e);
      setRecurringGroupBookings([]);
    } finally {
      setRecurringGroupLoading(false);
    }
  }, [recurringGroupTarget, token, apiBase]);

  useEffect(() => {
    if (showRecurringGroupModal && recurringGroupTarget) {
      loadRecurringGroup();
    }
  }, [showRecurringGroupModal, recurringGroupTarget, loadRecurringGroup]);

  /* ── SSE: auto-refresh on notification ── */
  useSSE(token, 'notification', useCallback(() => {
    const gbr = viewMode === 'list';
    doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, gbr);
  }, [doFetch, keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode]));

  useSSE(token, 'my_bookings_updated', useCallback(() => {
    const gbr = viewMode === 'list';
    doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, gbr);
  }, [doFetch, keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode]));

  function resetFilters() { setKeyword(''); setStatusFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); setSort('-createdAt'); setPage(1); }
  function onFilterChange(setter, value) { setter(value); setPage(1); }
  function openReview(b) { setReviewTarget(b); setRating(b.rating || 0); setFeedbackText(b.feedback || ''); setShowReviewModal(true); }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!reviewTarget || rating === 0) return;
    setSubmitting(true);
    try {
      const bId = reviewTarget._id || reviewTarget.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, feedback: feedbackText.trim() || undefined }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Gửi đánh giá thất bại'); }
      const payload = await res.json();
      const updated = payload?.data || payload;
      setBookings(prev => prev.map(b => ((b._id || b.id) === bId ? { ...b, ...updated } : b)));
      setShowReviewModal(false); setReviewTarget(null);
      showToastMsg('Đánh giá thành công!');
    } catch (e) { showToastMsg(e.message, 'error'); } finally { setSubmitting(false); }
  }

  async function handleCancel(b) {
    setCancelTarget(b);
    setCancelConfirmError('');
    setCancelReason('');
    setShowCancelConfirm(true);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelConfirmError('Vui lòng nhập lý do hủy đơn');
      return;
    }
    setCancelLoading(true);
    setCancelConfirmError('');
    try {
      const bId = cancelTarget._id || cancelTarget.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancellationReason: cancelReason.trim() }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Hủy thất bại'); }
      showToastMsg('Đã hủy đơn thành công');
      setShowCancelConfirm(false); setCancelTarget(null); setCancelReason('');
      doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
      if (showRecurringGroupModal) loadRecurringGroup();
    } catch (e) { setCancelConfirmError(e.message); }
    finally { setCancelLoading(false); }
  }

  async function handleShowQR(b) {
    setQrLoading(true); setShowQR(true); setQrData('');
    try {
      const bId = b._id || b.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tạo mã QR');
      const payload = await res.json();
      setQrData(payload?.data?.qrDataUrl || payload?.qr || '');
    } catch (e) { showToastMsg(e.message, 'error'); setShowQR(false); }
    finally { setQrLoading(false); }
  }

  async function handleRebook(b) {
    setRebookTarget(b);
    setRebookDate('');
    setRebookTime(b.startTime || '');
    setRebookFormError('');
    setRebookSlots([]);
    setRebookDepositMethod('bank');
    setRebookPaymentMode('deposit');
    setRebookDraft(null);
    setRebookDepositPayment(null);
    setRebookQrStep('form');
    setRebookQrLoading(false);
    setRebookVnpayLoading(false);
    setRebookVoucherCode('');
    setRebookVoucherDiscount(0);
    setRebookApplyingVoucher(false);
    setRebookShowVoucherPicker(false);
    setRebookAvailableVouchers(null);
    if (rebookPollRef.current) clearInterval(rebookPollRef.current);
    // Fetch package sub-services from the original booking's package
    const pkgId = b.packageId?._id || b.packageId?.id || b.packageId;
    if (pkgId) {
      try {
        const pkgRes = await fetch(`${apiBase || API_BASE}/packages/${pkgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          const pkg = pkgData?.data || pkgData;
          const allSubs = pkg?.subServices || [];
          setRebookAvailableSubServices(allSubs);
          // Pre-select: all mandatory (isOptional: false) + previously selected
          const prevSelected = (b.selectedSubServices || []).map(s => s.name || s);
          const initialSelection = allSubs
            .filter(s => !s.isOptional || prevSelected.includes(s.name))
            .map(s => ({ name: s.name, price: s.price, duration: s.duration }));
          setRebookSubServices(initialSelection);
        }
      } catch (_) {}
    } else {
      setRebookAvailableSubServices([]);
      setRebookSubServices([]);
    }
    setShowRebookModal(true);
  }

  async function submitRebook() {
    if (!rebookTarget) return;
    setRebookFormError('');
    setRebookQrStep('form');
    setRebookDraft(null);
    setRebookDepositPayment(null);
    if (rebookPollRef.current) clearInterval(rebookPollRef.current);
    if (!rebookDate) { setRebookFormError('Vui lòng chọn ngày'); return; }
    if (!rebookTime) { setRebookFormError('Vui lòng chọn giờ'); return; }
    const selected = new Date(rebookDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) { setRebookFormError('Ngày phải từ hôm nay trở đi'); return; }

    // Validate slot availability
    if (rebookSlots.length > 0) {
      const slotTimes = rebookSlots.map(s => s.startTime || s.time || s);
      if (!slotTimes.includes(rebookTime)) {
        setRebookFormError('Khung giờ này không có sẵn. Vui lòng chọn giờ từ danh sách.');
        return;
      }
    }

    setRebookLoading(true);
    try {
      const basePrice = rebookTarget.packageId?.price || rebookTarget.finalPrice || 0;
      const subServiceTotal = rebookSubServices.filter(s => s.price > 0).reduce((sum, s) => sum + s.price, 0);
      const totalPrice = Math.max(0, basePrice + subServiceTotal - rebookVoucherDiscount);
      const deposit30 = totalPrice > 0 ? Math.round(totalPrice * 0.3 / 1000) * 1000 : 0;
      const amount = rebookPaymentMode === 'full' ? totalPrice : deposit30;

      // Lưu draft để sau payment mới tạo booking
      setRebookDraft({
        bookingId: rebookTarget._id || rebookTarget.id,
        bookingDate: rebookDate,
        startTime: rebookTime,
        amount,
        paymentMode: rebookPaymentMode,
        selectedSubServices: rebookSubServices,
        voucherCode: rebookVoucherCode.trim() || undefined,
      });

      if (amount <= 0) {
        // Miễn phí → tạo rebook ngay
        const bId = rebookTarget._id || rebookTarget.id;
        const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/rebook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingDate: rebookDate, startTime: rebookTime, selectedSubServices: rebookSubServices, voucherCode: rebookVoucherCode.trim() || undefined }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Đặt lại thất bại'); }
        showToastMsg('Đặt lại thành công!');
        setShowRebookModal(false); setRebookTarget(null);
        doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
        if (showRecurringGroupModal) loadRecurringGroup();
        return;
      }

      if (rebookDepositMethod === 'vnpay') {
        // VNPay provisional (chưa tạo booking — poll chờ thanh toán rồi mới rebook)
        setRebookVnpayLoading(true);
        try {
          const vnpRes = await fetch(`${apiBase || API_BASE}/bookings/vnpay-provisional`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              amount,
              bankCode: '',
              bookingId: rebookTarget._id || rebookTarget.id,
              bookingDate: rebookDate,
              startTime: rebookTime,
              packageId: rebookTarget.packageId?._id || rebookTarget.packageId?.id || rebookTarget.packageId,
              branchId: rebookTarget.branchId?._id || rebookTarget.branchId?.id || rebookTarget.branchId,
              vehicleId: rebookTarget.vehicleId?._id || rebookTarget.vehicleId?.id || rebookTarget.vehicleId,
              selectedSubServices: rebookSubServices,
              voucherCode: rebookVoucherCode.trim() || undefined,
            }),
          });
          const vnpData = await vnpRes.json();
          if (!vnpRes.ok) throw new Error(vnpData.message || 'Tạo thanh toán VNPay thất bại');
          const vnpUrl = vnpData?.data?.paymentUrl || vnpData?.paymentUrl || vnpData?.url;
          if (vnpUrl) {
            window.open(vnpUrl, '_blank');
            showToastMsg('Vui lòng thanh toán VNPay trong cửa sổ mới. Sau khi thanh toán xong, đặt lại sẽ được hoàn tất.');
            // Lưu payment object và chuyển sang màn chờ để poll
            const paymentData = vnpData?.data?.payment || vnpData?.data;
            setRebookDepositPayment(paymentData);
            setRebookQrStep('qr');
          } else {
            setRebookFormError('Không nhận được đường dẫn thanh toán VNPay');
          }
        } catch (e) {
          setRebookFormError(e.message);
        } finally {
          setRebookVnpayLoading(false);
        }
      } else {
        // Bank provisional (chưa tạo booking — giống BookingWidget)
        setRebookQrLoading(true);
        try {
          const payRes = await fetch(`${apiBase || API_BASE}/payments/bank-provisional`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount, paymentType: rebookPaymentMode }),
          });
          const payData = await payRes.json();
          if (!payRes.ok) throw new Error(payData.message || 'Tạo thanh toán thất bại');
          const payment = payData?.data || payData;
          setRebookDepositPayment(payment);
          setRebookQrStep('qr');
        } catch (e) {
          setRebookFormError(e.message);
        } finally {
          setRebookQrLoading(false);
        }
      }
    } catch (e) { setRebookFormError(e.message); }
    finally { setRebookLoading(false); }
  }

  // Poll rebook provisional payment → khi paid thì tạo rebook
  useEffect(() => {
    if (rebookQrStep !== 'qr' || !rebookDepositPayment) return;
    rebookPollRef.current = setInterval(async () => {
      try {
        const pid = rebookDepositPayment._id || rebookDepositPayment.id;
        if (!pid) return;
        const res = await fetch(`${apiBase || API_BASE}/payments/booking/${pid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.data || data;
        if (p?.status === 'paid') {
          clearInterval(rebookPollRef.current);
          await executeRebookAfterPayment();
        }
      } catch (pollErr) {
        console.error('Poll payment error:', pollErr);
        if (!rebookFormError) setRebookFormError('Lỗi kiểm tra thanh toán. Vui lòng thử lại.');
      }
    }, 10000);
    return () => { if (rebookPollRef.current) clearInterval(rebookPollRef.current); };
  }, [rebookQrStep, rebookDepositPayment, rebookDraft, apiBase, token]);

  // Tạo rebook sau khi thanh toán thành công
  async function executeRebookAfterPayment() {
    if (!rebookDraft) return;
    const d = rebookDraft;
    setRebookQrLoading(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/${d.bookingId}/rebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingDate: d.bookingDate, startTime: d.startTime, selectedSubServices: d.selectedSubServices, voucherCode: d.voucherCode }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Đặt lại thất bại'); }
      showToastMsg('Đặt lại thành công!');
      setShowRebookModal(false); setRebookTarget(null);
      doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
      if (showRecurringGroupModal) loadRecurringGroup();
    } catch (e) {
      setRebookFormError(e.message);
    } finally {
      setRebookQrLoading(false);
    }
  }

  // Simulate rebook payment → simulate + execute rebook
  async function simulateRebookPayment() {
    if (!rebookDepositPayment || !rebookDraft) return;
    setRebookQrLoading(true);
    try {
      await fetch(`${apiBase || API_BASE}/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          transactionId: rebookDepositPayment.transactionId,
          gatewayTransactionId: `SIM${Date.now()}`,
        }),
      });
      await executeRebookAfterPayment();
    } catch (e) {
      setRebookFormError(e.message);
    } finally {
      setRebookQrLoading(false);
    }
  }

  /* ── Quick book: mở modal từ slot pack hoặc từ booking ── */
  function openQuickBookFromPack(pack) {
    setQuickBookPack(pack);
    setQuickBookPrefill(null);
    setQbBranchId('');
    setQbVehicleId('');
    setQbDate('');
    setQbSlots([]);
    setQbTime('');
    setQbError('');
    setQbVoucherCode('');
    setQbVoucherDiscount(0);
    setQbDraft(null);
    setQbDepositPayment(null);
    setQbQrStep('form');
    if (qbPollRef.current) clearInterval(qbPollRef.current);
    setShowQuickBookModal(true);
  }

  function openQuickBookFromBooking(b) {
    handleRebook(b);
  }

  // Fetch slots khi chọn ngày trong quick book
  useEffect(() => {
    if (!qbDate) { setQbSlots([]); setQbTime(''); return; }
    // Ưu tiên branch từ pack → prefill → qbBranchId (khi pack không khóa chi nhánh)
    const branchId = quickBookPack?.branchId?._id || quickBookPack?.branchId?.id
      || qbBranchId
      || quickBookPrefill?.branchId?._id || quickBookPrefill?.branchId?.id;
    const pkgId = quickBookPack?.packageId?._id || quickBookPack?.packageId?.id || quickBookPrefill?.packageId?._id || quickBookPrefill?.packageId?.id;
    if (!branchId || !pkgId) return;
    setQbSlotsLoading(true);
    setQbTime('');
    fetch(`${apiBase || API_BASE}/bookings/slots?branchId=${branchId}&date=${qbDate}&packageId=${pkgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(payload => {
        const data = payload?.data || payload;
        setQbSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => setQbSlots([]))
      .finally(() => setQbSlotsLoading(false));
  }, [qbDate, quickBookPack, quickBookPrefill, apiBase, token]);

  // Fetch slots khi chọn ngày trong rebook
  useEffect(() => {
    if (!rebookDate || !rebookTarget) { setRebookSlots([]); return; }
    const branchId = rebookTarget.branchId?._id || rebookTarget.branchId?.id || rebookTarget.branchId;
    const pkgId = rebookTarget.packageId?._id || rebookTarget.packageId?.id || rebookTarget.packageId;
    if (!branchId) { setRebookSlots([]); return; }
    setRebookSlotsLoading(true);
    let url = `${apiBase || API_BASE}/bookings/slots?branchId=${branchId}&date=${rebookDate}`;
    if (pkgId) url += `&packageId=${pkgId}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(payload => {
        const data = payload?.data || payload;
        setRebookSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => setRebookSlots([]))
      .finally(() => setRebookSlotsLoading(false));
  }, [rebookDate, rebookTarget, apiBase, token]);

  function getQbBasePrice() {
    const pkg = quickBookPack?.packageId || quickBookPrefill?.packageId;
    return pkg?.price || pkg?.totalPrice || 0;
  }

  function getQbDeposit() {
    const base = getQbBasePrice();
    const discounted = Math.max(0, base - qbVoucherDiscount);
    if (quickBookPack) return 0; // slot pack → đã thanh toán 100%
    return Math.round(discounted * 0.3 / 1000) * 1000;
  }

  async function applyQbVoucher() {
    if (!qbVoucherCode.trim()) { setQbError('Nhập mã voucher'); return; }
    const branchId = quickBookPack?.branchId?._id || quickBookPack?.branchId?.id
      || qbBranchId
      || quickBookPrefill?.branchId?._id || quickBookPrefill?.branchId?.id;
    const base = getQbBasePrice();
    setQbApplyingVoucher(true);
    setQbError('');
    try {
      const res = await fetch(`${apiBase || API_BASE}/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: qbVoucherCode.trim(), branchId, amount: base, packageId: quickBookPack?.packageId?._id || quickBookPack?.packageId?.id || quickBookPrefill?.packageId?._id || quickBookPrefill?.packageId?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Mã không hợp lệ');
      const discount = data?.data?.savings || data?.data?.discountAmount || 0;
      setQbVoucherDiscount(discount);
      showToastMsg(`Áp dụng voucher giảm ${discount.toLocaleString('vi-VN')}đ`);
    } catch (e) {
      setQbVoucherDiscount(0);
      setQbError(e.message);
    } finally {
      setQbApplyingVoucher(false);
    }
  }

  // Fetch available vouchers khi modal mở cho rebook
  useEffect(() => {
    if (!showQuickBookModal || quickBookPack) return;
    const branchId = quickBookPrefill?.branchId?._id || quickBookPrefill?.branchId?.id;
    if (!branchId) return;
    setQbVouchersLoading(true);
    fetch(`${apiBase || API_BASE}/vouchers/available?branchId=${branchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(payload => {
        const data = payload?.data || payload;
        setQbAvailableVouchers(Array.isArray(data) ? data : []);
      })
      .catch(() => setQbAvailableVouchers([]))
      .finally(() => setQbVouchersLoading(false));
  }, [showQuickBookModal, quickBookPack, quickBookPrefill, apiBase, token]);

  async function confirmQuickBook() {
    if (quickBookPack && quickBookPack.remainingSlots <= 0) {
      setQbError('Gói lượt này đã hết lượt sử dụng');
      return;
    }
    if (!qbDate) { setQbError('Vui lòng chọn ngày'); return; }
    if (!qbTime) { setQbError('Vui lòng chọn khung giờ'); return; }
    const branchId = quickBookPack?.branchId?._id || quickBookPack?.branchId?.id
      || qbBranchId
      || quickBookPrefill?.branchId?._id || quickBookPrefill?.branchId?.id;
    const pkgId = quickBookPack?.packageId?._id || quickBookPack?.packageId?.id || quickBookPrefill?.packageId?._id || quickBookPrefill?.packageId?.id;
    if (!branchId) { setQbError('Vui lòng chọn chi nhánh'); return; }
    const packBranchId = quickBookPack?.branchId?._id || quickBookPack?.branchId?.id;
    if (packBranchId && packBranchId !== branchId) {
      setQbError('Chi nhánh không khớp với gói lượt. Vui lòng chọn đúng chi nhánh của gói.');
      return;
    }
    const vehicleId = qbVehicleId || quickBookPrefill?.vehicleId?._id || quickBookPrefill?.vehicleId?.id;
    if (!vehicleId) { setQbError('Vui lòng chọn xe'); return; }

    if (quickBookPack) {
      // Gói slot → đã thanh toán 100% → tạo booking ngay
      setQbSubmitting(true);
      setQbError('');
      try {
        const res = await fetch(`${apiBase || API_BASE}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            branchId, packageId: pkgId, vehicleId,
            bookingDate: qbDate, startTime: qbTime,
            slotPackId: quickBookPack._id || quickBookPack.id,
            selectedSubServices: [], note: '',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Đặt lịch thất bại');
        showToastMsg('Đã đặt lịch từ gói lượt!');
        setShowQuickBookModal(false);
        fetchSlotPacks();
        doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
      } catch (e) {
        setQbError(e.message);
      } finally {
        setQbSubmitting(false);
      }
      return;
    }

    // Không dùng gói → lưu draft, tạo provisional payment trước
    const deposit = getQbDeposit();
    if (deposit <= 0) {
      // Miễn phí → tạo booking ngay
      setQbSubmitting(true);
      setQbError('');
      try {
        const res = await fetch(`${apiBase || API_BASE}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            branchId, packageId: pkgId, vehicleId,
            bookingDate: qbDate, startTime: qbTime,
            voucherCode: qbVoucherCode.trim() || undefined,
            selectedSubServices: [], note: '',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Đặt lịch thất bại');
        showToastMsg('Đặt lịch thành công!');
        setShowQuickBookModal(false);
        doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
      } catch (e) {
        setQbError(e.message);
      } finally {
        setQbSubmitting(false);
      }
      return;
    }

    // Có cọc → lưu draft, chuyển sang bước thanh toán
    setQbDraft({ branchId, packageId: pkgId, vehicleId, deposit });
    setQbError('');
    const api = apiBase || API_BASE;
    setQbQrLoading(true);
    try {
      const payRes = await fetch(`${api}/payments/bank-provisional`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: deposit, paymentType: 'deposit' }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.message || 'Tạo thanh toán thất bại');
      setQbDepositPayment(payData?.data || payData);
      setQbQrStep('qr');
      setQbQrPollCount(0);
    } catch (e) {
      setQbError(e.message);
    } finally {
      setQbQrLoading(false);
    }
  }

  // Poll payment status every 10s
  useEffect(() => {
    if (qbQrStep !== 'qr' || !qbDepositPayment) return;
    qbPollRef.current = setInterval(async () => {
      try {
        const payment = qbDepositPayment;
        const pid = payment._id || payment.id;
        const res = await fetch(`${apiBase || API_BASE}/payments/booking/${pid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.data || data;
        if (p?.status === 'paid') {
          clearInterval(qbPollRef.current);
          await createBookingAfterQbPayment();
        }
        setQbQrPollCount(c => c + 1);
      } catch {}
    }, 10000);
    return () => { if (qbPollRef.current) clearInterval(qbPollRef.current); };
  }, [qbQrStep, qbDepositPayment, apiBase, token]);

  async function createBookingAfterQbPayment() {
    if (!qbDraft) return;
    const d = qbDraft;
    setQbSubmitting(true);
    setQbError('');
    try {
      const branchId = d.branchId;
      const packageId = d.packageId;
      const res = await fetch(`${apiBase || API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          branchId, packageId, vehicleId: d.vehicleId,
          bookingDate: qbDate, startTime: qbTime,
          voucherCode: qbVoucherCode.trim() || undefined,
          selectedSubServices: [], note: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Tạo booking thất bại');
      const bk = data?.data || data;
      // Tạo payment record cho booking
      const payRes = await fetch(`${apiBase || API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: bk._id || bk.id, method: 'bank', paymentType: 'deposit', amount: d.deposit }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.message || 'Tạo payment thất bại');
      // Simulate confirm
      await fetch(`${apiBase || API_BASE}/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          transactionId: payData?.data?.transactionId,
          gatewayTransactionId: `SIM${Date.now()}`,
        }),
      });
      // Store booking result and show success step
      const bkName = quickBookPack?.packageId?.name || quickBookPrefill?.packageName || quickBookPrefill?.packageId?.name || '';
      const bkBranchName = quickBookPack?.branchId?.name || quickBookPrefill?.branchName || quickBookPrefill?.branchId?.name || '';
      const vehicleLabel = userVehicles.find(v => (v._id || v.id) === d.vehicleId);
      const basePriceVal = getQbBasePrice();
      const depositVal = getQbDeposit();
      setQbBookingResult({
        bookingCode: bk.bookingCode || bk.code || `#${String(bk._id || bk.id).slice(-6)}`,
        branch: { name: bkBranchName },
        vehicle: vehicleLabel ? { licensePlate: vehicleLabel.licensePlate || vehicleLabel.name } : null,
        pkg: { name: bkName },
        date: qbDate,
        time: qbTime,
        total: basePriceVal,
        discount: qbVoucherDiscount,
        depositAmount: depositVal,
        depositPaid: true,
        paymentMode: 'deposit',
      });
      setQbQrStep('success');
      doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
    } catch (e) {
      setQbError(e.message);
    } finally {
      setQbSubmitting(false);
    }
  }

  // Simulate/Nút "Đã chuyển khoản" cho demo
  async function simulateQbPayment() {
    if (!qbDepositPayment) return;
    setQbQrLoading(true);
    setQbError('');
    try {
      // Gọi simulate trước → cập nhật trạng thái payment thành paid
      const simRes = await fetch(`${apiBase || API_BASE}/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          transactionId: qbDepositPayment.transactionId,
          gatewayTransactionId: `SIM${Date.now()}`,
        }),
      });
      if (!simRes.ok) throw new Error('Xác nhận thanh toán thất bại');
      await createBookingAfterQbPayment();
    } catch (e) {
      setQbError(e.message);
    } finally {
      setQbQrLoading(false);
    }
  }

  // Auto-select first vehicle cho quick book
  useEffect(() => {
    if (!showQuickBookModal) return;
    if (quickBookPrefill?.vehicleId?._id || quickBookPrefill?.vehicleId?.id) return;
    if (!qbVehicleId && userVehicles.length > 0) {
      setQbVehicleId(userVehicles[0]._id || userVehicles[0].id);
    }
  }, [showQuickBookModal, quickBookPrefill, userVehicles, qbVehicleId]);

  async function handleCancelPack(pack) {
    const packId = pack?._id || pack?.id;
    if (!packId) return;
    if (!confirm('Bạn có chắc muốn hủy gói lượt này?')) return;
    setCancelPackLoading(packId);
    try {
      const res = await fetch(`${apiBase || API_BASE}/slot-packs/${packId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Hủy thất bại'); }
      showToastMsg('Đã hủy gói lượt');
      fetchSlotPacks();
    } catch (e) {
      showToastMsg(e.message, 'error');
    } finally {
      setCancelPackLoading(null);
    }
  }

  const handleOpenAddService = async (b) => {
    setShowAddService(b);
    setAvailableSubServices([]);
    setSelectedNewSubs([]);
    try {
      const res = await fetch(`${API_BASE}/packages`);
      if (res.ok) {
        const data = await res.json();
        const allPackages = data.data || [];
        const allSubs = [];
        const alreadySelected = b.selectedSubServices?.map(s => s.name) || [];
        allPackages.forEach(p => {
          if (p.subServices) {
            p.subServices.forEach(s => {
              if (!alreadySelected.includes(s.name) && !allSubs.some(x => x.name === s.name)) {
                allSubs.push(s);
              }
            });
          }
        });
        setAvailableSubServices(allSubs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitAddServices = async () => {
    if (selectedNewSubs.length === 0 || !showAddService) return;
    setAddingService(true);
    try {
      const bId = showAddService._id || showAddService.id;
      const updatedSubs = [...(showAddService.selectedSubServices || []), ...selectedNewSubs].map(s => s.name || s);
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/sub-services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subServices: updatedSubs })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lỗi thêm dịch vụ');
      }
      showToast('Đã thêm dịch vụ thành công!', 'success');
      setShowAddService(null);
      setSelectedNewSubs([]);
      doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
      if (detailBooking && (detailBooking._id === bId || detailBooking.id === bId)) {
         setDetailBooking(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddingService(false);
    }
  };


  async function handleCancelRecurring(b) {
    if (!b.recurringGroupId) return;
    setCancelRecurringTarget(b);
    setShowCancelRecurringConfirm(true);
  }

  async function confirmCancelRecurring() {
    if (!cancelRecurringTarget?.recurringGroupId) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/recurring/${cancelRecurringTarget.recurringGroupId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Hủy thất bại'); }
      showToastMsg('Đã hủy toàn bộ lịch định kỳ');
      setShowCancelRecurringConfirm(false); setCancelRecurringTarget(null);
      setShowRecurringGroupModal(false);
      doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, viewMode === 'list');
    } catch (e) { showToastMsg(e.message, 'error'); }
    finally { setCancelLoading(false); }
  }

  /* ── calendar helpers ── */
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const key = localDateKey(b.bookingDate);
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    return bookingsByDate[localDateKey(selectedDate)] || [];
  }, [selectedDate, bookingsByDate]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days = [];
    const prevDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ date: new Date(y, m, prevDays - i), cur: false });
    }
    for (let d = 1; d <= daysInMonth; d++) days.push({ date: new Date(viewYear, viewMonth, d), cur: true });
    const rem = 42 - days.length;
    for (let d = 1; d <= rem; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ date: new Date(y, m, d), cur: false });
    }
    return days;
  }, [viewYear, viewMonth]);

  function prevM() { setViewMonth(m => m === 0 ? 11 : m - 1); setViewYear(y => viewMonth === 0 ? y - 1 : y); setSelectedDate(null); }
  function nextM() { setViewMonth(m => m === 11 ? 0 : m + 1); setViewYear(y => viewMonth === 11 ? y + 1 : y); setSelectedDate(null); }
  function goToday() { const d = new Date(); d.setHours(0, 0, 0, 0); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); setSelectedDate(new Date(d)); }

  const stats = useMemo(() => {
    const s = { total: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookings.forEach(b => { if (s[b.status] !== undefined) s[b.status]++; });
    return s;
  }, [bookings]);

  const hasActiveFilters = keyword || statusFilter || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <header className="awp-hist-header sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Quay lại
          </button>
          <h1 className="text-sm font-bold text-slate-800">Lịch sử đặt</h1>
          <div className="w-20" />
        </div>
      </header>

      {toast.show && (
        <div className="awp-toast-container">
          <div className={`awp-toast-message ${toast.type === 'error' ? 'awp-toast-error' : 'awp-toast-success'}`}>{toast.message}</div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-5">
        {/* stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Chờ xử lý', value: stats.pending, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Đã xác nhận', value: stats.confirmed, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Hoàn thành', value: stats.completed, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Đã hủy', value: stats.cancelled, color: '#6b7280', bg: '#f9fafb' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
              <div className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</div>
              <div className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* view toggle */}
        <div className="flex gap-2 p-1 rounded-2xl flex-wrap sm:flex-nowrap" style={{ background: '#f1f5f9' }}>
          <button onClick={() => setViewMode('calendar')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{
              background: viewMode === 'calendar' ? '#fff' : 'transparent',
              color: viewMode === 'calendar' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'calendar' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            📅 Lịch tháng
          </button>
          <button onClick={() => setViewMode('week')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{
              background: viewMode === 'week' ? '#fff' : 'transparent',
              color: viewMode === 'week' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'week' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            📆 Lịch tuần
          </button>
          <button onClick={() => setViewMode('list')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{
              background: viewMode === 'list' ? '#fff' : 'transparent',
              color: viewMode === 'list' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            📋 Lịch sử
          </button>
          <button onClick={() => setViewMode('slot_packs')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{
              background: viewMode === 'slot_packs' ? '#fff' : 'transparent',
              color: viewMode === 'slot_packs' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'slot_packs' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            🎫 Gói lượt
          </button>
        </div>

        {/* ── CALENDAR VIEW ── */}
        {viewMode === 'calendar' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* cal header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg,#e0f2fe,#ecfdf5)' }}>
              <button onClick={prevM} className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: '#fff', color: '#0ea5e9', border: '1px solid #bae6fd', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>‹</button>
              <div className="text-center">
                <div className="text-lg font-extrabold tracking-tight" style={{ color: '#0f172a' }}>{MONTHS_VN[viewMonth]} {viewYear}</div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <button onClick={goToday} className="px-3 py-0.5 rounded-full text-[11px] font-semibold border-none cursor-pointer" style={{ background: '#dcfce7', color: '#16a34a' }}>Hôm nay</button>
                  <button onClick={() => { setPickerYear(viewYear); setShowMonthPicker(true); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center border-none cursor-pointer transition-colors"
                    style={{ background: '#f0f9ff', color: '#0284c7' }}
                    title="Chọn tháng">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </button>
                </div>
              </div>
              <button onClick={nextM} className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: '#fff', color: '#0ea5e9', border: '1px solid #bae6fd', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>›</button>
            </div>

            {/* dow */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS_VN.map((d, i) => (
                <div key={d} className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: i === 0 ? '#ef4444' : '#64748b' }}>{d}</div>
              ))}
            </div>

            {/* grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const key = localDateKey(day.date);
                const dayBks = bookingsByDate[key] || [];
                const isToday = isSameDay(day.date, new Date());
                const isSelected = selectedDate && isSameDay(day.date, selectedDate);
                return (
                  <div key={idx} onClick={() => setSelectedDate(day.date)}
                    className="min-h-[68px] p-1.5 cursor-pointer relative transition-colors"
                    style={{
                      borderRight: (idx % 7) < 6 ? '1px solid #f1f5f9' : 'none',
                      borderBottom: idx < 35 ? '1px solid #f1f5f9' : 'none',
                      background: isSelected ? '#eff6ff' : isToday ? '#fefce8' : day.cur ? '#fff' : '#f8fafc',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = day.cur ? '#fff' : '#f8fafc'; }}>
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg text-[13px] font-semibold"
                      style={{
                        background: isToday ? '#0ea5e9' : isSelected ? '#e0f2fe' : 'transparent',
                        color: isToday ? '#fff' : isSelected ? '#0284c7' : day.cur ? '#334155' : '#cbd5e1',
                      }}>
                      {day.date.getDate()}
                    </div>
                    {dayBks.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayBks.slice(0, 3).map((b, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{
                            background: b.status === 'completed' ? '#10b981' : b.status === 'cancelled' ? '#94a3b8' : b.status === 'pending' ? '#f59e0b' : '#3b82f6',
                          }} />
                        ))}
                        {dayBks.length > 3 && <span className="text-[8px] text-slate-400 font-bold">+{dayBks.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* selected date detail */}
            {selectedDate && (
              <div className="border-t-2 border-slate-200 bg-slate-50" style={{ maxHeight: 360, overflow: 'auto' }}>
                <div className="sticky top-0 z-10 px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#f0fdf4' }}>
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {selectedDateBookings.length > 0 ? `${selectedDateBookings.length} lịch đặt` : 'Không có lịch'}
                    </div>
                  </div>
                  <button onClick={() => setSelectedDate(null)} className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 text-sm">✕</button>
                </div>

                {selectedDateBookings.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    <div className="text-3xl mb-2">📭</div>Không có lịch đặt
                  </div>
                ) : (
                  <div className="p-4 space-y-2.5">
                    {selectedDateBookings.map(b => {
                      const bId = b._id || b.id;
                      const st = STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                      const canReview = b.status === 'completed';
                      const hasReview = b.rating || b.feedback;
                      return (
                        <div key={bId} onClick={() => setDetailBooking(b)} className="bg-white rounded-xl p-4 border border-slate-200 cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-800">{b.packageId?.name || b.packageName || 'Dịch vụ'}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{b.branchId?.name || b.branchName || '—'} · {b.startTime || ''}</div>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              {b.vehicleId && <span>🚗 {b.vehicleId.licensePlate || ''}</span>}
                              {b.recurringGroupId && <span className="text-indigo-500">Định kỳ</span>}
                              {b.selectedSubServices && b.selectedSubServices.length > 0 && b.selectedSubServices.map((sub, idx) => (
                                <span key={idx} className="text-indigo-500">+{sub.name}</span>
                              ))}
                              {hasReview && <span className="text-amber-500">{'★'.repeat(b.rating || 0)}{'☆'.repeat(5 - (b.rating || 0))}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-600">{formatCurrency(b.finalPrice)}</span>
                              {b.paymentStatus === 'paid' ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">
                                  Đã thanh toán 100%
                                </span>
                              ) : b.depositAmount > 0 ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${b.depositPaid || b.paymentStatus === 'deposit_paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                  {b.depositPaid || b.paymentStatus === 'deposit_paid' ? `Đã cọc ${formatCurrency(b.depositAmount)}` : `Cọc ${formatCurrency(b.depositAmount)}`}
                                </span>
                              ) : null}
                              {canReview && (
                                <button onClick={(e) => { e.stopPropagation(); openReview(b); }}
                                  className="text-amber-500 hover:text-amber-600 text-[11px] font-semibold border-none bg-transparent cursor-pointer">
                                  {hasReview ? '✏️' : '⭐'}
                                </button>
                              )}
                            </div>
                          </div>
                          {(b.status === 'pending' || b.status === 'confirmed') && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                              <button onClick={(e) => { e.stopPropagation(); handleShowQR(b); }}
                                className="text-[11px] font-semibold text-sky-600 hover:text-sky-500 border-none bg-transparent cursor-pointer">
                                📱 QR
                              </button>
                              {b.recurringGroupId && (
                                <button onClick={(e) => { e.stopPropagation(); handleCancelRecurring(b); }}
                                  disabled={cancelLoading}
                                  className="text-[11px] font-semibold text-red-500 hover:text-red-400 border-none bg-transparent cursor-pointer disabled:opacity-50">
                                  Hủy định kỳ
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleCancel(b); }}
                                disabled={cancelLoading}
                                className="text-[11px] font-semibold text-red-500 hover:text-red-400 border-none bg-transparent cursor-pointer disabled:opacity-50">
                                Hủy đơn
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleOpenAddService(b); }}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 border-none bg-transparent cursor-pointer">
                                Thêm dịch vụ
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openQuickBookFromBooking(b); }}
                                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 border-none bg-transparent cursor-pointer">
                                Đặt lịch nhanh
                              </button>
                            </div>
                          )}
                          {(b.status === 'completed' || b.status === 'cancelled') && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                              <button onClick={(e) => { e.stopPropagation(); handleRebook(b); }}
                                disabled={rebookLoading}
                                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 border-none bg-transparent cursor-pointer disabled:opacity-50">
                                🔄 Đặt lại
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {viewMode === 'week' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Week nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                  ‹
                </button>
                <div className="text-sm font-bold text-slate-800 min-w-48 text-center">
                  {(() => {
                    const start = new Date(weekStart);
                    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
                    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                  })()}
                </div>
                <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                  ›
                </button>
              </div>
              <button onClick={() => {
                const d = new Date(); const day = d.getDay();
                d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
                d.setHours(0,0,0,0); setWeekStart(d);
              }}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                Tuần này
              </button>
            </div>

            {/* Week days */}
            <div className="grid grid-cols-7 divide-x divide-slate-200">
              {[0,1,2,3,4,5,6].map(offset => {
                const day = new Date(weekStart);
                day.setDate(day.getDate() + offset);
                const ds = localDateKey(day);
                const isToday = isSameDay(day, new Date());
                const dayBks = (bookingsByDate[ds] || []).sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''));
                const dow = ['T2','T3','T4','T5','T6','T7','CN'][offset];
                return (
                  <div key={ds} className={`min-h-[200px] ${isToday ? 'bg-blue-50/30' : ''}`}>
                    <div className={`px-2 py-2.5 text-center border-b border-slate-100 ${isToday ? 'bg-blue-50' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>{dow}</p>
                      <p className={`text-xl font-bold leading-tight ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day.getDate()}</p>
                      <p className="text-[10px] text-slate-400">{day.toLocaleDateString('vi-VN', { month: 'numeric' })}</p>
                      {dayBks.length > 0 && (
                        <span className="inline-block mt-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">{dayBks.length}</span>
                      )}
                    </div>
                    <div className="p-1.5 space-y-1">
                      {dayBks.length === 0 ? (
                        <div className="flex items-center justify-center py-6">
                          <span className="text-[10px] text-slate-300">—</span>
                        </div>
                      ) : dayBks.map(b => {
                        const st = STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                        const colorMap = {
                          pending: 'bg-amber-400 text-white border-amber-500',
                          confirmed: 'bg-indigo-500 text-white border-indigo-600',
                          checked_in: 'bg-cyan-500 text-white border-cyan-600',
                          in_progress: 'bg-blue-500 text-white border-blue-600',
                          completed: 'bg-emerald-500 text-white border-emerald-600',
                          cancelled: 'bg-slate-300 text-slate-600 border-slate-400',
                        };
                        const colorCls = colorMap[b.status] || colorMap.pending;
                        return (
                          <div key={b._id || b.id} onClick={() => setDetailBooking(b)}
                            className={`relative rounded-lg border px-2 py-1.5 cursor-pointer transition-opacity hover:opacity-80 ${colorCls}`}>
                            <p className="text-[10px] font-bold leading-tight opacity-75">{b.startTime}{b.endTime ? `-${b.endTime}` : ''}</p>
                            <p className="text-[11px] font-semibold leading-tight truncate">{b.packageId?.name || b.packageName || '—'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <>
            {/* filters */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="relative md:col-span-2">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  <input type="text" value={keyword} onChange={e => onFilterChange(setKeyword, e.target.value)}
                    placeholder="Tìm gói dịch vụ hoặc chi nhánh..."
                    className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <select value={statusFilter} onChange={e => onFilterChange(setStatusFilter, e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={typeFilter} onChange={e => onFilterChange(setTypeFilter, e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white">
                  <option value="">Tất cả loại lịch</option>
                  <option value="single">Lịch thường</option>
                  <option value="recurring">Lịch định kỳ</option>
                </select>
                <select value={sort} onChange={e => onFilterChange(setSort, e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white">
                  <option value="-createdAt">Mới nhất</option>
                  <option value="createdAt">Cũ nhất</option>
                  <option value="-bookingDate">Gần đây nhất (Ngày hẹn)</option>
                </select>
                <div className="flex gap-2">
                  <input type="date" value={dateFrom} onChange={e => onFilterChange(setDateFrom, e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                  <input type="date" value={dateTo} onChange={e => onFilterChange(setDateTo, e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="px-5 h-9 rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">Xóa bộ lọc</button>
              )}
            </div>

            {/* list */}
            {loading ? (
              <div className="text-center py-20 text-slate-400 text-sm">Đang tải lịch sử...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                </div>
                <p className="text-slate-500 font-medium">Chưa có lịch đặt nào</p>
                <button onClick={onBack} className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">Quay lại trang chủ</button>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const upcoming = [];
                  const past = [];
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  bookings.forEach(b => {
                    const bDate = new Date(b.bookingDate);
                    bDate.setHours(0,0,0,0);
                    if (bDate >= today) upcoming.push(b);
                    else past.push(b);
                  });
                  
                  upcoming.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
                  past.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
                  
                  const isNew = (createdAt) => createdAt && (new Date() - new Date(createdAt)) < 24 * 60 * 60 * 1000;

                  const renderBookingCard = (b) => {
                    const bId = b._id || b.id;
                    const st = STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                    const canReview = b.status === 'completed';
                    const hasReview = b.rating || b.feedback;
                    const isNewB = isNew(b.createdAt);
                    
                    if (b.isGroup) {
                      return (
                        <div key={bId} onClick={() => { setRecurringGroupTarget(b); setDetailBooking(b); }} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                          <div className="flex items-start justify-between gap-4 pl-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{b.packageId?.name || b.packageName || 'Dịch vụ'}</span>
                                <span className="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap bg-indigo-50 text-indigo-600 border-indigo-200">
                                  Định kỳ ({b.groupCount} buổi)
                                </span>
                                {isNewB && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">MỚI</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 font-medium">{b.branchId?.name || b.branchName || ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-black text-slate-900">{formatCurrency(b.groupTotalPrice)}</p>
                              {b.groupTotalDeposit > 0 && (
                                <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-amber-50 text-amber-600 border-amber-200">
                                  Cọc {formatCurrency(b.groupTotalDeposit)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pl-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                            {b.vehicleId && <span className="flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg><span className="font-semibold text-slate-800">{b.vehicleId.licensePlate || ''}</span></span>}
                            <span className="flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span className="font-semibold text-slate-800">Cập nhật lần cuối: {formatDate(b.createdAt)}</span></span>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={bId} onClick={() => setDetailBooking(b)} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer relative overflow-hidden group">
                        {/* Status color bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          b.status === 'completed' ? 'bg-emerald-500' :
                          b.status === 'pending' ? 'bg-amber-400' :
                          b.status === 'confirmed' ? 'bg-blue-500' :
                          b.status === 'cancelled' ? 'bg-slate-300' : 'bg-slate-200'
                        }`} />
                        
                        <div className="flex items-start justify-between gap-4 pl-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{b.packageId?.name || b.packageName || 'Dịch vụ'}</span>
                              <StatusBadge status={b.status} />
                              {isNewB && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">MỚI</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 font-medium">{b.branchId?.name || b.branchName || ''}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-slate-900">{formatCurrency(b.finalPrice)}</p>
                            {b.paymentStatus === 'paid' ? (
                              <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-200">
                                Đã thanh toán 100%
                              </span>
                            ) : b.depositAmount > 0 ? (
                              <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${b.depositPaid || b.paymentStatus === 'deposit_paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                {b.depositPaid || b.paymentStatus === 'deposit_paid' ? `Đã cọc ${formatCurrency(b.depositAmount)}` : `Cọc ${formatCurrency(b.depositAmount)}`}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 pl-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                          {b.vehicleId && <span className="flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg><span className="font-semibold text-slate-800">{b.vehicleId.licensePlate || ''}</span></span>}
                          {b.bookingDate && <span className="flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span className="font-semibold text-slate-800">{formatDate(b.bookingDate)}</span></span>}
                          {b.startTime && <span className="flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><span className="font-semibold text-slate-800">{b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}</span></span>}
                          {b.bookingCode && <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">#{b.bookingCode}</span>}
                          {b.recurringGroupId && <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.5" /></svg>Định kỳ</span>}
                          {b.selectedSubServices && b.selectedSubServices.length > 0 && b.selectedSubServices.map((sub, idx) => (
                            <span key={idx} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                              + {sub.name}
                            </span>
                          ))}
                          {hasReview && <span className="text-amber-500 font-medium">{'★'.repeat(b.rating || 0)}{'☆'.repeat(5 - (b.rating || 0))}</span>}
                        </div>
                        {(b.status === 'pending' || b.status === 'confirmed' || canReview || hasReview || b.status === 'cancelled') && (
                          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 pl-3">
                            {(b.status === 'pending' || b.status === 'confirmed') && (
                              <button onClick={(e) => { e.stopPropagation(); handleShowQR(b); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors">
                                📱 Xem QR
                              </button>
                            )}
                            {(b.status === 'pending' || b.status === 'confirmed') && b.recurringGroupId && (
                              <button onClick={(e) => { e.stopPropagation(); handleCancelRecurring(b); }}
                                disabled={cancelLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50">
                                Hủy định kỳ
                              </button>
                            )}
                            {(b.status === 'pending' || b.status === 'confirmed') && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleCancel(b); }}
                                  disabled={cancelLoading}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50">
                                  Hủy đơn
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenAddService(b); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors">
                                  Thêm dịch vụ
                                </button>
                              </>
                            )}
                            {(b.status === 'pending' || b.status === 'confirmed') && (
                              <button onClick={(e) => { e.stopPropagation(); openQuickBookFromBooking(b); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                                ⚡ Đặt lịch nhanh
                              </button>
                            )}
                            {(b.status === 'completed' || b.status === 'cancelled') && (
                              <button onClick={(e) => { e.stopPropagation(); handleRebook(b); }}
                                disabled={rebookLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50">
                                🔄 Đặt lại
                              </button>
                            )}
                            {canReview && !hasReview && (
                              <button onClick={(e) => { e.stopPropagation(); openReview(b); }}
                                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                                ⭐ Đánh giá
                              </button>
                            )}
                            {hasReview && (
                              <button onClick={(e) => { e.stopPropagation(); openReview(b); }}
                                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5">
                                ✏️ {b.feedback ? 'Xem đánh giá' : 'Sửa đánh giá'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      {upcoming.length > 0 && (
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>Sắp tới
                          </h3>
                          <div className="space-y-4">
                            {upcoming.map(renderBookingCard)}
                          </div>
                        </div>
                      )}
                      {past.length > 0 && (
                        <div className={upcoming.length > 0 ? "pt-4 border-t border-slate-200" : ""}>
                          <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>Đã qua
                          </h3>
                          <div className="space-y-4">
                            {past.map(renderBookingCard)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">‹ Trước</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
                ))}
                <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Sau ›</button>
              </div>
            )}
            {pagination && (
              <div className="text-center mt-4">
                <p className="text-xs text-slate-400">Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} trên {pagination.total} lịch hẹn</p>
              </div>
            )}
          </>
        )}

        {/* ── SLOT PACKS VIEW ── */}
        {viewMode === 'slot_packs' && (
          <div className="space-y-6">
            {slotPacksLoading ? (
              <div className="text-center py-20 text-slate-400 text-sm">Đang tải lịch sử gói lượt...</div>
            ) : slotPacks.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                </div>
                <p className="text-slate-500 font-medium">Bạn chưa mua gói lượt nào</p>
                <button onClick={() => window.location.href = '/dat-lich'} className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">Mua ngay</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slotPacks.map(p => (
                  <PackCard
                    key={p._id}
                    pack={p}
                    onQuickBook={setQuickBookPack}
                    onCancelPack={handleCancelPack}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── DETAIL MODAL (RECEIPT TEMPLATE) ── */}
      {detailBooking && (() => {
        const displayTotal = detailBooking.isGroup ? (detailBooking.groupTotalPrice || 0) : (detailBooking.totalAmount || detailBooking.finalPrice || 0);
        const displayDeposit = detailBooking.isGroup ? (detailBooking.groupTotalDeposit || 0) : (detailBooking.depositAmount || 0);
        const displayId = detailBooking.isGroup ? (detailBooking.recurringGroupId || detailBooking._id) : detailBooking._id;
        const displayInvoiceNumber = String(displayId).slice(-8).toUpperCase();
        
        return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setDetailBooking(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] font-sans text-slate-900 relative" onClick={e => e.stopPropagation()}>
            
            {/* Close Button Absolute */}
            <button onClick={() => setDetailBooking(null)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            {/* Receipt Body */}
            <div className="px-10 py-12 overflow-y-auto flex-1 selection:bg-slate-200">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-black tracking-tight">Receipt</h2>
                  <div className="grid grid-cols-[140px_1fr] gap-y-1 text-[13px]">
                    <div className="font-semibold text-black">Invoice number</div>
                    <div className="text-black">AWP-{displayInvoiceNumber}</div>
                    <div className="font-semibold text-black">Receipt number</div>
                    <div className="text-black">{displayId}</div>
                    <div className="font-semibold text-black">Date paid</div>
                    <div className="text-black">{formatDate(detailBooking.updatedAt || detailBooking.bookingDate)}</div>
                  </div>
                </div>
                <div>
                  {/* LOGO */}
                  <div className="text-4xl font-black tracking-tighter select-none">
                    AW<span className="text-slate-400">P</span>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-8 mb-12 text-[13px] leading-relaxed">
                <div>
                  <div className="font-semibold text-black mb-1">AutoWash Pro</div>
                  <div className="text-black">
                    {detailBooking.branchName || detailBooking.branchId?.name || 'Chi nhánh trung tâm'}<br/>
                    {detailBooking.branchId?.address || '123 Đường Rửa Xe'}<br/>
                    Hồ Chí Minh, Việt Nam<br/>
                    support@autowashpro.com
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-black mb-1">Bill to</div>
                  <div className="text-black">
                    {detailBooking.userId?.name || 'Khách hàng'} ({detailBooking.userId?.phone || ''})<br/>
                    Biển số: {detailBooking.vehiclePlate || detailBooking.vehicleId?.licensePlate || 'Chưa cập nhật'}<br/>
                    {detailBooking.userId?.email || ''}
                  </div>
                </div>
              </div>

              {/* Big Payment Status */}
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-black mb-3">
                  {formatCurrency(displayTotal)} {detailBooking.paymentStatus === 'paid' ? `paid on ${formatDate(detailBooking.updatedAt || detailBooking.bookingDate)}` : `due on ${formatDate(detailBooking.bookingDate)}`}
                </h3>
                <p className="text-[13px] text-black max-w-xl leading-relaxed">
                  While we prefer electronic payment methods,<br/>
                  any checks must be sent to the address below, NOT to our branch office.<br/>
                  --------------------------------<br/>
                  PAYMENT ADDRESS:<br/>
                  AutoWash Pro<br/>
                  Hồ Chí Minh, Vietnam
                </p>
                <p className="text-[13px] text-black mt-4">
                  VAT is calculated on the gross invoice amount using the formula: VAT = (sales price / (1 - 10%)) × 10%
                </p>
              </div>

              {/* Table */}
              <div className="mb-14">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-2 text-left font-normal text-black w-1/2">Description</th>
                      <th className="py-2 text-right font-normal text-black">Qty</th>
                      <th className="py-2 text-right font-normal text-black">Unit price</th>
                      <th className="py-2 text-right font-normal text-black">Tax</th>
                      <th className="py-2 text-right font-normal text-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-left align-top">
                        <div className="font-normal text-black">{detailBooking.packageName || detailBooking.packageId?.name || 'Dịch vụ rửa xe'}</div>
                        {!detailBooking.isGroup && <div className="text-black">{formatDate(detailBooking.bookingDate)} • {detailBooking.startTime || '—'}</div>}
                        {detailBooking.isGroup && (
                          <div className="mt-2 space-y-1">
                            {recurringGroupLoading ? (
                              <div className="text-slate-500 text-xs italic">Đang tải chi tiết buổi...</div>
                            ) : (
                              recurringGroupBookings.map((rb, idx) => (
                                <div key={idx} className="text-slate-600 text-xs flex gap-2 items-center">
                                  <span>Buổi {idx + 1}: {formatDate(rb.bookingDate)} • {rb.startTime}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100">{STATUS_MAP[rb.status]?.label || rb.status}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right text-black align-top">{detailBooking.isGroup ? detailBooking.groupCount : 1}</td>
                      <td className="py-3 text-right text-black align-top">
                        {detailBooking.bookingType === 'slot_pack_usage' ? (
                          <span className="line-through text-slate-400 mr-2">{formatCurrency(detailBooking.packageId?.price || 0)}</span>
                        ) : null}
                        {formatCurrency(detailBooking.bookingType === 'slot_pack_usage' ? 0 : (detailBooking.packageId?.price || detailBooking.finalPrice || detailBooking.totalAmount))}
                      </td>
                      <td className="py-3 text-right text-black align-top">10%</td>
                      <td className="py-3 text-right text-black align-top">{formatCurrency(detailBooking.bookingType === 'slot_pack_usage' ? 0 : (detailBooking.packageId?.price || detailBooking.finalPrice || detailBooking.totalAmount))}</td>
                    </tr>
                    
                    {/* Sub-services rows */}
                    {detailBooking.selectedSubServices && detailBooking.selectedSubServices.map((sub, i) => (
                      <tr key={`sub-${i}`} className="border-b border-slate-100">
                        <td className="py-2 text-left text-black pl-4">- {sub.name}</td>
                        <td className="py-2 text-right text-black">1</td>
                        <td className="py-2 text-right text-black">{formatCurrency(sub.price)}</td>
                        <td className="py-2 text-right text-black">10%</td>
                        <td className="py-2 text-right text-black">{formatCurrency(sub.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="flex justify-end mt-6">
                  <div className="w-[300px] text-[13px]">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-black">Subtotal</span>
                      <span className="text-black">{formatCurrency(displayTotal)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-black">Total excluding tax</span>
                      <span className="text-black">{formatCurrency(Math.round((displayTotal) * 0.9))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-black">VAT - Vietnam (10% on {formatCurrency(Math.round((displayTotal) * 0.9))})</span>
                      <span className="text-black">{formatCurrency(Math.round((displayTotal) * 0.1))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="font-normal text-black">Total</span>
                      <span className="font-normal text-black">{formatCurrency(displayTotal)}</span>
                    </div>
                    {detailBooking.paymentStatus === 'deposit_paid' && (
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="font-normal text-black">Deposit Paid</span>
                        <span className="font-normal text-black">-{formatCurrency(displayDeposit || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-black">
                      <span className="font-bold text-black">Amount {detailBooking.paymentStatus === 'paid' ? 'paid' : 'due'}</span>
                      <span className="font-bold text-black">
                        {detailBooking.paymentStatus === 'paid' 
                          ? formatCurrency(displayTotal)
                          : detailBooking.paymentStatus === 'deposit_paid'
                            ? formatCurrency(Math.max(0, (displayTotal || 0) - (displayDeposit || 0)))
                            : formatCurrency(displayTotal)
                        }
                      </span>
                    </div>
                    </div>
                  </div>
                </div>

              {/* Payment History */}
              <div>
                <h3 className="text-xl font-bold text-black mb-4">Payment history</h3>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-2 text-left font-normal text-black">Payment method</th>
                      <th className="py-2 text-left font-normal text-black">Date</th>
                      <th className="py-2 text-right font-normal text-black">Amount paid</th>
                      <th className="py-2 text-right font-normal text-black">Receipt number</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-left text-black">
                        {detailBooking.paymentStatus === 'paid' ? 'Bank Transfer' : (detailBooking.paymentStatus === 'deposit_paid' ? 'Deposit' : 'Pending')}
                      </td>
                      <td className="py-3 text-left text-black">{formatDate(detailBooking.updatedAt || detailBooking.bookingDate)}</td>
                      <td className="py-3 text-right text-black">
                        {detailBooking.paymentStatus === 'paid' 
                          ? formatCurrency(displayTotal) 
                          : (detailBooking.paymentStatus === 'deposit_paid' ? formatCurrency(displayDeposit) : '0đ')}
                      </td>
                      <td className="py-3 text-right text-black">AWP-{displayInvoiceNumber}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status Badge & Feedback for Service Info */}
              <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-8">
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-semibold text-black">Service Status:</span>
                  <StatusBadge status={detailBooking.status} />
                </div>
                {detailBooking.feedback && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-black">Rating:</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-base leading-none ${s <= (detailBooking.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {detailBooking.feedback && (
                <div className="mt-2 text-[13px] text-slate-600 italic">"{detailBooking.feedback}"</div>
              )}

            </div>

            {/* Footer Actions (Sticky) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              {(!detailBooking.isGroup && (detailBooking.status === 'pending' || detailBooking.status === 'confirmed')) && (
                <>
                  <button onClick={() => { setDetailBooking(null); handleCancel(detailBooking); }} disabled={cancelLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 text-center">
                    Hủy đơn
                  </button>
                  <button onClick={() => { setDetailBooking(null); openQuickBookFromBooking(detailBooking); }}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-emerald-200 bg-white text-emerald-600 text-sm font-semibold hover:bg-emerald-50 transition-colors text-center">
                    ⚡ Đặt lịch nhanh
                  </button>
                  <button onClick={() => { setDetailBooking(null); handleShowQR(detailBooking); }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800 transition-colors text-center">
                    Mã QR
                  </button>
                </>
              )}
              {(detailBooking.isGroup && recurringGroupBookings.some(b => b.status === 'pending' || b.status === 'confirmed')) && (
                <>
                  <button onClick={() => { setDetailBooking(null); handleCancelRecurring(detailBooking); }} disabled={cancelLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 text-center">
                    Hủy lịch trình định kỳ
                  </button>
                  <button onClick={() => { setDetailBooking(null); handleShowQR(detailBooking); }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800 transition-colors text-center">
                    Mã QR
                  </button>
                </>
              )}
              {(detailBooking.status === 'completed' || detailBooking.status === 'cancelled') && (
                <>
                  <button onClick={() => { setDetailBooking(null); handleRebook(detailBooking); }} disabled={rebookLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-black text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 text-center">
                    Đặt lại
                  </button>
                  {!detailBooking.isGroup && detailBooking.status === 'completed' && (
                    <button onClick={() => { setDetailBooking(null); openReview(detailBooking); }}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors text-center ${detailBooking.rating ? 'border border-slate-300 bg-white text-black hover:bg-slate-50' : 'bg-black text-white hover:bg-slate-800'}`}>
                      {detailBooking.rating ? 'Sửa đánh giá' : 'Đánh giá'}
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
        );
      })()}

      {/* ── ADD SERVICE MODAL ── */}
      {showAddService && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !addingService && setShowAddService(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Thêm dịch vụ con</h3>
            <p className="text-xs text-slate-500 mb-4">Bạn có thể chọn thêm các dịch vụ phát sinh. Hệ thống sẽ tự động tính lại tổng tiền.</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-2">
              {availableSubServices.length === 0 ? (
                <p className="text-sm text-slate-500">Đang tải hoặc không có dịch vụ nào thêm...</p>
              ) : availableSubServices.map((sub, i) => {
                const checked = selectedNewSubs.some(s => s.name === sub.name);
                return (
                  <label key={i} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                        if (checked) setSelectedNewSubs(prev => prev.filter(s => s.name !== sub.name));
                        else setSelectedNewSubs(prev => [...prev, sub]);
                      }} />
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}`}>
                        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <span className={`text-sm font-medium ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>{sub.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${checked ? 'text-emerald-600' : 'text-slate-900'}`}>+{formatCurrency(sub.price || 0)}</span>
                  </label>
                )
              })}
            </div>
            
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => setShowAddService(null)} disabled={addingService} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
                Hủy
              </button>
              <button onClick={submitAddServices} disabled={addingService || selectedNewSubs.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {addingService ? 'Đang thêm...' : 'Xác nhận thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {showReviewModal && reviewTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setShowReviewModal(false); setReviewTarget(null); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Đánh giá dịch vụ</h3>
            <p className="text-sm text-slate-400 mb-6">{reviewTarget.packageId?.name || 'Dịch vụ'} tại {reviewTarget.branchId?.name || ''}</p>
            <form onSubmit={handleSubmitReview} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">Chất lượng dịch vụ</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Nhận xét (không bắt buộc)</label>
                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                  rows={4} maxLength={1000} placeholder="Chia sẻ trải nghiệm của bạn..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{feedbackText.length}/1000</p>
              </div>
              {reviewTarget.managerReply && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Phản hồi từ chi nhánh</p>
                  <p className="text-sm text-emerald-800 italic">{reviewTarget.managerReply}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowReviewModal(false); setReviewTarget(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
                <button type="submit" disabled={submitting || rating === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50">
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CANCEL CONFIRM MODAL ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { if (!cancelLoading) { setShowCancelConfirm(false); setCancelTarget(null); setCancelConfirmError(''); setCancelReason(''); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">🗑</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận hủy đơn</h3>
            <p className="text-sm text-slate-500 mb-4">Bạn có chắc muốn hủy đơn này? Hành động này không thể hoàn tác.</p>
            <div className="text-left mb-6">
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Lý do hủy <span className="text-red-500">*</span></label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                rows={3} maxLength={500} placeholder="Nhập lý do hủy đơn..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
            </div>
            {cancelConfirmError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{cancelConfirmError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelConfirm(false); setCancelTarget(null); setCancelConfirmError(''); setCancelReason(''); }}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Không, giữ lại
              </button>
              <button onClick={confirmCancel} disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition-colors disabled:opacity-50">
                {cancelLoading ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL RECURRING CONFIRM MODAL ── */}
      {showCancelRecurringConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { if (!cancelLoading) { setShowCancelRecurringConfirm(false); setCancelRecurringTarget(null); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hủy lịch định kỳ</h3>
            <p className="text-sm text-slate-500 mb-6">Tất cả các buổi trong loạt định kỳ này sẽ bị hủy. Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelRecurringConfirm(false); setCancelRecurringTarget(null); }}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Giữ lại
              </button>
              <button onClick={confirmCancelRecurring} disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition-colors disabled:opacity-50">
                {cancelLoading ? 'Đang hủy...' : 'Hủy tất cả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECURRING GROUP MODAL ── */}
      {showRecurringGroupModal && (
        <div className="fixed inset-0 z-[9900] bg-black/40 backdrop-blur-sm flex justify-end"
          onClick={() => { setShowRecurringGroupModal(false); setRecurringGroupTarget(null); setRecurringGroupBookings([]); }}>
          <div className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chi tiết lịch định kỳ</h3>
                <p className="text-sm text-slate-500 mt-0.5">{recurringGroupTarget?.packageId?.name || recurringGroupTarget?.packageName || 'Gói dịch vụ'}</p>
              </div>
              <button onClick={() => { setShowRecurringGroupModal(false); setRecurringGroupTarget(null); setRecurringGroupBookings([]); }} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-indigo-900">Tổng cộng {recurringGroupTarget?.groupCount} buổi</div>
                  <div className="text-xs text-indigo-700 mt-1">Tổng tiền: {formatCurrency(recurringGroupTarget?.groupTotalPrice)}</div>
                </div>
                {recurringGroupBookings.some(b => b.status === 'pending' || b.status === 'confirmed') && (
                  <button onClick={() => handleCancelRecurring(recurringGroupTarget)}
                    disabled={cancelLoading}
                    className="px-4 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-bold hover:bg-red-200 transition-colors">
                    Hủy toàn bộ định kỳ
                  </button>
                )}
              </div>

              {recurringGroupLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách...</div>
              ) : recurringGroupBookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">Không có dữ liệu</div>
              ) : (
                <div className="space-y-3">
                  {recurringGroupBookings.map(b => {
                    const bId = b._id || b.id;
                    const canReview = b.status === 'completed';
                    const hasReview = b.rating || b.feedback;
                    return (
                      <div key={bId} onClick={() => setDetailBooking(b)} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{formatDate(b.bookingDate)} · {b.startTime}</div>
                            <div className="text-xs text-slate-500 mt-1">{b.branchId?.name || b.branchName || ''}</div>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                          {(b.status === 'pending' || b.status === 'confirmed') && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleShowQR(b); }}
                                className="px-2.5 py-1 rounded text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors">
                                Xem QR
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleCancel(b); }}
                                disabled={cancelLoading}
                                className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50">
                                Hủy đơn này
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleOpenAddService(b); }}
                                className="px-2.5 py-1 rounded text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors">
                                Thêm dịch vụ
                              </button>
                            </>
                          )}
                          {(b.status === 'completed' || b.status === 'cancelled') && (
                            <button onClick={(e) => { e.stopPropagation(); handleRebook(b); }}
                              disabled={rebookLoading}
                              className="px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50">
                              Đặt lại
                            </button>
                          )}
                          {canReview && !hasReview && (
                            <button onClick={(e) => { e.stopPropagation(); openReview(b); }}
                              className="ml-auto px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors">
                              Đánh giá
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REBOOK MODAL ── */}
      {showRebookModal && (() => {
        const basePrice = rebookTarget?.packageId?.price || rebookTarget?.finalPrice || 0;
        const subServiceTotal = (rebookSubServices || []).filter(s => s.price > 0).reduce((sum, s) => sum + s.price, 0);
        const totalPrice = Math.max(0, basePrice + subServiceTotal - rebookVoucherDiscount);
        const deposit30 = totalPrice > 0 ? Math.round(totalPrice * 0.3 / 1000) * 1000 : 0;
        const currentAmount = rebookPaymentMode === 'full' ? totalPrice : deposit30;
        const branchName = rebookTarget?.branchId?.name || rebookTarget?.branchName || '';
        const pkgName = rebookTarget?.packageId?.name || rebookTarget?.packageName || 'Gói dịch vụ';
        const vehicleLabel = rebookTarget?.vehicleId?.licensePlate || rebookTarget?.vehicleLicensePlate || '';
        return (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { if (!rebookLoading && !rebookQrLoading) { setShowRebookModal(false); setRebookTarget(null); setRebookFormError(''); setRebookQrStep('form'); setRebookDraft(null); setRebookDepositPayment(null); if (rebookPollRef.current) clearInterval(rebookPollRef.current); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* ── Form bước ── */}
            {rebookQrStep === 'form' && (
              <div className="p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Đặt lại lịch</h3>

                {/* Thông tin đặt lại */}
                <div className="mb-5 rounded-xl bg-slate-50 p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chi nhánh</span>
                    <span className="font-medium text-slate-800 text-right max-w-[60%]">{branchName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gói dịch vụ</span>
                    <span className="font-medium text-slate-800 text-right max-w-[60%]">{pkgName || '—'}</span>
                  </div>
                  {vehicleLabel && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Xe</span>
                      <span className="font-medium text-slate-800">{vehicleLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giờ cũ</span>
                    <span className="font-medium text-slate-800">{rebookTarget?.startTime || '—'}</span>
                  </div>
                  {subServiceTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dịch vụ thêm</span>
                      <span className="font-medium text-emerald-600">+{subServiceTotal.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  {rebookVoucherDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giảm giá</span>
                      <span className="font-medium text-red-500">-{rebookVoucherDiscount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                    <span className="text-slate-500">Tổng tiền</span>
                    <span className="font-bold text-emerald-600">{totalPrice.toLocaleString('vi-VN')}₫</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">Ngày mới <span className="text-red-500">*</span></label>
                    <input type="date"
                      value={rebookDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setRebookDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">
                      Giờ mới <span className="text-red-500">*</span>
                      {rebookTarget?.startTime && <span className="text-emerald-500 font-normal ml-1">(Giờ cũ: {rebookTarget.startTime})</span>}
                    </label>
                    {rebookSlotsLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
                        <span className="text-sm">Đang tìm lịch trống...</span>
                      </div>
                    ) : !rebookSlotsLoading && rebookSlots.length > 0 && rebookDate ? (
                      <div className="grid grid-cols-1 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-amber-600">
                            <Sun className="w-4 h-4" />
                            <h4 className="text-xs font-bold uppercase tracking-wider">Khung giờ buổi sáng</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const morning = rebookSlots.filter(s => {
                                const h = parseInt((s.startTime || s.time || s).split(':')[0], 10);
                                return h < 12;
                              });
                              return morning.length === 0
                                ? <span className="text-xs text-slate-400 py-1">Không có lịch trống buổi sáng</span>
                                : morning.map((slot, i) => {
                                    const timeVal = slot.startTime || slot.time || slot;
                                    const isDisabled = !slot.available;
                                    const isSelected = rebookTime === timeVal;
                                    return (
                                      <button key={i} type="button"
                                        disabled={isDisabled}
                                        onClick={() => setRebookTime(timeVal)}
                                        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                          isSelected
                                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/10 scale-105'
                                            : isDisabled
                                              ? 'border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >{timeVal}</button>
                                    );
                                  });
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-blue-600">
                            <Sunset className="w-4 h-4" />
                            <h4 className="text-xs font-bold uppercase tracking-wider">Khung giờ buổi chiều</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const afternoon = rebookSlots.filter(s => {
                                const h = parseInt((s.startTime || s.time || s).split(':')[0], 10);
                                return h >= 12;
                              });
                              return afternoon.length === 0
                                ? <span className="text-xs text-slate-400 py-1">Không có lịch trống buổi chiều</span>
                                : afternoon.map((slot, i) => {
                                    const timeVal = slot.startTime || slot.time || slot;
                                    const isDisabled = !slot.available;
                                    const isSelected = rebookTime === timeVal;
                                    return (
                                      <button key={i} type="button"
                                        disabled={isDisabled}
                                        onClick={() => setRebookTime(timeVal)}
                                        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                          isSelected
                                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/10 scale-105'
                                            : isDisabled
                                              ? 'border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >{timeVal}</button>
                                    );
                                  });
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : !rebookSlotsLoading && rebookSlots.length === 0 && rebookDate ? (
                      <p className="text-xs text-amber-500 mt-1">Không có khung giờ trống cho ngày này</p>
                    ) : null}
                  </div>

                  {/* Sub-services toggle */}
                  {rebookAvailableSubServices.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Dịch vụ thêm (Tùy chọn)
                      </label>
                      <div className="space-y-2">
                        {rebookAvailableSubServices.map(sub => {
                          const isMandatory = !sub.isOptional;
                          const checked = rebookSubServices.some(s => s.name === sub.name);
                          return (
                            <button type="button" key={sub.name}
                              onClick={() => {
                                if (isMandatory) return;
                                setRebookSubServices(prev =>
                                  checked ? prev.filter(s => s.name !== sub.name) : [...prev, { name: sub.name, price: sub.price, duration: sub.duration }]
                                );
                              }}
                              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                                isMandatory
                                  ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                  : checked
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {!isMandatory && (
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-white text-[10px] font-bold ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                    {checked ? '✓' : ''}
                                  </span>
                                )}
                                {sub.name}
                              </span>
                              <span className={isMandatory ? 'text-slate-400' : 'text-emerald-600'}>
                                {sub.price > 0 ? `+${sub.price.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {subServiceTotal > 0 && (
                        <p className="text-xs text-slate-500 mt-1.5 text-right">
                          Phí dịch vụ thêm: <span className="font-bold text-emerald-600">+{subServiceTotal.toLocaleString('vi-VN')}₫</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Voucher code + picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-500">Mã giảm giá</label>
                      <button type="button" onClick={async () => {
                        if (rebookShowVoucherPicker) { setRebookShowVoucherPicker(false); return; }
                        if (!rebookAvailableVouchers) {
                          try {
                            const branchId = rebookTarget?.branchId?._id || rebookTarget?.branchId?.id || rebookTarget?.branchId;
                            const vRes = await fetch(`${apiBase || API_BASE}/vouchers/available?branchId=${branchId}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (vRes.ok) {
                              const vData = await vRes.json();
                              const data = vData?.data || vData;
                              const allVouchers = [...(data.public || []), ...(data.tier_exclusive || [])];
                              setRebookAvailableVouchers(allVouchers);
                            }
                          } catch (_) {}
                        }
                        setRebookShowVoucherPicker(!rebookShowVoucherPicker);
                      }} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1 cursor-pointer">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        {rebookShowVoucherPicker ? 'Thu gọn' : 'Chọn mã'}
                      </button>
                    </div>
                    {rebookShowVoucherPicker && rebookAvailableVouchers && rebookAvailableVouchers.length > 0 && (
                      <div className="mb-2 max-h-44 overflow-y-auto space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2">
                        {rebookAvailableVouchers.map(v => {
                          const saving = v.type === 'percent' ? `${v.discountValue}% (tối đa ${(v.maxDiscount || 0).toLocaleString('vi-VN')}₫)` : `${(v.discountValue || 0).toLocaleString('vi-VN')}₫`;
                          const isSelected = rebookVoucherCode === v.code;
                          return (
                            <button type="button" key={v._id}
                              onClick={() => {
                                setRebookVoucherCode(v.code);
                                setRebookVoucherDiscount(0);
                                setRebookShowVoucherPicker(false);
                                // Auto-apply
                                (async () => {
                                  setRebookApplyingVoucher(true);
                                  setRebookFormError('');
                                  try {
                                    const vRes = await fetch(`${apiBase || API_BASE}/vouchers/validate`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({
                                        code: v.code,
                                        amount: basePrice + subServiceTotal,
                                        branchId: rebookTarget?.branchId?._id || rebookTarget?.branchId?.id || rebookTarget?.branchId,
                                        packageId: rebookTarget?.packageId?._id || rebookTarget?.packageId?.id || rebookTarget?.packageId,
                                      }),
                                    });
                                    const vData = await vRes.json();
                                    if (!vRes.ok) throw new Error(vData.message || 'Mã không hợp lệ');
                                    const discount = vData?.data?.savings || vData?.data?.discountAmount || 0;
                                    if (discount <= 0) throw new Error('Không có giá trị');
                                    setRebookVoucherDiscount(discount);
                                    showToastMsg(`Giảm ${discount.toLocaleString('vi-VN')}₫`);
                                  } catch (e) {
                                    setRebookFormError(e.message);
                                    setRebookVoucherDiscount(0);
                                  } finally {
                                    setRebookApplyingVoucher(false);
                                  }
                                })();
                              }}
                              className={`w-full text-left p-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800">{v.code}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.type === 'percent' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>Giảm {saving}</span>
                              </div>
                              {v.description && <p className="text-[11px] text-slate-500 mt-1">{v.description}</p>}
                              {(v.minOrder || 0) > 0 && <p className="text-[10px] text-slate-400 mt-0.5 italic">Đơn tối thiểu {(v.minOrder).toLocaleString('vi-VN')}₫</p>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {rebookShowVoucherPicker && rebookAvailableVouchers && rebookAvailableVouchers.length === 0 && (
                      <p className="text-xs text-slate-400 mb-2">Không có mã giảm giá nào khả dụng cho chi nhánh này.</p>
                    )}
                    <div className="flex gap-2">
                      <input type="text" placeholder="Hoặc nhập mã"
                        value={rebookVoucherCode}
                        onChange={e => { setRebookVoucherCode(e.target.value); setRebookVoucherDiscount(0); }}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                      />
                      <button type="button" onClick={async () => {
                        if (!rebookVoucherCode.trim()) { setRebookFormError('Nhập mã giảm giá'); return; }
                        setRebookApplyingVoucher(true);
                        setRebookFormError('');
                        try {
                          const vRes = await fetch(`${apiBase || API_BASE}/vouchers/validate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                              code: rebookVoucherCode.trim().toUpperCase(),
                              amount: basePrice + subServiceTotal,
                              branchId: rebookTarget?.branchId?._id || rebookTarget?.branchId?.id || rebookTarget?.branchId,
                              packageId: rebookTarget?.packageId?._id || rebookTarget?.packageId?.id || rebookTarget?.packageId,
                            }),
                          });
                          const vData = await vRes.json();
                          if (!vRes.ok) throw new Error(vData.message || 'Mã giảm giá không hợp lệ');
                          const discount = vData?.data?.savings || vData?.data?.discountAmount || 0;
                          if (discount <= 0) throw new Error('Mã giảm giá không có giá trị');
                          setRebookVoucherDiscount(discount);
                          showToastMsg(`Giảm ${discount.toLocaleString('vi-VN')}₫`);
                        } catch (e) {
                          setRebookFormError(e.message);
                          setRebookVoucherDiscount(0);
                        } finally {
                          setRebookApplyingVoucher(false);
                        }
                      }} disabled={rebookApplyingVoucher}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer">
                        {rebookApplyingVoucher ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        ) : 'Áp dụng'}
                      </button>
                    </div>
                    {rebookVoucherDiscount > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Đã áp dụng giảm <strong>{rebookVoucherDiscount.toLocaleString('vi-VN')}₫</strong>
                      </p>
                    )}
                  </div>

                  {/* Payment mode: 30% deposit or 100% full */}
                  {totalPrice > 0 && deposit30 > 0 && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1.5">Hình thức thanh toán</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setRebookPaymentMode('deposit')}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                            rebookPaymentMode === 'deposit' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-200'
                          }`}>
                          <span className="block font-semibold">Đặt cọc 30%</span>
                          <span className="text-xs opacity-70">{deposit30.toLocaleString('vi-VN')}₫</span>
                        </button>
                        <button type="button" onClick={() => setRebookPaymentMode('full')}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                            rebookPaymentMode === 'full' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'
                          }`}>
                          <span className="block font-semibold">Thanh toán 100%</span>
                          <span className="text-xs opacity-70">{totalPrice.toLocaleString('vi-VN')}₫</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment method selector */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1.5">Phương thức thanh toán</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRebookDepositMethod('bank')}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                          rebookDepositMethod === 'bank' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                        <span className="block text-xs opacity-70">Chuyển khoản</span>
                      </button>
                      <button type="button" onClick={() => setRebookDepositMethod('vnpay')}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                          rebookDepositMethod === 'vnpay' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                        <span className="block text-xs opacity-70">VNPay</span>
                      </button>
                    </div>
                  </div>

                  {rebookFormError && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{rebookFormError}</div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setShowRebookModal(false); setRebookTarget(null); setRebookFormError(''); setRebookQrStep('form'); setRebookDraft(null); setRebookDepositPayment(null); if (rebookPollRef.current) clearInterval(rebookPollRef.current); }}
                    disabled={rebookLoading || rebookVnpayLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer">
                    Hủy
                  </button>
                  <button onClick={submitRebook} disabled={rebookLoading || rebookVnpayLoading}
                    className="flex-[2] px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                    {(rebookLoading || rebookVnpayLoading) && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    )}
                    {rebookLoading ? 'Đang xử lý...' : rebookVnpayLoading ? 'Đang tạo VNPay...' : `Thanh toán ${currentAmount.toLocaleString('vi-VN')}₫`}
                  </button>
                </div>
              </div>
            )}

            {/* ── QR / VNPay step ── */}
            {rebookQrStep === 'qr' && rebookDepositPayment && (
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {rebookDepositPayment.method === 'vnpay' ? 'Thanh toán VNPay' : 'Chuyển khoản đặt cọc'}
                    </h3>
                    <p className="text-sm text-slate-400">Đặt lại lịch — thanh toán để xác nhận</p>
                  </div>
                </div>

                {rebookDepositPayment.method === 'vnpay' ? (
                  /* VNPay waiting: không có QR, chỉ chờ xác nhận */
                  <div className="flex flex-col items-center py-8 gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600 text-center">
                      Vui lòng hoàn tất thanh toán trong cửa sổ VNPay đã mở.
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {(rebookDepositPayment.amount || 0).toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                ) : (
                  /* Bank QR */
                  <div className="flex flex-col items-center py-4">
                    <div className="w-32 h-32 rounded-xl border-2 border-slate-100 bg-white flex items-center justify-center mb-3 overflow-hidden">
                      {rebookDepositPayment.qrCode ? (
                        <img src={rebookDepositPayment.qrCode} alt="QR code" className="w-32 h-32" />
                      ) : (
                        <span className="text-[10px] text-slate-300 text-center px-2">QR code</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {(rebookDepositPayment.amount || 0).toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-xs text-slate-400">Số tiền cần chuyển</p>
                  </div>
                )}

                {rebookDepositPayment.method !== 'vnpay' && (
                  <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ngân hàng</span>
                      <span className="text-xs font-bold text-slate-700">{rebookDepositPayment.bankInfo?.bankName || 'Ngân hàng TMCP Quân đội (MB)'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Số tài khoản</span>
                      <span className="text-xs font-bold text-slate-700 font-mono tracking-wider flex items-center gap-1">
                        {rebookDepositPayment.bankInfo?.accountNumber || '97966888888'}
                        <button onClick={() => { navigator.clipboard.writeText(rebookDepositPayment.bankInfo?.accountNumber || '97966888888'); showToastMsg('Đã sao chép số tài khoản'); }} className="text-emerald-500 hover:text-emerald-600 cursor-pointer" title="Copy">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chủ tài khoản</span>
                      <span className="text-xs font-bold text-slate-700">{rebookDepositPayment.bankInfo?.accountHolder || 'CONG TY CO PHAN AUTO WASH PRO'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nội dung CK</span>
                      <span className="text-xs font-bold text-slate-800 font-mono max-w-[180px] text-right break-all">{rebookDepositPayment.bankInfo?.transferContent || `DAT COC ${rebookDepositPayment.transactionId || ''}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã GD</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{rebookDepositPayment.transactionId || ''}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 justify-center text-xs text-slate-400">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Đang chờ xác nhận thanh toán...
                </div>

                {rebookFormError && (
                  <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{rebookFormError}</div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setRebookQrStep('form'); if (rebookPollRef.current) clearInterval(rebookPollRef.current); }}
                    disabled={rebookQrLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer">
                    Quay lại
                  </button>
                  <button onClick={simulateRebookPayment} disabled={rebookQrLoading}
                    className="flex-[2] px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                    {rebookQrLoading ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Đang xử lý</>
                    ) : 'Tôi đã chuyển khoản'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Rebook success step ── */}
            {rebookQrStep === 'success' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Đặt lại thành công!</h3>
                <p className="text-sm text-slate-500 mb-6">Lịch hẹn mới đã được tạo.</p>
                <button onClick={() => { setShowRebookModal(false); setRebookTarget(null); setRebookFormError(''); setRebookQrStep('form'); setRebookDraft(null); setRebookDepositPayment(null); if (rebookPollRef.current) clearInterval(rebookPollRef.current); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors cursor-pointer">
                  Đóng
                </button>
              </div>
            )}

          </div>
        </div>);
      })()}

      {/* ── MONTH PICKER MODAL ── */}
      {showMonthPicker && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowMonthPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setPickerYear(y => y - 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer text-lg">‹</button>
              <span className="text-base font-bold text-slate-800">{pickerYear}</span>
              <button onClick={() => setPickerYear(y => y + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer text-lg">›</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS_VN.map((m, i) => {
                const active = i === viewMonth && pickerYear === viewYear;
                return (
                  <button key={i} onClick={() => { setViewMonth(i); setViewYear(pickerYear); setShowMonthPicker(false); setSelectedDate(null); }}
                    className="py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer transition-all"
                    style={{
                      background: active ? '#0ea5e9' : '#f8fafc',
                      color: active ? '#fff' : '#475569',
                      boxShadow: active ? '0 2px 8px rgba(14,165,233,0.3)' : 'none',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#e0f2fe'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── QR MODAL ── */}
      {showQR && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setShowQR(false); setQrData(''); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Mã QR Check-in</h3>
            <p className="text-xs text-slate-400 mb-6">Đưa mã này cho nhân viên tại chi nhánh để check-in</p>
            {qrLoading ? (
              <div className="py-12 text-slate-400 text-sm">Đang tạo mã QR...</div>
            ) : qrData ? (
              <img src={qrData} alt="QR code" className="w-56 h-56 mx-auto rounded-xl border border-slate-200 shadow-sm" />
            ) : (
              <div className="py-12 text-slate-400 text-sm">Không thể tạo mã QR</div>
            )}
            <button onClick={() => { setShowQR(false); setQrData(''); }}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* Quick Booking Modal */}
      {quickBookPack && (
        <QuickBookModal
          pack={quickBookPack}
          userVehicles={userVehicles}
          branches={branches}
          apiBase={apiBase || API_BASE}
          token={token}
          onClose={() => setQuickBookPack(null)}
          onSuccess={() => {
            fetchSlotPacks();
            doFetch(keyword, statusFilter, typeFilter, dateFrom, dateTo, page, sort, true);
          }}
        />
      )}
    </div>
  );
}
