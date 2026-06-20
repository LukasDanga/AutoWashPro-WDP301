import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
        setTestimonials(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load testimonials:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonials();
  }, []);

  return (
    <section ref={ref} id="testimonials" className="relative py-24 md:py-32 overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_60%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-16">
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">Khách hàng nói gì</span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900 mb-4">Hàng ngàn khách hàng hài lòng</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base">Những đánh giá chân thực từ khách hàng đã trải nghiệm dịch vụ.</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Đang tải đánh giá...</div>
        ) : testimonials.length === 0 ? (
          <div className="text-center text-slate-400 py-16">Chưa có đánh giá nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <StarRating rating={t.rating || 5} />
                <p className="text-sm text-slate-600 leading-relaxed mt-4 mb-5 italic">"{t.content}"</p>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
                    {t.name?.charAt(0) || 'K'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role || t.location || ''}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
