import { useCallback, useEffect, useState } from 'react';
import {
  ArrowClockwise,
  CheckCircle,
  ClipboardText,
  MagnifyingGlass,
  Warning,
  X,
  XCircle,
  CaretDown,
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
  });
}
async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; }
  catch { return `Lỗi ${res.status}`; }
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

const CHECKIN_STATUS = {
  checked_in:  { label: 'Đã check-in', cls: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'Đang rửa', cls: 'bg-violet-50 text-violet-700' },
  completed:   { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700' },
};
const NEXT = {
  checked_in:  ['in_progress'],
  in_progress: ['completed'],
};

function CIBadge({ status }) {
  const s = CHECKIN_STATUS[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function StatusMenu({ id, current, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const nexts = NEXT[current];
  if (!nexts) return <CIBadge status={current} />;
  const update = async (s) => {
    setBusy(true); setOpen(false);
    try {
      const res = await api(`/checkins/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) });
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      onUpdated(p?.data ?? p);
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)} disabled={busy}
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold hover:opacity-80 disabled:opacity-50">
        {busy && <Spinner size={10} />}
        <CIBadge status={current} />
        <CaretDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 min-w-[130px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {nexts.map((s) => (
            <button key={s} onClick={() => update(s)} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors">
              <CIBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagerCheckins() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);
  const notify = (msg, type = 'success') => setToast({ message: msg, type });

  const fetch_ = useCallback(async (sf = statusFilter) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (sf) params.set('status', sf);
      const res = await api(`/checkins?${params}`);
      if (!res.ok) throw new Error(await readErr(res));
      const p = await res.json();
      const data = p?.data ?? p;
      setCheckins(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message || 'Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetch_(); }, []); // eslint-disable-line

  const handleUpdated = (updated) => {
    setCheckins((p) => p.map((c) => c._id === updated._id ? updated : c));
    notify('Đã cập nhật trạng thái check-in');
  };

  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select id="checkin-status-filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetch_(e.target.value); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors">
          <option value="">Tất cả trạng thái</option>
          <option value="checked_in">Đã check-in</option>
          <option value="in_progress">Đang rửa</option>
          <option value="completed">Hoàn thành</option>
        </select>
        <button onClick={() => fetch_()} disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Spinner /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-red-500">
            <Warning size={26} weight="duotone" />
            <p className="text-sm">{error}</p>
            <button onClick={() => fetch_()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm hover:bg-red-50 transition-colors">Thử lại</button>
          </div>
        ) : checkins.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <ClipboardText size={36} weight="thin" /><p className="text-sm">Chưa có check-in nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Giờ check-in</th>
                <th className="px-4 py-3">Giờ ra</th>
                <th className="px-4 py-3">Đánh giá</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checkins.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{c.customerId?.name ?? '—'}</p>
                    <p className="text-[11px] text-slate-400">{c.customerId?.phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.checkInTime ? new Date(c.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.checkOutTime ? new Date(c.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.rating ? (
                      <span className="text-amber-500">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusMenu id={c._id} current={c.status} onUpdated={handleUpdated} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
