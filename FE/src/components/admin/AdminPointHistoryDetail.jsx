import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Coin,
  FileText,
  MathOperations,
  Receipt,
  Trophy,
  User,
  Warning,
  Tag,
  CreditCard,
  Bookmarks,
} from '@phosphor-icons/react';
import TierBadge from '@/components/ui/TierBadge';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
  });
}

async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; } catch { return `Lỗi ${res.status}`; }
}

function formatCurrency(val) {
  if (!val && val !== 0) return '0';
  return Number(val).toLocaleString('vi-VN');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTierDisplayName(tierId, tierName) {
  if (tierName && !['thành viên', 'customer', 'user'].includes(String(tierName).toLowerCase())) {
    return tierName;
  }
  const idLower = String(tierId || '').toLowerCase();
  switch (idLower) {
    case 'bronze':
      return 'Đồng';
    case 'silver':
      return 'Bạc';
    case 'gold':
      return 'Vàng';
    case 'diamond':
      return 'Kim Cương';
    default:
      return 'Đồng';
  }
}

function getTypeLabel(type) {
  switch (type) {
    case 'earned':
      return { label: 'Tích điểm thưởng (+)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'redeemed':
      return { label: 'Đổi quà / Sử dụng điểm (-)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'expired':
      return { label: 'Điểm hết hạn (-)', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    case 'adjustment':
      return { label: 'Truy thu / Điều chỉnh điểm (+/-)', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    default:
      return { label: type || 'Giao dịch điểm', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

function getPaymentStatusLabel(status) {
  switch (status) {
    case 'paid':
      return 'Đã thanh toán đủ';
    case 'deposit_paid':
      return 'Đã đặt cọc';
    case 'pending':
      return 'Chờ thanh toán';
    case 'unpaid':
      return 'Chưa thanh toán';
    case 'refunded':
      return 'Đã hoàn tiền';
    case 'cancelled':
      return 'Đã hủy thanh toán';
    default:
      return status || 'Đã hoàn tất';
  }
}

function getBookingTypeLabel(type) {
  if (type === 'recurring') return { label: 'Đặt lịch định kỳ', color: 'bg-purple-100 text-purple-800 border-purple-200' };
  if (type === 'slot_pack_usage') return { label: 'Gói lượt rửa xe', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  return { label: 'Đặt 1 lần (Đơn thường)', color: 'bg-blue-100 text-blue-800 border-blue-200' };
}

function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83" />
    </svg>
  );
}

export default function AdminPointHistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isManager = location.pathname.startsWith('/manager');
  const backRoute = isManager ? '/manager/vouchers?tab=history' : '/admin/rewards?tab=history';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/loyalty/admin/history/${id}`);
      if (!res.ok) throw new Error(await readErr(res));
      const json = await res.json();
      setData(json?.data ?? json);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết lịch sử điểm thưởng');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Spinner size={30} />
        <p className="mt-3 text-xs font-semibold text-slate-500">Đang tải chi tiết giao dịch điểm thưởng...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8">
        <button
          onClick={() => navigate(backRoute)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Quay lại Lịch sử điểm thưởng
        </button>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          <Warning size={32} weight="duotone" />
          <p className="text-sm font-semibold">{error || 'Không tìm thấy dữ liệu giao dịch'}</p>
        </div>
      </div>
    );
  }

  const user = data.userId || {};
  const snap = data.snapshot || {};
  const refBooking = (typeof data.referenceId === 'object' && data.referenceId) ? data.referenceId : null;
  const isEarned = data.type === 'earned';
  const branchObj = (typeof snap.branchId === 'object' && snap.branchId) ? snap.branchId : refBooking?.branchId || {};
  const branchName = snap.branchName || branchObj.name || '';
  const branchAddress = snap.branchAddress || branchObj.address || '';
  let bookingCode = snap.bookingCode || refBooking?.bookingCode || '';
  if (!bookingCode && refBooking?._id) {
    bookingCode = 'AWP-' + String(refBooking._id).slice(-8).toUpperCase();
  } else if (!bookingCode && typeof data.referenceId === 'string' && data.referenceId) {
    bookingCode = 'AWP-' + String(data.referenceId).slice(-8).toUpperCase();
  }
  const bookingType = snap.bookingType || refBooking?.bookingType || 'single';
  const bookingTypeInfo = getBookingTypeLabel(bookingType);
  const pkgObj = refBooking?.packageId || {};
  const pkgName = snap.packageName || pkgObj.name || '';
  const pkgPrice = snap.packagePrice || pkgObj.price || 0;

  const baseRate = snap.baseRate || 5;
  const multiplier = snap.multiplier || 1;
  const effectiveRate = snap.effectiveRate || Number((baseRate * multiplier).toFixed(2));

  // Included & Added sub-services & Voucher (Prioritize immutable snapshots)
  const rawIncluded = (Array.isArray(refBooking?.includedSubServices) && refBooking.includedSubServices.length > 0)
    ? refBooking.includedSubServices
    : (Array.isArray(snap.includedSubServices) && snap.includedSubServices.length > 0)
      ? snap.includedSubServices
      : (Array.isArray(refBooking?.packageSnapshot?.subServices) && refBooking.packageSnapshot.subServices.length > 0)
        ? refBooking.packageSnapshot.subServices
        : (pkgObj.subServices || []);
  const includedSubServices = Array.isArray(rawIncluded)
    ? rawIncluded.filter(s => s.isOptional === false || s.isOptional === undefined)
    : [];
  const selectedSubs = refBooking?.selectedSubServices || snap.selectedSubServices || snap.subServices || [];
  const addedSubServices = Array.isArray(selectedSubs)
    ? selectedSubs.filter(s => s.isOptional !== false)
    : [];
  const voucherCode = snap.voucherCode || refBooking?.voucherCode || '';
  const discountAmount = snap.discountAmount || refBooking?.discountAmount || 0;

  // Ground truth order amount calculation: ensure mathematical precision
  let orderAmount = snap.orderAmount || refBooking?.finalAmount || refBooking?.totalPrice || 0;
  if (!orderAmount && data.points && effectiveRate > 0) {
    orderAmount = Math.round((Math.abs(data.points) * 100) / effectiveRate);
  }
  if (!orderAmount) {
    orderAmount = pkgPrice || 0;
  }

  // Display points guaranteed to match the exact formula: Points = Math.floor(orderAmount * effectiveRate / 100)
  const displayPoints = (orderAmount > 0 && effectiveRate > 0)
    ? Math.floor((orderAmount * effectiveRate) / 100)
    : Math.abs(data.points);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <button
          onClick={() => navigate(backRoute)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Quay lại Lịch sử điểm thưởng
        </button>

        <span className="text-xs font-mono font-bold text-slate-400">ID: {data._id}</span>
      </div>

      {/* Hero Card / Points Summary */}
      <div
        className="rounded-3xl p-6 text-slate-800 shadow-sm border border-slate-200/80 relative overflow-hidden"
        style={{
          background: isEarned
            ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
            : 'linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ${
                isEarned ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {isEarned ? <ArrowUp size={30} weight="bold" /> : <ArrowDown size={30} weight="bold" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold ${
                    isEarned ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isEarned ? 'TÍCH ĐIỂM THƯỞNG (+)' : data.type === 'redeemed' ? 'ĐỔI QUÀ (-)' : data.type === 'adjustment' ? 'TRUY THU/ĐIỀU CHỈNH' : 'ĐIỂM HẾT HẠN (-)'}
                </span>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock size={14} /> {formatDate(data.createdAt)}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-800 mt-1">
                {isEarned ? `+${formatCurrency(data.points)} điểm` : `${formatCurrency(data.points)} điểm`}
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-3.5 text-right shadow-2xs min-w-[200px]">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">Mã Giao dịch</span>
              <span className="text-sm font-mono font-bold text-slate-700">{data._id}</span>
            </div>
            {bookingCode && (
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-3.5 text-right shadow-2xs min-w-[200px]">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  {bookingCode.startsWith('SP-') ? 'Gói lượt' : 'Mã Đơn hàng'}
                </span>
                <span className="text-base font-mono font-black text-blue-700">{bookingCode}</span>
                <button
                  onClick={() => {
                    const bId = refBooking?._id || (typeof data.referenceId === 'string' ? data.referenceId : null) || data.referenceId;
                    if (bId) {
                      if (bookingCode.startsWith('SP-')) {
                        navigate(isManager ? '/manager/slot-packs' : '/admin/slot-packs', { 
                          state: { openSlotPack: { _id: bId, packCode: bookingCode, userId: data.userId } } 
                        });
                      } else {
                        navigate(isManager ? '/manager/bookings' : '/admin/bookings', { 
                          state: { openBooking: { _id: bId, bookingCode, userId: data.userId } } 
                        });
                      }
                    }
                  }}
                  className="mt-1 text-[11px] text-blue-600 hover:text-blue-700 underline font-medium block ml-auto"
                >
                  {bookingCode.startsWith('SP-') ? 'Xem gói lượt' : 'Xem đơn'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Information Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Khách hàng */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <User size={18} className="text-blue-600" weight="fill" />
            Thông tin Khách hàng
          </h2>

          <div className="flex items-center gap-4">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
            />
            <div>
              <h3 className="text-base font-extrabold text-slate-800">{user.name || 'Khách hàng vô danh'}</h3>
              <p className="text-xs text-slate-500">{user.phone || user.email || '-'}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Hạng hiện tại:</span>
                {user.tier && <TierBadge tier={user.tier} />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Điểm khả dụng hiện tại</span>
              <strong className="text-base font-extrabold text-emerald-700">{formatCurrency(user.loyaltyPoints)} điểm</strong>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Tổng điểm tích lũy</span>
              <strong className="text-base font-extrabold text-blue-700">{formatCurrency(user.lifetimePoints)} điểm</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Chi tiết Diễn giải & Lý do (Snapshot) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText size={18} className="text-amber-500" weight="fill" />
            Chi tiết & Lý do (Snapshot)
          </h2>

          <p className="text-sm font-bold text-slate-800 leading-relaxed">
            {data.description && bookingCode && !data.description.includes(bookingCode)
              ? `${data.description} (Mã đơn hàng: ${bookingCode})`
              : data.description}
          </p>

          {orderAmount > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-100">
              <div>
                <span className="text-slate-400">Đơn hàng:</span>{' '}
                <strong className="text-slate-800">{formatCurrency(orderAmount)}₫</strong>
              </div>
              <div>
                <span className="text-slate-400">Tỷ lệ tích:</span>{' '}
                <strong className="text-blue-600">{effectiveRate}%</strong>{' '}
                <span className="text-slate-400 text-[10px]">(Cơ bản {baseRate}% x{multiplier})</span>
              </div>
              {bookingCode && (
                <div>
                  <span className="text-slate-400">Mã đơn:</span>{' '}
                  <span className="font-mono font-bold text-slate-700">{bookingCode}</span>
                </div>
              )}
              {branchName && (
                <div>
                  <span className="text-slate-400">Chi nhánh:</span>{' '}
                  <strong className="text-emerald-700">{branchName}</strong>
                  {branchAddress && <span className="text-slate-400"> - {branchAddress}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Chi tiết Đơn hàng & Dịch vụ Thanh toán (Bao gồm cả Chi nhánh thực hiện & Loại đơn) */}
      {(refBooking || bookingCode) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Receipt size={18} className="text-blue-600" weight="fill" />
              Chi tiết Đơn hàng & Dịch vụ Thanh toán
            </h2>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold border ${bookingTypeInfo.color}`}>
              <Bookmarks size={14} /> {bookingTypeInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 block font-semibold">Mã đơn hàng:</span>
              <strong className="text-sm font-mono font-black text-blue-700">{bookingCode}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 block font-semibold">Loại đơn hàng:</span>
              <strong className="text-xs font-extrabold text-slate-800">{bookingTypeInfo.label}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 block font-semibold">Tổng tiền thanh toán:</span>
              <strong className="text-sm font-black text-emerald-700">
                {formatCurrency(orderAmount)} ₫
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 block font-semibold">Trạng thái thanh toán:</span>
              <strong className="text-xs font-bold text-slate-800">
                {getPaymentStatusLabel(refBooking?.paymentStatus || snap.paymentStatus || 'paid')}
              </strong>
            </div>
          </div>

          {/* Dịch vụ đã chọn & Chi tiết gói */}
          {(pkgName || pkgObj.name) && (
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Gói dịch vụ chính</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Tag size={16} className="text-blue-600" weight="fill" /> {pkgName || pkgObj.name}
                  </span>
                </div>
                {(pkgPrice > 0 || pkgObj.price > 0) && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Giá gói cơ bản</span>
                    <span className="font-extrabold text-sm text-slate-900">{formatCurrency(pkgPrice || pkgObj.price)} ₫</span>
                  </div>
                )}
              </div>

              {/* Các dịch vụ bao gồm trong gói */}
              {includedSubServices.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Các dịch vụ bao gồm trong gói:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {includedSubServices.map((sub, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold">
                        <CheckCircle size={13} weight="fill" className="text-emerald-600" /> {typeof sub === 'string' ? sub : sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Các dịch vụ chọn thêm */}
              {addedSubServices.length > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Dịch vụ chọn thêm:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {addedSubServices.map((sub, idx) => {
                      const subName = typeof sub === 'string' ? sub : sub.name;
                      const subPrice = typeof sub === 'object' ? sub.price : 0;
                      return (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                          <span>+ {subName}</span>
                          {subPrice > 0 && <span className="text-[10px] text-indigo-500">({formatCurrency(subPrice)} ₫)</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Voucher áp dụng */}
              {(voucherCode || discountAmount > 0) && (
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px]">🎫 Voucher áp dụng</span>
                    {voucherCode && <span className="font-mono font-black text-amber-900 text-xs uppercase tracking-wider">Mã: {voucherCode}</span>}
                  </div>
                  {discountAmount > 0 && (
                    <span className="font-black text-amber-700 text-xs">-{formatCurrency(discountAmount)} ₫</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chi nhánh thực hiện (Tích hợp trực tiếp vào trong Khối Đơn hàng & Dịch vụ Thanh toán) */}
          {branchName && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs space-y-2">
              <span className="font-extrabold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building size={16} className="text-emerald-700" weight="fill" />
                Chi nhánh rửa xe thực hiện đơn hàng:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500">Tên chi nhánh:</span>{' '}
                  <strong className="font-bold text-slate-800">{branchName}</strong>
                </div>
                {branchAddress && (
                  <div>
                    <span className="text-slate-500">Địa chỉ:</span>{' '}
                    <span className="font-semibold text-slate-800">{branchAddress}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card 4: Công thức & Snapshot Tích điểm tại thời điểm phát sinh */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <MathOperations size={18} className="text-emerald-600" weight="fill" />
            Công thức & Snapshot Tích điểm tại thời điểm phát sinh
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} /> Dữ liệu Bất biến (Immutable Snapshot)
          </span>
        </div>

        {orderAmount > 0 ? (
          <div className="space-y-5">
            {/* Grid 3 thông số chính */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
                <span className="text-xs font-medium text-slate-500 block mb-1">1. Tiền thanh toán đơn</span>
                <p className="text-lg font-extrabold text-slate-800">{formatCurrency(orderAmount)} ₫</p>
              </div>

              <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100">
                <span className="text-xs font-medium text-blue-700 block mb-1">2. Tỷ lệ cơ bản hệ thống</span>
                <p className="text-lg font-extrabold text-blue-700">{baseRate}%</p>
              </div>

              <div className="rounded-xl bg-amber-50/50 p-4 border border-amber-100">
                <span className="text-xs font-medium text-amber-800 block mb-1">3. Hạng lúc đó & Hệ số</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-amber-800">{getTierDisplayName(snap.tier, snap.tierName)}</span>
                  <span className="text-xs font-bold text-emerald-600">x{multiplier}</span>
                </div>
              </div>
            </div>

            {/* Công thức tính điểm tự nhiên */}
            <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 space-y-3 shadow-2xs text-slate-800">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MathOperations size={16} className="text-emerald-600" />
                  Công thức tính điểm thưởng:
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  Đã xác nhận
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Điểm tích lũy = Số tiền thanh toán đơn hàng × Tỷ lệ tích cơ bản × Hệ số hạng
              </p>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-sm font-extrabold text-slate-800 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                <span className="text-emerald-700 text-base font-black">
                  {formatCurrency(displayPoints)} điểm
                </span>
                <span className="text-xs font-bold text-slate-700 font-sans">
                  = {formatCurrency(orderAmount)} ₫ × ({baseRate}% × {multiplier})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Giao dịch này không phụ thuộc vào đơn hàng thanh toán (ví dụ: điều chỉnh điểm thủ công hoặc điểm thưởng sự kiện).
          </p>
        )}
      </div>
    </div>
  );
}
