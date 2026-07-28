import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, MapPin, Clock, CheckCircle2, ShieldCheck, Check, Sparkles, Info, AlertCircle } from 'lucide-react';
import VoucherPicker from '../VoucherPicker.jsx';
import QuickBookModal from './QuickBookModal.jsx';
import { showToast } from '@/lib/toast';

const DISCOUNT_TIERS = [
  { min: 1, max: 4, pct: 0, label: 'Giá gốc' },
  { min: 5, max: 9, pct: 5, label: 'Tiết kiệm 5%' },
  { min: 10, max: 19, pct: 10, label: 'Tiết kiệm 10%' },
  { min: 20, max: 50, pct: 15, label: 'Tiết kiệm 15%' },
];

const STATUS_MAP = {
  active: { label: 'Còn hiệu lực', color: '#10b981', bg: '#ecfdf5' },
  exhausted: { label: 'Đã dùng hết', color: '#6b7280', bg: '#f9fafb' },
  expired: { label: 'Hết hạn', color: '#ef4444', bg: '#fef2f2' },
  cancelled: { label: 'Đã hủy', color: '#94a3b8', bg: '#f1f5f9' },
};

function formatCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function getDiscountPct(n) { return DISCOUNT_TIERS.find(t => n >= t.min && n <= t.max)?.pct || 0; }
function getDiscountLabel(n) { return DISCOUNT_TIERS.find(t => n >= t.min && n <= t.max)?.label || ''; }

