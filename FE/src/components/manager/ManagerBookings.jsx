import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise,
  CalendarCheck,
  CaretDown,
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
  CaretRight,
  CalendarBlank,
  Table as TableIcon,
  Rows,
} from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';
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

function Toast({ toast, onDismiss }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, [toast, onDismiss]);
  if (!toast) return null;
  const ok = toast.type !== 'error';
  return (
    <div role="alert" className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${ok ? 'bg-white text-emerald-700 ring-emerald-200' : 'bg-white text-red-600 ring-red-200'}`}>
      {ok ? <CheckCircle size={15} weight="fill" /> : <XCircle size={15} weight="fill" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-1 opacity-50 hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
            {danger ? <Warning size={20} weight="fill" className="text-red-500" /> : <CurrencyCircleDollar size={20} weight="fill" className="text-amber-500" />}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Huỷ
          </button>
          <button onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessBanner({ show, message, onDone }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [show, onDone]);
  if (!show) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 px-6 py-3.5 text-white shadow-2xl shadow-emerald-600/25 ring-1 ring-emerald-500/20">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <CheckCircle size={18} weight="fill" />
        </div>
        <span className="text-sm font-semibold">{message}</span>
      </div>
    </div>
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
  const nexts = NEXT_STATUS[current];
  if (!nexts) return <StatusBadge status={current} />;

  const update = async (newStatus) => {
    setBusy(true);
    setOpen(false);
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

  return (
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
        <div className="absolute right-0 top-7 z-20 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {nexts.map((s) => (
            <button key={s} onClick={() => update(s)}
              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors">
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
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

// Đơn "mới": đang chờ xác nhận và được tạo trong vòng 24h
function isNewBooking(b) {
  if (!b || b.status !== 'pending') return false;
  const created = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return created > 0 && Date.now() - created < 24 * 60 * 60 * 1000;
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
  function fmt(n)    { return Number(n || 0).toLocaleString('vi-VN'); }
  function dateFmt(d){ return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
  function timeFmt(d){ return d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''; }

  const shortId   = String(booking._id).slice(-8).toUpperCase();
  const receiptNo = `HD-${new Date().getFullYear()}-${shortId}`;
  const datePaid  = dateFmt(booking.checkOutTime || booking.updatedAt || booking.bookingDate);
  const basePrice = booking.packageId?.price || booking.finalPrice || 0;
  const discount  = booking.discountAmount || 0;
  const finalAmt  = booking.finalPrice || 0;
  const payLabel  = booking.paymentMethod === 'cash' ? 'Tiền mặt'
                  : booking.paymentMethod === 'momo'  ? 'Ví MoMo'
                  : booking.paymentMethod === 'card'  ? 'Thẻ ngân hàng'
                  : (booking.paymentMethod || 'Tiền mặt');
  const checkIn   = timeFmt(booking.checkInTime)  || booking.startTime || '—';
  const checkOut  = timeFmt(booking.checkOutTime) || booking.endTime   || '';
  const printedAt = new Date().toLocaleString('vi-VN');

  function handleExportPDF() {
    const win = window.open('', '_blank', 'width=820,height=1050,scrollbars=yes');
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<title>Hóa đơn ${receiptNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:20mm 18mm}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
       font-size:13px;color:#111;background:#fff;line-height:1.5}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .hd h1{font-size:32px;font-weight:800;letter-spacing:-.5px}
  .logo-box{width:54px;height:54px;background:#111;border-radius:10px;
            display:flex;align-items:center;justify-content:center}
  .logo-box svg{fill:#fff}
  .meta{margin-bottom:28px}
  .meta p{margin-bottom:3px;font-size:13px;color:#555}
  .meta span{color:#111;font-weight:600}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;
           margin-bottom:28px;padding-top:20px;border-top:1px solid #e5e7eb}
  .plabel{font-size:11px;font-weight:700;text-transform:uppercase;
          letter-spacing:.08em;color:#9ca3af;margin-bottom:6px}
  .pname{font-weight:700;font-size:14px;margin-bottom:2px}
  .party p{font-size:13px;color:#555;margin-bottom:1px}
  .amount-h{font-size:24px;font-weight:800;margin:0 0 4px}
  .amount-sub{font-size:13px;color:#6b7280;margin-bottom:28px}
  table{width:100%;border-collapse:collapse;margin-bottom:0}
  thead tr{border-top:2px solid #e5e7eb;border-bottom:2px solid #e5e7eb}
  thead th{padding:9px 8px;text-align:left;font-size:11px;font-weight:700;
           text-transform:uppercase;letter-spacing:.06em;color:#9ca3af}
  th.r,td.r{text-align:right}
  tbody tr{border-bottom:1px solid #f3f4f6}
  tbody td{padding:12px 8px;font-size:13px;color:#374151;vertical-align:top}
  .desc-main{font-weight:600;color:#111}
  .desc-sub{font-size:12px;color:#9ca3af;margin-top:2px}
  .totals{border-top:2px solid #e5e7eb}
  .totals td{padding:5px 8px;font-size:13px;color:#374151}
  .totals tr.final td{font-weight:800;font-size:14px;color:#111;
                      border-top:2px solid #e5e7eb;padding-top:10px}
  .ph-title{font-size:18px;font-weight:800;margin:32px 0 12px}
  .ph thead tr{border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
  .ph thead th{font-size:11px;font-weight:700;text-transform:uppercase;
               letter-spacing:.06em;color:#9ca3af;padding:8px 8px 8px 0}
  .ph tbody td{padding:10px 8px 10px 0;font-size:13px;color:#374151;
               border-bottom:1px solid #f3f4f6}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;
          font-size:11px;color:#d1d5db;display:flex;justify-content:space-between}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none}
  }
</style>
</head>
<body>
<div class="hd">
  <h1>Hóa đơn</h1>
  <div class="logo-box">
    <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2C8 7 4 10 4 14a8 8 0 0016 0c0-4-4-7-8-12z"/></svg>
  </div>
</div>
<div class="meta">
  <p>Mã đặt lịch &nbsp;<span>#${shortId}</span></p>
  <p>Số hóa đơn &nbsp;&nbsp;<span>${receiptNo}</span></p>
  <p>Ngày thanh toán &nbsp;<span>${datePaid}</span></p>
</div>
<div class="parties">
  <div class="party">
    <div class="plabel">Chi nhánh</div>
    <div class="pname">AutoWash Pro</div>
    <p>${booking.branchId?.name || ''}</p>
    <p>${booking.branchId?.address || ''}</p>
    <p>autowashpro.vn</p>
  </div>
  <div class="party">
    <div class="plabel">Khách hàng</div>
    <div class="pname">${booking.userId?.name || 'Khách hàng'}</div>
    <p>${booking.userId?.phone || ''}</p>
    <p>${booking.userId?.email || ''}</p>
    <p>Xe: ${booking.vehicleId?.licensePlate || '—'}${booking.vehicleId?.brand ? ` (${booking.vehicleId.brand} ${booking.vehicleId.color || ''})` : ''}</p>
  </div>
</div>
<div class="amount-h">${fmt(finalAmt)}đ đã thanh toán ngày ${datePaid}</div>
<div class="amount-sub">Trạng thái: <strong>${booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</strong></div>
<table>
  <thead>
    <tr><th style="width:50%">Mô tả</th><th class="r" style="width:10%">SL</th><th class="r" style="width:20%">Đơn giá</th><th class="r" style="width:20%">Thành tiền</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><div class="desc-main">${booking.packageId?.name || 'Dịch vụ rửa xe'}</div>
          <div class="desc-sub">${dateFmt(booking.bookingDate)} · Vào ${checkIn}${checkOut ? ' → Ra ' + checkOut : ''}</div></td>
      <td class="r">1</td><td class="r">${fmt(basePrice)}đ</td><td class="r">${fmt(basePrice)}đ</td>
    </tr>
    ${discount > 0 ? `<tr>
      <td><div class="desc-main">Giảm giá voucher</div>
          <div class="desc-sub">${booking.voucherCode ? 'Mã: ' + booking.voucherCode : 'Khuyến mãi'}</div></td>
      <td class="r">1</td><td class="r">-${fmt(discount)}đ</td><td class="r">-${fmt(discount)}đ</td>
    </tr>` : ''}
  </tbody>
</table>
<div class="totals">
  <table>
    <tbody>
      <tr><td>Tạm tính</td><td></td><td></td><td class="r">${fmt(basePrice)}đ</td></tr>
      ${discount > 0 ? `<tr><td>Giảm giá</td><td></td><td></td><td class="r">-${fmt(discount)}đ</td></tr>` : ''}
      <tr><td>Tổng cộng</td><td></td><td></td><td class="r">${fmt(finalAmt)}đ</td></tr>
      <tr class="final"><td><strong>Đã thanh toán</strong></td><td></td><td></td>
        <td class="r"><strong>${booking.paymentStatus === 'paid' ? fmt(finalAmt) : '0'}đ</strong></td></tr>
    </tbody>
  </table>
</div>
<h2 class="ph-title">Lịch sử thanh toán</h2>
<table class="ph">
  <thead><tr>
    <th>Phương thức</th><th>Ngày</th><th class="r">Số tiền</th><th class="r">Mã giao dịch</th>
  </tr></thead>
  <tbody><tr>
    <td>${payLabel}</td><td>${datePaid}</td>
    <td class="r">${booking.paymentStatus === 'paid' ? fmt(finalAmt) + 'đ' : '—'}</td>
    <td class="r">#${shortId}</td>
  </tr></tbody>
</table>
<div class="footer"><span>In lúc: ${printedAt}</span><span>Trang 1 / 1</span></div>
<script>window.onload=()=>{setTimeout(()=>{window.print()},300)}<\/script>
</body></html>`);
    win.document.close();
  }

  /* ── preview in modal (scaled A4 layout) ── */
  const th = (txt, right = false) => (
    <th style={{ padding: '9px 8px', textAlign: right ? 'right' : 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9ca3af' }}>{txt}</th>
  );
  const td = (txt, right = false, extra = {}) => (
    <td style={{ padding: '11px 8px', textAlign: right ? 'right' : 'left', ...extra }}>{txt}</td>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}>

        {/* modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-slate-600" weight="duotone" />
            <span className="font-semibold text-slate-800">Xem trước hóa đơn</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {/* A4 preview */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-6">
          <div style={{ maxWidth: 595, margin: '0 auto', background: '#fff', padding: '40px 48px', boxShadow: '0 4px 20px rgba(0,0,0,.18)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif', fontSize: 13, color: '#111', lineHeight: 1.6 }}>

            {/* header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.5px' }}>Hóa đơn</h1>
              <div style={{ width: 52, height: 52, background: '#111', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 2C8 7 4 10 4 14a8 8 0 0016 0c0-4-4-7-8-12z"/></svg>
              </div>
            </div>

            {/* meta */}
            <div style={{ marginBottom: 24 }}>
              {[['Mã đặt lịch', `#${shortId}`], ['Số hóa đơn', receiptNo], ['Ngày thanh toán', datePaid]].map(([k, v]) => (
                <p key={k} style={{ marginBottom: 3, color: '#555' }}>
                  {k} <span style={{ marginLeft: 8, fontWeight: 600, color: '#111' }}>{v}</span>
                </p>
              ))}
            </div>

            {/* parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #e5e7eb', paddingTop: 20, marginBottom: 24 }}>
              {[
                { label: 'Chi nhánh', name: 'AutoWash Pro', lines: [booking.branchId?.name, booking.branchId?.address, 'autowashpro.vn'] },
                { label: 'Khách hàng', name: booking.userId?.name || 'Khách hàng', lines: [booking.userId?.phone, booking.userId?.email, `Xe: ${booking.vehicleId?.licensePlate || '—'}${booking.vehicleId?.brand ? ` (${booking.vehicleId.brand})` : ''}`] },
              ].map(({ label, name, lines }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: 6 }}>{label}</p>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{name}</p>
                  {lines.filter(Boolean).map((l, i) => <p key={i} style={{ fontSize: 13, color: '#555', marginBottom: 1 }}>{l}</p>)}
                </div>
              ))}
            </div>

            {/* amount paid */}
            <p style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{fmt(finalAmt)}đ đã thanh toán ngày {datePaid}</p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
              Trạng thái: <strong style={{ color: '#111' }}>{booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</strong>
            </p>

            {/* line items */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb' }}>
                  {th('Mô tả')}{th('SL', true)}{th('Đơn giá', true)}{th('Thành tiền', true)}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600 }}>{booking.packageId?.name || 'Dịch vụ rửa xe'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{dateFmt(booking.bookingDate)} · Vào {checkIn}{checkOut ? ` → Ra ${checkOut}` : ''}</div>
                  </td>
                  {td('1', true)}{td(`${fmt(basePrice)}đ`, true)}{td(`${fmt(basePrice)}đ`, true)}
                </tr>
                {discount > 0 && (
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>Giảm giá voucher</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{booking.voucherCode ? `Mã: ${booking.voucherCode}` : 'Khuyến mãi'}</div>
                    </td>
                    {td('1', true)}{td(`-${fmt(discount)}đ`, true)}{td(`-${fmt(discount)}đ`, true)}
                  </tr>
                )}
              </tbody>
            </table>

            {/* totals */}
            <div style={{ borderTop: '2px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '5px 8px', color: '#374151' }}>Tạm tính</td><td /><td /><td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{fmt(basePrice)}đ</td></tr>
                  {discount > 0 && <tr><td style={{ padding: '5px 8px', color: '#374151' }}>Giảm giá</td><td /><td /><td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>-{fmt(discount)}đ</td></tr>}
                  <tr><td style={{ padding: '5px 8px', color: '#374151' }}>Tổng cộng</td><td /><td /><td style={{ padding: '5px 8px', textAlign: 'right', color: '#374151' }}>{fmt(finalAmt)}đ</td></tr>
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: 14 }}>Đã thanh toán</td><td /><td />
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>
                      {booking.paymentStatus === 'paid' ? `${fmt(finalAmt)}đ` : '0đ'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* payment history */}
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '28px 0 12px' }}>Lịch sử thanh toán</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Phương thức', 'Ngày', 'Số tiền', 'Mã GD'].map((h, i) => (
                    <th key={h} style={{ padding: '8px', textAlign: i > 1 ? 'right' : 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9ca3af' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{payLabel}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{datePaid}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>{booking.paymentStatus === 'paid' ? `${fmt(finalAmt)}đ` : '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>#{shortId}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#d1d5db' }}>
              <span>In lúc: {printedAt}</span>
              <span>Trang 1 / 1</span>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Đóng
          </button>
          <button onClick={handleExportPDF}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
            <Printer size={15} weight="fill" />
            Xuất PDF / In
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── booking details tab ── */
function BookingDetailsTab({ booking, onBack, onUpdated, notify }) {
  const [busy, setBusy] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [confirmCash, setConfirmCash] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
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
    try {
      const res = await api(`/payments`, {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking._id, method: 'cash', paymentType: booking.depositPaid ? 'remaining' : 'full' }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      onUpdated({ ...booking, paymentStatus: 'paid', paidAt: new Date().toISOString(), paymentMethod: 'cash' });
      setShowPaymentSuccess(true);
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
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dịch vụ</h3>
            <p className="font-medium text-slate-800">{booking.packageId?.name || '—'}</p>
            <p className="text-sm text-slate-600">{new Date(booking.bookingDate).toLocaleDateString('vi-VN')} lúc {booking.startTime}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.branchId?.name || '—'}</p>
            {booking.checkInTime && (
              <p className="text-xs text-blue-600 font-medium mt-2 bg-blue-50 px-2 py-1 inline-block rounded">
                Vào lúc: {new Date(booking.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
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

            <div className="p-5 space-y-4">
              {/* Customer + Vehicle row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Khách hàng</p>
                  <p className="font-semibold text-slate-800">{booking.userId?.name || '—'}</p>
                  <p className="text-xs text-slate-500">{booking.userId?.phone || ''}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <Car size={10} /> Phương tiện
                  </p>
                  <p className="font-mono font-semibold text-slate-800">{booking.vehicleId?.licensePlate || '—'}</p>
                  <p className="text-xs text-slate-500 capitalize">{booking.vehicleId?.vehicleType} · {booking.vehicleId?.brand} {booking.vehicleId?.color}</p>
                </div>
              </div>

              {/* Time row */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-white border border-emerald-100 p-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} /> Giờ vào
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {booking.checkInTime
                      ? new Date(booking.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : booking.startTime || '—'}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} /> Giờ ra
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {booking.checkOutTime
                      ? new Date(booking.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : booking.endTime || '—'}
                  </p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="space-y-1.5 border-t border-emerald-200 pt-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{booking.packageId?.name || 'Dịch vụ'}</span>
                  <span>{Number(booking.packageId?.price || booking.finalPrice || 0).toLocaleString('vi-VN')}₫</span>
                </div>
                {(booking.discountAmount > 0) && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Voucher {booking.voucherCode ? `(${booking.voucherCode})` : ''}</span>
                    <span>-{Number(booking.discountAmount).toLocaleString('vi-VN')}₫</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-emerald-200 pt-2 mt-1">
                  <span className="font-bold text-slate-800">Thành tiền</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {Number(booking.finalPrice || 0).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>

              {/* Payment status */}
              <div className="flex items-center justify-between rounded-xl bg-white border border-emerald-100 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CurrencyCircleDollar size={16} className="text-emerald-600" weight="fill" />
                  <span>Thanh toán</span>
                  {booking.paymentMethod && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                      {booking.paymentMethod === 'cash' ? 'Tiền mặt' : booking.paymentMethod === 'momo' ? 'MoMo' : booking.paymentMethod}
                    </span>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  booking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>

              {/* Confirm cash if not yet paid */}
              {booking.paymentStatus !== 'paid' && (
                <button disabled={busy} onClick={() => setConfirmCash(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                  <CurrencyCircleDollar size={15} weight="fill" />
                  Xác nhận thu tiền mặt
                </button>
              )}

              {/* Invoice action buttons — đặt lại lịch chỉ dành cho khách hàng */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowPrint(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Printer size={15} />
                  In hóa đơn
                </button>
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
      <ConfirmDialog
        open={confirmCash}
        title="Xác nhận thu tiền mặt"
        message="Xác nhận khách hàng đã thanh toán bằng tiền mặt?"
        confirmLabel="Xác nhận thu tiền"
        onConfirm={handleCashPayment}
        onCancel={() => setConfirmCash(false)}
      />
      <SuccessBanner
        show={showPaymentSuccess}
        message="Xác nhận thu tiền mặt thành công!"
        onDone={() => setShowPaymentSuccess(false)}
      />
    </div>
  );
}

/* ── Calendar (timeline) view — giống "Lịch theo ngày" ── */
const CAL_STATUS_COLOR = {
  pending:     'bg-amber-400 text-white border-amber-500',
  confirmed:   'bg-indigo-500 text-white border-indigo-600',
  checked_in:  'bg-cyan-500 text-white border-cyan-600',
  in_progress: 'bg-blue-500 text-white border-blue-600',
  completed:   'bg-emerald-500 text-white border-emerald-600',
  cancelled:   'bg-slate-300 text-slate-600 border-slate-400',
};

const CAL_SLOTS = (() => {
  const s = [];
  for (let h = 6; h <= 21; h++) { s.push(`${String(h).padStart(2, '0')}:00`); if (h < 21) s.push(`${String(h).padStart(2, '0')}:30`); }
  return s;
})();
const CAL_SLOT_W = 64;
const CAL_ROW_H = 56;
function calMinutes(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); }
function calDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function CalendarView({ onSelect, onConfirmAll, onQR, refreshSignal }) {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const ds = calDateStr(d);
      const res = await api(`/bookings?dateFrom=${ds}&dateTo=${ds}&limit=200&page=1`);
      const data = await res.json();
      const list = data?.data?.bookings || data?.data || [];
      setBookings(Array.isArray(list) ? list : []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load, refreshSignal]);

  const lanes = [];
  const laneMap = {};
  for (const b of bookings) {
    const key = b.packageId?.name || 'Không rõ dịch vụ';
    if (!laneMap[key]) { laneMap[key] = []; lanes.push({ label: key, items: laneMap[key] }); }
    laneMap[key].push(b);
  }
  const totalWidth = CAL_SLOTS.length * CAL_SLOT_W;
  const isToday = calDateStr(date) === calDateStr(new Date());
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }}
            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50"><CaretLeft size={14} /></button>
          <div className="px-3 py-1.5 text-sm font-semibold text-slate-800 min-w-52 text-center">
            {date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }}
            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50"><CaretRight size={14} /></button>
        </div>
        <button onClick={() => setDate(new Date())}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${isToday ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
          Hôm nay
        </button>
        <input type="date" value={calDateStr(date)}
          onChange={(e) => { if (e.target.value) setDate(new Date(e.target.value + 'T00:00:00')); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        {pendingCount > 0 && (
          <button onClick={() => onConfirmAll(bookings.filter((b) => b.status === 'pending').map((b) => b._id), () => load(date))}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
            <CheckCircle size={14} weight="fill" /> Xác nhận tất cả ({pendingCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-24 text-slate-400">
          <CalendarBlank size={48} weight="duotone" />
          <p className="text-sm">Không có lịch đặt nào trong ngày này.</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="w-44 shrink-0 border-r border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dịch vụ</div>
            <div className="flex" style={{ width: totalWidth }}>
              {CAL_SLOTS.map((slot) => (
                <div key={slot} style={{ width: CAL_SLOT_W }} className="border-r border-slate-100 px-1 py-2 text-center text-[10px] font-medium text-slate-400">{slot}</div>
              ))}
            </div>
          </div>
          {lanes.map(({ label, items }) => (
            <div key={label} className="flex border-b border-slate-100 last:border-0">
              <div className="w-44 shrink-0 border-r border-slate-100 px-4 py-3 flex items-start">
                <p className="text-xs font-semibold text-slate-700 leading-snug">{label}</p>
              </div>
              <div className="relative" style={{ width: totalWidth, height: CAL_ROW_H }}>
                {CAL_SLOTS.map((_, i) => (<div key={i} className="absolute top-0 bottom-0 border-r border-slate-50" style={{ left: i * CAL_SLOT_W }} />))}
                {items.map((b) => {
                  const startMin = calMinutes(b.startTime);
                  const endMin = calMinutes(b.endTime);
                  const left = ((startMin - calMinutes('06:00')) / 30) * CAL_SLOT_W;
                  const width = Math.max(((endMin - startMin) / 30) * CAL_SLOT_W - 2, 40);
                  const qrMode = getQrMode(b);
                  return (
                    <div key={b._id} onClick={() => onSelect(b)}
                      title={`${b.userId?.name || '?'} | ${b.startTime}–${b.endTime} | ${STATUS_MAP[b.status]?.label || b.status}`}
                      style={{ left, width, top: 6 }}
                      className={`absolute h-11 rounded-lg border px-2 pt-1 text-left text-[11px] font-medium overflow-hidden cursor-pointer transition-opacity hover:opacity-80 ${CAL_STATUS_COLOR[b.status] || CAL_STATUS_COLOR.pending}`}>
                      {qrMode && (
                        <button onClick={(e) => { e.stopPropagation(); onQR(b); }} title="Xem QR check-in"
                          className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded bg-white/25 hover:bg-white/40 transition-colors">
                          <QrCode size={13} weight="bold" />
                        </button>
                      )}
                      <p className="truncate font-semibold leading-tight pr-5">{b.userId?.name || '—'}</p>
                      <p className="truncate opacity-80 leading-tight">{b.vehicleId?.licensePlate || ''} · {b.startTime}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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

const PAGE_SIZE = 20;

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
  const [toast, setToast] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [qrBooking, setQrBooking] = useState(null); // đơn đang hiển thị QR check-in
  const debounce = useRef(null);

  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  const fetch_ = useCallback(async (q = search, sf = statusFilter, tf = typeFilter, today = todayOnly, pg = 1) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (sf) params.set('status', sf);
      if (tf) params.set('bookingType', tf);
      if (q.trim()) params.set('search', q.trim());
      if (today) { const d = getTodayStr(); params.set('dateFrom', d); params.set('dateTo', d); }
      const res = await api(`/bookings?${params}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const data = p?.data ?? p;
      setBookings(data?.bookings ?? (Array.isArray(data) ? data : []));
      setTotal(data?.total ?? 0);
      setPage(data?.page ?? pg);
      setTotalPages(data?.totalPages ?? 1);
    } catch (err) { setError(err.message || 'Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetch_(); }, []); // eslint-disable-line

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); fetch_(v, statusFilter, typeFilter, todayOnly, 1); }, 420);
  };

  const handleFilter = (v) => { setStatusFilter(v); setPage(1); fetch_(search, v, typeFilter, todayOnly, 1); };
  const handleTypeFilter = (v) => { setTypeFilter(v); setPage(1); fetch_(search, statusFilter, v, todayOnly, 1); };
  const handleTodayToggle = () => { const next = !todayOnly; setTodayOnly(next); setPage(1); fetch_(search, statusFilter, typeFilter, next, 1); };
  const handlePageChange = (pg) => { setPage(pg); fetch_(search, statusFilter, typeFilter, todayOnly, pg); };

  const handleUpdated = (updated) => {
    setBookings((p) => p.map((b) => b._id === updated._id ? updated : b));
    if (selectedBooking && selectedBooking._id === updated._id) {
      setSelectedBooking(updated);
    }
    notify('Đã cập nhật trạng thái đặt lịch');
  };

  const handleCancel = async (id) => {
    setConfirmCancelId(null);
    try {
      const res = await api(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Quản lý hủy' }) });
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
      else fetch_(search, statusFilter, typeFilter, todayOnly, page);
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
            <button onClick={handleTodayToggle}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                todayOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}>
              📅 Hôm nay
            </button>
            <button onClick={() => fetch_(search, statusFilter, typeFilter, todayOnly)} disabled={loading}
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
        <CalendarView
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
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Ngày / Giờ</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-center">QR</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
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
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{b.packageId?.name ?? '—'}</span>
                      {b.bookingType && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${TYPE_MAP[b.bookingType]?.cls || 'bg-slate-100 text-slate-500'}`}>
                          {TYPE_MAP[b.bookingType]?.label || b.bookingType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{new Date(b.bookingDate).toLocaleDateString('vi-VN')}</p>
                    <p className="text-[11px] text-slate-400">{b.startTime}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                      {b.paymentStatus === 'paid' ? 'Đã thanh toán' : b.paymentStatus ?? 'Chưa TT'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusMenu bookingId={b._id} current={b.status} onUpdated={handleUpdated} notify={notify} />
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              ← Trước
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={pg} onClick={() => handlePageChange(pg)} disabled={loading}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    pg === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              Sau →
            </button>
          </div>
          <p className="text-xs text-slate-400">Trang {page}/{totalPages} · {total} lịch hẹn</p>
        </div>
      )}
      </>)}

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {qrBooking && <QRDisplayModal booking={qrBooking} onClose={() => setQrBooking(null)} />}

      {showCheckin && (
        <ManagerQuickCheckin
          onClose={() => setShowCheckin(false)}
          onCheckedIn={(b) => {
            setToast({ type: 'success', message: `Check-in thành công: ${b?.userId?.name || 'khách hàng'}` });
            fetch_(search, statusFilter, typeFilter, todayOnly);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmCancelId}
        title="Xác nhận hủy lịch"
        message="Bạn có chắc chắn muốn hủy lịch đặt này? Hành động không thể hoàn tác."
        confirmLabel="Hủy lịch"
        danger
        onConfirm={() => handleCancel(confirmCancelId)}
        onCancel={() => setConfirmCancelId(null)}
      />

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
