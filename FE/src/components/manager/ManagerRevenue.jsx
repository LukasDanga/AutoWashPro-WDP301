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
      {/* Filters */}
      <div className="flex items-center justify-between">
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
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center gap-2">
                <User size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Khách hàng chi tiêu cao nhất</h2>
              </div>
              <div className="p-0">
                {(!data.byCustomer || data.byCustomer.length === 0) ? (
                  <div className="p-8 text-center text-sm text-slate-400">Không có dữ liệu</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.byCustomer.slice(0, 5).map((c, i) => (
                      <div key={c._id || i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{c.user?.name || 'Khách vãng lai'}</p>
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
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <CalendarBlank size={48} weight="thin" className="mb-2" />
          <p>Không thể tải dữ liệu báo cáo</p>
        </div>
      )}
    </div>
  );
}
