import { useCallback, useEffect, useState } from 'react';
import { Gift, Coins, Star, Ticket, Tag, CheckCircle, CaretRight, ArrowUp, ArrowDown, Eye } from '@phosphor-icons/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TierBadge from '@/components/ui/TierBadge';
import { confirmDialog } from '@/lib/confirm';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

const apiBase = getApiBaseUrl();
const token = getStoredToken();

function api(path, opts = {}) {
  return fetch(`${apiBase}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}
async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; } catch { return `Lỗi ${res.status}`; }
}

function formatCurrency(val) {
  if (!val && val !== 0) return '0';
  return Number(val).toLocaleString('vi-VN');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function getTypeBadge(type) {
  switch (type) {
    case 'earned': return { label: 'Tích điểm', color: 'bg-emerald-100 text-emerald-700' };
    case 'redeemed': return { label: 'Đổi quà', color: 'bg-amber-100 text-amber-700' };
    case 'expired': return { label: 'Hết hạn', color: 'bg-rose-100 text-rose-700' };
    case 'adjustment': return { label: 'Điều chỉnh', color: 'bg-purple-100 text-purple-700' };
    default: return { label: type, color: 'bg-slate-100 text-slate-700' };
  }
}

function PointHistoryTable({ items, loading, page, pagination, setPage, navigate, emptyMsg, activeTab }) {
  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Đang tải...</div>;
  if (items.length === 0) return <div className="text-center py-12 text-slate-400 text-sm">{emptyMsg || 'Chưa có dữ liệu'}</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Loại</th>
              <th className="px-4 py-3 text-left">Mô tả</th>
              <th className="px-4 py-3 text-right">Điểm</th>
              <th className="px-4 py-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => {
              const badge = getTypeBadge(item.type);
              const isPositive = item.type === 'earned' || (item.type === 'adjustment' && item.points > 0);
              return (
                <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.color}`}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{item.description}</td>
                  <td className={`px-4 py-3 text-right text-sm font-extrabold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span className="flex items-center justify-end gap-1">
                      {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      {isPositive ? '+' : ''}{Math.abs(item.points)?.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/rewards/history/${item._id}?tab=${activeTab}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                      <Eye size={14} /> Xem
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Trước</button>
          <span className="text-xs text-slate-500">Trang {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Sau</button>
        </div>
      )}
    </div>
  );
}

export default function CustomerRewards({ user, refreshUser }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'reward');
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ totalEarned: 0, totalRedeemed: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [vouchers, setVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [tierConfig, setTierConfig] = useState(null);

  const FALLBACK_TIER_MAP = {
    diamond: { label: 'Kim cương', color: '#0891b2', minPoints: 1000000 },
    gold: { label: 'Vàng', color: '#b45309', minPoints: 500000 },
    silver: { label: 'Bạc', color: '#64748b', minPoints: 100000 },
    bronze: { label: 'Đồng', color: '#b45309', minPoints: 0 },
  };

  useEffect(() => {
    api('/loyalty/tiers').then(r => r.json()).then(payload => {
      if (payload?.data) {
        const map = {};
        payload.data.forEach(t => {
          let hex = '#b45309';
          if (t.id === 'diamond') hex = '#0891b2';
          else if (t.id === 'silver') hex = '#64748b';
          else if (t.id === 'gold') hex = '#b45309';
          map[t.id] = { label: t.name, color: hex, minPoints: t.minPoints };
        });
        setTierConfig(map);
      }
    }).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/loyalty/my-history?page=${page}&limit=10`);
      if (!res.ok) throw new Error(await readErr(res));
      const json = await res.json();
      const list = json?.data ?? [];
      setHistory(Array.isArray(list) ? list : []);
      if (json?.pagination) {
        setPagination(json.pagination);
        if (json.pagination.summary) setSummary(json.pagination.summary);
      }
    } catch { } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const fetchVouchers = async () => {
    try {
      const resTpl = await api('/vouchers/available');
      const dataTpl = await resTpl.json();
      const allVouchers = dataTpl.data || [];
      setVouchers(allVouchers.filter(v => v.isTemplate && v.requiredPoints > 0));
      const resMy = await api('/vouchers/me');
      const dataMy = await resMy.json();
      setMyVouchers(dataMy.data || []);
    } catch { }
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleRedeem = async (templateId) => {
    if (!(await confirmDialog({ title: 'Đổi điểm lấy voucher', message: 'Bạn có chắc chắn muốn đổi điểm lấy voucher này?', confirmLabel: 'Đổi điểm' }))) return;
    setRedeemLoading(true);
    try {
      const res = await api('/vouchers/redeem-points', {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Lỗi đổi điểm');
      fetchVouchers();
      if (refreshUser) refreshUser();
      fetchHistory();
    } catch (err) { } finally { setRedeemLoading(false); }
  };

  const actualTierMap = tierConfig || FALLBACK_TIER_MAP;
  const nextTierId = user?.tier === 'bronze' ? 'silver' : user?.tier === 'silver' ? 'gold' : user?.tier === 'gold' ? 'diamond' : null;
  const nextTier = nextTierId ? actualTierMap[nextTierId] : { label: 'Tối đa', minPoints: 1000000 };
  const progress = user?.tier === 'diamond' ? 100 : Math.min(100, ((user?.lifetimePoints || 0) / nextTier.minPoints) * 100);

  const lifetimeHistory = history.filter(item => item.type === 'earned' || item.type === 'adjustment');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tier Card */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TierBadge tier={user?.tier} />
            <div>
              <p className="text-xs text-slate-500 font-medium">Điểm thưởng khả dụng</p>
              <p className="text-3xl font-black text-slate-800">{formatCurrency(user?.loyaltyPoints || 0)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Điểm tích lũy</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(user?.lifetimePoints || 0)}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[11px] text-slate-500">
            <span>Hạng hiện tại: {user?.tier || 'Bronze'}</span>
            {nextTierId && <span>{formatCurrency(nextTier.minPoints - (user?.lifetimePoints || 0))} điểm để lên {nextTier.label}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {['reward', 'lifetime', 'exchange', 'my-vouchers'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSearchParams({ tab }, { replace: true }); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
              ? (tab === 'lifetime' ? 'border-blue-600 text-blue-600' : 'border-emerald-600 text-emerald-600')
              : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab === 'reward' ? 'Điểm thưởng' : tab === 'lifetime' ? 'Điểm tích lũy' : tab === 'exchange' ? 'Đổi điểm lấy quà' : 'Quà tặng của tôi'}
          </button>
        ))}
      </div>

      {/* Tab: Điểm thưởng */}
      {activeTab === 'reward' && (
        <div>
          <div className="flex gap-4 mb-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex-1">
              <p className="text-xs text-slate-500">Tổng tích lũy</p>
              <p className="text-lg font-extrabold text-emerald-700">+{formatCurrency(summary.totalEarned)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex-1">
              <p className="text-xs text-slate-500">Tổng đã đổi</p>
              <p className="text-lg font-extrabold text-amber-700">-{formatCurrency(summary.totalRedeemed)}</p>
            </div>
          </div>
          <PointHistoryTable items={history} loading={loading} page={page} pagination={pagination} setPage={setPage} navigate={navigate} emptyMsg="Chưa có lịch sử điểm thưởng" activeTab={activeTab} />
        </div>
      )}

      {/* Tab: Điểm tích lũy */}
      {activeTab === 'lifetime' && (
        <div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-4">
            <p className="text-xs text-slate-500">Tổng điểm tích lũy (chỉ bị trừ khi hủy đơn/hoàn tiền)</p>
            <p className="text-lg font-extrabold text-blue-700">{formatCurrency(user?.lifetimePoints || 0)}</p>
          </div>
          <PointHistoryTable items={lifetimeHistory} loading={loading} page={page} pagination={pagination} setPage={setPage} navigate={navigate} emptyMsg="Chưa có lịch sử điểm tích lũy" activeTab={activeTab} />
        </div>
      )}

      {/* Tab: Đổi điểm lấy quà */}
      {activeTab === 'exchange' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">Chưa có voucher nào khả dụng để đổi điểm.</div>
          ) : (
            vouchers.map(v => (
              <div key={v._id} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{v.name}</p>
                    <p className="text-[11px] font-mono text-emerald-600 mt-0.5">{v.code}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <Coins weight="fill" size={14} /> {formatCurrency(v.requiredPoints)}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{v.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-4">
                  {v.applicableTiers?.length > 0 && <span className="flex items-center gap-1"><Star size={12} /> {v.applicableTiers.join(', ')}</span>}
                  <span className="flex items-center gap-1"><Ticket size={12} /> Còn: {v.remaining}</span>
                </div>
                <button onClick={() => handleRedeem(v._id)}
                  disabled={redeemLoading || (user?.loyaltyPoints || 0) < v.requiredPoints || v.remaining <= 0}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                    (user?.loyaltyPoints || 0) < v.requiredPoints
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}>
                  {(user?.loyaltyPoints || 0) < v.requiredPoints ? 'Không đủ điểm' : redeemLoading ? 'Đang xử lý...' : 'Đổi ngay'} <CaretRight weight="bold" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Quà tặng của tôi */}
      {activeTab === 'my-vouchers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myVouchers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">Bạn chưa có voucher nào.</div>
          ) : (
            myVouchers.map(uv => {
              const v = uv.voucherId;
              if (!v) return null;
              return (
                <div key={uv._id} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{v.name}</p>
                      <p className="text-sm font-mono text-emerald-600 mt-0.5">{v.code}</p>
                    </div>
                    <CheckCircle weight="fill" size={22} className="text-emerald-500" />
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{v.description}</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-4">
                    <Tag size={12} /> HSD: {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : '-'}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(v.code); }}
                    className="w-full py-2.5 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all">
                    Copy mã khuyến mãi
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
