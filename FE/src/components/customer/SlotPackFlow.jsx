import React, { useEffect, useState, useCallback } from 'react';
import VoucherPicker from '../VoucherPicker.jsx';

const DISCOUNT_TIERS = [
  { min: 1,  max: 4,  pct: 0,  label: 'Giá gốc' },
  { min: 5,  max: 9,  pct: 5,  label: 'Tiết kiệm 5%' },
  { min: 10, max: 19, pct: 10, label: 'Tiết kiệm 10%' },
  { min: 20, max: 50, pct: 15, label: 'Tiết kiệm 15%' },
];

const STATUS_LABELS = {
  active:    { label: 'Còn hiệu lực', cls: 'sp-status-active' },
  exhausted: { label: 'Đã dùng hết',  cls: 'sp-status-exhausted' },
  expired:   { label: 'Hết hạn',      cls: 'sp-status-expired' },
  cancelled: { label: 'Đã hủy',       cls: 'sp-status-cancelled' },
};
const TIER_BADGE = { bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎' };
const TIER_COLOR = { bronze: '#cd7f32', silver: '#adb5bd', gold: '#f2b84b', diamond: '#3de0ff' };

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}
function getDiscountPct(n) {
  return DISCOUNT_TIERS.find(t => n >= t.min && n <= t.max)?.pct || 0;
}
function getDiscountLabel(n) {
  return DISCOUNT_TIERS.find(t => n >= t.min && n <= t.max)?.label || '';
}

function SlotMeter({ total, remaining }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div className="sp-meter-wrap">
      <div className="sp-meter-bar">
        <div className="sp-meter-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span>{remaining}/{total} lần còn lại</span>
    </div>
  );
}

function PackCard({ pack }) {
  const status = STATUS_LABELS[pack.status] || { label: pack.status, cls: '' };
  const pkg    = pack.packageId;
  const branch = pack.branchId;
  return (
    <div className={`sp-pack-card ${pack.status !== 'active' ? 'sp-pack-dimmed' : ''}`}>
      <div className="sp-pack-header">
        <div>
          <div className="sp-pack-code">{pack.packCode}</div>
          <div className="sp-pack-name">{pkg?.name || 'Gói dịch vụ'}</div>
          <div className="sp-pack-branch">📍 {branch?.name || ''}</div>
        </div>
        <div className="sp-pack-right">
          <span className={`sp-status-pill ${status.cls}`}>{status.label}</span>
          {pack.discountPercent > 0 && <span className="sp-discount-badge">-{pack.discountPercent}%</span>}
        </div>
      </div>
      <SlotMeter total={pack.totalSlots} remaining={pack.remainingSlots} />
      <div className="sp-pack-meta">
        <div><small>Giá gói</small><strong>{formatCurrency(pack.finalPriceAfterVoucher ?? pack.finalPrice)}</strong></div>
        <div><small>Đã dùng</small><strong>{pack.usedSlots} lần</strong></div>
        {pack.expiresAt && <div><small>Hết hạn</small><strong>{new Date(pack.expiresAt).toLocaleDateString('vi-VN')}</strong></div>}
        <div><small>Thanh toán</small>
          <strong className={pack.paymentStatus === 'paid' ? 'sp-paid' : 'sp-unpaid'}>
            {pack.paymentStatus === 'paid' ? '✓ Đã TT' : '⏳ Chờ TT'}
          </strong>
        </div>
      </div>
      {pack.voucherCode && (
        <div className="sp-voucher-tag">🏷 {pack.voucherCode} — tiết kiệm thêm {formatCurrency(pack.voucherDiscount)}</div>
      )}
    </div>
  );
}

