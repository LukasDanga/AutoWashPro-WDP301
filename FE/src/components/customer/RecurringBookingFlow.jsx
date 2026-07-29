import React, { useEffect, useMemo, useState } from 'react';
import VoucherPicker from '../VoucherPicker.jsx';

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
  return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`;
}

function buildPreviewDates(weekdays, weeks) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const c = new Date(today);
      c.setDate(today.getDate() + w * 7 + d);
      if (weekdays.includes(c.getDay()) && c >= today) dates.push(c);
    }
  }
  return dates;
}

export default function RecurringBookingFlow({ user, vehicles: userVehicles = [], apiBase, token }) {
  const [branches, setBranches] = useState([]);
  const [packages, setPackages] = useState([]);

  // ─── Step state ──────────────────────────────────────────────────────────────
  const [selectedBranch, setSelectedBranch] = useState('');    // STEP 1 (must pick first)
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedSubServices, setSelectedSubServices] = useState({});
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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

  const pkg = packages.find(p => p.id === selectedPackage);
  
  // Calculate extra duration and price from subservices
  let extraDuration = 0;
  let extraPrice = 0;
  const currentSubServices = selectedSubServices[selectedPackage] || [];
  if (pkg && pkg.subServices) {
    for (const sub of pkg.subServices) {
      if (currentSubServices.includes(sub.name)) {
        extraDuration += sub.duration || 0;
        extraPrice += sub.price || 0;
      }
    }
  }

  const basePrice = pkg ? pkg.price : 0;
  const totalBase = basePrice + extraPrice;
  const pkgDuration = pkg ? pkg.duration + extraDuration : 0;
  const estimatedTotalSessions = selectedWeekdays.length * weeks;
  
  // Total cost before voucher
  const recurringTotal = totalBase * estimatedTotalSessions;

  const previewDates = useMemo(() => buildPreviewDates(selectedWeekdays, weeks), [selectedWeekdays, weeks]);

  // Tính discount từ VoucherPicker
  const discountPerSession = useMemo(() => {
    if (!appliedVoucher || !pkg) return 0;
    if (appliedVoucher.type === 'percentage') {
      const d = Math.floor(totalBase * appliedVoucher.value / 100);
      return appliedVoucher.maxDiscount > 0 ? Math.min(d, appliedVoucher.maxDiscount) : d;
    }
    return Math.min(appliedVoucher.value || 0, totalBase);
  }, [appliedVoucher, pkg, totalBase]);

  const pricePerSession = Math.max(0, totalBase - discountPerSession);

  let pointMultiplier = 1;
  if (user?.tier === 'diamond') pointMultiplier = 2.0;
  else if (user?.tier === 'gold') pointMultiplier = 1.5;
  else if (user?.tier === 'silver') pointMultiplier = 1.2;

  const pointsPerSession = Math.floor(pricePerSession * 0.05 * pointMultiplier);

  function toggleWeekday(v) {
    setSelectedWeekdays(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  async function handleSubmit() {
    if (!selectedBranch || !selectedVehicle || !selectedPackage || selectedWeekdays.length === 0 || !selectedTime) {
      setError('Vui lòng điền đầy đủ thông tin (chi nhánh, xe, gói, ngày trong tuần, giờ).');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {
        branchId: selectedBranch,
        packageId: selectedPackage,
        vehicleId: selectedVehicle,
        weekdays: selectedWeekdays,
        startTime: selectedTime,
        weeks,
        voucherCode: appliedVoucher?.code || undefined,
        selectedSubServices: currentSubServices,
        note: '',
      };
      const res = await fetch(`${apiBase}/bookings/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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
  const branchObj = branches.find(b => b.id === selectedBranch);

  return (
    <div className="rb-wrapper">
      {/* Header */}
      <div className="rb-header">
        <div>
          <div className="aw-section-kicker">📅 BOOKING ĐỊNH KỲ</div>
          <h2 className="rb-title">Đặt lịch lặp lại hằng tuần</h2>
          <p className="rb-sub">Chọn địa điểm → ngày trong tuần → khung giờ cố định. Hệ thống tự tạo tất cả lịch hẹn.</p>
        </div>
        <div className="rb-tier-badge" style={{ borderColor: tierColor, color: tierColor }}>
          {TIER_BADGE[user?.tier] || '🥉 Bronze'}
          <small>Ưu tiên phục vụ</small>
        </div>
      </div>

      {/* ─── STEP 0: Chọn địa điểm (TRƯỚC TIÊN) ─────────────────────── */}
      <article className="aw-card-section loc-section">
        <div className="aw-step-title loc-title">
          <span>📍</span> BƯỚC 1: CHỌN ĐỊA ĐIỂM CHI NHÁNH
          {selectedBranch && <span className="loc-selected-name"> — {branchObj?.name}</span>}
        </div>
        <div className="loc-branches-grid">
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
                {b.openingTime && (
                  <span className="loc-branch-hours">⏰ {b.openingTime} – {b.closingTime}</span>
                )}
              </div>
              {b.id === selectedBranch && <div className="loc-check">✓</div>}
            </button>
          ))}
        </div>
      </article>

      {/* Chỉ hiện khi đã chọn chi nhánh */}
      {selectedBranch && (
        <div className="rb-grid">
          <div className="rb-flow">
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
              <div className="aw-step-title"><span>3</span> GÓI DỊCH VỤ</div>
              <div className="aw-options stacked scrollable" style={{ maxHeight: 300 }}>
                {packages.map(p => {
                  const isActive = p.id === selectedPackage;
                  return (
                    <div key={p.id} className={isActive ? 'aw-option aw-service active' : 'aw-option aw-service'}>
                      <button type="button" style={{all: 'unset', width: '100%', cursor: 'pointer'}} onClick={() => setSelectedPackage(p.id)}>
                        <div className="aw-option-head service-head">
                          <div><strong>{p.name}</strong><small>{p.duration} phút</small></div>
                          <span>{formatCurrency(p.price)}</span>
                        </div>
                        <p style={{margin: '8px 0'}}>{p.description}</p>
                      </button>
                      
                      {isActive && p.subServices && p.subServices.length > 0 && (() => {
                        const included = p.subServices.filter(sub => sub.isOptional === false);
                        const optional = p.subServices.filter(sub => sub.isOptional !== false);
                        return (
                          <div style={{ marginTop: '10px', padding: '10px', background: '#f1f5f9', borderRadius: '8px' }}>
                            {included.length > 0 && (
                              <div style={{ marginBottom: optional.length > 0 ? '12px' : 0 }}>
                                <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'block', marginBottom: '8px' }}>Dịch vụ bao gồm:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {included.map(sub => (
                                    <span key={sub.name} style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                                      {sub.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {optional.length > 0 && (
                              <div>
                                <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'block', marginBottom: '8px' }}>Dịch vụ chọn thêm:</strong>
                                {optional.map((sub) => {
                                  const isChecked = (selectedSubServices[p.id] || []).includes(sub.name);
                                  return (
                                    <label key={sub.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setSelectedSubServices(prev => {
                                            const current = prev[p.id] || [];
                                            return {
                                              ...prev,
                                              [p.id]: checked ? [...current, sub.name] : current.filter(x => x !== sub.name)
                                            };
                                          });
                                        }}
                                      />
                                      <span style={{ flex: 1 }}>{sub.name} (+{sub.duration}p)</span>
                                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{sub.price > 0 ? `+${formatCurrency(sub.price)}` : 'Miễn phí'}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </article>

            {/* Step 4: Ngày + giờ + tuần */}
            <article className="aw-card-section">
              <div className="aw-step-title"><span>4</span> LỊCH ĐỊNH KỲ</div>
              <div className="rb-weekdays">
                {WEEKDAYS.map(d => (
                  <button key={d.value} type="button"
                    className={selectedWeekdays.includes(d.value) ? 'rb-day active' : 'rb-day'}
                    onClick={() => toggleWeekday(d.value)}>
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
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

            {/* Step 5: Voucher */}
            <article className="aw-card-section" style={{ padding: 0 }}>
              <VoucherPicker
                apiBase={apiBase}
                token={token}
                selected={appliedVoucher}
                onSelect={setAppliedVoucher}
                orderAmount={totalBase}
              />
            </article>
          </div>

          {/* Right: Summary */}
          <aside className="aw-summary">
            <div className="aw-summary-card">
              <div className="aw-summary-title">TỔNG KẾT ĐỊNH KỲ</div>

              <div className="aw-summary-row">
                <span>Chi nhánh:</span><strong>{branchObj?.name || '—'}</strong>
              </div>
              <div className="aw-summary-row">
                <span>Gói dịch vụ:</span><strong>{pkg?.name || '—'}</strong>
              </div>
              <div className="aw-summary-row">
                <span>Ngày:</span>
                <strong>{selectedWeekdays.length > 0 ? selectedWeekdays.map(v => WEEKDAYS.find(d => d.value === v)?.label).join(', ') : '—'}</strong>
              </div>
              <div className="aw-summary-row">
                <span>Khung giờ:</span>
                <strong className={selectedTime ? 'is-positive' : 'is-warning'}>{selectedTime || 'Chưa chọn'}</strong>
              </div>
              <div className="aw-summary-row">
                <span>Số tuần:</span><strong>{weeks} tuần</strong>
              </div>
              <div className="aw-summary-row">
                <span>Số buổi dự kiến:</span>
                <strong style={{ color: '#3de0ff' }}>{previewDates.length} buổi</strong>
              </div>

              <div className="aw-summary-divider" />

              {appliedVoucher && (
                <div className="aw-summary-row">
                  <span>Voucher ({appliedVoucher.code}):</span>
                  <strong style={{ color: '#10b981' }}>−{formatCurrency(discountPerSession)}/buổi</strong>
                </div>
              )}

              <div className="aw-pricing">
                <div>
                  <span>GIÁ / BUỔI</span>
                  <strong>{formatCurrency(pricePerSession)}</strong>
                </div>
                <div>
                  <span>TỔNG DỰ KIẾN</span>
                  <strong style={{ color: '#ffb86b' }}>{pkg ? formatCurrency(pricePerSession * previewDates.length) : '—'}</strong>
                </div>
                {previewDates.length > 0 && pkg && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(148, 163, 184, 0.3)', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <span>TÍCH ĐIỂM DỰ KIẾN</span>
                    <strong style={{ color: '#3de0ff' }}>+{pointsPerSession * previewDates.length} Điểm</strong>
                  </div>
                )}
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
                  {result.totalCreated > 0 ? (
                    <div className="rb-result-ok">✓ Đã tạo {result.totalCreated} lịch hẹn!</div>
                  ) : null}
                  {result.totalCreated === 0 && (
                    <div className="rb-result-warn" style={{ color: '#ef4444', fontWeight: 'bold' }}>✗ Không thể tạo bất kỳ lịch hẹn nào do trùng khung giờ/quá khứ. Vui lòng chọn giờ khác!</div>
                  )}
                  {result.totalFailed > 0 && result.totalCreated > 0 && (
                    <div className="rb-result-warn" style={{ color: '#f59e0b', fontWeight: 'bold', marginTop: '8px' }}>⚠ {result.totalFailed} ngày bị bỏ qua (trùng slot/quá khứ).</div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    {result.failed?.slice(0, 5).map((f, i) => (
                      <div key={i} className="rb-result-failed">✗ {f.date}: {f.reason}</div>
                    ))}
                    {result.failed?.length > 5 && (
                      <div className="rb-result-failed">... và {result.failed.length - 5} ngày khác.</div>
                    )}
                  </div>
                </div>
              )}

              <button className="aw-confirm" type="button" onClick={handleSubmit}
                disabled={loading || previewDates.length === 0 || !selectedBranch}>
                {loading ? 'ĐANG TẠO LỊCH...' : `XÁC NHẬN ${previewDates.length} BUỔI`}
              </button>
            </div>
          </aside>
        </div>
      )}

      {!selectedBranch && (
        <div className="rb-pick-branch-hint">
          👆 Vui lòng chọn chi nhánh phía trên để tiến hành đặt lịch
        </div>
      )}
    </div>
  );
}
