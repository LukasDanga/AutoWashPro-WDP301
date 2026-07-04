import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/lib/toast';
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

/* ── voucher form modal ── */
const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';
const EMPTY_VOUCHER = {
  code: '', name: '', description: '', type: 'percentage', value: '',
  maxDiscount: '', minOrder: '', quantity: '', startDate: '', endDate: '',
  branchId: '', applicableToAllBranches: false, applicableToAllPackages: true, status: 'active',
};

function VoucherModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({ ...EMPTY_VOUCHER, ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    const today = new Date().toISOString().split('T')[0];
    if (!form.code.trim()) e.code = 'Nhập mã voucher';
    if (!form.name.trim()) e.name = 'Nhập tên voucher';
    if (!form.value) e.value = 'Nhập giá trị';
    if (!form.quantity) e.quantity = 'Nhập số lượng';
    if (!form.startDate) e.startDate = 'Chọn ngày bắt đầu';
    if (!form.endDate) e.endDate = 'Chọn ngày kết thúc';
    if (form.startDate && form.startDate < today) e.startDate = 'Ngày bắt đầu không được ở quá khứ';
    if (form.endDate && form.endDate < today) e.endDate = 'Ngày kết thúc không được ở quá khứ';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      e.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
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
              <input type="date" className={inp} min={new Date().toISOString().split('T')[0]} value={form.startDate?.split('T')[0] ?? form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              {errors.startDate && <p className="mt-0.5 text-[11px] text-red-500">{errors.startDate}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ngày kết thúc <span className="text-red-500">*</span></label>
              <input type="date" className={inp} min={form.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]} value={form.endDate?.split('T')[0] ?? form.endDate} onChange={(e) => set('endDate', e.target.value)} />
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

  useEffect(() => {
    let mounted = true;
    api(`/vouchers/usage/${voucherId}`)
      .then(res => { if (!res.ok) throw new Error('Failed to load usage'); return res.json(); })
      .then(p => { if (mounted) { setUsages(p?.data ?? []); setLoading(false); } })
      .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
    return () => { mounted = false; };
  }, [voucherId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">Lịch sử sử dụng Voucher</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto p-0">
          {loading ? (
             <div className="flex justify-center py-10"><Spinner /></div>
          ) : error ? (
             <p className="text-red-500 text-sm text-center py-10">{error}</p>
          ) : usages.length === 0 ? (
             <p className="text-slate-500 text-sm text-center py-10">Chưa có ai sử dụng voucher này.</p>
          ) : (
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
                  <tr key={u._id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{u.userId?.name || '—'}</span>
                        {u.userId?.tier && <TierBadge tier={u.userId.tier} />}
                        {u.usedAt && (Date.now() - new Date(u.usedAt).getTime() < 24 * 60 * 60 * 1000) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.bookingId?.bookingDate ? formatDate(u.bookingId.bookingDate) : '—'}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">-{Number(u.discountAmount).toLocaleString('vi-VN')}₫</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.usedAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── voucher usage report tab ── */
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

/* ═══ Main ═══ */
export default function ManagerVouchers({ user }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);   // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const notify = (msg, type = 'success') => showToast(msg, type);

  const managerBranchId = user?.branchId || '';

  const fetch_ = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api(`/vouchers?${params.toString()}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const data = p?.data ?? p;
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message || 'Không thể tải voucher'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, branchId: managerBranchId };
      const res = await api('/vouchers', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json(); const created = p?.data ?? p;
      setVouchers((prev) => [created, ...prev]);
      setModal(null); notify('Tạo voucher thành công!');
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

  const isExpired = (v) => new Date(v.endDate) < new Date();
  const isActive = (v) => v.status === 'active' && !isExpired(v);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* tabs */}
      <div className="flex gap-1 border-b border-slate-200">
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

      {activeTab === 'report' ? (
        <VoucherUsageReportTab />
      ) : (
        <>
          {/* toolbar */}
          <div className="flex items-center gap-3">
            <button onClick={fetch_} disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white !text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">
              <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã hoặc tên voucher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button id="create-voucher-btn" onClick={() => { setSelected(null); setModal('create'); }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={14} weight="bold" />Tạo voucher
            </button>
          </div>

          {/* content */}
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
                        {v.type === 'percentage' ? `${v.value}%` : `${Number(v.value).toLocaleString('vi-VN')}₫`}
                        {v.maxDiscount > 0 && <span className="text-[11px] text-slate-400"> (tối đa {Number(v.maxDiscount).toLocaleString('vi-VN')}₫)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.remaining ?? v.quantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(v.startDate)} – {formatDate(v.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive(v) ? 'bg-emerald-50 text-emerald-700' : isExpired(v) ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600'}`}>
                          {isActive(v) ? 'Đang hoạt động' : isExpired(v) ? 'Hết hạn' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelected(v); setModal('usage'); }} title="Lịch sử dùng"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                            <ClockCounterClockwise size={14} />
                          </button>
                          <button id={`edit-voucher-${v._id}`} onClick={() => { setSelected(v); setModal('edit'); }} title="Chỉnh sửa"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <PencilSimple size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
