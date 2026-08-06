import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Warning } from '@phosphor-icons/react';
import { showToast } from '@/lib/toast';
import { getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import useSSE from '@/hooks/useSSE';
import { BookingDetailsTab } from '@/components/manager/ManagerBookings';

function api(path, opts = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getStoredToken()}`,
      ...opts.headers,
    },
  });
}

async function readErr(res) {
  try { const j = await res.json(); return j?.message || `Lỗi ${res.status}`; }
  catch { return `Lỗi ${res.status}`; }
}

function Spinner({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export default function AdminBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleBack = useCallback(() => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate('/admin/bookings');
    }
  }, [navigate, location.state]);

  const fetchDetail = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true);
    setError('');
    try {
      const res = await api(`/bookings/${id}`);
      if (!res.ok) throw new Error(await readErr(res));
      const json = await res.json();
      setBooking(json?.data ?? json);
    } catch (err) {
      if (!opts.silent) setError(err.message || 'Không thể tải chi tiết đơn đặt');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const token = getStoredToken();
  const silentRefresh = useCallback(() => fetchDetail({ silent: true }), [fetchDetail]);
  useSSE(token, 'slots_updated', silentRefresh);
  useSSE(token, 'payment_new', silentRefresh);

  const handleUpdated = (updated) => {
    setBooking(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Spinner />
        <p className="mt-3 text-xs font-semibold text-slate-500">Đang tải chi tiết đơn đặt...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          <Warning size={32} weight="duotone" />
          <p className="text-sm font-semibold">{error || 'Không tìm thấy đơn đặt lịch'}</p>
        </div>
      </div>
    );
  }

  return (
    <BookingDetailsTab
      booking={booking}
      onBack={handleBack}
      onUpdated={handleUpdated}
      notify={showToast}
    />
  );
}
