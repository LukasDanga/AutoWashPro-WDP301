import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { CaretLeft, CaretRight, ArrowClockwise, CalendarBlank } from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

const STATUS_COLOR = {
  pending:     { bg: 'bg-amber-400',   text: 'text-white',     border: 'border-amber-500' },
  confirmed:   { bg: 'bg-indigo-500',  text: 'text-white',     border: 'border-indigo-600' },
  checked_in:  { bg: 'bg-cyan-500',    text: 'text-white',     border: 'border-cyan-600' },
  in_progress: { bg: 'bg-blue-500',    text: 'text-white',     border: 'border-blue-600' },
  completed:   { bg: 'bg-emerald-500', text: 'text-white',     border: 'border-emerald-600' },
  cancelled:   { bg: 'bg-slate-300',   text: 'text-slate-600', border: 'border-slate-400' },
};

const STATUS_LABEL = {
  pending: 'Chờ',
  confirmed: 'Đã xác nhận',
  checked_in: 'Check-in',
  in_progress: 'Đang rửa',
  completed: 'Xong',
  cancelled: 'Đã hủy',
};

// Generate half-hour slots from 06:00 to 21:00
function generateTimeSlots() {
  const slots = [];
  for (let h = 6; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 21) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots(); // ["06:00","06:30",..."21:00"]
const SLOT_WIDTH_PX = 64; // px per 30-min column
const ROW_HEIGHT = 56;    // px per booking row

function parseMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Đơn "mới": đang chờ xác nhận (chưa được manager xử lý)
function isNewBooking(b) {
  return b?.status === 'pending';
}

function BookingBar({ booking, startMin, endMin, onClick }) {
  const gridStart = parseMinutes('06:00');
  const left = ((startMin - gridStart) / 30) * SLOT_WIDTH_PX;
  const width = Math.max(((endMin - startMin) / 30) * SLOT_WIDTH_PX - 2, 40);
  const cfg = STATUS_COLOR[booking.status] || STATUS_COLOR.pending;
  const fresh = isNewBooking(booking);

  return (
    <button
      onClick={() => onClick(booking)}
      title={`${booking.userId?.name || '?'} | ${booking.startTime}–${booking.endTime} | ${STATUS_LABEL[booking.status]}${fresh ? ' • MỚI' : ''}`}
      style={{ left, width, top: 6 }}
      className={`absolute h-11 rounded-lg border px-2 text-left text-[11px] font-medium overflow-hidden transition-opacity hover:opacity-80 ${cfg.bg} ${cfg.text} ${cfg.border} ${fresh ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
    >
      {fresh && (
        <span className="absolute -left-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
      )}
      <p className="flex items-center gap-1 truncate font-semibold leading-tight">
        {fresh && (
          <span className="shrink-0 rounded-full bg-red-500 px-1 text-[8px] font-bold text-white leading-4">Mới</span>
        )}
        {booking.userId?.name || '—'}
      </p>
      <p className="truncate opacity-80 leading-tight">{booking.vehicleId?.licensePlate || ''} · {booking.startTime}</p>
    </button>
  );
}

function DetailModal({ booking, onClose }) {
  if (!booking) return null;
  const cfg = STATUS_COLOR[booking.status] || STATUS_COLOR.pending;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
              {STATUS_LABEL[booking.status]}
            </span>
            <h2 className="font-semibold text-slate-800">{booking.packageId?.name || 'Chi tiết lịch'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ['Khách hàng', booking.userId?.name],
            ['SĐT', booking.userId?.phone],
            ['Biển số', booking.vehicleId?.licensePlate],
            ['Loại xe', booking.vehicleId?.vehicleType],
            ['Dịch vụ', booking.packageId?.name],
            ['Giờ bắt đầu', booking.startTime],
            ['Giờ kết thúc', booking.endTime],
            ['Thanh toán', booking.paymentStatus],
            ['Ghi chú', booking.note],
          ].map(([k, v]) => v ? (
            <div key={k}>
              <p className="text-xs text-slate-400">{k}</p>
              <p className="font-medium text-slate-800 mt-0.5">{v}</p>
            </div>
          ) : null)}
        </div>
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateVN(d) {
  return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

export default function ManagerSchedule() {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (d) => {
    setLoading(true); setError('');
    try {
      const dateStr = toDateStr(d);
      const res = await api(`/bookings?dateFrom=${dateStr}&dateTo=${dateStr}&limit=200&page=1`);
      if (!res.ok) throw new Error('Không thể tải lịch');
      const data = await res.json();
      const list = data?.data?.bookings || data?.data || [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  function prevDay() { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }
  function nextDay() { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }
  function goToday() { setDate(new Date()); }

  // Group bookings by package name as "lane"
  const lanes = [];
  const laneMap = {};
  for (const b of bookings) {
    const key = b.packageId?.name || 'Không rõ dịch vụ';
    if (!laneMap[key]) {
      laneMap[key] = [];
      lanes.push({ label: key, items: laneMap[key] });
    }
    laneMap[key].push(b);
  }

  const totalWidth = TIME_SLOTS.length * SLOT_WIDTH_PX;
  const isToday = toDateStr(date) === toDateStr(new Date());

  // Stats
  const byStatus = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button onClick={prevDay} className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <CaretLeft size={14} />
          </button>
          <div className="px-3 py-1.5 text-sm font-semibold text-slate-800 min-w-52 text-center">
            {formatDateVN(date)}
          </div>
          <button onClick={nextDay} className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <CaretRight size={14} />
          </button>
        </div>
        <button onClick={goToday}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
            isToday ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}>
          Hôm nay
        </button>
        <input type="date" value={toDateStr(date)}
          onChange={(e) => { if (e.target.value) setDate(new Date(e.target.value + 'T00:00:00')); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={() => load(date)} disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {(byStatus['pending'] || 0) > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span>{byStatus['pending']} mới · chờ xác nhận</span>
          </div>
        )}
        {Object.entries(STATUS_LABEL).map(([k, label]) => {
          if (k === 'pending') return null;
          const count = byStatus[k] || 0;
          if (!count) return null;
          const cfg = STATUS_COLOR[k];
          return (
            <div key={k} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
              <span>{label}</span>
              <span className="rounded-full bg-white/30 px-1.5">{count}</span>
            </div>
          );
        })}
        {bookings.length === 0 && !loading && (
          <p className="text-xs text-slate-400">Không có lịch nào trong ngày này.</p>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-24 text-slate-400">
          <CalendarBlank size={48} weight="duotone" />
          <p className="text-sm">Không có lịch đặt nào trong ngày này.</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Time header row */}
          <div className="flex border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="w-44 shrink-0 border-r border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Dịch vụ
            </div>
            <div className="flex" style={{ width: totalWidth }}>
              {TIME_SLOTS.map((slot) => (
                <div key={slot} style={{ width: SLOT_WIDTH_PX }}
                  className="border-r border-slate-100 px-1 py-2 text-center text-[10px] font-medium text-slate-400">
                  {slot}
                </div>
              ))}
            </div>
          </div>

          {/* Lane rows */}
          {lanes.map(({ label, items }) => (
            <div key={label} className="flex border-b border-slate-100 last:border-0">
              {/* Service label */}
              <div className="w-44 shrink-0 border-r border-slate-100 px-4 py-3 flex items-start">
                <p className="text-xs font-semibold text-slate-700 leading-snug">{label}</p>
              </div>

              {/* Timeline area */}
              <div className="relative" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                {/* Grid lines */}
                {TIME_SLOTS.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-slate-50"
                    style={{ left: i * SLOT_WIDTH_PX }} />
                ))}

                {/* Booking bars */}
                {items.map((b) => {
                  const startMin = parseMinutes(b.startTime);
                  const endMin = parseMinutes(b.endTime);
                  return (
                    <BookingBar
                      key={b._id}
                      booking={b}
                      startMin={startMin}
                      endMin={endMin}
                      onClick={setSelected}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {Object.entries(STATUS_LABEL).map(([k, label]) => {
          const cfg = STATUS_COLOR[k];
          return (
            <div key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className={`h-3 w-3 rounded-sm ${cfg.bg}`} />
              {label}
            </div>
          );
        })}
      </div>

      <DetailModal booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
