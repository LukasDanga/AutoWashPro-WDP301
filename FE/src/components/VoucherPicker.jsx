import React, { useEffect, useState, useCallback } from 'react';
import { confirmDialog } from '@/lib/confirm';

const TIER_META = {
  bronze:  { icon: '🥉', label: 'Bronze',  color: '#cd7f32', bg: 'rgba(205,127,50,0.12)' },
  silver:  { icon: '🥈', label: 'Silver',  color: '#adb5bd', bg: 'rgba(173,181,189,0.12)' },
  gold:    { icon: '🥇', label: 'Gold',    color: '#f2b84b', bg: 'rgba(242,184,75,0.12)' },
  diamond: { icon: '💎', label: 'Diamond', color: '#3de0ff', bg: 'rgba(61,224,255,0.12)' },
};

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

function VoucherCard({ voucher, onSelect, selected, disabled, userPoints, orderAmount }) {
  const needsPoints  = voucher.requiredPoints > 0;
  const canAfford    = !needsPoints || (userPoints || 0) >= voucher.requiredPoints;
  const meetsMinOrder = !orderAmount || orderAmount >= voucher.minOrder;
  const isDisabled   = disabled || (needsPoints && !canAfford) || !meetsMinOrder;
  const isSelected   = selected?.code === voucher.code;
  const discountText = voucher.type === 'percentage'
    ? `-${voucher.value}%${voucher.maxDiscount ? ` (tối đa ${formatCurrency(voucher.maxDiscount)})` : ''}`
    : `-${formatCurrency(voucher.value)}`;

  return (
    <button type="button"
      onClick={() => !isDisabled && onSelect(isSelected ? null : voucher)}
      disabled={isDisabled}
      className={`vc-card ${isSelected ? 'vc-card-selected' : ''} ${isDisabled ? 'vc-card-disabled' : ''} ${needsPoints ? 'vc-card-points' : ''}`}
      style={{
        borderColor: isSelected ? '#10b981' : (isDisabled ? 'rgba(148,163,184,0.2)' : 'rgba(16,185,129,0.15)'),
        background: isSelected ? 'rgba(16,185,129,0.04)' : '#fff',
      }}>
      <div className="vc-card-top">
        <div className="vc-card-code">{voucher.code}</div>
        <div className="vc-card-discount" style={{ color: '#10b981' }}>{discountText}</div>
      </div>
      <div className="vc-card-name">{voucher.name}</div>
      {voucher.description && <div className="vc-card-desc">{voucher.description}</div>}
      <div className="vc-card-meta">
        {voucher.minOrder > 0 && <span className={meetsMinOrder ? 'vc-points-ok' : 'vc-points-nok'}>{meetsMinOrder ? '✓' : '✗'} Đơn tối thiểu: {formatCurrency(voucher.minOrder)}</span>}
        {needsPoints && <span className={canAfford ? 'vc-points-ok' : 'vc-points-nok'}>{canAfford ? '✓' : '✗'} {voucher.requiredPoints} điểm{!canAfford && ` (còn thiếu ${voucher.requiredPoints - (userPoints || 0)}đ)`}</span>}
        {voucher.remaining > 0 && <span>Còn {voucher.remaining} lượt</span>}
      </div>
      {isSelected && <div className="vc-selected-badge" style={{ background: '#10b981', color: '#fff' }}>✓ Đang chọn</div>}
    </button>
  );
}

