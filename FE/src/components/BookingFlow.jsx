import React, { useEffect, useMemo, useState } from 'react';
import { Drop } from '@phosphor-icons/react';
import BookingsHistory from './customer/BookingsHistory.jsx';
import LoyaltyGifts from './customer/LoyaltyGifts.jsx';
import RecurringBookingFlow from './customer/RecurringBookingFlow.jsx';
import SlotPackFlow from './customer/SlotPackFlow.jsx';
import CustomerProfile from './customer/CustomerProfile.jsx';
import VoucherPicker from './VoucherPicker.jsx';
import useSSE from '../hooks/useSSE.js';

const sidebarItems = [
  { id: 'dashboard', label: 'Giới thiệu', hint: 'Các giải pháp đặt lịch', icon: '💡' },
  { id: 'booking', label: 'Đặt lịch thường', hint: 'Hẹn rửa xe 24/7', icon: '📅' },
  { id: 'recurring', label: 'Đặt lịch định kỳ', hint: 'Lặp lại hằng tuần', icon: '🔁' },
  { id: 'slot_pack', label: 'Gói slot rửa xe', hint: 'Mua trước — dùng dần', icon: '🎫' },
  { id: 'history', label: 'Lịch sử & đánh giá', hint: 'Mã đơn rửa, feedback', icon: '⟲'},
  { id: 'gifts', label: 'Cửa hàng quà tặng', hint: 'Săn chơi đổi thưởng', icon: '🎁' },
  { id: 'maps', label: 'Hệ thống bản đồ', hint: 'Định vị cơ sở rửa', icon: '⌖' },
  { id: 'profile', label: 'Hồ sơ cá nhân', hint: 'Chỉnh sửa tài khoản', icon: '👤' },
];

