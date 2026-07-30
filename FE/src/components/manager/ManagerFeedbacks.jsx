import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Star, ChatText, UserCircle, ArrowClockwise, PaperPlaneTilt, CheckCircle, TrendUp, TrendDown, Minus, MagnifyingGlass } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';
import useSSE from '@/hooks/useSSE';

// --- Helper Component ---
function ListTrend({ current, previous }) {
  if (previous == null) return null; // No trend data for "all time"

  const diff = current - previous;
  const trend = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((diff / previous) * 100);

  if (trend > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 font-medium">
        <TrendUp weight="bold" /> {trend}%
      </span>
    );
  } else if (trend < 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
        <TrendDown weight="bold" /> {Math.abs(trend)}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
      <Minus weight="bold" /> 0%
    </span>
  );
}

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getStoredToken()}`,
      ...opts.headers,
    },
    ...opts,
  });
}

function Stars({ rating, size = 14 }) {
  if (!rating) return <span className="text-xs italic text-slate-400">Chưa đánh giá</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} weight={s <= rating ? 'fill' : 'regular'}
          className={s <= rating ? 'text-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  );
}

function ReplyModal({ booking, onClose, onReplied }) {
  const [reply, setReply] = useState(booking.managerReply || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!reply.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await api(`/bookings/${booking._id}/feedback/reply`, {
        method: 'PATCH',
        body: JSON.stringify({ reply: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi phản hồi');
      onReplied(data.data || data);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Phản hồi đánh giá</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Customer review */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <UserCircle size={24} className="text-slate-300" weight="fill" />
              <span className="font-medium text-sm text-slate-700">{booking.userId?.name || 'Khách hàng'}</span>
              {booking.userId?.tier && <TierBadge tier={booking.userId.tier} />}
              <div className="ml-auto"><Stars rating={booking.rating} /></div>
            </div>
            <p className="text-sm text-slate-600 italic">
              {booking.feedback ? `"${booking.feedback}"` : <span className="text-slate-400">Không có bình luận</span>}
            </p>
          </div>

          {/* Existing reply preview */}
          {booking.managerReply && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
              <span className="font-semibold block text-xs text-emerald-600 mb-1">Phản hồi hiện tại:</span>
              {booking.managerReply}
            </div>
          )}

          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Nhập phản hồi của bạn dành cho khách hàng…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{err && <span className="text-red-500">{err}</span>}</span>
            <span>{reply.length}/1000</span>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={submit} disabled={busy || !reply.trim()}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {busy ? '...' : <><PaperPlaneTilt size={14} /> Gửi phản hồi</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const STAR_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: '5', label: '⭐⭐⭐⭐⭐ 5 sao' },
  { value: '4', label: '⭐⭐⭐⭐ 4 sao' },
  { value: '3', label: '⭐⭐⭐ 3 sao' },
  { value: '1', label: '1-2 sao' },
];

const PAGE_SIZE = 9;

export default function ManagerFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, avgRating: '—', repliedCount: 0 });
  const [previousStats, setPreviousStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [period, setPeriod] = useState('all');
  const [replyTarget, setReplyTarget] = useState(null);
  const token = getStoredToken();

  const load = useCallback(async (rating = starFilter, pg = 1, prd = period) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (rating) params.set('rating', rating);
      if (prd !== 'all') params.set('period', prd);
      const res = await api(`/bookings/feedbacks?${params}`);
      if (!res.ok) throw new Error('Không thể tải đánh giá');
      const p = await res.json();
      const data = p?.data ?? p;
      const list = data?.feedbacks ?? (Array.isArray(data) ? data : []);
      setFeedbacks(list);
      setTotal(data?.total ?? list.length);
      setPage(data?.page ?? pg);
      setTotalPages(data?.totalPages ?? 1);

      if (data?.stats) {
        setStats(data.stats);
        setPreviousStats(data.previousStats || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [starFilter, period]); 

  useEffect(() => { load('', 1, period); }, [load, period]);
  useSSE(token, 'feedback_new', () => load(starFilter, 1, period));

  const handleStarFilter = (v) => { setStarFilter(v); setPage(1); load(v, 1, period); };
  const handlePage = (pg) => { setPage(pg); load(starFilter, pg, period); };

  function handleReplied(updated) {
    setFeedbacks((prev) => prev.map((f) => f._id === updated._id ? updated : f));
    window.dispatchEvent(new Event('feedback-replied'));
  }

  // Filter displayed items locally by search query and star filter
  const searchLower = search.trim().toLowerCase();
  const displayed = feedbacks.filter((fb) => {
    // Star filter client check
    if (starFilter === '5' && fb.rating !== 5) return false;
    if (starFilter === '4' && fb.rating !== 4) return false;
    if (starFilter === '3' && fb.rating !== 3) return false;
    if (starFilter === '1' && fb.rating > 2) return false;

    // Search query check (name, phone, feedback text, package name)
    if (!searchLower) return true;
    const name = (fb.userId?.name || '').toLowerCase();
    const phone = (fb.userId?.phone || '');
    const comment = (fb.feedback || '').toLowerCase();
    const pkgName = (fb.packageId?.name || '').toLowerCase();
    return name.includes(searchLower) || phone.includes(searchLower) || comment.includes(searchLower) || pkgName.includes(searchLower);
  });

  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-2 mb-4 bg-white p-1.5 rounded-xl border border-slate-200 w-max shadow-sm">
        {[
          { id: 'today', label: 'Hôm nay' },
          { id: 'month', label: 'Tháng này' },
          { id: 'all', label: 'Tất cả thời gian' },
        ].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              period === p.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng đánh giá', value: stats.total, prevValue: previousStats?.total },
          { label: 'Điểm trung bình', value: stats.avgRating === '—' ? '—' : `${stats.avgRating} ⭐`, prevValue: parseFloat(previousStats?.avgRating || 0) },
          { label: 'Đã phản hồi', value: `${stats.repliedCount}/${stats.total}`, prevValue: previousStats?.repliedCount },
        ].map(({ label, value, prevValue }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center relative flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
            {period !== 'all' && (
              <div className="absolute top-3 right-4">
                <ListTrend current={parseFloat(value) || 0} previous={prevValue} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Search & Star Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Customer Name Search Input */}
        <div className="relative max-w-md w-full sm:w-80">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên khách hàng, SĐT, nội dung..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
              ✕
            </button>
          )}
        </div>

        {/* Star Rating Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STAR_FILTERS.map((f) => (
            <button key={f.value} onClick={() => handleStarFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                starFilter === f.value
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {displayed.length > 0 && (
          <span className="text-xs font-medium text-slate-400">{displayed.length} / {total} đánh giá</span>
        )}

        <button onClick={() => { setSearch(''); setStarFilter(''); load('', 1); }} disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer">
          <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 shadow-xs">
          <ChatText size={48} weight="duotone" />
          <p className="text-sm font-medium">Không tìm thấy đánh giá nào.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayed.map((fb) => {
            const fbDate = fb.feedbackAt || fb.updatedAt || fb.createdAt;
            const isUnreplied = !fb.managerReply;

            return (
              <div key={fb._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <UserCircle size={36} className="text-slate-300 shrink-0" weight="fill" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{fb.userId?.name || 'Khách hàng'}</span>
                          {fb.userId?.tier && <TierBadge tier={fb.userId.tier} />}
                          {isUnreplied && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-xs">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Chưa phản hồi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(fbDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <Stars rating={fb.rating} size={13} />
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 px-5 py-4 space-y-3">
                  <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md w-fit">
                    {fb.packageId?.name || '—'}
                  </p>

                  {/* Customer review */}
                  <div className="text-sm text-slate-700 italic bg-slate-50/80 rounded-xl px-3.5 py-2.5 border border-slate-100 min-h-[52px]">
                    {fb.feedback
                      ? `"${fb.feedback}"`
                      : <span className="text-slate-400 not-italic">Không có bình luận</span>}
                  </div>

                  {/* Manager reply */}
                  {fb.managerReply && (
                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle size={11} className="text-emerald-600" weight="fill" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Phản hồi từ chi nhánh</span>
                      </div>
                      <p className="text-xs text-emerald-800 italic">{fb.managerReply}</p>
                      {fb.managerReplyAt && (
                        <p className="text-[10px] text-emerald-500 mt-1">
                          {new Date(fb.managerReplyAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-4">
                  <button onClick={() => setReplyTarget(fb)}
                    className="w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <PaperPlaneTilt size={13} />
                    {fb.managerReply ? 'Sửa phản hồi' : 'Phản hồi khách hàng'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="flex items-center gap-1">
            <button onClick={() => handlePage(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer">
              ← Trước
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={pg} onClick={() => handlePage(pg)} disabled={loading}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    pg === page ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer">
              Sau →
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium">Trang {page}/{totalPages} · {total} đánh giá</p>
        </div>
      )}

      {replyTarget && (
        <ReplyModal
          booking={replyTarget}
          onClose={() => setReplyTarget(null)}
          onReplied={handleReplied}
        />
      )}
    </div>
  );
}
