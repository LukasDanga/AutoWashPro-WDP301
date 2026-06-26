import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    number: '01',
    title: 'Chọn chi nhánh',
    description: 'Chọn chi nhánh gần nhất phù hợp với vị trí của bạn trên hệ thống AutoWash Pro toàn quốc.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Chọn gói dịch vụ',
    description: 'Lựa chọn gói rửa từ cơ bản đến cao cấp, kèm các phụ kiện bổ sung theo nhu cầu.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Chọn xe & thời gian',
    description: 'Chọn xe đã lưu hoặc nhập thông tin xe mới, rồi chọn ngày và khung giờ phù hợp.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Xác nhận & nhận xe',
    description: 'Xác nhận đặt chỗ, áp dụng mã giảm giá nếu có. Mang xe đến và nhận xe sạch như mới.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
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
      className="relative"
    >
        <div className="group relative p-8 bg-white border border-slate-200 rounded-2xl shadow-lg shadow-emerald-100/50 hover:shadow-xl hover:shadow-emerald-100 hover:-translate-y-1 transition-all duration-500">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
          {step.icon}
        </div>
        <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider block mb-2">{step.number}</span>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{step.title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
}

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 bg-emerald-50/30" id="services" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <span className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4 block">CÁCH HOẠT ĐỘNG</span>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-slate-900 mb-4">Đặt lịch trong 4 bước</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Quy trình đơn giản, nhanh chóng. Bạn chỉ cần chọn chi nhánh, chọn dịch vụ, chọn thời gian và xác nhận đặt chỗ.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => navigate('/booking')}
            className="px-8 py-3 bg-emerald-600 text-white rounded-full font-semibold text-sm hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-emerald-200"
          >
            Đặt lịch ngay
          </button>
        </motion.div>
      </div>
    </section>
  );
}
