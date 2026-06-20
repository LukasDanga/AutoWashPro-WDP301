import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Buildings, Ticket, CurrencyDollar, CaretLeft, CaretRight } from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

const STATUS_MAP = {
  active:    { label: 'Còn hiệu lực', cls: 'bg-emerald-50 text-emerald-700' },
  exhausted: { label: 'Đã dùng hết',  cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Hết hạn',      cls: 'bg-amber-50 text-amber-600' },
  cancelled: { label: 'Đã hủy',       cls: 'bg-red-50 text-red-500' },
};

const STATUS_TABS = [
  { key: '',           label: 'Tất cả' },
  { key: 'active',    label: 'Còn hiệu lực' },
  { key: 'exhausted', label: 'Đã dùng hết' },
  { key: 'expired',   label: 'Hết hạn' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const PAGE_SIZE = 12;

function SlotBar({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
        <span>Còn lại</span>
        <span className="font-medium text-slate-600">{remaining}/{total} lượt</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

export default function AdminSlotPacks() {
  const [packs, setPacks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (branchFilter) params.set('branchId', branchFilter);
      const res = await api(`/slot-packs?${params}`);
      const data = await res.json();
      setPacks(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statusFilter, branchFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api('/branches?limit=100').then(r => r.json()).then(d => {
      setBranches(d?.data?.branches || d?.data || []);
    }).catch(() => {});
  }, []);

  function onFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  // Stats
  const totalPacks = packs.length;
  const activePacks = packs.filter(p => p.status === 'active').length;
  const exhaustedPacks = packs.filter(p => p.status === 'exhausted').length;
  const totalRevenue = packs.reduce((s, p) => s + (p.finalPriceAfterVoucher ?? p.finalPrice ?? 0), 0);

  // Pagination
  const totalPages = Math.ceil(packs.length / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paginated = packs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Ticket, label: 'Tổng gói', value: totalPacks, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Ticket, label: 'Còn hiệu lực', value: activePacks, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Ticket, label: 'Đã dùng hết', value: exhaustedPacks, color: 'text-slate-500', bg: 'bg-slate-100' },
          { icon: CurrencyDollar, label: 'Doanh thu gói lượt', value: formatCurrency(totalRevenue), color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={branchFilter} onChange={e => onFilter(setBranchFilter, e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Tất cả chi nhánh</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <div className="flex gap-1">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => onFilter(setStatusFilter, tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => load()}
          className="ml-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50">
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      ) : packs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Ticket size={48} weight="duotone" />
          <p className="text-sm">Không có gói slot nào.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginated.map(pack => {
              const st = STATUS_MAP[pack.status] || { label: pack.status, cls: 'bg-slate-100 text-slate-500' };
              return (
                <div key={pack._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-800 text-sm">{pack.packCode}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{pack.userId?.name || 'Khách hàng'}</div>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Buildings size={10} className="text-slate-400" />
                      <span className="font-medium text-slate-700">{pack.branchId?.name || '—'}</span>
                    </div>
                    <div>Gói: <span className="font-medium text-slate-700">{pack.packageId?.name || '—'}</span></div>
                    <div>Xe: <span className="font-medium text-slate-700">{pack.vehicleId?.licensePlate || 'Tất cả xe'}</span></div>
                    <div>Giá: <span className="font-medium text-emerald-600">{formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice)}</span></div>
                  </div>
                  <SlotBar total={pack.totalSlots} remaining={pack.remainingSlots} />
                  <button onClick={() => setDetail(pack)}
                    className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Xem chi tiết
                  </button>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                ‹ Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    safePage === p ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>{p}</button>
              ))}
              <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Sau ›
              </button>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setDetail(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 font-mono">{detail.packCode}</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Khách hàng', detail.userId?.name || '—'],
                ['Số điện thoại', detail.userId?.phone || '—'],
                ['Email', detail.userId?.email || '—'],
                ['Chi nhánh', detail.branchId?.name || '—'],
                ['Gói dịch vụ', detail.packageId?.name || '—'],
                ['Xe', detail.vehicleId?.licensePlate || 'Tất cả xe'],
                ['Tổng lượt', String(detail.totalSlots)],
                ['Đã dùng', String(detail.usedSlots)],
                ['Còn lại', String(detail.remainingSlots)],
                ['Thanh toán', detail.paymentStatus === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'],
                ['Giá cuối', formatCurrency(detail.finalPriceAfterVoucher ?? detail.finalPrice)],
                ['Hết hạn', detail.expiresAt ? new Date(detail.expiresAt).toLocaleDateString('vi-VN') : 'Không hết hạn'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-medium text-slate-700 text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setDetail(null)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}