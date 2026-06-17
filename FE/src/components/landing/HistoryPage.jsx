import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_MAP = {
  pending: { label: 'Chờ xử lý', class: 'bg-amber-50 text-amber-600 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', class: 'bg-blue-50 text-blue-600 border-blue-200' },
  checked_in: { label: 'Đã check-in', class: 'bg-sky-50 text-sky-600 border-sky-200' },
  in_progress: { label: 'Đang thực hiện', class: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  completed: { label: 'Hoàn thành', class: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  cancelled: { label: 'Đã hủy', class: 'bg-red-50 text-red-500 border-red-200' },
};

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

export default function HistoryPage({ onBack, apiBase, token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = `${apiBase || API_BASE}/bookings/my?page=${page}&limit=${limit}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        const result = payload?.data || payload;
        setBookings(Array.isArray(result) ? result : (result?.data || []));
        setPagination(result?.pagination || null);
      } catch (e) {
        console.error(e);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [page, token, apiBase]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="awp-hist-header sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          <h1 className="text-sm font-bold text-slate-800">Lịch sử đặt</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Đang tải lịch sử...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Chưa có lịch đặt nào</p>
            <button onClick={onBack}
              className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
              Quay lại trang chủ
            </button>
          </div>
        ) : (
          <>
            <div className="awp-hist-grid space-y-3">
              {bookings.map(b => {
                const bId = b._id || b.id;
                const st = STATUS_MAP[b.status] || { label: b.status, class: 'bg-slate-50 text-slate-500 border-slate-200' };
                return (
                  <div key={bId}
                    className="awp-hist-card p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800">{b.packageId?.name || b.packageName || 'Dịch vụ'}</span>
                          <span className={`awp-hist-status text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${st.class}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {b.branchId?.name || b.branchName || ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(b.finalPrice)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {b.vehicleId && (
                        <span>🚗 {b.vehicleId.licensePlate || b.vehicleLicensePlate || ''}</span>
                      )}
                      {b.bookingDate && (
                        <span>📅 {new Date(b.bookingDate).toLocaleDateString('vi-VN')}</span>
                      )}
                      {b.startTime && (
                        <span>⏰ {b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}</span>
                      )}
                      {b.bookingCode && (
                        <span className="font-mono text-emerald-600">#{b.bookingCode}</span>
                      )}
                      {b.recurringGroupId && (
                        <span className="text-indigo-500">Định kỳ</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="awp-hist-pagination flex items-center justify-center gap-2 mt-8">
                <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                  className="awp-hist-page-btn px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  ‹ Trước
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`awp-hist-page-btn w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {p}
                  </button>
                ))}
                <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                  className="awp-hist-page-btn px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Sau ›
                </button>
              </div>
            )}

            <div className="text-center mt-6">
              <p className="text-xs text-slate-400">
                {pagination ? `Hiển thị ${(page - 1) * limit + 1}–${Math.min(page * limit, pagination.total)} trên ${pagination.total} lịch hẹn` : ''}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}