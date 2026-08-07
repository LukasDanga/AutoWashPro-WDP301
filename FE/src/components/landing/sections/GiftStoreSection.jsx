import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import CustomLuckyWheel from '../widgets/CustomLuckyWheel.jsx';
import { storageKeys } from '../../../lib/authStorage.js';
import { showToast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import TierBadge from '@/components/ui/TierBadge';
import { Trophy, CheckCircle, Warning, ClockCounterClockwise, X, Gift, Sparkle, Copy, Coins, ShieldCheck, Package } from '@phosphor-icons/react';
import useSSE from '@/hooks/useSSE';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatPrice(v) {
  return v ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '0đ';
}

function formatDate(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TIER_BADGE_CLS = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-slate-200 text-slate-700',
  gold: 'bg-yellow-200 text-yellow-900',
  diamond: 'bg-cyan-100 text-cyan-800',
};

const FALLBACK_TIERS = [
  { id: 'bronze', name: 'Đồng', minPoints: 0 },
  { id: 'silver', name: 'Bạc', minPoints: 100000 },
  { id: 'gold', name: 'Vàng', minPoints: 500000 },
  { id: 'diamond', name: 'Kim Cương', minPoints: 1000000 },
];

function buildTierMaps(tiers) {
  const sorted = [...(tiers || [])].sort((a, b) => (a.minPoints || 0) - (b.minPoints || 0));
  const rank = {};
  const label = {};
  const badge = {};
  sorted.forEach((t, i) => {
    const id = String(t.id || '').toLowerCase();
    rank[id] = i;
    label[id] = t.name || id;
    badge[id] = t.badgeCls || TIER_BADGE_CLS[id] || TIER_BADGE_CLS.bronze;
  });
  return { sorted, rank, label, badge };
}

function RewardDetailModal({ reward, user, userPoints, tierMaps, onClose, onConfirm, loading, successData, onCopyCode }) {
  if (!reward) return null;

  const pointCost = reward.pointCost || 0;
  const remainingPoints = (userPoints || 0) - pointCost;
  const reqTier = (reward.requiredTier || 'bronze').toLowerCase();
  const userRank = tierMaps.rank[(user?.tier || 'bronze').toLowerCase()] ?? 0;
  const reqRank = tierMaps.rank[reqTier] ?? 0;
  const tierOk = userRank >= reqRank;
  const enoughPoints = (userPoints || 0) >= pointCost;
  const reqLabel = tierMaps.label[reqTier] || 'Đồng';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl my-auto overflow-hidden bg-white shadow-2xl rounded-3xl border border-slate-200/80 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-md backdrop-blur-md border border-slate-200/60 cursor-pointer"
          title="Đóng"
        >
          <X size={20} weight="bold" />
        </button>

        {!successData ? (
          <>
            {/* Hero Image Section */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100 shrink-0">
              {reward.imageUrl ? (
                <img
                  src={reward.imageUrl}
                  alt={reward.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-6xl">🎁</div>
              )}
              {/* Subtle Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-black/20" />

              {/* Badges on Hero */}
              <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between gap-2 z-10">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 text-white font-black text-xs shadow-md">
                  <Coins size={16} weight="fill" /> {new Intl.NumberFormat('vi-VN').format(pointCost)} Điểm
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-sm border backdrop-blur-md ${tierMaps.badge[reqTier] || TIER_BADGE_CLS.bronze}`}>
                    <ShieldCheck size={14} weight="fill" />
                    {reqTier === 'bronze' ? 'Mọi hạng thành viên' : `Hạng ${reqLabel} trở lên`}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 text-slate-700 text-xs font-bold backdrop-blur-md border border-slate-200 shadow-sm">
                    <Package size={14} weight="bold" /> Còn {reward.stock} phần
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* Title & Description */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
                  {reward.name}
                </h3>
                <p className="text-base text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  {reward.description || 'Sản phẩm quà tặng chính hãng chất lượng cao từ hệ thống AutoWashPro.'}
                </p>
              </div>

              {/* Point Calculation Card (Clean Light Emerald Theme) */}
              <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-emerald-50/20 border border-emerald-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <span>Thông tin quy đổi điểm</span>
                  <span className="text-emerald-700 font-extrabold">Đổi Quà Vật Lý</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Điểm tích lũy hiện tại:</span>
                    <span className="font-bold text-slate-900">{new Intl.NumberFormat('vi-VN').format(userPoints || 0)} điểm</span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Điểm trừ đổi phần thưởng:</span>
                    <span className="font-black text-base">- {new Intl.NumberFormat('vi-VN').format(pointCost)} điểm</span>
                  </div>

                  <div className="border-t border-emerald-200/70 pt-2 flex items-center justify-between text-base font-bold">
                    <span className="text-slate-800">Điểm còn lại sau khi đổi:</span>
                    <span className={remainingPoints >= 0 ? 'text-emerald-700 font-black text-lg' : 'text-rose-600 font-black text-lg'}>
                      {new Intl.NumberFormat('vi-VN').format(Math.max(0, remainingPoints))} điểm
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Notice */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs sm:text-sm">
                <Sparkle size={22} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Hướng dẫn nhận phần thưởng:</span>
                  Sau khi bấm <b>Xác nhận đổi quà</b>, hệ thống sẽ cấp <b>Mã đổi thưởng độc quyền</b>. Xuất trình mã này tại bất kỳ chi nhánh AutoWashPro nào để nhân viên bàn giao phần quà vật lý.
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200/80 flex items-center gap-3 justify-end rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading || !enoughPoints || !tierOk || (reward.stock || 0) <= 0}
                className={`flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  (reward.stock || 0) <= 0 || !enoughPoints || !tierOk
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 active:scale-98'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Đang xử lý đổi quà...</span>
                  </>
                ) : (
                  <>
                    <Gift size={18} weight="bold" />
                    <span>Xác nhận Đổi quà</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Success Screen */
          <div className="p-8 text-center space-y-6 my-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 shadow-xl ring-8 ring-emerald-50 animate-bounce mx-auto">
              <CheckCircle size={52} weight="fill" />
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Đổi phần thưởng thành công! 🎉</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Bạn đã đổi thành công phần quà <b className="text-slate-900 font-bold">{reward.name}</b>.
              </p>
            </div>

            {/* Code Box */}
            <div className="bg-emerald-50/90 border border-emerald-200 text-slate-900 rounded-2xl p-6 shadow-sm space-y-3 max-w-md mx-auto">
              <div className="text-xs uppercase font-bold tracking-widest text-emerald-800">Mã nhận quà của bạn</div>
              <div className="flex items-center justify-center gap-3">
                <code className="text-2xl sm:text-3xl font-mono font-black text-emerald-700 tracking-widest bg-white px-5 py-2.5 rounded-xl border border-emerald-200 shadow-xs">
                  {successData.code}
                </code>
                <button
                  type="button"
                  onClick={() => onCopyCode(successData.code)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Copy size={18} weight="bold" /> Copy
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200 max-w-md mx-auto">
              Mã này đã được tự động lưu lại. Hãy xuất trình mã khi đến rửa xe tại hệ thống AutoWashPro để nhận phần quà vật lý.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-md py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/25 cursor-pointer mx-auto block"
            >
              Hoàn tất
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

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

function RewardCard({ reward, index, onRedeem, redeeming, points, userTier, tierMaps }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const enough = (points || 0) >= (reward.pointCost || 0);
  const soldOut = (reward.stock || 0) <= 0;
  const reqTier = (reward.requiredTier || 'bronze').toLowerCase();
  const userRank = tierMaps.rank[(userTier || 'bronze').toLowerCase()] ?? 0;
  const reqRank = tierMaps.rank[reqTier] ?? 0;
  const tierOk = userRank >= reqRank;
  const reqLabel = tierMaps.label[reqTier] || 'Đồng';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={() => onRedeem(reward)}
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 shrink-0">
        {reward.imageUrl ? (
          <img src={reward.imageUrl} alt={reward.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-wider">Hết hàng</span>
          </div>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-sm z-10">
          ⭐ {new Intl.NumberFormat('vi-VN').format(reward.pointCost || 0)} Điểm
        </div>
        <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black shadow-sm border z-10 ${tierMaps.badge[reqTier] || TIER_BADGE_CLS.bronze}`}>
          {reqTier === 'bronze' ? 'Mọi hạng' : `Hạng ${reqLabel}`}
        </div>
      </div>
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          <h4 className="text-base font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">{reward.name}</h4>
          <p className="text-sm text-slate-500 leading-relaxed mb-3 line-clamp-2">{reward.description}</p>
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium mb-4">Còn {reward.stock} phần quà</div>
          <button
            onClick={(e) => { e.stopPropagation(); onRedeem(reward); }}
            disabled={redeeming || soldOut || !enough || !tierOk}
            className={`w-full px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              soldOut || !enough || !tierOk
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed'
            }`}
          >
            {soldOut ? 'Hết hàng' : !tierOk ? `Cần hạng ${reqLabel} trở lên` : !enough ? `Cần thêm ${new Intl.NumberFormat('vi-VN').format((reward.pointCost || 0) - (points || 0))} điểm` : redeeming ? 'Đang xử lý...' : 'Xem chi tiết & Đổi quà'}
          </button>
        </div>
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
  
  const [filterType, setFilterType] = useState('redeem');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [spinHistory, setSpinHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [myRewards, setMyRewards] = useState([]);
  const [tiers, setTiers] = useState([]);

  const [selectedRewardModal, setSelectedRewardModal] = useState(null);
  const [redeemSuccessData, setRedeemSuccessData] = useState(null);

  const tierMaps = useMemo(() => buildTierMaps(tiers), [tiers]);

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
    setLoading(true);
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (user && token) {
        try {
          const resProfile = await fetch(`${API_BASE}/auth/profile`, { headers });
          if (resProfile.ok) {
            const prof = await resProfile.json();
            if (prof.data) {
              setSpinCount(prof.data.spinCount || 0);
              setUserPoints(prof.data.loyaltyPoints || 0);
            }
          }
        } catch (e) {}

        try {
          const resV = await fetch(`${API_BASE}/vouchers/available?type=${filterType}&page=${page}&limit=6`, { headers });
          if (resV.ok) {
            const payload = await resV.json();
            const { data, pagination, user: uData } = payload?.data || {};
            if (data) setVouchers(data);
            if (pagination) setTotalPages(pagination.totalPages || 1);
            if (uData) setUserPoints(uData.loyaltyPoints || 0);
          }
        } catch (e) {}

        try {
          const resMyR = await fetch(`${API_BASE}/rewards/me`, { headers });
          if (resMyR.ok) {
            const payload = await resMyR.json();
            setMyRewards(Array.isArray(payload?.data) ? payload.data : []);
          }
        } catch (e) {}
      }

      // Always fetch public physical rewards for everyone (guests and logged in users)
      const resR = await fetch(`${API_BASE}/rewards/public`);
      if (resR.ok) {
        const payload = await resR.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];
        setRewards([...list].sort((a, b) => {
          const trA = tierMaps.rank[(a.requiredTier || 'bronze').toLowerCase()] ?? 0;
          const trB = tierMaps.rank[(b.requiredTier || 'bronze').toLowerCase()] ?? 0;
          if (trB !== trA) return trB - trA;
          return (a.pointCost || 0) - (b.pointCost || 0);
        }));
      }
    } catch (e) {
      console.error('Failed to load store data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, filterType, page, tierMaps]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const sseToken = localStorage.getItem(storageKeys.accessToken);
  useSSE(sseToken, 'my_rewards_updated', loadVouchers);
  useSSE(sseToken, 'rewards_updated', loadVouchers);
  useSSE(sseToken, 'vouchers_updated', loadVouchers);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/loyalty/tiers`)
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled) return;
        const list = Array.isArray(payload?.data) ? payload.data
          : (typeof payload?.data === 'object' && Array.isArray(payload.data.tiers)) ? payload.data.tiers
          : [];
        setTiers(list.length > 0 ? list : FALLBACK_TIERS);
      })
      .catch(() => { if (!cancelled) setTiers(FALLBACK_TIERS); });
    return () => { cancelled = true; };
  }, []);

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

  const handleRedeemReward = (reward) => {
    if (!user) return onOpenAuth();
    setRedeemSuccessData(null);
    setSelectedRewardModal(reward);
  };

  const confirmRedeemAction = async () => {
    if (!selectedRewardModal) return;
    setRewardLoading(true);
    try {
      const token = localStorage.getItem(storageKeys.accessToken);
      const res = await fetch(`${API_BASE}/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardId: selectedRewardModal._id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Lỗi đổi phần thưởng');
      const code = payload.data?.redemption?.code || '';
      setRedeemSuccessData({ code });
      showToast('Đổi phần thưởng thành công! 🎉', 'success');
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
    <section ref={ref} id="gifts" className="relative pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden bg-[#fcfdfd]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.02),transparent_60%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner flex-wrap justify-center gap-1.5 border border-slate-200/60">
            <button
              onClick={() => setActiveTab('redeem')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'redeem' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Quà đổi điểm
            </button>
            <button
              onClick={() => setActiveTab('wheel')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'wheel' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Vòng Quay
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'redeem' ? (
          <div>
            {!user ? (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md shadow-emerald-600/20">
                    🎁
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">Đăng nhập để tích điểm & Đổi quà ngay!</span>
                    <span className="text-xs text-slate-500 font-medium">Tích lũy điểm mỗi lần rửa xe để đổi các quà tặng cao cấp bên dưới.</span>
                  </div>
                </div>
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  Đăng Nhập Ngay
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <Trophy weight="fill" className="text-amber-500 w-6 h-6" />
                  <span className="text-sm font-bold text-slate-700">Điểm tích lũy: <span className="text-emerald-600 text-lg">{new Intl.NumberFormat('vi-VN').format(userPoints || 0)}</span></span>
                </div>
              </div>
            )}

            <div>
              {loading ? (
                <div className="text-center text-slate-400 py-12 font-medium">Đang tải quà tặng...</div>
              ) : rewards.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-slate-500 font-medium">Chưa có quà tặng vật lý nào lúc này.</p>
                </div>
              ) : (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl shrink-0 border border-amber-200/70">🎁</div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Đổi Điểm Lấy Quà Vật Lý</h3>
                      <p className="text-xs text-slate-500 font-medium">Dùng điểm tích lũy đổi các phần quà thực tế như dầu nhớt, nước hoa khử mùi xe,...</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {rewards.map((reward, i) => (
                      <RewardCard
                        key={reward._id || i}
                        reward={reward}
                        index={i}
                        onRedeem={handleRedeemReward}
                        redeeming={rewardLoading}
                        points={userPoints}
                        userTier={user?.tier}
                        tierMaps={tierMaps}
                        isLoggedIn={!!user}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
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
          </div>
        )}
      </div>

      {/* Reward Detail & Confirmation Modal */}
      {selectedRewardModal && (
        <RewardDetailModal
          reward={selectedRewardModal}
          user={user}
          userPoints={userPoints}
          tierMaps={tierMaps}
          onClose={() => {
            setSelectedRewardModal(null);
            setRedeemSuccessData(null);
          }}
          onConfirm={confirmRedeemAction}
          loading={rewardLoading}
          successData={redeemSuccessData}
          onCopyCode={(code) => {
            navigator.clipboard.writeText(code);
            showToast('Đã copy mã nhận quà!', 'success');
          }}
        />
      )}
    </section>
  );
}
