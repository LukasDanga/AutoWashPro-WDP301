import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drop } from '@phosphor-icons/react';
import DashboardShell from '@/components/layout/DashboardShell';
import { MANAGER_BRAND, MANAGER_MENU_ITEMS, MANAGER_PAGE_META } from '@/config/managerMenu';
import { clearSession } from '@/lib/authStorage';
import NotificationBell from '@/components/ui/NotificationBell';

function resolvePageMeta(pathname) {
  if (pathname === '/manager' || pathname === '/manager/') return MANAGER_PAGE_META.overview;
  if (pathname.startsWith('/manager/bookings')) return MANAGER_PAGE_META.bookings;
  if (pathname.startsWith('/manager/schedule')) return MANAGER_PAGE_META.schedule;
if (pathname.startsWith('/manager/branch')) return MANAGER_PAGE_META.branch;
  if (pathname.startsWith('/manager/vouchers')) return MANAGER_PAGE_META.vouchers;
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
