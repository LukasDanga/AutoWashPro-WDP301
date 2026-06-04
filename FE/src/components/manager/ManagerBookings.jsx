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
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

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

/* ── status config ── */
const STATUS_MAP = {
  pending:     { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700' },
  in_progress: { label: 'Đang thực hiện', cls: 'bg-blue-50 text-blue-700' },
  completed:   { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:   { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500' },
};

const NEXT_STATUS = {
  pending:     ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
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
      if (typeof notify === 'function') notify(err.message, 'error');
      else alert(err.message);
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

/* ── booking details tab ── */
function BookingDetailsTab({ booking, onBack, onUpdated, notify }) {
  const [busy, setBusy] = useState(false);
  const stages = [
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'in_progress', label: 'Đang thực hiện' },
    { id: 'completed', label: 'Hoàn thành' },
  ];

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
      if (typeof notify === 'function') notify(err.message, 'error');
      else alert(err.message);
    } finally { setBusy(false); }
  };

  const handleCashPayment = async () => {
    if (!window.confirm('Xác nhận khách đã thanh toán bằng tiền mặt?')) return;
    setBusy(true);
    try {
      const res = await api(`/payments`, {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking._id, method: 'cash' }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      onUpdated({ ...booking, paymentStatus: 'paid' });
    } catch (err) {
      if (typeof notify === 'function') notify(err.message, 'error');
      else alert(err.message);
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
                        {busy ? 'Đang cập nhật...' : `Chuyển sang ${stages[idx + 1].label}`}
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
            <p className="font-medium text-slate-800">{booking.userId?.name || '—'}</p>
            <p className="text-sm text-slate-600">{booking.userId?.phone || '—'}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.userId?.email || ''}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dịch vụ</h3>
            <p className="font-medium text-slate-800">{booking.packageId?.name || '—'}</p>
            <p className="text-sm text-slate-600">{new Date(booking.bookingDate).toLocaleDateString('vi-VN')} lúc {booking.startTime}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.branchId?.name || '—'}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chi tiết thanh toán</h3>
            <p className="text-sm text-slate-700 mb-2">
              Tổng tiền: <strong className="text-slate-900">{Number(booking.finalPrice || 0).toLocaleString('vi-VN')}₫</strong>
            </p>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : booking.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus === 'pending' ? 'Đang chờ thanh toán' : 'Chưa thanh toán'}
              </span>
              {booking.paymentStatus !== 'paid' && booking.status !== 'cancelled' && (
                <button disabled={busy} onClick={handleCashPayment}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                  Xác nhận tiền mặt
                </button>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ghi chú</h3>
            <p className="text-sm text-slate-600 italic">{booking.note || 'Không có ghi chú'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main ═══ */
export default function ManagerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const debounce = useRef(null);

  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  const fetch_ = useCallback(async (q = search, sf = statusFilter) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (sf) params.set('status', sf);
      if (q.trim()) params.set('search', q.trim());
      const res = await api(`/bookings?${params}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const data = p?.data ?? p;
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message || 'Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetch_(); }, []); // eslint-disable-line

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetch_(v, statusFilter), 420);
  };

  const handleFilter = (v) => { setStatusFilter(v); fetch_(search, v); };

  const handleUpdated = (updated) => {
    setBookings((p) => p.map((b) => b._id === updated._id ? updated : b));
    if (selectedBooking && selectedBooking._id === updated._id) {
      setSelectedBooking(updated);
    }
    notify('Đã cập nhật trạng thái đặt lịch');
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Xác nhận hủy lịch này?')) return;
    try {
      const res = await api(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Quản lý hủy' }) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const updated = p?.data ?? p;
      setBookings((prev) => prev.map((b) => b._id === updated._id ? updated : b));
      notify('Đã hủy lịch');
    } catch (err) { notify(err.message || 'Hủy thất bại', 'error'); }
  };

  if (selectedBooking) {
    return <BookingDetailsTab booking={selectedBooking} onBack={() => setSelectedBooking(null)} onUpdated={handleUpdated} notify={notify} />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
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
          <option value="in_progress">Đang thực hiện</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <button onClick={() => fetch_()} disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{b.userId?.name ?? '—'}</p>
                    <p className="text-[11px] text-slate-400">{b.userId?.phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.packageId?.name ?? '—'}</td>
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedBooking(b)}
                        className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                        Xem đơn
                      </button>
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button onClick={() => handleCancel(b._id)}
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
