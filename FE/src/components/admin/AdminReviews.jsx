import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Star, ChatText, UserCircle, ArrowClockwise, PaperPlaneTilt, CheckCircle, Buildings } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
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
        method: 'PATCH', body: JSON.stringify({ reply: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi phản hồi');
      onReplied(data.data || data);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Phản hồi đánh giá (Admin)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div className="p-6 space-y-4">
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
            <p className="text-xs text-slate-400">Chi nhánh: {booking.branchId?.name || '—'}</p>
          </div>
          {booking.managerReply && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
              <span className="font-semibold block text-xs text-emerald-600 mb-1">Phản hồi hiện tại:</span>
              {booking.managerReply}
            </div>
          )}
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={1000}
            placeholder="Nhập phản hồi…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{err && <span className="text-red-500">{err}</span>}</span>
            <span>{reply.length}/1000</span>
          </div>
        </div>
        <div className="border-t border-slate-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Hủy</button>
          <button onClick={submit} disabled={busy || !reply.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            {busy ? '...' : <><PaperPlaneTilt size={14} /> Gửi phản hồi</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const STAR_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
  { value: '1', label: '1-2 sao' },
];

const PAGE_SIZE = 9;

export default function AdminReviews() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [fbRes, brRes] = await Promise.all([
        api('/bookings/feedbacks'),
        api('/branches?limit=100'),
      ]);
      if (!fbRes.ok) throw new Error('Không thể tải đánh giá');
      const fbData = await fbRes.json();
      const fbResult = fbData?.data || fbData;
      setFeedbacks(Array.isArray(fbResult) ? fbResult : (fbResult?.feedbacks || []));
      if (brRes.ok) {
        const brData = await brRes.json();
        setBranches(brData?.data?.branches || brData?.data || []);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleReplied(updated) {
    setFeedbacks((prev) => prev.map((f) => f._id === updated._id ? updated : f));
  }

  function onBranchFilter(value) {
    setBranchFilter(value);
    setPage(1);
  }

  function onStarFilter(value) {
    setStarFilter(value);
    setPage(1);
  }

  // Filters
  const filtered = feedbacks.filter((f) => {
    if (branchFilter && String(f.branchId?._id || f.branchId) !== branchFilter) return false;
    if (starFilter === '1') return f.rating <= 2;
    if (starFilter) return f.rating === Number(starFilter);
    return f.rating; // only show reviews with ratings
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const avgRating = total ? (filtered.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : '—';
  const repliedCount = filtered.filter((f) => f.managerReply).length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng đánh giá', value: total },
          { label: 'Điểm trung bình', value: avgRating === '—' ? '—' : `${avgRating} ⭐` },
          { label: 'Đã phản hồi', value: `${repliedCount}/${total}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={branchFilter} onChange={(e) => onBranchFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="">Tất cả chi nhánh</option>
          {branches.map((br) => (
            <option key={br._id} value={br._id}>{br.name}</option>
          ))}
        </select>
        <select value={starFilter} onChange={(e) => onStarFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400">
          {STAR_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <button onClick={load} disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-slate-400">
          <ChatText size={48} weight="duotone" />
          <p className="text-sm">Chưa có đánh giá nào.</p>
        </div>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginated.map((fb) => (
            <div key={fb._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <UserCircle size={36} className="text-slate-300 shrink-0" weight="fill" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{fb.userId?.name || 'Khách hàng'}</span>
                        {fb.userId?.tier && <TierBadge tier={fb.userId.tier} />}
                        {!fb.managerReply && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(fb.feedbackAt || fb.updatedAt || fb.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Stars rating={fb.rating} size={13} />
                </div>
              </div>
              <div className="flex-1 px-5 py-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    {fb.packageId?.name || '—'}
                  </p>
                  <p className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1">
                    <Buildings size={10} /> {fb.branchId?.name || '—'}
                  </p>
                </div>
                <div className="text-sm text-slate-700 italic bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 min-h-[52px]">
                  {fb.feedback ? `"${fb.feedback}"` : <span className="text-slate-400 not-italic">Không có bình luận</span>}
                </div>
                {fb.managerReply && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle size={11} className="text-emerald-600" weight="fill" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Phản hồi từ chi nhánh</span>
                    </div>
                    <p className="text-xs text-emerald-800 italic">{fb.managerReply}</p>
                  </div>
                )}
              </div>
              <div className="px-5 pb-4">
                <button onClick={() => setReplyTarget(fb)}
                  className="w-full rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
                  <PaperPlaneTilt size={12} />
                  {fb.managerReply ? 'Sửa phản hồi' : 'Phản hồi khách hàng'}
                </button>
              </div>
            </div>
            ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              ‹ Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  safePage === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                {p}
              </button>
            ))}
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Sau ›
            </button>
          </div>
        )}
        </>
      )}

      {replyTarget && (
        <ReplyModal booking={replyTarget} onClose={() => setReplyTarget(null)} onReplied={handleReplied} />
      )}
    </div>
  );
}
