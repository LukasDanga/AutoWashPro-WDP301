import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatPrice(v) {
  return v ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : 'Tuỳ chọn';
}

function GiftCard({ gift, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`group relative rounded-2xl p-6 border transition-all duration-300 bg-white border-slate-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}>
      <div className={`text-4xl mb-4`}>{gift.emoji || '🎁'}</div>
      <h3 className="font-semibold text-slate-800 text-base mb-1.5">{gift.name}</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">{gift.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-emerald-600 font-bold text-sm">{formatPrice(gift.price)}</span>
        <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">Tặng ngay →</span>
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
    <section ref={ref} id="gifts" className="relative py-24 md:py-32 overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.03),transparent_60%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-16">
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">Cửa hàng quà tặng</span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900 mb-4">Gửi yêu thương qua từng buổi rửa xe</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base">Tặng người thân những gói dịch vụ chăm sóc xe chất lượng nhất.</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Đang tải quà tặng...</div>
        ) : gifts.length === 0 ? (
          <div className="text-center text-slate-400 py-16">Chưa có quà tặng nào.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {gifts.map((gift, i) => (
              <GiftCard key={gift._id || gift.id || i} gift={gift} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
