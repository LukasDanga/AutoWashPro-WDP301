import { useEffect, useState, useCallback } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  ArrowClockwise,
  TrendUp,
  TrendDown,
  Clock,
} from '@phosphor-icons/react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import useSSE from '@/hooks/useSSE';

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

function StatCard({ icon, label, value, sub, color, trend }) {
  let trendUi = null;
  if (trend !== undefined) {
    if (trend > 0) {
      trendUi = (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <TrendUp weight="bold" />
          <span>{trend}% so với hôm qua</span>
        </div>
      );
    } else if (trend < 0) {
      trendUi = (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-500">
          <TrendDown weight="bold" />
          <span>{Math.abs(trend)}% so với hôm qua</span>
        </div>
      );
    } else {
      trendUi = <div className="mt-1 text-[11px] text-slate-400">Không đổi so với hôm qua</div>;
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
        {trendUi}
      </div>
    </div>
  );
}

const STATUS_META = {
  pending:          { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed:        { label: 'Đã xác nhận', color: '#6366f1' },
  checked_in:       { label: 'Đã check-in', color: '#06b6d4' },
  in_progress:      { label: 'Đang thực hiện', color: '#3b82f6' },
  awaiting_payment: { label: 'Chờ thanh toán', color: '#f97316' },
  completed:        { label: 'Hoàn thành', color: '#10b981' },
  cancelled:        { label: 'Đã hủy', color: '#94a3b8' },
};

const WEEKDAY_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function ManagerOverview() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();

  const load = useCallback(async () => {
    try {
      const bRes = await api('/bookings?limit=200');
      if (bRes.ok) {
        const p = await bRes.json();
        const data = p?.data ?? p;
        setBookings(data?.bookings ?? (Array.isArray(data) ? data : []));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSSE(token, 'slots_updated', load);
  useSSE(token, 'payment_new', load);

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();

  const today = bookings.filter((b) => new Date(b.bookingDate).toDateString() === todayStr);
  const yesterday = bookings.filter((b) => new Date(b.bookingDate).toDateString() === yesterdayStr);

  const pending = today.filter((b) => b.status === 'pending').length;
  const inProgress = today.filter((b) => b.status === 'in_progress').length;
  const completed = today.filter((b) => b.status === 'completed').length;
  const cancelled = today.filter((b) => b.status === 'cancelled').length;

  const yPending = yesterday.filter((b) => b.status === 'pending').length;
  const yInProgress = yesterday.filter((b) => b.status === 'in_progress').length;
  const yCompleted = yesterday.filter((b) => b.status === 'completed').length;
  const yCancelled = yesterday.filter((b) => b.status === 'cancelled').length;

  const getTrend = (curr, prev) => {
    if (prev === 0 && curr > 0) return 100;
    if (prev === 0 && curr === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // ── 7-day bar chart data ──
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const count = bookings.filter((b) => new Date(b.bookingDate).toDateString() === key).length;
    const done = bookings.filter((b) => new Date(b.bookingDate).toDateString() === key && b.status === 'completed').length;
    return { label: `${WEEKDAY_VN[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`, 'Lịch hẹn': count, 'Hoàn thành': done };
  });

  // ── status distribution donut ──
  const statusCounts = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});
  const statusData = Object.entries(STATUS_META)
    .map(([k, m]) => ({ name: m.label, value: statusCounts[k] || 0, color: m.color }))
    .filter((d) => d.value > 0);

  // ── revenue (completed + paid) per day ──
  const revenue7 = last7.map(({ label }) => label);
  const revenueData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const rev = bookings
      .filter((b) => new Date(b.bookingDate).toDateString() === key && b.status === 'completed')
      .reduce((s, b) => s + (b.finalPrice || 0), 0);
    return { label: revenue7[i], 'Doanh thu': rev };
  });

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
          label="Đặt lịch hôm nay" value={today.length} sub="Tổng số lịch hẹn" color="bg-blue-50" trend={getTrend(today.length, yesterday.length)} />
        <StatCard icon={<Clock size={20} weight="duotone" className="text-amber-500" />}
          label="Chờ xác nhận" value={pending} sub="Cần xử lý" color="bg-amber-50" trend={getTrend(pending, yPending)} />
        <StatCard icon={<TrendUp size={20} weight="duotone" className="text-violet-500" />}
          label="Đang thực hiện" value={inProgress} sub="Đang rửa xe" color="bg-violet-50" trend={getTrend(inProgress, yInProgress)} />
        <StatCard icon={<CheckCircle size={20} weight="duotone" className="text-emerald-500" />}
          label="Hoàn thành" value={completed} sub={cancelled > 0 ? `${cancelled} đã hủy` : undefined} color="bg-emerald-50" trend={getTrend(completed, yCompleted)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 7-day bookings bar chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Lịch đặt 7 ngày gần đây</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={last7} barGap={4} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Lịch hẹn" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Hoàn thành" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* status distribution donut */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Phân bố trạng thái</h2>
              {statusData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                      innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* revenue bar chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Doanh thu 7 ngày (đơn hoàn thành)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}tr` : v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toLocaleString('vi-VN')}₫`, 'Doanh thu']} />
                <Bar dataKey="Doanh thu" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
