import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import Icon, { type IconName } from '@/components/ui/Icon';

const items: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Explorar', icon: 'map' },
  { path: '/reports', label: 'Reportes', icon: 'list' },
  { path: '/report', label: 'Reportar', icon: 'report' },
  { path: '/activity', label: 'Actividad', icon: 'activity' },
];

interface BottomNavigationProps {
  profile?: { role: string } | null;
}

function BottomNavigation({ profile }: BottomNavigationProps) {
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[600] bg-surface-container-lowest border-t border-outline-variant pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-1.5">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-full transition-colors min-w-[72px] min-h-[48px]',
                active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
              )}
            >
              <Icon name={item.icon} />
              <span className="text-label-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-full transition-colors min-w-[72px] min-h-[48px]',
              location.pathname === '/admin' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
            )}
          >
            <Icon name="settings" />
            <span className="text-label-sm font-semibold">Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default BottomNavigation;
