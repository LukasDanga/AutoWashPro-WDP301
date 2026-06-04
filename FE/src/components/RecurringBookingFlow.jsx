import React, { useEffect, useMemo, useState } from 'react';

const WEEKDAYS = [
  { value: 1, label: 'T2', full: 'Thứ 2' },
  { value: 2, label: 'T3', full: 'Thứ 3' },
  { value: 3, label: 'T4', full: 'Thứ 4' },
  { value: 4, label: 'T5', full: 'Thứ 5' },
  { value: 5, label: 'T6', full: 'Thứ 6' },
  { value: 6, label: 'T7', full: 'Thứ 7' },
  { value: 0, label: 'CN', full: 'Chủ Nhật' },
];

const WEEKS_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00',
];

const TIER_BADGE = { bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold', diamond: '💎 Diamond' };
const TIER_COLOR = { bronze: '#cd7f32', silver: '#adb5bd', gold: '#f2b84b', diamond: '#3de0ff' };

function formatCurrency(v) {
  return `${new Intl.NumberFormat('vi-VN').format(v)}đ`;
}

/** Preview ngày sẽ được đặt dựa theo weekdays + weeks */
function buildPreviewDates(weekdays, weeks) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const c = new Date(today);
      c.setDate(today.getDate() + w * 7 + d);
      if (weekdays.includes(c.getDay()) && c >= today) {
        dates.push(c);
      }
    }
  }
  return dates;
}

