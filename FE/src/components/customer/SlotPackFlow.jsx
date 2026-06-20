import React, { useEffect, useState, useCallback } from 'react';
import VoucherPicker from '../VoucherPicker.jsx';

const DISCOUNT_TIERS = [
  { min: 1,  max: 4,  pct: 0,  label: 'Giá gốc' },
  { min: 5,  max: 9,  pct: 5,  label: 'Tiết kiệm 5%' },
  { min: 10, max: 19, pct: 10, label: 'Tiết kiệm 10%' },
  { min: 20, max: 50, pct: 15, label: 'Tiết kiệm 15%' },
];

const STATUS_MAP = {
  active:    { label: 'Còn hiệu lực', color: '#10b981', bg: '#ecfdf5' },
  exhausted: { label: 'Đã dùng hết',  color: '#6b7280', bg: '#f9fafb' },
  expired:   { label: 'Hết hạn',      color: '#ef4444', bg: '#fef2f2' },
  cancelled: { label: 'Đã hủy',       color: '#94a3b8', bg: '#f1f5f9' },
};

function formatCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function getDiscountPct(n) { return DISCOUNT_TIERS.find(t => n >= t.min && n <= t.max)?.pct || 0; }
function getDiscountLabel(n) { return DISCOUNT_TIERS.find(t => n >= t.min && n <= t.max)?.label || ''; }

function SlotMeter({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
        <span>Còn lại</span>
        <span style={{ fontWeight: 700 }}>{remaining}/{total}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function PackCard({ pack }) {
  const st = STATUS_MAP[pack.status] || { label: pack.status, color: '#6b7280', bg: '#f9fafb' };
  const pkg = pack.packageId;
  const branch = pack.branchId;
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
      padding: '20px 22px', transition: 'all 0.15s',
      opacity: pack.status !== 'active' ? 0.6 : 1,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>{pack.packCode}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{pkg?.name || 'Gói dịch vụ'}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {branch?.name || ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pack.discountPercent > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px' }}>
              -{pack.discountPercent}%
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 20, padding: '3px 10px' }}>
            {st.label}
          </span>
        </div>
      </div>

      <SlotMeter total={pack.totalSlots} remaining={pack.remainingSlots} />

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
        {[
          { label: 'Giá gói', value: formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice) },
          { label: 'Đã dùng', value: `${pack.usedSlots} lần` },
          { label: 'Hết hạn', value: pack.expiresAt ? new Date(pack.expiresAt).toLocaleDateString('vi-VN') : '—' },
          { label: 'Thanh toán', value: pack.paymentStatus === 'paid' ? '✓ Đã TT' : '⏳ Chờ TT', color: pack.paymentStatus === 'paid' ? '#10b981' : '#f59e0b' },
        ].map(r => (
          <div key={r.label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: r.color || '#0f172a', marginTop: 2 }}>{r.value}</div>
          </div>
        ))}
      </div>

      {pack.voucherCode && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
          🏷 {pack.voucherCode} — tiết kiệm thêm {formatCurrency(pack.voucherDiscount)}
        </div>
      )}
    </div>
  );
}