const timeSlots = [
  '08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00',
  '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30',
  '13:00 - 13:30', '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00',
  '15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00', '17:00 - 17:30',
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
      day, month, iso: `${date.getFullYear()}-${month}-${day}`,
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
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingCode, setBookingCode] = useState('');
  const [pendingDeposit, setPendingDeposit] = useState(null); // booking đang chờ đặt cọc
  const [depositLoading, setDepositLoading] = useState(false);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState('bank');
  const [mySlotPacks, setMySlotPacks] = useState([]);
  const [selectedSlotPack, setSelectedSlotPack] = useState(null);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(user);
  const [sepayData, setSepayData] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Lắng nghe sự kiện thanh toán thành công qua SSE từ SePay Webhook
  useSSE(token, 'PAYMENT_SUCCESS', (data) => {
    if (pendingDeposit && (String(data?.bookingId) === String(pendingDeposit._id) || data?.transactionId === sepayData?.transactionId)) {
      setPaymentCompleted(true);
      setTimeout(() => {
        setPendingDeposit(null);
        setSepayData(null);
        setPaymentCompleted(false);
        setMessage(`🎉 Thanh toán SePay thành công! Mã đơn: ${pendingDeposit.bookingCode || bookingCode}`);
        setActiveNav('history');
      }, 2500);
    }
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [resBranches, resPacks] = await Promise.all([
          fetch(`${apiBase}/branches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBase}/slot-packs/my`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const branchesPayload = await resBranches.json();
        const dataB = branchesPayload?.data || branchesPayload;
        const mappedBranches = (Array.isArray(dataB) ? dataB : []).map(b => ({ ...b, id: b._id || b.id }));
        setBranches(mappedBranches);
        if (mappedBranches.length > 0) setSelectedBranch(mappedBranches[0].id);
        const packsPayload = await resPacks.json();
        const mappedPacks = Array.isArray(packsPayload?.data) ? packsPayload.data : [];
        setMySlotPacks(mappedPacks);
      } catch (e) { console.error('Failed to load data', e); }
    }
    if (token) fetchData();
  }, [apiBase, token]);

  useEffect(() => {
    if (!selectedBranch) return;
    async function fetchPackagesByBranch() {
      try {
        const res = await fetch(`${apiBase}/packages?branchId=${selectedBranch}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        const dataP = payload?.data || payload;
        const mappedPackages = (Array.isArray(dataP) ? dataP : []).map(p => ({ ...p, id: p._id || p.id }));
        setPackages(mappedPackages);
        if (mappedPackages.length > 0 && !mappedPackages.find(p => p.id === selectedPackage)) {
          setSelectedPackage(mappedPackages[0].id);
        }
      } catch (e) { console.error('Failed to load packages', e); }
    }
    fetchPackagesByBranch();
  }, [selectedBranch, apiBase, token]);

  const refreshUser = async () => {
    try {
      const res = await fetch(`${apiBase}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data?.data) setCurrentUser(data.data);
    } catch (e) { console.error(e); }
  };

  const branch = branches.find((item) => item.id === selectedBranch) || branches[0] || { id: '', name: 'Đang tải chi nhánh...', address: '' };
  const vehicle = vehicleList.find((item) => (item.id || item._id || item.licensePlate) === selectedVehicle) || vehicleList[0] || null;
  const branchPackages = packages.filter((p) => !p.branchId || p.branchId === branch.id);
  const pkg = branchPackages.find(p => p.id === selectedPackage);
  const date = bookingDates.find((item) => item.id === selectedDate) || bookingDates[0];

  useEffect(() => {
    if (!selectedVehicle && vehicleList[0]) {
      setSelectedVehicle(vehicleList[0].id || vehicleList[0]._id || vehicleList[0].licensePlate || '');
    }
  }, [selectedVehicle, vehicleList]);

  useEffect(() => {
    const firstAvailable = branchPackages.find((p) => p.id === selectedPackage);
    if (!firstAvailable && branchPackages.length > 0) {
      setSelectedPackage(branchPackages[0].id);
    }
  }, [selectedBranch, packages]);

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedBranch || !selectedPackage || !date?.iso) return;
      setSlotsLoading(true);
      try {
        const res = await fetch(`${apiBase}/bookings/slots?branchId=${selectedBranch}&date=${date.iso}&packageId=${selectedPackage}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        if (res.ok) setAvailableSlots(payload.data || []);
        else setAvailableSlots([]);
      } catch (err) { console.error(err); }
      finally { setSlotsLoading(false); }
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
    if (selectedSlotPack && !validPacks.find(p => (p._id || p.id) === selectedSlotPack)) setSelectedSlotPack(null);
  }, [validPacks, selectedSlotPack]);

  let pointMultiplier = 1;
  if (currentUser?.tier === 'diamond') pointMultiplier = 2.0;
  else if (currentUser?.tier === 'gold') pointMultiplier = 1.5;
  else if (currentUser?.tier === 'silver') pointMultiplier = 1.2;

  const discount = appliedVoucher ? appliedVoucher.savings || (appliedVoucher.type === 'percentage' ? Math.floor(totalBase * appliedVoucher.value / 100) : appliedVoucher.value) : 0;
  const isPayingWithPack = !!selectedSlotPack;
  const total = isPayingWithPack ? 0 : Math.max(0, totalBase - discount);
  const points = Math.floor((isPayingWithPack ? totalBase : total) * 0.05 * pointMultiplier);

  async function confirmBooking() {
    if (!selectedTime) { setMessage('Vui lòng chọn khung giờ trước khi xác nhận đặt chỗ.'); return; }
    if (!selectedVehicle) { setMessage('Vui lòng chọn xe trước khi đặt lịch.'); return; }
    if (!vehicle) { setMessage('Chưa có xe nào được đồng bộ từ BE để đặt lịch.'); return; }
    setBookingLoading(true); setMessage(''); setBookingCode('');
    try {
      const response = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      // Đơn lẻ/định kỳ cần thanh toán; gói lượt đã trả trước → không cọc
      if ((booking?.depositAmount > 0 || booking?.finalPrice > 0) && !booking?.depositPaid) {
        setPendingDeposit(booking);
        setMessage('');
      } else {
        setMessage(`Đã giữ chỗ ${pkg?.name || 'Dịch vụ'} tại ${branch.name} lúc ${selectedTime}.`);
      }
    } catch (error) { setMessage(error.message || 'Không thể tạo lịch hẹn'); }
    finally { setBookingLoading(false); }
  }

  async function payDeposit() {
    if (!pendingDeposit) return;
    setDepositLoading(true);
    try {
      const res = await fetch(`${apiBase}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: pendingDeposit._id, method: 'bank', paymentType: 'deposit' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message || 'Thanh toán cọc thất bại');
      const payObj = payload?.data || payload;
      if (payObj?.qrCodeUrl || payObj?.transactionId) {
        setSepayData({
          qrCodeUrl: payObj.qrCodeUrl || `https://qr.sepay.vn/img?bank=MB&acc=97966888888&amount=${pendingDeposit.depositAmount || pendingDeposit.finalPrice}&des=DAT COC ${payObj.transactionId}`,
          transactionId: payObj.transactionId,
          amount: payObj.amount || pendingDeposit.depositAmount || pendingDeposit.finalPrice,
        });
      } else {
        setMessage(`Đã đặt cọc ${formatCurrency(pendingDeposit.depositAmount || pendingDeposit.finalPrice)} thành công. Lịch của bạn đang chờ chi nhánh xác nhận.`);
        setBookingCode(pendingDeposit.bookingCode || '');
        setPendingDeposit(null);
      }
    } catch (e) { setMessage(e.message || 'Thanh toán cọc thất bại'); }
    finally { setDepositLoading(false); }
  }

  async function payWithVnpay() {
    if (!pendingDeposit) return;
    setVnpayLoading(true);
    try {
      const res = await fetch(`${apiBase}/payments/vnpay-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: pendingDeposit._id, paymentType: 'deposit', amount: pendingDeposit.depositAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Tạo thanh toán VNPay thất bại');
      const paymentUrl = data?.data?.paymentUrl;
      if (!paymentUrl) throw new Error('Không nhận được URL thanh toán');
      window.location.href = paymentUrl;
    } catch (e) {
      setMessage(e.message || 'Thanh toán VNPay thất bại');
      setVnpayLoading(false);
    }
  }

  const [walletLoading, setWalletLoading] = useState(false);
  async function payWithWallet() {
    if (!pendingDeposit) return;
    if ((currentUser?.walletBalance || 0) < pendingDeposit.depositAmount) {
      setMessage('Số dư ví không đủ để thanh toán. Vui lòng chọn phương thức khác.');
      return;
    }
    setWalletLoading(true);
    try {
      const res = await fetch(`${apiBase}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: pendingDeposit._id, method: 'wallet', paymentType: 'deposit' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message || 'Thanh toán bằng ví thất bại');
      
      setMessage(`Đã thanh toán cọc ${formatCurrency(pendingDeposit.depositAmount || pendingDeposit.finalPrice)} bằng Ví AutoWash thành công.`);
      setBookingCode(pendingDeposit.bookingCode || '');
      setPendingDeposit(null);
      refreshUser(); // Cập nhật lại số dư
    } catch (e) {
      setMessage(e.message || 'Thanh toán bằng ví thất bại');
    } finally {
      setWalletLoading(false);
    }
  }

  return (
    <div className="aw-shell">
      <header className="aw-topbar" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="aw-brand-block">
          <div className="aw-logo"><Drop size={28} weight="fill" color="#10b981" /></div>
          <div>
            <div className="aw-title-row">
              <h1>AUTOWASH PORTAL</h1>
              <span className="aw-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>CLIENT HUB</span>
            </div>
            <p>Không gian tích điểm - Đặt lịch chăm sóc xe trực tuyến</p>
          </div>
        </div>
        <div className="aw-user-chip">
          <div className="aw-avatar" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }} aria-hidden="true">BK</div>
          <div className="aw-user-meta">
            <strong>{currentUser?.name ? currentUser.name : 'Người dùng'}</strong>
            <div>
              <span className="aw-tier" style={{ color: '#10b981' }}>{currentUser?.tier ? currentUser.tier.toUpperCase() : (currentUser?.role ? currentUser.role.toUpperCase() : 'THÀNH VIÊN')}</span>
              <span className="aw-divider">|</span>
              <span>{currentUser?.phone || ''}</span>
            </div>
          </div>
          <button className="aw-icon-button" type="button" aria-label="Đăng xuất" onClick={onLogout}>↗</button>
        </div>
      </header>

      <div className="aw-layout">
        <aside className="aw-sidebar" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="aw-sidebar-greeting">Xin chào, {currentUser?.name || 'Người dùng'}!</div>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={item.id === activeNav ? 'aw-nav selected' : 'aw-nav'}
              type="button"
              onClick={() => setActiveNav(item.id)}
              style={item.id === activeNav ? { background: 'rgba(16,185,129,0.08)', color: '#10b981', borderLeft: '3px solid #10b981' } : {}}
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
          {activeNav === 'dashboard' ? (
            <div className="space-y-6" style={{ contentVisibility: 'auto' }}>
              <section className="aw-hero" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '28px', borderRadius: '30px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: 'var(--shadow)', marginBottom: '18px' }}>
                <div className="aw-section-kicker" style={{ color: '#10b981', fontSize: '0.82rem', tracking: '0.12em', textTransform: 'uppercase' }}>CỔNG HỘI VIÊN AUTOWASHPRO</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '8px 0 6px', color: 'var(--text)' }}>Xin chào, {currentUser?.name || 'Người dùng'}!</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>Chào mừng bạn đến với Cổng dịch vụ trực tuyến. Hãy chọn giải pháp đặt lịch tối ưu bên dưới để chăm sóc phương tiện của bạn.</p>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '18px' }}>
                {/* Đặt lịch thường */}
                <div className="aw-card-section" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="aw-logo" style={{ width: '48px', height: '48px', borderRadius: '14px', fontSize: '20px', background: 'linear-gradient(180deg, var(--accent), var(--accent-2))', color: '#fff', boxShadow: 'none', display: 'grid', placeItems: 'center' }}>📅</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Đặt lịch thường</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                      Đặt lịch đơn lẻ linh hoạt 24/7. Tự chọn chi nhánh, gói dịch vụ và khung giờ rửa phù hợp với thời gian của bạn.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                      <li>✓ Đặt giữ chỗ nhanh trong 2 phút</li>
                      <li>✓ Chỉ cần đặt cọc trước 30% online</li>
                      <li>✓ Check-in tức thì bằng mã QR code</li>
                    </ul>
                  </div>
                  <button onClick={() => setActiveNav('booking')} style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '14px', border: 'none', background: '#10b981', color: '#fff', fontSize: '0.86rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}>
                    Bắt đầu đặt ngay
                  </button>
                </div>

                {/* Đặt lịch định kỳ */}
                <div className="aw-card-section" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="aw-logo" style={{ width: '48px', height: '48px', borderRadius: '14px', fontSize: '20px', background: 'linear-gradient(180deg, var(--accent), var(--accent-2))', color: '#fff', boxShadow: 'none', display: 'grid', placeItems: 'center' }}>🔁</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Đặt lịch định kỳ</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                      Lên lịch tự động hàng tuần một lần duy nhất. Đảm bảo xế cưng luôn được làm sạch đúng lịch mà không cần thao tác nhiều lần.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                      <li>✓ Tự tạo lịch biểu tự động mỗi tuần</li>
                      <li>✓ Được ưu tiên giữ slot giờ cao điểm</li>
                      <li>✓ Quản lý dời lịch, hủy buổi linh hoạt</li>
                    </ul>
                  </div>
                  <button onClick={() => setActiveNav('recurring')} style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '14px', border: 'none', background: '#10b981', color: '#fff', fontSize: '0.86rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}>
                    Lên lịch định kỳ
                  </button>
                </div>

                {/* Gói slot prepaid */}
                <div className="aw-card-section" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="aw-logo" style={{ width: '48px', height: '48px', borderRadius: '14px', fontSize: '20px', background: 'linear-gradient(180deg, var(--accent), var(--accent-2))', color: '#fff', boxShadow: 'none', display: 'grid', placeItems: 'center' }}>🎫</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>Gói slot prepaid</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                      Giải pháp tiết kiệm vượt trội cho khách hàng thân thiết. Mua trước số lượt rửa xe, dùng dần với chiết khấu lên đến 15%.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                      <li>✓ Chiết khấu trực tiếp tới 15% gói</li>
                      <li>✓ Đặt lịch rửa xe KHÔNG cần cọc 30%</li>
                      <li>✓ Sử dụng linh hoạt cho nhiều xe</li>
                    </ul>
                  </div>
                  <button onClick={() => setActiveNav('slot_pack')} style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '14px', border: 'none', background: '#10b981', color: '#fff', fontSize: '0.86rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}>
                    Mua gói slot ngay
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeNav === 'booking' ? (
          <>
          <section className="aw-hero" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, transparent 100%)' }}>
            <div>
              <div className="aw-section-kicker" style={{ color: '#10b981' }}>CỔNG ĐẶT LỊCH RỬA TRỰC TUYẾN 24/7</div>
              <h2>Giữ chỗ nhanh, chọn đúng chi nhánh, xe, dịch vụ và khung giờ trong một màn hình.</h2>
              <p>Trải nghiệm premium, đủ rõ để nhìn từng lựa chọn hiện tại.</p>
            </div>
            <div className="aw-hero-stats">
              <div><strong style={{ color: '#10b981' }}>98%</strong><span>Lượt giữ chỗ đúng giờ</span></div>
              <div><strong style={{ color: '#10b981' }}>24/7</strong><span>Hỗ trợ đặt lịch</span></div>
              <div><strong style={{ color: '#10b981' }}>{formatCurrency(60000)}</strong><span>Giá từ gói cơ bản</span></div>
            </div>
          </section>

          <section className="aw-grid">
            <div className="aw-flow">
              <article className="aw-card-section" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="aw-step-title"><span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>1</span> CHỌN CHI NHÁNH TRUNG TÂM</div>
                <div className="aw-options two-up">
                  {branches.length === 0 ? (
                    <div style={{ gridColumn: 'span 2', color: '#94a3b8', fontStyle: 'italic', padding: '10px' }}>Không có chi nhánh nào đang hoạt động.</div>
                  ) : branches.map((item) => (
                    <button key={item.id} type="button"
                      className={item.id === selectedBranch ? 'aw-option active' : 'aw-option'}
                      onClick={() => setSelectedBranch(item.id)}>
                      <div className="aw-option-head"><strong>{item.name}</strong></div>
                      <p>{item.address}</p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="aw-card-section" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="aw-step-title"><span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>2</span> CHỌN XE RỬA ĐĂNG KÝ</div>
                <div className="aw-options two-up">
                  {vehicleList.length > 0 ? vehicleList.map((item) => {
                    const vehicleKey = item.id || item._id || item.licensePlate;
                    const vehicleName = item.name || `${item.brand || ''} ${item.model || ''}`.trim() || item.licensePlate || 'Xe';
                    return (
                    <button key={vehicleKey} type="button"
                      className={vehicleKey === selectedVehicle ? 'aw-option active' : 'aw-option'}
                      onClick={() => setSelectedVehicle(vehicleKey)}>
                      <div className="aw-option-head"><strong>{vehicleName}</strong></div>
                      <p>{item.plate || item.licensePlate}</p>
                      <small>{item.type || item.vehicleType || 'Xe ô tô'}</small>
                    </button>
                    );
                  }) : (
                    <div className="aw-empty-state"><strong>Chưa có xe nào.</strong><p>Hãy thêm xe trong hồ sơ cá nhân trước khi đặt lịch.</p></div>
                  )}
                </div>
              </article>

              <article className="aw-card-section aw-services-panel" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="aw-step-title"><span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>3</span> CHỌN GÓI DỊCH VỤ RỬA XE</div>
                <div className="aw-options stacked scrollable">
                  {branchPackages.map(p => {
                    const isActive = p.id === selectedPackage;
                    return (
                      <div key={p.id} className={isActive ? 'aw-option aw-service active' : 'aw-option aw-service'}>
                        <button type="button" style={{all: 'unset', width: '100%', cursor: 'pointer'}} onClick={() => setSelectedPackage(p.id)}>
                          <div className="aw-option-head service-head">
                            <div><strong>{p.name}</strong><small>{p.duration} phút</small></div>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>{formatCurrency(p.price)}</span>
                          </div>
                          <p style={{margin: '8px 0'}}>{p.description}</p>
                        </button>
                        {isActive && p.subServices && p.subServices.length > 0 && (
                          <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(16,185,129,0.04)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'block', marginBottom: '8px' }}>Dịch vụ chọn thêm:</strong>
                            {p.subServices.map((sub) => {
                              const isChecked = (selectedSubServices[p.id] || []).includes(sub.name);
                              return (
                                <label key={sub.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                  <input type="checkbox" checked={isChecked}
                                    onChange={(e) => { const checked = e.target.checked;
                                      setSelectedSubServices(prev => { const current = prev[p.id] || [];
                                        return { ...prev, [p.id]: checked ? [...current, sub.name] : current.filter(x => x !== sub.name) };
                                      });
                                    }} disabled={!sub.isOptional} />
                                  <span style={{ flex: 1 }}>{sub.name} (+{sub.duration}p)</span>
                                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{sub.price > 0 ? `+${formatCurrency(sub.price)}` : 'Miễn phí'}</span>
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

              <article className="aw-card-section" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="aw-step-title"><span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>4</span> CHỌN NGÀY ĐẶT HẸN</div>
                <div className="aw-date-grid">
                  {bookingDates.map((item) => (
                    <button key={item.id} type="button"
                      className={item.id === selectedDate ? 'aw-date-card active' : 'aw-date-card'}
                      onClick={() => setSelectedDate(item.id)}
                      style={item.id === selectedDate ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.06)' } : {}}>
                      <span>{item.label}</span>
                      <strong>{item.day}</strong>
                      <small>Thg {item.month}</small>
                    </button>
                  ))}
                </div>

                <div className="aw-slot-title">KHUNG GIỜ NHẬN XE TẠI LÒ RỬA</div>
                <div className="aw-time-grid">
                  {slotsLoading ? <div style={{padding: '20px', gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8'}}>Đang tải lịch trống...</div> : 
                   availableSlots.length > 0 ? availableSlots.map((slotObj) => {
                    const timeLabel = slotObj.startTime;
                    const isDisabled = !slotObj.available;
                    const isVipOnly = slotObj.vipOnly;
                    const canBookVip = ['gold', 'diamond'].includes(currentUser?.tier);
                    const lockVip = isVipOnly && !canBookVip;
                    return (
                      <button key={timeLabel} type="button" disabled={isDisabled || lockVip}
                        className={timeLabel === selectedTime ? 'aw-time-card active' : 'aw-time-card'}
                        onClick={() => setSelectedTime(timeLabel)}
                        style={{ opacity: (isDisabled || lockVip) ? 0.5 : 1, position: 'relative',
                          ...(timeLabel === selectedTime ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.06)' } : {}) }}>
                        {timeLabel}
                        {isVipOnly && <span title="Chỉ VIP" style={{ position: 'absolute', top: -10, right: -10, fontSize: '1.2rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>👑</span>}
                        {isDisabled && !isVipOnly && <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, fontSize: '0.65rem', color: '#ef4444', textAlign: 'center' }}>Hết chỗ</span>}
                        {lockVip && <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, fontSize: '0.65rem', color: '#eab308', fontWeight: 'bold', textAlign: 'center' }}>Chỉ VIP</span>}
                      </button>
                    );
                   }) : timeSlots.map(slot => (
                    <button key={slot} type="button"
                      className={slot === selectedTime ? 'aw-time-card active' : 'aw-time-card'}
                      onClick={() => setSelectedTime(slot)}
                      style={slot === selectedTime ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.06)' } : {}}>{slot}</button>
                   ))}
                </div>
              </article>
            </div>

            <aside className="aw-summary">
              <div className="aw-summary-card" style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                <div className="aw-summary-title" style={{ color: '#10b981' }}>TỔNG HÓA ĐƠN THANH TOÁN</div>
                <div className="aw-summary-row"><span>Chi nhánh:</span><strong>{branch.name}</strong></div>
                <div className="aw-summary-row"><span>Xe:</span><strong>{vehicle ? `${vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || vehicle.licensePlate}` : 'Chưa có'}</strong></div>
                <div className="aw-summary-row"><span>Ngày:</span><strong>{date.label} ({date.iso})</strong></div>
                <div className="aw-summary-row"><span>Khung giờ:</span><strong className={selectedTime ? 'is-positive' : 'is-warning'} style={selectedTime ? { color: '#10b981' } : {}}>{selectedTime || 'Chưa chọn'}</strong></div>
                <div className="aw-summary-divider" />
                <div className="aw-summary-row price-row"><span>Gói: {pkg ? pkg.name : 'Chưa chọn'}</span><strong>{formatCurrency(totalBase)}</strong></div>

                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  {validPacks.length > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(16,185,129,0.04)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#10b981', display: 'block', marginBottom: '8px' }}>Thanh toán bằng Gói Lượt:</strong>
                      <select style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', background: '#fff' }}
                        value={selectedSlotPack || ''}
                        onChange={(e) => { setSelectedSlotPack(e.target.value || null); if (e.target.value) { setAppliedVoucher(null); } }}>
                        <option value="">Không sử dụng gói lượt</option>
                        {validPacks.map(p => (<option key={p._id || p.id} value={p._id || p.id}>Còn {p.remainingSlots} lần</option>))}
                      </select>
                    </div>
                  )}

                  {!isPayingWithPack && (
                    <VoucherPicker apiBase={apiBase} token={token} selected={appliedVoucher} onSelect={setAppliedVoucher} orderAmount={totalBase} compact={true} />
                  )}
                </div>

                <div className="aw-pricing">
                  <div><span>THỰC THU TẠI TIỆM</span><strong style={{ color: '#10b981' }}>{formatCurrency(total)}</strong></div>
                  {discount > 0 && (
                    <div style={{ color: '#10b981', marginTop: '4px' }}><span>KHUYẾN MÃI TỪ VOUCHER</span><strong>- {formatCurrency(discount)}</strong></div>
                  )}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(16,185,129,0.2)' }}>
                    <span>TÍCH ĐIỂM</span><strong style={{ color: '#10b981' }}>+{points} Điểm</strong>
                  </div>
                </div>

                {message ? <div className="aw-toast" style={{ borderRadius: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}>{message}</div> : null}
                {bookingCode ? <div className="aw-booking-code" style={{ color: '#10b981', fontWeight: 'bold' }}>Mã đặt chỗ: {bookingCode}</div> : null}

                <button className="aw-confirm" type="button" onClick={confirmBooking} disabled={bookingLoading}
                  style={{ background: '#10b981', color: '#fff', borderRadius: '12px', width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: bookingLoading ? 0.7 : 1 }}>
                  {bookingLoading ? 'ĐANG TẠO LỊCH HẸN...' : 'XÁC NHẬN ĐẶT GIỮ CHỖ'}
                </button>
              </div>
            </aside>
          </section>
          </>
          ) : null}

          {activeNav === 'recurring' ? <div style={{ paddingTop: 8 }}><RecurringBookingFlow user={currentUser} vehicles={vehicleList} apiBase={apiBase} token={token} /></div> : null}
          {activeNav === 'slot_pack' ? <div style={{ paddingTop: 8 }}><SlotPackFlow user={currentUser} vehicles={vehicleList} apiBase={apiBase} token={token} onGoToHistory={() => setActiveNav('history')} /></div> : null}
          {activeNav === 'history' ? <div style={{ paddingTop: 8 }}><BookingsHistory apiBase={apiBase} token={token} /></div> : null}
          {activeNav === 'gifts' ? <div style={{ paddingTop: 8 }}><LoyaltyGifts apiBase={apiBase} token={token} user={currentUser} refreshUser={refreshUser} /></div> : null}
          {activeNav === 'profile' ? <div style={{ paddingTop: 8 }}><CustomerProfile apiBase={apiBase} token={token} /></div> : null}
        </main>
      </div>

      {pendingDeposit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            {paymentCompleted ? (
              <div style={{ textAlign: 'center', padding: '36px 24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36, fontWeight: 900 }}>✓</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>THANH TOÁN SEPAY THÀNH CÔNG!</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 16px' }}>Hệ thống SePay đã ghi nhận giao dịch thành công. Lịch hẹn của bạn đã được xác nhận!</p>
                <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>Đang chuyển sang trang Lịch sử...</div>
              </div>
            ) : sepayData ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Quét Mã VietQR Chuyển Khoản</h3>
                  <button type="button" onClick={() => setSepayData(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 16, border: '1px solid #e2e8f0', display: 'inline-block', marginBottom: 14 }}>
                  <img src={sepayData.qrCodeUrl} alt="SePay VietQR" style={{ width: 220, height: 220, borderRadius: 10, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 16 }}>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Số tiền:</span>
                    <strong style={{ color: '#10b981', fontSize: 16, fontWeight: 800 }}>{formatCurrency(sepayData.amount)}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Nội dung CK:</span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{sepayData.transactionId}</strong>
                  </div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px 14px', borderRadius: 10, color: '#10b981', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="animate-spin">🔄</span> Đang chờ ngân hàng xác nhận giao dịch...
                </div>
                <button type="button" onClick={() => { setSepayData(null); setPendingDeposit(null); }}
                  style={{ width: '100%', marginTop: 14, padding: 10, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  ← Quay lại
                </button>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div style={{ background: '#fff', padding: '24px 24px 0', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>💲</div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Thanh toán</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Vui lòng thanh toán để hoàn tất đặt lịch</p>
                </div>

                <div style={{ padding: '16px 24px 24px' }}>
                  {/* Summary */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Tổng dịch vụ</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(pendingDeposit.finalPrice || 0)}</strong>
                    </div>
                    {/* Payment amount options display */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div style={{ borderRadius: 10, border: '2px solid #e2e8f0', padding: '10px 12px', background: '#fff' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Thanh toán cọc 30%</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{formatCurrency(pendingDeposit.depositAmount || 0)}</div>
                      </div>
                      <div style={{ borderRadius: 10, border: '2px solid #10b981', background: 'rgba(16,185,129,0.06)', padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 2 }}>Thanh toán 100%</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>{formatCurrency(pendingDeposit.finalPrice || 0)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Còn lại (thanh toán sau)</span>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.82rem' }}>{formatCurrency(Math.max(0, (pendingDeposit.finalPrice || 0) - (pendingDeposit.depositAmount || 0)))}</span>
                    </div>
                  </div>

                  {/* SỐ TIỀN CẦN THANH TOÁN label */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>SỐ TIỀN CẦN THANH TOÁN</div>

                  {/* Payment method selection */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>CHỌN PHƯƠNG THỨC</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { id: 'bank', label: 'Ngân hàng', icon: '🏦' },
                        { id: 'vnpay', label: 'VNPay', icon: '💳' },
                        { id: 'wallet', label: 'Ví AutoWash', icon: '👛' },
                        { id: 'cash', label: 'Tiền mặt', icon: '💵' },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedPayMethod(m.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '10px 4px', borderRadius: 10, border: '2px solid',
                            borderColor: selectedPayMethod === m.id ? '#10b981' : '#e2e8f0',
                            background: selectedPayMethod === m.id ? 'rgba(16,185,129,0.06)' : '#fff',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                          <span style={{ fontSize: 20 }}>{m.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: selectedPayMethod === m.id ? '#10b981' : '#64748b', textAlign: 'center' }}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action button */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selectedPayMethod === 'bank') && (
                      <button type="button" onClick={payDeposit} disabled={depositLoading}
                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: depositLoading ? 0.7 : 1 }}>
                        {depositLoading ? 'ĐANG TẠO MÃ VIETQR...' : `HIỆN MÃ VIETQR SEPAY`}
                      </button>
                    )}
                    {selectedPayMethod === 'vnpay' && (
                      <button type="button" onClick={payWithVnpay} disabled={vnpayLoading}
                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: vnpayLoading ? 0.7 : 1 }}>
                        {vnpayLoading ? 'ĐANG CHUYỂN HƯỚNG...' : `THANH TOÁN VNPay ${formatCurrency(pendingDeposit.depositAmount || 0)}`}
                      </button>
                    )}
                    {selectedPayMethod === 'wallet' && (
                      <button type="button" onClick={payWithWallet} disabled={walletLoading}
                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: walletLoading ? 0.7 : 1 }}>
                        {walletLoading ? 'ĐANG THANH TOÁN...' : `THANH TOÁN VÍ (${formatCurrency(currentUser?.walletBalance || 0)})`}
                      </button>
                    )}
                    {selectedPayMethod === 'cash' && (
                      <button type="button"
                        onClick={() => {
                          setMessage(`Đặt lịch thành công! Vui lòng đến tiệm để thanh toán tiền mặt ${formatCurrency(pendingDeposit.depositAmount || 0)} khi làm dịch vụ.`);
                          setPendingDeposit(null);
                        }}
                        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                        XÁC NHẬN — TRẢ TIỀN MẶT TẠI TIỆM
                      </button>
                    )}
                    <button type="button" onClick={() => setPendingDeposit(null)}
                      style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                      ← Quay lại
                    </button>
                  </div>

                  <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: '#cbd5e1', textAlign: 'center' }}>
                    Tiền cọc sẽ không được hoàn lại nếu bạn không đến đúng giờ hẹn.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
