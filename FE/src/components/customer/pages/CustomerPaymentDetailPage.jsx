import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarBlank, Car, MapPin, Receipt, CreditCard } from '@phosphor-icons/react';
import { getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const PAYMENT_STATUS_MAP = {
  pending: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  failed: { label: 'Thất bại', cls: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'Đã hoàn tiền', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};
const METHOD_MAP = { cash: 'Tiền mặt', bank: 'Chuyển khoản', momo: 'MoMo', vnpay: 'VNPay', wallet: 'Ví điện tử' };
const TYPE_MAP = { deposit: 'Đặt cọc', remaining: 'Thanh toán phần còn lại', full: 'Thanh toán đầy đủ', topup: 'Nạp tiền vào ví' };

function fmtCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }

export default function CustomerPaymentDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentId = location.pathname.split('/').pop();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody?.message || `HTTP ${r.status}: Không thể tải chi tiết thanh toán`);
      }
      const payload = await r.json();
      setPayment(payload?.data || payload);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [paymentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => navigate('/payments')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} /> Quay lại lịch sử thanh toán
        </button>
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error || 'Không tìm thấy thông tin'}</div>
      </div>
    );
  }

  const booking = payment.bookingId || {};
  const statusInfo = PAYMENT_STATUS_MAP[payment.status] || { label: payment.status, cls: 'bg-slate-100 text-slate-500' };
  const hasBooking = booking && booking._id;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/payments')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Chi tiết thanh toán</h2>
          <p className="text-xs text-slate-400 font-mono">Mã GD: {payment.transactionId || '—'}</p>
        </div>
      </div>

      {/* Status + Amount Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-semibold rounded-full px-3 py-1 border ${statusInfo.cls}`}>{statusInfo.label}</span>
          <span className="text-xs text-slate-400">{fmtDateTime(payment.createdAt)}</span>
        </div>
        <p className="text-3xl font-bold text-slate-800">{fmtCurrency(payment.amount)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-600`}>
            {TYPE_MAP[payment.paymentType] || payment.paymentType}
          </span>
          <span className="text-xs text-slate-500">{METHOD_MAP[payment.method] || payment.method}</span>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Receipt size={16} className="text-slate-400" /> Hóa đơn thanh toán
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {payment.paidAt && (
            <div>
              <span className="text-xs text-slate-400">Ngày thanh toán</span>
              <p className="font-semibold text-slate-700 mt-0.5">{fmtDateTime(payment.paidAt)}</p>
            </div>
          )}
          {payment.packageName && (
            <div>
              <span className="text-xs text-slate-400">Gói dịch vụ</span>
              <p className="font-semibold text-slate-700 mt-0.5">{payment.packageName}</p>
            </div>
          )}
          {payment.packagePrice && (
            <div>
              <span className="text-xs text-slate-400">Giá gói</span>
              <p className="font-semibold text-slate-700 mt-0.5">{fmtCurrency(payment.packagePrice)}</p>
            </div>
          )}
          {payment.slotPackId && (
            <div>
              <span className="text-xs text-slate-400">Mã gói lượt</span>
              <p className="font-semibold text-slate-700 mt-0.5">{payment.slotPackId.packCode || '—'}</p>
            </div>
          )}
          {payment.failureReason && (
            <div className="sm:col-span-2">
              <span className="text-xs text-slate-400">Lý do thất bại</span>
              <p className="font-medium text-red-500 mt-0.5">{payment.failureReason}</p>
            </div>
          )}
          {payment.refundedAt && (
            <div>
              <span className="text-xs text-slate-400">Ngày hoàn tiền</span>
              <p className="font-medium text-slate-600 mt-0.5">{fmtDateTime(payment.refundedAt)}</p>
            </div>
          )}
        </div>

        {/* Bank info */}
        {payment.method === 'bank' && payment.bankInfo && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Thông tin chuyển khoản</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">Ngân hàng:</span> <span className="font-semibold text-slate-700">{payment.bankInfo.bankName}</span></div>
              <div><span className="text-slate-400">Số TK:</span> <span className="font-mono font-semibold text-slate-700">{payment.bankInfo.accountNumber}</span></div>
              <div><span className="text-slate-400">Chủ TK:</span> <span className="font-semibold text-slate-700">{payment.bankInfo.accountHolder}</span></div>
              {payment.transactionId && (
                <div>
                  <span className="text-slate-400">Nội dung CK:</span>
                  <span className="font-mono font-semibold text-slate-700 ml-1">{payment.bankInfo.transferContent}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Booking Info */}
      {hasBooking && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CalendarBlank size={16} className="text-slate-400" /> Thông tin đặt lịch
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400">Mã đơn</span>
              <p className="font-mono font-bold text-emerald-700 mt-0.5">#{booking.bookingCode || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Dịch vụ</span>
              <p className="font-semibold text-slate-700 mt-0.5">{booking.packageId?.name || booking.packageName || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <CalendarBlank size={14} className="text-slate-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400">Ngày & Giờ</span>
                <p className="font-semibold text-slate-700">
                  {booking.bookingDate ? fmtDate(booking.bookingDate) : '—'}
                  {booking.startTime ? ` · ${booking.startTime}` : ''}
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-400">Chi nhánh</span>
              <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400" />
                {booking.branchId?.name || booking.branchName || '—'}
              </p>
            </div>
            {booking.vehicleId && (
              <div>
                <span className="text-xs text-slate-400">Xe</span>
                <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                  <Car size={14} className="text-slate-400" />
                  {booking.vehicleId.licensePlate}
                  {booking.vehicleId.brand ? ` · ${booking.vehicleId.brand}` : ''}
                </p>
              </div>
            )}
            {booking.finalPrice && (
              <div>
                <span className="text-xs text-slate-400">Tổng tiền dịch vụ</span>
                <p className="font-semibold text-slate-700 mt-0.5">{fmtCurrency(booking.finalPrice)}</p>
              </div>
            )}
            {booking.status && (
              <div>
                <span className="text-xs text-slate-400">Trạng thái đơn</span>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {booking.status === 'awaiting_payment' ? 'Chờ thanh toán' :
                   booking.status === 'completed' ? 'Hoàn thành' :
                   booking.status === 'pending' ? 'Chờ xử lý' :
                   booking.status === 'checked_in' ? 'Đã check-in' :
                   booking.status === 'in_progress' ? 'Đang rửa' :
                   booking.status === 'cancelled' ? 'Đã hủy' :
                   booking.status}
                </p>
              </div>
            )}
          </div>

          {/* View booking button */}
          <button
            onClick={() => navigate(`/history?bookingId=${booking._id}`)}
            className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
            <CalendarBlank size={16} />
            Xem chi tiết đơn đặt lịch
          </button>
        </div>
      )}
    </div>
  );
}
