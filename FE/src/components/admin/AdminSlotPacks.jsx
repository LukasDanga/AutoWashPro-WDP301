import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import {
  Buildings, Ticket, CurrencyDollar, User, Phone, Car, CalendarBlank,
  CheckCircle, Clock, X, MagnifyingGlass, ArrowRight, ListChecks,
} from '@phosphor-icons/react';

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

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

const BOOKING_STATUS_MAP = {
  pending:          { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-600' },
  confirmed:        { label: 'Đã xác nhận',  cls: 'bg-blue-50 text-blue-600' },
  checked_in:       { label: 'Đã check-in',  cls: 'bg-indigo-50 text-indigo-600' },
  in_progress:      { label: 'Đang xử lý',   cls: 'bg-violet-50 text-violet-600' },
  awaiting_payment: { label: 'Chờ thanh toán', cls: 'bg-orange-50 text-orange-600' },
  completed:        { label: 'Hoàn thành',   cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:        { label: 'Đã hủy',       cls: 'bg-red-50 text-red-500' },
};

const HISTORY_STATUS_TABS = [
  { key: '',                 label: 'Tất cả' },
  { key: 'in_progress',      label: 'Đang xử lý' },
  { key: 'awaiting_payment', label: 'Chờ thanh toán' },
  { key: 'completed',        label: 'Hoàn thành' },
  { key: 'cancelled',        label: 'Đã hủy' },
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
  const navigate = useNavigate();
  const st = STATUS_MAP[pack.status] || { label: pack.status, cls: 'bg-slate-100 text-slate-500' };
  const slotPct = pack.totalSlots > 0 ? (pack.usedSlots / pack.totalSlots) * 100 : 0;
  const slotColor = slotPct >= 80 ? '#ef4444' : slotPct >= 40 ? '#f59e0b' : '#10b981';
  const isPaid = pack.paymentStatus === 'paid';
  const createdDate = pack.createdAt ? new Date(pack.createdAt).toLocaleString('vi-VN') : 'Không rõ';
  const expiredDate = pack.expiresAt ? new Date(pack.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Không hết hạn';

  const [usageHistory, setUsageHistory] = useState([]);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setUsageLoading(true);
    api(`/slot-packs/${pack._id}/usage-history?limit=50`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setUsageHistory(Array.isArray(d?.data) ? d.data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setUsageLoading(false); });
    return () => { cancelled = true; };
  }, [pack._id]);

  return (
    <Modal title="Thông tin chi tiết gói lượt" onClose={onClose}>
      <div className="space-y-5 text-sm text-slate-600">
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

        {/* Usage History */}
        <div className="border-t border-slate-100 pt-4">
          <span className="block text-xs text-slate-400 font-medium mb-2">Lịch sử sử dụng</span>
          {usageLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
            </div>
          ) : usageHistory.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">Chưa có lượt sử dụng nào</div>
          ) : (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Ngày</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Thời gian</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Mã đơn</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {usageHistory.map(b => {
                    const bst = BOOKING_STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-500' };
                    const d = b.bookingDate ? new Date(b.bookingDate) : null;
                    const dateStr = d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                    return (
                      <tr key={b._id} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-2 font-medium text-slate-700">{dateStr}</td>
                        <td className="px-3 py-2 text-slate-600">{b.startTime || '—'} → {b.endTime || '—'}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-fuchsia-600">{b.bookingCode || '—'}</span>
                          <button
                            onClick={() => navigate(`/admin/bookings?search=${encodeURIComponent(b.bookingCode || b._id)}`)}
                            className="ml-2 rounded-md border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                            Xem thêm
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${bst.cls}`}>{bst.label}</span>
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
    </Modal>
  );
}

function UsageDetail({ booking, onClose }) {
  const navigate = useNavigate();
  const st = BOOKING_STATUS_MAP[booking.status] || { label: booking.status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <Modal title="Chi tiết lượt sử dụng" onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-600">
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 border-2 border-white shadow-sm">
            <Ticket size={24} weight="duotone" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {booking.slotPackId?.packCode || '—'}
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">{booking.userId?.name || 'Khách hàng'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-b border-slate-100 py-4">
          <div>
            <span className="block text-xs text-slate-400 font-medium">Khách hàng</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <User size={14} className="text-slate-400" />
              {booking.userId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Số điện thoại</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Phone size={14} className="text-slate-400" />
              {booking.userId?.phone || 'Chưa cung cấp'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Chi nhánh</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Buildings size={14} className="text-slate-400" />
              {booking.branchId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Gói dịch vụ</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Ticket size={14} className="text-slate-400" />
              {booking.packageId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Ngày sử dụng</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <CalendarBlank size={14} className="text-slate-400" />
              {formatDate(booking.bookingDate)}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Thời gian</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Clock size={14} className="text-slate-400" />
              {booking.startTime || '—'} → {booking.endTime || '—'}
            </span>
          </div>
        </div>

        {booking.slotPackId && (
          <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
            <div className="text-xs text-blue-500 font-medium mb-2">Thông tin gói lượt</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-slate-800">{booking.slotPackId.totalSlots}</div>
                <div className="text-[11px] text-slate-400">Tổng lượt</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-600">{booking.slotPackId.usedSlots}</div>
                <div className="text-[11px] text-slate-400">Đã dùng</div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-600">{booking.slotPackId.remainingSlots}</div>
                <div className="text-[11px] text-slate-400">Còn lại</div>
              </div>
            </div>
          </div>
        )}

        {booking.note && (
          <div>
            <span className="block text-xs text-slate-400 font-medium">Ghi chú</span>
            <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">{booking.note}</p>
          </div>
        )}

        <div className="pt-1">
          <button
            onClick={() => {
              onClose();
              navigate(`/admin/bookings?search=${encodeURIComponent(booking.bookingCode || booking._id)}`);
            }}
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors w-full">
            Xem đơn đặt này trong Booking
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Tab: Danh sách gói ──────────────────────────────────────────────────── */

function PackListTab({ pendingOpenPack, onClearPending }) {
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
  const [viewedAdminSlotPacks, setViewedAdminSlotPacks] = useState([]);
  
  // Expose setDetail to parent if needed, or pass pendingOpenPack down
  // Actually, we can fetch the detail directly in PackListTab if it receives pendingOpenPack.

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('viewed_admin_slot_packs') || '[]');
    setViewedAdminSlotPacks(stored);
  }, []);

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

  useEffect(() => {
    if (pendingOpenPack && pendingOpenPack._id) {
      api(`/slot-packs/${pendingOpenPack._id}`)
        .then(r => r.json())
        .then(d => {
          if (d?.data) {
            setDetail(d.data);
          } else if (d) {
             setDetail(d);
          }
          if (onClearPending) onClearPending();
        })
        .catch(() => { if (onClearPending) onClearPending(); });
    }
  }, [pendingOpenPack, onClearPending]);

  function onFilter(setter, value) { setter(value); setPage(1); }

  function onSearchChange(e) {
    setSearch(e.target.value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 300);
  }

  const handleOpenDetail = (pack) => {
    if (pack._id && !viewedAdminSlotPacks.includes(pack._id)) {
      const next = [...viewedAdminSlotPacks, pack._id];
      setViewedAdminSlotPacks(next);
      localStorage.setItem('viewed_admin_slot_packs', JSON.stringify(next));
      window.dispatchEvent(new Event('admin-slot-pack-viewed'));
    }
    setDetail(pack);
  };

  const todayStr = new Date().toDateString();
  const activePacks = packs.filter(p => p.status === 'active').length;
  const exhaustedPacks = packs.filter(p => p.status === 'exhausted').length;
  const totalRevenue = packs.reduce((s, p) => s + (p.finalPriceAfterVoucher ?? p.finalPrice ?? 0), 0);

  return (
    <div className="space-y-5">
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={onSearchChange}
            placeholder="Tìm theo tên, SĐT hoặc mã gói..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all" />
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
          {STATUS_TABS.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
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
              const isCreatedToday = pack.createdAt && new Date(pack.createdAt).toDateString() === todayStr;
              const isNew = isCreatedToday && !viewedAdminSlotPacks.includes(pack._id);
              return (
                <div key={pack._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
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
                      <div className="text-xs text-slate-500 truncate mt-0.5">{pack.userId?.name || 'Khách hàng'}</div>
                      {pack.userId?.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Phone size={10} /><span>{pack.userId.phone}</span>
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
                  <button onClick={() => handleOpenDetail(pack)}
                    className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
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

/* ─── Tab: Lịch sử sử dụng ────────────────────────────────────────────────── */

function UsageHistoryTab() {
  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
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
      if (dateFilter) params.set('date', dateFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', page);
      params.set('limit', PAGE_SIZE);
      const res = await api(`/slot-packs/usage-history?${params}`);
      const json = await res.json();
      setBookings(Array.isArray(json?.data) ? json.data : []);
      setTotalPages(json?.pagination?.totalPages || 1);
      setTotal(json?.pagination?.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statusFilter, branchFilter, dateFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api('/branches?limit=100').then(r => r.json()).then(d => {
      setBranches(d?.data?.branches || d?.data || []);
    }).catch(() => {});
  }, []);

  function onFilter(setter, value) { setter(value); setPage(1); }

  function onSearchChange(e) {
    setSearch(e.target.value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 300);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: ListChecks, label: 'Tổng lượt dùng', value: total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: CheckCircle, label: 'Hoàn thành', value: bookings.filter(b => b.status === 'completed').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Clock, label: 'Đang xử lý', value: bookings.filter(b => b.status === 'in_progress').length, color: 'text-violet-600', bg: 'bg-violet-50' },
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={onSearchChange}
            placeholder="Tìm theo tên hoặc SĐT khách..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all" />
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
        <input type="date" value={dateFilter} onChange={e => onFilter(setDateFilter, e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <select value={statusFilter} onChange={e => onFilter(setStatusFilter, e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {HISTORY_STATUS_TABS.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
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
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <ListChecks size={48} weight="duotone" />
          <p className="text-sm">{search || dateFilter ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có lượt sử dụng gói nào.'}</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Ngày</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Khách hàng</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Mã gói</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Chi nhánh</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Gói dịch vụ</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Trạng thái</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const st = BOOKING_STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-500' };
                    return (
                      <tr key={b._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          <div className="font-medium">{formatDate(b.bookingDate)}</div>
                          <div className="text-[11px] text-slate-400">{b.startTime} → {b.endTime}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">{b.userId?.name || '—'}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Phone size={9} />{b.userId?.phone || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">{b.slotPackId?.packCode || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{b.branchId?.name || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{b.packageId?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setDetail(b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            Chi tiết <ArrowRight size={10} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
      {detail && <UsageDetail booking={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */

const MAIN_TABS = [
  { key: 'packs',   label: 'Danh sách gói',    icon: Ticket },
  { key: 'history', label: 'Lịch sử sử dụng',  icon: ListChecks },
];

export default function AdminSlotPacks() {
  const [activeTab, setActiveTab] = useState('packs');
  const location = useLocation();
  const [pendingOpenPack, setPendingOpenPack] = useState(null);

  useEffect(() => {
    if (location.state?.openSlotPack) {
      setPendingOpenPack(location.state.openSlotPack);
      setActiveTab('packs');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {MAIN_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'packs' ? (
        <PackListTab 
          pendingOpenPack={pendingOpenPack} 
          onClearPending={() => setPendingOpenPack(null)} 
        />
      ) : (
        <UsageHistoryTab />
      )}
    </div>
  );
}
