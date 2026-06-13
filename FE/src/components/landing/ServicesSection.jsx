import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const services = [
  {
    title: 'Rửa xe cơ bản',
    description: 'Làm sạch ngoại thất với hệ thống máy phun áp lực cao và dung dịch chuyên dụng.',
    price: '99.000đ',
    duration: '30 phút',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 15h4l2 3h10l2-3h4" />
        <path d="M3 15v-2a2 2 0 012-2h14a2 2 0 012 2v2" />
        <path d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4" />
      </svg>
    ),
  },
  {
    title: 'Rửa xe cao cấp',
    description: 'Vệ sinh toàn diện nội thất, ngoại thất, đánh bóng sơn và bảo dưỡng nhanh.',
    price: '249.000đ',
    duration: '60 phút',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: 'Đánh bóng - Phủ ceramic',
    description: 'Phủ lớp bảo vệ ceramic cao cấp, giữ xe sáng bóng trong 12 tháng.',
    price: '1.490.000đ',
    duration: '180 phút',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l2.5 5.1L20 9l-4 3.9L17.5 19 12 16 6.5 19 8 12.9 4 9l5.5-.9L12 3z" />
      </svg>
    ),
  },
  {
    title: 'Vệ sinh nội thất',
    description: 'Giặt ghế, vệ sinh trần xe, bảng điều khiển và khử mùi chuyên sâu.',
    price: '399.000đ',
    duration: '90 phút',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 7h-4a2 2 0 01-2-2V3a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path d="M16 21H4a2 2 0 01-2-2V9a2 2 0 012-2h2" />
      </svg>
    ),
  },
];

function ServiceCard({ service, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-white
        hover:border-emerald-200 hover:shadow-[0_8px_30px_-10px_rgba(16,185,129,0.1)]
        transition-all duration-500"
    >
      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200
        flex items-center justify-center text-emerald-600 mb-6
        group-hover:bg-emerald-100 transition-colors duration-300">
        {service.icon}
      </div>

      <h3 className="text-xl font-semibold text-slate-800 mb-3 tracking-tight">
        {service.title}
      </h3>
      <p className="text-slate-500 leading-relaxed mb-6">
        {service.description}
      </p>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">{service.price}</span>
          <span className="text-slate-400 text-sm ml-2">/ lần</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {service.duration}
        </div>
      </div>
    </motion.div>
  );
}

export default function ServicesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-32 bg-slate-50 overflow-hidden" ref={ref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-16"
        >
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Dịch vụ
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900">
            Mọi nhu cầu chăm sóc xe của bạn
          </h2>
          <p className="text-slate-500 mt-6 leading-relaxed max-w-[65ch]">
            Từ rửa cơ bản đến phủ ceramic cao cấp, chúng tôi có giải pháp phù hợp
            cho từng dòng xe và ngân sách của bạn.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
