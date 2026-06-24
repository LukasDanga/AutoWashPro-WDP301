import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatPrice(v) {
  return v ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : 'Tuỳ chọn';
}

function GiftCard({ gift, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  // Map emojis to beautiful soft background colors and text colors matching the mockup
  const getIconStyles = (emoji) => {
    switch (emoji) {
      case '🎁':
        return 'bg-orange-50 text-orange-500';
      case '✨':
        return 'bg-blue-50 text-blue-400';
      case '💳':
        return 'bg-emerald-50 text-emerald-500';
      case '🌟':
      case '⭐':
        return 'bg-amber-50 text-amber-400';
      case '🧹':
        return 'bg-rose-50 text-rose-400';
      case '👑':
        return 'bg-purple-50 text-purple-400';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const isCustom = gift.isCustomPrice || gift.price === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group relative rounded-3xl p-8 transition-all duration-300 bg-white border border-slate-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.06)] hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[300px]"
    >
      <div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 ${getIconStyles(gift.emoji)}`}>
          {gift.emoji || '🎁'}
        </div>
        <h3 className="font-bold text-slate-800 text-lg md:text-xl mb-2 transition-colors duration-300 group-hover:text-emerald-600">
          {gift.name}
        </h3>
        <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-6">
          {gift.description}
        </p>
      </div>

      <div className="flex items-end justify-between mt-auto pt-6 border-t border-slate-50">
        <div>
          <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mb-1 block">
            {isCustom ? 'MỨC GIÁ' : 'GIÁ TỪ'}
          </span>
          <span className="text-xl md:text-2xl font-black text-slate-800">
            {formatPrice(gift.price)}
          </span>
        </div>
        <span className="text-xs md:text-sm font-semibold text-emerald-600 flex items-center gap-1 group-hover:text-emerald-500 transition-colors">
          Tặng ngay
          <span className="transition-transform group-hover:translate-x-1 duration-200">
            &gt;
          </span>
        </span>
      </div>
    </motion.div>
  );
}

export default function GiftStoreSection() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    async function fetchGifts() {
      try {
        const res = await fetch(`${API_BASE}/gifts/public`);
        const payload = await res.json();
        const data = payload?.data || payload || [];
        setGifts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load gifts:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchGifts();
  }, []);

  return (
    <section ref={ref} id="gifts" className="relative py-24 md:py-32 overflow-hidden bg-[#fcfdfd]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.02),transparent_60%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-emerald-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-3 block">
            Cửa hàng quà tặng
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 max-w-2xl mx-auto leading-tight">
            Gửi yêu thương qua từng buổi rửa xe
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Tặng người thân những gói dịch vụ chăm sóc xe chất lượng nhất. Một món quà thiết thực và đầy ý nghĩa.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Đang tải quà tặng...</div>
        ) : gifts.length === 0 ? (
          <div className="text-center text-slate-400 py-16">Chưa có quà tặng nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {gifts.map((gift, i) => (
              <GiftCard key={gift._id || gift.id || i} gift={gift} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
