import { useEffect, useState } from 'react';
import {
  Buildings,
  CheckCircle,
  Clock,
  Envelope,
  MapPin,
  PencilSimple,
  Phone,
  ToggleLeft,
  ToggleRight,
  Warning,
  X,
  XCircle,
} from '@phosphor-icons/react';
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

/* ── edit modal ── */
const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';

function EditModal({ branch, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: branch.name ?? '',
    address: branch.address ?? '',
    phone: branch.phone ?? '',
    email: branch.email ?? '',
    openingTime: branch.openingTime ?? '07:00',
    closingTime: branch.closingTime ?? '18:00',
    image: branch.image ?? '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">Chỉnh sửa chi nhánh</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 overflow-y-auto max-h-[70vh] px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tên chi nhánh</label>
              <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Số điện thoại</label>
              <input className={inp} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Địa chỉ</label>
            <input className={inp} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input type="email" className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Giờ mở</label>
              <input type="time" className={inp} value={form.openingTime} onChange={(e) => set('openingTime', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Giờ đóng</label>
              <input type="time" className={inp} value={form.closingTime} onChange={(e) => set('closingTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">URL ảnh</label>
            <input className={inp} value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving && <Spinner size={14} />}{saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══ Main ═══ */
export default function ManagerBranch({ user }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  useEffect(() => {
    api('/branches')
      .then(async (res) => {
        if (!res.ok) throw new Error(await readErr(res));
        const p = await res.json();
        const data = p?.data ?? p;
        setBranches(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const res = await api(`/branches/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const updated = p?.data ?? p;
      setBranches((prev) => prev.map((b) => b._id === updated._id ? updated : b));
      setEditing(null);
      notify('Cập nhật chi nhánh thành công!');
    } catch (err) { notify(err.message || 'Cập nhật thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (branch) => {
    const next = branch.status === 'active' ? 'inactive' : 'active';
    setTogglingId(branch._id);
    try {
      const res = await api(`/branches/${branch._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const updated = p?.data ?? p;
      setBranches((prev) => prev.map((b) => b._id === updated._id ? updated : b));
      notify(next === 'active' ? 'Đã kích hoạt chi nhánh' : 'Đã tắt chi nhánh');
    } catch (err) { notify(err.message || 'Thay đổi thất bại', 'error'); }
    finally { setTogglingId(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400"><Spinner size={24} /></div>;
  if (error) return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 py-16 text-red-500">
      <Warning size={26} weight="duotone" /><p className="text-sm">{error}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Danh sách chi nhánh bạn có quyền quản lý.</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => {
          const active = b.status === 'active';
          const toggling = togglingId === b._id;
          return (
            <article key={b._id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              {/* image */}
              <div className="relative h-32 bg-slate-50">
                {b.image ? (
                  <img src={b.image} alt={b.name} className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Buildings size={44} weight="thin" className="text-slate-300" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                    {active ? <CheckCircle size={11} weight="fill" /> : <XCircle size={11} weight="fill" />}
                    {active ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </div>
              </div>
              {/* body */}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{b.name}</h3>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="flex items-start gap-2"><MapPin size={13} className="mt-0.5 shrink-0 text-blue-400" /><span className="line-clamp-2">{b.address}</span></li>
                  {b.phone && <li className="flex items-center gap-2"><Phone size={13} className="shrink-0 text-blue-400" />{b.phone}</li>}
                  {b.email && <li className="flex items-center gap-2"><Envelope size={13} className="shrink-0 text-blue-400" /><span className="truncate">{b.email}</span></li>}
                  <li className="flex items-center gap-2"><Clock size={13} className="shrink-0 text-blue-400" />{b.openingTime} – {b.closingTime}</li>
                </ul>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                  <button onClick={() => handleToggle(b)} disabled={toggling}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                    {toggling ? <Spinner size={12} /> : active ? <ToggleRight size={15} className="text-emerald-500" /> : <ToggleLeft size={15} className="text-slate-400" />}
                    {active ? 'Đang mở' : 'Đã tắt'}
                  </button>
                  <button id={`edit-branch-${b._id}`} onClick={() => setEditing(b)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <PencilSimple size={14} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {editing && (
        <EditModal branch={editing} onSave={handleSave} onClose={() => setEditing(null)} saving={saving} />
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
