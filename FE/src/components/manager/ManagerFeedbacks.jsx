import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { Star, ChatText, UserCircle, ArrowClockwise, PaperPlaneTilt, CheckCircle } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

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
  { value: '5', label: '⭐⭐⭐⭐⭐' },
  { value: '4', label: '⭐⭐⭐⭐' },
  { value: '3', label: '⭐⭐⭐' },
  { value: '1', label: '1-2 sao' },
];

export default function ManagerFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api('/bookings/feedbacks');
      if (!res.ok) throw new Error('Không thể tải đánh giá');
      const data = await res.json();
      setFeedbacks(data?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleReplied(updated) {
    setFeedbacks((prev) => prev.map((f) => f._id === updated._id ? updated : f));
  }

  // Stats
  const total = feedbacks.length;
  const withRating = feedbacks.filter((f) => f.rating);
  const avgRating = withRating.length
    ? (withRating.reduce((s, f) => s + f.rating, 0) / withRating.length).toFixed(1)
    : '—';
  const repliedCount = feedbacks.filter((f) => f.managerReply).length;

  // Filter
  const displayed = starFilter === ''
    ? feedbacks
    : starFilter === '1'
      ? feedbacks.filter((f) => f.rating <= 2)
      : feedbacks.filter((f) => f.rating === Number(starFilter));

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
      <div className="flex items-center gap-2 flex-wrap">
        {STAR_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setStarFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              starFilter === f.value
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            {f.label}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-slate-400">
          <ChatText size={48} weight="duotone" />
          <p className="text-sm">Chưa có đánh giá nào.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayed.map((fb) => (
            <div key={fb._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <UserCircle size={36} className="text-slate-300 shrink-0" weight="fill" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{fb.userId?.name || 'Khách hàng'}</span>
                        {fb.userId?.tier && <TierBadge tier={fb.userId.tier} />}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(fb.feedbackAt || fb.updatedAt || fb.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Stars rating={fb.rating} size={13} />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 px-5 py-4 space-y-3">
                <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit">
                  {fb.packageId?.name || '—'}
                </p>

                {/* Customer review */}
                <div className="text-sm text-slate-700 italic bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 min-h-[52px]">
                  {fb.feedback
                    ? `"${fb.feedback}"`
                    : <span className="text-slate-400 not-italic">Không có bình luận</span>}
                </div>

                {/* Manager reply */}
                {fb.managerReply && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
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
                  className="w-full rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
                  <PaperPlaneTilt size={12} />
                  {fb.managerReply ? 'Sửa phản hồi' : 'Phản hồi khách hàng'}
                </button>
              </div>
            </div>
          ))}
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
