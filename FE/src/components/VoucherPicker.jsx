import React, { useEffect, useState, useCallback } from 'react';

// ─── Tier visuals ─────────────────────────────────────────────────────────────
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
    <button
      type="button"
      onClick={() => !isDisabled && onSelect(isSelected ? null : voucher)}
      disabled={isDisabled}
      className={[
        'vc-card',
        isSelected   ? 'vc-card-selected'  : '',
        isDisabled   ? 'vc-card-disabled'  : '',
        needsPoints  ? 'vc-card-points'    : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="vc-card-top">
        <div className="vc-card-code">{voucher.code}</div>
        <div className="vc-card-discount">{discountText}</div>
      </div>
      <div className="vc-card-name">{voucher.name}</div>
      {voucher.description && <div className="vc-card-desc">{voucher.description}</div>}
      <div className="vc-card-meta">
        {voucher.minOrder > 0 && (
          <span className={meetsMinOrder ? 'vc-points-ok' : 'vc-points-nok'}>
            {meetsMinOrder ? '✓' : '✗'} Đơn tối thiểu: {formatCurrency(voucher.minOrder)}
          </span>
        )}
        {needsPoints && (
          <span className={canAfford ? 'vc-points-ok' : 'vc-points-nok'}>
            {canAfford ? '✓' : '✗'} {voucher.requiredPoints} điểm
            {!canAfford && ` (còn thiếu ${voucher.requiredPoints - (userPoints || 0)}đ)`}
          </span>
        )}
        {voucher.remaining > 0 && <span>Còn {voucher.remaining} lượt</span>}
      </div>
      {isSelected && <div className="vc-selected-badge">✓ Đang chọn</div>}
    </button>
  );
}

/**
 * VoucherPicker
 * Props:
 *   apiBase, token    — API config
 *   selected          — voucher object hiện tại (hoặc null)
 *   onSelect(v|null)  — callback khi chọn/bỏ chọn
 *   orderAmount       — giá trị đơn hàng để preview tiết kiệm
 *   compact           — chỉ hiện input manual + danh sách rút gọn
 */
