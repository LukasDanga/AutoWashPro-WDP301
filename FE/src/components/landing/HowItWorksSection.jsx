import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    number: '01',
    title: 'Chọn gói dịch vụ',
    description: 'Duyệt qua các gói dịch vụ phù hợp với nhu cầu của xe bạn.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Chọn chi nhánh & thời gian',
    description: 'Chọn chi nhánh gần nhất và khung giờ phù hợp với lịch của bạn.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Mang xe đến',
    description: 'Đưa xe đến chi nhánh đã đặt, đội ngũ kỹ thuật sẵn sàng phục vụ.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Nhận xe & thanh toán',
    description: 'Nhận xe sạch sẽ, thanh toán linh hoạt qua ví hoặc tiền mặt.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 1v22M22 12H2" />
        <circle cx="12" cy="12" r="10" />
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
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-16 left-8 w-[calc(100%+1.5rem)] h-px bg-gradient-to-r from-emerald-200 to-transparent" />
      )}
      <div className="relative flex gap-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200
            flex items-center justify-center text-emerald-600 shrink-0">
            {step.icon}
          </div>
        </div>
        <div className="pt-3">
          <span className="text-emerald-400 text-sm font-mono mb-2 block">
            {step.number}
          </span>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{step.title}</h3>
          <p className="text-slate-500 leading-relaxed">{step.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-32 bg-white" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-16"
        >
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Cách hoạt động
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900">
            Đặt lịch trong 4 bước
          </h2>
          <p className="text-slate-500 mt-6 leading-relaxed max-w-[65ch]">
            Quy trình đơn giản, nhanh chóng. Bạn chỉ cần chọn dịch vụ, chọn thời gian,
            mang xe đến và nhận xe sạch.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
