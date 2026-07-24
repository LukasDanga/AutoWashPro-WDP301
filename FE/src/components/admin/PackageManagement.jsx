import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from '@/lib/toast';
import {
  ArrowClockwise,
  CheckCircle,
  ClockCountdown,
  ListChecks,
  MagnifyingGlass,
  Money,
  Package,
  PencilSimple,
  Plus,
  Trash,
  Warning,
  X,
  XCircle,
  Car,
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const token = getStoredToken();
  return fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
}

async function readError(res) {
  try { const j = await res.json(); return j?.message || j?.error || `Lỗi ${res.status}`; }
  catch { return `Lỗi ${res.status}`; }
}

function Spinner({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className={`animate-spin ${className}`} aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
      {active ? <CheckCircle size={11} weight="fill" /> : <XCircle size={11} weight="fill" />}
      {active ? 'Hoạt động' : 'Ngừng'}
    </span>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, [toast, onDismiss]);
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div role="alert" className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${isErr ? 'bg-white text-red-600 ring-red-200' : 'bg-white text-emerald-700 ring-emerald-200'}`}>
      {isErr ? <XCircle size={16} weight="fill" className="shrink-0" /> : <CheckCircle size={16} weight="fill" className="shrink-0" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-1 opacity-50 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`relative flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';

const VEHICLE_OPTIONS = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
];

const CATEGORY_OPTIONS = [
  { value: 'full', label: 'Tổng thể' },
  { value: 'external', label: 'Ngoại thất' },
  { value: 'internal', label: 'Nội thất' },
];

const EMPTY = {
  name: '',
  description: '',
  price: '',
  duration: '',
  image: '',
  status: 'active',
  category: 'full',
  vehicleTypes: [],
  subServices: [],
};

const parseVnd = (v) => Number(String(v).replace(/\./g, ''));
const parseSubServices = (subs) => subs.map((s) => ({ ...s, price: parseVnd(s.price), duration: Number(s.duration) }));

function PackageForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const toggleVehicle = (val) => {
    setForm((f) => ({
      ...f,
      vehicleTypes: f.vehicleTypes.includes(val) ? f.vehicleTypes.filter((v) => v !== val) : [...f.vehicleTypes, val],
    }));
  };

  const addSubService = () => {
    setForm((f) => ({ ...f, subServices: [...f.subServices, { name: '', price: '', duration: '', isOptional: true }] }));
  };

  const updateSub = (idx, key, val) => {
    setForm((f) => {
      const subs = [...f.subServices];
      subs[idx] = { ...subs[idx], [key]: val };
      return { ...f, subServices: subs };
    });
  };

  const removeSub = (idx) => {
    setForm((f) => ({ ...f, subServices: f.subServices.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên gói';
    if (!form.price || Number(form.price) < 0) e.price = 'Giá không hợp lệ';
    if (!form.duration || Number(form.duration) < 1) e.duration = 'Thời lượng không hợp lệ';
    return e;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    onSave({ ...form, price: parseVnd(form.price), duration: Number(form.duration), subServices: parseSubServices(form.subServices) });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tên gói dịch vụ" required error={errors.name}>
        <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rửa xe cao cấp" />
      </Field>

      <Field label="Mô tả" error={errors.description}>
        <textarea rows={3} className={inp + ' resize-none'} value={form.description}
          onChange={(e) => set('description', e.target.value)} placeholder="Mô tả gói dịch vụ..." />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Giá (VNĐ)" required error={errors.price}>
          <input type="text" inputMode="numeric" className={inp} value={form.price}
            onChange={(e) => set('price', e.target.value)} placeholder="80000" />
        </Field>
        <Field label="Thời lượng (phút)" required error={errors.duration}>
          <input type="number" min="1" className={inp} value={form.duration}
            onChange={(e) => set('duration', e.target.value)} placeholder="60" />
        </Field>
      </div>

      <Field label="URL hình ảnh">
        <input className={inp} value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://..." />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Danh mục">
          <select className={inp} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Trạng thái">
          <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Hoạt động</option>
            <option value="inactive">Ngừng</option>
          </select>
        </Field>
      </div>

      <Field label="Loại xe áp dụng">
        <div className="flex flex-wrap gap-2">
          {VEHICLE_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => toggleVehicle(o.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.vehicleTypes.includes(o.value) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block">Các dịch vụ nhỏ trong gói (Sub-services)</label>
            <span className="text-[11px] text-slate-400">Các công đoạn chi tiết được thực hiện trong gói</span>
          </div>
          <button type="button" onClick={addSubService}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
            <Plus size={13} weight="bold" /> Thêm dịch vụ nhỏ
          </button>
        </div>

        <div className="space-y-3 mt-3">
          {form.subServices.map((sub, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => updateSub(idx, 'isOptional', false)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      !sub.isOptional 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Đã bao gồm
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSub(idx, 'isOptional', true)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      sub.isOptional 
                        ? 'bg-indigo-500 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    ✨ Tùy chọn
                  </button>
                </div>
                <button type="button" onClick={() => removeSub(idx)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Xóa">
                  <Trash size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Tên dịch vụ nhỏ</label>
                  <input placeholder="VD: Phun bọt tuyết, Lau khô..." className={inp + ' text-xs'} value={sub.name}
                    onChange={(e) => updateSub(idx, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Giá phụ thu (VNĐ)</label>
                  <input type="number" min="0" placeholder="0" className={inp + ' text-xs'} value={sub.price}
                    onChange={(e) => updateSub(idx, 'price', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 block mb-1">Thời gian (phút)</label>
                  <input type="number" min="0" placeholder="5" className={inp + ' text-xs'} value={sub.duration}
                    onChange={(e) => updateSub(idx, 'duration', e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          {form.subServices.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
              <p className="text-xs text-slate-400">Chưa có dịch vụ nhỏ nào trong gói này.</p>
              <button type="button" onClick={addSubService} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
                + Thêm dịch vụ nhỏ ngay
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} disabled={saving}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving && <Spinner size={14} className="text-white" />}
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}

function ConfirmDelete({ pkg, onConfirm, onCancel, deleting }) {
  return (
    <Modal title="Xác nhận xóa gói dịch vụ" onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-700">Bạn chắc chắn muốn xóa gói "{pkg.name}"?</p>
            <p className="text-xs text-red-600 leading-relaxed">
              Lưu ý: Nếu gói này đã được khách hàng đăng ký hoặc mua gói lượt, hệ thống sẽ bảo vệ dữ liệu và không cho phép xóa. Bạn có thể chọn "Ngừng hoạt động" gói thay vì xóa.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={deleting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
          <button onClick={onConfirm} disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {deleting && <Spinner size={14} className="text-white" />}
            {deleting ? 'Đang xóa…' : 'Xóa gói'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function parseBlockedMessage(msg = '') {
  const match = msg.match(/^(.*?)\((.*?)\)\.(.*)$/s);
  if (match) {
    const header = match[1].trim();
    const itemsRaw = match[2].trim().split(/,\s*/);
    const footer = match[3].trim();

    const items = itemsRaw.map((item) => {
      let icon = '📌';
      if (item.includes('lịch đặt')) icon = '📅';
      else if (item.includes('gói lượt')) icon = '🎫';
      else if (item.includes('voucher') || item.includes('mã ưu đãi')) icon = '🏷️';
      else if (item.includes('khách hàng đặt') || item.includes('sử dụng')) icon = '👥';

      return { icon, text: item };
    });

    return { header, items, footer };
  }
  return { header: msg, items: [], footer: '' };
}

function BlockDeleteModal({ title, message, onClose, onDeactivate, deactivating }) {
  const { header, items, footer } = useMemo(() => parseBlockedMessage(message), [message]);

  return (
    <Modal title={title || "Không thể xóa"} onClose={onClose}>
      <div className="space-y-4 py-1">
        {/* Header Warning Banner */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/70">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mt-0.5 font-bold shadow-xs">
            <Warning size={20} weight="fill" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-bold text-amber-900">Bảo vệ liên kết dữ liệu hệ thống</h4>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">{header}</p>
          </div>
        </div>

        {/* Structured Grid Items */}
        {items.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
              Các dữ liệu đang liên kết hoạt động:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 shadow-2xs hover:bg-amber-50 transition-colors"
                >
                  <span className="text-base shrink-0">{it.icon}</span>
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{it.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer recommendation note */}
        {footer && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
            <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
            <p className="leading-relaxed">{footer}</p>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
          {onDeactivate && (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={deactivating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors shadow-xs"
            >
              {deactivating ? 'Đang xử lý…' : 'Chuyển sang "Ngừng hoạt động"'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

const VEHICLE_LABELS = { sedan: 'Sedan', suv: 'SUV', pickup: 'Pickup', van: 'Van' };

export default function PackageManagement() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const debounce = useRef(null);

  const notify = (msg, type = 'success') => showToast(msg, type);

  const fetchPackages = useCallback(async (q = search) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('name', q.trim());
      const res = await apiFetch(`/packages?${params}`);
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const data = payload?.data ?? payload;
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err.message || 'Không thể tải dữ liệu');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPackages(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchPackages(val), 420);
  };

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      const res = await apiFetch('/packages', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const created = payload?.data ?? payload;
      setPackages((p) => [created, ...p]);
      setModal(null);
      notify('Tạo gói dịch vụ thành công!');
    } catch (err) {
      notify(err.message || 'Tạo thất bại', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/packages/${selected._id}`, { method: 'PUT', body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const updated = payload?.data ?? payload;
      setPackages((p) => p.map((b) => (b._id === updated._id ? updated : b)));
      setModal(null);
      notify('Cập nhật thành công!');
    } catch (err) {
      notify(err.message || 'Cập nhật thất bại', 'error');
    } finally { setSaving(false); }
  };

  const [blockedMsg, setBlockedMsg] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/packages/${selected._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      setPackages((p) => p.filter((b) => b._id !== selected._id));
      setModal(null);
      notify('Đã xóa gói dịch vụ.');
    } catch (err) {
      setBlockedMsg(err.message || 'Không thể xóa gói dịch vụ');
      setModal('blocked');
    } finally { setDeleting(false); }
  };

  const handleDeactivatePackage = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/packages/${selected._id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...selected, status: 'inactive' }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const updated = payload?.data ?? payload;
      setPackages((p) => p.map((b) => (b._id === updated._id ? updated : b)));
      setModal(null);
      notify(`Đã chuyển gói "${selected.name}" sang "Ngừng hoạt động".`);
    } catch (err) {
      notify(err.message || 'Cập nhật thất bại', 'error');
    } finally { setDeleting(false); }
  };

  const stats = {
    total: packages.length,
    active: packages.filter((p) => p.status === 'active').length,
    inactive: packages.filter((p) => p.status === 'inactive').length,
  };

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng gói', value: stats.total, icon: <Package size={18} weight="duotone" className="text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Đang hoạt động', value: stats.active, icon: <CheckCircle size={18} weight="duotone" className="text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Ngừng', value: stats.inactive, icon: <XCircle size={18} weight="duotone" className="text-slate-400" />, bg: 'bg-slate-100' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
            placeholder="Tìm tên gói…" value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
        <button onClick={() => fetchPackages()} disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={15} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={() => { setSelected(null); setModal('create'); }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={15} weight="bold" /> Thêm gói dịch vụ
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-28 text-slate-400">
          <Spinner size={28} /><span className="text-sm">Đang tải…</span>
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 py-16">
          <Warning size={28} weight="duotone" className="text-red-400" />
          <p className="text-sm text-red-600">{fetchError}</p>
          <button onClick={() => fetchPackages()} className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-100 transition-colors">Thử lại</button>
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20">
          <Package size={40} weight="thin" className="text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Chưa có gói dịch vụ nào</p>
          <button onClick={() => { setSelected(null); setModal('create'); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            <Plus size={14} weight="bold" /> Thêm gói đầu tiên
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {packages.map((pkg) => (
              <div key={pkg._id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-800">{pkg.name}</h4>
                      <StatusBadge status={pkg.status} />
                      {pkg.category && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 capitalize">
                          {pkg.category === 'external' ? 'Ngoại thất' : pkg.category === 'internal' ? 'Nội thất' : 'Tổng thể'}
                        </span>
                      )}
                    </div>
                    {pkg.description && <p className="text-[12px] text-slate-500 line-clamp-2 mb-2">{pkg.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Money size={12} weight="bold" className="text-emerald-500" />
                        <strong className="text-slate-700">{Number(pkg.price).toLocaleString('vi-VN')}₫</strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ClockCountdown size={12} weight="bold" className="text-amber-500" />{pkg.duration} phút
                      </span>
                      {pkg.vehicleTypes?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Car size={12} weight="bold" className="text-blue-500" />
                          {pkg.vehicleTypes.map((vt) => VEHICLE_LABELS[vt] || vt).join(', ')}
                        </span>
                      )}
                    </div>
                    {pkg.subServices && pkg.subServices.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        {pkg.subServices.filter(s => !s.isOptional).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                              ✓ Đã bao gồm ({pkg.subServices.filter(s => !s.isOptional).length}):
                            </span>
                            {pkg.subServices.filter(s => !s.isOptional).map((s, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                                {s.name} {s.duration > 0 ? `(${s.duration}p)` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {pkg.subServices.filter(s => s.isOptional).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                              ✨ Tùy chọn thêm ({pkg.subServices.filter(s => s.isOptional).length}):
                            </span>
                            {pkg.subServices.filter(s => s.isOptional).map((s, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                                {s.name} {s.price > 0 ? `(+${Number(s.price).toLocaleString('vi-VN')}đ)` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setSelected(pkg); setModal('edit'); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <PencilSimple size={15} />
                    </button>
                    <button onClick={() => { setSelected(pkg); setModal('delete'); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Thêm gói dịch vụ" onClose={() => setModal(null)} wide>
          <PackageForm initial={EMPTY} onSave={handleCreate} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={`Chỉnh sửa: ${selected.name}`} onClose={() => setModal(null)} wide>
          <PackageForm initial={selected} onSave={handleUpdate} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
      {modal === 'delete' && selected && (
        <ConfirmDelete pkg={selected} onConfirm={handleDelete} onCancel={() => setModal(null)} deleting={deleting} />
      )}
      {modal === 'blocked' && selected && (
        <BlockDeleteModal
          title="Không thể xóa gói dịch vụ"
          message={blockedMsg}
          onClose={() => setModal(null)}
          onDeactivate={handleDeactivatePackage}
          deactivating={deleting}
        />
      )}
    </div>
  );
}
