import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CurrencyCircleDollar, TrendUp, TrendDown } from '@phosphor-icons/react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAYMENT_STATUS_MAP = {
  pending: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  paid: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  failed: { label: 'Thất bại', cls: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'Đã hoàn tiền', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const METHOD_MAP = {
  cash: 'Tiền mặt',
  bank: 'Chuyển khoản',
};

function formatCurrency(v) { return `${new Intl.NumberFormat('vi-VN').format(v || 0)}đ`; }
function formatDate(d) { return new Date(d).toLocaleDateString('vi-VN'); }
function formatDateTime(d) { return new Date(d).toLocaleString('vi-VN'); }

function StatusBadge({ status }) {
  const s = PAYMENT_STATUS_MAP[status] || { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

export default function PaymentHistoryPage({ onBack, apiBase, token }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailPayment, setDetailPayment] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    let url = `${apiBase || API_BASE}/payments/my?withStats=true&page=${page}&limit=10`;
    if (filterStatus !== 'all') url += `&status=${filterStatus}`;
    if (filterMonth) url += `&month=${filterMonth}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(payload => {
        const responseData = payload?.data || payload;
        let paymentsList = [];
        if (responseData && responseData.payments) {
           paymentsList = responseData.payments;
           if (responseData.stats) setStats(responseData.stats);
        } else if (Array.isArray(responseData)) {
           paymentsList = responseData;
        }

        if (payload?.pagination) {
          setTotalPages(payload.pagination.totalPages || 1);
        }

        setPayments(paymentsList);
      })
      .catch(() => { showToast('Không thể tải lịch sử thanh toán', 'error'); setPayments([]); })
      .finally(() => setLoading(false));
  }, [apiBase, token, filterStatus, filterMonth, page]);

  async function openDetail(payment) {
    setDetailPayment(null);
    setShowDetail(true);
    try {
      const bId = payment.bookingId?._id || payment.bookingId || payment.bookingData?._id;
      if (payment.bookingData) {
        // Fallback detail from booking data
        setDetailPayment({
          ...payment,
          bookingId: payment.bookingData,
        });
        return;
      }
      const res = await fetch(`${apiBase || API_BASE}/payments/booking/${bId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải chi tiết');
      const payload = await res.json();
      setDetailPayment(payload?.data || payload);
    } catch (e) {
      showToast(e.message, 'error');
      setShowDetail(false);
    }
  }

  return (
    <div className="space-y-6">
      <main className="w-full">
        
        {/* Filters and Stats Section */}
        <div className="mb-8 space-y-6">
          {stats && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                <CurrencyCircleDollar size={28} weight="duotone" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-0.5">Chi tiêu tháng này</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.currentMonthTotal)}</p>
                  {(() => {
                    const current = stats.currentMonthTotal || 0;
                    const prev = stats.previousMonthTotal || 0;
                    let percent = 0;
                    if (prev === 0 && current > 0) percent = 100;
                    else if (prev > 0) percent = ((current - prev) / prev) * 100;
                    
                    if (percent === 0) return <span className="text-[11px] text-slate-400">Không đổi so với tháng trước</span>;
                    const isUp = percent > 0;
                    return (
                      <div className={`flex items-center gap-1 text-[12px] font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUp ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                        <span>{Math.abs(percent).toFixed(1)}% so với tháng trước</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Chi tiêu 6 tháng gần nhất</h3>
              <div className="h-48 w-full">
                {stats && stats.months && stats.months.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                    <YAxis tickFormatter={(val) => `${val / 1000}k`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} />
                    <Tooltip 
                      formatter={(val) => [formatCurrency(val), 'Chi tiêu']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Bar dataKey="totalAmount" radius={[4, 4, 0, 0]}>
                      {stats.months.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === stats.months.length - 1 ? '#10b981' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  <span className="text-sm">Chưa có dữ liệu chi tiêu</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Chi tiêu theo xe</h3>
            <div className="flex-1 overflow-y-auto max-h-48 pr-2">
              {stats && stats.vehicles && stats.vehicles.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.vehicles.map((v, i) => (
                    <div key={v.vehicleId || i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 uppercase">{v.licensePlate}</p>
                        <p className="text-xs text-slate-500 capitalize">{v.vehicleType === 'unknown' ? 'Khác' : v.vehicleType} {v.brand ? `· ${v.brand}` : ''}</p>
                      </div>
                      <div className="text-right font-bold text-emerald-600 text-sm">
                        {formatCurrency(v.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  <span className="text-sm">Chưa có dữ liệu chi tiêu</span>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="paid">Thành công</option>
                <option value="pending">Chờ thanh toán</option>
              </select>
            </div>
            <div className="flex-1">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Đang tải...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Không tìm thấy giao dịch nào phù hợp</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => {
              const pId = p._id || p.id;
              const booking = p.bookingId || p.bookingData || {};
              return (
                <div key={pId} onClick={() => openDetail(p)}
                  className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {booking?.packageId?.name || booking?.packageName || booking?.branchId?.name || booking?.branchName || 'Thanh toán'}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-slate-400">
                        {booking?.bookingDate ? formatDate(booking.bookingDate) : ''}
                        {booking?.startTime ? ` ${booking.startTime}` : ''}
                        {p.method && ` · ${METHOD_MAP[p.method] || p.method}`}
                        {booking?.bookingCode && <span className="font-mono font-bold text-emerald-600"> · #{booking.bookingCode}</span>}
                      </p>
                      {p.paymentType === 'deposit' && booking?.finalPrice && (
                        <p className="text-xs text-amber-600 font-semibold mt-1.5">
                          Đặt cọc 30% · Còn lại {formatCurrency(Math.max(0, (booking.finalPrice || 0) - (p.amount || 0)))}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.paymentType === 'deposit' ? 'Đặt cọc' : p.paymentType === 'remaining' ? 'Còn lại' : 'Toàn bộ'}</p>
                    </div>
                  </div>
                  {p.transactionId && (
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">Mã GD: {p.transactionId}</div>
                  )}
                  {p.paidAt && (
                    <div className="text-[10px] text-slate-400 mt-0.5">Đã thanh toán: {formatDateTime(p.paidAt)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalPages > 0 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${
                    page === p ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </main>

      {showDetail && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setShowDetail(false); setDetailPayment(null); }}>
          <div className="bg-white rounded-[1.5rem] w-full max-w-md p-8 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Chi tiết thanh toán</h3>
            {detailPayment ? (
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Trạng thái</span>
                  <StatusBadge status={detailPayment.status} />
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Số tiền</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(detailPayment.amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Phương thức</span>
                  <span className="text-sm text-slate-700">{METHOD_MAP[detailPayment.method] || detailPayment.method}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Loại</span>
                  <span className="text-sm text-slate-700">{detailPayment.paymentType === 'deposit' ? 'Đặt cọc' : detailPayment.paymentType === 'remaining' ? 'Còn lại' : 'Toàn bộ'}</span>
                </div>
                {detailPayment.paidAt && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Ngày thanh toán</span>
                    <span className="text-sm text-slate-700">{formatDateTime(detailPayment.paidAt)}</span>
                  </div>
                )}
                {detailPayment.transactionId && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Mã giao dịch</span>
                    <span className="text-sm font-mono text-slate-700">{detailPayment.transactionId}</span>
                  </div>
                )}
                {detailPayment.failureReason && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-600 mb-1">Lý do thất bại</p>
                    <p className="text-sm text-red-700">{detailPayment.failureReason}</p>
                  </div>
                )}
                {detailPayment.bookingId && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-2">THÔNG TIN ĐẶT LỊCH</p>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Dịch vụ</span>
                      <span className="text-sm text-slate-700 text-right">
                        {detailPayment.bookingId.packageId?.name || detailPayment.bookingId.packageName || '—'}
                        {detailPayment.bookingId.packageId?.price && <span className="text-xs text-slate-400 ml-1">({formatCurrency(detailPayment.bookingId.packageId.price)})</span>}
                      </span>
                    </div>
                    {(detailPayment.bookingId.vehicleId?.licensePlate || detailPayment.bookingId.vehicleId?.brand) && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-xs text-slate-500">Xe</span>
                        <span className="text-sm text-slate-700">{detailPayment.bookingId.vehicleId.licensePlate}{detailPayment.bookingId.vehicleId.brand ? ` · ${detailPayment.bookingId.vehicleId.brand}` : ''}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Mã đơn</span>
                      <span className="text-sm font-mono font-bold text-emerald-700">#{detailPayment.bookingId.bookingCode || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Ngày</span>
                      <span className="text-sm text-slate-700">{detailPayment.bookingId.bookingDate ? formatDate(detailPayment.bookingId.bookingDate) : '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Giờ</span>
                      <span className="text-sm text-slate-700">{detailPayment.bookingId.startTime || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-xs text-slate-500">Chi nhánh</span>
                      <span className="text-sm text-slate-700">{detailPayment.bookingId.branchId?.name || detailPayment.bookingId.branchName || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">Đang tải...</div>
            )}
            <button onClick={() => { setShowDetail(false); setDetailPayment(null); }}
              className="mt-6 w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
