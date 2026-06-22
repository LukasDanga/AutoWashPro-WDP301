import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Buildings, Ticket, CurrencyDollar, CaretLeft, CaretRight, User, Phone, Envelope, Car, CalendarBlank, CheckCircle, Clock, Warning, X } from '@phosphor-icons/react';

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
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Tất cả chi nhánh</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => onFilter(setStatusFilter, e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {STATUS_TABS.map(tab => (
            <option key={tab.key} value={tab.key}>{tab.label}</option>
          ))}
        </select>
        <button onClick={() => load()}
          className="ml-auto px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50">
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

      {detail && (() => {
        const st = STATUS_MAP[detail.status] || { label: detail.status, cls: 'bg-slate-100 text-slate-500' };
        const slotPct = detail.totalSlots > 0 ? (detail.usedSlots / detail.totalSlots) * 100 : 0;
        const slotColor = slotPct >= 80 ? '#ef4444' : slotPct >= 40 ? '#f59e0b' : '#10b981';
        const isPaid = detail.paymentStatus === 'paid';
        const isExpired = detail.status === 'expired';
        const isCancelled = detail.status === 'cancelled';
        const initials = detail.userId?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'KH';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDetail(null)}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="relative bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-5 text-white">
                <button onClick={() => setDetail(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <X size={16} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Ticket size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-lg tracking-wide">{detail.packCode}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
                      {isExpired && <Warning size={14} className="text-amber-400" />}
                      {isCancelled && <X size={14} className="text-red-400" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

                {/* Customer Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <User size={14} className="text-blue-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thông tin khách hàng</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm">{detail.userId?.name || '—'}</div>
                        <div className="text-xs text-slate-400">{detail.userId?.email || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 pl-1">
                      <Phone size={13} className="text-slate-400" />
                      <span>{detail.userId?.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Service Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Buildings size={14} className="text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thông tin dịch vụ</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Buildings size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 w-20 shrink-0">Chi nhánh</span>
                      <span className="font-medium text-slate-800">{detail.branchId?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 w-20 shrink-0">Gói</span>
                      <span className="font-medium text-slate-800">{detail.packageId?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Car size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 w-20 shrink-0">Xe</span>
                      <span className="font-medium text-slate-800 font-mono">{detail.vehicleId?.licensePlate || 'Tất cả xe'}</span>
                    </div>
                  </div>
                </div>

                {/* Slot Usage */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                      <CheckCircle size={14} className="text-violet-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lượt sử dụng</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-slate-800">{detail.totalSlots}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Tổng lượt</div>
                      </div>
                      <div className="w-px h-10 bg-slate-200" />
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-amber-600">{detail.usedSlots}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Đã dùng</div>
                      </div>
                      <div className="w-px h-10 bg-slate-200" />
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-emerald-600">{detail.remainingSlots}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Còn lại</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${slotPct}%`, background: slotColor }} />
                    </div>
                    <div className="text-[11px] text-slate-400 text-right mt-1">
                      Đã dùng {slotPct.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                      <CurrencyDollar size={14} className="text-amber-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thanh toán</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Trạng thái</span>
                      <span className={`inline-flex items-center gap-1.5 font-semibold text-sm px-2.5 py-1 rounded-lg ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isPaid ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Giá cuối</span>
                      <span className="font-bold text-emerald-600 text-lg">{formatCurrency(detail.finalPriceAfterVoucher ?? detail.finalPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Hết hạn</span>
                      <div className="flex items-center gap-1.5">
                        <CalendarBlank size={13} className="text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {detail.expiresAt ? new Date(detail.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Không hết hạn'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <button onClick={() => setDetail(null)}
                  className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}