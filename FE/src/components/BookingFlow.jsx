import React, { useEffect, useMemo, useState } from 'react';
import BookingsHistory from './customer/BookingsHistory.jsx';
import LoyaltyGifts from './customer/LoyaltyGifts.jsx';
import RecurringBookingFlow from './customer/RecurringBookingFlow.jsx';
import SlotPackFlow from './customer/SlotPackFlow.jsx';
import CustomerProfile from './customer/CustomerProfile.jsx';
import VoucherPicker from './VoucherPicker.jsx';

const sidebarItems = [
  { id: 'dashboard', label: 'Bảng điều khiển', hint: 'Thành viên & phương tiện', icon: '♡' },
  { id: 'booking', label: 'Đặt lịch thường', hint: 'Hẹn rửa xe 24/7', icon: '📅' },
  { id: 'recurring', label: 'Đặt lịch định kỳ', hint: 'Lặp lại hằng tuần', icon: '🔁' },
  { id: 'slot_pack', label: 'Gói slot rửa xe', hint: 'Mua trước — dùng dần', icon: '🎫' },
  { id: 'history', label: 'Lịch sử & đánh giá', hint: 'Mã đơn rửa, feedback', icon: '⟲', badge: '1' },
  { id: 'gifts', label: 'Cửa hàng quà tặng', hint: 'Săn chơi đổi thưởng', icon: '🎁' },
  { id: 'maps', label: 'Hệ thống bản đồ', hint: 'Định vị cơ sở rửa', icon: '⌖' },
  { id: 'profile', label: 'Hồ sơ cá nhân', hint: 'Chỉnh sửa tài khoản', icon: '👤' },
];

// branches will be fetched from API





const timeSlots = [
  '08:00 - 08:30',
  '08:30 - 09:00',
  '09:00 - 09:30',
  '09:30 - 10:00',
  '10:00 - 10:30',
  '10:30 - 11:00',
  '11:00 - 11:30',
  '13:00 - 13:30',
  '13:30 - 14:00',
  '14:00 - 14:30',
  '14:30 - 15:00',
  '15:00 - 15:30',
  '15:30 - 16:00',
  '16:00 - 16:30',
  '16:30 - 17:00',
  '17:00 - 17:30',
];

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function buildBookingDates() {
  const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return {
      id: `${date.getFullYear()}-${month}-${day}`,
      label: index === 0 ? 'Hôm nay' : weekdayFormatter.format(date).toUpperCase(),
      day,
      month,
      iso: `${date.getFullYear()}-${month}-${day}`,
    };
  });
}

