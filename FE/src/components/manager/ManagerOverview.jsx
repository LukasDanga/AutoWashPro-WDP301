import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  ClipboardText,
  CurrencyCircleDollar,
  Spinner as PhSpinner,
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
  const [checkinStats, setCheckinStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api('/bookings?limit=5'),
        api('/checkins/stats'),
      ]);
      if (bRes.ok) {
        const p = await bRes.json();
        const data = p?.data ?? p;
        setBookings(Array.isArray(data) ? data.slice(0, 6) : []);
      }
      if (cRes.ok) {
        const p = await cRes.json();
        setCheckinStats(p?.data ?? p);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const today = bookings.filter((b) => {
    const d = new Date(b.bookingDate);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const pending = bookings.filter((b) => b.status === 'pending').length;
  const inProgress = bookings.filter((b) => b.status === 'in_progress').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* header refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Hôm nay: <strong className="text-slate-700">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
        </p>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<CalendarCheck size={20} weight="duotone" className="text-blue-500" />}
          label="Tổng đặt lịch" value={bookings.length} color="bg-blue-50" />
        <StatCard icon={<Clock size={20} weight="duotone" className="text-amber-500" />}
          label="Chờ xác nhận" value={pending} color="bg-amber-50" />
        <StatCard icon={<TrendUp size={20} weight="duotone" className="text-violet-500" />}
          label="Đang thực hiện" value={inProgress} color="bg-violet-50" />
        <StatCard icon={<CheckCircle size={20} weight="duotone" className="text-emerald-500" />}
          label="Hoàn thành" value={completed} color="bg-emerald-50" />
      </div>

      {/* checkin stats */}
      {checkinStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<ClipboardText size={20} weight="duotone" className="text-cyan-500" />}
            label="Check-in hôm nay" value={checkinStats.today ?? checkinStats.total ?? '—'} color="bg-cyan-50" />
          <StatCard icon={<CurrencyCircleDollar size={20} weight="duotone" className="text-green-500" />}
            label="Check-in hoàn thành" value={checkinStats.completed ?? '—'} color="bg-green-50" />
          <StatCard icon={<XCircle size={20} weight="duotone" className="text-slate-400" />}
            label="Đang xử lý" value={checkinStats.in_progress ?? checkinStats.inProgress ?? '—'} color="bg-slate-100" />
        </div>
      )}

      {/* recent bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Lịch đặt gần đây</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14"><Spinner /></div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
            <CalendarCheck size={32} weight="thin" />
            <p className="text-sm">Chưa có lịch đặt nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map((b) => (
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
