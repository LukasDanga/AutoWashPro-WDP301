import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import {
  MagnifyingGlass, ArrowClockwise, X, Buildings, CalendarBlank,
  CheckCircle, XCircle, Clock, Spinner,
} from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

const STATUS_CONFIG = {
  pending:    { label: 'Chờ xử lý',    color: 'bg-amber-100 text-amber-700' },
  checked_in: { label: 'Đã check-in',  color: 'bg-blue-100 text-blue-700' },
  in_progress:{ label: 'Đang rửa',     color: 'bg-purple-100 text-purple-700' },
  completed:  { label: 'Hoàn thành',   color: 'bg-emerald-100 text-emerald-700' },
  cancelled:  { label: 'Đã hủy',       color: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('vi-VN') : '—';
}
function fmtMoney(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async (pg = 1) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: 10 });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (branchId) params.set('branchId', branchId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await api(`/bookings?${params}`);
      if (!res.ok) throw new Error('Không thể tải danh sách đặt lịch');
      const data = await res.json();
      const list = data?.data?.bookings || data?.data || [];
      setBookings(Array.isArray(list) ? list : []);
      const pag = data?.data?.pagination;
      setTotalPages(pag?.totalPages || 1);
      setTotal(pag?.total || 0);
      setPage(pg);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, status, branchId, dateFrom, dateTo]);

  useEffect(() => {
    api('/branches?limit=100').then((r) => r.json()).then((d) => {
      setBranches(d?.data?.branches || d?.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function cancelBooking(id) {
    setCancelling(true);
    try {
      const res = await api(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: 'Admin hủy' }),
      });
      if (!res.ok) throw new Error('Không thể hủy');
      setSelected(null);
      load(page);
    } catch (e) { alert(e.message); }
    finally { setCancelling(false); }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm khách hàng, biển số…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        {/* Branch */}
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Tất cả chi nhánh</option>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        {/* Status */}
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {/* Date range */}
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={() => load(1)} disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} /> Tìm kiếm
        </button>
        {(search || status || branchId || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setStatus(''); setBranchId(''); setDateFrom(''); setDateTo(''); }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50">
            <X size={12} /> Xóa lọc
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500 px-1">Tổng: <span className="font-semibold">{total}</span> đặt lịch</p>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-slate-400">
          <CalendarBlank size={48} weight="duotone" />
          <p className="text-sm">Không có đặt lịch nào.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Khách hàng', 'Chi nhánh', 'Dịch vụ', 'Ngày', 'Giờ', 'Tổng tiền', 'Trạng thái', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-slate-800 flex items-center gap-1.5">
                          {b.userId?.name || '—'}
                          {b.status === 'pending' && b.createdAt && (Date.now() - new Date(b.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                            </span>
                          )}
                        </p>
                        <p className="text-slate-400">{b.vehicleId?.licensePlate || '—'}</p>
                      </div>
                      {b.userId?.tier && <TierBadge tier={b.userId.tier} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600 flex items-center gap-1">
                      <Buildings size={11} className="text-slate-400" />
                      {b.branchId?.name || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="truncate text-slate-700">{b.packageId?.name || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(b.bookingDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{b.startTime}–{b.endTime}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{fmtMoney(b.finalPrice)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(b)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 transition-colors">
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {total > 0 ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} / ${total}` : '0 kết quả'}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => load(page - 1)} disabled={page <= 1 || loading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1 text-xs text-slate-400">...</span>
                    ) : (
                      <button key={p} onClick={() => load(p)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          p === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>{p}</button>
                    )
                  )}
                <button onClick={() => load(page + 1)} disabled={page >= totalPages || loading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Chi tiết đặt lịch</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Khách hàng', selected.userId?.name],
                ['Email', selected.userId?.email],
                ['Biển số', selected.vehicleId?.licensePlate],
                ['Chi nhánh', selected.branchId?.name],
                ['Dịch vụ', selected.packageId?.name],
                ['Ngày', fmtDate(selected.bookingDate)],
                ['Giờ', `${selected.startTime} – ${selected.endTime}`],
                ['Tổng tiền', fmtMoney(selected.finalPrice)],
                ['Thanh toán', selected.paymentStatus],
                ['Ghi chú', selected.note],
                ['Lý do hủy', selected.cancellationReason],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2">
                  <span className="w-28 shrink-0 text-slate-500">{k}:</span>
                  <span className="text-slate-800 font-medium">{v}</span>
                </div>
              ) : null)}
              <div className="flex gap-2 items-center">
                <span className="w-28 shrink-0 text-slate-500">Trạng thái:</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex gap-3 justify-end">
              <button onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Đóng</button>
              {!['completed', 'cancelled'].includes(selected.status) && (
                <button onClick={() => cancelBooking(selected._id)} disabled={cancelling}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                  {cancelling ? <Spinner size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Hủy đặt lịch
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
