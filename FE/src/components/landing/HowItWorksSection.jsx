import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    number: '01',
    title: 'Chọn chi nhánh',
    description: 'Chọn chi nhánh gần nhất phù hợp với vị trí của bạn trên hệ thống AutoWash Pro toàn quốc.',
    image: '/images/steps/step1.jpg',
    tag: '📍 Mạng lưới toàn quốc',
  },
  {
    number: '02',
    title: 'Chọn gói dịch vụ',
    description: 'Lựa chọn gói rửa từ cơ bản đến cao cấp, kèm các phụ kiện bổ sung theo nhu cầu.',
    image: '/images/steps/step2.jpg',
    tag: '✨ Đa dạng gói rửa xe',
  },
  {
    number: '03',
    title: 'Chọn xe & thời gian',
    description: 'Chọn xe đã lưu hoặc nhập thông tin xe mới, rồi chọn ngày và khung giờ phù hợp.',
    image: '/images/steps/step3.jpg',
    tag: '⏰ Giờ hẹn chuẩn 30s',
  },
  {
    number: '04',
    title: 'Xác nhận & nhận xe',
    description: 'Xác nhận đặt chỗ, áp dụng mã giảm giá nếu có. Mang xe đến và nhận xe sạch như mới.',
    image: '/images/steps/step4.jpg',
    tag: '🛡 Xe sạch hoàn hảo 100%',
  },
];

function StepCard({ step, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`relative z-10 ${index % 2 === 0 ? 'lg:-translate-y-7' : 'lg:translate-y-5'}`}
    >
      <div className="group relative p-7 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-emerald-200/50 hover:-translate-y-2 transition-all duration-500 text-center flex flex-col items-center">
        {/* Step Badge */}
        <div className="absolute -top-3.5 px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono font-black text-xs rounded-full shadow-md shadow-emerald-500/25 tracking-wider uppercase">
          BƯỚC {step.number}
        </div>

        {/* Illustration Container with Smooth Floating Animation */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: index * 0.35,
          }}
          className="w-full aspect-square max-w-[200px] bg-gradient-to-b from-emerald-50/80 to-teal-50/30 rounded-2xl p-3 mt-2 mb-5 overflow-hidden flex items-center justify-center border border-emerald-100/80 group-hover:scale-105 transition-transform duration-500 shadow-2xs"
        >
          <img
            src={step.image}
            alt={step.title}
            className="w-full h-full object-contain mix-blend-multiply rounded-xl"
          />
        </motion.div>

        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">{step.title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed max-w-xs mb-4">{step.description}</p>
        
        <span className="mt-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 shadow-2xs">
          {step.tag}
        </span>
      </div>
    </motion.div>
  );
}

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 bg-emerald-50/30 overflow-hidden" id="services" ref={ref}>
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-emerald-200/30 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-200/30 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto text-center mb-20"
        >
          <span className="text-emerald-600 text-xs font-extrabold tracking-widest uppercase mb-3 block px-3 py-1 bg-emerald-100/60 rounded-full w-fit mx-auto border border-emerald-200/60">
            CÁCH HOẠT ĐỘNG
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-slate-900 mb-4">
            Đặt lịch trong <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">4 bước</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Quy trình đơn giản, nhanh chóng. Bạn chỉ cần chọn chi nhánh, chọn dịch vụ, chọn thời gian và xác nhận đặt chỗ.
          </p>
        </motion.div>

        {/* Cards Grid with Decorative Staggered Curved Connector Line */}
        <div className="relative">
          {/* Desktop SVG Dotted Connecting Wave Line */}
          <div className="hidden lg:block absolute top-1/2 left-12 right-12 -translate-y-1/2 pointer-events-none z-0">
            <svg className="w-full h-24" viewBox="0 0 1000 100" fill="none" preserveAspectRatio="none">
              <path
                d="M 50 60 Q 250 10 500 60 T 950 60"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                className="opacity-40"
              />
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-center relative z-10">
            {steps.map((step, index) => (
              <StepCard key={step.number} step={step} index={index} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <button
            onClick={() => navigate('/booking')}
            className="px-9 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full font-bold text-sm hover:from-emerald-500 hover:to-teal-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-emerald-500/25 cursor-pointer"
          >
            Đặt lịch ngay ✨
          </button>
        </motion.div>
      </div>
    </section>
  );
}
