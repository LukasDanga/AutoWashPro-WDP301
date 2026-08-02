import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { showToast } from '@/lib/toast';
import useSSE from '@/hooks/useSSE';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_MAP = {
  pending:          { label: 'Chờ xử lý',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  confirmed:        { label: 'Đã xác nhận', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  checked_in:       { label: 'Đã check-in', cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  in_progress:      { label: 'Đang rửa',    cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  awaiting_payment: { label: 'Chờ thanh toán', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  completed:        { label: 'Hoàn thành',  cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  cancelled:        { label: 'Đã hủy',      cls: 'bg-red-50 text-red-500 border-red-200' },
  paid:             { label: 'Đã thanh toán', cls: 'bg-green-50 text-green-600 border-green-200' },
};

function formatCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function formatDate(d) { return new Date(d).toLocaleDateString('vi-VN'); }
function formatDateTime(d) { return new Date(d).toLocaleDateString('vi-VN') + ' ' + new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const RATING_LABELS = {
    1: '😞 Chưa hài lòng',
    2: '😐 Cần cải thiện',
    3: '🙂 Bình thường',
    4: '😊 Tốt & Hài lòng',
    5: '🌟 Xuất sắc & Tuyệt vời!',
  };
  const activeRating = hover || value;

  return (
    <div className="flex flex-col items-center gap-2 my-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl transition-all duration-150 transform hover:scale-110 active:scale-95 cursor-pointer ${
              s <= activeRating
                ? 'text-amber-400 bg-amber-50 shadow-xs border border-amber-200'
                : 'text-slate-300 bg-slate-50 hover:bg-slate-100 hover:text-amber-300 border border-slate-100'
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <div className="h-6 flex items-center justify-center">
        {activeRating > 0 ? (
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80 animate-in fade-in zoom-in-95 duration-100">
            {RATING_LABELS[activeRating]}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400">Chọn mức độ hài lòng của bạn</span>
        )}
      </div>
    </div>
  );
}

export default function CustomerBookingDetail({ apiBase, token, user, onUserUpdate }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const id = decodeURIComponent(pathname.split('/').pop() || '');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [packagesList, setPackagesList] = useState([]);
  const [refunds, setRefunds] = useState([]);

  // Sub-services edit
  const [editingSubServices, setEditingSubServices] = useState(false);
  const [editedSubServiceNames, setEditedSubServiceNames] = useState([]);
  const [savingSubServices, setSavingSubServices] = useState(false);
  const [refundConfirmData, setRefundConfirmData] = useState(null);

  // Review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pay remaining
  const [payRemainingTarget, setPayRemainingTarget] = useState(null);
  const [payRemainingMethod, setPayRemainingMethod] = useState('vnpay');
  const [payRemainingLoading, setPayRemainingLoading] = useState(false);
  const [payRemainingBankQR, setPayRemainingBankQR] = useState(null);
  const [qrPollCount, setQrPollCount] = useState(0);

  // Cancel
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelConfirmError, setCancelConfirmError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPreview, setCancelPreview] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Cancel recurring
  const [showCancelRecurringConfirm, setShowCancelRecurringConfirm] = useState(false);
  const [cancelRecurringTarget, setCancelRecurringTarget] = useState(null);

  // QR
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  // Refund request
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  // Receipt (biên lai)
  const [showReceipt, setShowReceipt] = useState(false);

  // Recurring group
  const [recurringGroupBookings, setRecurringGroupBookings] = useState([]);
  const [recurringGroupLoading, setRecurringGroupLoading] = useState(false);

  const [refreshSignal, setRefreshSignal] = useState(0);

  const fetchDetail = useCallback(async (opts = {}) => {
    if (!id) return;
    if (!opts.silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Không thể tải chi tiết đơn đặt');
      }
      const payload = await res.json();
      setBooking(payload?.data || payload);
    } catch (err) {
      if (!opts.silent) setError(err.message || 'Không thể tải chi tiết đơn đặt');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [id, apiBase, token]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Packages list (for sub-services)
  useEffect(() => {
    fetch(`${apiBase || API_BASE}/packages?limit=all`)
      .then(res => res.json())
      .then(data => {
        const pkgs = data.data?.data || data.data || (Array.isArray(data) ? data : []);
        setPackagesList(Array.isArray(pkgs) ? pkgs : []);
      })
      .catch(() => {});
  }, [apiBase]);

  // Refunds list
  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase || API_BASE}/refund-requests/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(payload => {
        const list = Array.isArray(payload?.data?.data)
          ? payload.data.data
          : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []));
        setRefunds(list);
      })
      .catch(() => setRefunds([]));
  }, [apiBase, token]);

  // Recurring group bookings
  const loadRecurringGroup = useCallback(async (group) => {
    if (!group?.recurringGroupId) return;
    setRecurringGroupLoading(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/my?recurringGroupId=${group.recurringGroupId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        const result = payload?.data || payload;
        setRecurringGroupBookings(Array.isArray(result) ? result : (result?.bookings || []));
      }
    } catch (e) {
      console.error(e);
      setRecurringGroupBookings([]);
    } finally {
      setRecurringGroupLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (refreshSignal > 0 && booking?.recurringGroupId) {
      loadRecurringGroup(booking);
    }
  }, [refreshSignal, booking?.recurringGroupId, loadRecurringGroup]);

  // SSE refresh
  const silentRefresh = useCallback(() => fetchDetail({ silent: true }), [fetchDetail]);
  const handleSSEUpdate = useCallback(() => {
    silentRefresh();
    setRefreshSignal(s => s + 1);
  }, [silentRefresh]);
  useSSE(token, 'notification', handleSSEUpdate);
  useSSE(token, 'my_bookings_updated', handleSSEUpdate);
  useSSE(token, 'booking_new', handleSSEUpdate);
  useSSE(token, 'booking_update', handleSSEUpdate);
  useSSE(token, 'points_updated', handleSSEUpdate);
  useSSE(token, 'refund_request_updated', handleSSEUpdate);

  const refreshUserProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase || API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        const freshUser = payload?.data || payload;
        if (freshUser && typeof onUserUpdate === 'function') {
          onUserUpdate(freshUser);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const updateLocalBooking = (updated) => {
    setBooking(prev => {
      if (!prev) return updated;
      return { ...prev, ...updated };
    });
  };

  /* ── Sub-services ── */

  const handleStartEditSubServices = (b) => {
    const pkgIdStr = String(b.packageId?._id || b.packageId?.id || b.packageId || '');
    const pkgFromList = (packagesList || []).find(p => String(p._id || p.id) === pkgIdStr);
    const pkgObj = (pkgFromList && Array.isArray(pkgFromList.subServices) && pkgFromList.subServices.length > 0)
      ? pkgFromList
      : (typeof b.packageId === 'object' && b.packageId !== null && Array.isArray(b.packageId.subServices) && b.packageId.subServices.length > 0
        ? b.packageId
        : pkgFromList || (typeof b.packageId === 'object' ? b.packageId : null));

    const pkgSubs = pkgObj?.subServices || [];
    const defaultIncludedSubs = pkgSubs.filter(s => {
      const sOpt = typeof s === 'object' ? s?.isOptional : false;
      const sPrice = typeof s === 'object' ? (s?.price || 0) : 0;
      return sOpt === false || sOpt === undefined || sPrice === 0;
    });
    const defaultIncludedNames = defaultIncludedSubs.map(s => (typeof s === 'string' ? s : s?.name));
    const selectedNames = Array.isArray(b.selectedSubServices)
      ? b.selectedSubServices.map(x => (typeof x === 'string' ? x : x?.name))
      : [];
    const hasAnyIncludedInSelected = selectedNames.length > 0 && defaultIncludedNames.some(name => selectedNames.includes(name));
    const initialSelected = [];

    if (Array.isArray(pkgSubs)) {
      pkgSubs.forEach(s => {
        const sName = typeof s === 'string' ? s : s?.name;
        const sOpt = typeof s === 'object' ? s?.isOptional : false;
        const sPrice = typeof s === 'object' ? (s?.price || 0) : 0;
        const isDefaultIncluded = sOpt === false || sOpt === undefined || sPrice === 0;
        const isKept = !hasAnyIncludedInSelected || selectedNames.includes(sName);
        if (sName && isDefaultIncluded && isKept && !initialSelected.includes(sName)) {
          initialSelected.push(sName);
        }
      });
    }

    if (Array.isArray(b.selectedSubServices)) {
      b.selectedSubServices.forEach(s => {
        const name = typeof s === 'string' ? s : s.name;
        if (name && !initialSelected.includes(name)) {
          initialSelected.push(name);
        }
      });
    }

    setEditedSubServiceNames(initialSelected);
    setEditingSubServices(true);
  };

  const handleToggleSubService = (serviceName) => {
    setEditedSubServiceNames(prev =>
      prev.includes(serviceName)
        ? prev.filter(name => name !== serviceName)
        : [...prev, serviceName]
    );
  };

  const executeSaveSubServices = async (b, targetSubServices) => {
    const bId = b._id || b.id;
    setSavingSubServices(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/sub-services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subServices: targetSubServices })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi cập nhật dịch vụ');
      }

      const updated = data.data || data;
      const refunded = data.refundAmount || (updated && updated.refundAmount) || 0;

      if (refunded > 0) {
        showToast(`🎉 Đã cập nhật dịch vụ và hoàn ${formatCurrency(refunded)} vào Ví của bạn thành công!`, 'success');
      } else {
        showToast('Đã cập nhật dịch vụ thành công!', 'success');
      }

      updateLocalBooking(updated);
      setEditingSubServices(false);
      setRefundConfirmData(null);
      refreshUserProfile();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingSubServices(false);
    }
  };

  const handleSaveSubServices = async (b) => {
    const currentPaid = b.paymentStatus === 'paid'
      ? Math.max(b.finalPrice || 0, b.depositAmount || 0)
      : (b.depositPaid || b.paymentStatus === 'deposit_paid' ? (b.depositAmount || 0) : 0);

    const pkgIdStr = String(b.packageId?._id || b.packageId?.id || b.packageId || '');
    const pkgFromList = (packagesList || []).find(p => String(p._id || p.id) === pkgIdStr);
    const pkgObj = (pkgFromList && Array.isArray(pkgFromList.subServices) && pkgFromList.subServices.length > 0)
      ? pkgFromList
      : (typeof b.packageId === 'object' && b.packageId !== null ? b.packageId : pkgFromList);

    const pkgSubs = Array.isArray(pkgObj?.subServices) ? pkgObj.subServices : [];
    const basePrice = b.bookingType === 'slot_pack_usage' ? 0 : (b.packagePrice || pkgObj?.price || b.packageId?.price || 0);

    let editedExtraPrice = 0;
    editedSubServiceNames.forEach(name => {
      const foundPkgSub = pkgSubs.find(s => (s.name || s) === name);
      const foundSelectedSub = Array.isArray(b.selectedSubServices) ? b.selectedSubServices.find(s => (s.name || s) === name) : null;
      const subObj = foundPkgSub || foundSelectedSub;

      const isOpt = typeof subObj === 'object' ? subObj?.isOptional !== false : true;
      const price = typeof subObj === 'object' ? (subObj?.price || 0) : 0;

      if (isOpt && price > 0) {
        editedExtraPrice += price;
      }
    });

    const newFinalPrice = Math.max(0, basePrice + editedExtraPrice - (b.discountAmount || 0));
    const actualRefundAmount = Math.max(0, currentPaid - newFinalPrice);

    const prevSubServices = Array.isArray(b.selectedSubServices) ? b.selectedSubServices : [];
    const removedOptionalSubs = prevSubServices.filter(s => {
      const name = typeof s === 'string' ? s : s?.name;
      const isOpt = typeof s === 'object' ? s.isOptional !== false : true;
      return isOpt && !editedSubServiceNames.includes(name);
    });

    if (currentPaid > 0 && actualRefundAmount > 0 && removedOptionalSubs.length > 0) {
      const canceledNames = removedOptionalSubs.map(s => typeof s === 'string' ? s : s?.name);
      setRefundConfirmData({
        booking: b,
        refundAmount: actualRefundAmount,
        canceledNames,
        targetSubServices: editedSubServiceNames
      });
      return;
    }

    await executeSaveSubServices(b, editedSubServiceNames);
  };

  /* ── Pay remaining ── */

  const handlePayRemaining = (b) => {
    setPayRemainingTarget(b);
    setPayRemainingMethod('vnpay');
    setPayRemainingBankQR(null);
  };

  const confirmPayRemaining = async () => {
    if (!payRemainingTarget) return;
    try {
      setPayRemainingLoading(true);
      const bId = payRemainingTarget._id || payRemainingTarget.id;

      if (payRemainingMethod === 'wallet') {
        const res = await fetch(`${apiBase || API_BASE}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: bId, method: 'wallet', paymentType: 'remaining' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Thanh toán bằng ví thất bại');
        showToast('Thanh toán thành công');
        setPayRemainingTarget(null);
        refreshUserProfile();
        fetchDetail({ silent: true });
      } else if (payRemainingMethod === 'bank') {
        const res = await fetch(`${apiBase || API_BASE}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: bId, method: 'bank', paymentType: 'remaining' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Tạo mã QR thanh toán thất bại');
        setPayRemainingBankQR(data?.data || data);
        setQrPollCount(0);
      } else {
        const res = await fetch(`${apiBase || API_BASE}/payments/vnpay-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: bId, paymentType: 'remaining', origin: window.location.origin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Khởi tạo thanh toán thất bại');

        if (data?.data?.paymentUrl || data?.data?.url) {
          window.location.href = data?.data?.paymentUrl || data?.data?.url;
        } else {
          showToast('Khởi tạo thanh toán thành công');
          setPayRemainingTarget(null);
          fetchDetail({ silent: true });
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPayRemainingLoading(false);
    }
  };

  const checkPayRemainingBankStatus = useCallback(async () => {
    if (!payRemainingBankQR) return;
    try {
      const pid = payRemainingBankQR._id || payRemainingBankQR.id;
      const res = await fetch(`${apiBase || API_BASE}/payments/${pid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const p = data?.data || data;
      if (p?.status === 'paid') {
        showToast('Thanh toán chuyển khoản thành công', 'success');
        setPayRemainingBankQR(null);
        setPayRemainingTarget(null);
        refreshUserProfile();
        fetchDetail({ silent: true });
      } else {
        setQrPollCount(c => c + 1);
      }
    } catch (e) {}
  }, [payRemainingBankQR, token, apiBase, fetchDetail, refreshUserProfile]);

  useEffect(() => {
    if (!payRemainingBankQR) return;
    const timer = setInterval(checkPayRemainingBankStatus, 5000);
    return () => clearInterval(timer);
  }, [payRemainingBankQR, checkPayRemainingBankStatus]);

  /* ── Cancel ── */

  const handleCancel = async (b) => {
    setCancelTarget(b);
    setCancelConfirmError('');
    setCancelReason('');
    setCancelPreview(null);
    setShowCancelConfirm(true);
    try {
      const bId = b._id || b.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/cancel-preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setCancelPreview(payload?.data || null);
      }
    } catch (e) { /* ignore preview errors */ }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelConfirmError('Vui lòng nhập lý do hủy đơn');
      return;
    }
    setCancelLoading(true);
    setCancelConfirmError('');
    try {
      const bId = cancelTarget._id || cancelTarget.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancellationReason: cancelReason.trim() }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Không thể hủy đơn'); }
      const cancelPayload = await res.json().catch(() => ({}));

      const refundAmount = cancelPayload?.data?.refundAmount || 0;
      if (refundAmount > 0 && onUserUpdate && user) {
        onUserUpdate({ walletBalance: (user?.walletBalance || 0) + refundAmount });
      }
      showToast(refundAmount > 0 ? `Đã hủy đơn thành công, hoàn ${refundAmount.toLocaleString('vi-VN')}đ vào ví` : 'Đã hủy đơn thành công');
      setShowCancelConfirm(false); setCancelTarget(null); setCancelReason(''); setCancelPreview(null);
      refreshUserProfile();
      fetchDetail({ silent: true });
    } catch (e) { setCancelConfirmError(e.message); }
    finally { setCancelLoading(false); }
  };

  /* ── QR ── */

  const handleShowQR = async (b) => {
    setQrLoading(true); setShowQR(true); setQrData('');
    try {
      const bId = b._id || b.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tạo mã QR');
      const payload = await res.json();
      setQrData(payload?.data?.qrDataUrl || payload?.qr || '');
    } catch (e) { showToast(e.message, 'error'); setShowQR(false); }
    finally { setQrLoading(false); }
  };

  /* ── Review ── */

  const openReview = (b) => {
    setRating(b.rating || 0);
    setFeedbackText(b.feedback || '');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!booking || rating === 0) return;
    setSubmitting(true);
    try {
      const bId = booking._id || booking.id;
      const res = await fetch(`${apiBase || API_BASE}/bookings/${bId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, feedback: feedbackText.trim() || undefined }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Gửi đánh giá thất bại'); }
      const payload = await res.json();
      const updated = payload?.data || payload;
      updateLocalBooking(updated);
      setShowReviewModal(false);
      showToast('Đánh giá thành công!');
    } catch (e) { showToast(e.message, 'error'); } finally { setSubmitting(false); }
  };

  /* ── Refund request ── */

  const findRefundRequest = (bId) => {
    const list = Array.isArray(refunds) ? refunds : [];
    return list.find(r => String(r.bookingId?._id || r.bookingId) === String(bId));
  };
  const isRefundExpired = (b) => {
    if (b.status !== 'completed') return true;
    const ts = b.updatedAt;
    if (!ts) return true;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return true;
    return (Date.now() - d.getTime()) > 24 * 60 * 60 * 1000;
  };
  const openRefundRequest = (b) => { setRefundTarget(b); setRefundReason(''); setShowRefundModal(true); };
  const submitRefundRequest = async () => {
    if (!refundReason.trim()) return showToast('Vui lòng nhập lý do hoàn tiền', 'error');
    setRefundLoading(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/refund-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: refundTarget._id || refundTarget.id, reason: refundReason })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Lỗi hệ thống');
      showToast('Gửi yêu cầu hoàn tiền thành công');
      setRefunds(prev => [...prev, payload.data]);
      setShowRefundModal(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRefundLoading(false);
    }
  };

  /* ── Cancel recurring ── */

  const handleCancelRecurring = async (b) => {
    if (!b.recurringGroupId) return;
    setCancelRecurringTarget(b);
    setShowCancelRecurringConfirm(true);
  };

  const confirmCancelRecurring = async () => {
    if (!cancelRecurringTarget?.recurringGroupId) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${apiBase || API_BASE}/bookings/recurring/${cancelRecurringTarget.recurringGroupId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Hủy thất bại'); }
      showToast('Đã hủy toàn bộ lịch định kỳ');
      setShowCancelRecurringConfirm(false); setCancelRecurringTarget(null);
      refreshUserProfile();
      fetchDetail({ silent: true });
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCancelLoading(false); }
  };

  /* ── Rebook ── */

  const handleRebook = (b) => {
    navigate('/booking', { state: { rebookData: b } });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-xs font-semibold text-slate-500">Đang tải chi tiết đơn đặt...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-8">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} /> Quay lại lịch sử
        </button>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          <p className="text-sm font-semibold">{error || 'Không tìm thấy đơn đặt lịch'}</p>
        </div>
      </div>
    );
  }

  const b = booking;
  const st = STATUS_MAP[b.status] || { label: b.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  const canEdit = b.status === 'pending';
  const canReview = b.status === 'completed';
  const hasReview = b.rating || b.feedback;

  // Financial summary
  const totalVal = b.finalPrice || b.totalAmount || 0;
  const isFullyPaid = b.paymentStatus === 'paid' || (b.depositAmount > 0 && b.depositAmount >= totalVal);
  const isDepositPaid = b.paymentStatus === 'deposit_paid' || b.depositPaid;
  const paidVal = isFullyPaid ? totalVal : (isDepositPaid ? (b.depositAmount || 0) : 0);
  const remainingVal = Math.max(0, totalVal - paidVal);
  const paidBadgeLabel = isFullyPaid
    ? 'Đã trả 100%'
    : (isDepositPaid ? `Đã cọc ${formatCurrency(paidVal)}` : 'Chưa trả');

  // Sub-services list
  const pkgIdStr = String(b.packageId?._id || b.packageId?.id || b.packageId || '');
  const pkgFromList = (packagesList || []).find(p => String(p._id || p.id) === pkgIdStr);
  const pkgObj = (pkgFromList && Array.isArray(pkgFromList.subServices) && pkgFromList.subServices.length > 0)
    ? pkgFromList
    : (typeof b.packageId === 'object' && b.packageId !== null && Array.isArray(b.packageId.subServices) && b.packageId.subServices.length > 0
      ? b.packageId
      : pkgFromList || (typeof b.packageId === 'object' ? b.packageId : null));

  const snapshotIncluded = (Array.isArray(b.includedSubServices) && b.includedSubServices.length > 0)
    ? b.includedSubServices
    : (Array.isArray(b.packageSnapshot?.subServices) && b.packageSnapshot.subServices.length > 0)
      ? b.packageSnapshot.subServices.filter(s => s.isOptional === false || s.isOptional === undefined)
      : null;

  const pkgSubs = snapshotIncluded
    ? snapshotIncluded
    : Array.isArray(pkgObj?.subServices) ? pkgObj.subServices : [];

  const defaultIncludedSubs = pkgSubs.filter(s => {
    const sOpt = typeof s === 'object' ? s?.isOptional : false;
    const sPrice = typeof s === 'object' ? (s?.price || 0) : 0;
    return sOpt === false || sOpt === undefined || sPrice === 0;
  });
  const defaultIncludedNames = defaultIncludedSubs.map(s => (typeof s === 'string' ? s : s?.name));
  const hasSelectedArr = Array.isArray(b.selectedSubServices) && b.selectedSubServices.length > 0;
  const selectedNames = hasSelectedArr
    ? b.selectedSubServices.map(x => (typeof x === 'string' ? x : x?.name))
    : [];
  const hasAnyIncludedInSelected = hasSelectedArr && defaultIncludedNames.some(name => selectedNames.includes(name));

  const includedList = [];
  if (defaultIncludedSubs.length > 0) {
    defaultIncludedSubs.forEach(s => {
      const sName = typeof s === 'string' ? s : s?.name;
      const isKept = !hasAnyIncludedInSelected || selectedNames.includes(sName);
      if (sName && isKept && !includedList.some(item => (item.name || item) === sName)) {
        includedList.push(typeof s === 'object' ? s : { name: sName, price: 0, isOptional: false });
      }
    });
  }
  if (hasSelectedArr && includedList.length === 0) {
    b.selectedSubServices.forEach(s => {
      const sName = typeof s === 'string' ? s : s?.name;
      const sPrice = typeof s === 'object' ? (s?.price || 0) : 0;
      const sOpt = typeof s === 'object' ? s?.isOptional : undefined;
      if (sOpt === false || (sOpt === undefined && sPrice === 0)) {
        if (sName && !includedList.some(item => (item.name || item) === sName)) {
          includedList.push(typeof s === 'object' ? s : { name: sName, price: 0, isOptional: false });
        }
      }
    });
  }

  const extraList = [];
  if (hasSelectedArr) {
    b.selectedSubServices.forEach(s => {
      const sName = typeof s === 'string' ? s : s?.name;
      const isInc = includedList.some(inc => (inc.name || inc) === sName);
      if (!isInc && sName) {
        if (!extraList.some(item => (item.name || item) === sName)) {
          const fullSub = pkgSubs.find(x => (x.name || x) === sName);
          extraList.push(fullSub || (typeof s === 'object' ? s : { name: sName }));
        }
      }
    });
  }

  const allAvailableSubs = [];
  if (pkgSubs.length > 0) {
    pkgSubs.forEach(s => {
      const sName = typeof s === 'string' ? s : s?.name;
      if (sName && !allAvailableSubs.some(x => (x.name || x) === sName)) {
        allAvailableSubs.push(typeof s === 'object' ? s : { name: sName, price: 0, isOptional: false });
      }
    });
  }
  if (Array.isArray(b.selectedSubServices)) {
    b.selectedSubServices.forEach(s => {
      const sName = typeof s === 'string' ? s : s?.name;
      if (sName && !allAvailableSubs.some(x => (x.name || x) === sName)) {
        allAvailableSubs.push(typeof s === 'object' ? s : { name: sName, price: 0, isOptional: true });
      }
    });
  }

  const editIncludedSubs = allAvailableSubs.filter(s => s.isOptional === false || (!s.isOptional && (s.price === 0 || !s.price)));
  const editExtraSubs = allAvailableSubs.filter(s => s.isOptional !== false && s.price > 0);

  let editedExtraPrice = 0;
  editedSubServiceNames.forEach(name => {
    const foundSub = allAvailableSubs.find(s => s.name === name);
    if (foundSub && foundSub.isOptional !== false && foundSub.price > 0) {
      editedExtraPrice += foundSub.price;
    }
  });

  const basePrice = b.bookingType === 'slot_pack_usage' ? 0 : (b.packagePrice || pkgObj?.price || b.packageId?.price || 0);
  const discount = b.discountAmount || 0;
  const calcTotal = Math.max(0, basePrice + editedExtraPrice - discount);
  const deposit = b.depositAmount || 0;
  const depositPaidOrActive = b.depositPaid || b.paymentStatus === 'deposit_paid' || b.paymentStatus === 'paid';
  const calcRemaining = Math.max(0, calcTotal - (depositPaidOrActive ? deposit : 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Chi tiết đơn đặt</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">#{b.bookingCode || String(b._id || b.id).slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-2xs ${st.cls}`}>{st.label}</span>
        </div>
      </div>

      {/* Booking info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-7 space-y-6">
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-start py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">🏢 Chi nhánh:</span>
              <span className="text-slate-900 font-bold text-right max-w-[65%]">{b.branchId?.name || b.branchName || '—'}</span>
            </div>
            <div className="flex justify-between items-start py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">📍 Địa chỉ:</span>
              <span className="text-slate-700 text-right max-w-[65%]">{b.branchId?.address || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">📦 Gói dịch vụ:</span>
              <div className="text-right">
                <span className="text-slate-900 font-extrabold text-sm sm:text-base">{b.packageId?.name || b.packageName || '—'}</span>
                {basePrice > 0 && (
                  <span className="ml-2 font-mono font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md">
                    {formatCurrency(basePrice)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">🪪 Biển số xe:</span>
              <span className="bg-slate-800 text-white font-mono font-bold text-xs sm:text-sm px-3 py-1 rounded-md tracking-wider shadow-2xs">
                {b.vehicleId?.licensePlate || b.vehiclePlate || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">📅 Ngày hẹn:</span>
              <span className="text-slate-900 font-bold">{formatDate(b.bookingDate)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">⏰ Khung giờ:</span>
              <span className="text-emerald-700 font-extrabold text-sm sm:text-base">{b.startTime}{b.endTime ? ` - ${b.endTime}` : ''}</span>
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs text-xs sm:text-sm">
            <div className="space-y-2 border-b border-slate-200/80 pb-3 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Giá gói dịch vụ chính ({b.packageId?.name || b.packageName || 'Gói rửa xe'}):</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(basePrice)}</span>
              </div>

              {extraList.length > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Dịch vụ bổ sung chọn thêm ({extraList.length} dịch vụ):</span>
                  <span className="font-mono font-bold text-amber-700">
                    +{formatCurrency(extraList.reduce((sum, item) => sum + (item.price || 0), 0))}
                  </span>
                </div>
              )}

              {(b.discountAmount > 0 || b.voucherCode) && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>🎟️ Voucher giảm giá {b.voucherCode ? `(${b.voucherCode})` : ''}:</span>
                  <span className="font-mono font-bold">-{formatCurrency(b.discountAmount || 0)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-700 font-bold">TỔNG TIỀN ĐƠN HÀNG:</span>
              <span className="font-black text-slate-900 text-base sm:text-lg">{formatCurrency(totalVal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium flex items-center gap-2">
                Tiền đã thanh toán:
                <span className={`text-xs px-3 py-0.5 rounded-full font-bold ${isFullyPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : isDepositPaid ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-200 text-slate-600'}`}>
                  {paidBadgeLabel}
                </span>
              </span>
              <span className="font-bold text-slate-800 text-sm sm:text-base">{formatCurrency(paidVal)}</span>
            </div>
            <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center">
              <div className="text-xs sm:text-sm font-bold text-amber-700 flex items-center gap-1">
                🔥 Tiền còn lại
                <span className="text-xs font-normal text-slate-400">(Tổng tiền - Tiền đã thanh toán)</span>:
              </div>
              <span className={`text-base sm:text-xl font-black ${remainingVal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(remainingVal)}
              </span>
            </div>
          </div>

          {/* Services list / edit */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {editingSubServices ? '✏️ Chỉnh sửa dịch vụ' : 'Danh sách dịch vụ'}
              </span>
              {canEdit && (
                !editingSubServices ? (
                  <button onClick={() => handleStartEditSubServices(b)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer">
                    ✏️ Chỉnh sửa dịch vụ
                  </button>
                ) : (
                  <button onClick={() => setEditingSubServices(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1 rounded-xl transition-colors cursor-pointer">
                    ✕ Hủy sửa
                  </button>
                )
              )}
            </div>

            {!editingSubServices ? (
              <div className="space-y-4">
                {includedList.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Dịch vụ bao gồm trong gói:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {includedList.map((sub, i) => {
                        const sName = sub.name || sub;
                        const dur = sub.duration || pkgSubs.find(x => x.name === sName)?.duration;
                        return (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs font-semibold text-emerald-900 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">✓</div>
                              <span className="font-bold truncate">{sName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                              {dur && <span className="text-[11px] font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200/60">⏱ {dur} phút</span>}
                              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300/80">Miễn phí</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {extraList.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Dịch vụ chọn thêm:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {extraList.map((sub, i) => {
                        const sName = sub.name || sub;
                        const dur = sub.duration || pkgSubs.find(x => x.name === sName)?.duration;
                        const sPrice = sub.price || pkgSubs.find(x => x.name === sName)?.price || 0;
                        return (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">+</div>
                              <span className="font-bold truncate">{sName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                              {dur && <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">⏱ {dur} phút</span>}
                              {sPrice > 0 && <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">+{formatCurrency(sPrice)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {editIncludedSubs.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      Dịch vụ bao gồm trong gói <span className="font-normal text-slate-500">(Tích chọn/Hủy chọn)</span>:
                    </label>
                    <div className="space-y-2">
                      {editIncludedSubs.map((sub, i) => {
                        const isChecked = editedSubServiceNames.includes(sub.name);
                        return (
                          <label key={i} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${isChecked ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-500 line-through'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleSubService(sub.name)} className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer" />
                            <span>{sub.name} {sub.duration ? `(${sub.duration} phút)` : ''}</span>
                            <span className="ml-auto text-[11px] font-bold text-emerald-600">Đi kèm (0đ)</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Dịch vụ chọn thêm <span className="font-normal text-slate-500">(Tích để chọn thêm)</span>:
                  </label>
                  {editExtraSubs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Không có dịch vụ thêm nào cho gói này.</p>
                  ) : (
                    <div className="space-y-2">
                      {editExtraSubs.map((sub, i) => {
                        const isChecked = editedSubServiceNames.includes(sub.name);
                        return (
                          <label key={i} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleSubService(sub.name)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                            <span>{sub.name} {sub.duration ? `(${sub.duration} phút)` : ''}</span>
                            <span className="ml-auto text-[11px] font-bold text-indigo-600">+{formatCurrency(sub.price || 0)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-medium">Tổng tiền dịch vụ mới:</span>
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(calcTotal)}</span>
                  </div>
                  {deposit > 0 && (
                    <div className="flex justify-between items-center text-amber-800">
                      <span>Tiền cọc:</span>
                      <span className="font-semibold">-{formatCurrency(deposit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-emerald-800 font-bold border-t border-amber-200/80 pt-1.5 mt-1 text-sm">
                    <span>Số tiền cần thanh toán còn lại:</span>
                    <span className="text-emerald-700 font-extrabold">{formatCurrency(calcRemaining)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleSaveSubServices(b)} disabled={savingSubServices}
                    className="flex-1 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer">
                    {savingSubServices ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thay đổi dịch vụ'
                    )}
                  </button>
                  <button onClick={() => setEditingSubServices(false)} disabled={savingSubServices}
                    className="py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>

          {b.feedback && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-600">Đánh giá:</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-base ${s <= (b.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-600 italic">"{b.feedback}"</p>
            </div>
          )}

          {/* Recurring group summary */}
          {b.recurringGroupId && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="text-sm font-semibold text-indigo-900 mb-2">🔄 Lịch định kỳ</div>
              {recurringGroupLoading ? (
                <div className="text-xs text-indigo-500">Đang tải chi tiết các buổi...</div>
              ) : recurringGroupBookings.length > 0 ? (
                <div className="space-y-2">
                  {recurringGroupBookings.map(rb => (
                    <div key={rb._id || rb.id} className="flex items-center justify-between text-xs bg-white/70 rounded-lg px-3 py-1.5 border border-indigo-100">
                      <span className="text-indigo-800 font-medium">{formatDate(rb.bookingDate)} • {rb.startTime}</span>
                      <StatusBadge status={rb.status} />
                    </div>
                  ))}
                </div>
              ) : null}
              {recurringGroupBookings.some(rb => rb.status === 'pending' || rb.status === 'confirmed') && (
                <button onClick={() => handleCancelRecurring(b)} disabled={cancelLoading}
                  className="mt-3 px-4 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-bold hover:bg-red-200 transition-colors cursor-pointer disabled:opacity-50">
                  Hủy toàn bộ định kỳ
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <button onClick={() => setShowReceipt(true)}
            className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer text-center">
            Xem hóa đơn
          </button>
          {b.status !== 'cancelled' && b.paymentStatus !== 'paid' && (
            <button onClick={() => { handlePayRemaining(b); }} disabled={cancelLoading}
              className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center disabled:opacity-50 border border-emerald-500/20">
              Thanh toán ngay
            </button>
          )}
          {!b.recurringGroupId && (b.status === 'pending' || b.status === 'confirmed') && (
            <>
              <button onClick={() => handleShowQR(b)}
                className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center">
                Mã QR
              </button>
              <button onClick={() => handleCancel(b)} disabled={cancelLoading}
                className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center disabled:opacity-50">
                Hủy đơn
              </button>
            </>
          )}
          {b.status === 'completed' && (
            <>
              <button onClick={() => handleRebook(b)} disabled={cancelLoading}
                className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center disabled:opacity-50">
                Đặt lại
              </button>
              {['paid', 'deposit_paid'].includes(b.paymentStatus) && !isRefundExpired(b) && (() => {
                const existing = findRefundRequest(b._id || b.id);
                if (existing?.status === 'pending') {
                  return (
                    <div className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 text-center cursor-default">
                      ⏳ Đang chờ hoàn tiền
                    </div>
                  );
                }
                return (
                  <button onClick={() => openRefundRequest(b)}
                    className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer text-center">
                    Yêu cầu hoàn tiền
                  </button>
                );
              })()}
              {!b.recurringGroupId && (
                <button onClick={() => openReview(b)}
                  className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${hasReview ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'}`}>
                  {hasReview ? '✏️ Sửa đánh giá' : '⭐ Đánh giá'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RECEIPT MODAL ── */}
      {showReceipt && (() => {
        const displayTotal = b.isGroup ? (b.groupTotalPrice || 0) : (b.totalAmount || b.finalPrice || 0);
        const displayDeposit = b.isGroup ? (b.groupTotalDeposit || 0) : (b.depositAmount || 0);
        const displayId = b.isGroup ? (b.recurringGroupId || b._id) : b._id;
        const displayInvoiceNumber = String(displayId).slice(-8).toUpperCase();

        return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowReceipt(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] font-sans text-slate-900 relative" onClick={e => e.stopPropagation()}>

            <button onClick={() => setShowReceipt(false)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="px-10 py-12 overflow-y-auto flex-1 selection:bg-slate-200">

              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-black tracking-tight">Biên lai</h2>
                  <div className="grid grid-cols-[140px_1fr] gap-y-1 text-[13px]">
                    <div className="font-semibold text-black">Mã hóa đơn</div>
                    <div className="text-black">AWP-{displayInvoiceNumber}</div>
                    <div className="font-semibold text-black">Mã biên lai</div>
                    <div className="text-black">{displayId}</div>
                    <div className="font-semibold text-black">Ngày thanh toán</div>
                    <div className="text-black">{formatDateTime(b.updatedAt || b.bookingDate)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tighter select-none">
                    AW<span className="text-slate-400">P</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12 text-[13px] leading-relaxed">
                <div>
                  <div className="font-semibold text-black mb-1">AutoWash Pro</div>
                  <div className="text-black">
                    {b.branchName || b.branchId?.name || 'Chi nhánh trung tâm'}<br/>
                    {b.branchId?.address || '123 Đường Rửa Xe'}<br/>
                    Hồ Chí Minh, Việt Nam<br/>
                    support@autowashpro.com
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-black mb-1">Khách hàng</div>
                  <div className="text-black">
                    {b.userId?.name || 'Khách hàng'} ({b.userId?.phone || ''})<br/>
                    Biển số: {b.vehiclePlate || b.vehicleId?.licensePlate || 'Chưa cập nhật'}<br/>
                    {b.userId?.email || ''}
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-2xl font-bold text-black mb-3">
                  {formatCurrency(displayTotal)} {b.paymentStatus === 'paid' ? `đã thanh toán vào ${formatDate(b.updatedAt || b.bookingDate)}` : `cần thanh toán vào ${formatDate(b.bookingDate)}`}
                </h3>
                <p className="text-[13px] text-black max-w-xl leading-relaxed">
                  Cảm ơn quý khách đã sử dụng dịch vụ của AutoWash Pro.<br/>
                  Quý khách có thể thanh toán bằng tiền mặt, chuyển khoản hoặc sử dụng thẻ thành viên.<br/>
                  --------------------------------<br/>
                  ĐỊA CHỈ THANH TOÁN:<br/>
                  AutoWash Pro<br/>
                  Hồ Chí Minh, Việt Nam
                </p>
                <p className="text-[13px] text-black mt-4">
                  Giá đã bao gồm 10% VAT.
                </p>
              </div>

              <div className="mb-14">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-2 text-left font-normal text-black w-1/2">Mô tả</th>
                      <th className="py-2 text-right font-normal text-black">SL</th>
                      <th className="py-2 text-right font-normal text-black">Đơn giá</th>
                      <th className="py-2 text-right font-normal text-black">Thuế</th>
                      <th className="py-2 text-right font-normal text-black">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-left align-top">
                        <div className="font-normal text-black">{b.packageName || b.packageId?.name || 'Dịch vụ rửa xe'}</div>
                        {!b.isGroup && <div className="text-black">{formatDate(b.bookingDate)} • {b.startTime || '—'}</div>}
                        {b.isGroup && (
                          <div className="mt-2 space-y-1">
                            {recurringGroupLoading ? (
                              <div className="text-slate-500 text-xs italic">Đang tải chi tiết buổi...</div>
                            ) : (
                              recurringGroupBookings.map((rb, idx) => (
                                <div key={idx} className="text-slate-600 text-xs flex gap-2 items-center">
                                  <span>Buổi {idx + 1}: {formatDate(rb.bookingDate)} • {rb.startTime}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100">{STATUS_MAP[rb.status]?.label || rb.status}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right text-black align-top">{b.isGroup ? b.groupCount : 1}</td>
                      <td className="py-3 text-right text-black align-top">
                        {b.bookingType === 'slot_pack_usage' ? (
                          <span className="line-through text-slate-400 mr-2">{formatCurrency(b.packagePrice || b.packageId?.price || 0)}</span>
                        ) : null}
                        {formatCurrency(b.bookingType === 'slot_pack_usage' ? 0 : (b.packagePrice || b.packageId?.price || b.finalPrice || b.totalAmount))}
                      </td>
                      <td className="py-3 text-right text-black align-top">10%</td>
                      <td className="py-3 text-right text-black align-top">{formatCurrency(b.bookingType === 'slot_pack_usage' ? 0 : (b.packagePrice || b.packageId?.price || b.finalPrice || b.totalAmount))}</td>
                    </tr>

                    {b.selectedSubServices && b.selectedSubServices.filter(s => s.isOptional !== false).map((sub, i) => (
                      <tr key={`sub-${i}`} className="border-b border-slate-100">
                        <td className="py-2 text-left text-black pl-4 text-indigo-600">+ {sub.name} <span className="text-[10px] text-indigo-400 font-normal">(thêm)</span></td>
                        <td className="py-2 text-right text-black">1</td>
                        <td className="py-2 text-right text-black">{formatCurrency(sub.price)}</td>
                        <td className="py-2 text-right text-black">10%</td>
                        <td className="py-2 text-right text-black">{formatCurrency(sub.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mt-6">
                  <div className="w-[300px] text-[13px]">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-black">Tạm tính</span>
                      <span className="text-black">{formatCurrency(displayTotal + (b.discountAmount || 0))}</span>
                    </div>
                    {b.voucherCode && (
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-emerald-600 font-medium">Voucher ({b.voucherCode})</span>
                        <span className="text-emerald-600 font-medium">-{formatCurrency(b.discountAmount || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-black">Tổng tiền (chưa VAT)</span>
                      <span className="text-black">{formatCurrency(Math.round((displayTotal) * 0.9))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-black">Thuế VAT (10%)</span>
                      <span className="text-black">{formatCurrency(Math.round((displayTotal) * 0.1))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="font-normal text-black">Tổng cộng</span>
                      <span className="font-normal text-black">{formatCurrency(displayTotal)}</span>
                    </div>
                    {b.paymentStatus === 'deposit_paid' && (
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="font-normal text-black">Đã đặt cọc</span>
                        <span className="font-normal text-black">-{formatCurrency(displayDeposit || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-black">
                      <span className="font-bold text-black">Số tiền {b.paymentStatus === 'paid' ? 'đã thanh toán' : 'cần thanh toán'}</span>
                      <span className="font-bold text-black">
                        {b.paymentStatus === 'paid'
                          ? formatCurrency(displayTotal)
                          : b.paymentStatus === 'deposit_paid'
                            ? formatCurrency(Math.max(0, (displayTotal || 0) - (displayDeposit || 0)))
                            : formatCurrency(displayTotal)
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-black mb-4">Lịch sử thanh toán</h3>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-2 text-left font-normal text-black">Phương thức</th>
                      <th className="py-2 text-left font-normal text-black">Ngày</th>
                      <th className="py-2 text-left font-normal text-black">Mã đơn</th>
                      <th className="py-2 text-right font-normal text-black">Số tiền</th>
                      <th className="py-2 text-right font-normal text-black">Mã biên lai</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-left text-black">
                        {b.paymentStatus === 'paid' ? 'Chuyển khoản' : (b.paymentStatus === 'deposit_paid' ? 'Đặt cọc' : 'Chưa thanh toán')}
                      </td>
                      <td className="py-3 text-left text-black">{formatDate(b.updatedAt || b.bookingDate)}</td>
                      <td className="py-3 text-left font-mono font-bold text-emerald-700">#{b.bookingCode || ''}</td>
                      <td className="py-3 text-right text-black">
                        {b.paymentStatus === 'paid'
                          ? formatCurrency(displayTotal)
                          : (b.paymentStatus === 'deposit_paid' ? formatCurrency(displayDeposit) : '0đ')}
                      </td>
                      <td className="py-3 text-right text-black">AWP-{displayInvoiceNumber}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-8">
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-semibold text-black">Trạng thái:</span>
                  <StatusBadge status={b.status} />
                </div>
                {b.feedback && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-black">Rating:</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-base leading-none ${s <= (b.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {b.feedback && (
                <div className="mt-2 text-[13px] text-slate-600 italic">"{b.feedback}"</div>
              )}
              {b.managerNote && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-[12px] font-semibold text-amber-800 mb-1">Ghi chú từ quản lý:</div>
                  <div className="text-[13px] text-amber-900">{b.managerNote}</div>
                </div>
              )}

            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              {(!b.isGroup && (b.status === 'pending' || b.status === 'confirmed')) && (
                <>
                  <button onClick={() => { setShowReceipt(false); handleCancel(b); }} disabled={cancelLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 text-center cursor-pointer">
                    Hủy đơn
                  </button>
                  <button onClick={() => { setShowReceipt(false); handleShowQR(b); }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800 transition-colors text-center cursor-pointer">
                    Mã QR
                  </button>
                </>
              )}
              {(b.isGroup && recurringGroupBookings.some(rb => rb.status === 'pending' || rb.status === 'confirmed')) && (
                <>
                  <button onClick={() => { setShowReceipt(false); handleCancelRecurring(b); }} disabled={cancelLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 text-center cursor-pointer">
                    Hủy lịch trình định kỳ
                  </button>
                  <button onClick={() => { setShowReceipt(false); handleShowQR(b); }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800 transition-colors text-center cursor-pointer">
                    Mã QR
                  </button>
                </>
              )}
              {b.status === 'completed' && (
                <>
                  <button onClick={() => { setShowReceipt(false); handleRebook(b); }} disabled={cancelLoading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-black text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 text-center cursor-pointer">
                    Đặt lại
                  </button>
                  {['paid', 'deposit_paid'].includes(b.paymentStatus) && !isRefundExpired(b) && (() => {
                    const existing = findRefundRequest(b._id || b.id);
                    if (existing?.status === 'pending') {
                      return (
                        <div className="flex-1 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-200 text-center cursor-default">
                          Đang chờ hoàn tiền
                        </div>
                      );
                    }
                    return (
                      <button onClick={() => { setShowReceipt(false); openRefundRequest(b); }}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors text-center cursor-pointer">
                        Yêu cầu hoàn tiền
                      </button>
                    );
                  })()}
                  {!b.isGroup && b.status === 'completed' && (
                    <button onClick={() => { setShowReceipt(false); openReview(b); }}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors text-center cursor-pointer ${b.rating ? 'border border-slate-300 bg-white text-black hover:bg-slate-50' : 'bg-black text-white hover:bg-slate-800'}`}>
                      {b.rating ? 'Sửa đánh giá' : 'Đánh giá'}
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
        );
      })()}

      {/* ── REVIEW MODAL ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center text-2xl mb-3 shadow-md shadow-amber-500/20">
              ⭐
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-0.5">Đánh giá dịch vụ</h3>
            <p className="text-xs font-medium text-slate-500 mb-4">
              {b.packageId?.name || 'Dịch vụ'} · {b.branchId?.name || 'Chi nhánh'}
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-center">
                <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">Chất lượng dịch vụ</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Nhận xét của bạn (không bắt buộc)</label>
                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                  rows={3} maxLength={1000} placeholder="Chia sẻ trải nghiệm sử dụng dịch vụ của bạn tại AutoWash Pro..."
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none transition-all placeholder:text-slate-400" />
                <p className="text-[10px] font-medium text-slate-400 mt-1 text-right">{feedbackText.length}/1000</p>
              </div>

              {b.managerReply && (
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] mb-1 uppercase tracking-wider">
                    <span>💬</span> Phản hồi từ chi nhánh
                  </div>
                  <p className="text-emerald-900 italic font-medium leading-relaxed">"{b.managerReply}"</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  Hủy
                </button>
                <button type="submit" disabled={submitting || rating === 0}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:shadow-none cursor-pointer">
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PAY REMAINING MODAL ── */}
      {payRemainingTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !payRemainingLoading && setPayRemainingTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Thanh toán phần còn lại</h3>
                <p className="text-xs text-slate-500 mt-1">Chọn phương thức thanh toán</p>
              </div>
              <button onClick={() => !payRemainingLoading && setPayRemainingTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${payRemainingMethod === 'vnpay' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">VN</div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Thanh toán qua VNPAY</div>
                    <div className="text-xs text-slate-500">Thẻ ATM / QR Code / VNPAY</div>
                  </div>
                </div>
                <input type="radio" name="payRemainingMethod" value="vnpay" checked={payRemainingMethod === 'vnpay'} onChange={() => setPayRemainingMethod('vnpay')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payRemainingMethod === 'vnpay' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                  {payRemainingMethod === 'vnpay' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${payRemainingMethod === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">🏦</div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Ngân hàng (SePay)</div>
                    <div className="text-xs text-slate-500">Chuyển khoản QR code tự động</div>
                  </div>
                </div>
                <input type="radio" name="payRemainingMethod" value="bank" checked={payRemainingMethod === 'bank'} onChange={() => setPayRemainingMethod('bank')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payRemainingMethod === 'bank' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                  {payRemainingMethod === 'bank' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${payRemainingMethod === 'wallet' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">💳</div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Thanh toán từ Ví</div>
                    <div className="text-xs text-slate-500">Số dư ví của bạn: <span className="font-bold text-emerald-600">{user?.walletBalance ? formatCurrency(user.walletBalance) : '0đ'}</span></div>
                  </div>
                </div>
                <input type="radio" name="payRemainingMethod" value="wallet" checked={payRemainingMethod === 'wallet'} onChange={() => setPayRemainingMethod('wallet')} className="hidden" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payRemainingMethod === 'wallet' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                  {payRemainingMethod === 'wallet' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50">
              <button
                onClick={confirmPayRemaining}
                disabled={payRemainingLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {payRemainingLoading ? 'Đang xử lý...' : (payRemainingMethod === 'bank' ? 'Tạo mã QR' : 'Xác nhận thanh toán ngay')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Remaining Bank QR Modal */}
      <AnimatePresence>
        {payRemainingBankQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPayRemainingBankQR(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100/80"
              onClick={e => e.stopPropagation()}
            >
              <div className="pt-4 pb-2 text-center px-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 bg-emerald-50 border-2 border-emerald-100">
                  <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M2 12v4h20v-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Chuyển khoản ngân hàng</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Quét mã QR hoặc chuyển khoản thủ công</p>
              </div>

              {payRemainingBankQR.qrCode && (
                <div className="px-6 pb-1 flex justify-center">
                  <div className="bg-white rounded-xl border-2 border-slate-100 p-2.5 shadow-sm">
                    <img src={payRemainingBankQR.qrCode} alt="QR code" className="w-32 h-32" />
                  </div>
                </div>
              )}

              <div className="px-5 py-1 space-y-2">
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <div className="text-xs text-slate-400 mb-1">Số tiền cần chuyển</div>
                  <div className="text-2xl font-black text-emerald-600">{formatCurrency(payRemainingBankQR.amount || 0)}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Thanh toán phần còn lại
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Ngân hàng</span>
                    <span className="text-xs font-bold text-slate-700">{payRemainingBankQR.bankInfo?.bankName || 'Ngân hàng TMCP Quân đội (MB)'}</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Số tài khoản</span>
                    <span className="text-xs font-bold text-slate-700 font-mono tracking-wider">{payRemainingBankQR.bankInfo?.accountNumber || '6200320046868'}</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Chủ tài khoản</span>
                    <span className="text-xs font-bold text-slate-700">{payRemainingBankQR.bankInfo?.accountHolder || 'CONG TY CO PHAN AUTO WASH PRO'}</span>
                  </div>
                  <div className="px-3 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-400 font-semibold">Nội dung CK</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(payRemainingBankQR.bankInfo?.transferContent || `THANH TOAN ${payRemainingBankQR.transactionId}`);
                          alert('Đã copy nội dung CK!');
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-sm font-bold text-slate-700 font-mono bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center tracking-wider">
                      {payRemainingBankQR.bankInfo?.transferContent || `THANH TOAN ${payRemainingBankQR.transactionId}`}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">Mã giao dịch</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">{payRemainingBankQR.transactionId}</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-0.5">
                  <RefreshCw className={`w-3 h-3 ${qrPollCount % 2 === 0 ? 'animate-spin' : ''}`} />
                  Đang kiểm tra thanh toán...
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setPayRemainingBankQR(null)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
                  Hủy / Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CANCEL CONFIRM MODAL ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { if (!cancelLoading) { setShowCancelConfirm(false); setCancelTarget(null); setCancelConfirmError(''); setCancelReason(''); setCancelPreview(null); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận hủy lịch hẹn</h3>
            <p className="text-sm text-slate-500 mb-6">
              Bạn có chắc chắn muốn hủy đơn hàng này? Vui lòng nhập lý do hủy bên dưới.
            </p>

            <div className="text-left mb-6">
              {cancelPreview && cancelPreview.totalPaid > 0 && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
                  cancelPreview.isLateCancel
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {cancelPreview.isLateCancel ? (
                    <>
                      <div className="flex items-center gap-1.5 font-bold mb-1">⚠️ Hủy sát giờ hẹn ({cancelPreview.minutesBefore} phút trước)</div>
                      {cancelPreview.penaltyAmount > 0 && (
                        <div className="text-red-600 font-semibold">Phí phạt: -{cancelPreview.penaltyAmount.toLocaleString('vi-VN')}₫ ({cancelPreview.penaltyPercent}%)</div>
                      )}
                      {cancelPreview.refundAmount > 0 ? (
                        <div className="text-emerald-700 font-semibold">Hoàn lại vào ví: {cancelPreview.refundAmount.toLocaleString('vi-VN')}₫</div>
                      ) : (
                        <div className="text-red-600 font-semibold">Mất toàn bộ tiền cọc — không hoàn lại.</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 font-bold">✅ Hoàn lại 100% ({cancelPreview.totalPaid.toLocaleString('vi-VN')}₫) vào ví</div>
                  )}
                </div>
              )}
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Lý do hủy <span className="text-red-500">*</span></label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                rows={3} maxLength={500} placeholder="Nhập lý do hủy đơn..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
            </div>

            {cancelConfirmError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{cancelConfirmError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelConfirm(false); setCancelTarget(null); setCancelConfirmError(''); setCancelReason(''); setCancelPreview(null); }}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer">
                Không, giữ lại
              </button>
              <button onClick={confirmCancel} disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition-colors disabled:opacity-50 cursor-pointer">
                {cancelLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL RECURRING CONFIRM MODAL ── */}
      {showCancelRecurringConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { if (!cancelLoading) { setShowCancelRecurringConfirm(false); setCancelRecurringTarget(null); } }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hủy lịch định kỳ</h3>
            <p className="text-sm text-slate-500 mb-6">Tất cả các buổi trong loạt định kỳ này sẽ bị hủy. Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelRecurringConfirm(false); setCancelRecurringTarget(null); }}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer">
                Giữ lại
              </button>
              <button onClick={confirmCancelRecurring} disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition-colors disabled:opacity-50 cursor-pointer">
                {cancelLoading ? 'Đang hủy...' : 'Hủy tất cả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR MODAL ── */}
      {showQR && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setShowQR(false); setQrData(''); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-sm p-8 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Mã QR Check-in</h3>
            <p className="text-xs text-slate-400 mb-6">Đưa mã này cho nhân viên tại chi nhánh để check-in</p>
            {qrLoading ? (
              <div className="py-12 text-slate-400 text-sm">Đang tạo mã QR...</div>
            ) : qrData ? (
              <img src={qrData} alt="QR code" className="w-56 h-56 mx-auto rounded-xl border border-slate-200 shadow-sm" />
            ) : (
              <div className="py-12 text-slate-400 text-sm">Không thể tạo mã QR</div>
            )}
            <button onClick={() => { setShowQR(false); setQrData(''); }}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer">
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Refund Confirm Modal for Sub-services Cancellation */}
      {refundConfirmData && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-emerald-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-2xl mb-3 mx-auto">
              💡
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              Xác nhận hủy dịch vụ & hoàn tiền vào Ví
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Mã đơn: <span className="font-bold text-slate-700">#{refundConfirmData.booking.bookingCode || refundConfirmData.booking._id?.slice(-6).toUpperCase()}</span>
            </p>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 mb-4 space-y-2 text-xs">
              <div className="text-slate-600 font-medium">
                Bạn đã bỏ chọn dịch vụ chọn thêm:
              </div>
              <div className="font-bold text-emerald-800 bg-white/90 p-2.5 rounded-lg border border-emerald-100/80 space-y-1.5">
                {refundConfirmData.canceledNames.map((n, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{String(n).replace(/^\+\s*/, '')}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-emerald-200/60 flex justify-between items-center text-sm">
                <span className="font-medium text-slate-700">Số tiền hoàn về Ví:</span>
                <span className="font-black text-emerald-600 text-base">
                  +{formatCurrency(refundConfirmData.refundAmount)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center mb-6 leading-relaxed">
              Số tiền trên sẽ được tự động hoàn trực tiếp vào <b>Ví AutoWash Pro</b> của bạn ngay khi bấm xác nhận. Trạng thái thanh toán và tiền cọc cũng sẽ được cập nhật chính xác.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRefundConfirmData(null)}
                disabled={savingSubServices}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => executeSaveSubServices(refundConfirmData.booking, refundConfirmData.targetSubServices)}
                disabled={savingSubServices}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingSubServices ? 'Đang xử lý...' : 'Xác nhận & Hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {showRefundModal && refundTarget && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Yêu cầu hoàn tiền</h3>
            <p className="text-sm text-slate-500 mb-4">Mã đơn: <span className="font-bold text-slate-700">{refundTarget.bookingCode || refundTarget._id?.slice(-6).toUpperCase()}</span></p>
            <textarea
              className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm mb-6 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Nhập lý do hoàn tiền (VD: Hủy do bận đột xuất, không hài lòng dịch vụ...)"
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRefundModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Đóng
              </button>
              <button onClick={submitRefundRequest} disabled={refundLoading} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer">
                {refundLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
