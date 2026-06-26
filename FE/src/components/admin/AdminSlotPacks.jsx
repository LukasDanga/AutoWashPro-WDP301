import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Buildings, Ticket, CurrencyDollar, CaretLeft, CaretRight, User, Phone, Envelope, Car, CalendarBlank, CheckCircle, Clock, Warning, X, MagnifyingGlass } from '@phosphor-icons/react';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

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

const PAGE_SIZE = 9;

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

function SlotPackDetail({ pack, onClose }) {
  const st = STATUS_MAP[pack.status] || { label: pack.status, cls: 'bg-slate-100 text-slate-500' };
  const slotPct = pack.totalSlots > 0 ? (pack.usedSlots / pack.totalSlots) * 100 : 0;
  const slotColor = slotPct >= 80 ? '#ef4444' : slotPct >= 40 ? '#f59e0b' : '#10b981';
  const isPaid = pack.paymentStatus === 'paid';
  const initials = pack.userId?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'KH';
  const createdDate = pack.createdAt ? new Date(pack.createdAt).toLocaleString('vi-VN') : 'Không rõ';
  const expiredDate = pack.expiresAt ? new Date(pack.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Không hết hạn';

  return (
    <Modal title="Thông tin chi tiết gói lượt" onClose={onClose}>
      <div className="space-y-5 text-sm text-slate-600">
        {/* Overview Block */}
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-xl border-2 border-white shadow-sm">
            <Ticket size={28} weight="duotone" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {pack.packCode}
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">{pack.userId?.name || 'Khách hàng'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{pack.userId?.email || ''}</p>
          </div>
        </div>

        {/* Grid of details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-b border-slate-100 py-4">
          <div>
            <span className="block text-xs text-slate-400 font-medium">Số điện thoại</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Phone size={14} className="text-slate-400" />
              {pack.userId?.phone || 'Chưa cung cấp'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Chi nhánh</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Buildings size={14} className="text-slate-400" />
              {pack.branchId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Gói dịch vụ</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Ticket size={14} className="text-slate-400" />
              {pack.packageId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Xe</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Car size={14} className="text-slate-400" />
              {pack.vehicleId?.licensePlate || 'Tất cả xe'}
            </span>
          </div>
        </div>

        {/* Slot Usage */}
        <div>
          <span className="block text-xs text-slate-400 font-medium mb-2">Lượt sử dụng</span>
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="grid grid-cols-3 gap-4 text-center mb-3">
              <div>
                <div className="text-2xl font-bold text-slate-800">{pack.totalSlots}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Tổng lượt</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{pack.usedSlots}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Đã dùng</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{pack.remainingSlots}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Còn lại</div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${slotPct}%`, background: slotColor }} />
            </div>
            <div className="text-[11px] text-slate-400 text-right mt-1">Đã dùng {slotPct.toFixed(0)}%</div>
          </div>
        </div>

        {/* Payment & Expiry */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-400">
          <div>
            <span>Thanh toán:</span>
            <p className={`font-semibold mt-0.5 flex items-center gap-1 ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isPaid ? <CheckCircle size={14} weight="fill" /> : <Clock size={14} />}
              {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
            </p>
          </div>
          <div>
            <span>Giá cuối:</span>
            <p className="font-semibold text-emerald-600 mt-0.5">{formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice)}</p>
          </div>
          <div>
            <span>Hết hạn:</span>
            <p className="font-medium text-slate-600 mt-0.5">{expiredDate}</p>
          </div>
          <div>
            <span>Ngày tạo:</span>
            <p className="font-medium text-slate-600 mt-0.5">{createdDate}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminSlotPacks() {
  const [packs, setPacks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (branchFilter) params.set('branchId', branchFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', page);
      params.set('limit', PAGE_SIZE);
      const res = await api(`/slot-packs?${params}`);
      const json = await res.json();
      setPacks(Array.isArray(json?.data) ? json.data : []);
      setTotalPages(json?.pagination?.totalPages || 1);
      setTotal(json?.pagination?.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statusFilter, branchFilter, search, page]);

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

  function onSearchChange(e) {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 300);
  }

  // Stats (from current page data — approximation)
  const activePacks = packs.filter(p => p.status === 'active').length;
  const exhaustedPacks = packs.filter(p => p.status === 'exhausted').length;
  const totalRevenue = packs.reduce((s, p) => s + (p.finalPriceAfterVoucher ?? p.finalPrice ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Ticket, label: 'Tổng gói', value: total, color: 'text-blue-600', bg: 'bg-blue-50' },
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
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={onSearchChange}
            placeholder="Tìm theo tên, SĐT hoặc mã gói..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
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
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50">
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
          <p className="text-sm">{search ? 'Không tìm thấy kết quả phù hợp.' : 'Không có gói slot nào.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {packs.map(pack => {
              const st = STATUS_MAP[pack.status] || { label: pack.status, cls: 'bg-slate-100 text-slate-500' };
              return (
                <div key={pack._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-800 text-sm">{pack.packCode}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{pack.userId?.name || 'Khách hàng'}</div>
                      {pack.userId?.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Phone size={10} />
                          <span>{pack.userId.phone}</span>
                        </div>
                      )}
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
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                ‹ Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === p ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Sau ›
              </button>
            </div>
          )}
        </>
      )}

      {detail && <SlotPackDetail pack={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}