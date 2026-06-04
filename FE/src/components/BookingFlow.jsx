import React, { useEffect, useMemo, useState } from 'react';
import BookingsHistory from './BookingsHistory.jsx';
import LoyaltyGifts from './LoyaltyGifts.jsx';
import RecurringBookingFlow from './RecurringBookingFlow.jsx';
import SlotPackFlow from './SlotPackFlow.jsx';

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

const vehicles = [
  { id: 'sh150i', name: 'Honda SH 150i', plate: '59F2-999.99', type: 'Xe máy', points: '2.400 điểm' },
  { id: 'exciter', name: 'Yamaha Exciter 155', plate: '59K1-888.88', type: 'Xe máy', points: '1.120 điểm' },
];

const services = [
  {
    id: 'standard',
    name: 'Rửa xe máy Standard',
    duration: '25 phút thi công',
    price: 60000,
    description: 'Rửa bọt tuyết chuyên sâu, xịt gầm chống hút xăng, lau khô, dưỡng lớp đèn bóng mịn màng.',
  },
  {
    id: 'wax',
    name: 'Rửa bọt tuyết + Wax bóng',
    duration: '40 phút thi công',
    price: 130000,
    description: 'Bao gồm gói Standard kèm phun sáp Nano chống bám bụi và tạo độ bóng tối ưu.',
  },
  {
    id: 'detail',
    name: 'Vệ sinh chi tiết (Nội thất/Động cơ)',
    duration: '75 phút thi công',
    price: 280000,
    description: 'Làm sạch sâu khoang máy, nhông sên đĩa bằng hóa chất chuyên dụng, xịt dưỡng chống rỉ sét.',
  },
  {
    id: 'ceramic',
    name: 'Sơn phủ Ceramic chống trầy',
    duration: '90 phút thi công',
    price: 450000,
    description: 'Phết dung dịch phủ thủy tinh Ceramic để tối đa hóa độ dán áo nhựa và chống tác động va quệt.',
  },
  {
    id: 'polish',
    name: 'Đánh bóng dàn nhựa mờ chuyên sâu',
    duration: '30 phút thi công',
    price: 90000,
    description: 'Tẩy ố mốc sần trên các phần nhựa nhám đen hoặc xám của xe ga lớn, phục hồi màu như mới khui thùng.',
  },
  {
    id: 'helmet',
    name: 'Xông tinh dầu khử mùi mũ bảo hiểm',
    duration: '15 phút thi công',
    price: 50000,
    description: 'Xử lý vi khuẩn bám lót mũ bảo hiểm 3/4 hoặc fullface bằng máy xông hơi nóng nano bạc kết hợp quế thơm.',
  },
  {
    id: 'wheel',
    name: 'Tẩy ố vàng vành nan hoa / gầm máy',
    duration: '45 phút thi công',
    price: 150000,
    description: 'Sử dụng dung dịch axit nhẹ đặc chủng hữu cơ làm sạch rỉ sét căm xe, má đùm pô lâu năm.',
  },
  {
    id: 'vip',
    name: 'Combo Rửa xe toàn diện VIP',
    duration: '120 phút thi công',
    price: 500000,
    description: 'Trải nghiệm đỉnh cao bao gồm rửa chi tiết máy, đánh bóng sườn, phủ sáp SiO2 và vệ sinh sên đĩa.',
  },
];

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
  const [selectedService, setSelectedService] = useState(services[0].id);
  const [selectedDate, setSelectedDate] = useState(bookingDates[1]?.id || bookingDates[0].id);
  const [selectedTime, setSelectedTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [message, setMessage] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingCode, setBookingCode] = useState('');
  const [activeNav, setActiveNav] = useState('booking');
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch(`${apiBase}/branches`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        const data = payload?.data || payload;
        const mappedBranches = (Array.isArray(data) ? data : []).map(b => ({
          ...b,
          id: b._id || b.id
        }));
        setBranches(mappedBranches);
        if (mappedBranches.length > 0) {
          setSelectedBranch(mappedBranches[0].id);
        }
      } catch (e) { console.error('Failed to load branches', e); }
    }
    if (token) fetchBranches();
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

  useEffect(() => {
    if (!selectedVehicle && vehicleList[0]) {
      setSelectedVehicle(vehicleList[0].id || vehicleList[0]._id || vehicleList[0].licensePlate || '');
    }
  }, [selectedVehicle, vehicleList]);

  const branch = branches.find((item) => item.id === selectedBranch) || branches[0] || { id: '', name: 'Đang tải chi nhánh...', address: '' };
  const vehicle = vehicleList.find((item) => (item.id || item._id || item.licensePlate) === selectedVehicle) || vehicleList[0] || null;
  const service = services.find((item) => item.id === selectedService) || services[0];
  const date = bookingDates.find((item) => item.id === selectedDate) || bookingDates[0];

  const discount = couponApplied && appliedVoucher ? appliedVoucher.savings : 0;
  const total = Math.max(0, service.price - discount);
  const points = Math.max(60, Math.round(total / 1000) * 10);

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
          branchName: branch.name,
          branchAddress: branch.address,
          vehicleId: vehicle.id || vehicle._id,
          vehicleName: vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || vehicle.licensePlate,
          vehiclePlate: vehicle.plate || vehicle.licensePlate,
          vehicleType: vehicle.type || vehicle.vehicleType || 'motorcycle',
          serviceId: service.id,
          serviceName: service.name,
          serviceDuration: service.duration,
          servicePrice: service.price,
          bookingDate: date.iso,
          timeSlot: selectedTime,
          couponCode: couponCode.trim().toUpperCase(),
          discountAmount: discount,
          totalAmount: total,
          pointsEarned: points,
          notes: '',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || 'Không thể tạo lịch hẹn');
      }

      const payload = await response.json();
      const booking = payload?.data || payload;
      setBookingCode(booking?.bookingCode || booking?.code || '');
      setMessage(`Đã giữ chỗ ${service.name} tại ${branch.name} lúc ${selectedTime}.`);
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
                    <div style={{ gridColumn: 'span 2', color: '#888', fontStyle: 'italic', padding: '10px' }}>Không có chi nhánh nào đang hoạt động.</div>
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
                  {services.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selectedService ? 'aw-option aw-service active' : 'aw-option aw-service'}
                      onClick={() => setSelectedService(item.id)}
                    >
                      <div className="aw-option-head service-head">
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.duration}</small>
                        </div>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                      <p>{item.description}</p>
                    </button>
                  ))}
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
                  {timeSlots.map((slot) => (
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
                  <span>Gói: {service.name}</span>
                  <strong>{formatCurrency(service.price)}</strong>
                </div>

                <label className="aw-summary-label" htmlFor="coupon">HỘP COUPON KHUYẾN MÃI</label>
                <div className="aw-coupon-row">
                  <input
                    id="coupon"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="NHẬP MÃ COUPON..."
                  />
                  <button type="button" onClick={applyCoupon}>Áp dụng</button>
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
                  <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #333'}}>
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

        </main>
      </div>
    </div>
  );
}