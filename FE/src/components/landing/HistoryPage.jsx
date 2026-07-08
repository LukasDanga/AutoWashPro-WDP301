import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { showToast } from '@/lib/toast';
import useSSE from '../../hooks/useSSE';

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

export default function HistoryPage({ onBack, apiBase, token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 50;

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState('calendar');

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

  // Cancel recurring confirm modal
  const [showCancelRecurringConfirm, setShowCancelRecurringConfirm] = useState(false);
  const [cancelRecurringTarget, setCancelRecurringTarget] = useState(null);

  // Rebook modal
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [rebookTarget, setRebookTarget] = useState(null);
  const [rebookDate, setRebookDate] = useState('');
  const [rebookTime, setRebookTime] = useState('');
  const [rebookFormError, setRebookFormError] = useState('');

  const debounceRef = useRef(null);

  function showToastMsg(message, type = 'success') {
    showToast(message, type);
  }

  const doFetch = useCallback((kw, st, df, dt, pg) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', pg);
    params.set('limit', limit);
    if (kw.trim()) params.set('keyword', kw.trim());
    if (st) params.set('status', st);
    if (df) params.set('dateFrom', df);
    if (dt) params.set('dateTo', dt);

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

  useEffect(() => {
    if (!token) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doFetch(keyword, statusFilter, dateFrom, dateTo, page);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword, statusFilter, dateFrom, dateTo, page, token, doFetch]);

  /* ── SSE: auto-refresh on notification ── */
  useSSE(token, 'notification', useCallback(() => {
    doFetch(keyword, statusFilter, dateFrom, dateTo, page);
  }, [doFetch, keyword, statusFilter, dateFrom, dateTo, page]));

  function resetFilters() { setKeyword(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }
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
    setShowCancelConfirm(true);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelConfirmError('');
    try {
      const bId = cancelTarget._id || cancelTarget.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancellationReason: 'Khách hàng yêu cầu hủy' }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Hủy thất bại'); }
      showToastMsg('Đã hủy đơn thành công');
      setShowCancelConfirm(false); setCancelTarget(null);
      doFetch(keyword, statusFilter, dateFrom, dateTo, page);
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
      setQrData(payload?.data || payload?.qr || '');
    } catch (e) { showToastMsg(e.message, 'error'); setShowQR(false); }
    finally { setQrLoading(false); }
  }

  async function handleRebook(b) {
    setRebookTarget(b);
    setRebookDate('');
    setRebookTime('');
    setRebookFormError('');
    setShowRebookModal(true);
  }

  async function submitRebook() {
    if (!rebookTarget) return;
    setRebookFormError('');
    if (!rebookDate) { setRebookFormError('Vui lòng chọn ngày'); return; }
    if (!rebookTime) { setRebookFormError('Vui lòng chọn giờ'); return; }
    const selected = new Date(rebookDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) { setRebookFormError('Ngày phải từ hôm nay trở đi'); return; }
    setRebookLoading(true);
    try {
      const bId = rebookTarget._id || rebookTarget.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/rebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingDate: rebookDate, startTime: rebookTime }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Đặt lại thất bại'); }
      showToastMsg('Đặt lại thành công! Vui lòng kiểm tra lịch mới.');
      setShowRebookModal(false); setRebookTarget(null);
      doFetch(keyword, statusFilter, dateFrom, dateTo, page);
    } catch (e) { setRebookFormError(e.message); }
    finally { setRebookLoading(false); }
  }

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
      doFetch(keyword, statusFilter, dateFrom, dateTo, page);
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
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#f1f5f9' }}>
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
            📋 Danh sách
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
                        <div key={bId} className="bg-white rounded-xl p-4 border border-slate-200 cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm">
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
                              {hasReview && <span className="text-amber-500">{'★'.repeat(b.rating || 0)}{'☆'.repeat(5 - (b.rating || 0))}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-600">{formatCurrency(b.finalPrice)}</span>
                              {b.depositAmount > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${b.depositPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                  {b.depositPaid ? `Đã cọc ${formatCurrency(b.depositAmount)}` : `Cọc ${formatCurrency(b.depositAmount)}`}
                                </span>
                              )}
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
                          <div key={b._id || b.id}
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  <input type="text" value={keyword} onChange={e => onFilterChange(setKeyword, e.target.value)}
                    placeholder="Tìm gói dịch vụ hoặc chi nhánh..."
                    className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <select value={statusFilter} onChange={e => onFilterChange(setStatusFilter, e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => onFilterChange(setDateFrom, e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                <input type="date" value={dateTo} onChange={e => onFilterChange(setDateTo, e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
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
              <div className="space-y-3">
                {bookings.map(b => {
                  const bId = b._id || b.id;
                  const st = STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                  const canReview = b.status === 'completed';
                  const hasReview = b.rating || b.feedback;
                  return (
                    <div key={bId} className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-800">{b.packageId?.name || b.packageName || 'Dịch vụ'}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-slate-400">{b.branchId?.name || b.branchName || ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(b.finalPrice)}</p>
                          {b.depositAmount > 0 && (
                            <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${b.depositPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                              {b.depositPaid ? `Đã cọc ${formatCurrency(b.depositAmount)}` : `Cọc ${formatCurrency(b.depositAmount)}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {b.vehicleId && <span>🚗 {b.vehicleId.licensePlate || ''}</span>}
                        {b.bookingDate && <span>📅 {formatDate(b.bookingDate)}</span>}
                        {b.startTime && <span>⏰ {b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}</span>}
                        {b.bookingCode && <span className="font-mono text-emerald-600">#{b.bookingCode}</span>}
                        {b.recurringGroupId && <span className="text-indigo-500">Định kỳ</span>}
                        {hasReview && <span className="text-amber-500 font-medium">{'★'.repeat(b.rating || 0)}{'☆'.repeat(5 - (b.rating || 0))}</span>}
                        {canReview && !hasReview && (
                          <button onClick={() => openReview(b)} className="ml-auto text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1 text-xs">
                            ⭐ Đánh giá
                          </button>
                        )}
                        {hasReview && (
                          <button onClick={() => openReview(b)} className="ml-auto text-slate-400 hover:text-amber-500 font-medium flex items-center gap-1 text-xs">
                            ✏️ {b.feedback ? 'Xem đánh giá' : 'Sửa đánh giá'}
                          </button>
                        )}
                      </div>
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
                          <button onClick={() => handleShowQR(b)}
                            className="text-xs font-semibold text-sky-600 hover:text-sky-500 border-none bg-transparent cursor-pointer">
                            📱 Xem QR
                          </button>
                          {b.recurringGroupId && (
                            <button onClick={() => handleCancelRecurring(b)}
                              disabled={cancelLoading}
                              className="text-xs font-semibold text-red-500 hover:text-red-400 border-none bg-transparent cursor-pointer disabled:opacity-50">
                              Hủy định kỳ
                            </button>
                          )}
                          <button onClick={() => handleCancel(b)}
                            disabled={cancelLoading}
                            className="text-xs font-semibold text-red-500 hover:text-red-400 border-none bg-transparent cursor-pointer disabled:opacity-50">
                            Hủy đơn
                          </button>
                        </div>
                      )}
                      {(b.status === 'completed' || b.status === 'cancelled') && (
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
                          <button onClick={() => handleRebook(b)}
                            disabled={rebookLoading}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 border-none bg-transparent cursor-pointer disabled:opacity-50">
                            🔄 Đặt lại
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
      </main>

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
          onClick={() => { if (!cancelLoading) { setShowCancelConfirm(false); setCancelTarget(null); setCancelConfirmError(''); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">🗑</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận hủy đơn</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn có chắc muốn hủy đơn này? Hành động này không thể hoàn tác.</p>
            {cancelConfirmError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{cancelConfirmError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelConfirm(false); setCancelTarget(null); setCancelConfirmError(''); }}
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

      {/* ── REBOOK MODAL ── */}
      {showRebookModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { if (!rebookLoading) { setShowRebookModal(false); setRebookTarget(null); setRebookFormError(''); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Đặt lại lịch</h3>
            <p className="text-sm text-slate-400 mb-6">{rebookTarget?.packageId?.name || rebookTarget?.packageName || ''}</p>
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
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Giờ mới <span className="text-red-500">*</span></label>
                <input type="time"
                  value={rebookTime}
                  onChange={e => setRebookTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
              <p className="text-[11px] text-slate-400">💡 Chọn ngày và giờ bạn muốn đặt lại. Ngày phải từ hôm nay trở đi.</p>
              {rebookFormError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{rebookFormError}</div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowRebookModal(false); setRebookTarget(null); setRebookFormError(''); }}
                disabled={rebookLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Hủy
              </button>
              <button onClick={submitRebook} disabled={rebookLoading}
                className="flex-[2] px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50">
                {rebookLoading ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
