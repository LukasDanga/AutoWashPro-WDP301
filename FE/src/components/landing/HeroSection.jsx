import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoBackground from './VideoBackground';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATIC_STATS = [
  { num: '2k+', label: 'LƯỢT RỬA' },
  { num: '100.0%', label: 'HÀI LÒNG' },
  { num: '5', label: 'CHI NHÁNH' },
];

function formatNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k+`;
  return `${n}+`;
}

export default function HeroSection() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(STATIC_STATS);

  useEffect(() => {
    fetch(`${API_BASE}/stats/public`)
      .then(r => r.json())
      .then(payload => {
        const d = payload?.data;
        if (!d) return;
        setStats([
          { num: formatNum(d.totalCompleted), label: 'LƯỢT RỬA' },
          { num: d.satisfactionRate, label: 'HÀI LÒNG' },
          { num: `${d.totalBranches}`, label: 'CHI NHÁNH' },
        ]);
      })
      .catch(() => {});
  }, []);

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
            <div className="mb-5 md:mb-6">
              <span className="text-emerald-400 font-semibold text-xs md:text-sm tracking-widest uppercase">
                Hệ thống đặt lịch thông minh
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-none text-white mb-2 md:mb-3 drop-shadow-lg">
              AutoWash Pro
            </h1>

            <p className="text-white/60 md:text-white/70 text-sm md:text-lg max-w-lg mx-auto leading-relaxed mb-6 md:mb-8 drop-shadow px-2">
              Đặt lịch rửa xe trực tuyến nhanh chóng tại các chi nhánh trên toàn quốc. Trải nghiệm dịch vụ chăm sóc xe chuyên nghiệp nhất.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3 mb-8 md:mb-10"
          >
            <motion.button
              onClick={() => navigate('/map')}
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
              onClick={() => navigate('/booking')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-6 md:px-7 py-2.5 md:py-3 rounded-xl border border-white/30 bg-white/10 text-white font-medium text-sm
                hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              Cuộn để khám phá
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-5 md:gap-10"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg md:text-2xl font-bold text-white tracking-tight drop-shadow">
                  {stat.num}
                </div>
                <div className="text-[11px] md:text-xs text-white/50 mt-0.5 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
