import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const testimonials = [
  {
    name: 'Minh Hoàng Nguyễn',
    role: 'Tài xế công nghệ',
    content: 'Đặt lịch nhanh, tới đúng giờ là được phục vụ ngay. Tiết kiệm cả buổi sáng chờ đợi so với các tiệm rửa xe thông thường.',
    rating: 5,
    location: 'Hà Nội',
  },
  {
    name: 'Thanh Trúc Lê',
    role: 'Nhân viên văn phòng',
    content: 'Dịch vụ rửa nội thất rất kỹ, ghế da được vệ sinh sạch sẽ. Mình đặt lịch online qua app, tiện lợi và yên tâm.',
    rating: 5,
    location: 'TP. Hồ Chí Minh',
  },
  {
    name: 'Quốc Bảo Trần',
    role: 'Chủ doanh nghiệp',
    content: 'Gói phủ ceramic chất lượng hơn hẳn so với các nơi khác mình từng làm. Xe mình luôn sáng bóng sau mỗi lần rửa.',
    rating: 5,
    location: 'Đà Nẵng',
  },
];

function TestimonialCard({ testimonial, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-white
        hover:border-slate-300 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)]
        transition-all duration-500"
    >
      <div className="flex gap-1 mb-6">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <svg key={i} className="w-5 h-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      <blockquote className="text-slate-600 leading-relaxed mb-8">
        &ldquo;{testimonial.content}&rdquo;
      </blockquote>

      <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-500">
            {testimonial.name.split(' ').slice(-2).map((n) => n[0]).join('')}
          </span>
        </div>
        <div>
          <div className="text-slate-800 font-medium text-sm">{testimonial.name}</div>
          <div className="text-slate-400 text-xs mt-0.5">
            {testimonial.role} &middot; {testimonial.location}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-32 bg-slate-50 overflow-hidden" ref={ref}>
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
        bg-[radial-gradient(ellipse,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-16"
        >
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Khách hàng nói gì
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900">
            Được tin dùng bởi hàng ngàn chủ xe
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