export default function RecurringBookingFlow({ user, vehicles: userVehicles = [], apiBase, token }) {
  const [branches, setBranches] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [couponCode, setCouponCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [bRes, pRes] = await Promise.all([
          fetch(`${apiBase}/branches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBase}/packages`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const bData = await bRes.json();
        const pData = await pRes.json();
        const bList = (Array.isArray(bData?.data) ? bData.data : bData?.data || []).map(b => ({ ...b, id: b._id || b.id }));
        const pList = (Array.isArray(pData?.data) ? pData.data : pData?.data || []).map(p => ({ ...p, id: p._id || p.id }));
        setBranches(bList);
        setPackages(pList.filter(p => p.status === 'active'));
        if (bList[0]) setSelectedBranch(bList[0].id);
        if (pList[0]) setSelectedPackage(pList[0].id);
      } catch (e) { console.error(e); }
    }
    if (token) load();
  }, [apiBase, token]);

  useEffect(() => {
    if (!selectedVehicle && userVehicles[0]) {
      setSelectedVehicle(userVehicles[0]._id || userVehicles[0].id || '');
    }
  }, [userVehicles, selectedVehicle]);

  const pkg = packages.find(p => p.id === selectedPackage);
  const previewDates = useMemo(() => buildPreviewDates(selectedWeekdays, weeks), [selectedWeekdays, weeks]);
  const discountAmount = appliedVoucher?.savings || 0;
  const pricePerSession = pkg ? Math.max(0, pkg.price - discountAmount) : 0;

  function toggleWeekday(v) {
    setSelectedWeekdays(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponMsg('Nhập mã coupon để áp dụng.'); return; }
    try {
      const res = await fetch(`${apiBase}/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, bookingData: { packageId: selectedPackage, branchId: selectedBranch, amount: pkg?.price || 0 } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Mã không hợp lệ');
      setAppliedVoucher(data.data);
      setCouponMsg(`✓ Giảm ${formatCurrency(data.data.savings)} mỗi lần`);
    } catch (err) {
      setAppliedVoucher(null);
      setCouponMsg(err.message);
    }
  }

  async function handleSubmit() {
    if (!selectedBranch || !selectedVehicle || !selectedPackage || selectedWeekdays.length === 0 || !selectedTime) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/bookings/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          branchId: selectedBranch,
          vehicleId: selectedVehicle,
          packageId: selectedPackage,
          weekdays: selectedWeekdays,
          startTime: selectedTime,
          weeks,
          voucherCode: couponCode.trim().toUpperCase() || undefined,
          note: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo lịch định kỳ');
      setResult(data.data || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const tierColor = TIER_COLOR[user?.tier] || '#adb5bd';

  return (
    <div className="rb-wrapper">
      {/* Header */}
      <div className="rb-header">
        <div>
          <div className="aw-section-kicker">📅 BOOKING ĐỊNH KỲ</div>
          <h2 className="rb-title">Đặt lịch lặp lại hằng tuần</h2>
          <p className="rb-sub">Chọn ngày trong tuần + khung giờ cố định, hệ thống tự tạo tất cả lịch hẹn.</p>
        </div>
        <div className="rb-tier-badge" style={{ borderColor: tierColor, color: tierColor }}>
          {TIER_BADGE[user?.tier] || '🥉 Bronze'}
          <small>Ưu tiên phục vụ</small>
        </div>
      </div>

      <div className="rb-grid">
        {/* Left flow */}
        <div className="rb-flow">
          {/* Step 1: Chi nhánh */}
          <article className="aw-card-section">
            <div className="aw-step-title"><span>1</span> CHỌN CHI NHÁNH</div>
            <div className="aw-options two-up">
              {branches.map(b => (
                <button key={b.id} type="button"
                  className={b.id === selectedBranch ? 'aw-option active' : 'aw-option'}
                  onClick={() => setSelectedBranch(b.id)}>
                  <div className="aw-option-head"><strong>{b.name}</strong><span>{b.id === selectedBranch ? '●' : '○'}</span></div>
                  <p>{b.address}</p>
                </button>
              ))}
            </div>
          </article>

          {/* Step 2: Xe */}
          <article className="aw-card-section">
            <div className="aw-step-title"><span>2</span> CHỌN XE</div>
            <div className="aw-options two-up">
              {userVehicles.length > 0 ? userVehicles.map(v => {
                const vid = v._id || v.id;
                const vname = v.name || `${v.brand || ''} ${v.model || ''}`.trim() || v.licensePlate;
                return (
                  <button key={vid} type="button"
                    className={vid === selectedVehicle ? 'aw-option active' : 'aw-option'}
                    onClick={() => setSelectedVehicle(vid)}>
                    <div className="aw-option-head"><strong>{vname}</strong><span>{vid === selectedVehicle ? '●' : '○'}</span></div>
                    <p>{v.licensePlate || v.plate}</p>
                    <small>{v.vehicleType || v.type}</small>
                  </button>
                );
              }) : <div className="aw-empty-state"><strong>Chưa có xe.</strong><p>Thêm xe trong hồ sơ cá nhân.</p></div>}
            </div>
          </article>

          {/* Step 3: Gói dịch vụ */}
          <article className="aw-card-section">
            <div className="aw-step-title"><span>3</span> CHỌN GÓI DỊCH VỤ</div>
            <div className="aw-options stacked scrollable" style={{ maxHeight: 260 }}>
              {packages.map(p => (
                <button key={p.id} type="button"
                  className={p.id === selectedPackage ? 'aw-option aw-service active' : 'aw-option aw-service'}
                  onClick={() => setSelectedPackage(p.id)}>
                  <div className="aw-option-head service-head">
                    <div><strong>{p.name}</strong><small>{p.duration} phút</small></div>
                    <span>{formatCurrency(p.price)}</span>
                  </div>
                  <p>{p.description}</p>
                </button>
              ))}
            </div>
          </article>

          {/* Step 4: Ngày trong tuần */}
          <article className="aw-card-section">
            <div className="aw-step-title"><span>4</span> CHỌN NGÀY TRONG TUẦN</div>
            <div className="rb-weekdays">
              {WEEKDAYS.map(d => (
                <button key={d.value} type="button"
                  className={selectedWeekdays.includes(d.value) ? 'rb-day active' : 'rb-day'}
                  onClick={() => toggleWeekday(d.value)}>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>

            {/* Step 5: Khung giờ */}
            <div className="aw-slot-title">CHỌN KHUNG GIỜ CỐ ĐỊNH</div>
            <div className="aw-time-grid">
              {TIME_SLOTS.map(t => (
                <button key={t} type="button"
                  className={t === selectedTime ? 'aw-time-card active' : 'aw-time-card'}
                  onClick={() => setSelectedTime(t)}>
                  {t}
                </button>
              ))}
            </div>

            {/* Step 6: Số tuần */}
            <div className="aw-slot-title">SỐ TUẦN LẶP LẠI</div>
            <div className="rb-weeks-grid">
              {WEEKS_OPTIONS.map(w => (
                <button key={w} type="button"
                  className={w === weeks ? 'rb-week-btn active' : 'rb-week-btn'}
                  onClick={() => setWeeks(w)}>
                  {w} tuần
                </button>
              ))}
            </div>
          </article>
        </div>

        {/* Right: Summary */}
        <aside className="aw-summary">
          <div className="aw-summary-card">
            <div className="aw-summary-title">TỔNG KẾT LỊCH ĐỊNH KỲ</div>

            <div className="aw-summary-row">
              <span>Gói dịch vụ:</span>
              <strong>{pkg?.name || '—'}</strong>
            </div>
            <div className="aw-summary-row">
              <span>Ngày trong tuần:</span>
              <strong>{selectedWeekdays.length > 0 ? selectedWeekdays.map(v => WEEKDAYS.find(d => d.value === v)?.label).join(', ') : '—'}</strong>
            </div>
            <div className="aw-summary-row">
              <span>Khung giờ:</span>
              <strong className={selectedTime ? 'is-positive' : 'is-warning'}>{selectedTime || 'Chưa chọn'}</strong>
            </div>
            <div className="aw-summary-row">
              <span>Số tuần:</span>
              <strong>{weeks} tuần</strong>
            </div>
            <div className="aw-summary-row">
              <span>Số lịch dự kiến:</span>
              <strong style={{ color: '#3de0ff' }}>{previewDates.length} buổi</strong>
            </div>

            <div className="aw-summary-divider" />

            {/* Voucher */}
            <label className="aw-summary-label" htmlFor="rb-coupon">COUPON ÁP DỤNG MỖI BUỔI</label>
            <div className="aw-coupon-row">
              <input id="rb-coupon" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="NHẬP MÃ COUPON..." />
              <button type="button" onClick={applyCoupon}>Áp dụng</button>
            </div>
            {couponMsg && <div className="rb-coupon-msg">{couponMsg}</div>}

            <div className="aw-pricing">
              <div>
                <span>GIÁ / BUỔI</span>
                <strong>{pkg ? formatCurrency(pkg.price) : '—'}</strong>
              </div>
              <div>
                <span>TỔNG DỰ KIẾN</span>
                <strong style={{ color: '#ffb86b' }}>{pkg ? formatCurrency(pricePerSession * previewDates.length) : '—'}</strong>
              </div>
            </div>

            {/* Preview dates */}
            {previewDates.length > 0 && (
              <div className="rb-preview">
                <div className="rb-preview-title">📋 LỊCH DỰ KIẾN ({previewDates.length} buổi)</div>
                <div className="rb-preview-list">
                  {previewDates.slice(0, 8).map((d, i) => (
                    <div key={i} className="rb-preview-item">
                      <span>{d.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                      <strong>{d.toLocaleDateString('vi-VN')}</strong>
                    </div>
                  ))}
                  {previewDates.length > 8 && (
                    <div className="rb-preview-more">+{previewDates.length - 8} ngày nữa</div>
                  )}
                </div>
              </div>
            )}

            {error && <div className="rb-error">{error}</div>}

            {result && (
              <div className="rb-result">
                <div className="rb-result-ok">✓ Đã tạo {result.totalCreated} lịch hẹn thành công!</div>
                {result.totalFailed > 0 && (
                  <div className="rb-result-warn">⚠ {result.totalFailed} ngày bị bỏ qua do conflict slot</div>
                )}
                {result.failed?.length > 0 && (
                  <div className="rb-result-failed">
                    {result.failed.map((f, i) => <div key={i}>✗ {f.date}: {f.reason}</div>)}
                  </div>
                )}
              </div>
            )}

            <button className="aw-confirm" type="button" onClick={handleSubmit} disabled={loading || previewDates.length === 0}>
              {loading ? 'ĐANG TẠO LỊCH...' : `XÁC NHẬN ${previewDates.length} BUỔI ĐỊNH KỲ`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
