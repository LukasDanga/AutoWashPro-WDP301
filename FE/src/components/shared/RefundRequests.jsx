import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import useSSE from '@/hooks/useSSE';
import {
  ArrowUUpLeft,
  ArrowClockwise,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  X,
  User,
  Buildings,
  CalendarBlank,
  Trash,
  Spinner,
} from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN');
}

const STATUS_MAP = {
  pending:  { label: 'Chờ duyệt',   cls: 'bg-amber-50 text-amber-700', icon: Clock },
  approved: { label: 'Đã hoàn tiền', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Đã từ chối',  cls: 'bg-red-50 text-red-600', icon: XCircle },
};

const STATUS_TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã hoàn tiền' },
  { key: 'rejected', label: 'Đã từ chối' },
];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function RequestDetail({ request, onClose, onReview, reviewing }) {
  const [reviewNote, setReviewNote] = useState('');
  const st = STATUS_MAP[request.status] || { label: request.status, cls: 'bg-slate-100 text-slate-500' };
  const booking = request.bookingId || {};
  const isDepositOnly = booking.paymentStatus === 'deposit_paid' || (booking.depositPaid && booking.paymentStatus !== 'paid');
  const actualDeposit = booking.depositAmount || booking.deposit;
  const refundAmount = isDepositOnly && actualDeposit ? actualDeposit : (booking.finalPrice ?? request.amount ?? request.refundAmount);

  return (
    <Modal title="Chi tiết yêu cầu hoàn tiền" onClose={onClose}>
      <div className="space-y-5 text-sm text-slate-600">
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 border-2 border-white shadow-sm">
            <ArrowUUpLeft size={28} weight="duotone" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {formatCurrency(refundAmount)}
              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Gửi lúc {formatDateTime(request.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-b border-slate-100 py-4">
          <div>
            <span className="block text-xs text-slate-400 font-medium">Khách hàng</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <User size={14} className="text-slate-400" />
              {request.userId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Email / SĐT</span>
            <span className="font-semibold text-slate-700 mt-0.5">{request.userId?.email || request.userId?.phone || '—'}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Chi nhánh</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Buildings size={14} className="text-slate-400" />
              {booking.branchId?.name || '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Ngày đặt</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <CalendarBlank size={14} className="text-slate-400" />
              {booking.bookingDate ? formatDateTime(booking.bookingDate) : '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Trạng thái booking</span>
            <span className="font-semibold text-slate-700 mt-0.5">
              {
                booking.status === 'confirmed' ? 'Đã xác nhận' :
                booking.status === 'pending' ? 'Chờ xác nhận' :
                booking.status === 'checked_in' ? 'Đã check-in' :
                booking.status === 'in_progress' ? 'Đang thực hiện' :
                booking.status === 'awaiting_payment' ? 'Chờ thanh toán' :
                booking.status === 'completed' ? 'Hoàn thành' :
                booking.status === 'cancelled' ? 'Đã hủy' : booking.status || '—'
              }
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium">Thanh toán</span>
            <span className="font-semibold text-slate-700 mt-0.5">
              {
                booking.paymentStatus === 'paid' ? 'Đã thanh toán' :
                booking.paymentStatus === 'deposit_paid' ? 'Đã cọc' :
                booking.paymentStatus === 'refunded' ? 'Đã hoàn tiền' :
                booking.paymentStatus === 'failed' ? 'Thất bại' :
                booking.paymentStatus === 'unpaid' ? 'Chưa thanh toán' : booking.paymentStatus || 'Chưa thanh toán'
              }
            </span>
          </div>
        </div>

        <div>
          <span className="block text-xs text-slate-400 font-medium mb-1">Lý do khách yêu cầu</span>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">{request.reason}</p>
        </div>

        {request.status !== 'pending' && (
          <div>
            <span className="block text-xs text-slate-400 font-medium mb-1">Ghi chú của người duyệt</span>
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">
              {request.reviewNote || '—'}
              <span className="block mt-1 text-xs text-slate-400">
                {request.reviewedBy?.name ? `Bởi ${request.reviewedBy.name} · ` : ''}{formatDateTime(request.reviewedAt)}
              </span>
            </p>
          </div>
        )}

        {request.status === 'pending' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ghi chú (tuỳ chọn)</label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Ghi chú khi duyệt/từ chối..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => onReview('rejected', reviewNote)} disabled={reviewing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors cursor-pointer">
                <XCircle size={14} />
                Từ chối
              </button>
              <button onClick={() => onReview('approved', reviewNote)} disabled={reviewing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer">
                {reviewing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle size={14} />}
                {reviewing ? 'Đang xử lý…' : 'Phê duyệt & hoàn tiền'}
              </button>
            </div>
          </>
        )}
        {request.status !== 'pending' && (
          <div className="border-t border-slate-100 pt-4">
            <button onClick={onClose}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              Đóng
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function RefundRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [detail, setDetail] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [viewMode, setViewMode] = useState('pending'); // pending | history

  // Range Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDateFrom, setDeleteDateFrom] = useState('');
  const [deleteDateTo, setDeleteDateTo] = useState('');
  const [deleteAll, setDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (viewMode === 'pending') {
        params.set('status', 'pending');
      } else if (statusFilter) {
        params.set('status', statusFilter);
      }
      const res = await api(`/refund-requests?${params}`);
      if (!res.ok) throw new Error('Không thể tải danh sách yêu cầu hoàn tiền');
      const data = await res.json();
      setRequests(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [statusFilter, viewMode]);

  useEffect(() => { load(); }, [load]);

  const token = getStoredToken();
  useSSE(token, 'refund_request_new', load);
  useSSE(token, 'refund_request_updated', load);
  useSSE(token, 'refund_requests_updated', load);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  async function handleReview(decision, reviewNote) {
    if (!detail) return;
    setReviewing(true);
    try {
      const res = await api(`/refund-requests/${detail._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Không thể xử lý yêu cầu');
      setRequests(prev => prev.map(r => r._id === detail._id ? { ...r, status: decision, reviewedAt: new Date().toISOString() } : r));
      setDetail(null);
      showToast(decision === 'approved' ? 'Đã phê duyệt và hoàn tiền cho khách hàng!' : 'Đã từ chối yêu cầu hoàn tiền.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setReviewing(false); }
  }

  async function handleDeleteSingle(r) {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu hoàn tiền này? Hành động này không thể hoàn tác!')) return;
    try {
      const res = await api(`/refund-requests/${r._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xóa yêu cầu hoàn tiền thất bại');
      setRequests(prev => prev.filter(item => item._id !== r._id));
      if (detail && detail._id === r._id) setDetail(null);
      showToast('Đã xóa yêu cầu hoàn tiền thành công', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function deleteRequestsByRange() {
    if (deleteAll) {
      if (!confirm('Bạn có chắc muốn xóa TOÀN BỘ dữ liệu yêu cầu hoàn tiền? Hành động này không thể hoàn tác!')) return;
    } else {
      if (!deleteDateFrom || !deleteDateTo) return showToast('Vui lòng chọn khoảng ngày', 'error');
      if (!confirm(`Bạn có chắc muốn xóa yêu cầu hoàn tiền từ ${deleteDateFrom} đến ${deleteDateTo}? Hành động này không thể hoàn tác!`)) return;
    }
    setDeleting(true);
    try {
      const params = deleteAll ? 'all=true' : `dateFrom=${deleteDateFrom}&dateTo=${deleteDateTo}`;
      const res = await api(`/refund-requests/range?${params}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xóa thất bại');
      showToast(data.message || 'Đã xóa thành công', 'success');
      setShowDeleteModal(false);
      setDeleteDateFrom('');
      setDeleteDateTo('');
      setDeleteAll(false);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Chờ duyệt', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Đã hoàn tiền', value: approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
          { label: 'Đã từ chối', value: rejectedCount, color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
          {[
            { key: 'pending', label: 'Chờ duyệt' },
            { key: 'history', label: 'Lịch sử duyệt' },
          ].map(t => (
            <button key={t.key} onClick={() => { setViewMode(t.key); setStatusFilter(''); }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === t.key ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {viewMode === 'history' && (
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            {STATUS_TABS.filter(t => t.key !== 'pending').map(t => (
              <button key={t.key} onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === t.key ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
          <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
        <button onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors ml-auto cursor-pointer shadow-2xs">
          <Trash size={13} /> Xóa yêu cầu hoàn tiền
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <ArrowUUpLeft size={48} weight="duotone" />
          <p className="text-sm">Không có yêu cầu hoàn tiền nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày gửi</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => {
                const st = STATUS_MAP[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-500' };
                const booking = r.bookingId || {};
                const isDepositOnly = booking.paymentStatus === 'deposit_paid' || (booking.depositPaid && booking.paymentStatus !== 'paid');
                const actualDeposit = booking.depositAmount || booking.deposit;
                const refundAmount = isDepositOnly && actualDeposit ? actualDeposit : (booking.finalPrice ?? r.amount ?? r.refundAmount);
                return (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.userId?.name || '—'}</div>
                      <div className="text-xs text-slate-400">{r.userId?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(refundAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetail(r)} title="Xem chi tiết"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDeleteSingle(r)} title="Xóa yêu cầu"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer">
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <RequestDetail
          request={detail}
          onClose={() => setDetail(null)}
          onReview={handleReview}
          reviewing={reviewing}
        />
      )}

      {/* Delete by date range modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => { if (!deleting) setShowDeleteModal(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Xóa yêu cầu hoàn tiền theo khoảng ngày</h2>
              <button disabled={deleting} onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-lg cursor-pointer">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                {deleteAll ? 'Bạn sắp xóa toàn bộ dữ liệu yêu cầu hoàn tiền.' : 'Chọn khoảng ngày muốn xóa.'}
                <span className="font-semibold text-red-600"> Hành động này không thể hoàn tác!</span>
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={deleteAll} onChange={(e) => setDeleteAll(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-400" />
                <span className="font-medium text-slate-700">Xóa tất cả dữ liệu</span>
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
              <button onClick={deleteRequestsByRange} disabled={deleting || (!deleteAll && (!deleteDateFrom || !deleteDateTo))}
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
