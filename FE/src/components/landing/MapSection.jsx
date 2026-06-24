import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, Search, Building2, ArrowRight, Car } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getCities(branches) {
  const map = {};
  branches.forEach(b => {
    if (b.city) map[b.city] = (map[b.city] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ city, count }));
}

export default function MapSection({ onSelectBranch }) {
  const [activeCity, setActiveCity] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/branches/public`)
      .then(r => r.json())
      .then(res => {
        const list = (res?.data || []).map(b => ({
          id: b._id,
          city: b.city || '',
          name: b.name,
          address: b.address,
          phone: b.phone || '',
          hours: (b.openingTime || '07:00') + ' - ' + (b.closingTime || '18:00'),
          status: b.status || 'active',
        }));
        setBranches(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => getCities(branches), [branches]);

  const filtered = useMemo(() => {
    let list = branches;
    if (activeCity !== 'Tất cả') {
      list = list.filter(b => b.city === activeCity);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.phone.includes(q)
      );
    }
    return list;
  }, [branches, activeCity, search]);

  return (
    <section id="map" className="relative py-24 md:py-32 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.04),transparent_60%)]" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="max-w-xl mb-8">
              <span className="text-emerald-400 text-sm font-medium tracking-widest uppercase mb-4 block">
                Hệ thống chi nhánh
              </span>
              <h2 className="text-3xl md:text-5xl tracking-tighter leading-none text-white">
                Tìm chi nhánh gần bạn
              </h2>
              <p className="text-neutral-400 mt-4 leading-relaxed"> {branches.length} chi nhánh trên toàn quốc. Chọn chi nhánh và đặt lịch ngay.</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
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

            <div className="space-y-3">
              {filtered.map((b) => (
              <button
                key={city}
                onClick={() => setActiveCity(city)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeCity === city
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {city}
                <span className={`ml-1.5 text-xs ${activeCity === city ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          </div>

          <div className="lg:col-span-3">
            <div className="relative h-full rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden backdrop-blur-sm"
              style={{
                boxShadow: 'inset 0 0 80px rgba(16,185,129,0.04), 0 0 60px rgba(16,185,129,0.02)',
              }}
            >
              <svg viewBox="0 0 812 872" className="w-full h-full" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur3" />
                    <feMerge>
                      <feMergeNode in="blur3" />
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="neon-glow-intense" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="25" result="blur3" />
                    <feMerge>
                      <feMergeNode in="blur3" />
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="marker-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="bg-glow" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.06)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                  </radialGradient>
                </defs>

                <rect width="812" height="872" fill="url(#bg-glow)" />

                {provincePaths.map((p) => (
                  <path
                    key={p.id}
                    d={p.d}
                    fill={hoveredProvince === p.id ? 'rgba(16,185,129,0.08)' : 'transparent'}
                    stroke={hoveredProvince === p.id ? '#34d399' : 'rgba(16,185,129,0.25)'}
                    strokeWidth={hoveredProvince === p.id ? '1.2' : '0.5'}
                    filter={hoveredProvince === p.id ? 'url(#neon-glow)' : undefined}
                    onMouseEnter={() => setHoveredProvince(p.id)}
                    onMouseLeave={() => setHoveredProvince(null)}
                    style={{ transition: 'all 0.2s ease', cursor: 'default' }}
                  />
                ))}

                {branches.map((b) => (
                  <g key={b.id} onClick={() => setSelectedId(b.id)} className="cursor-pointer">
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={selectedId === b.id ? 14 : 10}
                      fill="transparent"
                      stroke={selectedId === b.id ? '#10b981' : 'transparent'}
                      strokeWidth="2"
                      filter={selectedId === b.id ? 'url(#marker-glow)' : undefined}
                    />
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={selectedId === b.id ? 6 : 4}
                      fill={selectedId === b.id ? '#10b981' : '#34d399'}
                      stroke="#059669"
                      strokeWidth="1.5"
                      filter="url(#marker-glow)"
                    />
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={selectedId === b.id ? 8 : 6}
                      fill="rgba(16,185,129,0.15)"
                      stroke="none"
                    />
                    {selectedId === b.id && (
                      <>
                        <circle
                          cx={b.cx}
                          cy={b.cy}
                          r="18"
                          fill="none"
                          stroke="rgba(16,185,129,0.3)"
                          strokeWidth="1"
                        >
                          <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}
                    <text
                      x={b.cx}
                      y={b.cy - (selectedId === b.id ? 14 : 10)}
                      textAnchor="middle"
                      className="text-[5px]"
                      fill={selectedId === b.id ? '#10b981' : '#6ee7b7'}
                      fontWeight={selectedId === b.id ? 'bold' : 'normal'}
                      filter={selectedId === b.id ? 'url(#marker-glow)' : undefined}
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
                  className="absolute bottom-4 left-4 right-4 p-5 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-lg backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-neutral-200">{selected.name}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">{selected.address}</p>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400 font-medium">Rửa xe ngay</span>
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold group-hover:gap-2 transition-all">
                        Đặt lịch
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Hover accent line */}
                    <div className={`absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full transition-all duration-300 ${
                      hoveredId === branch.id ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                    }`} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ── Bottom CTA ── */}
        <div className="mt-14 text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Car size={18} className="text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">Đã chọn được chi nhánh?</p>
              <p className="text-xs text-slate-500">Đặt lịch rửa xe chỉ trong 3 bước đơn giản.</p>
            </div>
            <a
              href="/booking"
              className="ml-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-500/10 whitespace-nowrap"
            >
              Đặt lịch ngay
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
