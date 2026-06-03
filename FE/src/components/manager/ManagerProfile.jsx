import { useEffect, useState } from 'react';
import { CheckCircle, FloppyDisk, UserCircle, Warning, X, XCircle } from '@phosphor-icons/react';
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

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors disabled:bg-slate-50 disabled:text-slate-500';

export default function ManagerProfile({ user }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  useEffect(() => {
    if (user) setForm({ name: user.name ?? '', phone: user.phone ?? '' });
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api('/auth/profile', { method: 'PUT', body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await readErr(res));
      notify('Cập nhật hồ sơ thành công!');
    } catch (err) { notify(err.message || 'Cập nhật thất bại', 'error'); }
    finally { setSaving(false); }
  };

  const handlePwSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return notify('Mật khẩu xác nhận không khớp', 'error');
    setPwSaving(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      notify('Đổi mật khẩu thành công!');
    } catch (err) { notify(err.message || 'Đổi mật khẩu thất bại', 'error'); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* avatar block */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <UserCircle size={40} weight="duotone" className="text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">{user?.name ?? '—'}</p>
          <p className="text-sm text-slate-500">{user?.email ?? '—'}</p>
          <span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">Quản lý chi nhánh</span>
        </div>
      </div>

      {/* edit profile */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Thông tin cá nhân</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Họ và tên</label>
            <input className={inp} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Số điện thoại</label>
            <input className={inp} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0901234567" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input className={inp} value={user?.email ?? ''} disabled />
          </div>
          <div className="flex justify-end">
            <button type="submit" id="save-profile-btn" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving ? <Spinner size={14} /> : <FloppyDisk size={14} />}
              {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      </div>

      {/* change password */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Đổi mật khẩu</h2>
        <form onSubmit={handlePwSave} className="space-y-4">
          {['currentPassword', 'newPassword', 'confirm'].map((k) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {k === 'currentPassword' ? 'Mật khẩu hiện tại' : k === 'newPassword' ? 'Mật khẩu mới' : 'Xác nhận mật khẩu mới'}
              </label>
              <input type="password" className={inp} value={pwForm[k]}
                onChange={(e) => setPwForm((f) => ({ ...f, [k]: e.target.value }))} placeholder="••••••••" />
            </div>
          ))}
          <div className="flex justify-end">
            <button type="submit" id="change-pw-btn" disabled={pwSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors">
              {pwSaving ? <Spinner size={14} /> : null}
              {pwSaving ? 'Đang xử lý…' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
