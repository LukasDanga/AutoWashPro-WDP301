import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { QrCode, CheckCircle, XCircle, ArrowClockwise, X } from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

export default function CustomerQRScanner({ bookingId, onClose, onCheckedIn }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);
  const [result, setResult] = useState(null); // { success, message }
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'customer-qr-reader',
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );
    instanceRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        if (processing) return;
        try {
          const payload = JSON.parse(decodedText);
          if (payload?.action !== 'manager_checkin_qr' || !payload?.branchId) return;
          await handleCheckin(payload.branchId);
        } catch {
          // Not our QR format - ignore
        }
      },
      () => { /* scan error - ignore */ }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckin(branchId) {
    setProcessing(true);
    try {
      const res = await api(`/bookings/${bookingId}/customer-scan-checkin`, {
        method: 'POST',
        body: JSON.stringify({ branchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.message || 'Không thể check-in' });
      } else {
        setResult({ success: true, message: 'Check-in thành công!' });
        onCheckedIn?.();
      }
    } catch (e) {
      setResult({ success: false, message: e.message || 'Lỗi hệ thống' });
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setResult(null);
    setProcessing(false);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 transition-colors">
          <X size={24} weight="bold" />
        </button>

        <div className="p-8 space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
              <QrCode size={24} weight="bold" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Quét mã Check-in</h2>
            <p className="text-sm text-slate-500 mt-1">Hướng camera vào mã QR hiển thị trên màn hình của nhân viên</p>
          </div>

          {!result ? (
            <>
              <div id="customer-qr-reader" ref={scannerRef} className="overflow-hidden rounded-2xl border-2 border-slate-100" />
              {processing && (
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  <span className="text-sm font-semibold text-blue-600">Đang xử lý check-in...</span>
                </div>
              )}
            </>
          ) : result.success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle size={48} weight="fill" className="text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-black text-slate-800">{result.message}</p>
                <p className="text-sm text-slate-500">Bạn có thể giao xe cho nhân viên</p>
              </div>
              <button onClick={onClose}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors">
                Xong
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <XCircle size={48} weight="fill" className="text-red-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-black text-slate-800">Check-in thất bại</p>
                <p className="text-sm text-red-600">{result.message}</p>
              </div>
              <button onClick={reset}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                <ArrowClockwise size={18} weight="bold" /> Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
