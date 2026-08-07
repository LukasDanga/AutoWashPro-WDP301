import { useCallback, useEffect, useState } from 'react';
import { Gift, Coins, Star, Ticket, Tag, CheckCircle, CaretRight, ArrowUp, ArrowDown, Eye, Lightbulb, Medal, Info, Warning } from '@phosphor-icons/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TierBadge from '@/components/ui/TierBadge';
import CustomerPagination from '@/components/ui/CustomerPagination';
import { confirmDialog } from '@/lib/confirm';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import useSSE from '@/hooks/useSSE';

const apiBase = getApiBaseUrl();


function api(path, opts = {}) {
  return fetch(`${apiBase}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
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
  if (!items || items.length === 0) return <div className="text-center py-12 text-slate-400 text-sm">{emptyMsg || 'Chưa có dữ liệu'}</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
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
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer">
                      <Eye size={14} /> Xem
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <CustomerPagination pagination={pagination} page={page} setPage={setPage} itemName="giao dịch" />
    </div>
  );
}

export default function CustomerRewardsPage({ user, refreshUser }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'reward');
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ totalEarned: 0, totalRedeemed: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [myRewardsPagination, setMyRewardsPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });

  const [vouchers, setVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [myRewards, setMyRewards] = useState([]);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [tierConfig, setTierConfig] = useState(null);
  const [tierList, setTierList] = useState([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);

  const FALLBACK_TIER_MAP = {
    diamond: { label: 'Kim cương', color: '#0891b2', minPoints: 1000000 },
    gold: { label: 'Vàng', color: '#b45309', minPoints: 500000 },
    silver: { label: 'Bạc', color: '#64748b', minPoints: 100000 },
    bronze: { label: 'Đồng', color: '#b45309', minPoints: 0 },
  };

  useEffect(() => {
    api('/loyalty/tiers').then(r => r.json()).then(payload => {
      if (Array.isArray(payload?.data)) {
        setTierList(payload.data);
        const map = {};
        payload.data.forEach(t => {
          map[t.id] = { label: t.name, color: t.color || '#b45309', minPoints: t.minPoints, ...t };
        });
        setTierConfig(map);
      }
    }).catch(() => {});

    api('/loyalty/config').then(r => r.json()).then(payload => {
      if (payload?.data) setLoyaltyConfig(payload.data);
    }).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async (targetPage = page, targetTab = activeTab) => {
    setLoading(true);
    try {
      const typeQuery = targetTab === 'lifetime' ? '&type=lifetime' : '';
      const res = await api(`/loyalty/my-history?page=${targetPage}&limit=10${typeQuery}`);
      const data = await res.json();
      if (data?.data) {
        setHistory(data.data);
      }
      if (data?.pagination) {
        setPagination(data.pagination);
      }
      const summaryData = data?.pagination?.summary || data?.meta?.summary;
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (e) { } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  const fetchVouchers = useCallback(async (targetPage = page) => {
    try {
      const resTpl = await api('/vouchers/available');
      const dataTpl = await resTpl.json();
      const tplPayload = dataTpl.data || [];
      const tplArray = Array.isArray(tplPayload) ? tplPayload : (tplPayload.redeemable || []);
      setVouchers(tplArray.filter(v => v.isTemplate && v.requiredPoints > 0));
    } catch (e) { }

    try {
      const resMy = await api('/vouchers/me');
      const dataMy = await resMy.json();
      setMyVouchers(dataMy.data || []);
    } catch (e) { }

    try {
      const resRewards = await api(`/rewards/me?page=${targetPage}&limit=10`);
      const dataRewards = await resRewards.json();
      setMyRewards(dataRewards.data || []);
      if (dataRewards.pagination) {
        setMyRewardsPagination(dataRewards.pagination);
      }
    } catch (e) { }
  }, [page]);

  useEffect(() => {
    if (refreshUser) refreshUser();
    if (activeTab === 'reward' || activeTab === 'lifetime') {
      fetchHistory(page, activeTab);
    } else {
      fetchVouchers(page);
    }
  }, [fetchHistory, fetchVouchers, page, activeTab]);

  const sseToken = getStoredToken();
  useSSE(sseToken, 'my_rewards_updated', () => {
    fetchVouchers(page);
    fetchHistory(page, activeTab);
    if (refreshUser) refreshUser();
  });
  useSSE(sseToken, 'rewards_updated', () => {
    fetchVouchers(page);
  });

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
    setSearchParams({ tab: newTab }, { replace: true });
  };

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
      fetchVouchers(page);
      if (refreshUser) refreshUser();
      fetchHistory(page, activeTab);
    } catch (err) { } finally { setRedeemLoading(false); }
  };

  // Dynamic next tier calculation sorted by minPoints from API
  const sortedTiers = tierList.length > 0 ? [...tierList].sort((a, b) => (a.minPoints || 0) - (b.minPoints || 0)) : [];
  const currentTierId = (user?.tier || 'bronze').toLowerCase();
  const currentTierIndex = sortedTiers.findIndex(t => (t.id || '').toLowerCase() === currentTierId);
  const currentTierObj = currentTierIndex >= 0 ? sortedTiers[currentTierIndex] : null;
  const nextTierObj = (currentTierIndex >= 0 && currentTierIndex < sortedTiers.length - 1) ? sortedTiers[currentTierIndex + 1] : null;

  const currentMin = currentTierObj?.minPoints || 0;
  const nextMin = nextTierObj?.minPoints || currentMin;
  const progress = nextTierObj
    ? Math.min(100, Math.max(0, (((user?.lifetimePoints || 0) - currentMin) / (nextMin - currentMin)) * 100))
    : 100;

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
            <span>Hạng hiện tại: {currentTierObj?.name || user?.tier || 'Bronze'}</span>
            {nextTierObj && <span>{formatCurrency((nextTierObj.minPoints || 0) - (user?.lifetimePoints || 0))} điểm để lên {nextTierObj.name || nextTierObj.id}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {['reward', 'lifetime', 'exchange', 'rules', 'my-vouchers'].map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === tab
              ? (tab === 'lifetime' ? 'border-blue-600 text-blue-600' : 'border-emerald-600 text-emerald-600 font-bold')
              : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab === 'reward' ? 'Điểm thưởng' : tab === 'lifetime' ? 'Điểm tích lũy' : tab === 'exchange' ? 'Đổi điểm lấy quà' : tab === 'rules' ? 'Cách tính điểm' : 'Quà tặng của tôi'}
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
              <p className="text-lg font-extrabold text-amber-700">{summary.totalRedeemed > 0 ? '-' : ''}{formatCurrency(summary.totalRedeemed)}</p>
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
          <PointHistoryTable items={history} loading={loading} page={page} pagination={pagination} setPage={setPage} navigate={navigate} emptyMsg="Chưa có lịch sử điểm tích lũy" activeTab={activeTab} />
        </div>
      )}

      {/* Tab: Cách tính điểm */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-6">
            <h3 className="text-base font-extrabold text-slate-800 mb-1 flex items-center gap-2">
              <Lightbulb weight="fill" className="text-emerald-600" /> Cách tính điểm thưởng
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Mỗi khi đơn hàng được thanh toán thành công, bạn sẽ được cộng điểm thưởng theo công thức:
            </p>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 font-mono text-sm text-slate-700 text-center">
              Điểm = (Giá trị đơn hàng đã thanh toán ×{' '}
              <span className="font-bold text-emerald-600">Tỷ lệ cơ bản {loyaltyConfig?.baseEarningRate ?? 5}%</span>) ×{' '}
              <span className="font-bold text-emerald-600">Hệ số hạng</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Medal weight="fill" className="text-amber-500" /> Hạng thành viên & Hệ số nhân điểm
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Tích đủ điểm (điểm tích lũy trọn đời) sẽ được thăng hạng và hệ số nhân tăng theo hạng</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Hạng</th>
                    <th className="px-6 py-3 text-left">Điểm tích lũy tối thiểu</th>
                    <th className="px-6 py-3 text-left">Hệ số nhân</th>
                    <th className="px-6 py-3 text-left">Quyền lợi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTiers.map(t => (
                    <tr key={t.id} className={currentTierId === String(t.id || '').toLowerCase() ? 'bg-emerald-50/50' : ''}>
                      <td className="px-6 py-3 font-bold text-slate-800">
                        <span className="flex items-center gap-2">
                          <TierBadge tier={t.id} />
                          {t.name}
                          {currentTierId === String(t.id || '').toLowerCase() && (
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide bg-emerald-100 rounded-full px-2 py-0.5">Hạng hiện tại</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{formatCurrency(t.minPoints || 0)} điểm</td>
                      <td className="px-6 py-3 font-extrabold text-emerald-600 whitespace-nowrap">x{Number(t.multiplier ?? 1).toLocaleString('vi-VN')}</td>
                      <td className="px-6 py-3 text-xs text-slate-500">
                        <ul className="space-y-0.5 list-disc list-inside">
                          {(t.benefits || []).map((b, bi) => <li key={bi}>{b}</li>)}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <Info weight="fill" className="text-blue-500" /> Quy định điểm thưởng
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} /> Điểm được cộng khi đơn hàng thanh toán thành công và bị trừ khi hủy đơn / hoàn tiền.</li>
              <li className="flex items-start gap-2"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} /> Điểm thưởng có hiệu lực trong {loyaltyConfig?.pointExpirationMonths ?? 6} tháng kể từ lần tích điểm gần nhất.</li>
              <li className="flex items-start gap-2"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} /> Điểm dùng để đổi voucher tại mục "Đổi điểm lấy quà".</li>
              <li className="flex items-start gap-2"><Warning className="text-amber-500 shrink-0 mt-0.5" size={16} /> Chỉ tính trên phần tiền đã thanh toán, không tính trên phần được giảm giá / voucher.</li>
            </ul>
          </div>
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
        <div className="space-y-8">
          {myRewards.length > 0 && (
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                <Gift weight="fill" className="text-amber-500" /> Phần thưởng đã đổi ({myRewards.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRewards.map(rd => {
                  const snap = rd.rewardSnapshot || {};
                  const cancelled = rd.status === 'cancelled';
                  const received = rd.status === 'received';
                  const sent = rd.status === 'sent';
                  return (
                    <div key={rd._id} className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        {snap.imageUrl ? (
                          <img src={snap.imageUrl} alt={snap.name} className="w-14 h-14 rounded-lg object-cover border border-slate-100" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-amber-50 flex items-center justify-center text-2xl shrink-0">🎁</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm line-clamp-2">{snap.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Đổi ngày {formatDate(rd.createdAt)}</p>
                          {received && (rd.receivedAt || rd.updatedAt) && (
                            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">✓ Ngày nhận quà: {new Date(rd.receivedAt || rd.updatedAt).toLocaleString('vi-VN')}</p>
                          )}
                        </div>
                      </div>
                      <div className={`rounded-lg px-3 py-2 border flex items-center justify-between mb-3 ${cancelled ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-100'}`}>
                        <span className="text-xs font-semibold text-slate-500">Mã đổi thưởng</span>
                        <span className={`font-mono font-extrabold tracking-wider ${cancelled ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>{rd.code}</span>
                      </div>

                      {cancelled && (
                        <div className="mb-3 bg-red-50 p-2.5 rounded-lg border border-red-100 text-xs text-red-700">
                          <span className="font-bold">Lý do hủy: </span>
                          <span>{rd.cancelReason || 'Quản lý hoặc hệ thống đã hủy đơn đổi quà này.'}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                        <span className="flex items-center gap-1"><Coins weight="fill" size={12} /> {formatCurrency(rd.pointsSpent)} điểm</span>
                        {cancelled
                          ? <span className="text-rose-500 font-bold">Đã hủy</span>
                          : received
                            ? <span className="text-emerald-600 font-bold">Đã nhận quà</span>
                            : sent
                              ? <span className="text-blue-600 font-bold">Đã gửi · Chờ nhận</span>
                              : <span className="text-amber-600 font-bold">Chờ nhận quà</span>}
                      </div>
                      {!cancelled && !received && (
                      <button onClick={() => { navigator.clipboard.writeText(rd.code); showToast('Đã copy mã đổi thưởng!', 'success'); }}
                        className="w-full py-2.5 rounded-lg text-sm font-bold border bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 transition-all">
                        Copy mã đổi thưởng
                      </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <CustomerPagination pagination={myRewardsPagination} page={page} setPage={setPage} itemName="phần thưởng" />
            </div>
          )}

          <div>
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <Ticket weight="fill" className="text-emerald-500" /> Voucher của tôi ({myVouchers.length})
            </h3>
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
          </div>
        </div>
      )}
    </div>
  );
}
