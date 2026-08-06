import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { showToast } from '@/lib/toast';
import {
  PaymentDetailBody,
  RefundModal,
  RefundSuccessModal,
} from '@/components/admin/paymentShared';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}
async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; } catch { return `Lỗi ${res.status}`; }
}

export default function PaymentDetailPage({ basePath = '/admin/payments' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/payments/${id}`);
      if (!res.ok) { const e = await readErr(res); throw new Error(e); }
      const payload = await res.json();
      const p = payload?.data || payload;
      setPayment(p);
      api(`/payments/${id}/viewed`, { method: 'PATCH' }).catch(() => {});
      window.dispatchEvent(new CustomEvent('payment-viewed'));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(basePath);
  };

  async function handleConfirm() {
    if (!payment) return;
    setConfirming(true);
    try {
      const res = await api('/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({ transactionId: payment.transactionId, method: payment.method }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Lỗi xác nhận'); }
      showToast('Xác nhận thanh toán thành công!', 'success');
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setConfirming(false); }
  }

  async function handleRefund(reason) {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const bookingId = refundTarget.bookingId?._id || refundTarget.bookingId;
      const res = await api('/payments/refund', {
        method: 'POST',
        body: JSON.stringify({ bookingId, reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Lỗi hoàn tiền'); }
      const data = await res.json();
      const updated = data?.data || data;
      setRefundTarget(null);
      setRefundSuccess(updated);
      showToast('Hoàn tiền thành công!', 'success');
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setRefunding(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          title="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Chi tiết thanh toán</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 font-mono">Mã GD: {payment?.transactionId || '...'}</p>
            {payment?.bookingId?.bookingCode && (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-xs text-slate-500 font-mono">Mã đơn: {payment.bookingId.bookingCode}</p>
              </>
            )}
            {payment?.bookingId && (
              <button 
                onClick={() => navigate('/admin/bookings', { state: { openBooking: { ...payment.bookingId, userId: payment.userId } } })} 
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline ml-1"
              >
                Xem đơn
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : payment ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <PaymentDetailBody
              payment={payment}
              onConfirm={handleConfirm}
              onRefund={() => setRefundTarget(payment)}
              confirming={confirming}
              refunding={refunding}
              secondaryLabel="Quay lại"
              onSecondary={goBack}
            />
          </div>

          {refundTarget && (
            <RefundModal
              payment={refundTarget}
              onConfirm={handleRefund}
              onClose={() => setRefundTarget(null)}
              refunding={refunding}
            />
          )}

          {refundSuccess && (
            <RefundSuccessModal
              payment={refundSuccess}
              onClose={() => setRefundSuccess(null)}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
