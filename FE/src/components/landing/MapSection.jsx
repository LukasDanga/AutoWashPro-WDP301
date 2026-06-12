import { useState } from 'react';
import { motion } from 'framer-motion';

const branches = [
  { id: 'hn1', city: 'Hà Nội', name: 'Cầu Giấy', address: '122 Cầu Giấy, Q. Cầu Giấy', phone: '0888.123.456', hours: '06:00 - 20:00', x: 52, y: 18 },
  { id: 'hn2', city: 'Hà Nội', name: 'Thanh Xuân', address: 'Nguyễn Trãi, Q. Thanh Xuân', phone: '0888.123.457', hours: '06:00 - 20:00', x: 48, y: 22 },
  { id: 'hcm1', city: 'TP.HCM', name: 'Quận 1', address: 'Lê Lợi, P. Bến Nghé', phone: '0888.123.458', hours: '06:00 - 21:00', x: 52, y: 72 },
  { id: 'hcm2', city: 'TP.HCM', name: 'Thủ Đức', address: 'Võ Văn Ngân, P. Linh Chiểu', phone: '0888.123.459', hours: '06:00 - 21:00', x: 57, y: 75 },
  { id: 'dn1', city: 'Đà Nẵng', name: 'Hải Châu', address: 'Nguyễn Văn Linh, Q. Hải Châu', phone: '0888.123.460', hours: '06:00 - 20:00', x: 47, y: 43 },
];

const cities = ['Tất cả', 'Hà Nội', 'TP.HCM', 'Đà Nẵng'];

export default function MapSection({ onSelectBranch }) {
  const [activeCity, setActiveCity] = useState('Tất cả');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = activeCity === 'Tất cả'
    ? branches
    : branches.filter((b) => b.city === activeCity);

  const selected = branches.find((b) => b.id === selectedId);

  return (
    <section id="map" className="relative py-24 md:py-32 bg-slate-50 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="max-w-xl mb-12">
          <span className="text-emerald-600 text-sm font-medium tracking-widest uppercase mb-4 block">
            Hệ thống chi nhánh
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-slate-900">
            Tìm chi nhánh gần bạn
          </h2>
          <p className="text-slate-500 mt-4 leading-relaxed">12 chi nhánh trên toàn quốc. Chọn chi nhánh và đặt lịch ngay.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => { setActiveCity(c); setSelectedId(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCity === c
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left p-5 rounded-xl border transition-all ${
                  selectedId === b.id
                    ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{b.name}</span>
                      <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">{b.city}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{b.address}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span>{b.hours}</span>
                      <span>{b.phone}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 relative">
            <div className="relative w-full aspect-[4/3] rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
              <svg viewBox="0 0 100 85" className="w-full h-full">
                <path
                  d="M30 80 Q25 60 35 50 L40 30 Q42 20 50 18 L60 20 Q65 25 63 35 L58 50 Q55 60 60 80"
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth="0.3"
                />
                <text x="50" y="12" textAnchor="middle" className="text-[3px]" fill="#94a3b8" letterSpacing="1">VIỆT NAM</text>

                {branches.map((b) => (
                  <g key={b.id}>
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={selectedId === b.id ? 3 : 2}
                      fill={selectedId === b.id ? '#059669' : '#10b981'}
                      stroke="white"
                      strokeWidth="0.8"
                      className="cursor-pointer transition-all"
                      onClick={() => setSelectedId(b.id)}
                    />
                    <text
                      x={b.x}
                      y={b.y - 3}
                      textAnchor="middle"
                      className="text-[2.5px]"
                      fill={selectedId === b.id ? '#059669' : '#64748b'}
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
                  className="absolute bottom-4 left-4 right-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">{selected.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{selected.address}</p>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">{selected.city}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                    <span>🕐 {selected.hours}</span>
                    <span>📞 {selected.phone}</span>
                  </div>
                  <button
                    onClick={() => onSelectBranch?.(selected)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold
                      hover:bg-emerald-500 transition-colors"
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
