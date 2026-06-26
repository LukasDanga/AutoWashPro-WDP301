import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoucherPicker from '../VoucherPicker.jsx';

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

function PackCard({ pack }) {
  const st = STATUS_MAP[pack.status] || { label: pack.status, color: '#6b7280', bg: '#f9fafb' };
  const pkg = pack.packageId;
  const branch = pack.branchId;
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md ${pack.status !== 'active' ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-xs font-bold text-slate-900 tracking-wider">{pack.packCode}</div>
          <div className="text-sm font-bold text-slate-900 mt-1">{pkg?.name || 'Gói dịch vụ'}</div>
          <div className="text-xs text-slate-400 mt-0.5">📍 {branch?.name || ''}</div>
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

  const [myPacks, setMyPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [showMyPacks, setShowMyPacks] = useState(false);

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

  useEffect(() => { if (showMyPacks) loadMyPacks(); }, [showMyPacks, loadMyPacks]);

  const pkg = packages.find(p => p.id === selectedPackage);
  const discountPct = getDiscountPct(slotCount);
  const gross = (pkg?.price || 0) * slotCount;
  const qtyDiscount = Math.floor(gross * discountPct / 100);
  const baseTotal = gross - qtyDiscount;
  const branchObj = branches.find(b => b.id === selectedBranch);

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
          branchId: selectedBranch === 'ALL' ? undefined : selectedBranch,
          vehicleId: selectedVehicle === 'ALL' ? undefined : selectedVehicle,
          packageId: selectedPackage,
          totalSlots: slotCount,
          voucherCode: appliedVoucher?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo gói slot');
      setBuyResult(data.data || data);
      setShowSuccessModal(true);
    } catch (err) { setBuyError(err.message); }
    finally { setBuyLoading(false); }
  }

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn chi nhánh</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 py-8">Đang tải danh sách chi nhánh...</div>
            ) : (
              <>
                <button type="button" onClick={() => setSelectedBranch('ALL')}
                  className={`text-left p-5 rounded-xl border transition-all ${selectedBranch === 'ALL' ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">🌍 Áp dụng toàn hệ thống</div>
                      <div className="text-xs text-slate-400 mt-0.5">Dùng ở bất kỳ chi nhánh nào</div>
                    </div>
                  </div>
                </button>
                {branches.map(b => (
                  <button key={b.id} type="button" onClick={() => setSelectedBranch(b.id)}
                    className={`text-left p-5 rounded-xl border transition-all ${selectedBranch === b.id ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="10" r="3" /><path d="M12 2a8 8 0 00-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 00-8-8z" />
                      </svg>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{b.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{b.address}</div>
                        {b.openingTime && <div className="text-xs text-slate-400 mt-1">⏰ {b.openingTime} – {b.closingTime}</div>}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Chọn xe & gói dịch vụ</h3>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Phương tiện</div>
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
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gói dịch vụ</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 py-8">Chi nhánh này chưa có gói dịch vụ nào.</div>
            ) : packages.map(p => (
              <button key={p.id} type="button" onClick={() => setSelectedPackage(p.id)}
                className={`text-left p-5 rounded-xl border transition-all ${selectedPackage === p.id ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-slate-800">{p.name}</span>
                  <span className="text-emerald-600 font-bold">{formatCurrency(p.price)}</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">{p.description}</p>
                <span className="text-xs text-slate-400">⏱ {p.duration} phút</span>
              </button>
            ))}
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
            <VoucherPicker apiBase={apiBase} token={token} selected={appliedVoucher} onSelect={setAppliedVoucher} orderAmount={baseTotal} />
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
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button onClick={() => setShowMyPacks(!showMyPacks)} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
              📦 {showMyPacks ? 'Ẩn' : 'Xem'} gói của tôi {myPacks.filter(p => p.status === 'active').length > 0 && `(${myPacks.filter(p => p.status === 'active').length}active)`}
            </button>
            {showMyPacks && (
              <div className="mt-4 space-y-3">
                {packsLoading ? (
                  <div className="text-center py-8 text-slate-400">Đang tải...</div>
                ) : myPacks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Chưa có gói slot nào</div>
                ) : myPacks.map(p => <PackCard key={p._id} pack={p} />)}
              </div>
            )}
          </div>
          <button onClick={handleBuy} disabled={buyLoading || !pkg}
            className={`w-full mt-6 py-3.5 rounded-xl font-semibold text-sm transition-all ${buyLoading || !pkg ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)] hover:bg-emerald-500'}`}>
            {buyLoading ? 'ĐANG TẠO GÓI...' : `MUA ${slotCount} LẦN — ${formatCurrency(finalTotal)}`}
          </button>
        </motion.div>
      )}

      {isStandalone && (
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              Quay lại
            </button>
          ) : <div />}
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canAdvance}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                canAdvance ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}>
              Tiếp theo
            </button>
          ) : (
            <button onClick={() => { setInternalStep(1); setSelectedBranch(''); setSelectedVehicle(''); setSelectedPackage(''); setSlotCount(5); setAppliedVoucher(null); setBuyResult(null); setBuyError(''); }}
              className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              Đặt lại
            </button>
          )}
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && buyResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => { setShowSuccessModal(false); setBuyResult(null); }}>
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

              <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200 text-center text-sm text-sky-700">
                Đưa mã <span className="font-mono font-bold">{buyResult.packCode}</span> cho nhân viên khi đến rửa xe.
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => { setShowSuccessModal(false); setBuyResult(null); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Đóng
                </button>
                <button onClick={() => { setShowSuccessModal(false); setBuyResult(null); onGoToHistory?.(); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors">
                  Lịch sử gói lượt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
