import { useState, useRef } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { MagnifyingGlass, CheckCircle, XCircle, ArrowClockwise, Lightning } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

const today = new Date().toISOString().split('T')[0];

const STATUS_LABEL = {
  pending:     { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-700' },
  confirmed:   { label: 'Đã xác nhận', color: 'bg-indigo-100 text-indigo-700' },
  checked_in:  { label: 'Đã check-in', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang rửa',    color: 'bg-violet-100 text-violet-700' },
  completed:   { label: 'Hoàn thành',  color: 'bg-emerald-100 text-emerald-700' },
  cancelled:   { label: 'Đã hủy',      color: 'bg-red-100 text-red-700' },
};

export default function ManagerQuickCheckin({ onClose, onCheckedIn }) {
  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [result, setResult] = useState(null); // { success, name, plate, service }
  const inputRef = useRef(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true); setSearched(false); setResult(null);
    try {
      const params = new URLSearchParams({ search: query.trim(), dateFrom: today, dateTo: today, limit: 20 });
      const res = await api(`/bookings?${params}`);
      const data = await res.json();
      const list = data?.data?.bookings || data?.data || [];
      setBookings(Array.isArray(list) ? list : []);
      setSearched(true);
    } catch { setBookings([]); setSearched(true); }
    finally { setLoading(false); }
  }

  async function checkin(booking) {
    setCheckingId(booking._id);
    try {
      const res = await api(`/bookings/${booking._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'checked_in' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể check-in');
      const b = data?.data;
      setResult({
        success: true,
        name: b?.userId?.name || booking.userId?.name || 'Khách hàng',
        plate: b?.vehicleId?.licensePlate || booking.vehicleId?.licensePlate || '',
        service: b?.packageId?.name || booking.packageId?.name || '',
        time: booking.startTime,
      });
      setBookings((prev) => prev.map((x) => x._id === booking._id ? { ...x, status: 'checked_in' } : x));
      onCheckedIn?.(b);
    } catch (e) {
      setResult({ success: false, message: e.message });
    } finally {
      setCheckingId(null);
    }
  }

  function reset() {
    setResult(null);
    setQuery('');
    setBookings([]);
    setSearched(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Chỉ check-in được khi đơn đã được xác nhận
  const canCheckin = (status) => status === 'confirmed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Lightning size={18} weight="fill" className="text-blue-600" />
            <h2 className="font-semibold text-slate-800">Check-in nhanh</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Nhập SĐT, tên khách hoặc biển số xe…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
              />
            </div>
            <button onClick={search} disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
              {loading ? <ArrowClockwise size={14} className="animate-spin" /> : <MagnifyingGlass size={14} />}
              Tìm
            </button>
          </div>

          <p className="text-xs text-slate-400">Chỉ hiển thị lịch hôm nay — {new Date().toLocaleDateString('vi-VN')}</p>

          {/* Success result */}
          {result?.success && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 py-6">
              <CheckCircle size={40} weight="fill" className="text-emerald-500" />
              <div className="text-center">
                <p className="font-bold text-slate-800">Check-in thành công!</p>
                <p className="text-sm text-slate-600 mt-1">{result.name}</p>
                {result.plate && <p className="text-xs text-slate-500">Biển số: {result.plate}</p>}
                {result.service && <p className="text-xs text-slate-500">Dịch vụ: {result.service} · {result.time}</p>}
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={reset}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Check-in tiếp
                </button>
                <button onClick={onClose}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                  Xong
                </button>
              </div>
            </div>
          )}

          {/* Error result */}
          {result && !result.success && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
              <XCircle size={20} weight="fill" className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Check-in thất bại</p>
                <p className="text-xs text-red-500 mt-0.5">{result.message}</p>
              </div>
              <button onClick={() => setResult(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
            </div>
          )}

          {/* Booking list */}
          {!result?.success && searched && (
            bookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-slate-400 text-sm">
                Không tìm thấy lịch nào hôm nay với từ khóa "<strong>{query}</strong>"
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bookings.map((b) => {
                  const cfg = STATUS_LABEL[b.status] || STATUS_LABEL.pending;
                  const canDo = canCheckin(b.status);
                  return (
                    <div key={b._id}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                        canDo ? 'border-slate-200 bg-white hover:border-blue-200' : 'border-slate-100 bg-slate-50 opacity-60'
                      }`}>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{b.userId?.name || '—'}</span>
                          {b.userId?.tier && <TierBadge tier={b.userId.tier} />}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                          <span>{b.vehicleId?.licensePlate || '—'}</span>
                          <span>·</span>
                          <span>{b.packageId?.name || '—'}</span>
                          <span>·</span>
                          <span>{b.startTime}–{b.endTime}</span>
                        </div>
                      </div>

                      {/* Action */}
                      {canDo ? (
                        <button
                          onClick={() => checkin(b)}
                          disabled={checkingId === b._id}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors">
                          {checkingId === b._id
                            ? <ArrowClockwise size={12} className="animate-spin" />
                            : <CheckCircle size={12} weight="fill" />}
                          Check-in
                        </button>
                      ) : b.status === 'pending' ? (
                        <span className="shrink-0 text-[10px] font-medium text-amber-600">Cần xác nhận đơn trước</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
