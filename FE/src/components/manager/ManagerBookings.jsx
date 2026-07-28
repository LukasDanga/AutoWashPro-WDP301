import React, { useCallback, useEffect, useRef, useState, useMemo, Fragment } from 'react';
import {
  ArrowClockwise,
  CalendarCheck,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
  X,
  CheckCircle,
  XCircle,
  Warning,
  ClockCounterClockwise,
  ArrowLeft,
  CircleDashed,
  PlayCircle,
  Eye,
  CalendarPlus,
  Star,
  QrCode,
  Lightning,
  Receipt,
  Car,
  Clock,
  CurrencyCircleDollar,
  Printer,
  CaretLeft,
  CalendarBlank,
  Table as TableIcon,
  Rows,
  Package,
  Buildings,
  CreditCard,
  Tag,
  Lock,
  Wallet,
  Bank,
} from '@phosphor-icons/react';
import useSSE from '@/hooks/useSSE';
import TierBadge from '@/components/ui/TierBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/lib/toast';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import ManagerQuickCheckin from '@/components/manager/ManagerQuickCheckin';

/* ── helpers ── */
function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getStoredToken()}`,
      ...opts.headers,
    },
  });
}
async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; }
  catch { return `Lỗi ${res.status}`; }
}

function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

/* ── status config ── */
const STATUS_MAP = {
  pending:     { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700' },
  confirmed:   { label: 'Đã xác nhận', cls: 'bg-indigo-50 text-indigo-700' },
  checked_in:  { label: 'Đã check-in', cls: 'bg-cyan-50 text-cyan-700' },
  in_progress: { label: 'Đang thực hiện', cls: 'bg-blue-50 text-blue-700' },
  completed:   { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:   { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500' },
};

const NEXT_STATUS = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['checked_in', 'cancelled'],
  checked_in:  ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

const TYPE_MAP = {
  single: { label: 'Đặt 1 lần', cls: 'bg-slate-100 text-slate-600' },
  recurring: { label: 'Định kỳ', cls: 'bg-indigo-50 text-indigo-700' },
  slot_pack_usage: { label: 'Gói lượt', cls: 'bg-fuchsia-50 text-fuchsia-700' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

/* ── status update dropdown ── */
function StatusMenu({ bookingId, current, onUpdated, notify }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // Cancel modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const nexts = NEXT_STATUS[current];
  if (!nexts) return <StatusBadge status={current} />;

  const update = async (newStatus) => {
    setOpen(false);
    if (newStatus === 'cancelled') {
      setShowCancelModal(true);
      setCancelReason('');
      setCancelError('');
      return;
    }
    
    setBusy(true);
    try {
      const res = await api(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      onUpdated(payload?.data ?? payload);
    } catch (err) {
      notify(err.message, 'error');
    } finally { setBusy(false); }
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn');
      return;
    }
    setBusy(true);
    setCancelError('');
    try {
      const res = await api(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: cancelReason.trim() }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      onUpdated(payload?.data ?? payload);
      setShowCancelModal(false);
      notify('Hủy đơn thành công', 'success');
    } catch (err) {
      setCancelError(err.message);
    } finally { setBusy(false); }
  };

  const handleCompleteRefund = async () => {
    setBusy(true);
    try {
      const res = await api(`/bookings/${bookingId}/refund-complete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      onUpdated(payload?.data ?? payload);
      notify('Đã xác nhận hoàn tiền', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((p) => !p)}
          disabled={busy}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors hover:opacity-80 disabled:opacity-50 ${STATUS_MAP[current]?.cls || 'bg-slate-100 text-slate-500'}`}
        >
          {busy ? <Spinner size={11} /> : null}
          <span>{STATUS_MAP[current]?.label || current}</span>
          <CaretDown size={10} className="opacity-70" />
        </button>
        {open && (
          <div className="absolute right-0 top-7 z-[9999] min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {nexts.map((s) => (
              <button key={s} onClick={() => update(s)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors">
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { if (!busy) setShowCancelModal(false); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">🗑</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận hủy đơn</h3>
            <p className="text-sm text-slate-500 mb-4">Bạn có chắc muốn hủy đơn này? Hành động này không thể hoàn tác.</p>
            <div className="text-left mb-6">
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Lý do hủy <span className="text-red-500">*</span></label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                rows={3} maxLength={500} placeholder="Nhập lý do hủy đơn (bắt buộc)..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
            </div>
            {cancelError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm text-left">{cancelError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                disabled={busy}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Không, giữ lại
              </button>
              <button onClick={confirmCancel}
                disabled={busy}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50">
                {busy ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── "sắp bị auto-cancel" cảnh báo + nút gia hạn thủ công (đồng bộ với QR check-in) ── */
function AtRiskNotice({ booking, onUpdated, notify }) {
  const [busy, setBusy] = useState(false);
  if (!['pending', 'confirmed'].includes(booking.status) || !booking.lateWarningSentAt) return null;

  const extend = async () => {
    setBusy(true);
    try {
      const res = await api(`/bookings/${booking._id}/extend-grace`, { method: 'PATCH' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Gia hạn thất bại');
      onUpdated(payload?.data ?? payload);
      notify('Đã gia hạn thêm 15 phút cho đơn', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700" title="Khách chưa check-in, sắp bị hệ thống tự hủy">
        <Clock size={10} weight="fill" /> Sắp hết hạn
      </span>
      {(booking.graceExtensionMinutes || 0) < 15 && (
        <button onClick={extend} disabled={busy}
          className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 disabled:opacity-50 transition-colors">
          {busy ? '...' : 'Gia hạn +5p'}
        </button>
      )}
      {booking.suggestedSlotStartTime && (
        <span className="text-[10px] text-slate-400">Gợi ý đổi giờ: {booking.suggestedSlotStartTime}</span>
      )}
    </div>
  );
}

/* ── rebook modal ── */
function RebookModal({ booking, onClose, onRebooked, notify }) {
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState(booking.startTime || '09:00');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!date || !time) return;
    setBusy(true); setErr('');
    try {
      const res = await api(`/bookings/${booking._id}/rebook`, {
        method: 'POST',
        body: JSON.stringify({ bookingDate: date, startTime: time }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đặt lại thất bại');
      onRebooked(data.data || data);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <CalendarPlus size={18} className="text-blue-500" />
            Đặt lại lịch
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
            <p className="font-medium text-slate-700">{booking.packageId?.name || 'Dịch vụ'}</p>
            <p className="text-xs text-slate-500">{booking.userId?.name} · {booking.vehicleId?.licensePlate}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ngày đặt mới</label>
              <input type="date" value={date} min={tomorrow}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Giờ bắt đầu</label>
              <input type="time" value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={submit} disabled={busy || !date || !time}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
            {busy ? '...' : <><CalendarPlus size={14} /> Đặt lại</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── QR display modal ── */
/**
 * Trạng thái hiển thị QR theo vòng đời đơn:
 *  - 'active'     : đã xác nhận → hiện mã QR để khách quét check-in
 *  - 'checked_in' : đã check-in (hoặc đang/đã hoàn thành) → mã đã dùng
 *  - 'expired'    : đơn bị hệ thống tự hủy do quá hạn → hết hạn
 *  - null         : không hiển thị QR (pending, đơn hủy thủ công…)
 */
function getQrMode(b) {
  if (!b) return null;
  if (b.status === 'confirmed') return 'active';
  if (['checked_in', 'in_progress', 'completed'].includes(b.status)) return 'checked_in';
  if (b.status === 'cancelled' && b.cancelledBy === 'system') return 'expired';
  return null;
}

// Đơn "mới": đang chờ xác nhận (chưa được manager xử lý)
function isNewBooking(b) {
  return b?.status === 'pending';
}

function QRDisplayModal({ booking, onClose }) {
  const mode = getQrMode(booking);
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(mode === 'active');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (mode !== 'active') return;
    api(`/bookings/${booking._id}/qr`)
      .then((r) => r.json())
      .then((d) => { setQrUrl(d?.data?.qrDataUrl || null); })
      .catch(() => setErr('Không thể tạo QR'))
      .finally(() => setLoading(false));
  }, [booking._id, mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={18} weight="fill" className="text-blue-600" />
            <h2 className="font-semibold text-slate-800">QR Check-in</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {mode === 'active' && (
            <>
              <p className="text-sm text-slate-500 text-center">
                Cho khách hàng dùng điện thoại quét mã này để check-in.
              </p>
              {loading && <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />}
              {err && <p className="text-sm text-red-500">{err}</p>}
              {qrUrl && (
                <div className="rounded-2xl border-4 border-slate-100 bg-white p-3 shadow-inner">
                  <img src={qrUrl} alt="QR check-in" className="w-64 h-64 object-contain" />
                </div>
              )}
            </>
          )}

          {mode === 'checked_in' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative rounded-2xl border-4 border-emerald-100 bg-emerald-50/60 p-6">
                <QrCode size={120} weight="duotone" className="text-emerald-200" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rotate-[-12deg] rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                    ĐÃ CHECK-IN
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-emerald-700">Khách đã check-in thành công</p>
              {booking.checkInTime && (
                <p className="text-xs text-slate-500">Vào lúc {new Date(booking.checkInTime).toLocaleString('vi-VN')}</p>
              )}
            </div>
          )}

          {mode === 'expired' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative rounded-2xl border-4 border-red-100 bg-red-50/60 p-6">
                <QrCode size={120} weight="duotone" className="text-red-200" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rotate-[-12deg] rounded-lg bg-red-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                    HẾT HẠN
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-red-600">Mã đã hết hạn</p>
              <p className="text-xs text-slate-500 text-center">Đơn đã bị hệ thống tự động hủy do khách không đến đúng giờ.</p>
            </div>
          )}

          <div className="text-center space-y-0.5">
            <p className="text-xs font-semibold text-slate-700">{booking.userId?.name || '—'}</p>
            <p className="text-xs text-slate-500">
              {booking.packageId?.name} · {booking.startTime}–{booking.endTime}
            </p>
            <p className="font-mono text-[10px] text-slate-400 mt-1">#{String(booking._id).slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── print receipt modal ── */
function PrintReceiptModal({ booking, onClose }) {
  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const formatDate = (dateString) => { const d = new Date(dateString); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };

  const detailBooking = booking;
  const displayTotal = detailBooking.isGroup ? (detailBooking.groupTotalPrice || 0) : (detailBooking.totalAmount || detailBooking.finalPrice || 0);
  const displayDeposit = detailBooking.isGroup ? (detailBooking.groupTotalDeposit || 0) : (detailBooking.depositAmount || 0);
  const displayId = detailBooking.isGroup ? (detailBooking.recurringGroupId || detailBooking._id) : detailBooking._id;
  const displayInvoiceNumber = String(displayId).slice(-8).toUpperCase();
  const recurringGroupBookings = detailBooking.children || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 no-print-bg"
      onClick={onClose}>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-printable-area, #receipt-printable-area * { visibility: visible; }
          #receipt-printable-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
          .no-print-bg { background: transparent !important; }
        }
      `}</style>
      
      <div id="receipt-printable-area" className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] font-sans text-slate-900 relative" onClick={e => e.stopPropagation()}>
        
        {/* Close Button Absolute */}
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors no-print">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        {/* Receipt Body */}
        <div className="px-10 py-12 overflow-y-auto flex-1 selection:bg-slate-200">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-black tracking-tight">Biên lai</h2>
              <div className="grid grid-cols-[140px_1fr] gap-y-1 text-[13px]">
                <div className="font-semibold text-black">Mã hóa đơn</div>
                <div className="text-black">AWP-{displayInvoiceNumber}</div>
                <div className="font-semibold text-black">Mã biên lai</div>
                <div className="text-black">{displayId}</div>
                <div className="font-semibold text-black">Ngày thanh toán</div>
                <div className="text-black">{formatDate(detailBooking.updatedAt || detailBooking.bookingDate)}</div>
              </div>
            </div>
            <div>
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
              <div className="font-semibold text-black mb-1">Người thanh toán</div>
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
              {formatCurrency(displayTotal)} {detailBooking.paymentStatus === 'paid' ? `đã thanh toán vào ${formatDate(detailBooking.updatedAt || detailBooking.bookingDate)}` : `cần thanh toán vào ${formatDate(detailBooking.bookingDate)}`}
            </h3>
            <p className="text-[13px] text-black max-w-xl leading-relaxed">
              Nếu quý khách chọn chuyển khoản ngân hàng,<br/>
              vui lòng chuyển tới tài khoản dưới đây thay vì thanh toán tiền mặt.<br/>
              --------------------------------<br/>
              THÔNG TIN THANH TOÁN:<br/>
              AutoWash Pro<br/>
              Hồ Chí Minh, Vietnam
            </p>
            <p className="text-[13px] text-black mt-4">
              VAT được tính trên tổng giá trị hóa đơn (10%)
            </p>
          </div>

          {/* Table */}
          <div className="mb-14">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 text-left font-normal text-black w-1/2">Mô tả</th>
                  <th className="py-2 text-right font-normal text-black">SL</th>
                  <th className="py-2 text-right font-normal text-black">Đơn giá</th>
                  <th className="py-2 text-right font-normal text-black">Thuế</th>
                  <th className="py-2 text-right font-normal text-black">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-left align-top">
                    <div className="font-normal text-black">{detailBooking.packageName || detailBooking.packageId?.name || 'Dịch vụ rửa xe'}</div>
                    {!detailBooking.isGroup && <div className="text-black">{formatDate(detailBooking.bookingDate)} • {detailBooking.startTime || '—'}</div>}
                    {detailBooking.isGroup && (
                      <div className="mt-2 space-y-1">
                        {recurringGroupBookings.map((rb, idx) => (
                          <div key={idx} className="text-slate-600 text-xs flex gap-2 items-center">
                            <span>Buổi {idx + 1}: {formatDate(rb.bookingDate)} • {rb.startTime}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100">{STATUS_MAP[rb.status]?.label || rb.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-right text-black align-top">{detailBooking.isGroup ? detailBooking.groupCount || recurringGroupBookings.length : 1}</td>
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
                  <span className="text-black">Tạm tính</span>
                  <span className="text-black">{formatCurrency(displayTotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-black">Tổng chưa thuế</span>
                  <span className="text-black">{formatCurrency(Math.round((displayTotal) * 0.9))}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-black">VAT - Vietnam (10% của {formatCurrency(Math.round((displayTotal) * 0.9))})</span>
                  <span className="text-black">{formatCurrency(Math.round((displayTotal) * 0.1))}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-normal text-black">Tổng cộng</span>
                  <span className="font-normal text-black">{formatCurrency(displayTotal)}</span>
                </div>
                {detailBooking.paymentStatus === 'deposit_paid' && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-normal text-black">Đã đặt cọc</span>
                    <span className="font-normal text-black">-{formatCurrency(displayDeposit || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-black">
                  <span className="font-bold text-black">Số tiền {detailBooking.paymentStatus === 'paid' ? 'đã thanh toán' : 'cần thanh toán'}</span>
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
            <h3 className="text-xl font-bold text-black mb-4">Lịch sử thanh toán</h3>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 text-left font-normal text-black">Phương thức</th>
                  <th className="py-2 text-left font-normal text-black">Ngày</th>
                  <th className="py-2 text-right font-normal text-black">Đã trả</th>
                  <th className="py-2 text-right font-normal text-black">Mã biên lai</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-left text-black">
                    {detailBooking.paymentStatus === 'paid' ? 'Chuyển khoản' : (detailBooking.paymentStatus === 'deposit_paid' ? 'Đặt cọc' : 'Chưa thanh toán')}
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
        </div>

        {/* Footer Actions (Sticky) - Hide on Print */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 no-print">
          <button onClick={handlePrint}
            className="w-full px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800 transition-colors text-center">
            In hóa đơn
          </button>
        </div>

      </div>
    </div>
  );
}
function BookingDetailsTab({ booking, onBack, onUpdated, notify }) {
  const [busy, setBusy] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [availableSubServices, setAvailableSubServices] = useState([]);
  const [selectedNewSubs, setSelectedNewSubs] = useState([]);
  const [addingService, setAddingService] = useState(false);

  const handleOpenAddService = async () => {
    setShowAddService(true);
    setAvailableSubServices([]);
    setSelectedNewSubs([]);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/packages`);
      if (res.ok) {
        const data = await res.json();
        const allPackages = data.data || [];
        const currentPackage = allPackages.find(p => p._id === (booking.packageId?._id || booking.packageId));
        const allSubs = [];
        if (currentPackage && currentPackage.subServices) {
          currentPackage.subServices.forEach(s => {
            if (s.isOptional !== false && s.price > 0 && !allSubs.some(x => x.name === s.name)) {
              allSubs.push(s);
            }
          });
        }
        setAvailableSubServices(allSubs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitAddServices = async () => {
    if (selectedNewSubs.length === 0 || !booking) return;
    setAddingService(true);
    try {
      const bId = booking._id || booking.id;
      const updatedSubs = [...(booking.selectedSubServices || []), ...selectedNewSubs].map(s => s.name || s);
      const res = await api(`/bookings/${bId}/sub-services`, {
        method: 'PATCH',
        body: JSON.stringify({ subServices: updatedSubs }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      notify('Đã thêm dịch vụ thành công!', 'success');
      setShowAddService(false);
      setSelectedNewSubs([]);
      onUpdated(payload?.data || payload);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setAddingService(false);
    }
  };

  const handleRemoveSubService = async (b, subName) => {
    try {
      const bId = b._id || b.id;
      const updatedSubs = (b.selectedSubServices || []).filter(s => s.name !== subName).map(s => s.name || s);
      const res = await api(`/bookings/${bId}/sub-services`, {
        method: 'PATCH',
        body: JSON.stringify({ subServices: updatedSubs }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      notify('Đã xóa dịch vụ thành công!', 'success');
      onUpdated(payload?.data || payload);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const [showQR, setShowQR] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [confirmCash, setConfirmCash] = useState(false);
  const [managerPayMethod, setManagerPayMethod] = useState(null);
  const stages = [
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'confirmed', label: 'Đã xác nhận' },
    { id: 'checked_in', label: 'Đã check-in' },
    { id: 'in_progress', label: 'Đang thực hiện' },
    { id: 'completed', label: 'Hoàn thành' },
  ];

  // Nhãn nút chuyển bước theo từng giai đoạn (xác nhận / check-in khi khách đến / …)
  const STAGE_ACTION = {
    confirmed: 'Xác nhận đơn',
    checked_in: 'Khách đã đến — Check-in',
    in_progress: 'Bắt đầu rửa',
    completed: 'Hoàn thành',
  };

  const currentStageIndex = stages.findIndex(s => s.id === booking.status);

  const updateStatus = async (newStatus) => {
    setBusy(true);
    try {
      const res = await api(`/bookings/${booking._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      onUpdated(payload?.data ?? payload);
    } catch (err) {
      notify(err.message, 'error');
    } finally { setBusy(false); }
  };

  const handleCashPayment = async () => {
    setConfirmCash(false);
    setBusy(true);
    const method = managerPayMethod || 'cash';
    try {
      const res = await api(`/payments`, {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking._id, method, paymentType: booking.depositPaid ? 'remaining' : 'full' }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      onUpdated({ ...booking, paymentStatus: 'paid', paidAt: new Date().toISOString(), paymentMethod: method });
      notify(`Xác nhận thanh toán ${method === 'cash' ? 'tiền mặt' : method === 'bank' ? 'chuyển khoản' : 'VNPay'} thành công!`, 'success');
    } catch (err) {
      notify(err.message || 'Lỗi xác nhận thanh toán', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-800">Chi tiết đơn đặt lịch <span className="text-blue-600 font-mono text-base">#{booking._id.substring(18).toUpperCase()}</span></h2>
          <StatusBadge status={booking.status} />
        </div>
        
        {/* Stages Tracking */}
        {booking.status !== 'cancelled' ? (
          <div className="mb-10 mt-6 relative px-8">
            <div className="absolute top-1/2 left-10 right-10 h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
            <div className="relative flex justify-between">
              {stages.map((stage, idx) => {
                const isPast = currentStageIndex > idx || booking.status === 'completed';
                const isCurrent = currentStageIndex === idx;
                const Icon = isPast ? CheckCircle : isCurrent ? PlayCircle : CircleDashed;
                const color = isPast ? 'text-emerald-500 bg-emerald-50' : isCurrent ? 'text-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'text-slate-300 bg-white';
                
                return (
                  <div key={stage.id} className="flex flex-col items-center gap-2 bg-white px-4 z-10 min-w-[120px]">
                    <div className={`rounded-full p-1.5 ${color} transition-all duration-300`}>
                      <Icon size={24} weight={isPast ? 'fill' : isCurrent ? 'duotone' : 'regular'} />
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {stage.label}
                    </span>
                    {isCurrent && stage.id !== 'completed' && (
                      <button disabled={busy} onClick={() => updateStatus(stages[idx + 1].id)}
                        className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow disabled:opacity-50 transition-all">
                        {busy ? 'Đang cập nhật...' : (STAGE_ACTION[stages[idx + 1].id] || `Chuyển sang ${stages[idx + 1].label}`)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-xl bg-rose-50 p-4 border border-rose-100 text-rose-700 flex items-center gap-2">
            <XCircle size={20} weight="fill" />
            <span className="text-sm font-medium">Đơn đặt lịch này đã bị hủy.</span>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-6 rounded-xl bg-slate-50 p-5 border border-slate-100">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Khách hàng</h3>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-medium text-slate-800">{booking.userId?.name || '—'}</p>
              {booking.userId?.tier && <TierBadge tier={booking.userId.tier} />}
            </div>
            <p className="text-sm text-slate-600">{booking.userId?.phone || '—'}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.userId?.email || ''}</p>
            {(booking.vehiclePlate || booking.vehicleId?.licensePlate) && (
              <div className="mt-2 flex flex-col items-start gap-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  <span>Biển số:</span>
                  <span className="font-mono text-blue-700">{booking.vehiclePlate || booking.vehicleId?.licensePlate}</span>
                </div>
                {booking.vehicleId?.vehicleType && (
                  <div className="inline-flex text-[11px] text-slate-600 font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 rounded">
                    Loại xe: <span className="ml-1 text-slate-800 capitalize">{booking.vehicleId.vehicleType}</span>
                    {booking.vehicleId.brand ? ` • ${booking.vehicleId.brand}` : ''}
                    {booking.vehicleId.color ? ` • ${booking.vehicleId.color}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dịch vụ</h3>
            <p className="font-medium text-slate-800">{booking.packageId?.name || '—'}</p>
            {booking.selectedSubServices?.length > 0 && (
              <div className="mt-1 mb-2 flex flex-wrap gap-1">
                {booking.selectedSubServices.map((sub, idx) => (
                  <div key={idx} onClick={(e) => { e.stopPropagation(); handleRemoveSubService(booking, sub.name); }} className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer">
                    <span className="font-bold text-[11px] group-hover:hidden">+</span>
                    <span className="font-bold text-[11px] hidden group-hover:inline">-</span>
                    <span className="text-[11px] font-bold">{sub.name}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-600 mt-2">{new Date(booking.bookingDate).toLocaleDateString('vi-VN')} lúc {booking.startTime}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.branchId?.name || '—'}</p>
            {booking.checkInTime && (
              <p className="text-xs text-blue-600 font-medium mt-2 bg-blue-50 px-2 py-1 inline-block rounded">
                Vào lúc: {new Date(booking.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            {/* Add service button moved here */}
            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <button onClick={handleOpenAddService} disabled={busy}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Package size={13} /> Thêm dịch vụ
              </button>
            )}
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chi tiết thanh toán</h3>
            <p className="text-sm text-slate-700 mb-1">
              Tổng tiền: <strong className="text-slate-900">{Number(booking.finalPrice || 0).toLocaleString('vi-VN')}₫</strong>
            </p>
            {booking.depositAmount > 0 && (
              <div className="text-xs text-slate-500 mb-2 space-y-0.5">
                <p>Tiền cọc: <strong className={booking.depositPaid ? 'text-emerald-600' : 'text-amber-600'}>{Number(booking.depositAmount).toLocaleString('vi-VN')}₫</strong> {booking.depositPaid ? '(đã cọc)' : '(chưa cọc)'}</p>
                {booking.paymentStatus !== 'paid' && (
                  <p>Còn lại: <strong className="text-slate-700">{Number(Math.max(0, (booking.finalPrice || 0) - (booking.depositPaid ? booking.depositAmount : 0))).toLocaleString('vi-VN')}₫</strong></p>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : booking.paymentStatus === 'deposit_paid' ? 'bg-indigo-100 text-indigo-700' : booking.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus === 'deposit_paid' ? 'Đã cọc — chờ tất toán' : booking.paymentStatus === 'pending' ? 'Đang chờ thanh toán' : 'Chưa thanh toán'}
              </span>
              {booking.paymentStatus !== 'paid' && booking.status !== 'cancelled' && (
                <button disabled={busy} onClick={() => setConfirmCash(true)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                  {booking.depositPaid ? 'Thu phần còn lại' : 'Xác nhận tiền mặt'}
                </button>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ghi chú</h3>
            <p className="text-sm text-slate-600 italic">{booking.note || 'Không có ghi chú'}</p>
          </div>
          
          {booking.status === 'cancelled' && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="text-sm">🗑️</span> Lý do hủy
              </h3>
              <p className="text-sm text-red-700 font-medium">
                {booking.cancellationReason || 'Không có lý do'}
              </p>
              {booking.cancelledAt && (
                <p className="text-xs text-red-500 mt-1">
                  Đã hủy lúc: {new Date(booking.cancelledAt).toLocaleString('vi-VN')}
                </p>
              )}

              {/* Phần hoàn tiền */}
              {booking.refundStatus && booking.refundStatus !== 'none' && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="text-sm">💵</span> Thông tin hoàn tiền
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm font-semibold text-slate-800">
                      {booking.refundAmount?.toLocaleString('vi-VN')}₫
                    </div>
                    {booking.refundStatus === 'pending' ? (
                      <button 
                        disabled={busy}
                        onClick={handleCompleteRefund}
                        className="rounded-lg bg-orange-100 text-orange-700 px-3 py-1.5 text-xs font-bold hover:bg-orange-200 transition-colors disabled:opacity-50"
                      >
                        {busy ? 'Đang xử lý...' : 'Xác nhận đã hoàn'}
                      </button>
                    ) : (
                      <span className="rounded-lg bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold">
                        Đã hoàn tiền
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── INVOICE (completed only) ── */}
        {booking.status === 'completed' && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
            {/* Invoice header */}
            <div className="flex items-center justify-between bg-emerald-600 px-5 py-3">
              <div className="flex items-center gap-2 text-white">
                <Receipt size={18} weight="fill" />
                <span className="font-bold text-sm tracking-wide">HÓA ĐƠN DỊCH VỤ</span>
              </div>
              <span className="font-mono text-xs text-emerald-100">
                #{String(booking._id).slice(-8).toUpperCase()}
              </span>
            </div>

            <div className="p-5 bg-white space-y-1">
              {/* Info rows with phosphor icons */}
              {([
                { icon: <Package size={14} weight="fill" className="text-emerald-600 shrink-0" />, label: 'Dịch vụ', value: booking.packageName || booking.packageId?.name || '—' },
                { icon: <CalendarBlank size={14} weight="fill" className="text-blue-500 shrink-0" />, label: 'Ngày', value: new Date(booking.bookingDate).toLocaleDateString('vi-VN') },
                { icon: <Clock size={14} weight="fill" className="text-indigo-500 shrink-0" />, label: 'Giờ', value: booking.startTime || '—' },
                { icon: <Buildings size={14} weight="fill" className="text-slate-500 shrink-0" />, label: 'Chi nhánh', value: booking.branchName || booking.branchId?.name || '—' },
                { icon: <Car size={14} weight="fill" className="text-cyan-600 shrink-0" />, label: 'Biển số', value: booking.vehiclePlate || booking.vehicleId?.licensePlate || '—' },
                { icon: <CurrencyCircleDollar size={14} weight="fill" className="text-emerald-600 shrink-0" />, label: 'Thành tiền', value: Number(booking.totalAmount || booking.finalPrice || 0).toLocaleString('vi-VN') + 'đ' },
                { icon: <CreditCard size={14} weight="fill" className="text-violet-500 shrink-0" />, label: 'Phương thức', value: booking.paymentMethod ? (
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    booking.paymentMethod === 'cash' ? 'bg-violet-100 text-violet-700' :
                    booking.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-700' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {booking.paymentMethod === 'cash' ? 'Tiền mặt' : booking.paymentMethod === 'bank' ? 'Chuyển khoản' : 'VNPay'}
                  </span>
                ) : '—' },
                { icon: <CheckCircle size={14} weight="fill" className={(booking.paymentStatus === 'paid' || booking.paymentStatus === 'deposit_paid') ? 'text-emerald-600 shrink-0' : 'text-amber-500 shrink-0'} />, label: 'Thanh toán', value: (
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    booking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                    booking.paymentStatus === 'deposit_paid' ? 'bg-emerald-50 text-emerald-600' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus === 'deposit_paid' ? 'Đã đặt cọc' : 'Chưa thanh toán'}
                  </span>
                )},
                { icon: <Tag size={14} weight="fill" className="text-orange-500 shrink-0" />, label: 'Loại đặt', value: booking.bookingType === 'recurring' ? 'Định kỳ' : booking.bookingType === 'slot_pack_usage' ? 'Gói lượt' : '1 lần' },
              ]).map(({ icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 gap-2">
                  <span className="flex items-center gap-2 text-[13px] text-slate-500">{icon}{label}</span>
                  <span className="text-[13px] font-semibold text-slate-900 text-right max-w-[55%]">{value}</span>
                </div>
              ))}

              {booking.depositAmount > 0 && (
                <>
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 gap-2">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-amber-600">
                      <Lock size={14} weight="fill" className="text-amber-500 shrink-0" />
                      Đặt cọc {Math.round((booking.depositAmount || 0) / ((booking.totalAmount || booking.finalPrice || 1)) * 100)}%
                    </span>
                    <span className="text-[13px] font-bold text-amber-600">
                      {Number(booking.depositAmount).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 gap-2">
                    <span className="flex items-center gap-2 text-[13px] text-slate-500">
                      <ClockCounterClockwise size={14} weight="fill" className="text-slate-400 shrink-0" />
                      Còn lại (thanh toán sau)
                    </span>
                    <span className="text-[13px] font-semibold text-slate-500">
                      {booking.paymentStatus === 'paid' ? '0đ' : `${Number(Math.max(0, (booking.totalAmount || booking.finalPrice || 0) - (booking.depositAmount || 0))).toLocaleString('vi-VN')}đ`}
                    </span>
                  </div>
                  {booking.depositPaid && (
                    <div className="mt-2 text-center pb-2 border-b border-slate-100">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                        <CheckCircle size={13} weight="fill" /> Đã đặt cọc {Number(booking.depositAmount).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="pt-3 space-y-2">
                {/* Payment method selection for manager (only when not yet paid) */}
                {booking.paymentStatus !== 'paid' && booking.status !== 'cancelled' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chọn phương thức</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{id:'cash',icon:<Wallet size={16}/>,label:'Tiền mặt'},{id:'bank',icon:<Bank size={16}/>,label:'Ngân hàng'},{id:'vnpay',icon:<CreditCard size={16}/>,label:'VNPay'}].map(m => (
                        <button key={m.id} type="button"
                          onClick={() => setManagerPayMethod(prev => prev === m.id ? null : m.id)}
                          className={`flex flex-col items-center gap-1 rounded-lg border py-2 px-1 text-[11px] font-semibold transition-colors ${
                            managerPayMethod === m.id
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}>
                          {m.icon}{m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm cash if not yet paid */}
                {booking.paymentStatus !== 'paid' && (
                  <button disabled={busy} onClick={() => setConfirmCash(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                    <CurrencyCircleDollar size={15} weight="fill" />
                    {booking.depositPaid ? 'Thu phần còn lại' : 'Xác nhận thu tiền'}
                  </button>
                )}

                {/* Invoice action buttons */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowPrint(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                    <Printer size={15} />
                    In hóa đơn
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating + Review (completed) */}
        {booking.status === 'completed' && (booking.rating || booking.feedback) && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Star size={11} weight="fill" /> Đánh giá từ khách hàng
            </h3>
            {booking.rating && (
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} weight={s <= booking.rating ? 'fill' : 'regular'}
                    className={s <= booking.rating ? 'text-amber-400' : 'text-slate-200'} />
                ))}
              </div>
            )}
            {booking.feedback && (
              <p className="text-sm text-amber-800 italic">"{booking.feedback}"</p>
            )}
            {booking.managerReply && (
              <div className="mt-2 border-t border-amber-200 pt-2">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Phản hồi chi nhánh</p>
                <p className="text-xs text-emerald-800">{booking.managerReply}</p>
              </div>
            )}
          </div>
        )}

        {/* QR check-in — chỉ hiển thị khi đơn đã xác nhận / đã check-in / hết hạn */}
        {(() => {
          const m = getQrMode(booking);
          if (!m) return null;
          const label = m === 'active' ? 'Hiển thị QR cho khách'
            : m === 'checked_in' ? 'Xem QR (đã check-in)' : 'Xem QR (hết hạn)';
          const cls = m === 'active' ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            : m === 'checked_in' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100';
          return (
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => setShowQR(true)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${cls}`}>
                <QrCode size={15} />
                {label}
              </button>
            </div>
          );
        })()}
      </div>

      {showQR    && <QRDisplayModal      booking={booking} onClose={() => setShowQR(false)} />}
      {showPrint && <PrintReceiptModal   booking={booking} onClose={() => setShowPrint(false)} />}
      
      {/* ADD SERVICE MODAL */}
      {showAddService && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !addingService && setShowAddService(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Thêm dịch vụ</h3>
            <p className="text-xs text-slate-500 mb-4">Bạn có thể chọn thêm các dịch vụ phát sinh. Hệ thống sẽ tự động tính lại tổng tiền.</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-2">
              {availableSubServices.length === 0 ? (
                <p className="text-sm text-slate-500">Đang tải hoặc không có dịch vụ nào thêm...</p>
              ) : availableSubServices.map((sub, i) => {
                const alreadyHas = booking?.selectedSubServices?.some(s => s.name === sub.name);
                const checked = alreadyHas || selectedNewSubs.some(s => s.name === sub.name);
                return (
                  <label key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${alreadyHas ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' : checked ? 'border-emerald-400 bg-emerald-50 cursor-pointer' : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="hidden" checked={checked} disabled={alreadyHas} onChange={() => {
                        if (alreadyHas) return;
                        if (checked) setSelectedNewSubs(prev => prev.filter(s => s.name !== sub.name));
                        else setSelectedNewSubs(prev => [...prev, sub]);
                      }} />
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${checked ? (alreadyHas ? 'bg-slate-400 border-slate-400' : 'bg-emerald-600 border-emerald-600') + ' text-white' : 'border-slate-300'}`}>
                        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <span className={`text-sm font-medium ${checked ? (alreadyHas ? 'text-slate-500' : 'text-emerald-800') : 'text-slate-700'}`}>{sub.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${checked ? (alreadyHas ? 'text-slate-400' : 'text-emerald-600') : 'text-slate-900'}`}>{alreadyHas ? 'Đã có' : `+${(sub.price || 0).toLocaleString('vi-VN')}đ`}</span>
                  </label>
                )
              })}
            </div>
            
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => setShowAddService(false)} disabled={addingService} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
                Hủy
              </button>
              <button onClick={submitAddServices} disabled={addingService || selectedNewSubs.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {addingService ? 'Đang thêm...' : 'Xác nhận thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCash}
        title={`Xác nhận thu tiền (${managerPayMethod === 'bank' ? 'Chuyển khoản' : managerPayMethod === 'vnpay' ? 'VNPay' : 'Tiền mặt'})`}
        message={`Xác nhận khách hàng đã thanh toán bằng ${managerPayMethod === 'bank' ? 'chuyển khoản' : managerPayMethod === 'vnpay' ? 'VNPay' : 'tiền mặt'}?`}
        confirmLabel="Xác nhận"
        onConfirm={handleCashPayment}
        onCancel={() => setConfirmCash(false)}
      />
    </div>
  );
}

/* ── Week view (lịch tuần) ── */
const CAL_STATUS_COLOR = {
  pending:     'bg-amber-400 text-white border-amber-500',
  confirmed:   'bg-indigo-500 text-white border-indigo-600',
  checked_in:  'bg-cyan-500 text-white border-cyan-600',
  in_progress: 'bg-blue-500 text-white border-blue-600',
  completed:   'bg-emerald-500 text-white border-emerald-600',
  cancelled:   'bg-slate-300 text-slate-600 border-slate-400',
};

function calDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function getWeekStart(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEK_DAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function WeekView({ onSelect, onConfirmAll, onQR, refreshSignal }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const load = useCallback(async (start) => {
    setLoading(true);
    try {
      const from = calDateStr(start);
      const endDay = new Date(start);
      endDay.setDate(start.getDate() + 6);
      const to = calDateStr(endDay);
      const res = await api(`/bookings?dateFrom=${from}&dateTo=${to}&limit=500&page=1`);
      const data = await res.json();
      const list = data?.data?.bookings || data?.data || [];
      setBookings(Array.isArray(list) ? list : []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(weekStart); }, [weekStart, load, refreshSignal]);

  const byDay = {};
  for (const b of bookings) {
    const ds = b.bookingDate ? calDateStr(new Date(b.bookingDate)) : '';
    if (!byDay[ds]) byDay[ds] = [];
    byDay[ds].push(b);
  }

  const todayStr = calDateStr(new Date());
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50"><CaretLeft size={14} /></button>
          <div className="px-3 py-1.5 text-sm font-semibold text-slate-800 min-w-56 text-center">
            {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50"><CaretRight size={14} /></button>
        </div>
        <button onClick={() => setWeekStart(getWeekStart())}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
          Tuần này
        </button>
        {pendingCount > 0 && (
          <button onClick={() => onConfirmAll(bookings.filter((b) => b.status === 'pending').map((b) => b._id), () => load(weekStart))}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
            <CheckCircle size={14} weight="fill" /> Xác nhận tất cả ({pendingCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Day header row */}
          <div className="grid border-b border-slate-100 bg-slate-50 sticky top-0 z-10"
            style={{ gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }}>
            {weekDays.map((day, i) => {
              const ds = calDateStr(day);
              const isToday = ds === todayStr;
              const count = (byDay[ds] || []).length;
              const newCount = (byDay[ds] || []).filter((b) => isNewBooking(b)).length;
              return (
                <div key={ds} className={`px-2 py-2.5 text-center border-r border-slate-100 last:border-0 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>{WEEK_DAY_SHORT[i]}</p>
                  <p className={`text-xl font-bold leading-tight ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day.getDate()}</p>
                  <p className="text-[10px] text-slate-400 mb-1">{day.toLocaleDateString('vi-VN', { month: 'numeric' })} / {day.getFullYear()}</p>
                  {count > 0 ? (
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">{count} lịch</span>
                      {newCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          <span className="h-1 w-1 animate-pulse rounded-full bg-white" />{newCount} mới
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300">Trống</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day columns with booking cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }}>
            {weekDays.map((day) => {
              const ds = calDateStr(day);
              const isToday = ds === todayStr;
              const dayBookings = [...(byDay[ds] || [])].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
              return (
                <div key={ds} className={`border-r border-slate-100 last:border-0 p-1.5 space-y-1 min-h-[160px] ${isToday ? 'bg-blue-50/30' : ''}`}>
                  {dayBookings.length === 0 ? (
                    <div className="flex min-h-[140px] items-center justify-center">
                      <p className="text-[10px] text-slate-200">—</p>
                    </div>
                  ) : dayBookings.map((b) => {
                    const fresh = isNewBooking(b);
                    const colorCls = CAL_STATUS_COLOR[b.status] || CAL_STATUS_COLOR.pending;
                    const qrMode = getQrMode(b);
                    return (
                      <div key={b._id} onClick={() => onSelect(b)}
                        title={`${b.userId?.name || '?'} | ${b.startTime}–${b.endTime} | ${STATUS_MAP[b.status]?.label || b.status}`}
                        className={`relative rounded-lg border px-2 py-1.5 cursor-pointer transition-opacity hover:opacity-80 ${colorCls} ${fresh ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
                        {fresh && (
                          <span className="absolute -top-1.5 right-1 inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-white" /> Mới
                          </span>
                        )}
                        {qrMode && (
                          <button onClick={(e) => { e.stopPropagation(); onQR(b); }} title="Xem QR"
                            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded bg-white/25 hover:bg-white/40">
                            <QrCode size={10} weight="bold" />
                          </button>
                        )}
                        <p className="text-[10px] font-bold leading-tight opacity-75">{b.startTime}–{b.endTime}</p>
                        <p className="text-[11px] font-semibold leading-tight truncate pr-5">{b.userId?.name || '—'}</p>
                        <p className="text-[10px] leading-tight truncate opacity-75">{b.packageId?.name || '—'}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 px-1">
        {Object.entries(STATUS_MAP).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={`h-3 w-3 rounded-sm ${(CAL_STATUS_COLOR[k] || '').split(' ')[0]}`} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Main ═══ */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PAGE_SIZE = 15;

export default function ManagerBookings() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [qrBooking, setQrBooking] = useState(null); // booking đang hiển thị QR check-in nhanh
  const [expandedGroups, setExpandedGroups] = useState({});
  const debounce = useRef(null);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const tableData = useMemo(() => {
    const groups = {};
    const result = [];
    bookings.forEach(b => {
      if (b.bookingType === 'recurring' && b.recurringGroupId) {
        if (!groups[b.recurringGroupId]) {
          const groupItem = {
            isGroup: true,
            groupId: b.recurringGroupId,
            children: [],
          };
          groups[b.recurringGroupId] = groupItem;
          result.push(groupItem);
        }
        groups[b.recurringGroupId].children.push(b);
      } else {
        result.push(b);
      }
    });

    result.forEach(item => {
      if (item.isGroup) {
        item.children.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
        const first = item.children[0];
        item.userId = first.userId;
        item.packageId = first.packageId;
        item.bookingType = 'recurring_group';
        item.bookingDate = first.bookingDate;
        item.startTime = first.startTime;
        item._id = `group_${item.groupId}`;
      }
    });
    return result;
  }, [bookings]);

  const notify = showToast;

  const fetch_ = useCallback(async (q = search, sf = statusFilter, tf = typeFilter, today = todayOnly, df = dateFrom, dt = dateTo, pg = page) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (sf) params.set('status', sf);
      if (tf) params.set('bookingType', tf);
      if (q.trim()) params.set('search', q.trim());
      if (today) { const d = getTodayStr(); params.set('dateFrom', d); params.set('dateTo', d); }
      else if (df) { params.set('dateFrom', df); if (dt) params.set('dateTo', dt); }
      const res = await api(`/bookings?${params}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const data = p?.data ?? p;
      const pagination = data?.pagination;
      setBookings(data?.bookings ?? (Array.isArray(data) ? data : []));
      setTotal(pagination?.total ?? data?.total ?? 0);
      setPage(pagination?.page ?? data?.page ?? pg);
      setTotalPages(pagination?.totalPages ?? data?.totalPages ?? 1);
    } catch (err) { setError(err.message || 'Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [search, statusFilter, typeFilter, todayOnly, dateFrom, dateTo, page]);

  useEffect(() => { fetch_(); }, []); // eslint-disable-line

  const token = getStoredToken();
  const [refreshSignal, setRefreshSignal] = useState(0);
  const triggerRefresh = useCallback(() => {
    fetch_();
    setRefreshSignal(s => s + 1);
  }, [fetch_]);
  useSSE(token, 'slots_updated', triggerRefresh);
  useSSE(token, 'payment_new', triggerRefresh);

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); fetch_(v, statusFilter, typeFilter, todayOnly, dateFrom, dateTo, 1); }, 420);
  };

  const handleFilter = (v) => { setStatusFilter(v); setPage(1); fetch_(search, v, typeFilter, todayOnly, dateFrom, dateTo, 1); };
  const handleTypeFilter = (v) => { setTypeFilter(v); setPage(1); fetch_(search, statusFilter, v, todayOnly, dateFrom, dateTo, 1); };
  const handleTodayToggle = () => { const next = !todayOnly; setTodayOnly(next); setPage(1); if (next) { setDateFrom(''); setDateTo(''); } fetch_(search, statusFilter, typeFilter, next, '', '', 1); };
  const handlePageChange = (pg) => { setPage(pg); fetch_(search, statusFilter, typeFilter, todayOnly, dateFrom, dateTo, pg); };

  const handleUpdated = (updated) => {
    setBookings((p) => p.map((b) => b._id === updated._id ? updated : b));
    if (selectedBooking && selectedBooking._id === updated._id) {
      setSelectedBooking(updated);
    }
    notify('Đã cập nhật trạng thái đặt lịch');
  };

  useEffect(() => {
    if (selectedBooking && bookings.length > 0) {
      const updated = bookings.find(b => b._id === selectedBooking._id);
      if (updated) {
        setSelectedBooking(updated);
      } else {
        for (const b of bookings) {
          if (b.isGroup && b.children) {
            const child = b.children.find(c => c._id === selectedBooking._id);
            if (child) {
              setSelectedBooking(child);
              break;
            }
          }
        }
      }
    }
  }, [bookings]);

  const handleCancel = async (id) => {
    const reason = cancelReason.trim();
    setConfirmCancelId(null);
    setCancelReason('');
    try {
      const res = await api(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ cancellationReason: reason || 'Quản lý hủy' }) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const updated = p?.data ?? p;
      setBookings((prev) => prev.map((b) => b._id === updated._id ? updated : b));
      notify('Đã hủy lịch');
    } catch (err) { notify(err.message || 'Hủy thất bại', 'error'); }
  };

  const pendingInView = bookings.filter((b) => b.status === 'pending');

  // Xác nhận hàng loạt; nếu truyền ids dùng ids, ngược lại xác nhận các đơn pending đang hiển thị.
  const confirmAll = async (ids, after) => {
    setConfirmingAll(true);
    try {
      const res = await api(`/bookings/confirm`, {
        method: 'POST',
        body: JSON.stringify(ids && ids.length ? { ids } : { ids: pendingInView.map((b) => b._id) }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const result = p?.data ?? p;
      notify(`Đã xác nhận ${result.confirmed} đơn`);
      if (after) after();
      else fetch_(search, statusFilter, typeFilter, todayOnly, dateFrom, dateTo, page);
    } catch (err) {
      notify(err.message || 'Xác nhận thất bại', 'error');
    } finally {
      setConfirmingAll(false);
      setConfirmAllOpen(false);
    }
  };

  if (selectedBooking) {
    return <BookingDetailsTab booking={selectedBooking} onBack={() => setSelectedBooking(null)} onUpdated={handleUpdated} notify={notify} />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* view toggle: Bảng / Lịch */}
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          <button onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Rows size={14} /> Bảng
          </button>
          <button onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <CalendarBlank size={14} /> Lịch
          </button>
        </div>

        {viewMode === 'table' && (
          <>
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="booking-search" value={search} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Tìm theo khách hàng, mã đặt…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors" />
            </div>
            <select id="booking-status-filter" value={statusFilter} onChange={(e) => handleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors">
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="checked_in">Đã check-in</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select id="booking-type-filter" value={typeFilter} onChange={(e) => handleTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors">
              <option value="">Tất cả loại đơn</option>
              <option value="single">Đặt 1 lần</option>
              <option value="recurring">Định kỳ</option>
              <option value="slot_pack_usage">Gói lượt</option>
            </select>
            <div className="flex items-center gap-1.5">
              <input type="date" value={dateFrom} max={dateTo || undefined}
                onChange={(e) => { const v = e.target.value; setDateFrom(v); setTodayOnly(false); setPage(1); fetch_(search, statusFilter, typeFilter, false, v, dateTo, 1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors" />
              <span className="text-slate-400 text-xs">→</span>
              <input type="date" value={dateTo} min={dateFrom || undefined}
                onChange={(e) => { const v = e.target.value; setDateTo(v); setTodayOnly(false); setPage(1); fetch_(search, statusFilter, typeFilter, false, dateFrom, v, 1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors" />
              <button onClick={() => { setDateFrom(''); setDateTo(''); setTodayOnly(true); setPage(1); fetch_(search, statusFilter, typeFilter, true, '', '', 1); }}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  todayOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}>
                📅 Hôm nay
              </button>
            </div>
            <button onClick={() => fetch_(search, statusFilter, typeFilter, todayOnly, dateFrom, dateTo)} disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {pendingInView.length > 0 && (
              <button onClick={() => setConfirmAllOpen(true)} disabled={confirmingAll}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                <CheckCircle size={14} weight="fill" /> Xác nhận tất cả ({pendingInView.length})
              </button>
            )}
          </>
        )}

        <button onClick={() => setShowCheckin(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
          <Lightning size={14} /> Check-in nhanh
        </button>
      </div>

      {viewMode === 'calendar' && (
        <WeekView
          onSelect={(b) => setSelectedBooking(b)}
          onConfirmAll={(ids, after) => confirmAll(ids, after)}
          onQR={(b) => setQrBooking(b)}
        />
      )}
      {viewMode === 'table' && (<>
      {/* filter info */}
      <p className="text-xs text-slate-400">
        {todayOnly
          ? `Lịch hôm nay (${new Date().toLocaleDateString('vi-VN')}) — `
          : dateFrom || dateTo
            ? `Từ ${dateFrom || '...'} đến ${dateTo || '...'} — `
            : ''}
        {total > 0 ? `${total} lịch hẹn` : ''}
      </p>

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Spinner /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-red-500">
            <Warning size={26} weight="duotone" /><p className="text-sm">{error}</p>
            <button onClick={() => fetch_()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm hover:bg-red-50 transition-colors">Thử lại</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <CalendarCheck size={36} weight="thin" /><p className="text-sm">Không có lịch đặt nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Ngày / Giờ</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-center">QR</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((b) => {
                if (b.isGroup) {
                  const isExpanded = expandedGroups[b.groupId];
                  return (
                    <Fragment key={b._id}>
                      <tr className="hover:bg-slate-50 transition-colors cursor-pointer bg-indigo-50/30" onClick={() => toggleGroup(b.groupId)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-indigo-500">
                              {isExpanded ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
                            </span>
                            <p className="font-medium text-slate-800">{b.userId?.name ?? '—'}</p>
                            {b.userId?.tier && <TierBadge tier={b.userId.tier} />}
                            {(() => {
                              const hasNew = (b.children || []).some(isNewBooking);
                              if (!hasNew) return null;
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-[11px] text-slate-400 pl-6">{b.userId?.phone ?? ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-slate-400">#{(b.groupId || '').slice(-6).toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-600">{b.packageId?.name ?? '—'}</span>
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                              Nhóm định kỳ ({b.children.length} đơn)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">
                            {b.children.length > 0
                              ? `${new Date(b.children[0].bookingDate).toLocaleDateString('vi-VN')} → ${new Date(b.children[b.children.length - 1].bookingDate).toLocaleDateString('vi-VN')}`
                              : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 italic">Xem chi tiết ở đơn lẻ</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 italic">Xem chi tiết ở đơn lẻ</span>
                        </td>
                        <td className="px-4 py-3 text-center"></td>
                        <td className="px-4 py-3 text-right"></td>
                      </tr>
                      {isExpanded && b.children.map(child => (
                        <tr key={child._id} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                          <td className="px-4 py-3 pl-10 relative">
                            <div className="absolute left-6 top-0 bottom-0 w-px bg-indigo-100"></div>
                            <div className="absolute left-6 top-1/2 w-3 h-px bg-indigo-100"></div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-slate-800">{child.userId?.name ?? '—'}</p>
                              {child.userId?.tier && <TierBadge tier={child.userId.tier} />}
                            </div>
                            <p className="text-[11px] text-slate-400">{child.userId?.phone ?? ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            {child.bookingCode ? <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[10px]">#{child.bookingCode}</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-600">{child.packageId?.name ?? '—'}</span>
                            <div className="mt-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${TYPE_MAP[child.bookingType]?.cls || 'bg-slate-100 text-slate-500'}`}>
                                {TYPE_MAP[child.bookingType]?.label || child.bookingType} (Lần {child.recurringPosition}/{child.recurringTotal})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-700">{new Date(child.bookingDate).toLocaleDateString('vi-VN')}</p>
                            <p className="text-[11px] text-slate-400">{child.startTime}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${child.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                              {child.paymentStatus === 'paid' ? 'Đã thanh toán' : child.paymentStatus ?? 'Chưa TT'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusMenu bookingId={child._id} current={child.status} onUpdated={handleUpdated} notify={notify} />
                            <AtRiskNotice booking={child} onUpdated={handleUpdated} notify={notify} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const m = getQrMode(child);
                              if (!m) return <span className="text-slate-300">—</span>;
                              const cls = m === 'active' ? 'text-blue-600 hover:bg-blue-50'
                                : m === 'checked_in' ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-red-500 hover:bg-red-50';
                              const title = m === 'active' ? 'Hiển thị QR để khách check-in'
                                : m === 'checked_in' ? 'Đã check-in — xem QR' : 'Mã đã hết hạn';
                              return (
                                <button onClick={() => setQrBooking(child)} title={title}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${cls}`}>
                                  <QrCode size={18} weight="duotone" />
                                </button>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setSelectedBooking(child)}
                                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                                Xem đơn
                              </button>
                              {child.status !== 'cancelled' && child.status !== 'completed' && (
                                <button onClick={() => setConfirmCancelId(child._id)}
                                  className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                                  Hủy
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                }

                // Normal row
                return (
                  <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-slate-800">{b.userId?.name ?? '—'}</p>
                        {b.userId?.tier && <TierBadge tier={b.userId.tier} />}
                        {isNewBooking(b) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{b.userId?.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      {b.bookingCode ? <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[10px]">#{b.bookingCode}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{b.packageId?.name ?? '—'}</span>
                      {b.bookingType && (
                        <div className="mt-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${TYPE_MAP[b.bookingType]?.cls || 'bg-slate-100 text-slate-500'}`}>
                            {TYPE_MAP[b.bookingType]?.label || b.bookingType}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{new Date(b.bookingDate).toLocaleDateString('vi-VN')}</p>
                      <p className="text-[11px] text-slate-400">{b.startTime}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        b.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                        b.paymentStatus === 'deposit_paid' ? 'bg-teal-50 text-teal-700' :
                        b.paymentStatus === 'refunded' ? 'bg-slate-100 text-slate-500' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {
                          b.paymentStatus === 'paid' ? 'Đã thanh toán' :
                          b.paymentStatus === 'deposit_paid' ? 'Đã cọc' :
                          b.paymentStatus === 'refunded' ? 'Đã hoàn tiền' :
                          b.paymentStatus === 'failed' ? 'Thất bại' :
                          'Chưa thanh toán'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusMenu bookingId={b._id} current={b.status} onUpdated={handleUpdated} notify={notify} />
                      <AtRiskNotice booking={b} onUpdated={handleUpdated} notify={notify} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const m = getQrMode(b);
                        if (!m) return <span className="text-slate-300">—</span>;
                        const cls = m === 'active' ? 'text-blue-600 hover:bg-blue-50'
                          : m === 'checked_in' ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-red-500 hover:bg-red-50';
                        const title = m === 'active' ? 'Hiển thị QR để khách check-in'
                          : m === 'checked_in' ? 'Đã check-in — xem QR' : 'Mã đã hết hạn';
                        return (
                          <button onClick={() => setQrBooking(b)} title={title}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${cls}`}>
                            <QrCode size={18} weight="duotone" />
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedBooking(b)}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                          Xem đơn
                        </button>
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <button onClick={() => setConfirmCancelId(b._id)}
                            className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            ‹ Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => handlePageChange(p)} disabled={loading}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === p ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>{p}</button>
          ))}
          <button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            Sau ›
          </button>
        </div>
      )}
      </>)}

      {qrBooking && <QRDisplayModal booking={qrBooking} onClose={() => setQrBooking(null)} />}

      {showCheckin && (
        <ManagerQuickCheckin
          onClose={() => setShowCheckin(false)}
          onCheckedIn={(b) => {
            showToast(`Check-in thành công: ${b?.userId?.name || 'khách hàng'}`);
            fetch_(search, statusFilter, typeFilter, todayOnly);
          }}
        />
      )}

      {/* Cancel Modal */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
          onClick={e => e.target === e.currentTarget && (() => { setConfirmCancelId(null); setCancelReason(''); })()}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-[15px] font-semibold text-slate-800">Xác nhận hủy lịch</h2>
              <button onClick={() => { setConfirmCancelId(null); setCancelReason(''); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">Bạn có chắc chắn muốn hủy lịch đặt này? Hành động không thể hoàn tác.</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Lý do hủy</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy (tùy chọn)..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4 justify-end">
              <button onClick={() => { setConfirmCancelId(null); setCancelReason(''); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Giữ lại
              </button>
              <button onClick={() => handleCancel(confirmCancelId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                Hủy lịch
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAllOpen}
        title="Xác nhận tất cả đơn chờ"
        message={`Xác nhận ${pendingInView.length} đơn đang chờ? Khách sẽ được thông báo và có thể đến check-in.`}
        confirmLabel="Xác nhận tất cả"
        onConfirm={() => confirmAll()}
        onCancel={() => setConfirmAllOpen(false)}
      />
    </div>
  );
}
