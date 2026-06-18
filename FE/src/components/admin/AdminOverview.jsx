import { useEffect, useState } from 'react';
import {
  ChartLine,
  CurrencyDollar,
  CalendarCheck,
  Buildings,
  Users,
  Money,
  CreditCard,
  CaretRight,
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { cn } from '@/lib/utils';

const apiBase = getApiBaseUrl();
const token = getStoredToken();
const headers = { Authorization: `Bearer ${token}` };

function fmt(n) {
  return new Intl.NumberFormat('vi-VN').format(n ?? 0);
}

function fmtCurrency(n) {
  return `${fmt(n)}đ`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

const STATUS_META = {
  pending:     { label: 'Chờ xử lý',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  checked_in:  { label: 'Đã check-in', bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  in_progress: { label: 'Đang rửa',    bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400' },
  completed:   { label: 'Hoàn thành',  bg: 'bg-emerald-50',text: 'text-emerald-700', dot: 'bg-emerald-400' },
  cancelled:   { label: 'Đã hủy',      bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
};

const TIER_COLORS = {
  bronze:  'text-amber-700 bg-amber-50',
  silver:  'text-slate-600 bg-slate-100',
  gold:    'text-yellow-700 bg-yellow-50',
  diamond: 'text-cyan-700 bg-cyan-50',
};

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [resReport, resBranches, resUsers, resBookings] = await Promise.all([
          fetch(`${apiBase}/reports/revenue`, { headers }),
          fetch(`${apiBase}/branches`, { headers }),
          fetch(`${apiBase}/auth/users`, { headers }),
          fetch(`${apiBase}/bookings?limit=10`, { headers }),
        ]);
        const [reportData, branchesData, usersData, bookingsData] = await Promise.all([
          resReport.json().then(r => r?.data ?? r),
          resBranches.json().then(r => r?.data ?? r),
          resUsers.json().then(r => r?.data ?? r),
          resBookings.json().then(r => r?.data ?? r),
        ]);
        setReport(reportData);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setBookings(bookingsData?.bookings ?? (Array.isArray(bookingsData) ? bookingsData : []));
      } catch (e) {
        console.error('Failed to load overview data', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  const activeBranches = branches.filter(b => b.status === 'active').length;
  const customers = users.filter(u => u.role === 'customer');
  const revenue = report?.totalRevenue ?? 0;
  const totalBookings = report?.totalBookings ?? 0;
  const cashRevenue = report?.cashRevenue ?? 0;
  const transferRevenue = report?.transferRevenue ?? 0;
  const byPackage = report?.byPackage ?? [];
  const byCustomer = report?.byCustomer ?? [];
  const maxPkgRevenue = byPackage.length > 0 ? Math.max(...byPackage.map(p => p.totalRevenue)) : 1;

  const statCards = [
    { label: 'Tổng doanh thu',   value: fmtCurrency(revenue),     icon: <CurrencyDollar size={20} weight="duotone" className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { label: 'Tổng lượt đặt',    value: fmt(totalBookings),       icon: <CalendarCheck size={20} weight="duotone" className="text-blue-600" />,    bg: 'bg-blue-50' },
    { label: 'Chi nhánh',        value: `${activeBranches}/${branches.length}`, icon: <Buildings size={20} weight="duotone" className="text-violet-600" />, bg: 'bg-violet-50' },
    { label: 'Khách hàng',       value: fmt(customers.length),    icon: <Users size={20} weight="duotone" className="text-amber-600" />,           bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue split + top packages */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue split */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ChartLine size={18} weight="duotone" className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Doanh thu theo phương thức</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Tiền mặt',  value: cashRevenue,     icon: <Money size={18} className="text-emerald-500" />, color: 'bg-emerald-500' },
              { label: 'Chuyển khoản', value: transferRevenue, icon: <CreditCard size={18} className="text-blue-500" />, color: 'bg-blue-500' },
            ].map((item) => {
              const pct = revenue > 0 ? (item.value / revenue) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-800">{fmtCurrency(item.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-700 ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top packages */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ChartLine size={18} weight="duotone" className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Gói dịch vụ hàng đầu</h3>
          </div>
          <div className="space-y-3">
            {byPackage.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
            ) : byPackage.slice(0, 5).map((p) => {
              const pct = (p.totalRevenue / maxPkgRevenue) * 100;
              return (
                <div key={p._id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{p.package?.name ?? 'Không rõ'}</span>
                    <span className="ml-2 shrink-0 font-semibold text-slate-800">{fmtCurrency(p.totalRevenue)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} weight="duotone" className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Lượt đặt gần đây</h3>
          </div>
        </div>
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có lượt đặt nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4">Khách hàng</th>
                  <th className="py-2 pr-4">Gói</th>
                  <th className="py-2 pr-4">Chi nhánh</th>
                  <th className="py-2 pr-4">Thời gian</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 text-right">Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map((b) => {
                  const sm = STATUS_META[b.status] || STATUS_META.pending;
                  return (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-slate-700">{b.userId?.name ?? '—'}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{b.packageId?.name ?? '—'}</td>
                      <td className="py-3 pr-4 text-slate-600">{b.branchId?.name ?? '—'}</td>
                      <td className="py-3 pr-4 text-slate-600">{fmtDate(b.bookingDate)}</td>
                      <td className="py-3 pr-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', sm.bg, sm.text)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', sm.dot)} />
                          {sm.label}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-slate-700">
                        {b.finalPrice ? fmtCurrency(b.finalPrice) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top customers */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} weight="duotone" className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Khách hàng thân thiết</h3>
        </div>
        {byCustomer.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-2">
            {byCustomer.slice(0, 6).map((c) => (
              <div key={c._id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {(c.user?.name ?? '?')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{c.user?.name ?? 'Ẩn danh'}</p>
                  <p className="truncate text-xs text-slate-400">{c.bookingsCount} lượt · {fmtCurrency(c.totalRevenue)}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', TIER_COLORS[c.user?.tier] || TIER_COLORS.bronze)}>
                  {c.user?.tier ?? 'bronze'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}