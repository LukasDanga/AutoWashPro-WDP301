import { useCallback, useEffect, useState } from 'react';
import { showToast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import {
  ArrowClockwise,
  CheckCircle,
  Package,
  MagnifyingGlass,
  Plus,
  Trash,
  Warning,
  X,
  XCircle,
  PencilSimple,
  Gift,
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

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors';

const FALLBACK_TIER_OPTIONS = [
  { id: 'bronze', name: 'Đồng' },
  { id: 'silver', name: 'Bạc' },
  { id: 'gold', name: 'Vàng' },
  { id: 'diamond', name: 'Kim Cương' },
];

const REDEMPTION_STATUS = {
  claimed: { label: 'Chờ gửi quà', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  sent: { label: 'Đã gửi cho khách', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  received: { label: 'Khách đã nhận', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Đã hủy', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
};

function StatusBadge({ status }) {
  const s = REDEMPTION_STATUS[status] || { label: status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

/* ═══ Cấu hình quà tặng vật lý (Reward CRUD) ═══ */
function RewardModal({ initial, onSave, onClose, saving, tierOptions = FALLBACK_TIER_OPTIONS }) {
  const [form, setForm] = useState(initial || {
    name: '', description: '', imageUrl: '', pointCost: '', stock: '',
    requiredTier: 'bronze', status: 'active', sortOrder: 0,
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nhập tên phần quà';
    if (!form.pointCost || Number(form.pointCost) < 1) e.pointCost = 'Nhập số điểm (> 0)';
    if (form.stock === '' || form.stock == null || Number(form.stock) < 0) e.stock = 'Nhập số lượng tồn kho';
    return e;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    onSave({
      ...form,
      pointCost: Number(form.pointCost),
      stock: Number(form.stock),
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  const isEdit = !!initial?._id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">{isEdit ? 'Chỉnh sửa phần quà' : 'Thêm phần quà vật lý mới'}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="max-h-[72vh] space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tên phần quà <span className="text-red-500">*</span></label>
            <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nước hoa khử mùi xe" />
            {errors.name && <p className="mt-0.5 text-[11px] text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
            <textarea className={`${inp} min-h-[70px] resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Mô tả ngắn về phần quà..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Ảnh (URL)</label>
            <input className={inp} value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Số điểm đổi <span className="text-red-500">*</span></label>
              <input type="number" min="1" className={inp} value={form.pointCost} onChange={(e) => set('pointCost', e.target.value)} placeholder="100" />
              {errors.pointCost && <p className="mt-0.5 text-[11px] text-red-500">{errors.pointCost}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Số lượng tồn kho <span className="text-red-500">*</span></label>
              <input type="number" min="0" className={inp} value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="50" />
              {errors.stock && <p className="mt-0.5 text-[11px] text-red-500">{errors.stock}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hạng tối thiểu</label>
              <select className={inp} value={form.requiredTier || 'bronze'} onChange={(e) => set('requiredTier', e.target.value)}>
                {tierOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái</label>
              <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Kích hoạt</option>
                <option value="inactive">Tắt</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {saving && <Spinner size={14} />}{saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RewardsConfigTab({ isManager = false }) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [tierOptions, setTierOptions] = useState(FALLBACK_TIER_OPTIONS);
  const notify = (msg, type = 'success') => showToast(msg, type);

  useEffect(() => {
    let cancelled = false;
    api('/loyalty/tiers')
      .then(async (res) => {
        if (!res.ok) return;
        const payload = await res.json();
        const list = Array.isArray(payload?.data) ? payload.data
          : (typeof payload?.data === 'object' && Array.isArray(payload.data.tiers)) ? payload.data.tiers
          : [];
        if (!cancelled && list.length > 0) {
          setTierOptions(list.map((t) => ({ id: t.id, name: t.name || t.id })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', 50);
      const res = await api(`/rewards?${params.toString()}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      setRewards(Array.isArray(p?.data) ? p.data : []);
    } catch (err) { setError(err.message || 'Không thể tải phần quà'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const isEdit = !!selected?._id;
      const res = await api(isEdit ? `/rewards/${selected._id}` : '/rewards', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await readErr(res));
      setModal(null); notify(isEdit ? 'Cập nhật phần quà thành công!' : 'Thêm phần quà thành công!');
      fetch_();
    } catch (err) { notify(err.message || 'Lưu thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog({ title: 'Xóa phần quà', message: 'Bạn có chắc chắn muốn xóa phần quà này?', confirmLabel: 'Xóa', danger: true }))) return;
    try {
      const res = await api(`/rewards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readErr(res));
      setRewards((prev) => prev.filter((r) => r._id !== id));
      notify('Xóa phần quà thành công!');
    } catch (err) { notify(err.message || 'Xóa thất bại', 'error'); }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={fetch_} disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white !text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên phần quà..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm">
          <Plus size={14} weight="bold" />Thêm phần quà
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400"><Spinner size={24} /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 py-16 text-red-500">
          <Warning size={26} weight="duotone" /><p className="text-sm">{error}</p>
        </div>
      ) : rewards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20">
          <Package size={40} weight="thin" className="text-slate-300" />
          <p className="text-sm text-slate-500">Chưa có phần quà vật lý nào</p>
          <button onClick={() => { setSelected(null); setModal('create'); }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
            <Plus size={13} weight="bold" />Thêm phần quà đầu tiên
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-3">Quà tặng</th>
                  <th className="px-4 py-3">Điểm đổi</th>
                  <th className="px-4 py-3">Tồn kho</th>
                  <th className="px-4 py-3">Hạng tối thiểu</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewards.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {r.imageUrl ? (
                            <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">🎁</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 line-clamp-1">{r.name}</p>
                          {r.description && <p className="text-[11px] text-slate-400 line-clamp-1">{r.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-600">{Number(r.pointCost).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 text-slate-600">{r.stock}</td>
                    <td className="px-4 py-3"><TierBadge tier={r.requiredTier || 'bronze'} /></td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {r.status === 'active' ? 'Kích hoạt' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelected(r); setModal('edit'); }} title="Chỉnh sửa"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <PencilSimple size={14} />
                        </button>
                        {!isManager && (
                          <button onClick={() => handleDelete(r._id)} title="Xóa"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

{modal === 'create' && <RewardModal initial={null} onSave={handleSave} onClose={() => setModal(null)} saving={saving} tierOptions={tierOptions} />}
{modal === 'edit' && selected && <RewardModal initial={selected} onSave={handleSave} onClose={() => setModal(null)} saving={saving} tierOptions={tierOptions} />}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ═══ Trao quà: danh sách lượt đổi + nhập mã xác nhận khách đã nhận ═══ */
function GiveGiftModal({ redemption, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (e) => {
    e?.preventDefault();
    const enteredCode = code.trim().toUpperCase();
    if (!enteredCode) {
      showToast('Vui lòng yêu cầu khách đọc mã đổi quà và nhập vào đây!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const redemptionId = redemption?._id || 'by-code';
      const res = await api(`/rewards/redemptions/${redemptionId}/received`, {
        method: 'POST',
        body: JSON.stringify({ code: enteredCode }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      showToast('Xác nhận trao quà thành công! Trạng thái đã tự động cập nhật phía khách hàng. 🎉');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Mã xác nhận không đúng. Vui lòng kiểm tra lại!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const snap = redemption?.rewardSnapshot || {};
  const user = redemption?.user || {};

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
            <Gift size={26} weight="fill" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Xác Nhận Trao Quà</h3>
            <p className="text-xs text-slate-500 mt-0.5">Nhập mã đối soát từ khách hàng tại quầy</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <Warning size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Bảo mật mã đối soát:</span>
            Mã đổi quà không tự hiển thị. Vui lòng yêu cầu <b>khách hàng đọc hoặc đưa mã</b> hiển thị trên màn hình của họ để Quản lý đối soát & xác nhận.
          </div>
        </div>

        {/* Product & Customer Summary */}
        {redemption?._id && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Khách hàng:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{user.name || '—'}</span>
                {user.tier && <TierBadge tier={user.tier} />}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Phần quà:</span>
              <span className="font-black text-emerald-700">{snap.name || 'Quà vật lý'}</span>
            </div>

            {snap.pointCost && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Số điểm quy đổi:</span>
                <span className="font-bold text-amber-600">{Number(snap.pointCost).toLocaleString('vi-VN')} điểm</span>
              </div>
            )}
          </div>
        )}

        {/* Code Input Form */}
        <form onSubmit={handleConfirm} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 text-center">
              Nhập Mã Quà Tặng Khách Hàng Đọc:
            </label>
            <input
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: AWP-9X82K1"
              className="w-full text-center font-mono font-black text-2xl tracking-widest text-emerald-700 bg-slate-50 border-2 border-emerald-300 focus:border-emerald-500 focus:bg-white rounded-2xl py-3.5 px-4 outline-none transition-all shadow-inner uppercase"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/3 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-2/3 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner size={16} />
                  <span>Đang xác nhận...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} weight="bold" />
                  <span>Xác nhận Trao quà</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkDeleteRedemptionsModal({ onClose, onSuccess }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [deleteAll, setDeleteAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!deleteAll) {
      if (!fromDate || !toDate) {
        showToast('Vui lòng chọn đầy đủ thời gian Từ ngày và Đến ngày!', 'error');
        return;
      }
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (start > end) {
        showToast('Ngày bắt đầu (Từ ngày) phải nhỏ hơn hoặc bằng Ngày kết thúc (Đến ngày)!', 'error');
        return;
      }
    }

    const confirmMsg = deleteAll
      ? 'CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu lượt đổi quà trong hệ thống? Thao tác này KHÔNG THỂ HOÀN TÁC.'
      : `Bạn có chắc chắn muốn xóa tất cả các lượt đổi quà từ ngày ${fromDate} đến ngày ${toDate}? Thao tác này KHÔNG THỂ HOÀN TÁC.`;

    const ok = await confirmDialog({
      title: deleteAll ? 'Xóa Toàn Bộ Dữ Liệu Lượt Đổi Quà' : 'Xóa Dữ Liệu Theo Khoảng Thời Gian',
      message: confirmMsg,
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy bỏ',
      type: 'danger',
    });

    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await api('/rewards/redemptions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ fromDate, toDate, deleteAll }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const payload = await res.json();
      showToast(payload?.message || 'Đã xóa dữ liệu thành công!');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Xóa dữ liệu thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/25">
            <Trash size={26} weight="fill" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Xóa Dữ Liệu Đổi Quà</h3>
            <p className="text-xs text-slate-500 mt-0.5">Dọn dẹp lượt đổi quà (Dành cho Admin)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Delete All Checkbox Toggle */}
          <div className="bg-red-50/70 rounded-2xl p-4 border border-red-200/80 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAll}
                onChange={(e) => setDeleteAll(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
              />
              <span className="text-xs font-black text-red-900 uppercase tracking-wider">
                Xóa TOÀN BỘ dữ liệu đổi quà
              </span>
            </label>
            <p className="text-[11px] text-red-700 pl-7 leading-relaxed">
              Tùy chọn này sẽ xóa tất cả bản ghi lượt đổi quà trong CSDL. Thao tác không thể hoàn tác!
            </p>
          </div>

          {/* Date Range Inputs (disabled if deleteAll is checked) */}
          {!deleteAll && (
            <div className="space-y-4 bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Hoặc Chọn Khoảng Thời Gian Để Xóa:
              </span>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Từ ngày (From Date):</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setFromDate(newFrom);
                    if (toDate && newFrom && new Date(newFrom) > new Date(toDate)) {
                      showToast('Chú ý: Từ ngày không thể lớn hơn Đến ngày!', 'warning');
                    }
                  }}
                  className="w-full text-sm bg-white border border-slate-200 rounded-xl py-2.5 px-3 focus:border-red-400 focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Đến ngày (To Date):</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    const newTo = e.target.value;
                    setToDate(newTo);
                    if (fromDate && newTo && new Date(fromDate) > new Date(newTo)) {
                      showToast('Chú ý: Đến ngày phải lớn hơn hoặc bằng Từ ngày!', 'warning');
                    }
                  }}
                  className="w-full text-sm bg-white border border-slate-200 rounded-xl py-2.5 px-3 focus:border-red-400 focus:outline-none transition-all text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/3 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || (!deleteAll && (!fromDate || !toDate))}
              className="w-2/3 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner size={16} />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash size={18} weight="bold" />
                  <span>Xác nhận Xóa Dữ Liệu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CancelRedemptionModal({ redemption, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      showToast('Vui lòng nhập lý do hủy lượt đổi quà!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api(`/rewards/redemptions/${redemption._id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cleanReason }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      showToast('Đã hủy lượt đổi quà và hoàn điểm cho khách hàng!');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Hủy thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const snap = redemption?.rewardSnapshot || {};
  const user = redemption?.user || {};

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-13 h-13 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
            <XCircle size={26} weight="fill" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Hủy Lượt Đổi Quà</h3>
            <p className="text-xs text-slate-500 mt-0.5">Nhập lý do hủy & hoàn điểm cho khách</p>
          </div>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/80 space-y-2 text-xs text-amber-900">
          <div className="flex justify-between font-bold">
            <span>Khách hàng:</span>
            <span>{user.name || '—'}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Quà tặng:</span>
            <span className="text-amber-800">{snap.name || 'Quà vật lý'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Lý Do Hủy (bắt buộc):
            </label>
            <textarea
              rows={3}
              required
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Hết quà tại kho / Khách hàng quá hạn không tới nhận..."
              className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-2xl p-3 text-slate-800 outline-none transition-all resize-none"
            />
            <p className="text-[11px] text-slate-400">Lý do này sẽ hiển thị trực tiếp cho khách hàng xem trên app/web.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/3 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="w-2/3 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner size={16} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <XCircle size={18} weight="bold" />
                  <span>Xác nhận Hủy Đơn</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RedemptionsTab({ isManager = false }) {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedForModal, setSelectedForModal] = useState(null);
  const [cancelModalRedemption, setCancelModalRedemption] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetch_ = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', 10);
      const res = await api(`/rewards/redemptions?${params.toString()}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      setRedemptions(Array.isArray(p?.data) ? p.data : []);
      if (p?.pagination) setPagination(p.pagination);
    } catch (err) { setError(err.message || 'Không thể tải danh sách đổi thưởng'); }
    finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleCancelRedemption = (rd) => {
    setCancelModalRedemption(rd);
  };

  const handleDeleteRedemption = async (rd) => {
    const ok = await confirmDialog({
      title: 'Xóa Vĩnh Viễn Lượt Đổi Quà',
      message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN lượt đổi quà "${rd.code}"? Thao tác này KHÔNG THỂ HOÀN TÁC.`,
      confirmText: 'Xóa Vĩnh Viễn',
      cancelText: 'Hủy bỏ',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await api(`/rewards/redemptions/${rd._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readErr(res));
      showToast('Đã xóa vĩnh viễn lượt đổi quà!');
      fetch_();
    } catch (err) {
      showToast(err.message || 'Xóa thất bại', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={fetch_} disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white !text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer">
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đổi thưởng hoặc tên quà..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors">
          <option value="">Tất cả trạng thái</option>
          <option value="claimed">Chờ trao quà</option>
          <option value="sent">Đã gửi cho khách</option>
          <option value="received">Khách đã nhận</option>
          <option value="cancelled">Đã hủy</option>
        </select>

        {!isManager && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ml-auto"
            title="Xóa dữ liệu hàng loạt hoặc theo khoảng thời gian"
          >
            <Trash size={16} weight="bold" />
            <span>Xóa dữ liệu</span>
          </button>
        )}

        <button
          onClick={() => setSelectedForModal({})}
          className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-black text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/20 cursor-pointer ${isManager ? 'ml-auto' : ''}`}
        >
          <Gift size={18} weight="bold" />
          Trao quà ngay
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400"><Spinner size={24} /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 py-16 text-red-500">
          <Warning size={26} weight="duotone" /><p className="text-sm">{error}</p>
        </div>
      ) : redemptions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20">
          <Package size={40} weight="thin" className="text-slate-300" />
          <p className="text-sm text-slate-500">Chưa có lượt đổi thưởng nào</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Quà tặng</th>
                  <th className="px-4 py-3">Ngày đổi</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Chi nhánh / Người gửi</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptions.map((rd) => {
                  const snap = rd.rewardSnapshot || {};
                  const u = rd.user || {};
                  const canVerify = rd.status === 'claimed' || rd.status === 'sent';
                  return (
                    <tr key={rd._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{u.name || '—'}</p>
                        <p className="text-[11px] text-slate-400">{u.phone || u.email || ''}</p>
                        {u.tier && <TierBadge tier={u.tier} />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 line-clamp-1">{snap.name || '—'}</p>
                        <p className="text-[11px] text-amber-600 font-semibold">{Number(snap.pointCost || rd.pointsSpent || 0).toLocaleString('vi-VN')} điểm</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(rd.createdAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={rd.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {rd.status === 'sent' || rd.status === 'received' ? (
                          (rd.sentAt || rd.branchSnapshot?.name || rd.branchId?.name || rd.sentBySnapshot?.name || rd.sentBy?.name) ? (
                            <>
                              {rd.sentAt && <p>{formatDate(rd.sentAt)}</p>}
                              {(rd.branchSnapshot?.name || rd.branchId?.name) && (
                                <p className="text-slate-600 font-semibold">{rd.branchSnapshot?.name || rd.branchId?.name}</p>
                              )}
                              {(rd.sentBySnapshot?.name || rd.sentBy?.name) && (
                                <p className="text-slate-400">bởi {rd.sentBySnapshot?.name || rd.sentBy?.name}</p>
                              )}
                            </>
                          ) : <span className="text-slate-300">—</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canVerify && (
                            <button
                              onClick={() => setSelectedForModal(rd)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-sm active:scale-95 cursor-pointer"
                              title="Trao quà"
                            >
                              <Gift size={14} weight="bold" />
                              <span className="hidden sm:inline">Trao quà</span>
                            </button>
                          )}

                          {rd.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelRedemption(rd)}
                              className="inline-flex items-center gap-1 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                              title="Hủy lượt đổi quà"
                            >
                              <XCircle size={14} weight="bold" />
                              <span className="hidden sm:inline">Hủy</span>
                            </button>
                          )}

                          {!isManager && (
                            <button
                              onClick={() => handleDeleteRedemption(rd)}
                              className="inline-flex items-center gap-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/80 px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                              title="Xóa vĩnh viễn lượt đổi quà"
                            >
                              <Trash size={14} weight="bold" />
                              <span className="hidden sm:inline">Xóa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Trước</button>
          <span className="text-xs text-slate-500">Trang {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Sau</button>
        </div>
      )}

      {/* Give Gift Confirmation Modal */}
      {selectedForModal !== null && (
        <GiveGiftModal
          redemption={selectedForModal._id ? selectedForModal : null}
          onClose={() => setSelectedForModal(null)}
          onSuccess={fetch_}
        />
      )}

      {/* Cancel Redemption Modal */}
      {cancelModalRedemption !== null && (
        <CancelRedemptionModal
          redemption={cancelModalRedemption}
          onClose={() => setCancelModalRedemption(null)}
          onSuccess={fetch_}
        />
      )}

      {/* Admin Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <BulkDeleteRedemptionsModal
          onClose={() => setShowBulkDeleteModal(false)}
          onSuccess={fetch_}
        />
      )}
    </div>
  );
}
