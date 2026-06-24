import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CARD_BG = ['bg-white'];

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-amber-400' : 'text-slate-200'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

const FALLBACK_REVIEWS = [
  { name: 'Anh Hạnh', location: 'AutoWash Cầu Giấy', content: 'Rất ấn tượng với trải nghiệm mượt mà, giác tôi kiểm tra ngay trên chi nhánh. Chỉ cần vài chạm và có xe là sạch.', rating: 5, initials: 'AH', color: 'emerald' },
  { name: 'Chị Minh', location: 'AutoWash Thu Duc', content: 'Rất ấn tượng với trải nghiệm mượt mà, giác tôi kiểm tra ngay trên chi nhánh. Chỉ cần vài chạm và có xe là sạch.', rating: 5, initials: 'CM', color: 'blue' },
  { name: 'Anh Thành', location: 'AutoWash Quận 1', content: 'Rất ấn tượng với trải nghiệm mượt mà, giác tôi kiểm tra ngay trên chi nhánh. Chỉ cần vài chạm và có xe là sạch.', rating: 5, initials: 'AT', color: 'violet' },
  // Duplicate for alternating effect
  { name: 'Chị Lan', location: 'AutoWash Quận 7', content: 'Rất ấn tượng với trải nghiệm mượt mà, giác tôi kiểm tra ngay trên chi nhánh. Chỉ cần vài chạm và có xe là sạch.', rating: 5, initials: 'CL', color: 'emerald' },
  { name: 'Anh Hoàng', location: 'AutoWash Đà Nẵng', content: 'Rất ấn tượng với trải nghiệm mượt mà, giác tôi kiểm tra ngay trên chi nhánh. Chỉ cần vài chạm và có xe là sạch.', rating: 5, initials: 'AH', color: 'blue' },
  { name: 'Chị Nga', location: 'AutoWash Hải Châu', content: 'Rất ấn tượng với trải nghiệm mượt mà, giác tôi kiểm tra ngay trên chi nhánh. Chỉ cần vài chạm và có xe là sạch.', rating: 5, initials: 'CN', color: 'violet' },
];

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
};

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const res = await fetch(`${API_BASE}/testimonials`);
        const payload = await res.json();
        const data = payload?.data || payload || [];
        setTestimonials(Array.isArray(data) && data.length > 0 ? data : FALLBACK_REVIEWS);
      } catch (e) {
        setTestimonials(FALLBACK_REVIEWS);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonials();
  }, []);

  const items = testimonials.length > 0 ? testimonials : FALLBACK_REVIEWS;

  return (
    <section ref={ref} id="testimonials" className="relative py-24 md:py-32 overflow-hidden bg-emerald-50/30">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-16">
          <span className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4 block">KHÁCH HÀNG NÓI GÌ</span>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-slate-900 mb-4">Hàng ngàn khách hàng hài lòng</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">Những đánh giá chân thực từ khách hàng đã trải nghiệm dịch vụ tại AutoWash Pro.</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Đang tải đánh giá...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.slice(0, 6).map((t, i) => {
              const color = COLOR_MAP[t.color] || COLOR_MAP.emerald;
              const initials = t.initials || t.name?.charAt(0) || 'K';
              const bgClass = CARD_BG[i % CARD_BG.length];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`${bgClass} border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:shadow-emerald-50/50 transition-all duration-500`}>
                  <StarRating rating={t.rating || 5} />
                  <p className="text-sm text-slate-600 leading-relaxed mt-4 mb-6 italic">"{t.content}"</p>
                  <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
                    <div className={`w-10 h-10 rounded-full ${color.bg} flex items-center justify-center ${color.text} text-sm font-bold`}>
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.location}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
