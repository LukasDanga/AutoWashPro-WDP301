import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import { Star, ChatText, UserCircle, ArrowClockwise, PaperPlaneTilt, CheckCircle, Buildings, Trash, MagnifyingGlass, Calendar, Spinner } from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';
import useSSE from '@/hooks/useSSE';

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
          <h2 className="font-semibold text-slate-800 text-sm">Phản hồi đánh giá (Admin)</h2>
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
  { value: '', label: 'Tất cả sao' },
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
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [page, setPage] = useState(1);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDateFrom, setDeleteDateFrom] = useState('');
  const [deleteDateTo, setDeleteDateTo] = useState('');
  const [deleteAll, setDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = getStoredToken();

  const load = useCallback(async () => {
    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc!', 'error');
      return;
    }

    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (search.trim()) params.set('search', search.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (starFilter) params.set('rating', starFilter);

      const [fbRes, brRes] = await Promise.all([
        api(`/bookings/feedbacks?${params}`),
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
  }, [search, startDate, endDate, starFilter]);

  useEffect(() => { load(); }, [load]);
  useSSE(token, 'feedback_new', load);

  const handleStartDateChange = (val) => {
    if (val && endDate && new Date(val) > new Date(endDate)) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc!', 'error');
      return;
    }
    setStartDate(val);
    setPage(1);
  };

  const handleEndDateChange = (val) => {
    if (startDate && val && new Date(startDate) > new Date(val)) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc!', 'error');
      return;
    }
    setEndDate(val);
    setPage(1);
  };

  function handleReplied(updated) {
    setFeedbacks((prev) => prev.map((f) => f._id === updated._id ? updated : f));
  }

  async function handleDeleteSingle(fb) {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      const res = await api(`/bookings/${fb._id}/feedback`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xóa thất bại');
      showToast('Đã xóa đánh giá thành công!', 'success');
      load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function handleDeleteRange() {
    if (deleteAll) {
      if (!confirm('Bạn có chắc muốn xóa TOÀN BỘ tất cả các đánh giá? Hành động này không thể hoàn tác!')) return;
    } else {
      if (!deleteDateFrom || !deleteDateTo) return showToast('Vui lòng chọn khoảng ngày', 'error');
      if (new Date(deleteDateFrom) > new Date(deleteDateTo)) {
        return showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc!', 'error');
      }
      if (!confirm(`Xóa tất cả đánh giá từ ${deleteDateFrom} đến ${deleteDateTo}?`)) return;
    }

    setDeleting(true);
    try {
      const params = deleteAll ? 'all=true' : `dateFrom=${deleteDateFrom}&dateTo=${deleteDateTo}`;
      const res = await api(`/bookings/feedbacks/range?${params}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xóa thất bại');
      showToast(data.message || 'Đã xóa đánh giá thành công!', 'success');
      setShowDeleteModal(false);
      setDeleteDateFrom(''); setDeleteDateTo(''); setDeleteAll(false);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setDeleting(false); }
  }

  // Client-side search and star filters
  const searchLower = search.trim().toLowerCase();
  const filtered = feedbacks.filter((f) => {
    if (branchFilter && String(f.branchId?._id || f.branchId) !== branchFilter) return false;
    if (starFilter === '1' && f.rating > 2) return false;
    if (starFilter && starFilter !== '1' && f.rating !== Number(starFilter)) return false;

    if (!searchLower) return f.rating;
    const name = (f.userId?.name || '').toLowerCase();
    const phone = (f.userId?.phone || '');
    const comment = (f.feedback || '').toLowerCase();
    return (name.includes(searchLower) || phone.includes(searchLower) || comment.includes(searchLower)) && f.rating;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const avgRating = total ? (filtered.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : '—';
  const repliedCount = filtered.filter((f) => f.managerReply).length;
  const todayStr = new Date().toDateString();

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

      {/* Filter & Action Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Customer Search */}
          <div className="relative min-w-[240px] flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên khách hàng, SĐT..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer">✕</button>
            )}
          </div>

          {/* Branch & Star Filters */}
          <div className="flex items-center gap-2">
            <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer">
              <option value="">Tất cả chi nhánh</option>
              {branches.map((br) => (
                <option key={br._id} value={br._id}>{br.name}</option>
              ))}
            </select>

            <select value={starFilter} onChange={(e) => { setStarFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer">
              {STAR_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
              <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
            </button>

            <button onClick={() => setShowDeleteModal(true)}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer shadow-2xs">
              <Trash size={13} /> Xóa đánh giá
            </button>
          </div>
        </div>

        {/* Date Range Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <span>Khoảng ngày:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {(search || starFilter || branchFilter || startDate || endDate) && (
            <button
              onClick={() => { setSearch(''); setStarFilter(''); setBranchFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 underline ml-auto cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 shadow-xs">
          <ChatText size={48} weight="duotone" />
          <p className="text-sm font-medium">Không tìm thấy đánh giá nào.</p>
        </div>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginated.map((fb) => {
            const fbDate = fb.feedbackAt || fb.updatedAt || fb.createdAt;
            const isCreatedToday = fbDate && new Date(fbDate).toDateString() === todayStr;
            const isNew = !fb.managerReply && isCreatedToday;

            return (
              <div key={fb._id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <UserCircle size={36} className="text-slate-300 shrink-0" weight="fill" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{fb.userId?.name || 'Khách hàng'}</span>
                          {fb.userId?.tier && <TierBadge tier={fb.userId.tier} />}
                          {isNew && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-xs">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Mới
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
                <div className="px-5 pb-4 flex items-center gap-2">
                  <button onClick={() => setReplyTarget(fb)}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <PaperPlaneTilt size={13} />
                    {fb.managerReply ? 'Sửa phản hồi' : 'Phản hồi khách hàng'}
                  </button>
                  <button onClick={() => handleDeleteSingle(fb)} title="Xóa đánh giá"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer border border-slate-200 shrink-0">
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer">
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  safePage === p
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {p}
              </button>
            ))}
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer">
              Sau →
            </button>
          </div>
        )}
        </>
      )}

      {replyTarget && (
        <ReplyModal booking={replyTarget} onClose={() => setReplyTarget(null)} onReplied={handleReplied} />
      )}

      {/* Delete Range Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => { if (!deleting) setShowDeleteModal(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Xóa dữ liệu đánh giá theo khoảng ngày</h2>
              <button disabled={deleting} onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                {deleteAll ? 'Bạn sắp xóa toàn bộ dữ liệu đánh giá.' : 'Chọn khoảng ngày muốn xóa.'}
                <span className="font-semibold text-red-600"> Hành động này không thể hoàn tác!</span>
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={deleteAll} onChange={(e) => setDeleteAll(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-400" />
                <span className="font-medium text-slate-700">Xóa tất cả đánh giá</span>
              </label>
              {!deleteAll && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-slate-500 mb-1 font-medium">Từ ngày</label>
                    <input type="date" value={deleteDateFrom} onChange={(e) => setDeleteDateFrom(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-500 mb-1 font-medium">Đến ngày</label>
                    <input type="date" value={deleteDateTo} onChange={(e) => setDeleteDateTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex gap-3 justify-end">
              <button disabled={deleting} onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">Hủy</button>
              <button onClick={handleDeleteRange} disabled={deleting || (!deleteAll && (!deleteDateFrom || !deleteDateTo))}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer">
                {deleting ? <Spinner size={14} className="animate-spin" /> : <Trash size={14} />}
                {deleting ? 'Đang xóa...' : 'Xóa dữ liệu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
