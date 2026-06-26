import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatPrice(v) {
  return new Intl.NumberFormat('vi-VN').format(v || 0);
}

function PackageCard({ pkg, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className={`relative rounded-3xl p-8 transition-all duration-300 ${
        pkg.popular
          ? 'bg-emerald-600 text-white shadow-[0_8px_40px_-12px_rgba(16,185,129,0.5)] scale-105 md:scale-110 z-10'
          : 'bg-white border border-slate-200 text-slate-800 hover:shadow-lg hover:-translate-y-1'
      }`}>
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">
          Phổ biến nhất
        </div>
      )}
      <div className="space-y-6">
        <h3 className={`text-2xl tracking-tight font-bold ${pkg.popular ? 'text-white' : 'text-slate-900'}`}>{pkg.name}</h3>
        <p className={`text-sm ${pkg.popular ? 'text-emerald-100' : 'text-slate-400'}`}>{pkg.description}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black tracking-tight ${pkg.popular ? 'text-white' : 'text-slate-900'}`}>{formatPrice(pkg.price)}</span>
          {pkg.originalPrice > pkg.price && (
            <span className={`text-lg line-through ${pkg.popular ? 'text-emerald-300' : 'text-slate-300'}`}>{formatPrice(pkg.originalPrice)}</span>
          )}
        </div>
        {pkg.slots && <div className={`text-sm font-medium ${pkg.popular ? 'text-emerald-100' : 'text-emerald-600'}`}>{pkg.slots} lượt rửa</div>}
        <ul className="space-y-3 pt-2">
          {pkg.features?.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <svg className={`w-5 h-5 mt-0.5 shrink-0 ${pkg.popular ? 'text-emerald-200' : 'text-emerald-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className={pkg.popular ? 'text-emerald-50' : 'text-slate-500'}>{f}</span>
            </li>
          ))}
        </ul>
        <button className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          pkg.popular
            ? 'bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm'
            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
        }`}>
          Mua ngay — {formatPrice(pkg.price)}
        </button>
      </div>
    </motion.div>
  );
}

export default function PackagesSection() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch(`${API_BASE}/slot-products/public`);
        const payload = await res.json();
        const data = payload?.data || payload || [];
        setPackages(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load slot products:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  return (
    <section ref={ref} id="packages" className="relative py-24 md:py-32 overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_60%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-16">
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">Gói dịch vụ</span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900 mb-4">Chọn gói phù hợp với bạn</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base">Mua gói lượt để tiết kiệm hơn và không lo về giá khi cần rửa xe.</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Đang tải gói dịch vụ...</div>
        ) : packages.length === 0 ? (
          <div className="text-center text-slate-400 py-16">Chưa có gói dịch vụ nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start max-w-5xl mx-auto">
            {packages.map((pkg, i) => (
              <PackageCard key={pkg._id || pkg.id || i} pkg={pkg} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
