import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise,
  Buildings,
  CheckCircle,
  Clock,
  Envelope,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Phone,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash,
  Warning,
  X,
  XCircle,
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

/* ─────────────────────────── Branch card ────────────────────────── */
function BranchCard({ branch, onEdit, onDelete, onToggle, togglingId }) {
  const toggling = togglingId === branch._id;
  const active = branch.status === 'active';

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      {/* image */}
      <div className="relative h-32 overflow-hidden bg-slate-50">
        {branch.image ? (
          <img
            src={branch.image}
            alt={branch.name}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Buildings size={48} weight="thin" className="text-slate-300" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={branch.status} />
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{branch.name}</h3>

        <ul className="space-y-1.5 text-xs text-slate-500">
          <li className="flex items-start gap-2">
            <MapPin size={13} className="mt-0.5 shrink-0 text-blue-400" />
            <span className="line-clamp-2">{branch.address}</span>
          </li>
          {branch.phone && (
            <li className="flex items-center gap-2">
              <Phone size={13} className="shrink-0 text-blue-400" />
              {branch.phone}
            </li>
          )}
          {branch.email && (
            <li className="flex items-center gap-2">
              <Envelope size={13} className="shrink-0 text-blue-400" />
              <span className="truncate">{branch.email}</span>
            </li>
          )}
          {(branch.openingTime || branch.closingTime) && (
            <li className="flex items-center gap-2">
              <Clock size={13} className="shrink-0 text-blue-400" />
              {branch.openingTime} – {branch.closingTime}
            </li>
          )}
        </ul>

        {/* action row */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            id={`toggle-${branch._id}`}
            onClick={() => onToggle(branch)}
            disabled={toggling}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            {toggling
              ? <Spinner size={13} />
              : active
                ? <ToggleRight size={16} className="text-emerald-500" />
                : <ToggleLeft size={16} className="text-slate-400" />}
            {active ? 'Đang mở' : 'Đã tắt'}
          </button>

          <div className="flex gap-1">
            <button
              id={`edit-${branch._id}`}
              onClick={() => onEdit(branch)}
              title="Chỉnh sửa"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <PencilSimple size={14} />
            </button>
            <button
              id={`delete-${branch._id}`}
              onClick={() => onDelete(branch)}
              title="Xóa"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
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
  return (
    <div className="space-y-6">

      {/* ── Stat row ── */}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {branches.map((b) => (
            <BranchCard
              key={b._id}
              branch={b}
              onEdit={(br) => { setSelected(br); setModal('edit'); }}
              onDelete={(br) => { setSelected(br); setModal('delete'); }}
              onToggle={handleToggle}
              togglingId={togglingId}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'create' && (
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
