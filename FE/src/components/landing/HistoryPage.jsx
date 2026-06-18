import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_MAP = {
  pending: { label: 'Chờ xử lý', class: 'bg-amber-50 text-amber-600 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', class: 'bg-blue-50 text-blue-600 border-blue-200' },
  checked_in: { label: 'Đã check-in', class: 'bg-sky-50 text-sky-600 border-sky-200' },
  in_progress: { label: 'Đang thực hiện', class: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  completed: { label: 'Hoàn thành', class: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  cancelled: { label: 'Đã hủy', class: 'bg-red-50 text-red-500 border-red-200' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'checked_in', label: 'Đã check-in' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
            s <= value ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'
          }`}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function HistoryPage({ onBack, apiBase, token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 10;

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const debounceRef = useRef(null);

  function showToastMsg(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  }

  const doFetch = useCallback((kw, st, df, dt, pg) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', pg);
    params.set('limit', limit);
    if (kw.trim()) params.set('keyword', kw.trim());
    if (st) params.set('status', st);
    if (df) params.set('dateFrom', df);
    if (dt) params.set('dateTo', dt);

    const url = `${apiBase || API_BASE}/bookings/my?${params.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(payload => {
        const result = payload?.data || payload;
        setBookings(Array.isArray(result) ? result : (result?.bookings || []));
        setPagination(result?.pagination || null);
      })
      .catch(e => { console.error(e); setBookings([]); })
      .finally(() => setLoading(false));
  }, [apiBase, token, limit]);

  useEffect(() => {
    if (!token) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doFetch(keyword, statusFilter, dateFrom, dateTo, page);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword, statusFilter, dateFrom, dateTo, page, token, doFetch]);

  function resetFilters() {
    setKeyword('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function onFilterChange(setter, value) {
    setter(value);
    setPage(1);
  }

  function openReview(b) {
    setReviewTarget(b);
    setRating(b.rating || 0);
    setFeedbackText(b.feedback || '');
    setShowReviewModal(true);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!reviewTarget || rating === 0) return;
    setSubmitting(true);
    try {
      const bId = reviewTarget._id || reviewTarget.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, feedback: feedbackText.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gửi đánh giá thất bại');
      }
      const payload = await res.json();
      const updated = payload?.data || payload;
      setBookings(prev => prev.map(b => ((b._id || b.id) === bId ? { ...b, ...updated } : b)));
      setShowReviewModal(false);
      setReviewTarget(null);
      showToastMsg('Đánh giá thành công!');
    } catch (e) {
      showToastMsg(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const hasActiveFilters = keyword || statusFilter || dateFrom || dateTo;

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

      {toast.show && (
        <div className="awp-toast-container">
          <div className={`awp-toast-message ${toast.type === 'error' ? 'awp-toast-error' : 'awp-toast-success'}`}>
            {toast.message}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" value={keyword} onChange={e => onFilterChange(setKeyword, e.target.value)}
                placeholder="Tìm gói dịch vụ hoặc chi nhánh..."
                className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <select value={statusFilter} onChange={e => onFilterChange(setStatusFilter, e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white">
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={e => onFilterChange(setDateFrom, e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            <input type="date" value={dateTo} onChange={e => onFilterChange(setDateTo, e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters}
              className="px-5 h-9 rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              Xóa bộ lọc
            </button>
          )}
        </div>

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
                const canReview = b.status === 'completed';
                const hasReview = b.rating || b.feedback;
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
                      {hasReview && (
                        <span className="text-amber-500 font-medium">
                          {'★'.repeat(b.rating || 0)}{'☆'.repeat(5 - (b.rating || 0))}
                        </span>
                      )}
                      {b.managerReply && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Đã phản hồi
                        </span>
                      )}
                      {canReview && !hasReview && (
                        <button onClick={() => openReview(b)}
                          className="awp-hist-review-btn ml-auto text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1 text-xs">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Đánh giá
                        </button>
                      )}
                      {hasReview && (
                        <button onClick={() => openReview(b)}
                          className="awp-hist-review-btn ml-auto text-slate-400 hover:text-amber-500 font-medium flex items-center gap-1 text-xs">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {b.feedback ? 'Xem đánh giá' : 'Sửa đánh giá'}
                        </button>
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

      {showReviewModal && reviewTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setShowReviewModal(false); setReviewTarget(null); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Đánh giá dịch vụ</h3>
            <p className="text-sm text-slate-400 mb-6">
              {reviewTarget.packageId?.name || 'Dịch vụ'} tại {reviewTarget.branchId?.name || ''}
            </p>
            <form onSubmit={handleSubmitReview} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">Chất lượng dịch vụ</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Nhận xét (không bắt buộc)</label>
                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                  rows={4} maxLength={1000} placeholder="Chia sẻ trải nghiệm của bạn..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{feedbackText.length}/1000</p>
              </div>
              {reviewTarget.managerReply && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Phản hồi từ chi nhánh</p>
                  <p className="text-sm text-emerald-800 italic">{reviewTarget.managerReply}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowReviewModal(false); setReviewTarget(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button type="submit" disabled={submitting || rating === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50">
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}