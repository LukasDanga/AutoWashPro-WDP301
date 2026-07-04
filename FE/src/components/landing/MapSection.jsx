import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getCities(branches) {
  const set = new Set(branches.map(b => b.city).filter(Boolean));
  return ['Tất cả', ...Array.from(set)];
}

function parseSvgPaths(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const paths = doc.querySelectorAll('path');
  return Array.from(paths).map(p => ({
    id: p.getAttribute('id') || '',
    name: p.getAttribute('name') || '',
    d: p.getAttribute('d') || '',
  }));
}

export default function MapSection({ onSelectBranch }) {
  const navigate = useNavigate();
  const [activeCity, setActiveCity] = useState('Tất cả');
  const [selectedId, setSelectedId] = useState(null);
  const [provincePaths, setProvincePaths] = useState([]);
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [branches, setBranches] = useState([]);
  const [cities, setCities] = useState(['Tất cả']);

  useEffect(() => {
    fetch('/assets/vietnam.svg')
      .then(r => r.text())
      .then(text => {
        const paths = parseSvgPaths(text);
        setProvincePaths(paths);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/branches/public`)
      .then(r => r.json())
      .then(res => {
        const list = (res?.data || []).map(b => ({
          id: b._id,
          city: b.city || '',
          name: b.name.replace(/^AutoWash\s*/, ''),
          address: b.address,
          phone: b.phone || '',
          email: b.email || '',
          hours: (b.openingTime || '07:00') + ' - ' + (b.closingTime || '18:00'),
          cx: b.mapCoordinates?.svgCx || 0,
          cy: b.mapCoordinates?.svgCy || 0,
        })).filter(b => b.cx && b.cy);
        setBranches(list);
        setCities(getCities(list));
      })
      .catch(() => {});
  }, []);

  const filtered = activeCity === 'Tất cả' ? branches : branches.filter((b) => b.city === activeCity);
  const selected = branches.find((b) => b.id === selectedId);

  return (
    <section id="map" className="relative py-24 md:py-32 bg-neutral-950 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_60%)]" />

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
                key={b.id}
                onClick={() => navigate(`/branch/${b.id}`)}
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200 text-sm">{b.name}</span>
                      <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{b.city}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{b.address}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
                       <span>{b.hours}</span>
                       {b.phone && <span>📞 {b.phone}</span>}
                     </div>
                     {b.email && (
                       <div className="mt-1 text-xs text-neutral-500">
                         ✉️ {b.email}
                       </div>
                     )}
                     <div className="mt-2 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                       Xem chi tiết →
                     </div>
                  </div>
                </div>
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
                    <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{selected.city}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 mb-4">
                     <span>🕐 {selected.hours}</span>
                     {selected.phone && <span>📞 {selected.phone}</span>}
                     {selected.email && <span>✉️ {selected.email}</span>}
                   </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/branch/${selected.id}`)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 text-sm font-medium hover:bg-neutral-800 transition-colors"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => navigate(`/booking?branchId=${selected.id}`)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
                    >
                      Đặt lịch tại đây
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
