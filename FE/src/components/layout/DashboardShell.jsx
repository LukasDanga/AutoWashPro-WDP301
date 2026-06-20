import { cn } from '@/lib/utils';
import DashboardSidebar from '@/components/layout/DashboardSidebar';

/**
 * Layout shell: sidebar + vùng nội dung chính.
 */
export default function DashboardShell({
  brand,
  menuItems,
  user,
  onLogout,
  children,
  header,
  className,
  badges,
}) {
  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      <DashboardSidebar
        brand={brand}
        menuItems={menuItems}
        user={user}
        onLogout={onLogout}
        badges={badges}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {header ? (
          <header className="border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm">
            {header}
          </header>
        ) : null}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
