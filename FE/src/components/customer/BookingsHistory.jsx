import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/lib/toast';
import VoucherPicker from '../VoucherPicker.jsx';
import { Percent, Ticket } from 'lucide-react';

const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VN = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const STATUS_MAP = {
  pending:     { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:   { label: 'Đã xác nhận',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  checked_in:  { label: 'Đã check-in',  cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  in_progress: { label: 'Đang rửa',     cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  completed:   { label: 'Hoàn thành',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:   { label: 'Đã hủy',       cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  paid:        { label: 'Đã thanh toán', cls: 'bg-green-50 text-green-700 border-green-200' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>;
}

/* ── cảnh báo "sắp bị hủy tự động" + đổi giờ nhanh sang slot gợi ý ── */
function AtRiskBanner({ booking, apiBase, token, onRescheduled }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!['pending', 'confirmed'].includes(booking.status) || !booking.lateWarningSentAt) return null;

  async function rescheduleToSuggested() {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${apiBase}/bookings/${booking._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startTime: booking.suggestedSlotStartTime }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'Đổi giờ thất bại');
      onRescheduled(payload?.data || payload);
      showToast(`Đã đổi giờ sang ${booking.suggestedSlotStartTime}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      marginTop: 10, padding: '10px 12px', borderRadius: 10,
      background: '#fffbeb', border: '1px solid #fde68a',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#b45309' }}>
        ⏰ Bạn chưa check-in — sắp bị hệ thống tự hủy!
      </div>
      {booking.suggestedSlotStartTime && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#92400e' }}>
            Khung giờ trống gần nhất hôm nay: <b>{booking.suggestedSlotStartTime}</b>
          </span>
          <button onClick={rescheduleToSuggested} disabled={busy} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
          }}>
            {busy ? 'Đang đổi...' : `Đổi sang ${booking.suggestedSlotStartTime}`}
          </button>
        </div>
      )}
      {err && <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626' }}>{err}</div>}
    </div>
  );
}

function formatCurrency(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('vi-VN');
}

function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function BookingsHistory({ apiBase, token }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // Calendar state
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);

  // View mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState('calendar');

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [hoverStar, setHoverStar] = useState(0);
  const reviewTextRef = useRef(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rebookLoading, setRebookLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');

  // Rebook modal
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [rebookTarget, setRebookTarget] = useState(null);
  const [rebookDate, setRebookDate] = useState('');
  const [rebookTime, setRebookTime] = useState('');
  const [rebookError, setRebookError] = useState('');
  const [rebookVoucherCode, setRebookVoucherCode] = useState('');
  const [rebookVoucherDiscount, setRebookVoucherDiscount] = useState(0);
  const [showRebookVoucherModal, setShowRebookVoucherModal] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelStep, setCancelStep] = useState(1);
  const [cancelOtp, setCancelOtp] = useState('');
  const [cancelPreview, setCancelPreview] = useState(null);

  // Refund request modal
  const [refundRequests, setRefundRequests] = useState([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Không thể tải lịch sử đặt chỗ');
        const payload = await res.json();
        const data = payload?.data || payload;
        if (mounted) setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err.message || 'Lỗi tải lịch sử');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [apiBase, token]);

  useEffect(() => {
    let mounted = true;
    async function loadRefundRequests() {
      try {
        const res = await fetch(`${apiBase}/refund-requests/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const payload = await res.json();
        const data = payload?.data || payload;
        if (mounted) setRefundRequests(Array.isArray(data) ? data : []);
      } catch {
        // ignore - refund status is a non-critical enhancement
      }
    }
    loadRefundRequests();
    return () => { mounted = false; };
  }, [apiBase, token]);

  function findRefundRequest(bookingId) {
    return refundRequests.find((r) => String(r.bookingId?._id || r.bookingId) === String(bookingId));
  }

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const key = new Date(b.bookingDate).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  // Bookings for selected date
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toISOString().split('T')[0];
    return bookingsByDate[key] || [];
  }, [selectedDate, bookingsByDate]);

  // Calendar navigation
  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else { setViewMonth((m) => m - 1); }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else { setViewMonth((m) => m + 1); }
  }, [viewMonth]);

  const goToday = useCallback(() => {
    const d = new Date();
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
    setSelectedDate(d);
  }, []);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days = [];

    // Previous month trailing days
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ date: new Date(y, m, d), isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(viewYear, viewMonth, d), isCurrentMonth: true });
    }

    // Next month leading days
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ date: new Date(y, m, d), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  function handlePrevMonth() { prevMonth(); setSelectedDate(null); }
  function handleNextMonth() { nextMonth(); setSelectedDate(null); }

  async function loadDetail(id) {
    setDetailBooking(null);
    try {
      const res = await fetch(`${apiBase}/bookings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Không thể tải chi tiết');
      const payload = await res.json();
      setDetailBooking(payload?.data || payload);
    } catch (err) {
      setError(err.message || 'Lỗi tải chi tiết');
    }
  }

  function openReviewForm() {
    setReviewRating(detailBooking?.rating || 0);
    setReviewText(detailBooking?.feedback || '');
    setReviewError('');
    setShowReview(true);
    setTimeout(() => reviewTextRef.current?.focus(), 100);
  }

  async function submitReview() {
    if (reviewRating === 0) { setReviewError('Vui lòng chọn số sao'); return; }
    setReviewLoading(true);
    setReviewError('');
    try {
      const res = await fetch(`${apiBase}/bookings/${detailBooking._id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: reviewRating, feedback: reviewText.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gửi đánh giá thất bại');
      }
      const payload = await res.json();
      const updated = payload?.data || payload;
      // sync local state
      setDetailBooking((prev) => ({ ...prev, ...updated }));
      setBookings((prev) => prev.map((b) => b._id === updated._id ? { ...b, ...updated } : b));
      setShowReview(false);
    } catch (e) {
      setReviewError(e.message);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleCancel(id) {
    setCancelTarget(id);
    setCancelError('');
    setCancelReason('');
    setCancelStep(1);
    setCancelOtp('');
    setCancelPreview(null);
    setShowCancelConfirm(true);
    try {
      const res = await fetch(`${apiBase}/bookings/${id}/cancel-preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setCancelPreview(payload?.data || null);
      }
    } catch (e) { /* ignore preview errors */ }
  }

  async function requestCancelOtp() {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn');
      return;
    }
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await fetch(`${apiBase}/bookings/${cancelTarget}/cancel-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Không thể yêu cầu OTP'); }
      setCancelStep(2);
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    if (cancelStep === 2 && !cancelOtp.trim()) {
      setCancelError('Vui lòng nhập mã OTP');
      return;
    }
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await fetch(`${apiBase}/bookings/${cancelTarget}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancellationReason: cancelReason.trim(), otp: cancelOtp.trim() }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Không thể hủy đơn'); }
      
      const resData = await res.json().catch(() => ({}));
      const updatedBooking = resData.data || resData;
      setDetailBooking((prev) => ({ ...prev, status: 'cancelled' }));
      setBookings((prev) => prev.map((b) => b._id === cancelTarget ? { ...b, status: 'cancelled' } : b));
      setShowCancelConfirm(false);
      setCancelTarget(null);
      setCancelReason('');
      setCancelOtp('');
      setCancelStep(1);
      setCancelPreview(null);
      const refundAmount = updatedBooking?.refundAmount || 0;
      showToast(refundAmount > 0 ? `Đã hủy lịch thành công. Hoàn ${refundAmount.toLocaleString('vi-VN')}₫ vào ví.` : 'Đã hủy lịch thành công');
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelLoading(false);
    }
  }

  function openRefundRequest(booking) {
    setRefundTarget(booking);
    setRefundReason('');
    setRefundError('');
    setShowRefundModal(true);
  }

  async function submitRefundRequest() {
    if (!refundTarget) return;
    if (!refundReason.trim()) { setRefundError('Vui lòng nhập lý do hoàn tiền'); return; }
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await fetch(`${apiBase}/refund-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: refundTarget._id, reason: refundReason.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'Không thể gửi yêu cầu hoàn tiền');
      const created = payload?.data || payload;
      setRefundRequests((prev) => [created, ...prev]);
      setShowRefundModal(false);
      setRefundTarget(null);
      showToast('Đã gửi yêu cầu hoàn tiền, vui lòng chờ quản lý duyệt.');
    } catch (e) {
      setRefundError(e.message);
    } finally {
      setRefundLoading(false);
    }
  }

  function handleRescheduled(updated) {
    setBookings((prev) => prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b)));
    setDetailBooking((prev) => (prev && prev._id === updated._id ? { ...prev, ...updated } : prev));
  }

  function handleRebook(b) {
    navigate('/booking', { state: { rebookData: b } });
  }

  async function submitRebook() {
    if (!rebookTarget) return;
    setRebookError('');
    if (!rebookDate) { setRebookError('Vui lòng chọn ngày'); return; }
    if (!rebookTime) { setRebookError('Vui lòng chọn giờ'); return; }
    const selected = new Date(rebookDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) { setRebookError('Ngày phải từ hôm nay trở đi'); return; }
    setRebookLoading(true);
    try {
      const bId = rebookTarget._id || rebookTarget.id;
      const res = await fetch(`${apiBase}/bookings/${bId}/rebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingDate: rebookDate, startTime: rebookTime, voucherCode: rebookVoucherCode }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Đặt lại thất bại'); }
      setShowRebookModal(false);
      setRebookTarget(null);
      // re-fetch
      const res2 = await fetch(`${apiBase}/bookings/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (res2.ok) { const payload = await res2.json(); setBookings(Array.isArray(payload?.data || payload) ? (payload?.data || payload) : []); }
    } catch (e) { setRebookError(e.message); }
    finally { setRebookLoading(false); }
  }

  async function handleShowQR(id) {
    setQrLoading(true);
    setQrUrl('');
    setQrError('');
    setShowQR(true);
    try {
      const res = await fetch(`${apiBase}/bookings/${id}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tạo mã QR');
      const payload = await res.json();
      setQrUrl(payload?.data || payload?.url || '');
    } catch (e) {
      setQrError(e.message);
    } finally {
      setQrLoading(false);
    }
  }

  function getStatusCounts() {
    const counts = { total: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status]++;
    });
    return counts;
  }

  const stats = getStatusCounts();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="aw-card-section">
        <div className="aw-step-title"><span>•</span> LỊCH SỬ RỬA XE</div>
        <p className="aw-muted">Theo dõi các lịch đặt của bạn trên lịch tháng.</p>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Chờ xác nhận', value: stats.pending, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Đã xác nhận', value: stats.confirmed, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Hoàn thành', value: stats.completed, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Đã hủy', value: stats.cancelled, color: '#6b7280', bg: '#f9fafb' },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${s.color}20` }}>
              <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: viewMode === 'calendar' ? '#0f172a' : '#f1f5f9',
              color: viewMode === 'calendar' ? '#fff' : '#64748b',
            }}
          >
            📅 Lịch tháng
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: viewMode === 'list' ? '#0f172a' : '#f1f5f9',
              color: viewMode === 'list' ? '#fff' : '#64748b',
            }}
          >
            📋 Danh sách
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Đang tải...</div>}
      {error && <div style={{ textAlign: 'center', padding: 20, color: '#ef4444', background: '#fef2f2', borderRadius: 12 }}>{error}</div>}

      {/* ═══ CALENDAR VIEW ═══ */}
      {viewMode === 'calendar' && !loading && (
        <div className="aw-card-section" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Calendar header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          }}>
            <button onClick={handlePrevMonth} style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {MONTHS_VN[viewMonth]} {viewYear}
              </div>
              <button onClick={goToday} style={{
                marginTop: 4, padding: '3px 12px', borderRadius: 20, border: 'none',
                background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: 11,
                fontWeight: 600, cursor: 'pointer',
              }}>Hôm nay</button>
            </div>

            <button onClick={handleNextMonth} style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
            {DAYS_VN.map((d, i) => (
              <div key={d} style={{
                padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: i === 0 ? '#ef4444' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarDays.map((day, idx) => {
              const key = day.date.toISOString().split('T')[0];
              const dayBookings = bookingsByDate[key] || [];
              const isToday = isSameDay(day.date, new Date());
              const isSelected = selectedDate && isSameDay(day.date, selectedDate);
              const hasBookings = dayBookings.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day.date)}
                  style={{
                    minHeight: 72, padding: '6px 4px', cursor: 'pointer',
                    borderRight: (idx % 7) < 6 ? '1px solid #f1f5f9' : 'none',
                    borderBottom: idx < 35 ? '1px solid #f1f5f9' : 'none',
                    background: isSelected ? '#eff6ff' : isToday ? '#fefce8' : day.isCurrentMonth ? '#fff' : '#f8fafc',
                    transition: 'background 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = day.isCurrentMonth ? '#fff' : '#f8fafc'; }}
                >
                  {/* Day number */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: isToday ? '#0f172a' : 'transparent',
                    color: isToday ? '#fff' : isSelected ? '#3b82f6' : day.isCurrentMonth ? '#1e293b' : '#cbd5e1',
                  }}>
                    {day.date.getDate()}
                  </div>

                  {/* Booking dots */}
                  {hasBookings && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayBookings.slice(0, 3).map((b, i) => (
                        <div key={i} style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: b.status === 'completed' ? '#10b981'
                            : b.status === 'cancelled' ? '#94a3b8'
                            : b.status === 'pending' ? '#f59e0b'
                            : '#3b82f6',
                        }} />
                      ))}
                      {dayBookings.length > 3 && (
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>+{dayBookings.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected date panel */}
          {selectedDate && (
            <div style={{
              borderTop: '2px solid #e2e8f0', background: '#f8fafc',
              maxHeight: 340, overflow: 'auto',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {selectedDateBookings.length > 0 ? `${selectedDateBookings.length} lịch đặt` : 'Không có lịch đặt'}
                  </div>
                </div>
                <button onClick={() => setSelectedDate(null)} style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#fff', cursor: 'pointer', fontSize: 14, color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>

              {selectedDateBookings.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  Không có lịch đặt nào trong ngày này.
                </div>
              ) : (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedDateBookings.map((b) => (
                    <div
                      key={b._id}
                      onClick={() => loadDetail(b._id)}
                      style={{
                        background: '#fff', borderRadius: 12, padding: '14px 16px',
                        border: '1px solid #e2e8f0', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{b.packageName || b.packageId?.name || 'Dịch vụ'}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {b.branchName || b.branchId?.name || '—'} · {b.startTime || ''}
                          </div>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>🪪 {b.vehiclePlate || b.vehicleId?.licensePlate || '—'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {b.depositAmount > 0 && (
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                              background: b.depositPaid ? '#ecfdf5' : '#fffbeb', color: b.depositPaid ? '#059669' : '#d97706',
                              border: b.depositPaid ? '1px solid #a7f3d0' : '1px solid #fde68a'
                            }}>
                              {b.depositPaid ? `Đã cọc ${formatCurrency(b.depositAmount)}` : `Cọc ${formatCurrency(b.depositAmount)}`}
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{formatCurrency(b.totalAmount || b.finalPrice)}</span>
                        </div>
                      </div>
                      <AtRiskBanner booking={b} apiBase={apiBase} token={token} onRescheduled={handleRescheduled} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {detailBooking && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: 16,
        }} onClick={() => setDetailBooking(null)}>
          <div style={{
            width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Chi tiết đặt lịch</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>#{String(detailBooking._id).slice(-8).toUpperCase()}</div>
              </div>
              <button onClick={() => setDetailBooking(null)} style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 16,
              }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', maxHeight: '60vh', overflow: 'auto' }}>
              {/* Status */}
              <div style={{ marginBottom: 16 }}>
                <StatusBadge status={detailBooking.status} />
                <AtRiskBanner booking={detailBooking} apiBase={apiBase} token={token} onRescheduled={handleRescheduled} />
              </div>

              {/* Info rows */}
              {(() => {
                const pkgSubs = detailBooking.packageId?.subServices || [];
                const includedList = [];

                if (Array.isArray(pkgSubs)) {
                  pkgSubs.forEach(s => {
                    if (s.isOptional === false || (!s.isOptional && (s.price === 0 || !s.price))) {
                      if (!includedList.some(item => item.name === s.name)) {
                        includedList.push(s);
                      }
                    }
                  });
                }

                if (Array.isArray(detailBooking.selectedSubServices)) {
                  detailBooking.selectedSubServices.forEach(s => {
                    const sName = typeof s === 'string' ? s : s.name;
                    const sPrice = typeof s === 'object' ? s.price : 0;
                    const sOpt = typeof s === 'object' ? s.isOptional : undefined;
                    
                    if (sOpt === false || (sOpt === undefined && (sPrice === 0 || !sPrice))) {
                      if (!includedList.some(item => item.name === sName)) {
                        includedList.push({ name: sName, price: sPrice });
                      }
                    }
                  });
                }

                const extraList = [];
                if (Array.isArray(detailBooking.selectedSubServices)) {
                  detailBooking.selectedSubServices.forEach(s => {
                    const sName = typeof s === 'string' ? s : s.name;
                    const isInc = includedList.some(inc => inc.name === sName);
                    if (!isInc) {
                      if (!extraList.some(item => item.name === sName)) {
                        extraList.push(typeof s === 'object' ? s : { name: s });
                      }
                    }
                  });
                }

                return [
                  ['📦 Dịch vụ', detailBooking.packageName || detailBooking.packageId?.name || '—'],
                  ...(includedList.length > 0
                    ? [['📋 Dịch vụ bao gồm', includedList.map((sub, i) => {
                        const sName = sub.name || sub;
                        const dur = sub.duration || (detailBooking.packageId?.subServices || []).find(x => x.name === sName)?.duration;
                        return (
                          <span key={i} style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 12, marginLeft: 4, border: '1px solid #a7f3d0' }}>
                            {sName} {dur ? `(${dur}p)` : ''}
                          </span>
                        );
                      })]]
                    : []),
                  ...(extraList.length > 0
                    ? [['➕ Dịch vụ thêm', extraList.map((sub, i) => {
                        const sName = sub.name || sub;
                        const dur = sub.duration || (detailBooking.packageId?.subServices || []).find(x => x.name === sName)?.duration;
                        return (
                          <span key={i} style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, marginLeft: 4 }}>
                            + {sName} {dur ? `(${dur}p)` : ''}
                          </span>
                        );
                      })]]
                    : []),
                  ['📅 Ngày', formatDate(detailBooking.bookingDate)],
                ['⏰ Giờ', detailBooking.startTime || '—'],
                ['🏢 Chi nhánh', detailBooking.branchName || detailBooking.branchId?.name || '—'],
                ['🪪 Biển số', detailBooking.vehiclePlate || detailBooking.vehicleId?.licensePlate || '—'],
                ['💰 Thành tiền', formatCurrency(detailBooking.totalAmount || detailBooking.finalPrice)],
                ['💳 Thanh toán', detailBooking.paymentStatus === 'paid' || detailBooking.paymentStatus === 'deposit_paid' ? 'Đã thanh toán' : 'Chưa thanh toán'],
                ['📍 Loại đặt', detailBooking.bookingType === 'recurring' ? 'Định kỳ' : detailBooking.bookingType === 'slot_pack_usage' ? 'Gói lượt' : '1 lần'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
                  <div style={{ textAlign: 'right', maxWidth: '60%' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value}</span>
                  </div>
                </div>
              ))}

              {detailBooking.depositAmount > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>🔒 Đặt cọc {Math.round((detailBooking.depositAmount || 0) / ((detailBooking.totalAmount || detailBooking.finalPrice || 1)) * 100)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{formatCurrency(detailBooking.depositAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>📋 Còn lại (thanh toán sau)</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{formatCurrency(Math.max(0, (detailBooking.totalAmount || detailBooking.finalPrice || 0) - (detailBooking.depositAmount || 0)))}</span>
                  </div>
                  {detailBooking.depositPaid && (
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, background: '#ecfdf5', color: '#059669', fontSize: 12, fontWeight: 700, border: '1px solid #a7f3d0' }}>
                        ✅ Đã đặt cọc {formatCurrency(detailBooking.depositAmount)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Feedback */}
              {detailBooking.feedback && (
                <div style={{ marginTop: 16, padding: 14, background: '#fffbeb', borderRadius: 12, border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>⭐ Đánh giá</div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} style={{ fontSize: 16, color: s <= (detailBooking.rating || 0) ? '#f59e0b' : '#d1d5db' }}>★</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: '#92400e', fontStyle: 'italic' }}>"{detailBooking.feedback}"</div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(detailBooking.status === 'pending' || detailBooking.status === 'confirmed') && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleCancel(detailBooking._id)} disabled={cancelLoading} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #fecaca',
                    background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: cancelLoading ? 'not-allowed' : 'pointer', opacity: cancelLoading ? 0.6 : 1,
                  }}>
                    {cancelLoading ? 'Đang hủy...' : '🗑 Hủy đơn'}
                  </button>
                  <button onClick={() => handleShowQR(detailBooking._id)} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #bfdbfe',
                    background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    📱 QR Check-in
                  </button>
                </div>
              )}
              {(detailBooking.status === 'completed' || detailBooking.status === 'cancelled') && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleRebook(detailBooking)} disabled={rebookLoading} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #a7f3d0',
                    background: '#ecfdf5', color: '#059669', fontSize: 13, fontWeight: 600, cursor: rebookLoading ? 'not-allowed' : 'pointer', opacity: rebookLoading ? 0.6 : 1,
                  }}>
                    {rebookLoading ? 'Đang đặt lại...' : '🔄 Đặt lại'}
                  </button>
                  {detailBooking.status === 'completed' && (
                    <button onClick={openReviewForm} style={{
                      flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                      background: detailBooking.rating ? '#fffbeb' : '#f59e0b',
                      color: detailBooking.rating ? '#b45309' : '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: detailBooking.rating ? '1px solid #fde68a' : 'none',
                    }}>
                      {detailBooking.rating ? '✏️ Sửa đánh giá' : '⭐ Đánh giá'}
                    </button>
                  )}
                </div>
              )}
              {['paid', 'deposit_paid'].includes(detailBooking.paymentStatus) && (() => {
                const existing = findRefundRequest(detailBooking._id);
                if (existing?.status === 'pending') {
                  return (
                    <div style={{
                      padding: '10px 0', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a',
                      textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#b45309',
                    }}>
                      ⏳ Yêu cầu hoàn tiền đang chờ duyệt
                    </div>
                  );
                }
                return (
                  <button onClick={() => openRefundRequest(detailBooking)} style={{
                    width: '100%', padding: '12px 0', borderRadius: 12, border: '1px solid #fecaca',
                    background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    💸 Yêu cầu hoàn tiền
                  </button>
                );
              })()}
              <button onClick={() => setDetailBooking(null)} style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REVIEW MODAL ═══ */}
      {showReview && detailBooking && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16,
        }} onClick={() => setShowReview(false)}>
          <div style={{
            width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Đánh giá dịch vụ</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {detailBooking.packageName || detailBooking.packageId?.name || 'Dịch vụ'}
                </div>
              </div>
              <button onClick={() => setShowReview(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {/* Star selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                  Chất lượng dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHoverStar(s)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setReviewRating(s)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
                        fontSize: 36, lineHeight: 1,
                        color: s <= (hoverStar || reviewRating) ? '#f59e0b' : '#d1d5db',
                        transform: s <= (hoverStar || reviewRating) ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.1s',
                      }}
                    >★</button>
                  ))}
                </div>
                {reviewRating > 0 && (
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
                    {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][reviewRating]}
                  </div>
                )}
              </div>

              {/* Text */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Nhận xét (tuỳ chọn)
                </div>
                <textarea
                  ref={reviewTextRef}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ..."
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, resize: 'none',
                    border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    background: '#f8fafc',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{reviewText.length}/500</div>
              </div>

              {reviewError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 8 }}>
                  {reviewError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowReview(false)} style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Huỷ</button>
              <button
                onClick={submitReview}
                disabled={reviewLoading || reviewRating === 0}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: reviewRating === 0 ? '#d1d5db' : '#f59e0b',
                  color: reviewRating === 0 ? '#9ca3af' : '#fff',
                  fontSize: 14, fontWeight: 700, cursor: reviewRating === 0 ? 'not-allowed' : 'pointer',
                  opacity: reviewLoading ? 0.7 : 1,
                }}
              >
                {reviewLoading ? 'Đang gửi...' : '⭐ Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ QR MODAL ═══ */}
      {showQR && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16,
        }} onClick={() => setShowQR(false)}>
          <div style={{
            width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Mã QR Check-in</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Đưa mã này cho nhân viên khi đến rửa xe</div>
              {qrLoading ? (
                <div style={{ padding: '60px 0', color: '#94a3b8' }}>Đang tạo mã QR...</div>
              ) : qrUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <img src={qrUrl} alt="QR Check-in" style={{ width: 200, height: 200, borderRadius: 12 }} />
                  <a href={qrUrl} target="_blank" rel="noopener noreferrer" style={{
                    padding: '8px 20px', borderRadius: 10, background: '#0f172a', color: '#fff',
                    fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  }}>🔗 Mở trong tab mới</a>
                </div>
              ) : qrError ? (
                <div style={{ padding: '60px 0', color: '#ef4444', fontSize: 13 }}>{qrError}</div>
              ) : (
                <div style={{ padding: '60px 0', color: '#94a3b8' }}>Không có dữ liệu QR</div>
              )}
              <button onClick={() => setShowQR(false)} style={{
                width: '100%', marginTop: 20, padding: '12px 0', borderRadius: 12, border: 'none',
                background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONFIRM CANCEL MODAL ═══ */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16,
        }} onClick={() => { if (!cancelLoading) { setShowCancelConfirm(false); setCancelTarget(null); setCancelError(''); setCancelReason(''); setCancelOtp(''); setCancelStep(1); setCancelPreview(null); } }}>
          <div style={{
            width: '100%', maxWidth: 380, background: '#fff', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{cancelStep === 1 ? '🗑️' : '📩'}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                {cancelStep === 1 ? 'Xác nhận hủy đơn' : 'Nhập mã xác thực OTP'}
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0, marginBottom: 16 }}>
                {cancelStep === 1 
                  ? 'Bạn có chắc muốn hủy đơn này? Hành động này không thể hoàn tác.' 
                  : 'Chúng tôi đã gửi mã OTP gồm 6 chữ số đến email của bạn. Vui lòng kiểm tra hộp thư.'}
              </p>

              {cancelStep === 1 ? (
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  {cancelPreview && cancelPreview.totalPaid > 0 && (
                    <div style={{
                      marginBottom: 12, padding: '10px 12px', borderRadius: 10, fontSize: 13,
                      background: cancelPreview.isLateCancel ? '#fffbe6' : '#e6f4ea',
                      border: cancelPreview.isLateCancel ? '1px solid #ffe58f' : '1px solid #b7eb8f',
                      color: cancelPreview.isLateCancel ? '#873800' : '#135200'
                    }}>
                      {cancelPreview.isLateCancel ? (
                        <>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Hủy sát giờ hẹn ({cancelPreview.minutesBefore} phút trước)</div>
                          {cancelPreview.penaltyAmount > 0 && (
                            <div style={{ color: '#cf1322', fontWeight: 600 }}>Phí phạt: -{cancelPreview.penaltyAmount.toLocaleString('vi-VN')}₫ ({cancelPreview.penaltyPercent}%)</div>
                          )}
                          {cancelPreview.refundAmount > 0 ? (
                            <div style={{ color: '#389e0d', fontWeight: 600 }}>Hoàn lại vào ví: {cancelPreview.refundAmount.toLocaleString('vi-VN')}₫</div>
                          ) : (
                            <div style={{ color: '#cf1322', fontWeight: 600 }}>Mất toàn bộ tiền cọc — không hoàn lại.</div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontWeight: 700, color: '#389e0d' }}>✅ Hoàn lại 100% ({cancelPreview.totalPaid.toLocaleString('vi-VN')}₫) vào ví</div>
                      )}
                    </div>
                  )}
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                    Lý do hủy <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Nhập lý do hủy..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                      fontSize: 13, color: '#0f172a', outline: 'none', resize: 'none', background: '#f8fafc',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #3b82f6'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                    Mã OTP <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={cancelOtp}
                    onChange={(e) => setCancelOtp(e.target.value)}
                    placeholder="Nhập mã 6 số"
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                      fontSize: 18, color: '#0f172a', outline: 'none', background: '#f8fafc',
                      fontFamily: 'inherit', textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold'
                    }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #3b82f6'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  />
                </div>
              )}

              {cancelError && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>{cancelError}</div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => { setShowCancelConfirm(false); setCancelTarget(null); setCancelError(''); setCancelReason(''); setCancelOtp(''); setCancelStep(1); }}
                  disabled={cancelLoading}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Đóng</button>
                <button
                  onClick={cancelStep === 1 ? requestCancelOtp : confirmCancel}
                  disabled={cancelLoading}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                    background: cancelLoading ? '#fca5a5' : '#ef4444', color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: cancelLoading ? 'not-allowed' : 'pointer',
                    opacity: cancelLoading ? 0.7 : 1,
                  }}
                >{cancelLoading ? 'Đang xử lý...' : (cancelStep === 1 ? 'Lấy mã OTP' : 'Xác nhận hủy')}</button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ═══ REFUND REQUEST MODAL ═══ */}
      {showRefundModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16,
        }} onClick={() => { if (!refundLoading) { setShowRefundModal(false); setRefundTarget(null); setRefundError(''); } }}>
          <div style={{
            width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Yêu cầu hoàn tiền</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {refundTarget?.packageName || refundTarget?.packageId?.name || 'Dịch vụ'} · {formatCurrency(refundTarget?.totalAmount || refundTarget?.finalPrice)}
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Yêu cầu của bạn sẽ được gửi tới quản lý chi nhánh xem xét. Vui lòng mô tả rõ lý do để được duyệt nhanh hơn.
              </p>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Lý do hoàn tiền <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Ví dụ: dịch vụ chưa đạt yêu cầu, đặt nhầm lịch..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, resize: 'none',
                  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  background: '#f8fafc',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{refundReason.length}/500</div>
              {refundError && (
                <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>
                  {refundError}
                </div>
              )}
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowRefundModal(false); setRefundTarget(null); setRefundError(''); }}
                disabled={refundLoading}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #e2e8f0',
                  background: '#f8fafc', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >Huỷ</button>
              <button
                onClick={submitRefundRequest}
                disabled={refundLoading}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: refundLoading ? '#fca5a5' : '#ef4444', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: refundLoading ? 'not-allowed' : 'pointer',
                  opacity: refundLoading ? 0.7 : 1,
                }}
              >{refundLoading ? 'Đang gửi...' : '💸 Gửi yêu cầu'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {viewMode === 'list' && !loading && (
        <div className="aw-card-section">
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Chưa có lịch đặt nào</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookings.map((b) => (
                <div
                  key={b._id}
                  onClick={() => loadDetail(b._id)}
                  style={{
                    background: '#fff', borderRadius: 14, padding: '16px 18px',
                    border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(59,130,246,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{b.packageName || b.packageId?.name || 'Dịch vụ'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                        {formatDate(b.bookingDate)} · {b.startTime || ''} · {b.branchName || b.branchId?.name || '—'}
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>🪪 {b.vehiclePlate || b.vehicleId?.licensePlate || '—'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {b.depositAmount > 0 && (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: b.depositPaid ? '#ecfdf5' : '#fffbeb', color: b.depositPaid ? '#059669' : '#d97706',
                          border: b.depositPaid ? '1px solid #a7f3d0' : '1px solid #fde68a'
                        }}>
                          {b.depositPaid ? `Đã cọc ${formatCurrency(b.depositAmount)}` : `Cọc ${formatCurrency(b.depositAmount)}`}
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{formatCurrency(b.totalAmount || b.finalPrice)}</span>
                    </div>
                  </div>
                  <AtRiskBanner booking={b} apiBase={apiBase} token={token} onRescheduled={handleRescheduled} />
                  {(b.status === 'completed' || b.status === 'cancelled') && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); handleRebook(b); }}
                        disabled={rebookLoading}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: '1px solid #a7f3d0',
                          background: '#ecfdf5', color: '#059669', fontSize: 12, fontWeight: 600,
                          cursor: rebookLoading ? 'not-allowed' : 'pointer', opacity: rebookLoading ? 0.6 : 1,
                      }}>
                        {rebookLoading ? '...' : '🔄 Đặt lại'}
                      </button>
                      
                      {b.status === 'completed' && ['paid', 'deposit_paid'].includes(b.paymentStatus) && (() => {
                        const existing = findRefundRequest(b._id);
                        if (existing?.status === 'pending') {
                          return (
                            <div style={{
                              padding: '6px 14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a',
                              fontSize: 12, fontWeight: 600, color: '#b45309', display: 'flex', alignItems: 'center'
                            }}>
                              ⏳ Đang chờ hoàn tiền
                            </div>
                          );
                        }
                        return (
                          <button onClick={(e) => { e.stopPropagation(); openRefundRequest(b); }} style={{
                            padding: '6px 14px', borderRadius: 8, border: '1px solid #fecaca',
                            background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>
                            💸 Yêu cầu hoàn tiền
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ VOUCHER PICKER MODAL (FOR REBOOK) ═══ */}
      {showRebookVoucherModal && rebookTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', padding: 16,
        }} onClick={() => setShowRebookVoucherModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 24, width: '100%', maxWidth: 450, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ flexShrink: 0, borderBottom: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 18 }}>Chọn Ưu Đãi</h3>
              <button
                onClick={() => setShowRebookVoucherModal(false)}
                style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, background: '#f8fafc', color: '#94a3b8', border: 'none', cursor: 'pointer',
                }}
              >✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <VoucherPicker
                apiBase={apiBase}
                token={token}
                selected={{ code: rebookVoucherCode }}
                onSelect={(voucher) => {
                  if (voucher) {
                    setRebookVoucherCode(voucher.code);
                    setRebookVoucherDiscount(
                      voucher.type === 'percentage'
                        ? Math.min((voucher.maxDiscount || 9999999), Math.floor(((rebookTarget?.packageId?.price || 0) + (rebookTarget?.selectedSubServices || []).reduce((sum, ss) => sum + (ss.price || 0), 0)) * voucher.value / 100))
                        : voucher.value
                    );
                  } else {
                    setRebookVoucherCode('');
                    setRebookVoucherDiscount(0);
                  }
                  setShowRebookVoucherModal(false);
                }}
                orderAmount={(rebookTarget?.packageId?.price || 0) + (rebookTarget?.selectedSubServices || []).reduce((sum, ss) => sum + (ss.price || 0), 0)}
                compact
                branchId={rebookTarget?.branchId?._id || rebookTarget?.branchId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
