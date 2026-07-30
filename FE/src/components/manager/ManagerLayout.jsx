import { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drop } from '@phosphor-icons/react';
import DashboardShell from '@/components/layout/DashboardShell';
import { MANAGER_BRAND, MANAGER_MENU_ITEMS, MANAGER_PAGE_META } from '@/config/managerMenu';
import { clearSession, getApiBaseUrl, getStoredToken } from '@/lib/authStorage';
import NotificationBell from '@/components/ui/NotificationBell';
import useSSE from '@/hooks/useSSE';

function api(path) {
  return fetch(`${getApiBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${getStoredToken()}` } });
}

function resolvePageMeta(pathname) {
  if (pathname === '/manager' || pathname === '/manager/') return MANAGER_PAGE_META.overview;
  if (pathname.startsWith('/manager/bookings')) return MANAGER_PAGE_META.bookings;
  if (pathname.startsWith('/manager/schedule')) return MANAGER_PAGE_META.schedule;
  if (pathname.startsWith('/manager/branch')) return MANAGER_PAGE_META.branch;
  if (pathname.startsWith('/manager/vouchers')) return MANAGER_PAGE_META.vouchers;
  if (pathname.startsWith('/manager/refund-requests')) return MANAGER_PAGE_META['refund-requests'];
  if (pathname.startsWith('/manager/customers')) return MANAGER_PAGE_META.customers;
  if (pathname.startsWith('/manager/feedbacks')) return MANAGER_PAGE_META.feedbacks;
  if (pathname.startsWith('/manager/revenue')) return MANAGER_PAGE_META.revenue;
  if (pathname.startsWith('/manager/packages')) return MANAGER_PAGE_META.packages;
  if (pathname.startsWith('/manager/slot-packs')) return MANAGER_PAGE_META['slot-packs'];
  if (pathname.startsWith('/manager/profile')) return MANAGER_PAGE_META.profile;
  return MANAGER_PAGE_META.overview;
}

export default function ManagerLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = resolvePageMeta(location.pathname);
  const [badges, setBadges] = useState({});
  const token = getStoredToken();

  const loadCounts = useCallback(async () => {
    try {
      const bId = user?.branchId;
      const [bRes, fRes, cRes, spRes, rRes] = await Promise.all([
        api('/bookings?status=pending&limit=1&groupByRecurring=true'),
        api('/bookings/feedbacks?replied=false&limit=1'),
        api('/bookings/customers?limit=100'),
        bId ? api(`/slot-packs?branchId=${bId}&limit=100`) : Promise.resolve(null),
        api('/refund-requests?limit=100'),
      ]);
      const bData = await bRes.json().catch(() => ({}));
      const fData = await fRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      const spData = spRes ? await spRes.json().catch(() => ({})) : {};
      const rData = await rRes.json().catch(() => ({}));

      const pendingBookings = bData?.data?.pagination?.total ?? bData?.data?.total ?? 0;
      const unrepliedFeedbacks = fData?.data?.total ?? 0;
      const customerList = cData?.data?.customers ?? cData?.data ?? [];
      
      // First-time customers at this branch today that have not been viewed yet
      const todayStr = new Date().toDateString();
      const viewedCustomerIds = JSON.parse(localStorage.getItem('viewed_manager_customers') || '[]');
      const newCustomers = (Array.isArray(customerList) ? customerList : [])
        .filter((c) => {
          const custId = c._id || c.user?._id;
          const dateToCheck = c.lastBookingDate || c.user?.createdAt;
          const isToday = dateToCheck && new Date(dateToCheck).toDateString() === todayStr;
          const isFirstTime = (c.totalBookings <= 1 || !c.totalBookings);
          return isFirstTime && isToday && !viewedCustomerIds.includes(custId);
        }).length;

      const slotPackList = Array.isArray(spData?.data) ? spData.data : [];
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const newSlotPacks = slotPackList
        .filter((p) => p.createdAt && new Date(p.createdAt).getTime() > dayAgo).length;

      const refundList = Array.isArray(rData?.data?.data) ? rData.data.data : (Array.isArray(rData?.data) ? rData.data : []);
      const viewedRefundIds = JSON.parse(localStorage.getItem('viewed_refund_requests') || '[]');
      const unviewedRefunds = refundList.filter(
        r => !viewedRefundIds.includes(r._id) && new Date(r.createdAt).toDateString() === new Date().toDateString()
      ).length;

      setBadges({
        bookings: pendingBookings,
        schedule: pendingBookings,
        feedbacks: unrepliedFeedbacks,
        customers: newCustomers,
        'slot-packs': newSlotPacks,
        'refund-requests': unviewedRefunds,
      });
    } catch { /* silent */ }
  }, [user?.branchId]);

  useEffect(() => {
    loadCounts();
  }, [location.pathname, loadCounts]);

  useSSE(token, 'slots_updated', loadCounts);
  useSSE(token, 'payment_new', loadCounts);
  useSSE(token, 'feedback_new', loadCounts);
  useSSE(token, 'vouchers_updated', loadCounts);
  useSSE(token, 'refund_request_new', loadCounts);
  useSSE(token, 'refund_requests_updated', loadCounts);

  useEffect(() => {
    window.addEventListener('payment-viewed', loadCounts);
    window.addEventListener('refund-request-viewed', loadCounts);
    window.addEventListener('manager-customer-viewed', loadCounts);
    window.addEventListener('admin-slot-pack-viewed', loadCounts);
    window.addEventListener('feedback-replied', loadCounts);
    return () => {
      window.removeEventListener('payment-viewed', loadCounts);
      window.removeEventListener('refund-request-viewed', loadCounts);
      window.removeEventListener('manager-customer-viewed', loadCounts);
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
        ...MANAGER_BRAND,
        logo: <Drop size={24} weight="fill" className="text-primary" aria-hidden />,
      }}
      menuItems={MANAGER_MENU_ITEMS}
      badges={badges}
      user={{
        name: user?.name || 'Quản lý',
        roleLabel: 'Quản lý chi nhánh',
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
      <Outlet context={{ user }} />
    </DashboardShell>
  );
}
