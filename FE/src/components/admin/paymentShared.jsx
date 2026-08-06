import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CurrencyDollar,
  CheckCircle,
  Clock,
  Warning,
  XCircle,
  ArrowUUpLeft,
  Check,
  User,
  Buildings,
  CalendarBlank,
  X,
} from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';

export function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN');
}

export function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export const STATUS_MAP = {
  unpaid:         { label: 'Chưa thanh toán', cls: 'bg-rose-50 text-rose-700', icon: Clock },
  pending:        { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-700', icon: Clock },
  deposit_paid:   { label: 'Đã cọc', cls: 'bg-teal-50 text-teal-700', icon: CheckCircle },
  partially_paid: { label: 'Thanh toán một phần', cls: 'bg-blue-50 text-blue-700', icon: CheckCircle },
  paid:           { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  failed:         { label: 'Thất bại',      cls: 'bg-red-50 text-red-600',      icon: XCircle },
  refunded:       { label: 'Đã hoàn tiền',  cls: 'bg-slate-100 text-slate-500',  icon: ArrowUUpLeft },
};

export const METHOD_MAP = {
  cash: { label: 'Tiền mặt', cls: 'bg-emerald-50 text-emerald-700' },
  bank: { label: 'Chuyển khoản', cls: 'bg-blue-50 text-blue-700' },
};

export function Modal({ title, onClose, children }) {
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

/* ─────────────────────── Payment detail body (page & modal) ─────────────────────── */
export function PaymentDetailBody({ payment, onConfirm, onRefund, confirming, refunding, secondaryLabel, onSecondary }) {
  const navigate = useNavigate();
  const st = STATUS_MAP[payment.status] || { label: payment.status, cls: 'bg-slate-100 text-slate-500' };
  const mt = METHOD_MAP[payment.method] || { label: payment.method, cls: 'bg-slate-100 text-slate-500' };

  return (
    <div className="space-y-5 text-sm text-slate-600">
      {/* Overview Block */}
      <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-xl border-2 border-white shadow-sm">
          <CurrencyDollar size={28} weight="duotone" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {formatCurrency(payment.amount)}
            <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
          </h4>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-slate-500 font-mono">Mã GD: {payment.transactionId || '—'}</p>
            {(payment.bookingId?.bookingCode || payment.slotPackId?.packCode || payment.bookingId?._id) && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <p className="text-xs text-slate-500 font-mono">
                  {payment.slotPackId ? 'Mã gói:' : 'Mã đơn:'} <span className="font-semibold text-slate-700">
                    {payment.slotPackId?.packCode || payment.bookingId?.bookingCode || ('AWP-' + String(payment.bookingId?._id).slice(-8).toUpperCase())}
                  </span>
                </p>
                <button
                  onClick={() => {
                    const isAdmin = window.location.pathname.startsWith('/admin');
                    const basePath = isAdmin ? '/admin' : '/manager';
                    if (payment.slotPackId?._id) {
                      navigate(`${basePath}/slot-packs`, { 
                        state: { openSlotPack: { _id: payment.slotPackId._id, packCode: payment.slotPackId.packCode, userId: payment.userId } } 
                      });
                    } else if (payment.bookingId?._id) {
                      const code = payment.bookingId?.bookingCode || ('AWP-' + String(payment.bookingId?._id).slice(-8).toUpperCase());
                      navigate(`${basePath}/bookings?search=${encodeURIComponent(code)}`);
                    }
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  {payment.slotPackId ? 'Xem gói' : 'Xem đơn'}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${mt.cls}`}>{mt.label}</span>
            <span className="text-[11px] text-slate-400">{formatDateTime(payment.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-b border-slate-100 py-4">
        <div>
          <span className="block text-xs text-slate-400 font-medium">Khách hàng</span>
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
            <User size={14} className="text-slate-400" />
            {payment.userId?.name || '—'}
            {payment.userId?.tier && <TierBadge tier={payment.userId.tier} />}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-400 font-medium">Email</span>
          <span className="font-semibold text-slate-700 mt-0.5">{payment.userId?.email || '—'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-400 font-medium">Chi nhánh</span>
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
            <Buildings size={14} className="text-slate-400" />
            {payment.bookingId?.branchId?.name || payment.slotPackId?.branchId?.name || payment.branchId?.name || (payment.slotPackId ? 'Toàn hệ thống' : '—')}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-400 font-medium">Ngày đặt</span>
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
            <CalendarBlank size={14} className="text-slate-400" />
            {payment.bookingId?.bookingDate ? formatDate(payment.bookingId.bookingDate) : (payment.createdAt ? formatDate(payment.createdAt) : '—')}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-400 font-medium">Loại thanh toán</span>
          <span className="font-semibold text-slate-700 mt-0.5">
            {payment.slotPackId ? `Mua gói lượt (${payment.slotPackId.packCode || 'Gói lượt'})` : payment.paymentType === 'deposit' ? 'Đặt cọc' : payment.paymentType === 'remaining' ? 'Thanh toán phần còn lại' : 'Thanh toán đầy đủ'}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-400 font-medium">Trạng thái đơn hàng</span>
          <span className="font-semibold text-slate-700 mt-0.5">
            {payment.bookingId?.status ? (payment.bookingId.status === 'awaiting_payment' ? 'Chờ thanh toán' : payment.bookingId.status === 'completed' ? 'Hoàn thành' : payment.bookingId.status === 'pending' ? 'Chờ xử lý' : payment.bookingId.status === 'checked_in' ? 'Đã check-in' : payment.bookingId.status === 'in_progress' ? 'Đang rửa' : payment.bookingId.status === 'cancelled' ? 'Đã hủy' : payment.bookingId.status) : payment.slotPackId ? `Gói lượt (${payment.slotPackId.status || 'Đã kích hoạt'})` : 'Giao dịch tạm tính'}
          </span>
        </div>
      </div>

      {/* Transaction Info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-400">
        {payment.paidAt && (
          <div>
            <span>Ngày thanh toán:</span>
            <p className="font-medium text-slate-600 mt-0.5">{formatDateTime(payment.paidAt)}</p>
          </div>
        )}
        {payment.refundedAt && (
          <div>
            <span>Ngày hoàn tiền:</span>
            <p className="font-medium text-slate-600 mt-0.5">{formatDateTime(payment.refundedAt)}</p>
          </div>
        )}
        {payment.failureReason && (
          <div className="sm:col-span-2">
            <span>Lý do thất bại:</span>
            <p className="font-medium text-red-500 mt-0.5">{payment.failureReason}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {payment.status === 'pending' && (
        <div className="flex gap-2 border-t border-slate-100 pt-4">
          {onSecondary && (
            <button onClick={onSecondary}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              {secondaryLabel || 'Đóng'}
            </button>
          )}
          <button onClick={onConfirm} disabled={confirming}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
            {confirming ? <Spinner size={14} /> : <CheckCircle size={14} />}
            {confirming ? 'Đang xác nhận…' : 'Xác nhận thanh toán'}
          </button>
        </div>
      )}
      {payment.status === 'paid' && (
        <div className="flex gap-2 border-t border-slate-100 pt-4">
          {onSecondary && (
            <button onClick={onSecondary}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              {secondaryLabel || 'Đóng'}
            </button>
          )}
          <button onClick={onRefund} disabled={refunding}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {refunding ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ArrowUUpLeft size={14} />}
            {refunding ? 'Đang hoàn tiền…' : 'Hoàn tiền'}
          </button>
        </div>
      )}
      {(payment.status === 'failed' || payment.status === 'refunded') && onSecondary && (
        <div className="border-t border-slate-100 pt-4">
          <button onClick={onSecondary}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            {secondaryLabel || 'Đóng'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Refund Modal ─────────────────────────── */
export function RefundModal({ payment, onConfirm, onClose, refunding }) {
  const [reason, setReason] = useState('');

  return (
    <Modal title="Xác nhận hoàn tiền" onClose={onClose}>
      <div className="space-y-5 text-sm text-slate-600">
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <Warning size={20} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">Bạn có chắc chắn muốn hoàn tiền giao dịch này? Hành động này không thể hoàn tác.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Mã giao dịch</span>
            <span className="font-mono text-xs font-bold text-slate-700">{payment.transactionId || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Khách hàng</span>
            <span className="font-semibold text-slate-700">{payment.userId?.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Phương thức</span>
            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${(METHOD_MAP[payment.method] || {}).cls || ''}`}>
              {(METHOD_MAP[payment.method] || {}).label || payment.method}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-xs text-slate-400">Số tiền hoàn</span>
            <span className="text-lg font-bold text-red-600">{formatCurrency(payment.amount)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Lý do hoàn tiền</label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Nhập lý do hoàn tiền (không bắt buộc)..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors resize-none"
          />
        </div>

        <div className="flex gap-2 border-t border-slate-100 pt-4">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={() => onConfirm(reason)} disabled={refunding}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {refunding ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <ArrowUUpLeft size={14} />
            )}
            {refunding ? 'Đang hoàn tiền…' : 'Xác nhận hoàn tiền'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Refund Success Modal ─────────────────────────── */
export function RefundSuccessModal({ payment, onClose }) {
  return (
    <Modal title="Hoàn tiền thành công" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check size={32} weight="bold" className="text-emerald-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-800">Giao dịch đã được hoàn tiền</p>
          <p className="mt-1 text-sm text-slate-500">
            Số tiền <span className="font-semibold text-red-600">{formatCurrency(payment.amount)}</span> đã được hoàn về cho khách hàng.
          </p>
        </div>
        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Mã giao dịch:</span>
            <span className="font-mono font-bold text-slate-700">{payment.transactionId || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Khách hàng:</span>
            <span className="font-semibold text-slate-700">{payment.userId?.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Thời gian:</span>
            <span className="text-slate-600">{formatDateTime(new Date())}</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
          Đóng
        </button>
      </div>
    </Modal>
  );
}
