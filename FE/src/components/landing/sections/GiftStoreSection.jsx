import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';
import CustomLuckyWheel from '../widgets/CustomLuckyWheel.jsx';
import { storageKeys } from '../../../lib/authStorage.js';
import { showToast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import { Trophy, CheckCircle, Warning, ClockCounterClockwise } from '@phosphor-icons/react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatPrice(v) {
  return v ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '0đ';
}

function formatDate(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TIER_LABELS = { bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng', diamond: 'Kim Cương' };
const TIER_RANK = { bronze: 0, silver: 1, gold: 2, diamond: 3 };
const TIER_BADGE_CLS = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-slate-200 text-slate-700',
  gold: 'bg-yellow-200 text-yellow-900',
  diamond: 'bg-cyan-100 text-cyan-800',
};

function VoucherCard({ voucher, index, onRedeem, redeeming }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (voucher.code) {
      navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPercent = voucher.type === 'percentage';
  const discountText = voucher.type === 'none' ? voucher.name : (isPercent ? `GIẢM ${voucher.value}%` : `GIẢM ${formatPrice(voucher.value)}`);
  const isRedeem = voucher.isTemplate;
  const isPersonal = voucher.assignedTo != null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group relative bg-white rounded-2xl flex flex-col overflow-hidden border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300"
    >
      <div className="absolute left-0 top-[60%] w-4 h-4 -ml-2 rounded-full bg-[#fcfdfd] border-r border-slate-200 z-10 hidden sm:block"></div>
      <div className="absolute right-0 top-[60%] w-4 h-4 -mr-2 rounded-full bg-[#fcfdfd] border-l border-slate-200 z-10 hidden sm:block"></div>

      <div className="p-6 md:p-8 flex-1 border-b-2 border-dashed border-slate-100 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
            isPersonal ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {isPersonal ? 'Của Riêng Bạn' : (isRedeem ? 'Đổi Điểm' : 'Ưu Đãi')}
          </div>
          {voucher.remaining > 0 && !isPersonal && (
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Còn {voucher.remaining} lượt
            </div>
          )}
        </div>
        
        <h3 className="text-3xl font-black text-slate-800 mb-2 leading-tight group-hover:text-emerald-600 transition-colors">
          {discountText}
        </h3>
        
        <p className="text-sm font-bold text-slate-700 mb-2">
          {voucher.name}
        </p>
        
        <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">
          {voucher.description}
        </p>
        
        <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
          HSD: {formatDate(voucher.endDate)}
        </div>
      </div>

      <div className="bg-slate-50/50 p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
        {isRedeem ? (
          <div className="w-full flex items-center justify-between">
            <div className="font-bold text-amber-500 flex items-center gap-2">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               {voucher.requiredPoints} Điểm
            </div>
            <button
              onClick={() => onRedeem(voucher)}
              disabled={redeeming}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {redeeming ? 'Đang xử lý...' : 'Đổi ngay'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 w-full relative">
              <input 
                type="text" 
                readOnly 
                value={voucher.code} 
                className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-mono font-bold text-sm uppercase tracking-wider focus:outline-none"
              />
            </div>
            <button 
              onClick={handleCopy}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                copied 
                  ? 'bg-slate-800 text-white shadow-slate-800/20' 
                  : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5'
              }`}
            >
              {copied ? 'Đã copy ✔' : 'Copy mã'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function RewardCard({ reward, index, onRedeem, redeeming, points, userTier }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const enough = (points || 0) >= (reward.pointCost || 0);
  const soldOut = (reward.stock || 0) <= 0;
  const reqTier = reward.requiredTier || 'bronze';
  const userRank = TIER_RANK[userTier] ?? 0;
  const reqRank = TIER_RANK[reqTier] ?? 0;
  const tierOk = userRank >= reqRank;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {reward.imageUrl ? (
          <img src={reward.imageUrl} alt={reward.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-wider">Hết hàng</span>
          </div>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-sm">
          ⭐ {reward.pointCost} Điểm
        </div>
        <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black shadow-sm border ${TIER_BADGE_CLS[reqTier] || TIER_BADGE_CLS.bronze}`}>
          {reqTier === 'bronze' ? 'Mọi hạng' : `Hạng ${TIER_LABELS[reqTier]}`}
        </div>
      </div>
      <div className="p-5">
        <h4 className="text-base font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">{reward.name}</h4>
        <p className="text-sm text-slate-500 leading-relaxed mb-3 line-clamp-2">{reward.description}</p>
        <div className="text-xs text-slate-400 font-medium mb-4">Còn {reward.stock} phần quà</div>
        <button
          onClick={() => onRedeem(reward)}
          disabled={redeeming || soldOut || !enough || !tierOk}
          className={`w-full px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            soldOut || !enough || !tierOk
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed'
          }`}
        >
          {soldOut ? 'Hết hàng' : !tierOk ? `Cần hạng ${TIER_LABELS[reqTier]} trở lên` : !enough ? `Cần thêm ${(reward.pointCost || 0) - (points || 0)} điểm` : redeeming ? 'Đang xử lý...' : 'Đổi ngay'}
        </button>
      </div>
    </motion.div>
  );
}

export default function GiftStoreSection({ user, onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('redeem'); // 'redeem' | 'wheel'
  const [vouchers, setVouchers] = useState([]);
  const [wheelSectors, setWheelSectors] = useState([]);
  const [spinCount, setSpinCount] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [spinHistory, setSpinHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [rewardLoading, setRewardLoading] = useState(false);

  const wheelRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const fetchSpinHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const res = await fetch(`${API_BASE}/gifts/my-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setSpinHistory(Array.isArray(payload?.data) ? payload.data : []);
      }
    } catch (e) {
      console.error('Lỗi lấy lịch sử quay quà:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    async function loadWheel() {
      try {
        const resGifts = await fetch(`${API_BASE}/gifts/public`);
        if (resGifts.ok) {
          const payload = await resGifts.json();
          const items = payload?.data || [];
          const PALETTE = ['#10b981', '#06b6d4', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
          if (items.length > 0) {
            setWheelSectors(items.map((it, idx) => ({
              id: it._id,
              label: it.name,
              probability: it.probability,
              color: it.color || PALETTE[idx % PALETTE.length]
            })));
          } else {
             setWheelSectors([{ id: '1', label: 'Rỗng', color: '#94a3b8' }]);
          }
        }
      } catch(e) {}
    }
    loadWheel();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'wheel') {
      fetchSpinHistory();
    }
  }, [user, activeTab, fetchSpinHistory]);

  const loadVouchers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const resProfile = await fetch(`${API_BASE}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (resProfile.ok) {
         const prof = await resProfile.json();
         if (prof.data) {
           setSpinCount(prof.data.spinCount || 0);
           setUserPoints(prof.data.loyaltyPoints || 0);
         }
      }

      const resV = await fetch(`${API_BASE}/vouchers/available?type=${filterType}&page=${page}&limit=6`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resV.ok) {
         const payload = await resV.json();
         const { data, pagination, user: uData } = payload?.data || {};
         
         if (data) {
           setVouchers(data);
         }
         if (pagination) {
           setTotalPages(pagination.totalPages || 1);
         }
         if (uData) {
           setUserPoints(uData.loyaltyPoints || 0);
         }
      }

      const resR = await fetch(`${API_BASE}/rewards/public`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resR.ok) {
        const payload = await resR.json();
        setRewards(Array.isArray(payload?.data) ? payload.data : []);
      }
    } catch (e) {
      console.error('Failed to load store data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, filterType, page]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const handleRedeem = async (voucher) => {
    if (!user) return onOpenAuth();
    if (redeemingId) return;
    if ((userPoints || 0) < (voucher.requiredPoints || 0)) {
      showToast('Bạn không đủ điểm để đổi voucher này.', 'error');
      return;
    }
    const ok = await confirmDialog({
      title: 'Đổi điểm lấy voucher',
      message: `Bạn có chắc chắn muốn dùng ${voucher.requiredPoints} điểm để đổi lấy "${voucher.name}"?`,
      confirmLabel: 'Đổi điểm',
    });
    if (!ok) return;

    setRedeemingId(voucher._id);
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const res = await fetch(`${API_BASE}/vouchers/redeem-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateId: voucher._id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Lỗi đổi điểm');
      showToast('Đổi voucher thành công!');
      await loadVouchers();
    } catch (err) {
      showToast(err.message || 'Lỗi đổi điểm', 'error');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleRedeemReward = async (reward) => {
    if (!user) return onOpenAuth();
    if (rewardLoading) return;
    const reqTier = reward.requiredTier || 'bronze';
    if ((TIER_RANK[user.tier] ?? 0) < (TIER_RANK[reqTier] ?? 0)) {
      showToast(`Phần thưởng này yêu cầu hạng ${TIER_LABELS[reqTier]} trở lên.`, 'error');
      return;
    }
    if ((userPoints || 0) < (reward.pointCost || 0)) {
      showToast('Bạn không đủ điểm để đổi phần thưởng này.', 'error');
      return;
    }
    const ok = await confirmDialog({
      title: 'Đổi điểm lấy phần thưởng',
      message: `Bạn có chắc chắn muốn dùng ${reward.pointCost} điểm để đổi lấy "${reward.name}"?`,
      confirmLabel: 'Đổi điểm',
    });
    if (!ok) return;

    setRewardLoading(true);
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const res = await fetch(`${API_BASE}/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardId: reward._id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Lỗi đổi phần thưởng');
      const code = payload.data?.redemption?.code || '';
      await confirmDialog({
        title: 'Đổi phần thưởng thành công! 🎉',
        content: (
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-3">Bạn đã đổi <b className="text-slate-800">{reward.name}</b>. Xuất trình mã sau tại quầy để nhận phần thưởng:</p>
            <div className="flex items-center justify-center gap-2">
              <code className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-black text-lg tracking-widest">{code}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(code); showToast('Đã copy mã đổi thưởng!', 'success'); }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3">Mã này cũng được lưu tại mục <b>Quà tặng của tôi</b> trong Kho quà & Tích điểm.</p>
          </div>
        ),
        confirmLabel: 'Đóng',
        hideCancel: true,
      });
      await loadVouchers();
    } catch (err) {
      showToast(err.message || 'Lỗi đổi phần thưởng', 'error');
    } finally {
      setRewardLoading(false);
    }
  };

  const handleSpinClick = async () => {
    if (!user) return onOpenAuth();
    if (spinning) return;
    if (spinCount <= 0) {
      showToast('Bạn đã hết lượt quay! Hãy đặt lịch và thanh toán thành công để nhận thêm lượt.', 'error');
      return;
    }
    
    setSpinning(true);
    setSpinResult(null);
    
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const res = await fetch(`${API_BASE}/gifts/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi quay');
      }
      
      setSpinCount(data.data.spinCount);
      const wonPrize = data.data.prize;
      const createdVoucher = data.data.voucher;

      if (wheelRef.current) {
        const targetSector = wheelSectors.find(s => String(s.id) === String(wonPrize._id));
        if (targetSector) {
           wheelRef.current.spin(targetSector.id);
        } else {
           wheelRef.current.spin();
        }
      }

      window.__lastSpinResult = {
        prize: wonPrize,
        voucher: createdVoucher
      };

    } catch (err) {
      showToast(err.message, 'error');
      setSpinning(false);
    }
  };

  const onSpinEnd = (sector) => {
    setSpinning(false);
    const result = window.__lastSpinResult;
    if (result) {
       setSpinResult(result);
       if (result.voucher) {
          setVouchers(prev => [result.voucher, ...prev]);
       }
       fetchSpinHistory();
    }
  };

  return (
    <section ref={ref} id="gifts" className="relative py-24 md:py-32 overflow-hidden bg-[#fcfdfd]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.02),transparent_60%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="text-emerald-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-3 block">
            Tri ân khách hàng
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 max-w-2xl mx-auto leading-tight">
            Kho Ưu Đãi & Quà Tặng
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Nơi tổng hợp các mã giảm giá dành riêng cho bạn và vòng quay may mắn rinh quà bất ngờ.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner flex-wrap justify-center gap-1.5 border border-slate-200/60">
            <button
              onClick={() => setActiveTab('redeem')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'redeem' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ưu Đãi
            </button>
            <button
              onClick={() => setActiveTab('wheel')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'wheel' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Quà Tặng (Vòng Quay)
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'history' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Lịch Sử Quay Thưởng
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'redeem' ? (
          <div>
            {!user ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Bạn chưa đăng nhập</h3>
                <p className="text-slate-500 mb-6">Đăng nhập ngay để xem các ưu đãi dành riêng cho hạng thành viên của bạn.</p>
                <button onClick={onOpenAuth} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">
                  Đăng Nhập
                </button>
              </div>
            ) : (
              <div>
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Trophy weight="fill" className="text-amber-500 w-6 h-6" />
                    <span className="text-sm font-bold text-slate-700">Điểm tích lũy: <span className="text-emerald-600 text-lg">{userPoints}</span></span>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => {setFilterType('all'); setPage(1);}} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'all' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Tất cả</button>
                    <button onClick={() => {setFilterType('mine'); setPage(1);}} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'mine' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Của tôi</button>
                    <button onClick={() => {setFilterType('redeemable'); setPage(1);}} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'redeemable' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Đổi điểm</button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center text-slate-400 py-16 font-medium">Đang tải ưu đãi...</div>
                ) : vouchers.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-500 font-medium">Chưa có ưu đãi nào dành cho bạn lúc này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {vouchers.map((voucher, i) => (
                  <VoucherCard key={voucher._id || voucher.id || i} voucher={voucher} index={i} onRedeem={handleRedeem} redeeming={redeemingId === voucher._id} />
                ))}
              </div>
            )}
            
            {!loading && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${
                        page === p ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            )}

            {(filterType === 'all' || filterType === 'redeemable') && rewards.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl shrink-0 border border-amber-200/70">🎁</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Đổi Điểm Lấy Quà Vật Lý</h3>
                    <p className="text-xs text-slate-500 font-medium">Dùng điểm tích lũy đổi các phần quà thực tế như dầu nhớt, nước hoa khử mùi xe,...</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {rewards.map((reward, i) => (
                    <RewardCard key={reward._id || i} reward={reward} index={i} onRedeem={handleRedeemReward} redeeming={rewardLoading} points={userPoints} userTier={user?.tier} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ) : activeTab === 'wheel' ? (
          <div className="space-y-12">
            {/* ── Spin Wheel Container Card ── */}
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-gradient-to-b from-white via-emerald-50/60 to-teal-50/40 border border-emerald-100/90 rounded-3xl shadow-xl relative overflow-hidden text-slate-900 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 relative z-10">
                ✨ Vòng Quay May Mắn
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 relative z-10 tracking-tight">Vòng Quay Trúng Thưởng</h3>
              <p className="text-slate-500 mb-6 relative z-10 max-w-md text-xs md:text-sm font-medium leading-relaxed">Thanh toán thành công đơn dịch vụ để tích lũy thêm lượt quay và săn quà độc quyền!</p>
              
              <div className="bg-white/90 border border-emerald-200/90 rounded-full px-7 py-3 mb-8 relative z-10 shadow-sm flex items-center gap-2.5">
                <span className="text-slate-700 text-sm font-bold">Lượt quay khả dụng:</span>
                <span className="text-emerald-600 text-2xl font-black">{user ? spinCount : 0}</span>
              </div>

              <div className="relative z-10 scale-[0.9] sm:scale-100 origin-center my-4">
                 {wheelSectors.length > 0 && (
                   <CustomLuckyWheel
                     ref={wheelRef}
                     sectors={wheelSectors}
                     onSpinEnd={onSpinEnd}
                     onCenterClick={handleSpinClick}
                   />
                 )}
              </div>

              <div className="mt-8 relative z-10 flex flex-col items-center">
                 <button 
                   onClick={handleSpinClick}
                   disabled={spinning || (user && spinCount <= 0)}
                   className={`px-16 py-4.5 rounded-full font-black text-xl transition-all shadow-xl cursor-pointer ${
                     spinning 
                       ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none border border-slate-300' 
                       : (user && spinCount <= 0)
                         ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-300'
                         : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 border border-emerald-500/20'
                   }`}
                 >
                   {spinning ? 'ĐANG QUAY...' : 'QUAY NGAY'}
                 </button>
              </div>

              {spinResult && (() => {
                const prizeName = (spinResult.prize?.name || '').toLowerCase();
                const isNoPrize = !spinResult.voucher && (prizeName.includes('may mắn') || prizeName.includes('không trúng'));

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-6"
                  >
                     <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full relative border border-slate-100 text-slate-900">
                       <button onClick={() => setSpinResult(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm">
                         ✕
                       </button>
                       <div className={`w-20 h-20 rounded-2xl text-white flex items-center justify-center mx-auto mb-5 shadow-lg text-3xl ${
                         isNoPrize 
                           ? 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20' 
                           : 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/20'
                       }`}>
                         {isNoPrize ? '🍀' : '🎁'}
                       </div>
                       <h4 className="text-2xl font-black text-slate-900 mb-1">
                         {isNoPrize ? 'Chúc Bạn May Mắn!' : 'Chúc Mừng Bạn!'}
                       </h4>
                       <p className="text-xs font-medium text-slate-500 mb-5">
                         {isNoPrize ? 'Rất tiếc lượt quay này chưa trúng phần quà nào.' : 'Bạn đã may mắn quay trúng phần quà:'}
                       </p>
                       <div className={`text-lg font-bold mb-6 p-4 rounded-2xl border shadow-2xs ${
                         isNoPrize 
                           ? 'bg-slate-50 text-slate-700 border-slate-200' 
                           : 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                       }`}>
                         {spinResult.prize?.name || (isNoPrize ? 'Chúc bạn may mắn lần sau' : 'Phần quà bí mật')}
                       </div>
                       {!isNoPrize && spinResult.voucher && (
                         <p className="text-xs text-slate-500 mb-6 font-medium">Mã ưu đãi đã được tự động thêm vào mục <b>Ưu Đãi</b> của bạn!</p>
                       )}
                       <button 
                         onClick={() => setSpinResult(null)}
                         className={`w-full py-3 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer ${
                           isNoPrize 
                             ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-800/20' 
                             : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                         }`}
                       >
                         {isNoPrize ? 'Thử lại' : 'Nhận quà ngay'}
                       </button>
                     </div>
                  </motion.div>
                );
              })()}
            </div>

            {/* ── Shortcut Banner to History ── */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shrink-0">
                  🏆
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Xem lại các phần quà đã quay trúng</h4>
                  <p className="text-xs text-slate-500">Xem danh sách đầy đủ mã voucher và quà tặng từ các lượt quay trước</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                Lịch sử quay thưởng →
              </button>
            </div>
          </div>
        ) : (
          /* ── TAB 3: LỊCH SỬ QUAY THƯỞNG ── */
          <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200/80 shadow-sm relative z-10">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shadow-2xs border border-amber-200/80">
                  🏆
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Lịch Sử Quay Thưởng Của Bạn</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Tất cả các phần quà và mã ưu đãi bạn đã may mắn quay trúng</p>
                </div>
              </div>
              {spinHistory.length > 0 && (
                <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tổng trúng: {spinHistory.length} phần quà
                </span>
              )}
            </div>

            {!user ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-4">Vui lòng đăng nhập để xem danh sách phần quà đã trúng</p>
                <button onClick={onOpenAuth} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md">
                  Đăng Nhập
                </button>
              </div>
            ) : historyLoading ? (
              <div className="text-center py-16 text-slate-400 text-sm font-medium">Đang tải lịch sử trúng quà...</div>
            ) : spinHistory.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-3">
                  🎁
                </div>
                <h5 className="text-base font-bold text-slate-800">Chưa có phần quà nào</h5>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Bạn chưa trúng phần quà nào từ vòng quay. Hãy sang tab Vòng quay để thử vận may ngay!</p>
                <button
                  onClick={() => setActiveTab('wheel')}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Quay thưởng ngay ⚡
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {spinHistory.map((item, idx) => {
                  const isUsed = item.status === 'used';
                  const isExpired = item.status === 'expired';
                  const statusLabel = isUsed ? 'Đã sử dụng' : isExpired ? 'Đã hết hạn' : 'Còn hiệu lực';
                  const statusCls = isUsed ? 'bg-slate-100 text-slate-500 border-slate-200' : isExpired ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <div key={item._id || idx} className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-xs">
                          🎁
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-slate-900 truncate">{item.name}</h5>
                          <div className="text-[12px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                            <span>Mã: <strong className="text-slate-800">{item.code}</strong></span>
                            <span>·</span>
                            <span>{formatDate(item.wonAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
