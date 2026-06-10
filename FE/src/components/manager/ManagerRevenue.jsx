import { useEffect, useState } from 'react';
import {
  CurrencyCircleDollar,
  Receipt,
  User,
  Package,
  CalendarBlank,
  Spinner as PhSpinner,
  Money,
  Bank,
  Eye,
} from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import TierBadge from '@/components/ui/TierBadge';

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

function StatCard({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function ManagerRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, month, today
  const [viewMode, setViewMode] = useState('overview'); // overview, customers

  async function loadData() {
    setLoading(true);
    try {
      let query = '';
      if (filter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = `?startDate=${today.toISOString()}`;
      } else if (filter === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        query = `?startDate=${startOfMonth.toISOString()}`;
      }

      const res = await api(`/reports/revenue${query}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload.data || payload);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
  }, [filter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 border-b border-slate-200 flex-1">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setViewMode('customers')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'customers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Danh sách khách hàng
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Tất cả thời gian
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'month' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'today' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Hôm nay
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner /></div>
      ) : data ? (
        viewMode === 'overview' ? (
          <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<CurrencyCircleDollar size={24} weight="duotone" className="text-emerald-500" />}
              label="Tổng doanh thu"
              value={`${(data.totalRevenue || 0).toLocaleString('vi-VN')}đ`}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<Money size={24} weight="duotone" className="text-green-500" />}
              label="Tiền mặt"
              value={`${(data.cashRevenue || 0).toLocaleString('vi-VN')}đ`}
              color="bg-green-50"
            />
            <StatCard
              icon={<Bank size={24} weight="duotone" className="text-indigo-500" />}
              label="Chuyển khoản"
              value={`${(data.transferRevenue || 0).toLocaleString('vi-VN')}đ`}
              color="bg-indigo-50"
            />
            <StatCard
              icon={<Receipt size={24} weight="duotone" className="text-blue-500" />}
              label="Số lượt thanh toán"
              value={data.totalBookings || 0}
              color="bg-blue-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* By Customer */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-700">Khách hàng chi tiêu cao nhất</h2>
                </div>
                <button
                  onClick={() => setViewMode('customers')}
                  title="Xem tất cả khách hàng"
                  className="rounded-full p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Eye size={18} weight="duotone" />
                </button>
              </div>
              <div className="p-0">
                {(!data.byCustomer || data.byCustomer.length === 0) ? (
                  <div className="p-8 text-center text-sm text-slate-400">Không có dữ liệu</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.byCustomer.slice(0, 5).map((c, i) => (
                      <div key={c._id || i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="truncate text-sm font-medium text-slate-800">{c.user?.name || 'Khách vãng lai'}</p>
                            {c.user?.tier && <TierBadge tier={c.user.tier} />}
                          </div>
                          <p className="truncate text-xs text-slate-500">{c.bookingsCount} lượt đặt</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">{(c.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* By Package */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center gap-2">
                <Package size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Doanh thu theo dịch vụ</h2>
              </div>
              <div className="p-0">
                {(!data.byPackage || data.byPackage.length === 0) ? (
                  <div className="p-8 text-center text-sm text-slate-400">Không có dữ liệu</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.byPackage.map((p, i) => (
                      <div key={p._id || i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{p.package?.name || 'Gói dịch vụ'}</p>
                          <p className="truncate text-xs text-slate-500">{p.bookingsCount} lượt đặt</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">{(p.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          {/* Full List of Customers Tab */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Danh sách khách hàng ({data?.byCustomer?.length || 0})</h2>
            <button onClick={() => setViewMode('overview')} className="text-sm text-blue-600 font-medium hover:underline">
              Quay lại tổng quan
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Khách hàng</th>
                  <th className="px-5 py-3 font-semibold text-center">Số lượt đặt</th>
                  <th className="px-5 py-3 font-semibold text-right">Doanh thu mang lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data?.byCustomer || data.byCustomer.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400">Không có dữ liệu</td>
                  </tr>
                ) : (
                  data.byCustomer.map((c, i) => (
                    <tr key={c._id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="truncate text-sm font-medium text-slate-800">{c.user?.name || 'Khách vãng lai'}</p>
                          {c.user?.tier && <TierBadge tier={c.user.tier} />}
                        </div>
                        <p className="text-xs text-slate-500">{c.user?.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-slate-700">{c.bookingsCount}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-semibold text-emerald-600">{(c.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <CalendarBlank size={48} weight="thin" className="mb-2" />
          <p>Không thể tải dữ liệu báo cáo</p>
        </div>
      )}
    </div>
  );
}