export default function SlotPackFlow({ user, vehicles: userVehicles = [], apiBase, token }) {
  const [tab, setTab] = useState('buy');

  // ─── Buy state ───────────────────────────────────────────────────────────────
  const [branches, setBranches] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedBranch, setSelectedBranch]   = useState('');  // STEP 1 — phải chọn trước
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [slotCount, setSlotCount]   = useState(5);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyResult, setBuyResult]   = useState(null);
  const [buyError, setBuyError]     = useState('');

  // ─── My packs ────────────────────────────────────────────────────────────────
  const [myPacks, setMyPacks]       = useState([]);
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
        const pRes = await fetch(`${apiBase}/packages?branchId=${selectedBranch}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pData = await pRes.json();
        const pList = (pData?.data || pData || []).filter(p => p.status === 'active').map(p => ({ ...p, id: p._id || p.id }));
        setPackages(Array.isArray(pList) ? pList : []);
        if (pList.length > 0 && !pList.find(p => p.id === selectedPackage)) {
          setSelectedPackage(pList[0].id);
        }
      } catch (e) { console.error(e); }
    }
    loadPackages();
  }, [selectedBranch, apiBase, token]);

  useEffect(() => {
    if (!selectedVehicle && userVehicles[0]) {
      setSelectedVehicle(userVehicles[0]._id || userVehicles[0].id || '');
    }
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

  // Voucher discount áp thêm lên baseTotal
  const voucherSavings = (() => {
    if (!appliedVoucher || !baseTotal) return 0;
    if (appliedVoucher.type === 'percentage') {
      const d = Math.floor(baseTotal * appliedVoucher.value / 100);
      return appliedVoucher.maxDiscount > 0 ? Math.min(d, appliedVoucher.maxDiscount) : d;
    }
    return Math.min(appliedVoucher.value || 0, baseTotal);
  })();
  const finalTotal = Math.max(0, baseTotal - voucherSavings);

  async function handleBuy() {
    if (!selectedBranch || !selectedVehicle || !selectedPackage) {
      setBuyError('Vui lòng chọn đủ cấu hình gói lượt (chi nhánh, xe, gói dịch vụ).');
      return;
    }
    setBuyLoading(true);
    setBuyError('');
    setBuyResult(null);
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
    } catch (err) {
      setBuyError(err.message);
    } finally {
      setBuyLoading(false);
    }
  }

  const tierColor = TIER_COLOR[user?.tier] || '#adb5bd';

  return (
    <div className="sp-wrapper">
      {/* Header */}
      <div className="rb-header">
        <div>
          <div className="aw-section-kicker">🎫 GÓI SLOT RỬA XE</div>
          <h2 className="rb-title">Mua trước — Dùng dần</h2>
          <p className="rb-sub">Chọn chi nhánh → mua gói nhiều lần, nhận chiết khấu hấp dẫn.</p>
        </div>
        <div className="rb-tier-badge" style={{ borderColor: tierColor, color: tierColor }}>
          {TIER_BADGE[user?.tier] || '🥉'} {(user?.tier || 'bronze').toUpperCase()}
          <small>Ưu tiên phục vụ cao hơn</small>
        </div>
      </div>

      {/* Tabs */}
      <div className="sp-tabs">
        <button type="button" className={tab === 'buy' ? 'sp-tab active' : 'sp-tab'} onClick={() => setTab('buy')}>
          🛒 Mua Gói Mới
        </button>
        <button type="button" className={tab === 'my' ? 'sp-tab active' : 'sp-tab'} onClick={() => setTab('my')}>
          📦 Gói Của Tôi {myPacks.filter(p => p.status === 'active').length > 0 && `(${myPacks.filter(p => p.status === 'active').length})`}
        </button>
      </div>

      {/* ─── Tab Buy ─────────────────────────────────────────────────── */}
      {tab === 'buy' && (
        <>
          {/* Discount banner */}
          <div className="sp-discount-banner">
            {DISCOUNT_TIERS.map(t => (
              <div key={t.pct} className={`sp-tier-item ${slotCount >= t.min && slotCount <= t.max ? 'sp-tier-active' : ''}`}>
                <span className="sp-tier-range">{t.min === 20 ? '20+' : `${t.min}–${t.max}`} lần</span>
                <strong className="sp-tier-pct">{t.pct > 0 ? `-${t.pct}%` : 'Gốc'}</strong>
                <small>{t.label}</small>
              </div>
            ))}
          </div>

          {(user?.tier === 'diamond' || user?.tier === 'gold') && (
            <div style={{ padding: '12px 16px', background: 'linear-gradient(90deg, #fffbeb, #fef3c7)', borderRadius: '8px', borderLeft: '4px solid #f59e0b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>👑</span>
              <div>
                <strong style={{ display: 'block', color: '#92400e', marginBottom: '4px' }}>Đặc quyền Hạng {user.tier.toUpperCase()}</strong>
                <span style={{ color: '#b45309', fontSize: '0.9rem' }}>Bạn được giảm thêm <strong>+{user.tier === 'diamond' ? '10%' : '5%'}</strong> đè lên mức giảm số lượng gốc! Tự động áp dụng khi thanh toán.</span>
              </div>
            </div>
          )}

          {/* ─── STEP 1: Chọn địa điểm TRƯỚC ──────────────────────── */}
          <article className="aw-card-section loc-section">
            <div className="aw-step-title loc-title">
              <span>📍</span> BƯỚC 1: CHỌN CHI NHÁNH
              {selectedBranch && <span className="loc-selected-name"> — {branchObj?.name}</span>}
            </div>
            <div className="loc-branches-grid">
              <button type="button"
                className={'ALL' === selectedBranch ? 'loc-branch-card active' : 'loc-branch-card'}
                onClick={() => setSelectedBranch('ALL')}>
                <div className="loc-branch-icon">🌍</div>
                <div className="loc-branch-body">
                  <strong>Áp dụng toàn hệ thống</strong>
                  <p>Có thể dùng ở bất kỳ chi nhánh nào</p>
                </div>
                {'ALL' === selectedBranch && <div className="loc-check">✓</div>}
              </button>
              {branches.length === 0 ? (
                <div className="aw-empty-state">Đang tải chi nhánh...</div>
              ) : branches.map(b => (
                <button key={b.id} type="button"
                  className={b.id === selectedBranch ? 'loc-branch-card active' : 'loc-branch-card'}
                  onClick={() => setSelectedBranch(b.id)}>
                  <div className="loc-branch-icon">🏪</div>
                  <div className="loc-branch-body">
                    <strong>{b.name}</strong>
                    <p>{b.address}</p>
                    {b.openingTime && <span className="loc-branch-hours">⏰ {b.openingTime} – {b.closingTime}</span>}
                  </div>
                  {b.id === selectedBranch && <div className="loc-check">✓</div>}
                </button>
              ))}
            </div>
          </article>

          {!selectedBranch && (
            <div className="rb-pick-branch-hint">
              👆 Vui lòng chọn chi nhánh phía trên để tiến hành mua gói
            </div>
          )}

          {/* Chỉ hiện khi đã chọn chi nhánh */}
          {selectedBranch && (
            <div className="rb-grid">
              <div className="rb-flow">
                {/* Xe */}
                <article className="aw-card-section">
                  <div className="aw-step-title"><span>2</span> CHỌN XE</div>
                  <div className="aw-options two-up">
                    <button type="button"
                      className={'ALL' === selectedVehicle ? 'aw-option active' : 'aw-option'}
                      onClick={() => setSelectedVehicle('ALL')}>
                      <div className="aw-option-head"><strong>Tất cả xe của tôi</strong><span>{'ALL' === selectedVehicle ? '●' : '○'}</span></div>
                      <p>Không khóa cứng vào 1 biển số</p>
                    </button>
                    {userVehicles.length > 0 ? userVehicles.map(v => {
                      const vid = v._id || v.id;
                      const vname = v.name || `${v.brand || ''} ${v.model || ''}`.trim() || v.licensePlate;
                      return (
                        <button key={vid} type="button"
                          className={vid === selectedVehicle ? 'aw-option active' : 'aw-option'}
                          onClick={() => setSelectedVehicle(vid)}>
                          <div className="aw-option-head"><strong>{vname}</strong><span>{vid === selectedVehicle ? '●' : '○'}</span></div>
                          <p>{v.licensePlate || v.plate}</p>
                        </button>
                      );
                    }) : <div className="aw-empty-state"><strong>Chưa có xe.</strong></div>}
                  </div>
                </article>

                {/* Gói dịch vụ */}
                <article className="aw-card-section">
                  <div className="aw-step-title"><span>3</span> GÓI DỊCH VỤ</div>
                  <div className="aw-options stacked scrollable" style={{ maxHeight: 240 }}>
                    {packages.map(p => (
                      <button key={p.id} type="button"
                        className={p.id === selectedPackage ? 'aw-option aw-service active' : 'aw-option aw-service'}
                        onClick={() => setSelectedPackage(p.id)}>
                        <div className="aw-option-head service-head">
                          <div><strong>{p.name}</strong><small>{p.duration} phút</small></div>
                          <span>{formatCurrency(p.price)} / lần</span>
                        </div>
                        <p>{p.description}</p>
                      </button>
                    ))}
                  </div>
                </article>

                {/* Số lượng */}
                <article className="aw-card-section">
                  <div className="aw-step-title"><span>4</span> SỐ LẦN RỬA XE</div>
                  <div className="sp-slot-selector">
                    <button type="button" className="sp-slot-btn" onClick={() => setSlotCount(n => Math.max(1, n - 1))}>−</button>
                    <div className="sp-slot-display"><strong>{slotCount}</strong><span>lần</span></div>
                    <button type="button" className="sp-slot-btn" onClick={() => setSlotCount(n => Math.min(50, n + 1))}>+</button>
                  </div>
                  <div className="sp-quick-slots">
                    {[1, 3, 5, 10, 15, 20].map(n => (
                      <button key={n} type="button"
                        className={n === slotCount ? 'sp-quick-btn active' : 'sp-quick-btn'}
                        onClick={() => setSlotCount(n)}>
                        {n}x
                        {getDiscountPct(n) > 0 && <span className="sp-quick-save">-{getDiscountPct(n)}%</span>}
                      </button>
                    ))}
                  </div>
                  {discountPct > 0 && (
                    <div className="sp-discount-hint">
                      🎉 Chiết khấu số lượng: <strong style={{ color: '#10b981' }}>{discountPct}%</strong> — {getDiscountLabel(slotCount)}!
                    </div>
                  )}
                </article>

                {/* Voucher */}
                <article className="aw-card-section" style={{ padding: 0 }}>
                  <VoucherPicker
                    apiBase={apiBase}
                    token={token}
                    selected={appliedVoucher}
                    onSelect={setAppliedVoucher}
                    orderAmount={baseTotal}
                  />
                </article>
              </div>

              {/* Summary */}
              <aside className="aw-summary">
                <div className="aw-summary-card">
                  <div className="aw-summary-title">TÓM TẮT GÓI SLOT</div>

                  <div className="aw-summary-row">
                    <span>Chi nhánh:</span><strong>{branchObj?.name || '—'}</strong>
                  </div>
                  <div className="aw-summary-row">
                    <span>Gói dịch vụ:</span><strong>{pkg?.name || '—'}</strong>
                  </div>
                  <div className="aw-summary-row">
                    <span>Giá mỗi lần:</span><strong>{pkg ? formatCurrency(pkg.price) : '—'}</strong>
                  </div>
                  <div className="aw-summary-row">
                    <span>Số lần:</span><strong style={{ color: '#3de0ff' }}>{slotCount} lần</strong>
                  </div>

                  <div className="aw-summary-divider" />

                  <div className="aw-summary-row">
                    <span>Tổng gốc:</span><strong>{formatCurrency(gross)}</strong>
                  </div>
                  {discountPct > 0 && (
                    <div className="aw-summary-row">
                      <span>Chiết khấu SL (-{discountPct}%):</span>
                      <strong style={{ color: '#10b981' }}>−{formatCurrency(qtyDiscount)}</strong>
                    </div>
                  )}
                  {voucherSavings > 0 && (
                    <div className="aw-summary-row">
                      <span>Voucher ({appliedVoucher?.code}):</span>
                      <strong style={{ color: '#10b981' }}>−{formatCurrency(voucherSavings)}</strong>
                    </div>
                  )}

                  <div className="aw-pricing">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span>TỔNG THANH TOÁN</span>
                      <strong style={{ fontSize: '1.3rem', color: '#ffb86b' }}>{formatCurrency(finalTotal)}</strong>
                    </div>
                  </div>

                  {(discountPct > 0 || voucherSavings > 0) && (
                    <div className="sp-save-tag">
                      🎉 Tiết kiệm: {formatCurrency(qtyDiscount + voucherSavings)}
                      {discountPct > 0 && ` (${discountPct}% SL`}
                      {voucherSavings > 0 && (discountPct > 0 ? ' + voucher)' : ' (voucher)')}
                    </div>
                  )}

                  {buyError && <div className="rb-error">{buyError}</div>}

                  {buyResult && (
                    <div className="rb-result">
                      <div className="rb-result-ok">✓ Đã mua gói thành công!</div>
                      <div className="sp-pack-code-display">Mã gói: <strong>{buyResult.packCode}</strong></div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 6 }}>
                        Đưa mã này cho nhân viên khi đến rửa xe.
                      </div>
                    </div>
                  )}

                  <button className="aw-confirm" type="button" onClick={handleBuy}
                    disabled={buyLoading || !pkg || !selectedBranch}>
                    {buyLoading ? 'ĐANG TẠO GÓI...' : `MUA ${slotCount} LẦN — ${formatCurrency(finalTotal)}`}
                  </button>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* ─── Tab My Packs ──────────────────────────────────────────── */}
      {tab === 'my' && (
        <div className="sp-my-packs">
          {packsLoading ? (
            <div className="aw-empty-state">Đang tải gói của bạn...</div>
          ) : myPacks.length === 0 ? (
            <div className="aw-empty-state">
              <strong>Chưa có gói slot nào.</strong>
              <p>Mua gói để sử dụng dịch vụ linh hoạt hơn.</p>
            </div>
          ) : (
            <div className="sp-packs-grid">
              {myPacks.map(p => <PackCard key={p._id} pack={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
