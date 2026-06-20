import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function StarRating({ rating }) {
  return (
    <div className="flex gap-1 text-yellow-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`material-symbols-outlined text-sm ${i < rating ? 'text-yellow-400' : 'text-slate-200'}`}
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
          star
        </span>
      ))}
    </div>
  );
}

const FALLBACK_REVIEWS = [
  { name: 'Lê Văn Cường', location: 'AutoWash Pro Thủ Đức', content: 'Dịch vụ tốt, đội ngũ chuyên nghiệp, không gian chờ rất thoải mái và hiện đại. Sẽ quay lại!', rating: 5, initials: 'LC', color: 'emerald' },
  { name: 'Phạm Thị Dung', location: 'AutoWash Pro Quận 1', content: 'Rửa rất sạch, nhân viên nhiệt tình, chu đáo. Giá cả rất tương xứng với chất lượng 5 sao.', rating: 5, initials: 'PD', color: 'blue' },
  { name: 'Nguyễn Văn An', location: 'AutoWash Pro Quận 7', content: 'Công nghệ rửa tiên tiến, bảo vệ sơn xe rất tốt. Đặt lịch online cực kỳ tiện lợi.', rating: 5, initials: 'NA', color: 'violet' },
  { name: 'Trần Minh Tuấn', location: 'AutoWash Pro Bình Thạnh', content: 'Lần đầu thử dịch vụ ceramic coating rất ưng ý. Xe bóng loáng như mới, nhân viên tư vấn nhiệt tình.', rating: 5, initials: 'TT', color: 'amber' },
  { name: 'Hoàng Thị Mai', location: 'AutoWash Pro Tân Bình', content: 'Đặt lịch nhanh, rửa xe sạch, không gian chờ có cafe ngon. Rất hài lòng và sẽ giới thiệu cho bạn bè.', rating: 5, initials: 'HM', color: 'rose' },
];

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

function ReviewCard({ review }) {
  const color = COLOR_MAP[review.color] || COLOR_MAP.emerald;
  const initials = review.initials || review.name?.charAt(0) || 'K';

  return (
    <div className="w-[380px] shrink-0 p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-emerald-50 transition-all duration-500 group">
      <StarRating rating={review.rating || 5} />
      <p className="text-slate-700 mb-6 mt-4 leading-relaxed italic">"{review.content}"</p>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${color.bg} flex items-center justify-center ${color.text} font-bold text-sm`}>
          {initials}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{review.name}</div>
          <div className="text-xs text-slate-400">{review.location}</div>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ reviews, speed = 40, reverse = false, pauseOnHover = true }) {
  const doubled = [...reviews, ...reviews];

  return (
    <div className={`overflow-hidden ${pauseOnHover ? 'group/row' : ''}`}>
      <div
        className={`flex gap-6 w-max ${pauseOnHover ? '[&>*]:group-hover/row:[animation-play-state:paused]' : ''}`}
        style={{
          animation: `marquee-${reverse ? 'right' : 'left'} ${reviews.length * speed}s linear infinite`,
        }}
      >
        {doubled.map((review, i) => (
          <ReviewCard key={`${review.name}-${i}`} review={review} />
        ))}
      </div>
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
        setTestimonials(Array.isArray(data) && data.length > 0 ? data : FALLBACK_REVIEWS);
      } catch (e) {
        console.error('Failed to load testimonials:', e);
        setTestimonials(FALLBACK_REVIEWS);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonials();
  }, []);

  const leftReviews = testimonials.length > 0 ? testimonials : FALLBACK_REVIEWS;
  const rightReviews = testimonials.length > 0 ? [...testimonials].reverse() : [...FALLBACK_REVIEWS].reverse();

  return (
    <section ref={ref} id="testimonials" className="relative py-24 md:py-32 overflow-hidden bg-slate-50">
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_60%)]" />

      <div className="relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-16 px-6">
          <span className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4 block">KHÁCH HÀNG NÓI GÌ</span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900 mb-4">Hàng ngàn khách hàng hài lòng</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">Những đánh giá chân thực từ khách hàng đã trải nghiệm dịch vụ vệ sinh cao cấp tại AutoWash Pro.</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Đang tải đánh giá...</div>
        ) : (
          <div className="space-y-6">
            <MarqueeRow reviews={leftReviews} speed={35} reverse={false} />
            <MarqueeRow reviews={rightReviews} speed={45} reverse={true} />
          </div>
        )}
      </div>
    </section>
  );
}