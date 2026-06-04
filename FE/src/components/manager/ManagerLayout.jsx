import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drop } from '@phosphor-icons/react';
import DashboardShell from '@/components/layout/DashboardShell';
import { MANAGER_BRAND, MANAGER_MENU_ITEMS, MANAGER_PAGE_META } from '@/config/managerMenu';
import { clearSession } from '@/lib/authStorage';

function resolvePageMeta(pathname) {
  if (pathname === '/manager' || pathname === '/manager/') return MANAGER_PAGE_META.overview;
  if (pathname.startsWith('/manager/bookings')) return MANAGER_PAGE_META.bookings;
  if (pathname.startsWith('/manager/checkins')) return MANAGER_PAGE_META.checkins;
  if (pathname.startsWith('/manager/branch')) return MANAGER_PAGE_META.branch;
  if (pathname.startsWith('/manager/vouchers')) return MANAGER_PAGE_META.vouchers;
  if (pathname.startsWith('/manager/revenue')) return MANAGER_PAGE_META.revenue;
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
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>
      }
    >
      <Outlet context={{ user }} />
    </DashboardShell>
  );
}
