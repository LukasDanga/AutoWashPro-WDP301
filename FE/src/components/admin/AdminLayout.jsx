import { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drop } from '@phosphor-icons/react';
import DashboardShell from '@/components/layout/DashboardShell';
import useSSE from '@/hooks/useSSE';
import { ADMIN_BRAND, ADMIN_MENU_ITEMS, ADMIN_PAGE_META } from '@/config/adminMenu';
import { clearSession, getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import NotificationBell from '@/components/ui/NotificationBell';

function api(path) {
  return fetch(`${getApiBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${getStoredToken()}` } });
}

function resolvePageMeta(pathname) {
  if (pathname === '/admin' || pathname === '/admin/') {
    return ADMIN_PAGE_META.overview;
  }
  if (pathname.startsWith('/admin/branches')) return ADMIN_PAGE_META.branches;
  if (pathname.startsWith('/admin/users')) return ADMIN_PAGE_META.users;
  if (pathname.startsWith('/admin/reviews')) return ADMIN_PAGE_META.reviews;
  if (pathname.startsWith('/admin/rewards')) return ADMIN_PAGE_META.rewards;
  if (pathname.startsWith('/admin/activity')) return ADMIN_PAGE_META.activity;
  if (pathname.startsWith('/admin/bookings')) return ADMIN_PAGE_META.bookings;
  if (pathname.startsWith('/admin/payments')) return ADMIN_PAGE_META.payments;
  if (pathname.startsWith('/admin/refund-requests')) return ADMIN_PAGE_META['refund-requests'];
  if (pathname.startsWith('/admin/slot-packs')) return ADMIN_PAGE_META['slot-packs'];
  if (pathname.startsWith('/admin/profile')) return ADMIN_PAGE_META.profile;
  return ADMIN_PAGE_META.overview;
}

export default function AdminLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = resolvePageMeta(location.pathname);
  const [badges, setBadges] = useState({});

  // Đếm số mục "mới / cần xử lý" toàn hệ thống: đơn chờ xác nhận + đánh giá chưa phản hồi + thanh toán chưa xem
  const token = getStoredToken();
  const loadCounts = useCallback(async () => {
    try {
      const [bRes, fRes, pRes, rRes, spRes] = await Promise.all([
        api('/bookings?status=pending&limit=1'),
        api('/bookings/feedbacks?replied=false&limit=1'),
        api('/payments/unviewed-count'),
        api('/refund-requests?limit=100'),
        api('/slot-packs?limit=100'),
      ]);
      const bData = await bRes.json().catch(() => ({}));
      const fData = await fRes.json().catch(() => ({}));
      const pData = await pRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      const spData = await spRes.json().catch(() => ({}));

      const pendingBookings = bData?.data?.pagination?.total ?? bData?.data?.total ?? 0;
      const unrepliedReviews = fData?.data?.total ?? 0;
      const unviewedPayments = pData?.data?.count ?? 0;

      const todayStr = new Date().toDateString();

      const refundList = Array.isArray(rData?.data?.data) ? rData.data.data : (Array.isArray(rData?.data) ? rData.data : []);
      const viewedRefundIds = JSON.parse(localStorage.getItem('viewed_refund_requests') || '[]');
      const unviewedRefunds = refundList.filter(
        r => !viewedRefundIds.includes(r._id) && new Date(r.createdAt).toDateString() === todayStr
      ).length;

      const slotPackList = Array.isArray(spData?.data?.data) ? spData.data.data : (Array.isArray(spData?.data) ? spData.data : []);
      const viewedSlotPackIds = JSON.parse(localStorage.getItem('viewed_admin_slot_packs') || '[]');
      const unviewedSlotPacks = slotPackList.filter(
        p => !viewedSlotPackIds.includes(p._id) && p.createdAt && new Date(p.createdAt).toDateString() === todayStr
      ).length;

      setBadges({
        bookings: pendingBookings,
        reviews: unrepliedReviews,
        payments: unviewedPayments,
        'refund-requests': unviewedRefunds,
        'slot-packs': unviewedSlotPacks,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [location.pathname, loadCounts]);

  useSSE(token, 'slots_updated', loadCounts);
  useSSE(token, 'payment_new', loadCounts);
  useSSE(token, 'feedback_new', loadCounts);
  useSSE(token, 'refund_request_new', loadCounts);
  useSSE(token, 'refund_requests_updated', loadCounts);
  useSSE(token, 'vouchers_updated', loadCounts);

  // Khi admin xem detail thanh toán hoặc refund request hoặc slot pack → cập nhật sidebar badge
  useEffect(() => {
    window.addEventListener('payment-viewed', loadCounts);
    window.addEventListener('refund-request-viewed', loadCounts);
    window.addEventListener('admin-slot-pack-viewed', loadCounts);
    window.addEventListener('feedback-replied', loadCounts);
    return () => {
      window.removeEventListener('payment-viewed', loadCounts);
      window.removeEventListener('refund-request-viewed', loadCounts);
      window.removeEventListener('admin-slot-pack-viewed', loadCounts);
      window.removeEventListener('feedback-replied', loadCounts);
    };
  }, [loadCounts]);

  async function handleLogout() {
    await onLogout?.();
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <DashboardShell
      brand={{
        ...ADMIN_BRAND,
        logo: <Drop size={24} weight="fill" className="text-primary" aria-hidden />,
      }}
      menuItems={ADMIN_MENU_ITEMS}
      badges={badges}
      user={{
        name: user?.name || 'Quản trị viên',
        roleLabel: user?.role ? `Vai trò: ${user.role}` : 'Admin',
      }}
      onLogout={handleLogout}
      header={
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{meta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
          <NotificationBell />
        </div>
      }
    >
      <Outlet />
    </DashboardShell>
  );
}
