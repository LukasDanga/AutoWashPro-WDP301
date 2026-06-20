import { useCallback, useEffect, useState } from 'react';
import {
  ArrowClockwise,
  CheckCircle,
  MagnifyingGlass,
  Plus,
  Tag,
  Trash,
  Warning,
  X,
  XCircle,
  PencilSimple,
  ClockCounterClockwise,
  Gift,
  Coin,
  Trophy,
} from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
  });
}
async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; } catch { return `Lỗi ${res.status}`; }
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
    <div role="alert" className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 bg-white ${ok ? 'text-emerald-700 ring-emerald-200' : 'text-red-600 ring-red-200'}`}>
      {ok ? <CheckCircle size={15} weight="fill" /> : <XCircle size={15} weight="fill" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-1 opacity-50 hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';
const EMPTY_VOUCHER = {
  code: '', name: '', description: '', type: 'percentage', value: '',
  maxDiscount: '', minOrder: '', quantity: '', startDate: '', endDate: '',
  applicableToAllBranches: true, applicableToAllPackages: true, status: 'active',
};

function VoucherModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({ ...EMPTY_VOUCHER, ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = 'Nhập mã voucher';
    if (!form.name.trim()) e.name = 'Nhập tên voucher';
    if (!form.value) e.value = 'Nhập giá trị';
    if (!form.quantity) e.quantity = 'Nhập số lượng';
    if (!form.startDate) e.startDate = 'Chọn ngày bắt đầu';
    if (!form.endDate) e.endDate = 'Chọn ngày kết thúc';
    return e;
  };

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    onSave({
      ...form,
      value: Number(form.value),
      maxDiscount: Number(form.maxDiscount) || 0,
      minOrder: Number(form.minOrder) || 0,
      quantity: Number(form.quantity),
    });
  };

  const isEdit = !!initial?._id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">{isEdit ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="max-h-[72vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Mã voucher <span className="text-red-500">*</span></label>
              <input className={inp} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="SUMMER20" disabled={isEdit} />
              {errors.code && <p className="mt-0.5 text-[11px] text-red-500">{errors.code}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Số lượng <span className="text-red-500">*</span></label>
              <input type="number" min="0" className={inp} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="100" />
              {errors.quantity && <p className="mt-0.5 text-[11px] text-red-500">{errors.quantity}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tên voucher <span className="text-red-500">*</span></label>
            <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Giảm giá mùa hè" />
            {errors.name && <p className="mt-0.5 text-[11px] text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
            <input className={inp} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Loại</label>
              <select className={inp} value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="percentage">Phần trăm (%)</option>
                <option value="fixed">Cố định (₫)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Giá trị <span className="text-red-500">*</span></label>
              <input type="number" min="0" className={inp} value={form.value} onChange={(e) => set('value', e.target.value)} placeholder="20" />
              {errors.value && <p className="mt-0.5 text-[11px] text-red-500">{errors.value}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Giảm tối đa (₫)</label>
              <input type="number" min="0" className={inp} value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="100000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Đơn hàng tối thiểu (₫)</label>
              <input type="number" min="0" className={inp} value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái</label>
              <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Kích hoạt</option>
                <option value="inactive">Tắt</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Áp dụng cho hạng thành viên (để trống là áp dụng tất cả)</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {[
                { id: 'bronze', label: 'Đồng' },
                { id: 'silver', label: 'Bạc' },
                { id: 'gold', label: 'Vàng' },
                { id: 'diamond', label: 'Kim Cương' }
              ].map((tier) => {
                const currentTiers = form.applicableTiers || [];
                const isChecked = currentTiers.includes(tier.id);
                return (
                  <label key={tier.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          set('applicableTiers', [...currentTiers, tier.id]);
                        } else {
                          set('applicableTiers', currentTiers.filter(t => t !== tier.id));
                        }
                      }} 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                    />
                    {tier.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ngày bắt đầu <span className="text-red-500">*</span></label>
              <input type="date" className={inp} value={form.startDate?.split('T')[0] ?? form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              {errors.startDate && <p className="mt-0.5 text-[11px] text-red-500">{errors.startDate}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ngày kết thúc <span className="text-red-500">*</span></label>
              <input type="date" className={inp} value={form.endDate?.split('T')[0] ?? form.endDate} onChange={(e) => set('endDate', e.target.value)} />
              {errors.endDate && <p className="mt-0.5 text-[11px] text-red-500">{errors.endDate}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving && <Spinner size={14} />}{saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VoucherUsageModal({ voucherId, onClose }) {
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchUsages = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await api(`/vouchers/usage/${voucherId}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load usage');
      const p = await res.json();
      setUsages(p?.data ?? []);
      if (p?.pagination) setPagination(p.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [voucherId, page, dateFrom, dateTo]);

  useEffect(() => { fetchUsages(); }, [fetchUsages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">Lịch sử sử dụng Voucher</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Từ ngày:</span>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Đến ngày:</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100" />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium">Xóa bộ lọc</button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{pagination.total} kết quả</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-0">
          {loading ? (
             <div className="flex justify-center py-10"><Spinner /></div>
          ) : error ? (
             <p className="text-red-500 text-sm text-center py-10">{error}</p>
          ) : usages.length === 0 ? (
             <p className="text-slate-500 text-sm text-center py-10">Chưa có ai sử dụng voucher này.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">Ngày đặt</th>
                    <th className="px-4 py-3">Giảm giá</th>
                    <th className="px-4 py-3">Ngày dùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usages.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{u.userId?.name || '—'}</span>
                            {u.userId?.tier && <TierBadge tier={u.userId.tier} />}
                          </div>
                          {u.userId?.phone && <p className="text-[11px] text-slate-400 mt-0.5">{u.userId.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.bookingId?.bookingDate ? formatDate(u.bookingId.bookingDate) : '—'}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">-{Number(u.discountAmount).toLocaleString('vi-VN')}₫</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.usedAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  {pagination.total > 0 ? `${(pagination.page - 1) * 10 + 1}–${Math.min(pagination.page * 10, pagination.total)} / ${pagination.total}` : '0 kết quả'}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!pagination.hasPrevPage}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Trước
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-1 text-xs text-slate-400">...</span>
                      ) : (
                        <button key={p} onClick={() => setPage(p)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            p === pagination.page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}>{p}</button>
                      )
                    )}
                  <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNextPage}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VoucherUsageReportTab() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api('/vouchers/usage-report')
      .then(res => { if (!res.ok) throw new Error('Failed to load report'); return res.json(); })
      .then(p => { if (mounted) { setReport(p?.data ?? []); setLoading(false); } })
      .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-24 text-slate-400"><Spinner size={24} /></div>;
  if (error) return <div className="text-red-500 text-center py-10 flex flex-col items-center gap-2"><Warning size={24} />{error}</div>;
  if (report.length === 0) return <div className="text-slate-500 text-center py-10">Chưa có dữ liệu sử dụng voucher.</div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {report.map(item => (
        <div key={item.userId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                {item.user?.name || 'Khách vãng lai'}
                {item.user?.tier && <TierBadge tier={item.user.tier} />}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{item.user?.phone || item.user?.email || 'Chưa có thông tin liên hệ'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">Đã tiết kiệm: {Number(item.totalDiscountAmount).toLocaleString('vi-VN')}₫</p>
              <p className="text-xs text-slate-500 mt-1">Sử dụng tổng cộng {item.totalUsedVouchers} voucher</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {item.vouchersUsed.map((v, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex flex-col gap-1 overflow-hidden pr-2">
                   <div className="flex items-center gap-1.5">
                     <span className="font-mono text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shadow-sm">{v.code}</span>
                   </div>
                   <span className="text-[11px] font-medium text-slate-600 truncate" title={v.name}>{v.name}</span>
                </div>
                <div className="text-right flex flex-col shrink-0">
                   <span className="text-xs font-bold text-emerald-600">-{Number(v.totalDiscount).toLocaleString('vi-VN')}₫</span>
                   <span className="text-[10px] text-slate-400 mt-0.5">{v.count} lần dùng</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardOverview({ vouchers }) {
  const now = new Date();
  const total = vouchers.length;
  const active = vouchers.filter(v => v.status === 'active' && new Date(v.endDate) >= now).length;
  const expired = vouchers.filter(v => new Date(v.endDate) < now).length;
  const totalRemaining = vouchers.reduce((sum, v) => sum + (v.remaining || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Gift size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng Voucher</p>
            <p className="text-xl font-bold text-slate-800">{total}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Đang hoạt động</p>
            <p className="text-xl font-bold text-emerald-700">{active}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Coin size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Lượt còn lại</p>
            <p className="text-xl font-bold text-amber-700">{totalRemaining.toLocaleString('vi-VN')}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Hết hạn</p>
            <p className="text-xl font-bold text-slate-600">{expired}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main ═══ */
export default function AdminRewards() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  const fetch_ = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page);
      params.append('limit', 10);
      const res = await api(`/vouchers?${params.toString()}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const data = p?.data ?? p;
      setVouchers(Array.isArray(data) ? data : []);
      if (p?.pagination) setPagination(p.pagination);
    } catch (err) { setError(err.message || 'Không thể tải voucher'); }
    finally { setLoading(false); }
  }, [search, statusFilter, startDate, endDate, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const res = await api('/vouchers', { method: 'POST', body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await readErr(res));
      setModal(null); notify('Tạo voucher thành công!');
      setPage(1); fetch_();
    } catch (err) { notify(err.message || 'Tạo thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      const res = await api(`/vouchers/${selected._id}`, { method: 'PUT', body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json(); const updated = p?.data ?? p;
      setVouchers((prev) => prev.map((v) => v._id === updated._id ? updated : v));
      setModal(null); notify('Cập nhật voucher thành công!');
    } catch (err) { notify(err.message || 'Cập nhật thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa voucher này?')) return;
    try {
      const res = await api(`/vouchers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readErr(res));
      setVouchers((prev) => prev.filter((v) => v._id !== id));
      notify('Xóa voucher thành công!');
    } catch (err) { notify(err.message || 'Xóa thất bại', 'error'); }
  };

  const isExpired = (v) => new Date(v.endDate) < new Date();
  const isActive = (v) => v.status === 'active' && !isExpired(v);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Tổng quan
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Danh sách Voucher
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'report' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Báo cáo sử dụng
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <DashboardOverview vouchers={vouchers} />

          {/* Points config */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)' }}>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Coin size={16} weight="duotone" className="text-emerald-600" />
                Cấu hình chương trình điểm thưởng
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tích điểm */}
                <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#eff6ff,#f0f9ff)', border: '1px solid #bfdbfe' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dbeafe' }}>
                      <Coin size={16} className="text-blue-600" weight="fill" />
                    </div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tích điểm</p>
                  </div>
                  <p className="text-3xl font-extrabold text-blue-700">5%</p>
                  <p className="text-xs text-blue-500 mt-1">Giá trị đơn hàng</p>
                </div>

                {/* Hạng thành viên */}
                <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#fefce8,#fffbeb)', border: '1px solid #fde68a' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
                      <Trophy size={16} className="text-amber-600" weight="fill" />
                    </div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Hạng thành viên</p>
                  </div>
                  <div className="flex gap-2">
                    {['bronze', 'silver', 'gold', 'diamond'].map(t => <TierBadge key={t} tier={t} />)}
                  </div>
                </div>

                {/* Hệ số nhân */}
                <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Hệ số nhân</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Đồng', mult: 'x1', color: '#b45309', bg: '#fef3c7' },
                      { label: 'Bạc', mult: 'x1.2', color: '#475569', bg: '#f1f5f9' },
                      { label: 'Vàng', mult: 'x1.5', color: '#a16207', bg: '#fef9c3' },
                      { label: 'Kim Cương', mult: 'x2', color: '#0e7490', bg: '#ecfeff' },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between rounded-lg px-2.5 py-1" style={{ background: r.bg }}>
                        <span className="text-[11px] font-semibold" style={{ color: r.color }}>{r.label}</span>
                        <span className="text-xs font-extrabold" style={{ color: r.color }}>{r.mult}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tier progression */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg,#fefce8,#fffbeb)' }}>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Trophy size={16} weight="duotone" className="text-amber-500" />
                Ngưỡng nâng hạng
              </h3>
            </div>
            <div className="p-6">
              <div className="relative">
                {/* Connection line */}
                <div className="absolute top-10 left-0 right-0 h-0.5 bg-slate-100 hidden md:block" />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { tier: 'bronze', label: 'Đồng', points: '0', mult: 'x1', desc: 'Bắt đầu', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
                    { tier: 'silver', label: 'Bạc', points: '100,000đ', mult: 'x1.2', desc: 'Tích lũy', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
                    { tier: 'gold', label: 'Vàng', points: '500,000đ', mult: 'x1.5', desc: 'Thân thiết', color: '#a16207', bg: '#fef9c3', border: '#facc15' },
                    { tier: 'diamond', label: 'Kim Cương', points: '1,000,000đ', mult: 'x2', desc: 'VIP', color: '#0e7490', bg: '#ecfeff', border: '#22d3ee' },
                  ].map((row, i) => (
                    <div key={row.tier} className="relative flex flex-col items-center text-center">
                      <div className="relative z-10 w-full rounded-xl p-4 transition-all hover:scale-105 hover:shadow-md"
                        style={{ background: row.bg, border: `2px solid ${row.border}` }}>
                        <div className="flex justify-center mb-2">
                          <TierBadge tier={row.tier} />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{row.desc}</p>
                        <p className="text-lg font-extrabold" style={{ color: row.color }}>{row.points}</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: row.color }}>Hệ số {row.mult}</p>
                      </div>
                      {i < 3 && (
                        <div className="hidden md:block absolute top-10 -right-2 z-20 text-slate-300">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' ? (
        <VoucherUsageReportTab />
      ) : activeTab === 'list' && (
        <>
          {/* Toolbar */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button onClick={() => { setPage(1); fetch_(); }} disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white !text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên voucher..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button onClick={() => { setSelected(null); setModal('create'); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm">
                <Plus size={14} weight="bold" />Tạo voucher
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Tắt</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Từ ngày:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Đến ngày:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              </div>
              {(statusFilter || startDate || endDate) && (
                <button
                  onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400"><Spinner size={24} /></div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 py-16 text-red-500">
              <Warning size={26} weight="duotone" /><p className="text-sm">{error}</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20">
              <Tag size={40} weight="thin" className="text-slate-300" />
              <p className="text-sm text-slate-500">Chưa có voucher nào</p>
              <button onClick={() => { setSelected(null); setModal('create'); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                <Plus size={13} weight="bold" />Tạo voucher đầu tiên
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Tên</th>
                    <th className="px-4 py-3">Giá trị</th>
                    <th className="px-4 py-3">SL còn lại</th>
                    <th className="px-4 py-3">Hiệu lực</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vouchers.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">{v.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{v.name}</p>
                        {v.description && <p className="text-[11px] text-slate-400 truncate max-w-[180px]" title={v.description}>{v.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {v.type === 'percentage' ? `${v.value}%` : `${formatCurrency(v.value)}₫`}
                        {v.maxDiscount > 0 && <span className="text-[11px] text-slate-400"> (tối đa {formatCurrency(v.maxDiscount)}₫)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.remaining ?? v.quantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(v.startDate)} – {formatDate(v.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive(v) ? 'bg-emerald-50 text-emerald-700' : isExpired(v) ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600'}`}>
                          {isActive(v) ? 'Hoạt động' : isExpired(v) ? 'Hết hạn' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelected(v); setModal('usage'); }} title="Lịch sử dùng"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                            <ClockCounterClockwise size={14} />
                          </button>
                          <button onClick={() => { setSelected(v); setModal('edit'); }} title="Chỉnh sửa"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <PencilSimple size={14} />
                          </button>
                          <button onClick={() => handleDelete(v._id)} title="Xóa"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Hiển thị {(pagination.page - 1) * 10 + 1}–{Math.min(pagination.page * 10, pagination.total)} / {pagination.total} voucher
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Trước
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-1 text-xs text-slate-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            p === pagination.page
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNextPage}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {modal === 'create' && (
        <VoucherModal initial={null} onSave={handleCreate} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal === 'edit' && selected && (
        <VoucherModal initial={selected} onSave={handleUpdate} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal === 'usage' && selected && (
        <VoucherUsageModal voucherId={selected._id} onClose={() => setModal(null)} />
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
