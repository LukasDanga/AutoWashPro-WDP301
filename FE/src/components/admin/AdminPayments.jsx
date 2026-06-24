import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import {
  CurrencyDollar,
  CheckCircle,
  Clock,
  Warning,
  XCircle,
  ArrowClockwise,
  Eye,
  MagnifyingGlass,
  X,
  User,
  Buildings,
  CalendarBlank,
  ArrowUpRight,
  ArrowUUpLeft,
  ArrowsClockwise,
  Sun,
  Receipt,
  Check,
} from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

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

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN');
}

const STATUS_MAP = {
  pending:  { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-700', icon: Clock },
  paid:     { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  failed:   { label: 'Thất bại',      cls: 'bg-red-50 text-red-600',      icon: XCircle },
  refunded: { label: 'Đã hoàn tiền',  cls: 'bg-slate-100 text-slate-500',  icon: ArrowUUpLeft },
};

const METHOD_MAP = {
  cash:  { label: 'Tiền mặt',  cls: 'bg-blue-50 text-blue-700' },
  momo:  { label: 'MoMo',      cls: 'bg-pink-50 text-pink-700' },
  vnpay: { label: 'VNPay',     cls: 'bg-indigo-50 text-indigo-700' },
};

const STATUS_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'paid', label: 'Đã thanh toán' },
  { key: 'pending', label: 'Chờ thanh toán' },
  { key: 'failed', label: 'Thất bại' },
  { key: 'refunded', label: 'Đã hoàn tiền' },
];

const METHOD_TABS = [
  { key: '', label: 'Tất cả phương thức' },
  { key: 'cash', label: 'Tiền mặt' },
  { key: 'momo', label: 'MoMo' },
  { key: 'vnpay', label: 'VNPay' },
];

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

