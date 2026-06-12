import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { List } from '@phosphor-icons/react';
import { SignOut } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * Sidebar tái sử dụng cho Admin, Manager, Staff (cùng UI, khác menuItems).
 *
 * @param {Object} props
 * @param {{ name: string, tagline?: string, logo?: React.ReactNode }} props.brand
 * @param {{ id: string, label: string, to: string, icon: React.ComponentType, end?: boolean }[]} props.menuItems
 * @param {{ name: string, roleLabel?: string }} props.user
 * @param {() => void} props.onLogout
 * @param {string} [props.className]
 */
export default function DashboardSidebar({ brand, menuItems, user, onLogout, className }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-[64px]' : 'w-[272px]',
        className,
      )}
    >
      <div className={cn('flex items-center px-5 py-5', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {brand.logo ?? (
            <span className="text-lg font-bold tracking-tight" aria-hidden>AW</span>
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{brand.name}</p>
            {brand.tagline ? (
              <p className="truncate text-xs text-muted-foreground">{brand.tagline}</p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <List size={16} weight="bold" />
        </button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Menu chính">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : '',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} weight="duotone" className="shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t border-sidebar-border">
        <div className={cn('flex items-center px-4 py-4', collapsed ? 'justify-center' : 'gap-3')}>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              {user.roleLabel ? (
                <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
              ) : null}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onLogout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <SignOut size={20} weight="bold" />
          </Button>
        </div>
      </div>

    </aside>
  );
}
