import { useEffect, useState, useCallback, useRef } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import useSSE from '@/hooks/useSSE';
import { confirmDialog } from '@/lib/confirm';
import {
  MagnifyingGlass,
  ArrowClockwise,
  Ticket,
  User,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Spinner,
} from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

const STATUS_MAP = {
  active:    { label: 'Còn hiệu lực', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' },
  exhausted: { label: 'Đã dùng hết',  cls: 'bg-slate-100 text-slate-500 border border-slate-200/80' },
  expired:   { label: 'Hết hạn',      cls: 'bg-amber-50 text-amber-600 border border-amber-200/80' },
  cancelled: { label: 'Đã hủy',       cls: 'bg-red-50 text-red-500 border border-red-200/80' },
};

const STATUS_TABS = [
  { key: '',           label: 'Tất cả' },
  { key: 'active',    label: 'Còn hiệu lực' },
  { key: 'exhausted', label: 'Đã dùng hết' },
  { key: 'expired',   label: 'Hết hạn' },
  { key: 'cancelled', label: 'Đã hủy' },
];

function SlotBar({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
        <span>Còn lại</span>
        <span className="font-bold text-slate-700">{remaining}/{total} lượt</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 9;

export default function ManagerSlotPacks({ user }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const [detail, setDetail] = useState(null);
  const [branchId, setBranchId] = useState(user?.branchId || null);

  const [viewedSlotPacks, setViewedSlotPacks] = useState(() => {
    return JSON.parse(localStorage.getItem('viewed_slot_packs') || '[]');
  });

  const [usageHistory, setUsageHistory] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const debounceSearch = useRef(null);

  const loadPacks = useCallback(async (bId = branchId, pg = page, q = search, st = statusFilter) => {
    if (!bId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ branchId: bId, page: pg, limit: PAGE_SIZE });
      if (q.trim()) params.set('search', q.trim());
      if (st) params.set('status', st);

      const res = await api(`/slot-packs?${params}`);
      const resData = await res.json();
      
      const list = resData?.data?.data || (Array.isArray(resData?.data) ? resData.data : (Array.isArray(resData) ? resData : []));
      const pageInfo = resData?.data || {};

      setPacks(list);
      setTotal(pageInfo.total ?? list.length);
      setTotalPages(pageInfo.totalPages ?? 1);
      setPage(pageInfo.page ?? pg);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [branchId, page, search, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let bId = user?.branchId;

      if (!bId) {
        try {
          const res = await api('/branches');
          const p = await res.json();
          const data = p?.data ?? p;
          if (Array.isArray(data) && data.length > 0) {
            bId = data[0]._id;
          }
        } catch { /* silent */ }
      }

      if (cancelled) return;
      setBranchId(bId);
      loadPacks(bId, 1, search, statusFilter);
    }

    init();
    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line

  useEffect(() => {
    if (branchId) loadPacks(branchId, page, search, statusFilter);
  }, [page, statusFilter, branchId]); // eslint-disable-line

  useEffect(() => {
    if (!detail) {
      setUsageHistory([]);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    api(`/slot-packs/${detail._id}/usage-history?limit=50`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setUsageHistory(Array.isArray(d?.data) ? d.data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setUsageLoading(false); });
    return () => { cancelled = true; };
  }, [detail]);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (debounceSearch.current) clearTimeout(debounceSearch.current);
    debounceSearch.current = setTimeout(() => {
      setPage(1);
      loadPacks(branchId, 1, val, statusFilter);
    }, 400);
  };

  const handleStatusTabChange = (key) => {
    setStatusFilter(key);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
    if (debounceSearch.current) clearTimeout(debounceSearch.current);
    loadPacks(branchId, 1, '', '');
  };

  const handleOpenDetail = (pack) => {
    if (pack._id && !viewedSlotPacks.includes(pack._id)) {
      const next = [...viewedSlotPacks, pack._id];
      setViewedSlotPacks(next);
      localStorage.setItem('viewed_slot_packs', JSON.stringify(next));
      window.dispatchEvent(new Event('slot-pack-viewed'));
    }
    setDetail(pack);
  };

  const token = getStoredToken();
  useSSE(token, 'vouchers_updated', () => loadPacks(branchId, page, search, statusFilter));

  async function handleLookup() {
    if (!lookupCode.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const res = await api(`/slot-packs/code/${lookupCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tìm thấy gói slot');
      setLookupResult(data.data || data);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleUseSlot(packId) {
    try {
      const res = await api(`/slot-packs/${packId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi sử dụng slot');
      setLookupResult(data.data || data);
      showToast('Sử dụng 1 lượt thành công!', 'success');
      loadPacks(branchId, page, search, statusFilter);
    } catch (err) {
      setLookupError(err.message);
      showToast(err.message, 'error');
    }
  }

  async function handleCompleteRefund(packId) {
    if (!(await confirmDialog({ title: 'Xác nhận hoàn tiền', message: 'Xác nhận đã hoàn tiền cho khách hàng?' }))) return;
    try {
      const res = await api(`/slot-packs/${packId}/refund-complete`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Lỗi hoàn tiền');
      }
      const data = await res.json();
      setDetail(data.data || data);
      showToast('Đã xác nhận hoàn tiền thành công!', 'success');
      loadPacks(branchId, page, search, statusFilter);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-6">

      {/* Lookup by packCode */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
          <Ticket size={16} className="text-emerald-600" /> Tra cứu & Sử dụng gói lượt theo mã
        </h3>
        <div className="flex gap-2">
          <input
            value={lookupCode}
            onChange={e => setLookupCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Nhập mã gói (VD: SP-ABCD12)..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono tracking-wider transition-all"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !lookupCode.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {lookupLoading ? '...' : 'Tra cứu'}
          </button>
        </div>

        {lookupError && <p className="mt-2 text-xs text-red-500 font-medium">{lookupError}</p>}

        {lookupResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono font-bold text-slate-800 text-base">{lookupResult.packCode}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {lookupResult.userId?.name || 'Khách hàng'} · {lookupResult.userId?.phone || ''}
                </div>
              </div>
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${STATUS_MAP[lookupResult.status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                {STATUS_MAP[lookupResult.status]?.label || lookupResult.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Gói dịch vụ</span>
                <span className="font-medium text-slate-700">{lookupResult.packageId?.name || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Xe</span>
                <span className="font-medium text-slate-700">{lookupResult.vehicleId?.licensePlate || 'Tất cả xe'}</span>
              </div>
            </div>
            <SlotBar total={lookupResult.totalSlots} remaining={lookupResult.remainingSlots} />
            {lookupResult.status === 'active' && lookupResult.remainingSlots > 0 && (
              <button
                onClick={() => handleUseSlot(lookupResult._id)}
                className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                Dùng 1 lượt (còn {lookupResult.remainingSlots})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Customer Name / Code Search */}
          <div className="relative min-w-[240px] flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên khách hàng, mã gói (SP-...)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            {search && (
              <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleStatusTabChange(tab.key)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(search || statusFilter) && (
            <button
              onClick={handleClearFilters}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer ml-auto"
            >
              <XCircle size={14} /> Xóa bộ lọc
            </button>
          )}
          <button
            onClick={() => loadPacks(branchId, page, search, statusFilter)}
            disabled={loading}
            className={`flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer ${!(search || statusFilter) ? 'ml-auto' : ''}`}
          >
            <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Packs Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : packs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <Ticket size={48} weight="duotone" />
          <p className="text-sm font-medium">Không tìm thấy gói lượt nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {packs.map(pack => {
              const st = STATUS_MAP[pack.status] || { label: pack.status, cls: 'bg-slate-100 text-slate-500' };

              // MỚI badge logic: created today AND not yet viewed in detail
              const isCreatedToday = pack.createdAt && new Date(pack.createdAt).toDateString() === todayStr;
              const isNew = isCreatedToday && !viewedSlotPacks.includes(pack._id);

              return (
                <div key={pack._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{pack.packCode}</span>
                          {isNew && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                          {pack.userId?.name || 'Khách hàng'}
                        </div>
                      </div>
                      <span className={`shrink-0 text-[11px] font-bold rounded-full px-2.5 py-0.5 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 border-t border-slate-50 pt-2">
                      <div>Gói dịch vụ: <span className="font-semibold text-slate-700">{pack.packageId?.name || '—'}</span></div>
                      <div>Xe áp dụng: <span className="font-semibold text-slate-700">{pack.vehicleId?.licensePlate || 'Tất cả xe'}</span></div>
                      <div>Giá thanh toán: <span className="font-bold text-emerald-600">{formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice)}</span></div>
                      {pack.discountPercent > 0 && <div>Chiết khấu: <span className="font-semibold text-emerald-600">-{pack.discountPercent}%</span></div>}
                    </div>

                    <SlotBar total={pack.totalSlots} remaining={pack.remainingSlots} />
                  </div>

                  <button
                    onClick={() => handleOpenDetail(pack)}
                    className="w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Eye size={14} />
                    Xem chi tiết
                  </button>
                </div>
              );
            })}
          </div>

          {/* Server-side Pagination Bar (9 items / page) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 rounded-2xl shadow-xs text-xs text-slate-500">
            <div>
              Hiển thị <span className="font-semibold text-slate-700">{((page - 1) * PAGE_SIZE) + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(page * PAGE_SIZE, total)}</span> trên tổng số <span className="font-semibold text-slate-700">{total}</span> gói lượt
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  ← Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      pNum === page
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Sau →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setDetail(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-slate-800 font-mono text-base">{detail.packCode}</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">✕</button>
            </div>
            <div className="p-6 space-y-3 text-xs overflow-y-auto flex-1 text-slate-600">
              {[
                ['Khách hàng', detail.userId?.name || '—'],
                ['Số điện thoại', detail.userId?.phone || '—'],
                ['Email', detail.userId?.email || '—'],
                ['Gói dịch vụ', detail.packageId?.name || '—'],
                ['Chi nhánh', detail.branchId?.name || '—'],
                ['Xe', detail.vehicleId?.licensePlate || 'Tất cả xe'],
                ['Tổng lượt', String(detail.totalSlots)],
                ['Đã dùng', String(detail.usedSlots)],
                ['Còn lại', String(detail.remainingSlots)],
                ['Thanh toán', detail.paymentStatus === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'],
                ['Giá cuối', formatCurrency(detail.finalPriceAfterVoucher ?? detail.finalPrice)],
                ['Hết hạn', detail.expiresAt ? new Date(detail.expiresAt).toLocaleDateString('vi-VN') : 'Không hết hạn'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">{k}</span>
                  <span className="font-semibold text-slate-700 text-right">{v}</span>
                </div>
              ))}

              {/* Refund Info */}
              {detail.status === 'cancelled' && detail.refundStatus && detail.refundStatus !== 'none' && (
                <div className="border-t border-red-100 pt-4 mt-2 bg-red-50 -mx-6 px-6 pb-4">
                  <span className="block text-xs text-red-500 font-bold mb-2 uppercase tracking-wider">Thông tin hoàn tiền</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {detail.refundAmount?.toLocaleString('vi-VN')}₫
                    </span>
                    {detail.refundStatus === 'pending' ? (
                      <button
                        onClick={() => handleCompleteRefund(detail._id)}
                        className="rounded-lg bg-orange-100 text-orange-700 px-3 py-1.5 text-xs font-bold hover:bg-orange-200 transition-colors cursor-pointer"
                      >
                        Xác nhận đã hoàn
                      </button>
                    ) : (
                      <span className="rounded-lg bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold">
                        Đã hoàn tiền
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Lịch sử sử dụng của Gói Lượt */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <span className="block text-xs text-slate-400 font-medium mb-2">Lịch sử sử dụng</span>
                {usageLoading ? (
                  <div className="flex justify-center py-4">
                    <ArrowClockwise className="h-4 w-4 animate-spin text-emerald-600" />
                  </div>
                ) : usageHistory.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">Chưa có lượt sử dụng nào</div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-3 py-2 font-semibold text-slate-500">Ngày</th>
                          <th className="px-3 py-2 font-semibold text-slate-500">Giờ</th>
                          <th className="px-3 py-2 font-semibold text-slate-500">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageHistory.map(b => {
                          const dateStr = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('vi-VN') : '—';
                          const statusLabel = 
                            b.status === 'completed' ? 'Hoàn thành' :
                            b.status === 'cancelled' ? 'Đã hủy' :
                            b.status === 'pending' ? 'Chờ xử lý' :
                            'Đã xác nhận';
                          const statusCls = 
                            b.status === 'completed' ? 'text-emerald-600 font-semibold' :
                            b.status === 'cancelled' ? 'text-red-500 font-semibold' :
                            'text-slate-600';
                          
                          return (
                            <tr key={b._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-medium text-slate-700">{dateStr}</td>
                              <td className="px-3 py-2 text-slate-600">{b.startTime || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={statusCls}>{statusLabel}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setDetail(null)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
