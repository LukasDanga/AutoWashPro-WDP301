import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { PrizeWheel } from '@mertercelik/react-prize-wheel';
import '@mertercelik/react-prize-wheel/style.css';
import { storageKeys } from '../../lib/authStorage.js';
import { showToast } from '@/lib/toast';
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
            <button className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors">
              Đổi ngay
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
  
  const wheelRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    async function loadWheel() {
      try {
        const resGifts = await fetch(`${API_BASE}/gifts/public`);
        if (resGifts.ok) {
          const payload = await resGifts.json();
          const items = payload?.data || [];
          if (items.length > 0) {
            setWheelSectors(items.map((it, idx) => ({
              id: it._id,
              label: it.name,
              probability: it.probability,
              color: it.color || (idx % 2 === 0 ? '#10b981' : '#34d399')
            })));
          } else {
             setWheelSectors([{ id: '1', label: 'Rỗng', color: '#ccc' }]);
          }
        }
      } catch(e) {}
    }
    loadWheel();
  }, []);

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
        // find index in wheelSectors matching wonPrize._id
        const targetSector = wheelSectors.find(s => String(s.id) === String(wonPrize._id));
        if (targetSector) {
           wheelRef.current.spin(targetSector.id);
        } else {
           wheelRef.current.spin();
        }
      }

      // We wait for onSpinEnd to show result. We store createdVoucher info in spinResult there.
      // But we can just set it immediately in a ref or state and use it in onSpinEnd.
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
          // add to vouchers list automatically
          setVouchers(prev => [result.voucher, ...prev]);
       }
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
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center shadow-inner">
            <button
              onClick={() => setActiveTab('redeem')}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'redeem' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ưu Đãi
            </button>
            <button
              onClick={() => setActiveTab('wheel')}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'wheel' 
                  ? 'bg-white text-emerald-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Quà Tặng (Vòng Quay)
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
    ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_70%)]" />
             
             <h3 className="text-3xl font-black text-slate-800 mb-2 relative z-10">Vòng Quay Trúng Thưởng</h3>
             <p className="text-slate-500 mb-4 relative z-10 max-w-md text-center">Thanh toán thành công đơn hàng để nhận thêm lượt quay!</p>
             
             <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-6 py-3 mb-10 relative z-10">
               <span className="text-emerald-700 font-bold">Lượt quay của bạn: <span className="text-xl ml-1">{user ? spinCount : 0}</span></span>
             </div>

             <div className="relative z-10 scale-[1.15] md:scale-125 origin-top mt-4 mb-20">
                {wheelSectors.length > 1 && (
                  <PrizeWheel
                    ref={wheelRef}
                    sectors={wheelSectors}
                    onSpinEnd={onSpinEnd}
                    textColor="#ffffff"
                    middleDotColor="#ffffff"
                    frameColor="#0f172a"
                    minSpins={3}
                  />
                )}
             </div>

             <div className="mt-12 relative z-10 flex flex-col items-center">
                <button 
                  onClick={handleSpinClick}
                  disabled={spinning || (user && spinCount <= 0)}
                  className={`px-14 py-5 rounded-full font-black text-xl transition-all shadow-xl ${
                    spinning 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                      : (user && spinCount <= 0)
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-emerald-400/50 hover:-translate-y-1'
                  }`}
                >
                  {spinning ? 'ĐANG QUAY...' : 'QUAY NGAY'}
                </button>
             </div>

             {spinResult && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
               >
                  <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-sm w-full relative">
                    <button onClick={() => setSpinResult(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl">🎁</span>
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 mb-2">Chúc Mừng!</h4>
                    <p className="text-slate-500 mb-6">Bạn đã quay trúng:</p>
                    <div className="text-xl font-bold text-emerald-600 mb-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      {spinResult.prize?.name || 'Phần quà bí mật'}
                    </div>
                    {spinResult.voucher && (
                      <p className="text-sm text-slate-500 mb-6">Voucher đã được chuyển vào mục <b>Ưu Đãi</b> của bạn!</p>
                    )}
                    <button 
                      onClick={() => setSpinResult(null)}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                    >
                      Tuyệt Vời
                    </button>
                  </div>
               </motion.div>
             )}
          </div>
        )}
      </div>
    </section>
  );
}