export default function SlotPackFlow({ user, vehicles: userVehicles = [], apiBase, token }) {
  const [tab, setTab] = useState('buy');
  const [step, setStep] = useState(1);

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

  const [myPacks, setMyPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(false);

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

  useEffect(() => { if (tab === 'my') loadMyPacks(); }, [tab, loadMyPacks]);

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

  const stepComplete = [!!selectedBranch, !!selectedVehicle && !!selectedPackage, slotCount > 0, true];

  function advanceStep(next) {
    if (next > step && !stepComplete[step - 1]) return;
    setStep(next);
  }

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
    } catch (err) { setBuyError(err.message); }
    finally { setBuyLoading(false); }
  }

  const stepStyle = (active) => ({
    borderRadius: 16, border: active ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
    boxShadow: active ? '0 2px 12px rgba(14,165,233,0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
    background: '#fff', overflow: 'hidden', transition: 'all 0.2s',
  });

  const stepNumStyle = (done) => ({
    width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 800, marginRight: 10, flexShrink: 0,
    background: done ? '#0ea5e9' : '#f1f5f9', color: done ? '#fff' : '#94a3b8',
  });

  const optStyle = (active) => ({
    padding: '14px 16px', borderRadius: 12, border: active ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
    background: active ? '#f0f9ff' : '#fff', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s', width: '100%',
  });

  const activePackCount = myPacks.filter(p => p.status === 'active').length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>🎫 GÓI SLOT RỬA XE</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Mua trước — Dùng dần</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>Chọn chi nhánh → mua gói nhiều lần, nhận chiết khấu hấp dẫn.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 14, marginBottom: 24 }}>
        <button onClick={() => setTab('buy')} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
          background: tab === 'buy' ? '#fff' : 'transparent', color: tab === 'buy' ? '#0f172a' : '#64748b',
          boxShadow: tab === 'buy' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        }}>🛒 Mua Gói Mới</button>
        <button onClick={() => setTab('my')} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
          background: tab === 'my' ? '#fff' : 'transparent', color: tab === 'my' ? '#0f172a' : '#64748b',
          boxShadow: tab === 'my' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        }}>📦 Gói Của Tôi {activePackCount > 0 && `(${activePackCount})`}</button>
      </div>

      {/* ─── TAB: MUA GÓI ─── */}
      {tab === 'buy' && (
        <>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
            {['Chọn chi nhánh', 'Chọn xe & gói', 'Số lần', 'Thanh toán'].map((label, i) => (
              <React.Fragment key={i}>
                <button onClick={() => advanceStep(i + 1)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: step === i + 1 ? '#0ea5e9' : stepComplete[i] ? '#ecfdf5' : '#f8fafc',
                  color: step === i + 1 ? '#fff' : stepComplete[i] ? '#059669' : '#94a3b8',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    background: step === i + 1 ? 'rgba(255,255,255,0.25)' : stepComplete[i] ? '#d1fae5' : '#e2e8f0',
                  }}>{stepComplete[i] && step !== i + 1 ? '✓' : i + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < 3 && <div style={{ flex: 1, height: 2, background: stepComplete[i] ? '#a7f3d0' : '#e2e8f0', margin: '0 4px' }} />}
              </React.Fragment>
            ))}
          </div>

          {/* Discount banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {DISCOUNT_TIERS.map(t => {
              const active = slotCount >= t.min && slotCount <= t.max;
              return (
                <div key={t.pct} style={{
                  padding: '10px 12px', borderRadius: 12, textAlign: 'center', transition: 'all 0.15s',
                  background: active ? '#ecfdf5' : '#f8fafc', border: active ? '2px solid #10b981' : '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{t.min === 20 ? '20+' : `${t.min}–${t.max}`} lần</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: active ? '#059669' : '#94a3b8', marginTop: 2 }}>{t.pct > 0 ? `-${t.pct}%` : 'Gốc'}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{t.label}</div>
                </div>
              );
            })}
          </div>

          {/* Step 1: Chi nhánh */}
          <div style={stepStyle(step === 1)}>
            <div style={{ padding: '16px 20px', borderBottom: step === 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center' }}>
              <span style={stepNumStyle(stepComplete[0])}>{stepComplete[0] && step !== 1 ? '✓' : '1'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>CHỌN CHI NHÁNH</span>
              {selectedBranch && step !== 1 && <span style={{ fontSize: 13, color: '#0ea5e9', marginLeft: 8, fontWeight: 600 }}>— {branchObj?.name}</span>}
            </div>
            {step === 1 && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  <button type="button" style={optStyle('ALL' === selectedBranch)} onClick={() => setSelectedBranch('ALL')}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>🌍 Áp dụng toàn hệ thống</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Dùng ở bất kỳ chi nhánh nào</div>
                  </button>
                  {branches.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20, color: '#94a3b8' }}>Đang tải...</div>
                  ) : branches.map(b => (
                    <button key={b.id} type="button" style={optStyle(b.id === selectedBranch)} onClick={() => setSelectedBranch(b.id)}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>🏪 {b.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{b.address}</div>
                      {b.openingTime && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>⏰ {b.openingTime} – {b.closingTime}</div>}
                    </button>
                  ))}
                </div>
                {selectedBranch && (
                  <button onClick={() => setStep(2)} style={{
                    marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 700,
                  }}>Tiếp tục →</button>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Xe & Gói */}
          {selectedBranch && (
            <div style={{ ...stepStyle(step === 2), marginTop: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: step === 2 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center' }}>
                <span style={stepNumStyle(stepComplete[1])}>{stepComplete[1] && step !== 2 ? '✓' : '2'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>CHỌN XE & GÓI DỊCH VỤ</span>
              </div>
              {step === 2 && (
                <div style={{ padding: '16px 20px' }}>
                  {/* Xe */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Phương tiện</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 20 }}>
                    <button type="button" style={optStyle('ALL' === selectedVehicle)} onClick={() => setSelectedVehicle('ALL')}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>🚗 Tất cả xe</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Không khóa cứng 1 biển số</div>
                    </button>
                    {userVehicles.map(v => {
                      const vid = v._id || v.id;
                      return (
                        <button key={vid} type="button" style={optStyle(vid === selectedVehicle)} onClick={() => setSelectedVehicle(vid)}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{v.brand || ''} {v.model || ''}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{v.licensePlate}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Gói */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Gói dịch vụ</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflow: 'auto' }}>
                    {packages.map(p => (
                      <button key={p.id} type="button" style={{ ...optStyle(p.id === selectedPackage), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedPackage(p.id)}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.description}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>⏱ {p.duration} phút</div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>{formatCurrency(p.price)}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>← Quay lại</button>
                    <button onClick={() => setStep(3)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Tiếp tục →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Số lần */}
          {selectedBranch && (
            <div style={{ ...stepStyle(step === 3), marginTop: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: step === 3 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center' }}>
                <span style={stepNumStyle(stepComplete[2])}>{stepComplete[2] && step !== 3 ? '✓' : '3'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>SỐ LẦN RỬA XE</span>
                {step !== 3 && slotCount > 0 && <span style={{ fontSize: 13, color: '#0ea5e9', marginLeft: 8, fontWeight: 600 }}>— {slotCount} lần</span>}
              </div>
              {step === 3 && (
                <div style={{ padding: '16px 20px' }}>
                  {/* Slot counter */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                    <button onClick={() => setSlotCount(n => Math.max(1, n - 1))} style={{
                      width: 48, height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff',
                      fontSize: 22, fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>−</button>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{slotCount}</div>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>lần</div>
                    </div>
                    <button onClick={() => setSlotCount(n => Math.min(50, n + 1))} style={{
                      width: 48, height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff',
                      fontSize: 22, fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>+</button>
                  </div>

                  {/* Quick slots */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    {[1, 3, 5, 10, 15, 20].map(n => (
                      <button key={n} onClick={() => setSlotCount(n)} style={{
                        padding: '8px 16px', borderRadius: 10, border: n === slotCount ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                        background: n === slotCount ? '#f0f9ff' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                        color: n === slotCount ? '#0284c7' : '#475569', position: 'relative',
                      }}>
                        {n}x
                        {getDiscountPct(n) > 0 && (
                          <span style={{ position: 'absolute', top: -8, right: -8, fontSize: 9, fontWeight: 800, color: '#fff', background: '#10b981', borderRadius: 6, padding: '2px 5px' }}>
                            -{getDiscountPct(n)}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {discountPct > 0 && (
                    <div style={{ textAlign: 'center', padding: '10px 16px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13, color: '#059669', fontWeight: 600, marginBottom: 16 }}>
                      🎉 Chiết khấu số lượng: <strong>{discountPct}%</strong> — {getDiscountLabel(slotCount)}!
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>← Quay lại</button>
                    <button onClick={() => setStep(4)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Tiếp tục →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Voucher & Thanh toán */}
          {selectedBranch && (
            <div style={{ ...stepStyle(step === 4), marginTop: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: step === 4 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center' }}>
                <span style={stepNumStyle(stepComplete[3])}>4</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>VOUCHER & THANH TOÁN</span>
              </div>
              {step === 4 && (
                <div style={{ padding: '16px 20px' }}>
                  {/* Voucher */}
                  <div style={{ marginBottom: 20 }}>
                    <VoucherPicker apiBase={apiBase} token={token} selected={appliedVoucher} onSelect={setAppliedVoucher} orderAmount={baseTotal} />
                  </div>

                  {/* Summary */}
                  <div style={{ background: '#f8fafc', borderRadius: 14, padding: '20px 22px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tóm tắt đơn hàng</div>
                    {[
                      ['Chi nhánh', branchObj?.name || '—'],
                      ['Gói dịch vụ', pkg?.name || '—'],
                      ['Giá mỗi lần', pkg ? formatCurrency(pkg.price) : '—'],
                      ['Số lần', `${slotCount} lần`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{v}</span>
                      </div>
                    ))}

                    <div style={{ borderTop: '2px solid #e2e8f0', marginTop: 10, paddingTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                        <span>Tạm tính</span><span>{formatCurrency(gross)}</span>
                      </div>
                      {discountPct > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#10b981' }}>
                          <span>Chiết khấu SL (-{discountPct}%)</span><span>-{formatCurrency(qtyDiscount)}</span>
                        </div>
                      )}
                      {voucherSavings > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#10b981' }}>
                          <span>Voucher ({appliedVoucher?.code})</span><span>-{formatCurrency(voucherSavings)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '2px solid #e2e8f0' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>TỔNG THANH TOÁN</span>
                        <span style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{formatCurrency(finalTotal)}</span>
                      </div>
                    </div>

                    {(discountPct > 0 || voucherSavings > 0) && (
                      <div style={{ marginTop: 12, padding: '10px 14px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13, color: '#059669', fontWeight: 600, textAlign: 'center' }}>
                        🎉 Tiết kiệm: {formatCurrency(qtyDiscount + voucherSavings)}
                      </div>
                    )}
                  </div>

                  {buyError && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>{buyError}</div>
                  )}

                  {buyResult && (
                    <div style={{ marginTop: 12, padding: '16px', background: '#ecfdf5', borderRadius: 12, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#059669', marginBottom: 6 }}>✓ Mua gói thành công!</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '0.1em' }}>{buyResult.packCode}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Đưa mã này cho nhân viên khi đến rửa xe.</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button onClick={() => setStep(3)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>← Quay lại</button>
                    <button onClick={handleBuy} disabled={buyLoading || !pkg} style={{
                      flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: buyLoading || !pkg ? '#cbd5e1' : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                      color: '#fff', fontSize: 14, fontWeight: 800, boxShadow: buyLoading ? 'none' : '0 4px 14px rgba(14,165,233,0.3)',
                    }}>
                      {buyLoading ? 'ĐANG TẠO GÓI...' : `MUA ${slotCount} LẦN — ${formatCurrency(finalTotal)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── TAB: GÓI CỦA TÔI ─── */}
      {tab === 'my' && (
        <div>
          {packsLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Đang tải...</div>
          ) : myPacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Chưa có gói slot nào</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Mua gói để sử dụng dịch vụ linh hoạt hơn.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
              {myPacks.map(p => <PackCard key={p._id} pack={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
