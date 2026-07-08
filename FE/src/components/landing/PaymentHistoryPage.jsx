import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAYMENT_STATUS_MAP = {
  pending: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  failed: { label: 'Thất bại', cls: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'Đã hoàn tiền', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const METHOD_MAP = {
  cash: 'Tiền mặt',
  momo: 'Momo',
  vnpay: 'VNPay',
  bank: 'Ngân hàng',
};

function formatCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function formatDate(d) { return new Date(d).toLocaleDateString('vi-VN'); }
function formatDateTime(d) { return new Date(d).toLocaleString('vi-VN'); }

function StatusBadge({ status }) {
  const s = PAYMENT_STATUS_MAP[status] || { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

export default function PaymentHistoryPage({ onBack, apiBase, token }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailPayment, setDetailPayment] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase || API_BASE}/payments/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(payload => {
        const data = payload?.data || payload;
        const paymentsList = Array.isArray(data) ? data : [];
        if (paymentsList.length > 0) {
          setPayments(paymentsList);
          setLoading(false);
        } else {
          // Fallback: fetch bookings with payment info
          fetch(`${apiBase || API_BASE}/bookings/my?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r2 => r2.json())
            .then(payload2 => {
              const data2 = payload2?.data || payload2;
              const bookings = Array.isArray(data2) ? data2 : (data2?.bookings || []);
              const mapped = bookings
                .filter(b => b.finalPrice || b.totalAmount)
                .map(b => ({
                  _id: `booking_${b._id}`,
                  bookingId: b._id || b.id,
                  amount: b.totalAmount || b.finalPrice || 0,
                  status: b.paymentStatus === 'paid' ? 'paid' : b.paymentStatus === 'unpaid' ? 'pending' : b.paymentStatus || 'pending',
                  method: 'cash',
                  paymentType: 'full',
                  createdAt: b.createdAt,
                  paidAt: b.paymentStatus === 'paid' ? (b.updatedAt || b.createdAt) : undefined,
                  transactionId: null,
                  bookingData: b,
                }));
              setPayments(mapped);
            })
            .catch(() => setPayments([]))
            .finally(() => setLoading(false));
        }
      })
      .catch(() => { showToast('Không thể tải lịch sử thanh toán', 'error'); setPayments([]); setLoading(false); });
  }, [apiBase, token]);

  async function openDetail(payment) {
    setDetailPayment(null);
    setShowDetail(true);
    try {
      const bId = payment.bookingId?._id || payment.bookingId || payment.bookingData?._id;
      if (payment.bookingData) {
        // Fallback detail from booking data
        setDetailPayment({
          ...payment,
          bookingId: payment.bookingData,
        });
        return;
      }
      const res = await fetch(`${apiBase || API_BASE}/payments/booking/${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải chi tiết');
      const payload = await res.json();
      setDetailPayment(payload?.data || payload);
    } catch (e) {
      showToast(e.message, 'error');
      setShowDetail(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Quay lại
          </button>
          <h1 className="text-sm font-bold text-slate-800">Lịch sử thanh toán</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Đang tải...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => {
              const pId = p._id || p.id;
              const booking = p.bookingId || p.bookingData || {};
              return (
                <div key={pId} onClick={() => openDetail(p)}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {booking?.packageId?.name || booking?.packageName || booking?.branchId?.name || booking?.branchName || 'Thanh toán'}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-slate-400">
                        {booking?.bookingDate ? formatDate(booking.bookingDate) : ''}
                        {booking?.startTime ? ` ${booking.startTime}` : ''}
                        {p.method && ` · ${METHOD_MAP[p.method] || p.method}`}
                      </p>
                      {p.paymentType === 'deposit' && booking?.finalPrice && (
                        <p className="text-xs text-amber-600 font-semibold mt-1.5">
                          Đặt cọc 30% · Còn lại {formatCurrency(Math.max(0, (booking.finalPrice || 0) - (p.amount || 0)))}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.paymentType === 'deposit' ? 'Đặt cọc' : p.paymentType === 'remaining' ? 'Còn lại' : 'Toàn bộ'}</p>
                    </div>
                  </div>
                  {p.transactionId && (
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">Mã GD: {p.transactionId}</div>
                  )}
                  {p.paidAt && (
                    <div className="text-[10px] text-slate-400 mt-0.5">Đã thanh toán: {formatDateTime(p.paidAt)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showDetail && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setShowDetail(false); setDetailPayment(null); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Chi tiết thanh toán</h3>
            {detailPayment ? (
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Trạng thái</span>
                  <StatusBadge status={detailPayment.status} />
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Số tiền</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(detailPayment.amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Phương thức</span>
                  <span className="text-sm text-slate-700">{METHOD_MAP[detailPayment.method] || detailPayment.method}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Loại</span>
                  <span className="text-sm text-slate-700">{detailPayment.paymentType === 'deposit' ? 'Đặt cọc' : detailPayment.paymentType === 'remaining' ? 'Còn lại' : 'Toàn bộ'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Ngày tạo</span>
                  <span className="text-sm text-slate-700">{formatDateTime(detailPayment.createdAt)}</span>
                </div>
                {detailPayment.paidAt && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Ngày thanh toán</span>
                    <span className="text-sm text-slate-700">{formatDateTime(detailPayment.paidAt)}</span>
                  </div>
                )}
                {detailPayment.transactionId && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Mã giao dịch</span>
                    <span className="text-sm font-mono text-slate-700">{detailPayment.transactionId}</span>
                  </div>
                )}
                {detailPayment.failureReason && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-600 mb-1">Lý do thất bại</p>
                    <p className="text-sm text-red-700">{detailPayment.failureReason}</p>
                  </div>
                )}
                {detailPayment.bookingId && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-2">THÔNG TIN ĐẶT LỊCH</p>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Dịch vụ</span>
                      <span className="text-sm text-slate-700 text-right">{detailPayment.bookingId.packageId?.name || detailPayment.bookingId.packageName || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Ngày</span>
                      <span className="text-sm text-slate-700">{detailPayment.bookingId.bookingDate ? formatDate(detailPayment.bookingId.bookingDate) : '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Giờ</span>
                      <span className="text-sm text-slate-700">{detailPayment.bookingId.startTime || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Chi nhánh</span>
                      <span className="text-sm text-slate-700">{detailPayment.bookingId.branchId?.name || detailPayment.bookingId.branchName || '—'}</span>
                    </div>
                    {detailPayment.paymentType === 'deposit' && (
                      <>
                        <div className="flex justify-between py-1.5">
                          <span className="text-xs text-amber-600 font-semibold">Đặt cọc</span>
                          <span className="text-sm font-bold text-amber-600">{formatCurrency(detailPayment.amount)}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-xs text-slate-500">Còn lại (thanh toán sau)</span>
                          <span className="text-sm text-slate-700">{formatCurrency(Math.max(0, (detailPayment.bookingId.finalPrice || 0) - (detailPayment.amount || 0)))}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải...</div>
            )}
            <button onClick={() => { setShowDetail(false); setDetailPayment(null); }}
              className="mt-6 w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
