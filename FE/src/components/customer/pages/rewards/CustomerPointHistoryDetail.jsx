import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowDown, ArrowLeft, ArrowUp, Building, Calendar, CheckCircle, Clock, Coin,
  FileText, MathOperations, Receipt, Trophy, User, Warning, Tag, CreditCard, Bookmarks,
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
  return new Date(dateStr).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}
function getTierDisplayName(tierId, tierName) {
  if (tierName && !['thành viên', 'customer', 'user'].includes(String(tierName).toLowerCase())) return tierName;
  const m = { bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng', diamond: 'Kim Cương' };
  return m[String(tierId || '').toLowerCase()] || 'Đồng';
}
function getTypeLabel(type) {
  const m = {
    earned: { label: 'Tích điểm thưởng (+)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    redeemed: { label: 'Đổi quà / Sử dụng điểm (-)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    expired: { label: 'Điểm hết hạn (-)', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    adjustment: { label: 'Truy thu / Điều chỉnh điểm (+/-)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  };
  return m[type] || { label: type || 'Giao dịch điểm', color: 'bg-blue-100 text-blue-800 border-blue-200' };
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

export default function CustomerPointHistoryDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('tab') || 'reward';
  const id = location.pathname.split('/rewards/history/')[1] || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api(`/loyalty/my-history/${id}`);
      if (!res.ok) throw new Error(await readErr(res));
      const json = await res.json();
      setData(json?.data ?? json);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết lịch sử điểm thưởng');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

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
        <button onClick={() => navigate(`/rewards?tab=${returnTab}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Quay lại
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
  const refBooking = (typeof data.referenceId === 'object' && data.referenceId) ? data.referenceId : {};
  const isEarned = data.type === 'earned';
  const branchName = snap.branchName || refBooking.branchId?.name || '';
  const branchAddress = snap.branchAddress || refBooking.branchId?.address || '';
  const bookingCode = snap.bookingCode || refBooking.bookingCode || '';
  const bookingType = snap.bookingType || refBooking.bookingType || 'single';
  const bookingTypeInfo = getBookingTypeLabel(bookingType);
  const pkgName = snap.packageName || refBooking.packageName || refBooking.packageId?.name || '';
  const pkgPrice = snap.packagePrice ?? refBooking.packagePrice ?? refBooking.packageId?.price ?? 0;
  const baseRate = snap.baseRate || 5;
  const multiplier = snap.multiplier || 1;
  const effectiveRate = snap.effectiveRate || Number((baseRate * multiplier).toFixed(2));

  // Sub-services & Voucher (Prioritize immutable snapshots over live packageId)
  const rawIncluded = (Array.isArray(refBooking.includedSubServices) && refBooking.includedSubServices.length > 0)
    ? refBooking.includedSubServices
    : (Array.isArray(snap.includedSubServices) && snap.includedSubServices.length > 0)
      ? snap.includedSubServices
      : (Array.isArray(refBooking.packageSnapshot?.subServices) && refBooking.packageSnapshot.subServices.length > 0)
        ? refBooking.packageSnapshot.subServices
        : (refBooking.packageId?.subServices || []);
  const includedSubServices = Array.isArray(rawIncluded)
    ? rawIncluded.filter(s => s.isOptional === false || s.isOptional === undefined)
    : [];
  const selectedSubs = refBooking.selectedSubServices || snap.selectedSubServices || snap.subServices || [];
  const addedSubServices = Array.isArray(selectedSubs)
    ? selectedSubs.filter(s => s.isOptional !== false)
    : [];
  const voucherCode = snap.voucherCode || refBooking.voucherCode || '';
  const discountAmount = snap.discountAmount || refBooking.discountAmount || 0;

  let orderAmount = snap.orderAmount || refBooking.finalPrice || 0;
  if (!orderAmount && data.points && effectiveRate > 0) {
    orderAmount = Math.round((Math.abs(data.points) * 100) / effectiveRate);
  }
  if (!orderAmount) orderAmount = pkgPrice || 0;

  const displayPoints = (orderAmount > 0 && effectiveRate > 0)
    ? Math.floor((orderAmount * effectiveRate) / 100)
    : Math.abs(data.points);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <button onClick={() => navigate(`/rewards?tab=${returnTab}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <span className="text-xs font-mono font-bold text-slate-400">ID: {data._id}</span>
      </div>

      <div className="rounded-3xl p-6 text-slate-800 shadow-sm border border-slate-200/80 relative overflow-hidden"
        style={{ background: isEarned ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ${isEarned ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {isEarned ? <ArrowUp size={30} weight="bold" /> : <ArrowDown size={30} weight="bold" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold ${isEarned ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isEarned ? 'TÍCH ĐIỂM THƯỞNG (+)' : data.type === 'redeemed' ? 'ĐỔI QUÀ (-)' : data.type === 'adjustment' ? 'TRUY THU/ĐIỀU CHỈNH' : 'ĐIỂM HẾT HẠN (-)'}
                </span>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Clock size={14} /> {formatDate(data.createdAt)}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-800 mt-1">
                {isEarned ? `+${formatCurrency(data.points)} điểm` : `${formatCurrency(data.points)} điểm`}
              </h1>
            </div>
          </div>
          {bookingCode && (
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-3.5 text-right shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">Mã Đơn hàng</span>
              <span className="text-base font-mono font-black text-blue-700">{bookingCode}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <User size={18} className="text-blue-600" weight="fill" /> Thông tin của bạn
          </h2>
          <div className="flex items-center gap-4">
            <img src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
            <div>
              <h3 className="text-base font-extrabold text-slate-800">{user.name || 'Khách hàng'}</h3>
              <p className="text-xs text-slate-500">{user.phone || user.email || '-'}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Hạng hiện tại:</span>
                {user.tier && <TierBadge tier={user.tier} />}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Điểm khả dụng</span>
              <strong className="text-base font-extrabold text-emerald-700">{formatCurrency(user.loyaltyPoints)} điểm</strong>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Tổng tích lũy</span>
              <strong className="text-base font-extrabold text-blue-700">{formatCurrency(user.lifetimePoints)} điểm</strong>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText size={18} className="text-amber-500" weight="fill" /> Chi tiết & Lý do (Snapshot)
          </h2>
          <p className="text-sm font-bold text-slate-800 leading-relaxed">{data.description}</p>
          {orderAmount > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-100">
              <div><span className="text-slate-400">Đơn hàng:</span> <strong className="text-slate-800">{formatCurrency(orderAmount)}₫</strong></div>
              <div><span className="text-slate-400">Tỷ lệ tích:</span> <strong className="text-blue-600">{effectiveRate}%</strong> <span className="text-slate-400 text-[10px]">(Cơ bản {baseRate}% x{multiplier})</span></div>
              {bookingCode && <div><span className="text-slate-400">Mã đơn:</span> <span className="font-mono font-bold text-slate-700">{bookingCode}</span></div>}
              {branchName && <div><span className="text-slate-400">Chi nhánh:</span> <strong className="text-emerald-700">{branchName}</strong>{branchAddress && <span className="text-slate-400"> - {branchAddress}</span>}</div>}
            </div>
          )}
        </div>
      </div>

      {(bookingCode || pkgName) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Receipt size={18} className="text-blue-600" weight="fill" /> Chi tiết Đơn hàng
            </h2>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold border ${bookingTypeInfo.color}`}>
              <Bookmarks size={14} /> {bookingTypeInfo.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {bookingCode && <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"><span className="text-slate-400 block font-semibold">Mã đơn hàng:</span><strong className="text-sm font-mono font-black text-blue-700">{bookingCode}</strong></div>}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"><span className="text-slate-400 block font-semibold">Loại đơn hàng:</span><strong className="text-xs font-extrabold text-slate-800">{bookingTypeInfo.label}</strong></div>
            {orderAmount > 0 && <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"><span className="text-slate-400 block font-semibold">Tổng tiền:</span><strong className="text-sm font-black text-emerald-700">{formatCurrency(orderAmount)} ₫</strong></div>}
            {snap.paymentMethod && <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"><span className="text-slate-400 block font-semibold">PT thanh toán:</span><strong className="text-xs font-extrabold text-slate-800">{snap.paymentMethod}</strong></div>}
          </div>
          {pkgName && (
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Gói dịch vụ chính</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Tag size={16} className="text-blue-600" weight="fill" /> {pkgName}
                  </span>
                </div>
                {pkgPrice > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Giá gói cơ bản</span>
                    <span className="font-extrabold text-sm text-slate-900">{formatCurrency(pkgPrice)} ₫</span>
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
          {branchName && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs space-y-2">
              <span className="font-extrabold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building size={16} className="text-emerald-700" weight="fill" /> Chi nhánh
              </span>
              <div className="text-slate-700"><strong className="font-bold">{branchName}</strong>{branchAddress && <span className="text-slate-500"> - {branchAddress}</span>}</div>
            </div>
          )}
        </div>
      )}

      {orderAmount > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <MathOperations size={18} className="text-emerald-600" weight="fill" /> Công thức tính điểm
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80"><span className="text-xs font-medium text-slate-500 block mb-1">Tiền thanh toán</span><p className="text-lg font-extrabold text-slate-800">{formatCurrency(orderAmount)} ₫</p></div>
            <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100"><span className="text-xs font-medium text-blue-700 block mb-1">Tỷ lệ cơ bản</span><p className="text-lg font-extrabold text-blue-700">{baseRate}%</p></div>
            <div className="rounded-xl bg-amber-50/50 p-4 border border-amber-100"><span className="text-xs font-medium text-amber-800 block mb-1">Hệ số hạng</span><div className="flex items-center gap-1.5"><span className="text-sm font-extrabold text-amber-800">{getTierDisplayName(snap.tier, snap.tierName)}</span><span className="text-xs font-bold text-emerald-600">x{multiplier}</span></div></div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 space-y-3 shadow-2xs">
            <p className="text-xs font-semibold text-slate-600">Điểm tích lũy = Số tiền × Tỷ lệ tích cơ bản × Hệ số hạng</p>
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-sm font-extrabold text-slate-800 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
              <span className="text-emerald-700 text-base font-black">{formatCurrency(displayPoints)} điểm</span>
              <span className="text-xs font-bold text-slate-700 font-sans">= {formatCurrency(orderAmount)} ₫ × ({baseRate}% × {multiplier})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
