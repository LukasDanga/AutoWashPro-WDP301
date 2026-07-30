import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Receipt, PlusCircle, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import useSSE from '../../hooks/useSSE';

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)}đ`;
}

const ERROR_TRANSLATIONS = {
  'Validation failed': 'Xác thực dữ liệu thất bại',
  'Invalid amount': 'Số tiền không hợp lệ',
  'Amount is required': 'Vui lòng cung cấp số tiền',
  'Invalid payment method': 'Phương thức thanh toán không hợp lệ',
  'Invalid payment type': 'Loại thanh toán không hợp lệ',
  'User not found': 'Không tìm thấy người dùng',
  'Payment not found': 'Không tìm thấy thông tin giao dịch',
  'Access denied. No token.': 'Từ chối truy cập. Vui lòng đăng nhập lại.',
  'Invalid token': 'Phiên đăng nhập không hợp lệ',
  'Token expired': 'Phiên đăng nhập đã hết hạn',
  'Failed to fetch': 'Không thể kết nối đến máy chủ',
};

function translateError(msg) {
  if (!msg) return '';
  let result = msg;
  if (ERROR_TRANSLATIONS[msg]) {
    return ERROR_TRANSLATIONS[msg];
  }
  for (const [key, value] of Object.entries(ERROR_TRANSLATIONS)) {
    result = result.replace(new RegExp(key, 'gi'), value);
  }
  return result;
}

export default function CustomerWallet({ apiBase, token, user, refreshUser }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank'); // bank or vnpay
  const [sepayData, setSepayData] = useState(null);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showVnpaySuccessModal, setShowVnpaySuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  // Lắng nghe sự kiện nạp tiền thành công
  useSSE(token, 'wallet_topup_success', (data) => {
    setMessage(`Nạp tiền thành công: +${formatCurrency(data?.amount)}`);
    setSepayData(null);
    setShowTopupModal(false);
    refreshUser();
    fetchTransactions();
    setTimeout(() => setMessage(''), 5000);
  });

  // Lắng nghe kết quả VNPay từ URL sau khi redirect về
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vnpayResult = params.get('vnpay_result');
    if (vnpayResult) {
      try {
        const parsed = JSON.parse(decodeURIComponent(vnpayResult));
        const success = parsed?.success !== false && parsed?.data?.responseCode === '00';
        if (success) {
          const rawAmt = parsed?.data?.amount;
          const amt = rawAmt ? parseInt(rawAmt, 10) / 100 : 0;
          setSuccessAmount(amt);
          setShowVnpaySuccessModal(true);
          refreshUser();
          fetchTransactions();
        } else {
          setMessage(parsed?.message || 'Thanh toán VNPay thất bại');
        }
      } catch (e) {
        console.error('Lỗi phân tích kết quả VNPay:', e);
        setMessage('Lỗi xử lý kết quả thanh toán VNPay');
      }
      
      // Dọn sạch URL query params để tránh F5 bị kích hoạt lại modal
      const url = new URL(window.location);
      url.searchParams.delete('vnpay_result');
      window.history.replaceState({}, '', url);
    }
  }, [token]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/wallet-transactions/my?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await res.json();
      if (res.ok) {
        setTransactions(payload.data || []);
      }
    } catch (e) {
      console.error('Lỗi khi tải lịch sử ví:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTransactions();
  }, [token]);

  const handleTopup = async () => {
    const amount = customAmount ? parseInt(customAmount.replace(/\D/g, ''), 10) : topupAmount;
    if (!amount || amount < 10000) {
      setMessage('Số tiền nạp tối thiểu là 10,000đ');
      return;
    }

    setMessage('');
    
    if (payMethod === 'bank') {
      setDepositLoading(true);
      try {
        const res = await fetch(`${apiBase}/payments/bank-provisional`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount, paymentType: 'topup' }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new Error(payload?.message || 'Tạo QR nạp tiền thất bại');
        
        const payObj = payload?.data || payload;
        setSepayData({
          qrCodeUrl: payObj.qrCodeUrl || `https://qr.sepay.vn/img?bank=MB&acc=6200320046868&amount=${amount}&des=DAT COC ${payObj.transactionId}`,
          transactionId: payObj.transactionId,
          amount: amount,
        });
      } catch (e) {
        setMessage(translateError(e.message) || 'Tạo giao dịch thất bại');
      } finally {
        setDepositLoading(false);
      }
    } else if (payMethod === 'vnpay') {
      setVnpayLoading(true);
      try {
        const res = await fetch(`${apiBase}/bookings/vnpay-provisional`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount, paymentType: 'topup', origin: window.location.origin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Tạo thanh toán VNPay thất bại');
        
        const paymentUrl = data?.data?.paymentUrl;
        if (!paymentUrl) throw new Error('Không nhận được URL thanh toán');
        
        // Mở URL VNPay trong tab mới hoặc chuyển hướng
        window.location.href = paymentUrl;
      } catch (e) {
        setMessage(translateError(e.message) || 'Thanh toán VNPay thất bại');
        setVnpayLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-emerald-500" />
            Ví AutoWash
          </h2>
          <p className="text-slate-500 text-sm mt-1">Quản lý số dư và lịch sử giao dịch ví nội bộ</p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-center gap-2 font-semibold">
          <ShieldCheck size={20} />
          {message}
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <p className="text-emerald-100 font-medium mb-1">Số dư hiện tại</p>
            <div className="text-4xl md:text-5xl font-black tracking-tight">
              {formatCurrency(user?.walletBalance)}
            </div>
            <p className="text-sm text-emerald-200 mt-2 flex items-center gap-1.5">
              <ShieldCheck size={14} /> An toàn, bảo mật & Nhanh chóng
            </p>
          </div>
          <button 
            onClick={() => setShowTopupModal(true)}
            className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <PlusCircle size={20} />
            Nạp tiền vào ví
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={18} className="text-slate-500" />
            Lịch sử giao dịch
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải lịch sử...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border-t border-slate-100">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Receipt size={28} />
            </div>
            <h3 className="text-slate-700 font-bold mb-1">Chưa có giao dịch nào</h3>
            <p className="text-slate-500 text-sm">Khi bạn nạp tiền hoặc nhận hoàn tiền, lịch sử sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map(tx => {
              const isCredit = tx.type === 'credit';
              const Icon = isCredit ? ArrowDownCircle : ArrowUpCircle;
              return (
                <div key={tx._id} className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm md:text-base">{tx.reason}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                        {tx.bookingId && (() => {
                          const bc = typeof tx.bookingId === 'object' ? tx.bookingId.bookingCode : null;
                          return bc ? ` • Mã đơn: ${bc}` : '';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-black text-sm md:text-base whitespace-nowrap ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            {sepayData ? (
              <div className="p-6 text-center">
                <h3 className="text-xl font-black text-slate-900 mb-2">Quét Mã VietQR</h3>
                <p className="text-sm text-slate-500 mb-6">Sử dụng ứng dụng ngân hàng để thanh toán</p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block mb-6">
                  <img src={sepayData.qrCodeUrl} alt="QR Code" className="w-56 h-56 rounded-lg object-cover" />
                </div>
                
                <div className="space-y-3 mb-6 text-left">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-sm">Số tiền:</span>
                    <strong className="text-emerald-600 text-lg">{formatCurrency(sepayData.amount)}</strong>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-sm">Nội dung CK:</span>
                    <strong className="text-slate-800 font-mono">{sepayData.transactionId}</strong>
                  </div>
                </div>

                <div className="text-emerald-600 text-sm font-semibold flex items-center justify-center gap-2 mb-6">
                  <span className="animate-spin">🔄</span> Đang chờ ngân hàng xác nhận...
                </div>

                <button 
                  onClick={() => setSepayData(null)}
                  className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy / Quay lại
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Nạp tiền vào ví</h3>
                  <button onClick={() => setShowTopupModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Chọn số tiền nạp</label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[50000, 100000, 200000, 500000, 1000000, 2000000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => { setTopupAmount(amt); setCustomAmount(''); }}
                        className={`py-2 px-2 rounded-xl border-2 text-sm font-bold transition-all ${
                          topupAmount === amt && !customAmount
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                        }`}
                      >
                        {formatCurrency(amt).replace('đ','')}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Nhập số tiền khác..." 
                      value={customAmount}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val) val = parseInt(val, 10).toLocaleString('vi-VN');
                        setCustomAmount(val);
                        setTopupAmount(0);
                      }}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 outline-none font-semibold text-slate-800"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">đ</span>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Chọn phương thức thanh toán</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPayMethod('bank')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        payMethod === 'bank' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'
                      }`}
                    >
                      <Banknote size={28} className={payMethod === 'bank' ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className={`text-sm font-bold ${payMethod === 'bank' ? 'text-emerald-700' : 'text-slate-600'}`}>Chuyển khoản</span>
                    </button>
                    <button
                      onClick={() => setPayMethod('vnpay')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        payMethod === 'vnpay' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <CreditCard size={28} className={payMethod === 'vnpay' ? 'text-blue-600' : 'text-slate-400'} />
                      <span className={`text-sm font-bold ${payMethod === 'vnpay' ? 'text-blue-700' : 'text-slate-600'}`}>VNPay</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleTopup}
                  disabled={depositLoading || vnpayLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-70 flex justify-center items-center"
                >
                  {depositLoading || vnpayLoading ? <span className="animate-pulse">ĐANG XỬ LÝ...</span> : 'TIẾN HÀNH NẠP TIỀN'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* VNPay Success Modal */}
      {showVnpaySuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Nạp tiền thành công!</h3>
            <p className="text-sm text-slate-500 mb-6">
              Bạn đã nạp thành công <span className="font-bold text-emerald-600 text-base">{formatCurrency(successAmount)}</span> vào ví AutoWash.
            </p>
            <button 
              onClick={() => setShowVnpaySuccessModal(false)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/30 transition-all"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
