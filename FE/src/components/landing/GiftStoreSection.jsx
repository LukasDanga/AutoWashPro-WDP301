import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const gifts = [
  {
    name: 'Voucher rửa xe',
    desc: 'Tặng bạn bè một lần rửa xe cao cấp bất kì chi nhánh',
    price: 249000,
    emoji: '🎁',
    bg: 'from-rose-50 to-amber-50',
  },
  {
    name: 'Gói chăm sóc 3 tháng',
    desc: '3 tháng rửa xe không giới hạn số lần, tặng kèm vệ sinh nội thất',
    price: 599000,
    emoji: '✨',
    bg: 'from-blue-50 to-cyan-50',
  },
  {
    name: 'Phiếu quà tặng',
    desc: 'Thẻ quà tặng mệnh giá tuỳ chọn, có thể nạp vào tài khoản',
    price: 0,
    emoji: '💳',
    bg: 'from-purple-50 to-pink-50',
    custom: true,
  },
  {
    name: 'Combo rửa + phủ Ceramic',
    desc: 'Gói phủ ceramic cao cấp + 5 lần rửa miễn phí',
    price: 1790000,
    emoji: '🌟',
    bg: 'from-emerald-50 to-teal-50',
  },
  {
    name: 'Gói chăm sóc nội thất',
    desc: 'Giặt ghế, vệ sinh trần, khử mùi chuyên sâu + bảo dưỡng da',
    price: 799000,
    emoji: '🧹',
    bg: 'from-orange-50 to-yellow-50',
  },
  {
    name: 'Thẻ VIP thành viên',
    desc: 'Giảm 15% tất cả dịch vụ, ưu tiên xếp lịch, hỗ trợ 24/7',
    price: 299000,
    emoji: '👑',
    bg: 'from-slate-50 to-zinc-50',
  },
];

function formatPrice(v) {
  return v === 0 ? 'Tuỳ chọn' : v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function GiftCard({ gift, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative p-6 md:p-8 rounded-[2rem] border border-slate-200 bg-white
        hover:border-slate-300 hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)]
        transition-all duration-500"
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gift.bg} flex items-center justify-center text-2xl mb-5
        border border-white/50`}>
        {gift.emoji}
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-2">{gift.name}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6 min-h-[40px]">{gift.desc}</p>

      <div className="flex items-center justify-between pt-5 border-t border-slate-100">
        <span className="text-xl font-bold text-slate-900 tracking-tight">{formatPrice(gift.price)}</span>
        <button className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium
          hover:bg-emerald-600 hover:text-white transition-all duration-300">
          {gift.custom ? 'Chọn mệnh giá' : 'Tặng ngay'}
        </button>
      </div>
    </motion.div>
  );
}

export default function GiftStoreSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="giftstore" className="relative py-24 md:py-32 bg-white overflow-hidden" ref={ref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.02),transparent_50%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-16"
        >
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Quà tặng
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900">
            Cửa hàng quà tặng
          </h2>
          <p className="text-slate-500 mt-6 leading-relaxed max-w-[65ch]">
            Tặng người thân và bạn bè những trải nghiệm chăm sóc xe chất lượng.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gifts.map((gift, index) => (
            <GiftCard key={gift.name} gift={gift} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