function SlotMeter({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Còn lại</span>
        <span className="font-bold">{remaining}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PackCard({ pack, onQuickBook, onCancelPack, apiBase, token }) {
  const st = STATUS_MAP[pack.status] || { label: pack.status, color: '#6b7280', bg: '#f9fafb' };
  const pkg = pack.packageId;
  const branch = pack.branchId;
  const canQuickBook = pack.status === 'active' && pack.remainingSlots > 0 && pack.paymentStatus === 'paid';
  const canCancel = pack.status === 'active';

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!showHistory || !pack._id || !token) return;
    setHistoryLoading(true);
    fetch(`${apiBase}/slot-packs/${pack._id}/usage-history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(payload => {
        const data = payload?.data || payload;
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Lỗi khi fetch lịch sử gói lượt:', err);
        setHistory([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [showHistory, pack._id, apiBase, token]);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md ${pack.status !== 'active' ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-xs font-bold text-slate-900 tracking-wider">{pack.packCode}</div>
          <div className="text-sm font-bold text-slate-900 mt-1">{pkg?.name || 'Gói dịch vụ'}</div>
          <div className="text-xs text-slate-400 mt-0.5">📍 {branch?.name || 'Áp dụng toàn hệ thống'}</div>
        </div>
        <div className="flex items-center gap-2">
          {pack.discountPercent > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              -{pack.discountPercent}%
            </span>
          )}
          <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5" style={{ color: st.color, background: st.bg }}>
            {st.label}
          </span>
        </div>
      </div>
      <SlotMeter total={pack.totalSlots} remaining={pack.remainingSlots} />
      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
        {[
          { label: 'Giá gói', value: formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice) },
          { label: 'Đã dùng', value: `${pack.usedSlots} lần` },
          { label: 'Hết hạn', value: pack.expiresAt ? new Date(pack.expiresAt).toLocaleDateString('vi-VN') : '—' },
          { label: 'Thanh toán', value: pack.paymentStatus === 'paid' ? '✓ Đã TT' : '⏳ Chờ TT', highlight: pack.paymentStatus === 'paid' },
        ].map(r => (
          <div key={r.label}>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{r.label}</div>
            <div className={`text-xs font-bold mt-0.5 ${r.highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{r.value}</div>
          </div>
        ))}
      </div>
      {pack.voucherCode && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          🏷 {pack.voucherCode} — tiết kiệm thêm {formatCurrency(pack.voucherDiscount)}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Clock size={12} />
            Lịch sử
          </button>
        </div>
        <div className="flex items-center gap-2">
          {canCancel && onCancelPack && (
            <button
              type="button"
              onClick={() => onCancelPack(pack)}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
            >
              Hủy gói
            </button>
          )}
          {canQuickBook && onQuickBook && (
            <button
              type="button"
              onClick={() => onQuickBook(pack)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              ⚡ Đặt lịch nhanh
            </button>
          )}
        </div>
      </div>

      {/* Usage History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[10006] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-slate-100 text-slate-900 text-left"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Lịch sử sử dụng gói lượt</h3>
                <p className="text-[11px] text-slate-400 font-mono">Mã: {pack.packCode}</p>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
              {historyLoading ? (
                <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-emerald-600" />
                  Đang tải lịch sử...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Gói lượt này chưa được sử dụng lần nào.
                </div>
              ) : (
                history.map((h, idx) => {
                  const bDate = new Date(h.bookingDate).toLocaleDateString('vi-VN');
                  const statusCls = 
                    h.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    h.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200' :
                    h.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-blue-50 text-blue-600 border-blue-200';
                  const statusLabel = 
                    h.status === 'completed' ? 'Hoàn thành' :
                    h.status === 'cancelled' ? 'Đã hủy' :
                    h.status === 'pending' ? 'Chờ xử lý' :
                    'Đã xác nhận';
                  
                  return (
                    <div key={h._id || idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-1.5 text-xs text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{bDate} - {h.startTime}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="text-slate-500 flex justify-between">
                        <span>Chi nhánh:</span>
                        <span className="font-semibold text-slate-700">{h.branchId?.name}</span>
                      </div>
                      <div className="text-slate-500 flex justify-between">
                        <span>Xe:</span>
                        <span className="font-semibold text-slate-700">
                          {h.vehicleId?.brand} {h.vehicleId?.model} ({h.vehicleId?.licensePlate})
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SlotPackFlow({ step: stepProp, setStep: setStepProp, user, vehicles: userVehicles = [], apiBase, token, onCanAdvanceChange, onGoToHistory }) {
  const [internalStep, setInternalStep] = useState(1);
  const step = stepProp !== undefined ? stepProp : internalStep;
  const setStep = setStepProp || setInternalStep;
  const [branches, setBranches] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [slotCount, setSlotCount] = useState(5);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyResult, setBuyResult] = useState(null);
  const [buyError, setBuyError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [slotPackPayment, setSlotPackPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [payPollCount, setPayPollCount] = useState(0);

  const [myPacks, setMyPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [showMyPacks, setShowMyPacks] = useState(false);
  const [quickBookPack, setQuickBookPack] = useState(null);
  const [packToCancel, setPackToCancel] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const bRes = await fetch(`${apiBase}/branches`, { headers: { Authorization: `Bearer ${token}` } });
        const bData = await bRes.json();
        const bList = (bData?.data || bData || []).map(b => ({ ...b, id: b._id || b.id }));
        setBranches(Array.isArray(bList) ? bList : []);
      } catch (e) { console.error(e); }
    }
    if (token) load();
  }, [apiBase, token]);

  useEffect(() => {
    if (!selectedBranch) { setPackages([]); return; }
    async function loadPackages() {
      try {
        const pRes = await fetch(`${apiBase}/packages?branchId=${selectedBranch}`, { headers: { Authorization: `Bearer ${token}` } });
        const pData = await pRes.json();
        const pList = (pData?.data || pData || []).filter(p => p.status === 'active').map(p => ({ ...p, id: p._id || p.id }));
        setPackages(Array.isArray(pList) ? pList : []);
        if (pList.length > 0 && !pList.find(p => p.id === selectedPackage)) setSelectedPackage(pList[0].id);
      } catch (e) { console.error(e); }
    }
    loadPackages();
  }, [selectedBranch, apiBase, token]);

  useEffect(() => {
    if (!selectedVehicle && userVehicles[0]) setSelectedVehicle(userVehicles[0]._id || userVehicles[0].id || '');
  }, [userVehicles, selectedVehicle]);

  const loadMyPacks = useCallback(async () => {
    setPacksLoading(true);
    try {
      const res = await fetch(`${apiBase}/slot-packs/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMyPacks(Array.isArray(data?.data) ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setPacksLoading(false); }
  }, [apiBase, token]);

  const handleCancelPackConfirm = async () => {
    if (!packToCancel) return;
    try {
      const res = await fetch(`${apiBase}/slot-packs/${packToCancel._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể hủy gói lượt');
      showToast('Đã hủy gói lượt thành công', 'success');
      setPackToCancel(null);
      loadMyPacks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => { if (showMyPacks) loadMyPacks(); }, [showMyPacks, loadMyPacks]);

  const pkg = packages.find(p => p.id === selectedPackage || p._id === selectedPackage);
  const discountPct = getDiscountPct(slotCount);
  const gross = (pkg?.price || 0) * slotCount;
  const qtyDiscount = Math.floor(gross * discountPct / 100);
  const baseTotal = gross - qtyDiscount;
  const branchObj = branches.find(b => b.id === selectedBranch);
  const vehicleObj = userVehicles.find(v => (v._id || v.id) === selectedVehicle);

  const voucherSavings = (() => {
    if (!appliedVoucher || !baseTotal) return 0;
    if (appliedVoucher.type === 'percentage') {
      const d = Math.floor(baseTotal * appliedVoucher.value / 100);
      return appliedVoucher.maxDiscount > 0 ? Math.min(d, appliedVoucher.maxDiscount) : d;
    }
    return Math.min(appliedVoucher.value || 0, baseTotal);
  })();
  const finalTotal = Math.max(0, baseTotal - voucherSavings);

  const canAdvance = step === 1 ? !!selectedBranch : step === 2 ? !!selectedVehicle && !!selectedPackage : step === 3 ? slotCount > 0 : true;

  useEffect(() => {
    if (onCanAdvanceChange) onCanAdvanceChange(canAdvance);
  }, [canAdvance, onCanAdvanceChange, step]);

  async function handleBuy() {
    if (!selectedBranch || !selectedVehicle || !selectedPackage) {
      setBuyError('Vui lòng chọn đủ chi nhánh, xe và gói dịch vụ.');
      return;
    }
    setBuyLoading(true); setBuyError(''); setBuyResult(null);
    try {
      const res = await fetch(`${apiBase}/slot-packs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          branchId: selectedBranch,
          vehicleId: selectedVehicle === 'ALL' ? undefined : selectedVehicle,
          packageId: selectedPackage,
          totalSlots: slotCount,
          voucherCode: appliedVoucher?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo gói slot');
      const pack = data.data || data;
      setBuyResult(pack);

      // Tạo thanh toán theo phương thức đã chọn
      const payRes = await fetch(`${apiBase}/slot-packs/${pack._id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ method: paymentMethod }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.message || 'Tạo thanh toán thất bại');
      const payResult = payData.data || payData;

      if (paymentMethod === 'vnpay') {
        // Lưu thông tin vào sessionStorage rồi redirect
        sessionStorage.setItem('aw_lastSlotPack', JSON.stringify({
          packCode: pack.packCode,
          finalPrice: pack.finalPriceAfterVoucher || pack.finalPrice,
          packageName: pkg?.name || '',
          branchName: branchObj?.name || 'Toàn hệ thống',
          paymentMethod: 'vnpay',
        }));
        window.location.href = payResult.paymentUrl;
      } else if (paymentMethod === 'wallet') {
        // Wallet: thanh toán thành công ngay
        setBuyResult(prev => prev ? { ...prev, paymentStatus: 'paid' } : { paymentStatus: 'paid' });
        setShowSuccessModal(true);
      } else {
        setSlotPackPayment(payResult);
        setShowQrModal(true);
      }
    } catch (err) { setBuyError(err.message); }
    finally { setBuyLoading(false); }
  }

  // Kiểm tra thanh toán Bank (polling)
  const checkSlotPackPayment = useCallback(async () => {
    if (!buyResult?._id || !slotPackPayment) return;
    try {
      const res = await fetch(`${apiBase}/slot-packs/${buyResult._id}/payment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const p = data?.data || data;
      if (p?.status === 'paid') {
        setBuyResult(prev => prev ? { ...prev, paymentStatus: 'paid' } : prev);
        setShowQrModal(false);
        setSlotPackPayment(null);
        setShowSuccessModal(true);
      }
    } catch (e) { /* ignore */ }
    setPayPollCount(c => c + 1);
  }, [buyResult, slotPackPayment, apiBase, token]);

  // Giả lập thanh toán (demo/test)
  const simulatePaymentConfirm = async () => {
    if (!buyResult?._id || !slotPackPayment) return;
    try {
      const res = await fetch(`${apiBase}/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactionId: slotPackPayment.transactionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuyResult(prev => prev ? { ...prev, paymentStatus: 'paid' } : prev);
        setShowQrModal(false);
        setSlotPackPayment(null);
        setShowSuccessModal(true);
      } else {
        setBuyError(data.message || 'Lỗi giả lập thanh toán');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Poll every 10s when QR is shown
  useEffect(() => {
    if (!showQrModal || !slotPackPayment) return;
    const interval = setInterval(checkSlotPackPayment, 10000);
    return () => clearInterval(interval);
  }, [showQrModal, slotPackPayment, checkSlotPackPayment]);

  // Xử lý VNPay return (đọc từ sessionStorage do BookingWidget chuyển tiếp)
  useEffect(() => {
    const vnpayResultEncoded = sessionStorage.getItem('aw_slotPackVnpayResult');
    if (vnpayResultEncoded) {
      sessionStorage.removeItem('aw_slotPackVnpayResult');
      try {
        const parsed = JSON.parse(decodeURIComponent(vnpayResultEncoded));
        const success = parsed?.success !== false && parsed?.data?.responseCode === '00';
        if (success) {
          const stored = sessionStorage.getItem('aw_lastSlotPack');
          if (stored) {
            const restored = JSON.parse(stored);
            setBuyResult({ packCode: restored.packCode, paymentStatus: 'paid', finalPrice: restored.finalPrice, ...restored });
          } else {
            setBuyResult({ paymentStatus: 'paid' });
          }
          setShowSuccessModal(true);
        } else {
          setBuyError(parsed?.message || 'Thanh toán VNPay thất bại');
        }
      } catch (e) { /* ignore */ }
      sessionStorage.removeItem('aw_lastSlotPack');
      const url = new URL(window.location);
      url.searchParams.delete('vnpay_result');
      window.history.replaceState({}, '', url);
    }
  }, []);

  const isStandalone = stepProp === undefined;

  const stepLabels = ['Chi nhánh', 'Xe & gói', 'Số lần', 'Thanh toán'];

  return (
    <div>
      {isStandalone && (
        <div className="mb-6">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">🎫 GÓI SLOT RỬA XE</div>
          <h2 className="text-2xl font-extrabold text-slate-900">Mua trước — Dùng dần</h2>
          <p className="text-sm text-slate-500 mt-1">Chọn chi nhánh → mua gói nhiều lần, nhận chiết khấu hấp dẫn.</p>
        </div>
      )}

      {isStandalone && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((lbl, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? 'bg-emerald-600 text-white shadow-md'
                    : step > s ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < stepLabels.length && <div className={`w-8 md:w-12 h-0.5 ${step > s ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">Chọn chi nhánh gần bạn</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
                <span>Đang tải danh sách chi nhánh...</span>
              </div>
            ) : (
              branches.map((b) => {
                const bId = b._id || b.id;
                const isSelected = selectedBranch === bId;
                return (
                  <button
                    key={bId}
                    type="button"
                    onClick={() => setSelectedBranch(bId)}
                    className={`group text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-4 ring-emerald-500/5'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 blur-xl transition-all duration-300 ${
                      isSelected ? 'bg-emerald-500 scale-125' : 'bg-slate-300 group-hover:bg-emerald-300'
                    }`} />

                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl transition-all duration-300 ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'
                      }`}>
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-slate-900">{b.name}</h4>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{b.address}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-50">
                          {b.openingTime && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {b.openingTime} – {b.closingTime}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                            🟢 Đang hoạt động
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">
              Chọn xe & gói dịch vụ{branchObj ? ` tại ${branchObj.name}` : ''}
            </h3>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Phương tiện</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button type="button" onClick={() => setSelectedVehicle('ALL')}
                className={`text-left p-5 rounded-xl border transition-all ${selectedVehicle === 'ALL' ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="font-semibold text-slate-800 text-sm">🚗 Tất cả xe</div>
                <div className="text-xs text-slate-400 mt-1">Không khóa cứng 1 biển số</div>
              </button>
              {userVehicles.map(v => {
                const vid = v._id || v.id;
                return (
                  <button key={vid} type="button" onClick={() => setSelectedVehicle(vid)}
                    className={`text-left p-5 rounded-xl border transition-all ${selectedVehicle === vid ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="font-semibold text-slate-800 text-sm">{v.brand || ''} {v.model || ''}</div>
                    <div className="text-xs text-slate-400 mt-1">{v.licensePlate}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gói dịch vụ</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.length === 0 ? (
                <div className="col-span-2 text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-3 border border-slate-100 rounded-2xl bg-white">
                  <Info className="w-8 h-8 text-slate-300" />
                  <span>Chi nhánh này chưa có gói dịch vụ nào.</span>
                </div>
              ) : packages.map((p, index) => {
                const pId = p._id || p.id;
                const isActive = pId === selectedPackage || p.id === selectedPackage;
                const isPopular = p.price >= 150000 || index === 1;

                return (
                  <div 
                    key={pId}
                    className={`group rounded-2xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-50/10 shadow-md ring-4 ring-emerald-500/5' 
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute right-0 top-0 bg-gradient-to-l from-emerald-600 to-teal-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase shadow-sm">
                        Khuyên Dùng
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={() => setSelectedPackage(pId)} 
                      className="w-full text-left p-6 flex-1 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between pr-16 mb-2">
                          <span className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{p.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">{p.description}</p>
                      </div>
                      
                      <div className="flex items-baseline justify-between mt-auto pt-4 border-t border-slate-50">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {p.duration} phút
                        </span>
                        <span className="text-xl font-extrabold text-emerald-600">{formatCurrency(p.price)}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sub-services breakdown for selected package (included services only) */}
            {pkg && pkg.subServices && pkg.subServices.filter(sub => !sub.isOptional).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-200/70"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-700">Dịch vụ chi tiết đã bao gồm trong gói</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pkg.subServices.filter(sub => !sub.isOptional).map((sub, idx) => (
                    <div key={sub._id || sub.name || idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center bg-emerald-50 border border-emerald-200 shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                        </div>
                        <span className="text-sm font-medium">{sub.name}</span>
                      </div>
                      {sub.duration > 0 && (
                        <span className="text-xs font-medium text-slate-400 shrink-0">{sub.duration} phút</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn số lần rửa xe</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {DISCOUNT_TIERS.map(t => {
              const active = slotCount >= t.min && slotCount <= t.max;
              return (
                <div key={t.pct} className={`text-center p-4 rounded-xl transition-all ${active ? 'bg-emerald-50 border-2 border-emerald-400 shadow-sm' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="text-xs text-slate-500 font-medium">{t.min === 20 ? '20+' : `${t.min}–${t.max}`} lần</div>
                  <div className={`text-lg font-bold mt-1 ${active ? 'text-emerald-600' : 'text-slate-300'}`}>{t.pct > 0 ? `-${t.pct}%` : 'Gốc'}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{t.label}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mb-6">
            <button onClick={() => setSlotCount(n => Math.max(1, n - 1))}
              className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xl font-bold text-slate-800 hover:bg-slate-50 transition-colors">−</button>
            <div className="text-center">
              <div className="text-5xl font-black text-slate-900 leading-none">{slotCount}</div>
              <div className="text-sm text-slate-500 font-medium mt-2">lần</div>
            </div>
            <button onClick={() => setSlotCount(n => Math.min(50, n + 1))}
              className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xl font-bold text-slate-800 hover:bg-slate-50 transition-colors">+</button>
          </div>
          <div className="flex gap-2 justify-center flex-wrap mb-6">
            {[1, 3, 5, 10, 15, 20].map(n => (
              <button key={n} onClick={() => setSlotCount(n)}
                className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all ${n === slotCount ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {n}x
                {getDiscountPct(n) > 0 && (
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white bg-emerald-500 rounded-full px-1.5 py-0.5">-{getDiscountPct(n)}%</span>
                )}
              </button>
            ))}
          </div>
          {discountPct > 0 && (
            <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">
              🎉 Chiết khấu số lượng: <strong>{discountPct}%</strong> — {getDiscountLabel(slotCount)}!
            </div>
          )}
        </motion.div>
      )}

      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Voucher & Thanh toán</h3>
          <div className="mb-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Ưu đãi</span>
            <button type="button" onClick={() => setVoucherModalOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-700">Voucher & Ưu đãi</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {appliedVoucher ? `Đã chọn: ${appliedVoucher.code}` : 'Chọn mã giảm giá'}
                  </div>
                </div>
              </div>
              <span className="text-emerald-600 font-semibold text-sm">
                {appliedVoucher ? 'Thay đổi' : 'Chọn >'}
              </span>
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Tóm tắt đơn hàng</div>
            {[
              ['Chi nhánh', branchObj?.name || '—'],
              ['Gói dịch vụ', pkg?.name || '—'],
              ['Giá mỗi lần', pkg ? formatCurrency(pkg.price) : '—'],
              ['Số lần', `${slotCount} lần`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{k}</span>
                <span className="text-sm font-semibold text-slate-800">{v}</span>
              </div>
            ))}
            <div className="border-t-2 border-slate-200 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tạm tính</span><span>{formatCurrency(gross)}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Chiết khấu SL (-{discountPct}%)</span><span>-{formatCurrency(qtyDiscount)}</span>
                </div>
              )}
              {voucherSavings > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Voucher ({appliedVoucher?.code})</span><span>-{formatCurrency(voucherSavings)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t-2 border-slate-200">
                <span className="text-base font-bold text-slate-900">TỔNG THANH TOÁN</span>
                <span className="text-xl font-black text-emerald-600">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            {(discountPct > 0 || voucherSavings > 0) && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold text-center">
                🎉 Tiết kiệm: {formatCurrency(qtyDiscount + voucherSavings)}
              </div>
            )}
          </div>
          {buyError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{buyError}</div>
          )}

          {/* Payment Method Selection */}
          <div className="mt-5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Số tiền cần thanh toán</span>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <button type="button"
                className="p-2.5 border-2 rounded-xl text-left transition-all border-emerald-500 bg-emerald-50 shadow-sm"
              >
                <div className="font-bold text-xs text-emerald-700">Thanh toán 100%</div>
                <div className="mt-0.5 text-base font-black text-emerald-600">{formatCurrency(finalTotal)}</div>
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Chọn phương thức</span>
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const walletDisabled = !user || (user.walletBalance || 0) < finalTotal;
                const methods = [
                  { value: 'bank', label: 'Ngân hàng', color: '#10b981' },
                  { value: 'vnpay', label: 'VNPay', color: '#2563eb' },
                  { value: 'wallet', label: 'Ví của tôi', color: '#f59e0b', disabled: walletDisabled },
                ];
                return methods.map(m => {
                  const isWalletDisabled = m.value === 'wallet' && m.disabled;
                  return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { if (!isWalletDisabled) setPaymentMethod(m.value); }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    paymentMethod === m.value
                      ? 'border-emerald-500 bg-emerald-50/30 shadow-sm'
                      : isWalletDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ backgroundColor: m.color }}>
                    {m.value === 'bank' ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M2 12v4h20v-4" />
                      </svg>
                    ) : m.value === 'wallet' ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${paymentMethod === m.value ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {m.value === 'wallet' ? 'Ví (' + formatCurrency(user?.walletBalance || 0) + ')' : m.label}
                  </span>
                </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="mt-5 p-3 bg-slate-50 border border-slate-100 rounded-xl flex gap-3">
            <button type="button" onClick={() => setStep(step - 1)} disabled={buyLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors active:scale-[0.98] disabled:opacity-50">
              Quay lại
            </button>
            <button onClick={handleBuy} disabled={buyLoading || !pkg || (paymentMethod === 'wallet' && (!user || (user.walletBalance || 0) < finalTotal))}
              className={`flex-[2] px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${buyLoading || !pkg || (paymentMethod === 'wallet' && (!user || (user.walletBalance || 0) < finalTotal)) ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
              {buyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {buyLoading ? 'ĐANG XỬ LÝ...' : `THANH TOÁN ${formatCurrency(finalTotal)}`}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <button onClick={() => setShowMyPacks(!showMyPacks)} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
              📦 {showMyPacks ? 'Ẩn' : 'Xem'} gói của tôi {myPacks.filter(p => p.status === 'active').length > 0 && `(${myPacks.filter(p => p.status === 'active').length}active)`}
            </button>
            {showMyPacks && (
              <div className="mt-4 space-y-3">
                {packsLoading ? (
                  <div className="text-center py-8 text-slate-400">Đang tải...</div>
                ) : myPacks.filter(p => p.status !== 'cancelled' && p.status !== 'exhausted' && p.remainingSlots > 0).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Chưa có gói slot nào khả dụng</div>
                ) : myPacks.filter(p => p.status !== 'cancelled' && p.status !== 'exhausted' && p.remainingSlots > 0).map(p => (
                  <PackCard
                    key={p._id}
                    pack={p}
                    onQuickBook={setQuickBookPack}
                    onCancelPack={setPackToCancel}
                    apiBase={apiBase}
                    token={token}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {isStandalone && step < 4 && (
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              Quay lại
            </button>
          ) : <div />}
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              canAdvance ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}>
            Tiếp theo
          </button>
        </div>
      )}

      {/* Success Modal */}
      {createPortal(
        <AnimatePresence>
          {(showSuccessModal && buyResult) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
              onClick={() => { setShowSuccessModal(false); setBuyResult(null); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[1.5rem] w-full max-w-lg p-8 shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Mua gói thành công!</h3>
                  <p className="text-sm text-slate-500 mt-1">Mã gói: <span className="font-mono font-semibold text-emerald-600">{buyResult.packCode}</span></p>
                </div>
  
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Chi nhánh</span>
                    <span className="font-medium text-slate-800">{branchObj?.name || 'Toàn hệ thống'}</span>
                  </div>
                  <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Gói dịch vụ</span>
                    <span className="font-medium text-slate-800">{pkg?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Số lần</span>
                    <span className="font-medium text-slate-800">{buyResult.totalSlots || slotCount} lần</span>
                  </div>
                  {buyResult.discountPercent > 0 && (
                    <div className="flex justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500">Chiết khấu</span>
                      <span className="font-medium text-emerald-600">-{buyResult.discountPercent}%</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-semibold">Tổng thanh toán</span>
                    <span className="text-emerald-700 font-bold">{formatCurrency(buyResult.finalPriceAfterVoucher ?? buyResult.finalPrice ?? finalTotal)}</span>
                  </div>
                </div>
  
                {buyResult.paymentStatus === 'paid' ? (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-sm text-emerald-700 font-semibold">
                    ✓ Đã thanh toán — mã <span className="font-mono font-bold">{buyResult.packCode}</span> đã sẵn sàng sử dụng.
                  </div>
                ) : (
                  <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200 text-center text-sm text-sky-700">
                    Đưa mã <span className="font-mono font-bold">{buyResult.packCode}</span> cho nhân viên khi đến rửa xe.
                  </div>
                )}
  
                <div className="flex gap-3 mt-8">
                  <button onClick={() => { setShowSuccessModal(false); setBuyResult(null); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Đóng
                  </button>
                  <button onClick={() => { setShowSuccessModal(false); setBuyResult(null); setStep(1); onGoToHistory?.('slot_packs'); }}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
                    Lịch sử gói lượt
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* QR Payment Modal */}
      {createPortal(
        <AnimatePresence>
          {showQrModal && slotPackPayment && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={() => { if (!buyLoading) { setShowQrModal(false); setSlotPackPayment(null); } }}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100/80 p-6"
                onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="text-center mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 bg-emerald-50 border-2 border-emerald-100">
                    <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M2 12v4h20v-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Chuyển khoản ngân hàng</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Quét mã QR VietQR hoặc chuyển khoản thủ công</p>
                </div>

                {/* QR Image */}
                {slotPackPayment.qrCode && (
                  <div className="pb-2 flex justify-center">
                    <div className="bg-white rounded-2xl border-2 border-slate-100 p-2.5 shadow-sm">
                      <img src={slotPackPayment.qrCode} alt="QR code" className="w-36 h-36" />
                    </div>
                  </div>
                )}

                {/* Amount display box */}
                <div className="bg-slate-50 rounded-xl p-3 text-center mb-3">
                  <div className="text-xs text-slate-400 mb-0.5 font-medium">Số tiền cần chuyển (Thanh toán 100%)</div>
                  <div className="text-2xl font-black text-emerald-600">{formatCurrency(slotPackPayment.amount || finalTotal)}</div>
                  {buyResult?.packCode && (
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">Mã gói: {buyResult.packCode}</div>
                  )}
                </div>

                {/* Account Details Box */}
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 mb-3 text-xs">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Ngân hàng</span>
                    <span className="font-bold text-slate-700">{slotPackPayment.bankInfo?.bankName || 'Ngân hàng TMCP Quân đội (MB)'}</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Số tài khoản</span>
                    <span className="font-bold text-slate-700 font-mono tracking-wider">{slotPackPayment.bankInfo?.accountNumber || '97966888888'}</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Chủ tài khoản</span>
                    <span className="font-bold text-slate-700">{slotPackPayment.bankInfo?.accountHolder || 'CONG TY CO PHAN AUTO WASH PRO'}</span>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 font-semibold">Nội dung chuyển khoản</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(slotPackPayment.bankInfo?.transferContent || `THANH TOAN ${slotPackPayment.transactionId}`);
                          showToast('Đã sao chép nội dung CK!', 'success');
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-sm font-bold text-slate-700 font-mono bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center tracking-wider">
                      {slotPackPayment.bankInfo?.transferContent || `THANH TOAN ${slotPackPayment.transactionId}`}
                    </div>
                  </div>
                </div>

                {/* Package Details Breakdown */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-2 mb-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CHI TIẾT GÓI LƯỢT</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chi nhánh</span>
                    <span className="font-bold text-slate-700">{branchObj?.name || 'Toàn hệ thống'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gói dịch vụ</span>
                    <span className="font-bold text-slate-700">{pkg?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số lượt rửa</span>
                    <span className="font-bold text-slate-700">{slotCount} lượt {discountPct > 0 ? `(-${discountPct}%)` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Áp dụng cho xe</span>
                    <span className="font-bold text-slate-700">
                      {selectedVehicle === 'ALL' ? 'Tất cả xe' : (vehicleObj?.licensePlate || vehicleObj?.brand || 'Xe đã chọn')}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium mb-3">
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${payPollCount % 2 === 0 ? 'animate-spin' : ''}`} />
                  <span>Đang tự động lắng nghe thanh toán từ ngân hàng...</span>
                </div>

                {/* Buttons */}
                <div className="pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => { setShowQrModal(false); setSlotPackPayment(null); }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                    Hủy giao dịch
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* Voucher Modal */}
      {createPortal(
        <AnimatePresence>
          {voucherModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setVoucherModalOpen(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="shrink-0 border-b border-slate-100 px-5 py-4 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Chọn Ưu Đãi</h3>
                  <button
                    onClick={() => setVoucherModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <VoucherPicker
                    apiBase={apiBase} token={token} selected={appliedVoucher}
                    onSelect={(v) => { setAppliedVoucher(v); setVoucherModalOpen(false); }}
                    orderAmount={baseTotal} compact branchId={selectedBranch}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* Quick Booking Modal */}
      {quickBookPack && (
        <QuickBookModal
          pack={quickBookPack}
          userVehicles={userVehicles}
          branches={branches}
          apiBase={apiBase}
          token={token}
          onClose={() => setQuickBookPack(null)}
          onSuccess={() => {
            loadMyPacks();
            if (onGoToHistory) onGoToHistory();
          }}
        />
      )}
      {/* Cancel Confirmation Modal */}
      {packToCancel && (
        <div className="fixed inset-0 z-[10005] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-slate-100"
          >
            <button
              type="button"
              onClick={() => setPackToCancel(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Xác nhận hủy gói lượt</h3>
              <p className="text-xs text-slate-500 mb-4">Hành động này không thể hoàn tác. Gói lượt sẽ bị hủy bỏ hoàn toàn và ẩn khỏi giao diện của bạn.</p>
              
              <div className="w-full bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6 border border-slate-100 text-slate-700">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Mã gói lượt:</span>
                  <span className="font-mono font-bold text-slate-800">{packToCancel.packCode}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Gói dịch vụ:</span>
                  <span className="font-bold text-slate-800">{packToCancel.packageId?.name || 'Gói dịch vụ'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Chi nhánh:</span>
                  <span className="font-bold text-slate-800">{packToCancel.branchId?.name || 'Áp dụng toàn hệ thống'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Số lượt còn lại:</span>
                  <span className="font-bold text-red-600">{packToCancel.remainingSlots}/{packToCancel.totalSlots} lượt</span>
                </div>
              </div>
              
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setPackToCancel(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleCancelPackConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors"
                >
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
