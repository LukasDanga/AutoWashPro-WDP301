import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise,
  Buildings,
  CaretLeft,
  CheckCircle,
  Clock,
  Envelope,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Phone,
  Plus,
  Trash,
  Warning,
  X,
  XCircle,
  Package,
  ClockCountdown,
  Car,
  Money,
  ListChecks,
  Tag,
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

/* ─────────────────────────── API helper ─────────────────────────── */
async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const token = getStoredToken();
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

async function readError(res) {
  try {
    const j = await res.json();
    return j?.message || j?.error || `Lỗi ${res.status}`;
  } catch {
    return `Lỗi ${res.status}`;
  }
}

/* ─────────────────────────── Spinner ─────────────────────────────── */
function Spinner({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

/* ─────────────────────────── Status badge ────────────────────────── */
function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
      }`}
    >
      {active
        ? <CheckCircle size={11} weight="fill" />
        : <XCircle size={11} weight="fill" />}
      {active ? 'Hoạt động' : 'Ngừng'}
    </span>
  );
}

/* ─────────────────────────── Toast ───────────────────────────────── */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isErr = toast.type === 'error';

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
        isErr
          ? 'bg-white text-red-600 ring-red-200'
          : 'bg-white text-emerald-700 ring-emerald-200'
      }`}
    >
      {isErr ? <XCircle size={16} weight="fill" className="shrink-0" /> : <CheckCircle size={16} weight="fill" className="shrink-0" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-1 opacity-50 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────────── Modal wrapper ───────────────────────── */
function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
        {/* body */}
        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Branch form ─────────────────────────── */
const EMPTY = {
  name: '',
  address: '',
  phone: '',
  email: '',
  openingTime: '07:00',
  closingTime: '18:00',
  status: 'active',
  image: '',
  managerId: '',
};

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const inp =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';

function BranchForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(true);

  useEffect(() => {
    async function fetchManagers() {
      try {
        const res = await apiFetch('/auth/users?role=manager&status=active');
        if (!res.ok) return;
        const payload = await res.json();
        const data = payload?.data ?? payload;
        setManagers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load managers', e);
      } finally {
        setManagersLoading(false);
      }
    }
    fetchManagers();
  }, []);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên chi nhánh';
    if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
    return e;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tên chi nhánh" required error={errors.name}>
          <input id="f-name" className={inp} value={form.name}
            onChange={(e) => set('name', e.target.value)} placeholder="Chi nhánh Quận 1" />
        </Field>
        <Field label="Số điện thoại" error={errors.phone}>
          <input id="f-phone" className={inp} value={form.phone}
            onChange={(e) => set('phone', e.target.value)} placeholder="028 1234 5678" />
        </Field>
      </div>

      <Field label="Địa chỉ" required error={errors.address}>
        <input id="f-addr" className={inp} value={form.address}
          onChange={(e) => set('address', e.target.value)} placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" />
      </Field>

      <Field label="Email" error={errors.email}>
        <input id="f-email" type="email" className={inp} value={form.email}
          onChange={(e) => set('email', e.target.value)} placeholder="chinhanh@autowashpro.com" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Giờ mở cửa" error={errors.openingTime}>
          <input id="f-open" type="time" className={inp} value={form.openingTime}
            onChange={(e) => set('openingTime', e.target.value)} />
        </Field>
        <Field label="Giờ đóng cửa" error={errors.closingTime}>
          <input id="f-close" type="time" className={inp} value={form.closingTime}
            onChange={(e) => set('closingTime', e.target.value)} />
        </Field>
      </div>

      <Field label="URL ảnh đại diện" error={errors.image}>
        <input id="f-img" className={inp} value={form.image}
          onChange={(e) => set('image', e.target.value)} placeholder="https://..." />
      </Field>

      <Field label="Quản lý chi nhánh" error={errors.managerId}>
        <select id="f-manager" className={inp} value={form.managerId}
          onChange={(e) => set('managerId', e.target.value)}>
          <option value="">{managersLoading ? 'Đang tải...' : '— Chọn quản lý —'}</option>
          {managers.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name} — {m.email}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Trạng thái" error={errors.status}>
        <select id="f-status" className={inp} value={form.status}
          onChange={(e) => set('status', e.target.value)}>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
      </Field>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} disabled={saving}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          Hủy
        </button>
        <button type="submit" id="branch-submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving && <Spinner size={14} className="text-white" />}
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────── Confirm delete ─────────────────────── */
function ConfirmDelete({ branch, onConfirm, onCancel, deleting }) {
  return (
    <Modal title="Xác nhận xóa" onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            Bạn chắc chắn muốn xóa chi nhánh{' '}
            <strong>"{branch.name}"</strong>?{' '}
            Hành động này không thể hoàn tác.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={deleting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button id="confirm-delete-btn" onClick={onConfirm} disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {deleting && <Spinner size={14} className="text-white" />}
            {deleting ? 'Đang xóa…' : 'Xóa chi nhánh'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Detail View ─────────────────────────── */
function BranchDetailFull({ branch, onBack, onEdit }) {
  const [packages, setPackages] = useState([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgModal, setPkgModal] = useState(null);
  const [pkgSaving, setPkgSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setPkgLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('status', 'active');
        if (pkgSearch.trim()) params.set('name', pkgSearch.trim());
        const res = await apiFetch(`/packages?${params}`);
        if (!res.ok) return;
        const payload = await res.json();
        const data = payload?.data ?? payload;
        if (mounted) setPackages(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load packages', e);
      } finally {
        if (mounted) setPkgLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [pkgSearch]);

  const VEHICLE_LABELS = {
    sedan: 'Sedan', suv: 'SUV', pickup: 'Pickup', van: 'Van', motorcycle: 'Xe máy',
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div role="alert" className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${toast.type === 'error' ? 'bg-white text-red-600 ring-red-200' : 'bg-white text-emerald-700 ring-emerald-200'}`}>
          {toast.type === 'error' ? <XCircle size={15} weight="fill" /> : <CheckCircle size={15} weight="fill" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold !text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors"
        >
          <CaretLeft size={16} weight="bold" />
          Quay lại danh sách
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(branch)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold !text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <PencilSimple size={16} /> Sửa
          </button>
          <button onClick={() => setPkgModal('create')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold !text-emerald-700 hover:bg-emerald-100 transition-colors">
            <Plus size={16} weight="bold" /> Thêm gói
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Top: Title & Status ── */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 overflow-hidden shadow-sm shrink-0">
            {branch.image ? (
              <img src={branch.image} alt={branch.name} className="h-full w-full object-cover" />
            ) : (
              <Buildings size={32} weight="duotone" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {branch.name}
              <StatusBadge status={branch.status} />
            </h2>
          </div>
        </div>

        {/* ── Information Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <MapPin size={20} weight="fill" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Địa chỉ</p>
              <p className="text-sm font-medium text-slate-700 leading-snug">{branch.address || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Phone size={20} weight="fill" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Điện thoại</p>
              <p className="text-sm font-medium text-slate-700">{branch.phone || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Envelope size={20} weight="fill" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email liên hệ</p>
              <p className="text-sm font-medium text-slate-700 break-all">{branch.email || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Clock size={20} weight="fill" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Giờ mở cửa</p>
              <p className="text-sm font-medium text-slate-700">
                {branch.openingTime && branch.closingTime ? `${branch.openingTime} – ${branch.closingTime}` : 'Chưa cập nhật'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Packages Section ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Package size={16} weight="duotone" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Gói dịch vụ</h3>
            </div>
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)}
                placeholder="Tìm gói dịch vụ…"
                className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>
          </div>

          {pkgLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Spinner size={22} />
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
              <Package size={32} weight="thin" />
              <p className="text-sm">Không có gói dịch vụ nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {packages.map((pkg) => (
                <div key={pkg._id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-slate-800">{pkg.name}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pkg.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {pkg.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                        </span>
                        {pkg.category && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 capitalize">
                            {pkg.category === 'external' ? 'Ngoại thất' : pkg.category === 'internal' ? 'Nội thất' : 'Tổng thể'}
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-[12px] text-slate-500 line-clamp-2 mb-2">{pkg.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Money size={12} weight="bold" className="text-emerald-500" />
                          <strong className="text-slate-700">{Number(pkg.price).toLocaleString('vi-VN')}₫</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ClockCountdown size={12} weight="bold" className="text-amber-500" />
                          {pkg.duration} phút
                        </span>
                        {pkg.vehicleTypes?.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Car size={12} weight="bold" className="text-blue-500" />
                            {pkg.vehicleTypes.map((vt) => VEHICLE_LABELS[vt] || vt).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {pkg.subServices?.length > 0 && (
                        <div className="relative group">
                          <button className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                            <ListChecks size={12} weight="bold" />
                            {pkg.subServices.length} DV thêm
                          </button>
                          <div className="absolute right-0 top-full mt-1 z-10 min-w-[200px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dịch vụ chọn thêm</p>
                            <div className="space-y-1.5">
                              {pkg.subServices.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-700">{sub.name}</span>
                                  <span className="font-semibold text-slate-800 ml-2">{Number(sub.price).toLocaleString('vi-VN')}₫</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Package Create Modal ── */}
      {pkgModal === 'create' && (
        <Modal title="Thêm gói dịch vụ mới" onClose={() => setPkgModal(null)} wide>
          <CreatePackageForm onSave={async (data) => {
            setPkgSaving(true);
            try {
              const res = await apiFetch('/packages', { method: 'POST', body: JSON.stringify(data) });
              if (!res.ok) throw new Error(await readError(res));
              const payload = await res.json();
              const created = payload?.data ?? payload;
              setPackages((p) => [created, ...p]);
              setPkgModal(null);
              notify('Tạo gói dịch vụ thành công!');
            } catch (err) {
              notify(err.message || 'Tạo thất bại', 'error');
            } finally { setPkgSaving(false); }
          }} onCancel={() => setPkgModal(null)} saving={pkgSaving} />
        </Modal>
      )}
    </div>
  );
}

function CreatePackageForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', duration: '', image: '',
    status: 'active', category: 'full', vehicleTypes: [], subServices: [],
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const toggleVehicle = (val) => {
    setForm((f) => ({ ...f, vehicleTypes: f.vehicleTypes.includes(val) ? f.vehicleTypes.filter((v) => v !== val) : [...f.vehicleTypes, val] }));
  };

  const addSub = () => setForm((f) => ({ ...f, subServices: [...f.subServices, { name: '', price: '', duration: '', isOptional: true }] }));
  const updSub = (idx, key, val) => setForm((f) => { const s = [...f.subServices]; s[idx] = { ...s[idx], [key]: val }; return { ...f, subServices: s }; });
  const delSub = (idx) => setForm((f) => ({ ...f, subServices: f.subServices.filter((_, i) => i !== idx) }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên';
    if (!form.price || Number(form.price) < 0) errs.price = 'Giá không hợp lệ';
    if (!form.duration || Number(form.duration) < 1) errs.duration = 'Thời lượng không hợp lệ';
    if (Object.keys(errs).length) return setErrors(errs);
    onSave({ ...form, price: Number(String(form.price).replace(/\./g, '')), duration: Number(form.duration) });
  };

  const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';

  const onPriceChange = (v) => {
    setForm((f) => ({ ...f, price: v }));
    setErrors((e) => ({ ...e, price: '' }));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tên gói <span className="text-red-500">*</span></label>
          <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rửa xe cao cấp" />
          {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Danh mục</label>
          <select className={inp} value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="full">Tổng thể</option><option value="external">Ngoại thất</option><option value="internal">Nội thất</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
        <textarea rows={2} className={inp + ' resize-none'} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Mô tả gói dịch vụ..." />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Giá (VNĐ) <span className="text-red-500">*</span></label>
          <input type="text" inputMode="numeric" className={inp} value={form.price} onChange={(e) => onPriceChange(e.target.value)} placeholder="80000" />
          {errors.price && <p className="mt-1 text-[11px] text-red-500">{errors.price}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Thời lượng (phút) <span className="text-red-500">*</span></label>
          <input type="number" min="1" className={inp} value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="60" />
          {errors.duration && <p className="mt-1 text-[11px] text-red-500">{errors.duration}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái</label>
          <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Hoạt động</option><option value="inactive">Ngừng</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Loại xe áp dụng</label>
        <div className="flex flex-wrap gap-2">
          {[{ v: 'sedan', l: 'Sedan' }, { v: 'suv', l: 'SUV' }, { v: 'pickup', l: 'Pickup' }, { v: 'van', l: 'Van' }, { v: 'motorcycle', l: 'Xe máy' }].map((o) => (
            <button key={o.v} type="button" onClick={() => toggleVehicle(o.v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${form.vehicleTypes.includes(o.v) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{o.l}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-600">Dịch vụ chọn thêm</label>
          <button type="button" onClick={addSub} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><Plus size={12} weight="bold" /> Thêm</button>
        </div>
        <div className="space-y-2">
          {form.subServices.map((sub, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <input placeholder="Tên DV" className={inp + ' text-xs flex-1'} value={sub.name} onChange={(e) => updSub(idx, 'name', e.target.value)} />
              <input type="number" placeholder="Giá" className={inp + ' text-xs w-24'} value={sub.price} onChange={(e) => updSub(idx, 'price', e.target.value)} />
              <input type="number" placeholder="Phút" className={inp + ' text-xs w-20'} value={sub.duration} onChange={(e) => updSub(idx, 'duration', e.target.value)} />
              <button type="button" onClick={() => delSub(idx)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash size={13} /></button>
            </div>
          ))}
          {form.subServices.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có dịch vụ chọn thêm</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Hủy</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving && <Spinner size={14} className="text-white" />}{saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════════ */
export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);     // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'detail'
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);
  const debounce = useRef(null);

  const notify = (message, type = 'success') => setToast({ message, type });

  /* ── fetch ── */
  const fetchBranches = useCallback(async (q = search, st = statusFilter) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams();
      if (st) params.set('status', st);
      if (q.trim()) params.set('search', q.trim());
      const res = await apiFetch(`/branches?${params}`);
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const data = payload?.data ?? payload;
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchBranches(); }, []); // eslint-disable-line

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    fetchBranches(search, val);
  };

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchBranches(val, statusFilter), 420);
  };

  /* ── create ── */
  const handleCreate = async (data) => {
    setSaving(true);
    try {
      const res = await apiFetch('/branches', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const created = payload?.data ?? payload;
      setBranches((p) => [created, ...p]);
      setModal(null);
      notify('Tạo chi nhánh thành công!');
    } catch (err) {
      notify(err.message || 'Tạo thất bại', 'error');
    } finally { setSaving(false); }
  };

  /* ── update ── */
  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/branches/${selected._id}`, { method: 'PUT', body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const updated = payload?.data ?? payload;
      setBranches((p) => p.map((b) => (b._id === updated._id ? updated : b)));
      setModal(null);
      notify('Cập nhật thành công!');
    } catch (err) {
      notify(err.message || 'Cập nhật thất bại', 'error');
    } finally { setSaving(false); }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/branches/${selected._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      setBranches((p) => p.filter((b) => b._id !== selected._id));
      setModal(null);
      notify('Đã xóa chi nhánh.');
    } catch (err) {
      notify(err.message || 'Xóa thất bại', 'error');
    } finally { setDeleting(false); }
  };

  /* ── toggle ── */
  const handleToggle = async (branch) => {
    const next = branch.status === 'active' ? 'inactive' : 'active';
    setTogglingId(branch._id);
    try {
      const res = await apiFetch(`/branches/${branch._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const payload = await res.json();
      const updated = payload?.data ?? payload;
      setBranches((p) => p.map((b) => (b._id === updated._id ? updated : b)));
      notify(next === 'active' ? `Đã kích hoạt "${branch.name}"` : `Đã tắt "${branch.name}"`);
    } catch (err) {
      notify(err.message || 'Thay đổi thất bại', 'error');
    } finally { setTogglingId(null); }
  };

  const stats = {
    total: branches.length,
    active: branches.filter((b) => b.status === 'active').length,
    inactive: branches.filter((b) => b.status === 'inactive').length,
  };

  /* ─────────────────── render ─────────────────── */
  if (currentView === 'detail' && selected) {
    return (
      <div className="space-y-6">
        <BranchDetailFull
          branch={selected}
          onBack={() => setCurrentView('list')}
          onEdit={(br) => { setSelected(br); setModal('edit'); }}
        />

        {/* ── Modals for Detail View ── */}
        {modal === 'edit' && (
          <Modal title="Cập nhật thông tin chi nhánh" onClose={() => setModal(null)} wide>
            <BranchForm initial={selected} onSave={handleUpdate} onCancel={() => setModal(null)} saving={saving} />
          </Modal>
        )}
        {modal === 'delete' && (
          <ConfirmDelete branch={selected} onConfirm={handleDelete} onCancel={() => setModal(null)} deleting={deleting} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng chi nhánh',     value: stats.total,    icon: <Buildings size={18} weight="duotone" className="text-blue-500" />,    bg: 'bg-blue-50' },
          { label: 'Đang hoạt động',     value: stats.active,   icon: <CheckCircle size={18} weight="duotone" className="text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Ngừng hoạt động',    value: stats.inactive, icon: <XCircle size={18} weight="duotone" className="text-slate-400" />,      bg: 'bg-slate-100' },
        ].map((s) => (
          <div key={s.label}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* search */}
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="branch-search"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
            placeholder="Tìm tên, địa chỉ…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* status filter */}
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
        >
          <option value="">Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng</option>
        </select>

        {/* refresh */}
        <button
          id="branch-refresh"
          onClick={() => fetchBranches()}
          disabled={loading}
          title="Làm mới"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <ArrowClockwise size={15} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* add button */}
        <button
          id="add-branch-btn"
          onClick={() => { setSelected(null); setModal('create'); }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={15} weight="bold" />
          Thêm chi nhánh
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-28 text-slate-400">
          <Spinner size={28} />
          <span className="text-sm">Đang tải…</span>
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 py-16">
          <Warning size={28} weight="duotone" className="text-red-400" />
          <p className="text-sm text-red-600">{fetchError}</p>
          <button
            onClick={() => fetchBranches()}
            className="rounded-lg border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-100 transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20">
          <Buildings size={40} weight="thin" className="text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Chưa có chi nhánh nào</p>
          <button
            id="add-branch-empty"
            onClick={() => { setSelected(null); setModal('create'); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} weight="bold" />
            Thêm chi nhánh đầu tiên
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tên chi nhánh</th>
                <th className="px-6 py-4">Địa chỉ / Liên hệ</th>
                <th className="px-6 py-4">Giờ hoạt động</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 overflow-hidden">
                        {b.image ? (
                          <img src={b.image} alt={b.name} className="h-full w-full object-cover" />
                        ) : (
                          <Buildings size={20} weight="thin" />
                        )}
                      </div>
                      <div className="font-semibold text-slate-800">{b.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-slate-700 font-medium line-clamp-1">{b.address}</div>
                    {(b.phone || b.email) && (
                      <div className="text-xs text-slate-400 mt-1 flex gap-2">
                        {b.phone && <span>{b.phone}</span>}
                        {b.phone && b.email && <span>·</span>}
                        {b.email && <span>{b.email}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-slate-500">
                    {b.openingTime || b.closingTime ? `${b.openingTime} - ${b.closingTime}` : '-'}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => { setSelected(b); setCurrentView('detail'); }}
                        title="Xem chi tiết"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg !text-slate-400 hover:bg-slate-100 hover:!text-slate-700 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor">
                          <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.82,19.58,27.65,38.41C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.35c18.83-18.83,27.3-37.62,27.65-38.41A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128a133.47,133.47,0,0,1-23.06,30.75C185.67,180.81,158.78,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setSelected(b); setModal('edit'); }}
                        title="Chỉnh sửa"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg !text-slate-400 hover:bg-blue-50 hover:!text-blue-600 transition-colors"
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        onClick={() => { setSelected(b); setModal('delete'); }}
                        title="Xóa"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg !text-slate-400 hover:bg-red-50 hover:!text-red-500 transition-colors"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}      {modal === 'create' && (
        <Modal title="Thêm chi nhánh mới" onClose={() => setModal(null)} wide>
          <BranchForm initial={EMPTY} onSave={handleCreate} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}

      {modal === 'edit' && selected && (
        <Modal title={`Chỉnh sửa: ${selected.name}`} onClose={() => setModal(null)} wide>
          <BranchForm initial={selected} onSave={handleUpdate} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}

      {modal === 'delete' && selected && (
        <ConfirmDelete
          branch={selected}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          deleting={deleting}
        />
      )}

      {/* ── Toast ── */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
