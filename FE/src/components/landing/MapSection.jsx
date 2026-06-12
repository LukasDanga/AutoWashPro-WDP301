import { useState } from 'react';
import { motion } from 'framer-motion';

const branches = [
  { id: 'hn1', city: 'Hà Nội', name: 'Cầu Giấy', address: '122 Cầu Giấy, Q. Cầu Giấy', phone: '0888.123.456', hours: '06:00 - 20:00', cx: 555, cy: 175 },
  { id: 'hn2', city: 'Hà Nội', name: 'Thanh Xuân', address: 'Nguyễn Trãi, Q. Thanh Xuân', phone: '0888.123.457', hours: '06:00 - 20:00', cx: 535, cy: 190 },
  { id: 'hcm1', city: 'TP.HCM', name: 'Quận 1', address: 'Lê Lợi, P. Bến Nghé', phone: '0888.123.458', hours: '06:00 - 21:00', cx: 555, cy: 645 },
  { id: 'hcm2', city: 'TP.HCM', name: 'Thủ Đức', address: 'Võ Văn Ngân, P. Linh Chiểu', phone: '0888.123.459', hours: '06:00 - 21:00', cx: 590, cy: 660 },
  { id: 'dn1', city: 'Đà Nẵng', name: 'Hải Châu', address: 'Nguyễn Văn Linh, Q. Hải Châu', phone: '0888.123.460', hours: '06:00 - 20:00', cx: 495, cy: 370 },
];

const cities = ['Tất cả', 'Hà Nội', 'TP.HCM', 'Đà Nẵng'];

export default function MapSection({ onSelectBranch }) {
  const [activeCity, setActiveCity] = useState('Tất cả');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = activeCity === 'Tất cả' ? branches : branches.filter((b) => b.city === activeCity);
  const selected = branches.find((b) => b.id === selectedId);

  return (
    <section id="map" className="relative py-24 md:py-32 bg-neutral-950 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_60%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="max-w-xl mb-12">
          <span className="text-emerald-400 text-sm font-medium tracking-widest uppercase mb-4 block">
            Hệ thống chi nhánh
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-white">
            Tìm chi nhánh gần bạn
          </h2>
          <p className="text-neutral-400 mt-4 leading-relaxed">12 chi nhánh trên toàn quốc. Chọn chi nhánh và đặt lịch ngay.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => { setActiveCity(c); setSelectedId(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCity === c
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3 max-h-[550px] overflow-y-auto pr-2">
            {filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left p-5 rounded-xl border transition-all ${
                  selectedId === b.id
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200 text-sm">{b.name}</span>
                      <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{b.city}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{b.address}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
                      <span>{b.hours}</span>
                      <span>{b.phone}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            <div className="relative w-full rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden backdrop-blur-sm">
              <svg viewBox="0 0 800 850" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.15)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                  </radialGradient>
                </defs>

                <rect width="800" height="850" fill="url(#glow)" />

                <path
                  d="M520 108 L555 120 L570 140 L580 160 L575 180 L565 195 L555 210 L545 220 L535 235 L530 250
                     L525 270 L520 290 L515 310 L510 330 L505 350 L500 370 L495 385 L490 400 L485 415
                     L480 430 L475 445 L470 460 L465 475 L460 490 L455 505 L450 520 L445 535 L440 550
                     L435 565 L430 580 L425 590 L420 600 L415 610 L410 620 L405 630 L400 640
                     L395 650 L390 655 L385 660 L380 665 L375 668 L370 670 L365 672 L360 674
                     L355 675 L350 676 L345 677 L340 676 L335 674 L330 672 L325 668 L320 664
                     L315 658 L310 650 L305 640 L300 628 L295 615 L290 600 L285 585 L280 570
                     L275 555 L270 540 L265 525 L260 510 L255 495 L250 480 L245 465 L240 450
                     L235 435 L230 420 L225 405 L220 390 L215 375 L210 358 L205 340 L200 320
                     L195 300 L190 280 L185 260 L180 242 L178 225 L177 210 L178 195 L180 180
                     L185 165 L190 152 L198 140 L208 130 L220 122 L235 116 L250 112 L265 110
                     L280 109 L295 108 L310 108 L325 107 L340 107 L355 107 L370 107 L385 107
                     L400 107 L415 107 L430 107 L445 107 L460 107 L475 107 L490 107 L505 107
                     L520 108Z"
                  fill="rgba(16,185,129,0.06)"
                  stroke="rgba(16,185,129,0.3)"
                  strokeWidth="1.5"
                />

                {branches.map((b) => (
                  <g key={b.id} onClick={() => setSelectedId(b.id)} className="cursor-pointer">
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={selectedId === b.id ? 10 : 7}
                      fill={selectedId === b.id ? 'rgba(16,185,129,0.2)' : 'transparent'}
                    />
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={selectedId === b.id ? 5 : 3.5}
                      fill={selectedId === b.id ? '#10b981' : '#34d399'}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <text
                      x={b.cx}
                      y={b.cy - 8}
                      textAnchor="middle"
                      className="text-[6px]"
                      fill={selectedId === b.id ? '#10b981' : '#6ee7b7'}
                      fontWeight={selectedId === b.id ? 'bold' : 'normal'}
                    >
                      {b.name}
                    </text>
                  </g>
                ))}
              </svg>

              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-4 right-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-neutral-200">{selected.name}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">{selected.address}</p>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{selected.city}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 mb-4">
                    <span>{selected.hours}</span>
                    <span>{selected.phone}</span>
                  </div>
                  <button
                    onClick={() => onSelectBranch?.(selected)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
                  >
                    Đặt lịch tại đây
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