export default function BookingFlow({ user, vehicles: userVehicles = [], onLogout, apiBase, token }) {
  const bookingDates = useMemo(() => buildBookingDates(), []);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const vehicleList = userVehicles;
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleList[0]?.id || vehicleList[0]?._id || vehicleList[0]?.licensePlate || '');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedSubServices, setSelectedSubServices] = useState({});
  const [selectedDate, setSelectedDate] = useState(bookingDates[1]?.id || bookingDates[0].id);
  const [selectedTime, setSelectedTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingCode, setBookingCode] = useState('');
  const [mySlotPacks, setMySlotPacks] = useState([]);
  const [selectedSlotPack, setSelectedSlotPack] = useState(null);
  const [activeNav, setActiveNav] = useState('booking');
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resBranches, resPackages, resPacks] = await Promise.all([
          fetch(`${apiBase}/branches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBase}/packages`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBase}/slot-packs/my`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const branchesPayload = await resBranches.json();
        const packagesPayload = await resPackages.json();
        
        const dataB = branchesPayload?.data || branchesPayload;
        const mappedBranches = (Array.isArray(dataB) ? dataB : []).map(b => ({ ...b, id: b._id || b.id }));
        setBranches(mappedBranches);
        if (mappedBranches.length > 0) setSelectedBranch(mappedBranches[0].id);

        const dataP = packagesPayload?.data || packagesPayload;
        const mappedPackages = (Array.isArray(dataP) ? dataP : []).map(p => ({ ...p, id: p._id || p.id }));
        setPackages(mappedPackages);
        if (mappedPackages.length > 0) setSelectedPackage(mappedPackages[0].id);

        const packsPayload = await resPacks.json();
        const mappedPacks = Array.isArray(packsPayload?.data) ? packsPayload.data : [];
        setMySlotPacks(mappedPacks);
      } catch (e) { console.error('Failed to load data', e); }
    }
    if (token) fetchData();
  }, [apiBase, token]);

  const refreshUser = async () => {
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.data) setCurrentUser(data.data);
    } catch (e) { console.error(e); }
  };

  const branch = branches.find((item) => item.id === selectedBranch) || branches[0] || { id: '', name: 'Đang tải chi nhánh...', address: '' };
  const vehicle = vehicleList.find((item) => (item.id || item._id || item.licensePlate) === selectedVehicle) || vehicleList[0] || null;
  const pkg = packages.find(p => p.id === selectedPackage);
  const date = bookingDates.find((item) => item.id === selectedDate) || bookingDates[0];

  useEffect(() => {
    if (!selectedVehicle && vehicleList[0]) {
      setSelectedVehicle(vehicleList[0].id || vehicleList[0]._id || vehicleList[0].licensePlate || '');
    }
  }, [selectedVehicle, vehicleList]);

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedBranch || !selectedPackage || !date?.iso) return;
      setSlotsLoading(true);
      try {
        const res = await fetch(`${apiBase}/bookings/slots?branchId=${selectedBranch}&date=${date.iso}&packageId=${selectedPackage}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        if (res.ok) {
          setAvailableSlots(payload.data || []);
        } else {
          setAvailableSlots([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSlotsLoading(false);
      }
    }
    if (token) fetchSlots();
  }, [selectedBranch, selectedPackage, date?.iso, apiBase, token]);

  const currentSubServices = selectedSubServices[selectedPackage] || [];
  let extraDuration = 0;
  let extraPrice = 0;
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

  const validPacks = useMemo(() => {
    return mySlotPacks.filter(p => {
      if (p.status !== 'active' || p.remainingSlots <= 0) return false;
      const pPkgId = p.packageId?._id || p.packageId?.id || p.packageId;
      if (pPkgId !== selectedPackage) return false;
      const pBranchId = p.branchId?._id || p.branchId?.id || p.branchId;
      if (pBranchId && pBranchId !== selectedBranch) return false;
      const pVehicleId = p.vehicleId?._id || p.vehicleId?.id || p.vehicleId;
      const vId = vehicle?.id || vehicle?._id || vehicle?.licensePlate;
      if (pVehicleId && pVehicleId !== vId) return false;
      return true;
    });
  }, [mySlotPacks, selectedPackage, selectedBranch, vehicle]);

  useEffect(() => {
    if (selectedSlotPack && !validPacks.find(p => (p._id || p.id) === selectedSlotPack)) {
      setSelectedSlotPack(null);
    }
  }, [validPacks, selectedSlotPack]);

  let pointMultiplier = 1;
  if (currentUser?.tier === 'diamond') pointMultiplier = 2.0;
  else if (currentUser?.tier === 'gold') pointMultiplier = 1.5;
  else if (currentUser?.tier === 'silver') pointMultiplier = 1.2;

  const discount = appliedVoucher ? appliedVoucher.savings || (appliedVoucher.type === 'percentage' ? Math.floor(totalBase * appliedVoucher.value / 100) : appliedVoucher.value) : 0;
  const isPayingWithPack = !!selectedSlotPack;
  const total = isPayingWithPack ? 0 : Math.max(0, totalBase - discount);
  const points = Math.floor((isPayingWithPack ? totalBase : total) * 0.05 * pointMultiplier);

  async function applyCoupon() {
    const normalized = couponCode.trim().toUpperCase();

    if (!normalized) {
      setCouponApplied(false);
      setAppliedVoucher(null);
      setMessage('Nhập mã coupon để áp dụng ưu đãi.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/vouchers/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: normalized,
          bookingData: {
            packageId: service.id,
            branchId: branch.id,
            amount: service.price
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Mã ưu đãi không hợp lệ');

      setCouponApplied(true);
      setAppliedVoucher(data.data);
      setMessage(`Đã áp dụng mã: Giảm ${formatCurrency(data.data.savings)}`);
    } catch (err) {
      setCouponApplied(false);
      setAppliedVoucher(null);
      setMessage(err.message);
    }
  }

  async function confirmBooking() {
    if (!selectedTime) {
      setMessage('Vui lòng chọn khung giờ trước khi xác nhận đặt chỗ.');
      return;
    }

    if (!vehicle) {
      setMessage('Chưa có xe nào được đồng bộ từ BE để đặt lịch.');
      return;
    }

    setBookingLoading(true);
    setMessage('');
    setBookingCode('');

    try {
      const response = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branchId: branch.id,
          packageId: pkg.id,
          vehicleId: vehicle.id || vehicle._id || vehicle.licensePlate,
          bookingDate: date.iso,
          startTime: selectedTime,
          voucherCode: isPayingWithPack ? undefined : (appliedVoucher?.code || undefined),
          selectedSubServices: currentSubServices,
          slotPackId: selectedSlotPack || undefined,
          note: '',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || 'Không thể tạo lịch hẹn');
      }

      const payload = await response.json();
      const booking = payload?.data || payload;
      setBookingCode(booking?.bookingCode || booking?.code || '');
      setMessage(`Đã giữ chỗ ${pkg?.name || 'Dịch vụ'} tại ${branch.name} lúc ${selectedTime}.`);
    } catch (error) {
      setMessage(error.message || 'Không thể tạo lịch hẹn');
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="aw-shell">
      <header className="aw-topbar">
        <div className="aw-brand-block">
          <div className="aw-logo">💧</div>
          <div>
            <div className="aw-title-row">
              <h1>AUTOWASH PORTAL WEB</h1>
              <span className="aw-badge">CLIENT HUB</span>
            </div>
            <p>Không gian tích điểm - Đặt lịch chăm sóc xe máy trực tuyến độc quyền</p>
          </div>
        </div>

          <div className="aw-user-chip">
          <div className="aw-avatar" aria-hidden="true">BK</div>
          <div className="aw-user-meta">
            <strong>{currentUser?.name ? `Anh/Chị: ${currentUser.name}` : 'Anh/Chị: Bảo Khang'}</strong>
            <div>
              <span className="aw-tier">{currentUser?.tier ? currentUser.tier.toUpperCase() : (currentUser?.role ? currentUser.role.toUpperCase() : 'TẬP ĐOÀN GOLD')}</span>
              <span className="aw-divider">|</span>
              <span>{currentUser?.phone || '0901234567'}</span>
            </div>
          </div>
          <button className="aw-icon-button" type="button" aria-label="Đăng xuất" onClick={onLogout}>↗</button>
        </div>
      </header>

      <div className="aw-layout">
          <aside className="aw-sidebar">
          <div className="aw-sidebar-greeting">Xin chào, {currentUser?.name || 'Bảo Khang'}!</div>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={item.id === activeNav ? 'aw-nav selected' : 'aw-nav'}
              type="button"
              onClick={() => setActiveNav(item.id)}
            >
              <span className="aw-nav-icon">{item.icon}</span>
              <span>
                <strong>{item.label.toUpperCase()}</strong>
                <small>{item.hint}</small>
              </span>
              {item.badge ? <span className="aw-count">{item.badge}</span> : null}
            </button>
          ))}
        </aside>

        <main className="aw-main">
          {activeNav === 'booking' ? (
          <>
          <section className="aw-hero">
            <div>
              <div className="aw-section-kicker">CỔNG ĐẶT LỊCH RỬA TRỰC TUYẾN 24/7</div>
              <h2>Giữ chỗ nhanh, chọn đúng chi nhánh, xe, dịch vụ và khung giờ trong một màn hình.</h2>
              <p>Thiết kế tối cho trải nghiệm premium, đủ rõ để nhìn từng lựa chọn hiện tại nhưng vẫn giữ cảm giác như một bảng điều khiển thực thụ.</p>
            </div>
            <div className="aw-hero-stats">
              <div>
                <strong>98%</strong>
                <span>Lượt giữ chỗ đúng giờ</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Hỗ trợ đặt lịch</span>
              </div>
              <div>
                <strong>{formatCurrency(60000)}</strong>
                <span>Giá từ gói cơ bản</span>
              </div>
            </div>
          </section>

          <section className="aw-grid">
            <div className="aw-flow">
              <article className="aw-card-section">
                <div className="aw-step-title"><span>1</span> CHỌN CHI NHÁNH TRUNG TÂM</div>
                <div className="aw-options two-up">
                  {branches.length === 0 ? (
                    <div style={{ gridColumn: 'span 2', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>Không có chi nhánh nào đang hoạt động.</div>
                  ) : branches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selectedBranch ? 'aw-option active' : 'aw-option'}
                      onClick={() => setSelectedBranch(item.id)}
                    >
                      <div className="aw-option-head">
                        <strong>{item.name}</strong>
                        <span>{item.id === selectedBranch ? '●' : '○'}</span>
                      </div>
                      <p>{item.address}</p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="aw-card-section">
                <div className="aw-step-title"><span>2</span> CHỌN XE RỬA ĐĂNG KÝ</div>
                <div className="aw-options two-up">
                  {vehicleList.length > 0 ? vehicleList.map((item) => {
                    const vehicleKey = item.id || item._id || item.licensePlate;
                    const vehicleName = item.name || `${item.brand || ''} ${item.model || ''}`.trim() || item.licensePlate || 'Xe';

                    return (
                    <button
                      key={vehicleKey}
                      type="button"
                      className={vehicleKey === selectedVehicle ? 'aw-option active' : 'aw-option'}
                      onClick={() => setSelectedVehicle(vehicleKey)}
                    >
                      <div className="aw-option-head">
                        <strong>{vehicleName}</strong>
                        <span>{vehicleKey === selectedVehicle ? '●' : '○'}</span>
                      </div>
                      <p>{item.plate || item.licensePlate}</p>
                      <small>{item.type || item.vehicleType || 'Xe máy'} · {item.points || (item.isDefault ? 'Mặc định' : 'Đã lưu')}</small>
                    </button>
                    );
                  }) : (
                    <div className="aw-empty-state">
                      <strong>Chưa có xe nào được đồng bộ từ BE.</strong>
                      <p>Hãy đăng ký xe ở bước tạo tài khoản hoặc thêm xe trong hồ sơ cá nhân trước khi đặt lịch.</p>
                    </div>
                  )}
                </div>
              </article>

              <article className="aw-card-section aw-services-panel">
                <div className="aw-step-title"><span>3</span> CHỌN GÓI DỊCH VỤ RỬA XE</div>
                <div className="aw-options stacked scrollable">
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
                        
                        {isActive && p.subServices && p.subServices.length > 0 && (
                          <div style={{ marginTop: '10px', padding: '10px', background: '#f1f5f9', borderRadius: '8px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#2563eb', display: 'block', marginBottom: '8px' }}>Dịch vụ chọn thêm:</strong>
                            {p.subServices.map((sub) => {
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
                                    disabled={!sub.isOptional}
                                  />
                                  <span style={{ flex: 1 }}>{sub.name} (+{sub.duration}p)</span>
                                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{sub.price > 0 ? `+${formatCurrency(sub.price)}` : 'Miễn phí'}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="aw-card-section">
                <div className="aw-step-title"><span>4</span> CHỌN NGÀY ĐẶT HẸN</div>
                <div className="aw-date-grid">
                  {bookingDates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selectedDate ? 'aw-date-card active' : 'aw-date-card'}
                      onClick={() => setSelectedDate(item.id)}
                    >
                      <span>{item.label}</span>
                      <strong>{item.day}</strong>
                      <small>Thg {item.month}</small>
                    </button>
                  ))}
                </div>

                <div className="aw-slot-title">KHUNG GIỜ NHẬN XE TẠI LÒ RỬA</div>
                <div className="aw-time-grid">
                  {slotsLoading ? <div style={{padding: '20px', gridColumn: '1 / -1', textAlign: 'center'}}>Đang tải lịch trống...</div> : 
                   availableSlots.length > 0 ? availableSlots.map((slotObj) => {
                    const timeLabel = slotObj.startTime;
                    const isDisabled = !slotObj.available;
                    const isVipOnly = slotObj.vipOnly;
                    const canBookVip = ['gold', 'diamond'].includes(currentUser?.tier);
                    const lockVip = isVipOnly && !canBookVip;

                    return (
                      <button
                        key={timeLabel}
                        type="button"
                        disabled={isDisabled || lockVip}
                        className={timeLabel === selectedTime ? 'aw-time-card active' : 'aw-time-card'}
                        onClick={() => setSelectedTime(timeLabel)}
                        style={{ opacity: (isDisabled || lockVip) ? 0.5 : 1, position: 'relative' }}
                      >
                        {timeLabel}
                        {isVipOnly && <span title="Chỉ VIP" style={{ position: 'absolute', top: -10, right: -10, fontSize: '1.2rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>👑</span>}
                        {isDisabled && !isVipOnly && <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, fontSize: '0.65rem', color: '#ef4444', textAlign: 'center' }}>Hết chỗ</span>}
                        {lockVip && <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, fontSize: '0.65rem', color: '#eab308', fontWeight: 'bold', textAlign: 'center' }}>Chỉ VIP</span>}
                      </button>
                    );
                  }) : timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      className={slot === selectedTime ? 'aw-time-card active' : 'aw-time-card'}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </article>
            </div>

            <aside className="aw-summary">
              <div className="aw-summary-card">
                <div className="aw-summary-title">TỔNG HÓA ĐƠN THANH TOÁN</div>

                <div className="aw-summary-row">
                  <span>Gói cơ sở:</span>
                  <strong>{branch.name}</strong>
                </div>
                <div className="aw-summary-row">
                  <span>Gói xe rửa:</span>
                  <strong>{vehicle ? `${vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || vehicle.licensePlate}` : 'Chưa có xe'}</strong>
                </div>
                <div className="aw-summary-row">
                  <span>Thời điểm hẹn:</span>
                  <strong>{date.label} ({date.iso})</strong>
                </div>
                <div className="aw-summary-row">
                  <span>Khung giờ:</span>
                  <strong className={selectedTime ? 'is-positive' : 'is-warning'}>{selectedTime || 'Chưa chọn'}</strong>
                </div>

                <div className="aw-summary-divider" />

                <div className="aw-summary-row price-row">
                  <span>Gói: {pkg ? pkg.name : 'Chưa chọn'}</span>
                  <strong>{formatCurrency(totalBase)}</strong>
                </div>

                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  {validPacks.length > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#334155', display: 'block', marginBottom: '8px' }}>Thanh toán bằng Gói Lượt:</strong>
                      <select 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        value={selectedSlotPack || ''}
                        onChange={(e) => {
                          setSelectedSlotPack(e.target.value || null);
                          if (e.target.value) {
                            setAppliedVoucher(null);
                            setCouponCode('');
                            setCouponApplied(false);
                          }
                        }}
                      >
                        <option value="">Không sử dụng gói lượt</option>
                        {validPacks.map(p => (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.packCode} - Còn {p.remainingSlots} lần
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!isPayingWithPack && (
                    <VoucherPicker
                      apiBase={apiBase}
                      token={token}
                      selected={appliedVoucher}
                      onSelect={setAppliedVoucher}
                      orderAmount={totalBase}
                      compact={true}
                    />
                  )}
                </div>

                <div className="aw-pricing">
                  <div>
                    <span>THỰC THU TẠI TIỆM</span>
                    <strong>{formatCurrency(total)}</strong>
                  </div>
                  {discount > 0 && (
                    <div style={{color: '#10b981', marginTop: '4px'}}>
                      <span>KHUYẾN MÃI TỪ VOUCHER</span>
                      <strong>- {formatCurrency(discount)}</strong>
                    </div>
                  )}
                  <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(148, 163, 184, 0.3)'}}>
                    <span>TÍCH ĐIỂM SĂM SÉT</span>
                    <strong>+{points} Điểm</strong>
                  </div>
                </div>

                {message ? <div className="aw-toast">{message}</div> : null}
                {bookingCode ? <div className="aw-booking-code">Mã đặt chỗ: {bookingCode}</div> : null}

                <button className="aw-confirm" type="button" onClick={confirmBooking} disabled={bookingLoading}>
                  {bookingLoading ? 'ĐANG TẠO LỊCH HẸN...' : 'XÁC NHẬN ĐẶT GIỮ CHỖ'}
                </button>
              </div>
            </aside>
          </section>
          </>
          ) : null}

          {activeNav === 'recurring' ? (
            <div style={{ paddingTop: 8 }}>
              <RecurringBookingFlow
                user={currentUser}
                vehicles={vehicleList}
                apiBase={apiBase}
                token={token}
              />
            </div>
          ) : null}

          {activeNav === 'slot_pack' ? (
            <div style={{ paddingTop: 8 }}>
              <SlotPackFlow
                user={currentUser}
                vehicles={vehicleList}
                apiBase={apiBase}
                token={token}
              />
            </div>
          ) : null}

          {activeNav === 'history' ? (
            <div style={{ paddingTop: 8 }}>
              <BookingsHistory apiBase={apiBase} token={token} />
            </div>
          ) : null}

          {activeNav === 'gifts' ? (
            <div style={{ paddingTop: 8 }}>
              <LoyaltyGifts apiBase={apiBase} token={token} user={currentUser} refreshUser={refreshUser} />
            </div>
          ) : null}

          {activeNav === 'profile' ? (
            <div style={{ paddingTop: 8 }}>
              <CustomerProfile apiBase={apiBase} token={token} />
            </div>
          ) : null}

        </main>
      </div>
    </div>
  );
}