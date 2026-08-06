import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import {
  CalendarBlank, Clock, ArrowClockwise, X,
  CheckCircle, XCircle, Star, ChatText,
  UserCircle, Buildings, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

const EVENT_ICONS = {
  created:       { icon: CalendarBlank, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Đặt lịch mới' },
  completed:     { icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Hoàn thành' },
  cancelled:     { icon: XCircle,        color: 'text-red-500', bg: 'bg-red-100', label: 'Đã hủy' },
  feedback:      { icon: Star,           color: 'text-amber-500', bg: 'bg-amber-100', label: 'Đánh giá mới' },
};

function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateVN(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN');
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export default function AdminActivity() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api(`/bookings?limit=200&page=1`);
      if (!res.ok) throw new Error('Không thể tải dữ liệu');
      const data = await res.json();
      const list = data?.data?.bookings || data?.data || [];
      const raw = Array.isArray(list) ? list : [];

      const all = [];
      for (const b of raw) {
        if (b.createdAt) all.push({ type: 'created', ts: b.createdAt, booking: b });
        if (b.status === 'completed' && b.checkOutTime) all.push({ type: 'completed', ts: b.checkOutTime, booking: b });
        if (b.status === 'cancelled' && b.cancelledAt) all.push({ type: 'cancelled', ts: b.cancelledAt, booking: b });
        if (b.feedbackAt) all.push({ type: 'feedback', ts: b.feedbackAt, booking: b });
      }

      all.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      setEvents(all);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter ? events.filter(e => e.type === typeFilter) : events;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Group by date
  const groups = [];
  for (const ev of paginated) {
    const day = fmtDateVN(ev.ts);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(ev);
    else groups.push({ day, items: [ev] });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Tất cả hoạt động</option>
          <option value="created">Đặt lịch mới</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
          <option value="feedback">Đánh giá</option>
        </select>
        <button onClick={load} disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-slate-400">
          <Clock size={48} weight="duotone" />
          <p className="text-sm">Chưa có hoạt động nào.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <div key={g.day}>
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CalendarBlank size={14} className="text-slate-400" />
                {g.day}
              </h3>
              <div className="space-y-2">
                {g.items.map((ev, idx) => {
                  const cfg = EVENT_ICONS[ev.type] || EVENT_ICONS.created;
                  const Icon = cfg.icon;
                  const b = ev.booking;
                  return (
                    <div key={`${b._id}-${ev.type}-${idx}`}
                      className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={16} className={cfg.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {cfg.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {b.userId?.name || 'Khách hàng'}
                              {b.branchId?.name ? ` tại ${b.branchId.name}` : ''}
                              {b.packageId?.name ? ` — ${b.packageId.name}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-2">
                            <button onClick={() => navigate(`/admin/bookings/${b._id}`)}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 underline shrink-0">
                              Xem đơn
                            </button>
                            {fmtTime(ev.ts)}
                          </span>
                        </div>
                        {(ev.type === 'feedback' && b.feedback) && (
                          <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            "{b.feedback}"
                            {b.rating && <span className="text-amber-500 not-italic ml-2">{'★'.repeat(b.rating)}</span>}
                          </p>
                        )}
                        {(ev.type === 'cancelled' && b.cancellationReason) && (
                          <p className="text-xs text-red-500 mt-1">Lý do: {b.cancellationReason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                ‹ Trước
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 3, totalPages - 6));
                return start + i;
              }).filter(p => p <= totalPages).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    safePage === p ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>{p}</button>
              ))}
              <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Sau ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}