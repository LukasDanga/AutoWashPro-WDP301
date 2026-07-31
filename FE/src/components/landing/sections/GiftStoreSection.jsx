import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';
import CustomLuckyWheel from '../widgets/CustomLuckyWheel.jsx';
import { storageKeys } from '../../../lib/authStorage.js';
import { showToast } from '@/lib/toast';
import { Trophy, CheckCircle, Warning, ClockCounterClockwise } from '@phosphor-icons/react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatPrice(v) {
  return v ? new Intl.NumberFormat('vi-VN').format(v) + 'Ä‘' : '0Ä‘';
}

function formatDate(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function VoucherCard({ voucher, index }) {
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
  const discountText = voucher.type === 'none' ? voucher.name : (isPercent ? `GIáº¢M ${voucher.value}%` : `GIáº¢M ${formatPrice(voucher.value)}`);
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
            {isPersonal ? 'Cá»§a RiÃªng Báº¡n' : (isRedeem ? 'Äá»•i Äiá»ƒm' : 'Æ¯u ÄÃ£i')}
          </div>
          {voucher.remaining > 0 && !isPersonal && (
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              CÃ²n {voucher.remaining} lÆ°á»£t
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
               {voucher.requiredPoints} Äiá»ƒm
            </div>
            <button className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors">
              Äá»•i ngay
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
              {copied ? 'ÄÃ£ copy âœ”' : 'Copy mÃ£'}
            </button>
          </>
        )}
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
      console.error('Lá»—i láº¥y lá»‹ch sá»­ quay quÃ :', e);
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
             setWheelSectors([{ id: '1', label: 'Rá»—ng', color: '#94a3b8' }]);
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

  useEffect(() => {
    async function loadVouchers() {
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
      } catch (e) {
        console.error('Failed to load store data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadVouchers();
  }, [user, filterType, page]);

  const handleSpinClick = async () => {
    if (!user) return onOpenAuth();
    if (spinning) return;
    if (spinCount <= 0) {
      showToast('Báº¡n Ä‘Ã£ háº¿t lÆ°á»£t quay! HÃ£y Ä‘áº·t lá»‹ch vÃ  thanh toÃ¡n thÃ nh cÃ´ng Ä‘á»ƒ nháº­n thÃªm lÆ°á»£t.', 'error');
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
        throw new Error(data.message || 'Lá»—i khi quay');
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
            Tri Ã¢n khÃ¡ch hÃ ng
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 max-w-2xl mx-auto leading-tight">
            Kho Æ¯u ÄÃ£i & QuÃ  Táº·ng
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            NÆ¡i tá»•ng há»£p cÃ¡c mÃ£ giáº£m giÃ¡ dÃ nh riÃªng cho báº¡n vÃ  vÃ²ng quay may máº¯n rinh quÃ  báº¥t ngá».
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
              Æ¯u ÄÃ£i
            </button>
            <button
              onClick={() => setActiveTab('wheel')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'wheel' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              QuÃ  Táº·ng (VÃ²ng Quay)
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'history' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Lá»‹ch Sá»­ Quay ThÆ°á»Ÿng
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
                <h3 className="text-xl font-bold text-slate-800 mb-2">Báº¡n chÆ°a Ä‘Äƒng nháº­p</h3>
                <p className="text-slate-500 mb-6">ÄÄƒng nháº­p ngay Ä‘á»ƒ xem cÃ¡c Æ°u Ä‘Ã£i dÃ nh riÃªng cho háº¡ng thÃ nh viÃªn cá»§a báº¡n.</p>
                <button onClick={onOpenAuth} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">
                  ÄÄƒng Nháº­p
                </button>
              </div>
            ) : (
              <div>
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Trophy weight="fill" className="text-amber-500 w-6 h-6" />
                    <span className="text-sm font-bold text-slate-700">Äiá»ƒm tÃ­ch lÅ©y: <span className="text-emerald-600 text-lg">{userPoints}</span></span>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => {setFilterType('all'); setPage(1);}} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'all' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Táº¥t cáº£</button>
                    <button onClick={() => {setFilterType('mine'); setPage(1);}} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'mine' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Cá»§a tÃ´i</button>
                    <button onClick={() => {setFilterType('redeemable'); setPage(1);}} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'redeemable' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Äá»•i Ä‘iá»ƒm</button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center text-slate-400 py-16 font-medium">Äang táº£i Æ°u Ä‘Ã£i...</div>
                ) : vouchers.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-500 font-medium">ChÆ°a cÃ³ Æ°u Ä‘Ã£i nÃ o dÃ nh cho báº¡n lÃºc nÃ y.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {vouchers.map((voucher, i) => (
                  <VoucherCard key={voucher._id || voucher.id || i} voucher={voucher} index={i} />
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
          </div>
        )}
      </div>
    ) : activeTab === 'wheel' ? (
          <div className="space-y-12">
            {/* â”€â”€ Spin Wheel Container Card â”€â”€ */}
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-gradient-to-b from-white via-emerald-50/60 to-teal-50/40 border border-emerald-100/90 rounded-3xl shadow-xl relative overflow-hidden text-slate-900 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 relative z-10">
                âœ¨ VÃ²ng Quay May Máº¯n
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 relative z-10 tracking-tight">VÃ²ng Quay TrÃºng ThÆ°á»Ÿng</h3>
              <p className="text-slate-500 mb-6 relative z-10 max-w-md text-xs md:text-sm font-medium leading-relaxed">Thanh toÃ¡n thÃ nh cÃ´ng Ä‘Æ¡n dá»‹ch vá»¥ Ä‘á»ƒ tÃ­ch lÅ©y thÃªm lÆ°á»£t quay vÃ  sÄƒn quÃ  Ä‘á»™c quyá»n!</p>
              
              <div className="bg-white/90 border border-emerald-200/90 rounded-full px-7 py-3 mb-8 relative z-10 shadow-sm flex items-center gap-2.5">
                <span className="text-slate-700 text-sm font-bold">LÆ°á»£t quay kháº£ dá»¥ng:</span>
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
                   {spinning ? 'ÄANG QUAY...' : 'QUAY NGAY'}
                 </button>
              </div>

              {spinResult && (() => {
                const prizeName = (spinResult.prize?.name || '').toLowerCase();
                const isNoPrize = !spinResult.voucher && (prizeName.includes('may máº¯n') || prizeName.includes('khÃ´ng trÃºng'));

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-6"
                  >
                     <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full relative border border-slate-100 text-slate-900">
                       <button onClick={() => setSpinResult(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm">
                         âœ•
                       </button>
                       <div className={`w-20 h-20 rounded-2xl text-white flex items-center justify-center mx-auto mb-5 shadow-lg text-3xl ${
                         isNoPrize 
                           ? 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20' 
                           : 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/20'
                       }`}>
                         {isNoPrize ? 'ðŸ€' : 'ðŸŽ'}
                       </div>
                       <h4 className="text-2xl font-black text-slate-900 mb-1">
                         {isNoPrize ? 'ChÃºc Báº¡n May Máº¯n!' : 'ChÃºc Má»«ng Báº¡n!'}
                       </h4>
                       <p className="text-xs font-medium text-slate-500 mb-5">
                         {isNoPrize ? 'Ráº¥t tiáº¿c lÆ°á»£t quay nÃ y chÆ°a trÃºng pháº§n quÃ  nÃ o.' : 'Báº¡n Ä‘Ã£ may máº¯n quay trÃºng pháº§n quÃ :'}
                       </p>
                       <div className={`text-lg font-bold mb-6 p-4 rounded-2xl border shadow-2xs ${
                         isNoPrize 
                           ? 'bg-slate-50 text-slate-700 border-slate-200' 
                           : 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                       }`}>
                         {spinResult.prize?.name || (isNoPrize ? 'ChÃºc báº¡n may máº¯n láº§n sau' : 'Pháº§n quÃ  bÃ­ máº­t')}
                       </div>
                       {!isNoPrize && spinResult.voucher && (
                         <p className="text-xs text-slate-500 mb-6 font-medium">MÃ£ Æ°u Ä‘Ã£i Ä‘Ã£ Ä‘Æ°á»£c tá»± Ä‘á»™ng thÃªm vÃ o má»¥c <b>Æ¯u ÄÃ£i</b> cá»§a báº¡n!</p>
                       )}
                       <button 
                         onClick={() => setSpinResult(null)}
                         className={`w-full py-3 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer ${
                           isNoPrize 
                             ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-800/20' 
                             : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                         }`}
                       >
                         {isNoPrize ? 'Thá»­ láº¡i' : 'Nháº­n quÃ  ngay'}
                       </button>
                     </div>
                  </motion.div>
                );
              })()}
            </div>

            {/* â”€â”€ Shortcut Banner to History â”€â”€ */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shrink-0">
                  ðŸ†
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Xem láº¡i cÃ¡c pháº§n quÃ  Ä‘Ã£ quay trÃºng</h4>
                  <p className="text-xs text-slate-500">Xem danh sÃ¡ch Ä‘áº§y Ä‘á»§ mÃ£ voucher vÃ  quÃ  táº·ng tá»« cÃ¡c lÆ°á»£t quay trÆ°á»›c</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                Lá»‹ch sá»­ quay thÆ°á»Ÿng â†’
              </button>
            </div>
          </div>
        ) : (
          /* â”€â”€ TAB 3: Lá»ŠCH Sá»¬ QUAY THÆ¯á»žNG â”€â”€ */
          <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200/80 shadow-sm relative z-10">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shadow-2xs border border-amber-200/80">
                  ðŸ†
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Lá»‹ch Sá»­ Quay ThÆ°á»Ÿng Cá»§a Báº¡n</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Táº¥t cáº£ cÃ¡c pháº§n quÃ  vÃ  mÃ£ Æ°u Ä‘Ã£i báº¡n Ä‘Ã£ may máº¯n quay trÃºng</p>
                </div>
              </div>
              {spinHistory.length > 0 && (
                <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tá»•ng trÃºng: {spinHistory.length} pháº§n quÃ 
                </span>
              )}
            </div>

            {!user ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-4">Vui lÃ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ xem danh sÃ¡ch pháº§n quÃ  Ä‘Ã£ trÃºng</p>
                <button onClick={onOpenAuth} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md">
                  ÄÄƒng Nháº­p
                </button>
              </div>
            ) : historyLoading ? (
              <div className="text-center py-16 text-slate-400 text-sm font-medium">Äang táº£i lá»‹ch sá»­ trÃºng quÃ ...</div>
            ) : spinHistory.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-3">
                  ðŸŽ
                </div>
                <h5 className="text-base font-bold text-slate-800">ChÆ°a cÃ³ pháº§n quÃ  nÃ o</h5>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Báº¡n chÆ°a trÃºng pháº§n quÃ  nÃ o tá»« vÃ²ng quay. HÃ£y sang tab VÃ²ng quay Ä‘á»ƒ thá»­ váº­n may ngay!</p>
                <button
                  onClick={() => setActiveTab('wheel')}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Quay thÆ°á»Ÿng ngay âš¡
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {spinHistory.map((item, idx) => {
                  const isUsed = item.status === 'used';
                  const isExpired = item.status === 'expired';
                  const statusLabel = isUsed ? 'ÄÃ£ sá»­ dá»¥ng' : isExpired ? 'ÄÃ£ háº¿t háº¡n' : 'CÃ²n hiá»‡u lá»±c';
                  const statusCls = isUsed ? 'bg-slate-100 text-slate-500 border-slate-200' : isExpired ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <div key={item._id || idx} className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-xs">
                          ðŸŽ
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-slate-900 truncate">{item.name}</h5>
                          <div className="text-[12px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                            <span>MÃ£: <strong className="text-slate-800">{item.code}</strong></span>
                            <span>Â·</span>
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
