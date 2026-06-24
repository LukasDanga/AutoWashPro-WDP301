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

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        {/* ── Header ── */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold tracking-widest uppercase mb-4">
            <Building2 size={16} />
            Hệ thống chi nhánh
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Tìm chi nhánh <span className="text-emerald-600">gần bạn</span>
          </h2>
          <p className="text-slate-500 mt-4 leading-relaxed max-w-lg mx-auto">
            {branches.length} chi nhánh AutoWashPro trên toàn quốc. Chọn chi nhánh, chọn dịch vụ — chúng tôi lo phần còn lại.
          </p>
        </div>

        {/* ── Search + City Filter ── */}
        <div className="mb-10 space-y-4">
          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên chi nhánh, địa chỉ hoặc SĐT..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* City chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setActiveCity('Tất cả')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeCity === 'Tất cả'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              Tất cả
              <span className={`ml-1.5 text-xs ${activeCity === 'Tất cả' ? 'text-emerald-100' : 'text-slate-400'}`}>
                {branches.length}
              </span>
            </button>
            {cities.map(({ city, count }) => (
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

        {/* ── Branch Grid ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
            <p className="text-sm text-slate-400">Đang tải danh sách chi nhánh...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <MapPin size={48} strokeWidth={1} className="text-slate-300" />
            <p className="text-sm font-medium">
              {search ? 'Không tìm thấy chi nhánh phù hợp.' : 'Chưa có chi nhánh nào trong khu vực.'}
            </p>
            {(search || activeCity !== 'Tất cả') && (
              <button
                onClick={() => { setSearch(''); setActiveCity('Tất cả'); }}
                className="text-sm text-emerald-600 font-semibold hover:underline"
              >
                Xem tất cả chi nhánh
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-6 px-1">
              <p className="text-sm text-slate-500">
                Hiển thị <span className="font-semibold text-slate-700">{filtered.length}</span> chi nhánh
                {activeCity !== 'Tất cả' && <span> tại <span className="font-semibold text-emerald-600">{activeCity}</span></span>}
              </p>
              {(search || activeCity !== 'Tất cả') && (
                <button
                  onClick={() => { setSearch(''); setActiveCity('Tất cả'); }}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((branch, idx) => (
                  <motion.div
                    key={branch.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    onMouseEnter={() => setHoveredId(branch.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`group relative rounded-2xl border bg-white p-5 transition-all duration-300 cursor-pointer ${
                      hoveredId === branch.id
                        ? 'border-emerald-300 shadow-lg shadow-emerald-500/5 -translate-y-1'
                        : 'border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                    onClick={() => onSelectBranch?.(branch)}
                  >
                    {/* City badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <MapPin size={18} className="text-emerald-600" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
                        {branch.city}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-bold text-slate-800 text-base leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
                      {branch.name}
                    </h3>

                    {/* Info rows */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-start gap-2 text-xs text-slate-500">
                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{branch.address}</span>
                      </div>
                      {branch.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>{branch.hours}</span>
                      </div>
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
