import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import { QrCode, CheckCircle, XCircle, ArrowClockwise } from '@phosphor-icons/react';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken()}`, ...opts.headers },
    ...opts,
  });
}

export default function ManagerQRScanner({ onClose, onCheckedIn }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);
  const [result, setResult] = useState(null); // { bookingId, status, message }
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
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
          if (!payload?.bookingId) return;
          await handleCheckin(payload.bookingId);
        } catch {
          // Not our QR format — ignore
        }
      },
      () => { /* scan error — ignore */ }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckin(bookingId) {
    setProcessing(true);
    try {
      const res = await api(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'checked_in' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, bookingId, message: data.message || 'Không thể check-in' });
      } else {
        const b = data?.data;
        setResult({
          success: true,
          bookingId,
          message: `Check-in thành công!`,
          name: b?.userId?.name || 'Khách hàng',
          plate: b?.vehicleId?.licensePlate || '',
          service: b?.packageId?.name || '',
        });
        onCheckedIn?.(b);
      }
    } catch (e) {
      setResult({ success: false, bookingId, message: e.message });
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setResult(null);
    setProcessing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <QrCode size={20} className="text-blue-600" weight="fill" />
            <h2 className="font-semibold text-slate-800">Scan QR Check-in</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-center text-xs text-slate-500">
                Hướng camera vào mã QR trên màn hình khách hàng để tự động check-in.
              </p>
              {/* Scanner mount point */}
              <div id="qr-reader" ref={scannerRef} className="overflow-hidden rounded-xl" />
              {processing && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  Đang xử lý check-in…
                </div>
              )}
            </>
          ) : result.success ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle size={40} weight="fill" className="text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-slate-800">{result.message}</p>
                <p className="text-sm font-medium text-slate-700">{result.name}</p>
                {result.plate && <p className="text-xs text-slate-500">Biển số: {result.plate}</p>}
                {result.service && <p className="text-xs text-slate-500">Dịch vụ: {result.service}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <ArrowClockwise size={14} /> Scan tiếp
                </button>
                <button onClick={onClose}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                  Xong
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle size={40} weight="fill" className="text-red-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-bold text-slate-800">Check-in thất bại</p>
                <p className="text-sm text-red-600">{result.message}</p>
              </div>
              <button onClick={reset}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <ArrowClockwise size={14} /> Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
