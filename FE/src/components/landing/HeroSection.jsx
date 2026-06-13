import { motion } from 'framer-motion';
import VideoBackground from './VideoBackground';

export default function HeroSection({ onOpenAuth }) {
  return (
    <section className="relative min-h-[80vh] md:min-h-screen flex items-center overflow-hidden">
      <VideoBackground />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-5 md:px-12 pt-16 md:pt-20">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 md:px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-5 md:mb-6 drop-shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-200 text-xs font-medium tracking-wide">
                Hệ thống đặt lịch thông minh
              </span>
            </div>

            <h1 className="text-[2rem] md:text-5xl lg:text-6xl tracking-tighter leading-none text-white mb-2 md:mb-3 drop-shadow-lg">
              Auto
              <span className="text-emerald-400">Wash</span>
              <span className="text-white/40">Pro</span>
            </h1>

            <p className="text-white/60 md:text-white/70 text-sm md:text-lg max-w-lg mx-auto leading-relaxed mb-6 md:mb-8 drop-shadow px-2">
              Đặt lịch rửa xe trực tuyến nhanh chóng tại các chi nhánh trên toàn quốc.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3 mb-8 md:mb-10"
          >
            <motion.button
              onClick={onOpenAuth}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-6 md:px-7 py-2.5 md:py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm
                shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)]
                hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)]
                hover:bg-emerald-400 transition-all duration-300"
            >
              Bắt đầu ngay
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-6 md:px-7 py-2.5 md:py-3 rounded-xl border border-white/30 bg-white/10 text-white font-medium text-sm
                hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              Khám phá dịch vụ
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-5 md:gap-10"
          >
            {[
              { num: '15K+', label: 'Lượt rửa' },
              { num: '98.7%', label: 'Hài lòng' },
              { num: '12', label: 'Chi nhánh' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg md:text-2xl font-bold text-white tracking-tight drop-shadow">
                  {stat.num}
                </div>
                <div className="text-[11px] md:text-xs text-white/50 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
