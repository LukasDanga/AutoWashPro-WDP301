import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Users, MagnifyingGlass, ArrowClockwise, Car, CurrencyCircleDollar, XCircle } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

function api(path) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
}

const PAGE_SIZE = 15;

export default function ManagerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [customerDetail, setCustomerDetail] = useState(null);
  const [tierList, setTierList] = useState([]);
  const debounce = useRef(null);

  useEffect(() => {
    api('/loyalty/tiers').then(r => r.json()).then(p => {
      if (Array.isArray(p?.data)) setTierList(p.data);
    }).catch(() => {});
  }, []);

  const fetchCustomers = useCallback(async (q = search, tier = tierFilter, pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (q.trim()) params.set('search', q.trim());
      if (tier)     params.set('tier', tier);
      const res = await api(`/bookings/customers?${params}`);
      if (!res.ok) throw new Error('Không thể tải danh sách khách hàng');
      const p = await res.json();
      const data = p?.data ?? p;
      setCustomers(data?.customers ?? (Array.isArray(data) ? data : []));
      setTotal(data?.total ?? 0);
      setPage(data?.page ?? pg);
      setTotalPages(data?.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchCustomers(); }, []); // eslint-disable-line

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); fetchCustomers(v, tierFilter, 1); }, 380);
  };

  const handleTier = (v) => { setTierFilter(v); setPage(1); fetchCustomers(search, v, 1); };
  const handlePage = (pg) => { setPage(pg); fetchCustomers(search, tierFilter, pg); };
  const handleClearFilters = () => { setSearch(''); setTierFilter(''); setPage(1); fetchCustomers('', '', 1); };

  const [viewedCustomers, setViewedCustomers] = useState(() => {
    return JSON.parse(localStorage.getItem('viewed_manager_customers') || '[]');
  });

  const handleViewDetail = (c) => {
    const custId = c._id || c.user?._id;
    if (custId && !viewedCustomers.includes(custId)) {
      const next = [...viewedCustomers, custId];
      setViewedCustomers(next);
      localStorage.setItem('viewed_manager_customers', JSON.stringify(next));
      window.dispatchEvent(new Event('manager-customer-viewed'));
    }
    setCustomerDetail(c);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative max-w-md w-full sm:w-80">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border border-border bg-background py-2 px-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
            value={tierFilter}
            onChange={(e) => handleTier(e.target.value)}
          >
            <option value="">Tất cả hạng</option>
            {tierList.map(t => (
              <option key={t.id} value={t.id}>Hạng {t.name}</option>
            ))}
          </select>
          <button onClick={() => fetchCustomers(search, tierFilter, page)} disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors">
            <ArrowClockwise size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {(search || tierFilter) && (
            <button onClick={handleClearFilters}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
              <XCircle size={15} /> Xóa bộ lọc
            </button>
          )}
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {total > 0 ? `${total} khách hàng` : ''}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Khách hàng</th>
                    <th className="px-6 py-4 font-semibold">Liên hệ</th>
                    <th className="px-6 py-4 font-semibold">Phương tiện</th>
                    <th className="px-6 py-4 font-semibold text-center">Số lần đặt</th>
                    <th className="px-6 py-4 font-semibold text-right">Tổng chi tiêu</th>
                    <th className="px-6 py-4 font-semibold text-right">Ngày đặt gần nhất</th>
                    <th className="px-6 py-4 font-semibold text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Users size={36} weight="thin" className="mx-auto mb-2 text-slate-300" />
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c, i) => {
                      const custId = c._id || c.user?._id;
                      const dateToCheck = c.lastBookingDate || c.user?.createdAt;
                      const isToday = dateToCheck && new Date(dateToCheck).toDateString() === new Date().toDateString();
                      const isFirstTime = (c.totalBookings <= 1 || !c.totalBookings);
                      const isNew = isFirstTime && isToday && !viewedCustomers.includes(custId);
                      return (
                        <tr key={c._id || i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{c.user?.name || 'Khách vãng lai'}</span>
                              {c.user?.tier && <TierBadge tier={c.user.tier} />}
                              {isNew && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-xs">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-700">{c.user?.phone || '—'}</div>
                            <div className="text-xs text-muted-foreground">{c.user?.email || '—'}</div>
                          </td>
                          <td className="px-6 py-4">
                            {c.vehicles && c.vehicles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {c.vehicles.map((v) => (
                                  <span key={v._id} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    {v.licensePlate}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-blue-600">{c.totalBookings || 0}</td>
                          <td className="px-6 py-4 text-right font-medium text-emerald-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.totalSpent || 0)}
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground">
                            {c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => handleViewDetail(c)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer">
                              Xem chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => handlePage(page - 1)} disabled={page <= 1 || loading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  ← Trước
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <button key={pg} onClick={() => handlePage(pg)} disabled={loading}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        pg === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages || loading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  Sau →
                </button>
              </div>
              <p className="text-xs text-slate-400">Trang {page}/{totalPages} · {total} khách hàng</p>
            </div>
          )}
        </>
      )}

      {customerDetail && <CustomerDetailModal customer={customerDetail} onClose={() => setCustomerDetail(null)} />}
    </div>
  );
}

function CustomerDetailModal({ customer, onClose }) {
  const user = customer?.user;
  const [tab, setTab] = useState('info');

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
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tổng chi tiêu</p>
              <p className="text-xl font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.totalSpent || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Đã đặt</p>
              <p className="text-xl font-bold text-slate-700">{customer.totalBookings} lượt</p>
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
                  {customer.vehicles && customer.vehicles.length > 0 ? (
                    customer.vehicles.map((v, i) => (
                      <div key={v._id || i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Car size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 uppercase">{v.licensePlate || '—'}</p>
                          <p className="text-xs text-slate-500 capitalize">{v.vehicleType} · {v.brand} {v.model}</p>
                        </div>
                        {v.isDefault && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Mặc định</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-slate-400 py-6">Không có xe nào</div>
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
