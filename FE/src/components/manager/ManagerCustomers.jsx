import { useState, useEffect } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Users, MagnifyingGlass, UserCircle } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

export default function ManagerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      setError('');
      const apiBase = getApiBaseUrl();
      const token = getStoredToken();
      
      const res = await fetch(`${apiBase}/bookings/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải danh sách khách hàng');
      
      const data = await res.json();
      setCustomers(data?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter(c => {
    if (tierFilter && c.user?.tier !== tierFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = c.user?.name?.toLowerCase() || '';
    const phone = c.user?.phone?.toLowerCase() || '';
    const email = c.user?.email?.toLowerCase() || '';
    return name.includes(q) || phone.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative max-w-md w-full sm:w-80">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border border-border bg-background py-2 px-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="">Tất cả hạng</option>
            <option value="bronze">Hạng Bronze</option>
            <option value="silver">Hạng Silver</option>
            <option value="gold">Hạng Gold</option>
            <option value="diamond">Hạng Diamond</option>
          </select>
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Tổng cộng: {filtered.length} khách hàng
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        </div>
      ) : (
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Không tìm thấy khách hàng nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {c.user?.avatar ? (
                            <img src={c.user.avatar} className="h-10 w-10 rounded-full object-cover border border-border" />
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
                            {c.vehicles.map(v => (
                              <span key={v._id} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {v.licensePlate}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-blue-600">
                        {c.totalBookings}
                      </td>
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
      )}
    </div>
  );
}
