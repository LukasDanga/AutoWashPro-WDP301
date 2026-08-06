import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUUpLeft, User, Buildings, CalendarBlank, CheckCircle, XCircle } from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import { STATUS_MAP, formatCurrency, formatDateTime } from '@/components/shared/RefundRequests';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}
async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; } catch { return `Lỗi ${res.status}`; }
}

export default function RefundDetailPage({ basePath = '/admin/payments?tab=refunds' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const goToBooking = () => {
    const b = request?.bookingId || {};
    const bookingId = b._id || b;
    if (!bookingId) return;
    const isAdmin = basePath.startsWith('/admin');
    const roleBase = isAdmin ? '/admin' : '/manager';
    navigate(`${roleBase}/bookings?search=${encodeURIComponent(b.bookingCode || bookingId)}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/refund-requests/${id}`);
      if (!res.ok) { const e = await readErr(res); throw new Error(e); }
      const payload = await res.json();
      const r = payload?.data || payload;
      setRequest(r);
      if (r?._id) {
        const viewed = JSON.parse(localStorage.getItem('viewed_refund_requests') || '[]');
        if (!viewed.includes(r._id)) {
          const next = [...viewed, r._id];
          localStorage.setItem('viewed_refund_requests', JSON.stringify(next));
          window.dispatchEvent(new Event('refund-request-viewed'));
        }
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(basePath);
  };

  async function handleReview(decision) {
    if (!request) return;
    setReviewing(true);
    try {
      const res = await api(`/refund-requests/${request._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNote }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Không thể xử lý yêu cầu'); }
      showToast(decision === 'approved' ? 'Đã phê duyệt và hoàn tiền cho khách hàng!' : 'Đã từ chối yêu cầu hoàn tiền.', 'success');
      setReviewNote('');
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setReviewing(false); }
  }

  const booking = request?.bookingId || {};
  const isDepositOnly = booking.paymentStatus === 'deposit_paid' || (booking.depositPaid && booking.paymentStatus !== 'paid');
  const actualDeposit = booking.depositAmount || booking.deposit;
  const refundAmount = isDepositOnly && actualDeposit ? actualDeposit : (booking.finalPrice ?? request?.amount ?? request?.refundAmount);
  const st = STATUS_MAP[request?.status] || { label: request?.status || '—', cls: 'bg-slate-100 text-slate-500' };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          title="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Chi tiết yêu cầu hoàn tiền</h2>
          <p className="text-xs text-slate-400">Mã yêu cầu: {request?._id ? `#${request._id.slice(-6).toUpperCase()}` : '...'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : request ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 text-sm text-slate-600">
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
                <span className="block text-xs text-slate-400 font-medium">Mã đơn</span>
                <span className="font-semibold text-slate-700 font-mono mt-0.5">
                  {booking.bookingCode || ('AWP-' + String(booking._id || '—').slice(-8).toUpperCase())}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Gói dịch vụ</span>
                <span className="font-semibold text-slate-700 mt-0.5">{booking.packageId?.name || booking.packageName || '—'}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Chi nhánh</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <Buildings size={14} className="text-slate-400" />
                  {booking.branchId?.name || booking.branchName || '—'}
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
                <span className="block text-xs text-slate-400 font-medium">Xe</span>
                <span className="font-semibold text-slate-700 mt-0.5">
                  {booking.vehicleId
                    ? `${booking.vehicleId.licensePlate || ''}${booking.vehicleId.brand ? ` · ${booking.vehicleId.brand}${booking.vehicleId.model ? ' ' + booking.vehicleId.model : ''}` : ''}`.trim() || '—'
                    : '—'}
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
              <div>
                <span className="block text-xs text-slate-400 font-medium">Phương thức thanh toán</span>
                <span className="font-semibold text-slate-700 uppercase mt-0.5">{booking.paymentMethod || '—'}</span>
              </div>
            </div>

            <div className="pt-1">
              <button onClick={goToBooking}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer">
                Xem đơn đặt này
              </button>
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
          </div>

          {request.status === 'pending' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ghi chú (tuỳ chọn)</label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Ghi chú khi duyệt/từ chối..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview('rejected')}
                  disabled={reviewing}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <XCircle size={14} />
                  Từ chối
                </button>
                <button
                  onClick={() => handleReview('approved')}
                  disabled={reviewing}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {reviewing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle size={14} />}
                  {reviewing ? 'Đang xử lý…' : 'Phê duyệt & hoàn tiền'}
                </button>
              </div>
            </div>
          )}

          {request.status !== 'pending' && (
            <button onClick={goBack}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              Quay lại danh sách
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