export default function VoucherPicker({ apiBase, token, selected, onSelect, orderAmount = 0, compact = false }) {
  const [data, setData]         = useState(null); // { user, tier_exclusive, public, redeemable }
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualMsg, setManualMsg]   = useState('');
  const [activeTab, setActiveTab]   = useState('public'); // 'public' | 'tier' | 'points'
  const [open, setOpen]         = useState(!compact);     // rút gọn hay mở

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/vouchers/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không tải được voucher');
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => { load(); }, [load]);

  async function applyManual() {
    const code = manualCode.trim().toUpperCase();
    if (!code) { setManualMsg('Nhập mã coupon để áp dụng.'); return; }
    try {
      const res = await fetch(`${apiBase}/vouchers/code/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Mã không hợp lệ');
      onSelect(json.data);
      setManualMsg('✓ Đã áp dụng mã coupon!');
    } catch (e) {
      onSelect(null);
      setManualMsg(e.message);
    }
  }

  async function handleSelectVoucher(voucher) {
    if (!voucher) {
      onSelect(null);
      return;
    }
    const needsPoints = voucher.requiredPoints > 0;
    if (needsPoints && voucher.isTemplate) {
      if (!window.confirm(`Bạn có chắc chắn muốn dùng ${voucher.requiredPoints} điểm để đổi lấy mã: ${voucher.name}?`)) {
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/vouchers/redeem-points`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ templateId: voucher._id })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Lỗi đổi điểm');
        
        const realVoucher = json.data;
        onSelect(realVoucher);
        window.alert(`Đổi điểm thành công! Mã của bạn là: ${realVoucher.code}`);
        load(); // Reload to update points and vouchers list
      } catch (e) {
        window.alert(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      onSelect(voucher);
    }
  }

  // Tính preview discount
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
  const userTier   = data?.user?.tier || 'bronze';
  const tierMeta   = TIER_META[userTier] || TIER_META.bronze;

  const tierCount = (data?.tier_exclusive || []).length;
  const pubCount  = (data?.public || []).length;
  const ptsCount  = (data?.redeemable || []).length;

  return (
    <div className="vc-wrapper">
      {/* Header toggle */}
      <div className="vc-header" onClick={() => setOpen(p => !p)} role="button" tabIndex={0}
           onKeyDown={e => e.key === 'Enter' && setOpen(p => !p)}>
        <div className="vc-header-left">
          <span className="vc-header-icon">🏷</span>
          <div>
            <strong>VOUCHER & ƯU ĐÃI</strong>
            {selected ? (
              <div className="vc-selected-summary">
                Đang dùng: <strong style={{ color: '#10b981' }}>{selected.code}</strong>
                {savings > 0 && <span> — Tiết kiệm {formatCurrency(savings)}</span>}
              </div>
            ) : (
              <div className="vc-hint">Chọn voucher để tiết kiệm thêm</div>
            )}
          </div>
        </div>
        <div className="vc-header-right">
          <div className="vc-tier-pill" style={{ borderColor: tierMeta.color, color: tierMeta.color, background: tierMeta.bg }}>
            {tierMeta.icon} {tierMeta.label}
          </div>
          <div className="vc-points-pill">
            ⭐ {userPoints.toLocaleString('vi-VN')} điểm
          </div>
          <span className="vc-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="vc-body">
          {/* Manual input */}
          <div className="vc-manual-row">
            <input
              className="vc-manual-input"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && applyManual()}
              placeholder="NHẬP MÃ COUPON THỦ CÔNG..."
            />
            <button className="vc-manual-btn" type="button" onClick={applyManual}>Áp dụng</button>
            {selected && (
              <button className="vc-clear-btn" type="button" onClick={() => { onSelect(null); setManualMsg(''); }}>
                ✕ Xóa
              </button>
            )}
          </div>
          {manualMsg && (
            <div className={manualMsg.startsWith('✓') ? 'vc-msg ok' : 'vc-msg err'}>{manualMsg}</div>
          )}

          {loading && <div className="vc-loading">Đang tải voucher...</div>}
          {error   && <div className="vc-msg err">{error} <button type="button" onClick={load}>Thử lại</button></div>}

          {data && (
            <>
              {/* Tabs */}
              <div className="vc-tabs">
                <button type="button" className={activeTab === 'public' ? 'vc-tab active' : 'vc-tab'} onClick={() => setActiveTab('public')}>
                  🎫 Công khai {pubCount > 0 && <span className="vc-badge">{pubCount}</span>}
                </button>
                {tierCount > 0 && (
                  <button type="button" className={activeTab === 'tier' ? 'vc-tab active' : 'vc-tab'} onClick={() => setActiveTab('tier')}>
                    {tierMeta.icon} Hạng {tierMeta.label} {tierCount > 0 && <span className="vc-badge" style={{ background: tierMeta.color }}>{tierCount}</span>}
                  </button>
                )}
                <button type="button" className={activeTab === 'points' ? 'vc-tab active' : 'vc-tab'} onClick={() => setActiveTab('points')}>
                  ⭐ Đổi điểm {ptsCount > 0 && <span className="vc-badge">{ptsCount}</span>}
                </button>
              </div>

              {/* Public vouchers */}
              {activeTab === 'public' && (
                <div className="vc-list">
                  {pubCount === 0 ? (
                    <div className="vc-empty">Không có voucher công khai nào ngay bây giờ.</div>
                  ) : (
                    data.public.map(v => (
                      <VoucherCard key={v._id} voucher={v} onSelect={handleSelectVoucher} selected={selected} userPoints={userPoints} orderAmount={orderAmount} />
                    ))
                  )}
                </div>
              )}

              {/* Tier exclusive */}
              {activeTab === 'tier' && (
                <div className="vc-list">
                  {tierCount === 0 ? (
                    <div className="vc-empty">
                      Không có voucher đặc quyền cho hạng <strong>{tierMeta.label}</strong> ngay bây giờ.
                    </div>
                  ) : (
                    <>
                      <div className="vc-tier-banner" style={{ borderColor: tierMeta.color, background: tierMeta.bg }}>
                        {tierMeta.icon} Ưu đãi đặc quyền dành riêng cho thành viên <strong>{tierMeta.label}</strong>
                      </div>
                      {data.tier_exclusive.map(v => (
                        <VoucherCard key={v._id} voucher={v} onSelect={handleSelectVoucher} selected={selected} userPoints={userPoints} orderAmount={orderAmount} />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Redeemable (đổi điểm) */}
              {activeTab === 'points' && (
                <div className="vc-list">
                  <div className="vc-points-header">
                    <span>Số điểm hiện có: <strong style={{ color: '#fbbf24' }}>{userPoints.toLocaleString('vi-VN')} điểm</strong></span>
                    <small>Chọn để đổi điểm lấy mã giảm giá</small>
                  </div>
                  {ptsCount === 0 ? (
                    <div className="vc-empty">Không có mẫu đổi điểm nào khả dụng.</div>
                  ) : (
                    data.redeemable.map(v => (
                      <VoucherCard key={v._id} voucher={v} onSelect={handleSelectVoucher} selected={selected} userPoints={userPoints} orderAmount={orderAmount} />
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* Preview nếu đã chọn */}
          {selected && savings > 0 && (
            <div className="vc-preview-bar">
              <span>🎉 Đang tiết kiệm:</span>
              <strong style={{ color: '#10b981' }}>{formatCurrency(savings)}</strong>
              {orderAmount > 0 && (
                <span className="vc-final">→ Còn {formatCurrency(Math.max(0, orderAmount - savings))}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
