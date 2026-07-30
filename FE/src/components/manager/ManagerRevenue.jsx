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
  Car,
  TrendUp,
  TrendDown
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

function StatCard({ icon, label, value, sub, color, currentRaw, prevRaw, hideTrend }) {
  let trendUi = null;
  if (!hideTrend && prevRaw !== undefined && prevRaw !== null) {
    let percent = 0;
    if (prevRaw === 0 && currentRaw > 0) percent = 100;
    else if (prevRaw > 0) percent = ((currentRaw - prevRaw) / prevRaw) * 100;

    const isUp = percent > 0;
    const isDown = percent < 0;
    const isNeutral = percent === 0;

    if (!isNeutral) {
      trendUi = (
        <div className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {isUp ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
          <span>{Math.abs(percent).toFixed(1)}% so với kỳ trước</span>
        </div>
      );
    } else {
      trendUi = <div className="mt-1 text-[11px] text-slate-400">Không đổi so với kỳ trước</div>;
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

const getPrev = (list, id) => list?.find(x => x._id === id)?.totalRevenue || 0;

function ListTrend({ currentRaw, prevRaw, hideTrend }) {
  if (hideTrend || currentRaw === undefined || prevRaw === undefined) return null;
  let trend = 0;
  if (prevRaw === 0 && currentRaw > 0) trend = 100;
  else if (prevRaw === 0 && currentRaw === 0) trend = 0;
  else trend = Math.round(((currentRaw - prevRaw) / prevRaw) * 100);

  let content;
  if (trend > 0) {
    content = (
      <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 font-medium">
        <TrendUp weight="bold" /> {trend}%
      </span>
    );
  } else if (trend < 0) {
    content = (
      <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
        <TrendDown weight="bold" /> {Math.abs(trend)}%
      </span>
    );
  } else {
    content = <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">— 0%</span>;
  }
  return <div className="mt-1 flex justify-end">{content}</div>;
}

function VehicleDetailModal({ vehicle, onClose, filter }) {
  const user = vehicle?.vehicle?.user;
  const vehicleId = vehicle?.vehicle?._id;
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      setLoadingBookings(true);
      const periodQ = filter !== 'all' ? `?period=${filter}` : '';
      api(`/bookings/vehicle/${vehicleId}${periodQ}`)
        .then(r => r.json())
        .then(res => setBookings(res?.data || []))
        .finally(() => setLoadingBookings(false));
    }
  }, [vehicleId, filter]);

  if (!vehicle) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{vehicle.vehicle?.licensePlate || 'Chưa cập nhật'}</p>
              <p className="text-sm text-slate-500 capitalize">{vehicle.vehicle?.vehicleType} · {vehicle.vehicle?.brand} {vehicle.vehicle?.model}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              {(user?.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">{user?.name || 'Không có thông tin'}</p>
              <p className="text-xs text-slate-500">{user?.phone || ''}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">{(vehicle.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
              <p className="text-xs text-slate-400">{vehicle.bookingsCount} lượt đặt</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {user ? (
          <>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mx-6 mb-5">
              {['info', 'benefits', 'bookings', 'wallet'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {t === 'info' ? 'Thông tin' : t === 'benefits' ? 'Ưu đãi hạng' : t === 'bookings' ? 'Lịch sử đặt' : 'Ví'}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6 space-y-4">
              {tab === 'info' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tên</p><p className="text-sm font-medium text-slate-800 mt-1">{user.name || '—'}</p></div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email</p><p className="text-sm font-medium text-slate-800 mt-1">{user.email || '—'}</p></div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số điện thoại</p><p className="text-sm font-medium text-slate-800 mt-1">{user.phone || '—'}</p></div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ngày tham gia</p><p className="text-sm font-medium text-slate-800 mt-1">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}</p></div>
                </div>
              )}
              {tab === 'benefits' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hạng thành viên</p><p className="text-sm font-bold text-slate-800 mt-1 capitalize">{user.tier || 'Standard'}</p></div>
                    {user.tier && <TierBadge tier={user.tier} />}
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm tích lũy</p><p className="text-sm font-bold text-slate-800 mt-1">{user.loyaltyPoints || 0}</p></div>
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 font-bold">{user.loyaltyPoints || 0}</div>
                  </div>
                </div>
              )}
              {tab === 'bookings' && (
                <div className="space-y-2">
                  {loadingBookings ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center text-sm text-slate-400 py-6">Chưa có lượt đặt nào</div>
                  ) : (
                    bookings.map((b, i) => (
                      <div key={b._id || i} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">#{b.bookingCode || '—'}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            b.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            b.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                            b.status === 'confirmed' ? 'bg-blue-50 text-blue-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {b.status === 'completed' ? 'Hoàn thành' :
                             b.status === 'cancelled' ? 'Đã hủy' :
                             b.status === 'confirmed' ? 'Đã xác nhận' :
                             b.status === 'checked_in' ? 'Đã check-in' :
                             b.status === 'in_progress' ? 'Đang thực hiện' : b.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('vi-VN') : '—'} · {b.startTime || '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {b.packageId?.name || '—'} · <span className="font-medium text-emerald-600">{(b.finalPrice || 0).toLocaleString('vi-VN')}đ</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'wallet' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số dư ví</p><p className="text-sm font-bold text-slate-800 mt-1">{(user.walletBalance || 0).toLocaleString('vi-VN')}đ</p></div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><CurrencyCircleDollar size={20} weight="duotone" /></div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-6 pb-6 text-center text-sm text-slate-400 py-8">Không có thông tin người dùng</div>
        )}
      </div>
    </div>
  );
}

function CustomerDetailModal({ customer, onClose }) {
  const user = customer?.user;
  const [tab, setTab] = useState('info');
  const [allVehicles, setAllVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    if (user?._id) {
      setLoadingVehicles(true);
      api(`/vehicles/user/${user._id}`)
        .then(r => r.json())
        .then(res => setAllVehicles(res?.data || []))
        .finally(() => setLoadingVehicles(false));
    }
  }, [user?._id]);

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{user?.name || 'Khách vãng lai'}</p>
                <p className="text-sm text-slate-500">{user?.phone || '—'} {user?.tier && <TierBadge tier={user.tier} />}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Doanh thu</p>
              <p className="text-xl font-bold text-emerald-600">{(customer.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Đã đặt</p>
              <p className="text-xl font-bold text-slate-700">{customer.bookingsCount} lượt</p>
            </div>
          </div>
        </div>

        {user ? (
          <>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mx-6 mb-5">
              {['info', 'benefits', 'vehicles', 'wallet'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {t === 'info' ? 'Thông tin' : t === 'benefits' ? 'Ưu đãi hạng' : t === 'vehicles' ? 'Xe' : 'Ví'}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6 space-y-4">
              {tab === 'info' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tên</p><p className="text-sm font-medium text-slate-800 mt-1">{user.name || '—'}</p></div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email</p><p className="text-sm font-medium text-slate-800 mt-1">{user.email || '—'}</p></div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số điện thoại</p><p className="text-sm font-medium text-slate-800 mt-1">{user.phone || '—'}</p></div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ngày tham gia</p><p className="text-sm font-medium text-slate-800 mt-1">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}</p></div>
                </div>
              )}
              {tab === 'benefits' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hạng thành viên</p><p className="text-sm font-bold text-slate-800 mt-1 capitalize">{user.tier || 'Standard'}</p></div>
                    {user.tier && <TierBadge tier={user.tier} />}
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm tích lũy</p><p className="text-sm font-bold text-slate-800 mt-1">{user.loyaltyPoints || 0}</p></div>
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 font-bold">{user.loyaltyPoints || 0}</div>
                  </div>
                </div>
              )}
              {tab === 'vehicles' && (
                <div className="space-y-2">
                  {loadingVehicles ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                  ) : allVehicles.length === 0 ? (
                    <div className="text-center text-sm text-slate-400 py-6">Không có xe nào</div>
                  ) : (
                    allVehicles.map((v, i) => (
                      <div key={v._id || i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Car size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 uppercase">{v.licensePlate || '—'}</p>
                          <p className="text-xs text-slate-500 capitalize">{v.vehicleType} · {v.brand} {v.model}</p>
                        </div>
                        {v.isDefault && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Mặc định</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'wallet' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số dư ví</p><p className="text-sm font-bold text-slate-800 mt-1">{(user.walletBalance || 0).toLocaleString('vi-VN')}đ</p></div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><CurrencyCircleDollar size={20} weight="duotone" /></div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-6 pb-6 text-center text-sm text-slate-400 py-8">Không có thông tin người dùng</div>
        )}
      </div>
    </div>
  );
}

export default function ManagerRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, month, today
  const [viewMode, setViewMode] = useState('overview'); // overview, customers, vehicles
  const [vehicleDetail, setVehicleDetail] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      let query = '';
      if (filter === 'today') {
        query = `?period=today`;
      } else if (filter === 'month') {
        query = `?period=month`;
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

  const openVehicleDetail = (v) => setVehicleDetail(v);

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
          <button
            onClick={() => setViewMode('vehicles')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'vehicles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Danh sách xe
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
              currentRaw={data.totalRevenue || 0}
              prevRaw={data.previousTotals?.totalRevenue}
              hideTrend={filter === 'all'}
            />
            <StatCard
              icon={<Money size={24} weight="duotone" className="text-green-500" />}
              label="Tiền mặt"
              value={`${(data.cashRevenue || 0).toLocaleString('vi-VN')}đ`}
              color="bg-green-50"
              currentRaw={data.cashRevenue || 0}
              prevRaw={data.previousTotals?.cashRevenue}
              hideTrend={filter === 'all'}
            />
            <StatCard
              icon={<Bank size={24} weight="duotone" className="text-indigo-500" />}
              label="Chuyển khoản"
              value={`${(data.transferRevenue || 0).toLocaleString('vi-VN')}đ`}
              color="bg-indigo-50"
              currentRaw={data.transferRevenue || 0}
              prevRaw={data.previousTotals?.transferRevenue}
              hideTrend={filter === 'all'}
            />
            <StatCard
              icon={<Receipt size={24} weight="duotone" className="text-blue-500" />}
              label="Số lượt thanh toán"
              value={data.totalBookings || 0}
              color="bg-blue-50"
              currentRaw={data.totalBookings || 0}
              prevRaw={data.previousTotals?.totalBookings}
              hideTrend={filter === 'all'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                          <ListTrend currentRaw={c.totalRevenue} prevRaw={getPrev(data.previousByCustomer, c._id)} hideTrend={filter === 'all'} />
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
                          <ListTrend currentRaw={p.totalRevenue} prevRaw={getPrev(data.previousByPackage, p._id)} hideTrend={filter === 'all'} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* By Vehicle */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center gap-2">
                <Car size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Doanh thu theo xe</h2>
              </div>
              <div className="p-0">
                {(!data.byVehicle || data.byVehicle.length === 0) ? (
                  <div className="p-8 text-center text-sm text-slate-400">Không có dữ liệu</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.byVehicle.slice(0, 5).map((v, i) => (
                      <div key={v._id || i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 uppercase">{v.vehicle?.licensePlate || 'Chưa cập nhật'}</p>
                          <p className="truncate text-xs text-slate-500">{v.vehicle?.brand} {v.vehicle?.model}</p>
                          <p className="truncate text-xs text-slate-400">{v.bookingsCount} lượt đặt</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">{(v.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                          <ListTrend currentRaw={v.totalRevenue} prevRaw={getPrev(data.previousByVehicle, v._id)} hideTrend={filter === 'all'} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* By Vehicle Type */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center gap-2">
                <Car size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Doanh thu theo loại xe</h2>
              </div>
              <div className="p-0">
                {(!data.byVehicleType || data.byVehicleType.length === 0) ? (
                  <div className="p-8 text-center text-sm text-slate-400">Không có dữ liệu</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.byVehicleType.map((vt, i) => (
                      <div key={vt._id || i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 capitalize">{vt._id === 'unknown' ? 'Chưa phân loại' : vt._id}</p>
                          <p className="truncate text-xs text-slate-500">{vt.bookingsCount} lượt đặt</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">{(vt.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                          <ListTrend currentRaw={vt.totalRevenue} prevRaw={getPrev(data.previousByVehicleType, vt._id)} hideTrend={filter === 'all'} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : viewMode === 'customers' ? (
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
                  <th className="px-5 py-3 font-semibold text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {(!data?.byCustomer || data.byCustomer.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">Không có dữ liệu</td>
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
                          <ListTrend currentRaw={c.totalRevenue} prevRaw={getPrev(data.previousByCustomer, c._id)} hideTrend={filter === 'all'} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => setCustomerDetail(c)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors">
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'vehicles' ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Full List of Vehicles Tab */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Danh sách xe ({data?.byVehicle?.length || 0})</h2>
            <button onClick={() => setViewMode('overview')} className="text-sm text-blue-600 font-medium hover:underline">
              Quay lại tổng quan
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Xe</th>
                    <th className="px-5 py-3 font-semibold text-center">Số lượt đặt</th>
                    <th className="px-5 py-3 font-semibold text-right">Doanh thu mang lại</th>
                    <th className="px-5 py-3 font-semibold text-center">Chi tiết</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data?.byVehicle || data.byVehicle.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Không có dữ liệu</td>
                  </tr>
                ) : (
                  data.byVehicle.map((v, i) => (
                    <tr key={v._id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-bold text-slate-800 uppercase">{v.vehicle?.licensePlate || 'Chưa cập nhật'}</p>
                          <p className="text-xs text-slate-500 capitalize">{v.vehicle?.vehicleType === 'unknown' ? 'Khác' : v.vehicle?.vehicleType} {v.vehicle?.brand ? `· ${v.vehicle?.brand}` : ''} {v.vehicle?.model ? `· ${v.vehicle?.model}` : ''}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-slate-700">{v.bookingsCount}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-semibold text-emerald-600">{(v.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                        <ListTrend currentRaw={v.totalRevenue} prevRaw={getPrev(data.previousByVehicle, v._id)} hideTrend={filter === 'all'} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => openVehicleDetail(v)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors">
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null) : (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <CalendarBlank size={48} weight="thin" className="mb-2" />
          <p>Không thể tải dữ liệu báo cáo</p>
        </div>
      )}
      {vehicleDetail && <VehicleDetailModal vehicle={vehicleDetail} onClose={() => setVehicleDetail(null)} filter={filter} />}
      {customerDetail && <CustomerDetailModal customer={customerDetail} onClose={() => setCustomerDetail(null)} />}
    </div>
  );
}
