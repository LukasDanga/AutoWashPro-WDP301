import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  ArrowClockwise,
  TrendUp,
  Clock,
  XCircle,
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin text-slate-400" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

const BOOKING_STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const BOOKING_STATUS_COLOR = {
  pending: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function StatusPill({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BOOKING_STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {BOOKING_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function ManagerOverview() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const bRes = await api('/bookings');
      if (bRes.ok) {
        const p = await bRes.json();
        const data = p?.data ?? p;
        setBookings(data?.bookings ?? (Array.isArray(data) ? data : []));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const now = new Date();
  const todayStr = now.toDateString();

  const today = bookings.filter((b) => new Date(b.bookingDate).toDateString() === todayStr);
  const pending = today.filter((b) => b.status === 'pending').length;
  const inProgress = today.filter((b) => b.status === 'in_progress').length;
  const completed = today.filter((b) => b.status === 'completed').length;
  const cancelled = today.filter((b) => b.status === 'cancelled').length;
  const recentBookings = bookings.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* header refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Hôm nay: <strong className="text-slate-700">{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
        </p>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* today's stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarCheck size={20} weight="duotone" className="text-blue-500" />}
          label="Đặt lịch hôm nay" value={today.length} sub="Tổng số lịch hẹn" color="bg-blue-50" />
        <StatCard icon={<Clock size={20} weight="duotone" className="text-amber-500" />}
          label="Chờ xác nhận" value={pending} sub="Cần xử lý" color="bg-amber-50" />
        <StatCard icon={<TrendUp size={20} weight="duotone" className="text-violet-500" />}
          label="Đang thực hiện" value={inProgress} sub="Đang rửa xe" color="bg-violet-50" />
        <StatCard icon={<CheckCircle size={20} weight="duotone" className="text-emerald-500" />}
          label="Hoàn thành" value={completed} sub={cancelled > 0 ? `${cancelled} đã hủy` : undefined} color="bg-emerald-50" />
      </div>

      {/* recent bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Lịch đặt gần đây</h2>
          <span className="text-xs text-slate-400">Tổng: {bookings.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14"><Spinner /></div>
        ) : recentBookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
            <CalendarCheck size={32} weight="thin" />
            <p className="text-sm">Chưa có lịch đặt nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentBookings.map((b) => (
              <div key={b._id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {b.userId?.name ?? 'Khách hàng'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {b.packageId?.name ?? 'Dịch vụ'} · {b.startTime}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusPill status={b.status} />
                  <p className="text-[11px] text-slate-400">
                    {new Date(b.bookingDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
