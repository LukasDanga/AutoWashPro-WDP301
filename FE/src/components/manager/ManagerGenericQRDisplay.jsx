import { QRCodeSVG } from 'qrcode.react';
import { XCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import useSSE from '@/hooks/useSSE';
import { getStoredToken } from '@/lib/authStorage';

export default function ManagerGenericQRDisplay({ branchId, onClose }) {
  const navigate = useNavigate();
  const token = getStoredToken();
  // Payload sent to customer when they scan
  const qrPayload = JSON.stringify({
    action: 'manager_checkin_qr',
    branchId: branchId,
  });

  useSSE(token, 'customer_checked_in_via_qr', (data) => {
    if (data?.bookingId) {
      onClose();
      navigate(`/manager/bookings/${data.bookingId}`);
    }
  });

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <XCircle size={28} weight="fill" />
        </button>

        <h3 className="text-xl font-black text-slate-900 mb-2">Mã QR Check-in</h3>
        <p className="text-sm text-slate-500 mb-8">
          Khách hàng dùng điện thoại mở tính năng "Check-in bằng mã QR" để quét mã này
        </p>

        <div className="flex justify-center bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-inner mb-8">
          <QRCodeSVG value={qrPayload} size={220} level="H" includeMargin={true} />
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