export default function VoucherPicker({ apiBase, token, selected, onSelect, orderAmount = 0, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [activeTab, setActiveTab] = useState('public');
  const [open, setOpen] = useState(!compact);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiBase}/vouchers/available`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không tải được voucher');
      setData(json.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [apiBase, token]);

  useEffect(() => { load(); }, [load]);

  async function applyManual() {
    const code = manualCode.trim().toUpperCase();
    if (!code) { setManualMsg('Nhập mã coupon để áp dụng.'); return; }
    try {
      const res = await fetch(`${apiBase}/vouchers/code/${code}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Mã không hợp lệ');
      onSelect(json.data);
      setManualMsg('✓ Đã áp dụng mã coupon!');
    } catch (e) { onSelect(null); setManualMsg(e.message); }
  }

  async function handleSelectVoucher(voucher) {
    if (!voucher) { onSelect(null); return; }
    const needsPoints = voucher.requiredPoints > 0;
    if (needsPoints && voucher.isTemplate) {
      if (!(await confirmDialog({ title: 'Đổi điểm lấy voucher', message: `Dùng ${voucher.requiredPoints} điểm để đổi lấy mã "${voucher.name}"?`, confirmLabel: 'Đổi điểm' }))) return;
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/vouchers/redeem-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ templateId: voucher._id })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Lỗi đổi điểm');
        const realVoucher = json.data;
        onSelect(realVoucher);
        window.alert(`Đổi điểm thành công! Mã của bạn là: ${realVoucher.code}`);
        load();
      } catch (e) { window.alert(e.message); }
      finally { setLoading(false); }
    } else { onSelect(voucher); }
  }

  const previewDiscount = () => {
    if (!selected || !orderAmount) return 0;
    if (selected.type === 'percentage') {
      const d = Math.floor(orderAmount * selected.value / 100);
      return selected.maxDiscount > 0 ? Math.min(d, selected.maxDiscount) : d;
    }
    return Math.min(selected.value, orderAmount);
  };

  const savings = previewDiscount();
  const userPoints = data?.user?.loyaltyPoints || 0;
  const userTier = data?.user?.tier || 'bronze';
  const tierMeta = TIER_META[userTier] || TIER_META.bronze;
  const tierCount = (data?.tier_exclusive || []).length;
  const pubCount = (data?.public || []).length;
  const ptsCount = (data?.redeemable || []).length;

  return (
    <div className="vc-wrapper" style={{ borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)', overflow: 'hidden' }}>
      <div className="vc-header" onClick={() => setOpen(p => !p)} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(p => !p)}
        style={{ padding: '12px', cursor: 'pointer', background: 'rgba(16,185,129,0.04)' }}>
        <div className="vc-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="vc-header-icon">🏷</span>
          <div>
            <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>VOUCHER & ƯU ĐÃI</strong>
            {selected ? (
              <div className="vc-selected-summary" style={{ fontSize: '0.8rem' }}>
                Đang dùng: <strong style={{ color: '#10b981' }}>{selected.code}</strong>
                {savings > 0 && <span> — Tiết kiệm {formatCurrency(savings)}</span>}
              </div>
            ) : (
              <div className="vc-hint" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Chọn voucher để tiết kiệm thêm</div>
            )}
          </div>
        </div>
        <div className="vc-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="vc-tier-pill" style={{ borderColor: tierMeta.color, color: tierMeta.color, background: tierMeta.bg, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {tierMeta.icon} {tierMeta.label}
          </div>
          <div className="vc-points-pill" style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            ⭐ {userPoints.toLocaleString('vi-VN')} điểm
          </div>
          <span className="vc-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="vc-body" style={{ padding: '12px' }}>
          <div className="vc-manual-row" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input className="vc-manual-input" value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && applyManual()}
              placeholder="NHẬP MÃ COUPON THỦ CÔNG..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.8rem', outline: 'none' }}
            />
            <button className="vc-manual-btn" type="button" onClick={applyManual}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Áp dụng
            </button>
            {selected && (
              <button className="vc-clear-btn" type="button" onClick={() => { onSelect(null); setManualMsg(''); }}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                ✕ Xóa
              </button>
            )}
          </div>
          {manualMsg && <div className={manualMsg.startsWith('✓') ? 'vc-msg ok' : 'vc-msg err'} style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem', background: manualMsg.startsWith('✓') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: manualMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>{manualMsg}</div>}

          {loading && <div className="vc-loading" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Đang tải voucher...</div>}
          {error && <div className="vc-msg err" style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>{error} <button type="button" onClick={load}>Thử lại</button></div>}

          {data && (
            <>
              <div className="vc-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { id: 'public', label: `🎫 Công khai${pubCount > 0 ? ` (${pubCount})` : ''}` },
                  ...(tierCount > 0 ? [{ id: 'tier', label: `${tierMeta.icon} Hạng ${tierMeta.label}${tierCount > 0 ? ` (${tierCount})` : ''}` }] : []),
                  { id: 'points', label: `⭐ Đổi điểm${ptsCount > 0 ? ` (${ptsCount})` : ''}` },
                ].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      background: activeTab === tab.id ? 'rgba(16,185,129,0.08)' : 'transparent',
                      color: activeTab === tab.id ? '#10b981' : '#64748b',
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'public' && (
                <div className="vc-list">
                  {pubCount === 0 ? <div className="vc-empty" style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>Không có voucher công khai nào.</div>
                  : data.public.map(v => <VoucherCard key={v._id} voucher={v} onSelect={handleSelectVoucher} selected={selected} userPoints={userPoints} orderAmount={orderAmount} />)}
                </div>
              )}

              {activeTab === 'tier' && (
                <div className="vc-list">
                  {tierCount === 0 ? <div className="vc-empty" style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>Không có voucher đặc quyền cho hạng <strong>{tierMeta.label}</strong>.</div>
                  : <>
                      <div className="vc-tier-banner" style={{ borderColor: tierMeta.color, background: tierMeta.bg, padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', fontSize: '0.8rem' }}>
                        {tierMeta.icon} Ưu đãi đặc quyền dành cho <strong>{tierMeta.label}</strong>
                      </div>
                      {data.tier_exclusive.map(v => <VoucherCard key={v._id} voucher={v} onSelect={handleSelectVoucher} selected={selected} userPoints={userPoints} orderAmount={orderAmount} />)}
                    </>}
                </div>
              )}

              {activeTab === 'points' && (
                <div className="vc-list">
                  <div className="vc-points-header" style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', background: 'rgba(16,185,129,0.04)', fontSize: '0.8rem' }}>
                    <span>Số điểm hiện có: <strong style={{ color: '#10b981' }}>{userPoints.toLocaleString('vi-VN')} điểm</strong></span>
                    <small style={{ display: 'block', color: '#94a3b8', marginTop: '4px' }}>Chọn để đổi điểm lấy mã giảm giá</small>
                  </div>
                  {ptsCount === 0 ? <div className="vc-empty" style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>Không có mẫu đổi điểm nào.</div>
                  : data.redeemable.map(v => <VoucherCard key={v._id} voucher={v} onSelect={handleSelectVoucher} selected={selected} userPoints={userPoints} orderAmount={orderAmount} />)}
                </div>
              )}
            </>
          )}

          {selected && savings > 0 && (
            <div className="vc-preview-bar" style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.04)', fontSize: '0.8rem' }}>
              <span>🎉 Đang tiết kiệm:</span>
              <strong style={{ color: '#10b981' }}>{formatCurrency(savings)}</strong>
              {orderAmount > 0 && <span className="vc-final" style={{ marginLeft: '8px' }}>→ Còn {formatCurrency(Math.max(0, orderAmount - savings))}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
