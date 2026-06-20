import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drop } from '@phosphor-icons/react';
import DashboardShell from '@/components/layout/DashboardShell';
import { ADMIN_BRAND, ADMIN_MENU_ITEMS, ADMIN_PAGE_META } from '@/config/adminMenu';
import { clearSession } from '@/lib/authStorage';
import NotificationBell from '@/components/ui/NotificationBell';

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
  if (pathname.startsWith('/admin/slot-packs')) return ADMIN_PAGE_META['slot-packs'];
  if (pathname.startsWith('/admin/profile')) return ADMIN_PAGE_META.profile;
  return ADMIN_PAGE_META.overview;
}

export default function AdminLayout({ user, onLogout }) {
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
        ...ADMIN_BRAND,
        logo: <Drop size={24} weight="fill" className="text-primary" aria-hidden />,
      }}
      menuItems={ADMIN_MENU_ITEMS}
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