/* ─────────────────────────── Detail View ─────────────────────────── */
function PaymentDetail({ payment, onClose, onConfirm, onRefund, confirming, refunding }) {
  const st = STATUS_MAP[payment.status] || { label: payment.status, cls: 'bg-slate-100 text-slate-500' };
  const mt = METHOD_MAP[payment.method] || { label: payment.method, cls: 'bg-slate-100 text-slate-500' };
  const initials = payment.userId?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'KH';

  return (
    <Modal title="Chi tiết thanh toán" onClose={onClose}>
      <div className="space-y-5 text-sm text-slate-600">
        {/* Overview Block */}
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-xl border-2 border-white shadow-sm">
            <CurrencyDollar size={28} weight="duotone" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {formatCurrency(payment.amount)}
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{payment.transactionId || '—'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${mt.cls}`}>{mt.label}</span>
              <span className="text-[11px] text-slate-400">{formatDateTime(payment.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Grid of details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-b border-slate-100 py-4">
          <div>
            <span className="block text-xs text-slate-400 font-medium">Khách hàng</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <User size={14} className="text-slate-400" />
              {payment.userId?.name || '—'}
              {payment.userId?.tier && <TierBadge tier={payment.userId.tier} />}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Email</span>
            <span className="font-semibold text-slate-700 mt-0.5">{payment.userId?.email || '—'}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Chi nhánh</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Buildings size={14} className="text-slate-400" />
              {payment.bookingId?.branchId?.name || payment.branchId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Ngày đặt</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <CalendarBlank size={14} className="text-slate-400" />
              {payment.bookingId?.bookingDate ? formatDate(payment.bookingId.bookingDate) : '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Loại thanh toán</span>
            <span className="font-semibold text-slate-700 mt-0.5">
              {payment.paymentType === 'deposit' ? 'Đặt cọc' : payment.paymentType === 'remaining' ? 'Thanh toán phần còn lại' : 'Thanh toán đầy đủ'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Trạng thái booking</span>
            <span className="font-semibold text-slate-700 mt-0.5">{payment.bookingId?.status || '—'}</span>
          </div>
        </div>

        {/* Transaction Info */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-400">
          {payment.paidAt && (
            <div>
              <span>Ngày thanh toán:</span>
              <p className="font-medium text-slate-600 mt-0.5">{formatDateTime(payment.paidAt)}</p>
            </div>
          )}
          {payment.refundedAt && (
            <div>
              <span>Ngày hoàn tiền:</span>
              <p className="font-medium text-slate-600 mt-0.5">{formatDateTime(payment.refundedAt)}</p>
            </div>
          )}
          {payment.failureReason && (
            <div className="sm:col-span-2">
              <span>Lý do thất bại:</span>
              <p className="font-medium text-red-500 mt-0.5">{payment.failureReason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {payment.status === 'pending' && (
          <div className="flex gap-2 border-t border-slate-100 pt-4">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Đóng
            </button>
            <button onClick={onConfirm} disabled={confirming}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {confirming ? <Spinner size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {confirming ? 'Đang xác nhận…' : 'Xác nhận thanh toán'}
            </button>
          </div>
        )}
        {payment.status === 'paid' && (
          <div className="flex gap-2 border-t border-slate-100 pt-4">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Đóng
            </button>
            <button onClick={onRefund} disabled={refunding}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              {refunding ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ArrowUUpLeft size={14} />}
              {refunding ? 'Đang hoàn tiền…' : 'Hoàn tiền'}
            </button>
          </div>
        )}
        {(payment.status === 'failed' || payment.status === 'refunded') && (
          <div className="border-t border-slate-100 pt-4">
            <button onClick={onClose}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Đóng
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Refund Modal ─────────────────────────── */
function RefundModal({ payment, onConfirm, onClose, refunding }) {
  const [reason, setReason] = useState('');

  return (
    <Modal title="Xác nhận hoàn tiền" onClose={onClose}>
      <div className="space-y-5 text-sm text-slate-600">
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <Warning size={20} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">Bạn có chắc chắn muốn hoàn tiền giao dịch này? Hành động này không thể hoàn tác.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Mã giao dịch</span>
            <span className="font-mono text-xs font-bold text-slate-700">{payment.transactionId || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Khách hàng</span>
            <span className="font-semibold text-slate-700">{payment.userId?.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Phương thức</span>
            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${(METHOD_MAP[payment.method] || {}).cls || ''}`}>
              {(METHOD_MAP[payment.method] || {}).label || payment.method}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-xs text-slate-400">Số tiền hoàn</span>
            <span className="text-lg font-bold text-red-600">{formatCurrency(payment.amount)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Lý do hoàn tiền</label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Nhập lý do hoàn tiền (không bắt buộc)..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors resize-none"
          />
        </div>

        <div className="flex gap-2 border-t border-slate-100 pt-4">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={() => onConfirm(reason)} disabled={refunding}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {refunding ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <ArrowUUpLeft size={14} />
            )}
            {refunding ? 'Đang hoàn tiền…' : 'Xác nhận hoàn tiền'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Refund Success Modal ─────────────────────────── */
function RefundSuccessModal({ payment, onClose }) {
  return (
    <Modal title="Hoàn tiền thành công" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check size={32} weight="bold" className="text-emerald-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-800">Giao dịch đã được hoàn tiền</p>
          <p className="mt-1 text-sm text-slate-500">
            Số tiền <span className="font-semibold text-red-600">{formatCurrency(payment.amount)}</span> đã được hoàn về cho khách hàng.
          </p>
        </div>
        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Mã giao dịch:</span>
            <span className="font-mono font-bold text-slate-700">{payment.transactionId || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Khách hàng:</span>
            <span className="font-semibold text-slate-700">{payment.userId?.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Thời gian:</span>
            <span className="text-slate-600">{formatDateTime(new Date())}</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
          Đóng
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Main ─────────────────────────── */
export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (methodFilter) params.set('method', methodFilter);
      if (dateFilter === 'today') {
        params.set('today', 'true');
      } else if (dateFilter) {
        params.set('date', dateFilter);
      }
      const res = await api(`/payments?${params}`);
      if (!res.ok) throw new Error('Không thể tải danh sách thanh toán');
      const data = await res.json();
      setPayments(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [statusFilter, methodFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total = payments.length;
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const failedCount = payments.filter(p => p.status === 'failed').length;
  const refundedCount = payments.filter(p => p.status === 'refunded').length;
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  // Search + Pagination
  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.transactionId?.toLowerCase().includes(q) ||
      p.userId?.name?.toLowerCase().includes(q) ||
      p.userId?.email?.toLowerCase().includes(q) ||
      p.userId?.phone?.includes(q)
    );
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function onFilter(setter, value) { setter(value); setPage(1); }

  async function handleConfirm() {
    if (!detail) return;
    setConfirming(true);
    try {
      const res = await api('/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({ transactionId: detail.transactionId, method: detail.method }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Lỗi xác nhận'); }
      const data = await res.json();
      const updated = data?.data || data;
      setPayments(prev => prev.map(p => p._id === updated._id ? updated : p));
      setDetail(null);
      showToast('Xác nhận thanh toán thành công!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setConfirming(false); }
  }

  async function handleRefund(reason) {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const bookingId = refundTarget.bookingId?._id || refundTarget.bookingId;
      const res = await api('/payments/refund', {
        method: 'POST',
        body: JSON.stringify({ bookingId, reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Lỗi hoàn tiền'); }
      const data = await res.json();
      const updated = data?.data || data;
      setPayments(prev => prev.map(p => p._id === updated._id ? updated : p));
      setRefundTarget(null);
      setDetail(null);
      setRefundSuccess(updated);
      showToast('Hoàn tiền thành công!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setRefunding(false); }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Doanh thu', value: formatCurrency(totalRevenue), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowsClockwise },
          { label: 'Tổng giao dịch', value: total, color: 'text-blue-600', bg: 'bg-blue-50', icon: CurrencyDollar },
          { label: 'Thành công', value: paidCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
          { label: 'Chờ xử lý', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Thất bại', value: failedCount, color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
          { label: 'Đã hoàn', value: refundedCount, color: 'text-slate-500', bg: 'bg-slate-100', icon: ArrowUUpLeft },
        ].map(({ label, value, color, bg, icon: Icon }) => (
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
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            placeholder="Tìm theo mã GD, tên, email, SĐT..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={e => onFilter(setStatusFilter, e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {STATUS_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <select value={methodFilter} onChange={e => onFilter(setMethodFilter, e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {METHOD_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <button onClick={() => onFilter(setDateFilter, dateFilter === 'today' ? '' : 'today')}
            className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              dateFilter === 'today'
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}>
            <Sun size={13} /> Hôm nay
          </button>
          <input type="date" value={dateFilter === 'today' ? '' : dateFilter}
            onChange={e => onFilter(setDateFilter, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button onClick={load} disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <CurrencyDollar size={48} weight="duotone" />
          <p className="text-sm">Không có giao dịch nào.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã GD</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Phương thức</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((p) => {
                  const st = STATUS_MAP[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-500' };
                  const mt = METHOD_MAP[p.method] || { label: p.method, cls: 'bg-slate-100 text-slate-500' };
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-700">{p.transactionId || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{p.userId?.name || '—'}</div>
                        <div className="text-xs text-slate-400">{p.userId?.email || ''}</div>
                        {p.userId?.phone && <div className="text-xs text-slate-400">{p.userId.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${mt.cls}`}>{mt.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetail(p)} title="Xem chi tiết"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                ‹ Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    safePage === p ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
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

      {/* Detail Modal */}
      {detail && (
        <PaymentDetail
          payment={detail}
          onClose={() => setDetail(null)}
          onConfirm={handleConfirm}
          onRefund={() => { setRefundTarget(detail); setDetail(null); }}
          confirming={confirming}
          refunding={refunding}
        />
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onConfirm={handleRefund}
          onClose={() => setRefundTarget(null)}
          refunding={refunding}
        />
      )}

      {/* Refund Success Modal */}
      {refundSuccess && (
        <RefundSuccessModal
          payment={refundSuccess}
          onClose={() => setRefundSuccess(null)}
        />
      )}
    </div>
  );
}