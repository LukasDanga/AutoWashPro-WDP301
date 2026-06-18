import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Users, MagnifyingGlass, UserCircle, ArrowClockwise } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

function api(path) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
}

const PAGE_SIZE = 20;

export default function ManagerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const debounce = useRef(null);

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
            <option value="bronze">Hạng Bronze</option>
            <option value="silver">Hạng Silver</option>
            <option value="gold">Hạng Gold</option>
            <option value="diamond">Hạng Diamond</option>
          </select>
          <button onClick={() => fetchCustomers(search, tierFilter, page)} disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors">
            <ArrowClockwise size={15} className={loading ? 'animate-spin' : ''} />
          </button>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Users size={36} weight="thin" className="mx-auto mb-2 text-slate-300" />
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c, i) => (
                      <tr key={c._id || i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {c.user?.avatar ? (
                              <img src={c.user.avatar} className="h-10 w-10 rounded-full object-cover border border-border" alt="" />
                            ) : (
                              <UserCircle size={40} className="text-slate-300" weight="fill" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{c.user?.name || 'Khách vãng lai'}</span>
                                {c.user?.tier && <TierBadge tier={c.user.tier} />}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">{c.user?.role || 'customer'}</div>
                            </div>
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
                        <td className="px-6 py-4 text-center font-bold text-blue-600">{c.totalBookings}</td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.totalSpent || 0)}
                        </td>
                        <td className="px-6 py-4 text-right text-muted-foreground">
                          {c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Trang {page}/{totalPages} · {total} khách hàng</p>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
