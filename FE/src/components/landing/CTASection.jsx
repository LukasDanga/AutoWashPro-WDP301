import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Shield, Zap, Clock, Gift, ArrowRight, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  { icon: Zap, text: 'Đặt lịch chỉ 30 giây', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Shield, text: 'Bảo vệ sơn xe chuẩn quốc tế', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Clock, text: 'Chọn giờ linh hoạt 24/7', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Gift, text: 'Ưu đãi thành viên lên đến 15%', color: 'text-violet-500', bg: 'bg-violet-50' },
];

const TRUST_ITEMS = [
  'Không cần thẻ tín dụng',
  'Hủy miễn phí trước 2 tiếng',
  'Hoàn tiền 100% nếu không hài lòng',
];

export default function CTASection({ onOpenAuth }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMCA0djJIMnYtMmgzNG0wIDR2Mkgudi0yaDN0bTAgNGgydi0yaDN0bTAgNGgydi0yaDN0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-emerald-100 text-sm font-semibold tracking-widest uppercase mb-5">
              <Gift size={16} />
              Ưu đãi đặc biệt
            </span>

            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
              Bắt đầu ngay
              <br />
              <span className="text-emerald-100">Sẵn sàng để xe bạn luôn sạch?</span>
            </h2>

            <p className="text-emerald-100/80 text-lg leading-relaxed max-w-[50ch] mb-8">
              Đăng ký ngay để nhận ưu đãi lần đầu và trải nghiệm hệ thống đặt lịch thông minh của AutoWashPro.
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {FEATURES.map(({ icon: Icon, text, color, bg }, idx) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10"
                >
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={color} />
                  </div>
                  <span className="text-sm font-medium text-white">{text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <button
                onClick={onOpenAuth}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-emerald-700 font-bold text-lg shadow-xl shadow-emerald-700/20 hover:shadow-2xl hover:shadow-emerald-700/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                Đăng ký miễn phí
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-emerald-100/70 text-sm">Miễn phí đăng ký, không cần thẻ tín dụng</p>
            </motion.div>
          </motion.div>

          {/* Right: Visual card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-white/10 rounded-3xl blur-2xl scale-95" />

              {/* Main card */}
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AutoWashPro</h3>
                    <p className="text-emerald-100/70 text-sm">Hệ thống rửa xe thông minh</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '50K+', label: 'Khách hàng' },
                    { value: '50K+', label: 'Lượt rửa' },
                    { value: '4.9', label: 'Đánh giá' },
                  ].map(({ value, label }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                      <div className="text-xl font-extrabold text-white">{value}</div>
                      <div className="text-[11px] text-emerald-100/60 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Trust items */}
                <div className="space-y-2.5 pt-2">
                  {TRUST_ITEMS.map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-emerald-100/90">
                      <CheckCircle2 size={16} className="text-emerald-200 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Fake notification */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-400/30 flex items-center justify-center text-white font-bold text-sm">
                      TK
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">Trần Kim T.</p>
                      <p className="text-xs text-emerald-100/60">Vừa đặt lịch thành công 5 phút trước</p>
                    </div>
                    <span className="text-[10px] text-emerald-200 bg-emerald-400/20 px-2 py-1 rounded-full font-medium">Mới</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
