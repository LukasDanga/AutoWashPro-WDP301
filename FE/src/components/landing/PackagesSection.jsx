import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const packages = [
  {
    name: 'Cơ bản',
    slots: 5,
    price: 399000,
    originalPrice: 495000,
    features: ['Rửa cơ bản', 'Xịt gầm', 'Lau khô', 'Hút bụi nhanh'],
    popular: false,
  },
  {
    name: 'Tiêu chuẩn',
    slots: 10,
    price: 699000,
    originalPrice: 990000,
    features: ['Rửa cơ bản', 'Rửa cao cấp', 'Vệ sinh nội thất', 'Ưu tiên xếp lịch'],
    popular: true,
  },
  {
    name: 'Cao cấp',
    slots: 20,
    price: 1190000,
    originalPrice: 1980000,
    features: ['Tất cả dịch vụ', 'Phủ ceramic giảm 20%', 'Ưu tiên khung giờ VIP', 'Hỗ trợ ưu tiên 24/7'],
    popular: false,
  },
];

function formatPrice(v) {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function PackageCard({ pkg, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`relative p-8 md:p-10 rounded-[2rem] border transition-all ${
        pkg.popular
          ? 'border-emerald-300 bg-emerald-50/50 shadow-[0_8px_30px_-10px_rgba(16,185,129,0.15)]'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-sm">
          Phổ biến nhất
        </div>
      )}

      <h3 className="text-xl font-bold text-slate-800 mb-2">{pkg.name}</h3>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold text-slate-900">{formatPrice(pkg.price)}</span>
        <span className="text-slate-400 line-through text-sm">{formatPrice(pkg.originalPrice)}</span>
      </div>

      <div className="mb-6">
        <span className="text-emerald-600 font-bold text-lg">{pkg.slots} slot</span>
        <span className="text-slate-400 text-sm ml-1">rửa</span>
      </div>

      <ul className="space-y-3 mb-8">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300
        bg-emerald-600 text-white shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)]
        hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)] hover:bg-emerald-500">
        Mua ngay
      </button>
    </motion.div>
  );
}

export default function PackagesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="packages" className="relative py-24 md:py-32 bg-slate-50 overflow-hidden" ref={ref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-16"
        >
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Gói slot
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900">
            Mua gói, tiết kiệm hơn
          </h2>
          <p className="text-slate-500 mt-6 leading-relaxed max-w-[65ch]">
            Chọn gói slot rửa xe phù hợp với nhu cầu. Tiết kiệm đến 40% so với mua lẻ.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <PackageCard key={pkg.name} pkg={pkg} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
