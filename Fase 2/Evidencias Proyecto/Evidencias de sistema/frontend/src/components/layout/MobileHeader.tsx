import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Icon from '@/components/ui/Icon';

interface MobileHeaderProps {
  profile?: { role: string; display_name: string } | null;
  onLogout?: () => void;
}

function MobileHeader({ profile, onLogout }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-[700] bg-surface-container-lowest border-b border-outline-variant px-margin-mobile h-14 flex items-center justify-between gap-2">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <img src="/icon-192.png?v=2" alt="Movimap" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-bold text-on-surface text-body-lg">Movimap</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        {profile ? (
          <>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <Icon name="logout" />
              </button>
            )}
            <Link
              to="/profile"
              aria-label="Administrar perfil"
              title="Administrar perfil"
              className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold shrink-0"
            >
              {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </Link>
          </>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-11 px-3 rounded bg-primary text-on-primary text-label-md font-semibold shrink-0 hover:opacity-90 transition-colors"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}

export default MobileHeader;
