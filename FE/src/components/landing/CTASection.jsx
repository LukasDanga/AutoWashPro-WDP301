import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 bg-slate-50 overflow-hidden" ref={ref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_60%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto text-center"
        >
          <span className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4 block">
            BẮT ĐẦU NGAY
          </span>
          <h2 className="inline-block text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-slate-900 mb-6 whitespace-nowrap">
            Sẵn sàng để xe bạn luôn sạch?
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-[65ch] mx-auto mb-10">
            Đăng ký ngay để nhận ưu đãi lần đầu và trải nghiệm hệ thống đặt lịch
            thông minh của AutoWashPro.
          </p>

          <motion.button
            onClick={() => navigate('/auth')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-10 py-4 rounded-full bg-emerald-600 text-white font-semibold text-lg
              shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)]
              hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)]
              hover:bg-emerald-500 transition-all duration-300"
          >
            Đăng ký miễn phí
          </motion.button>

          <p className="text-slate-400 text-sm mt-4">Miễn phí đăng ký, không cần thẻ tín dụng</p>
        </motion.div>
      </div>
    </section>
  );
}
