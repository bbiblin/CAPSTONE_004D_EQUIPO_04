import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNavigation from './BottomNavigation';
import { signOut } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AppLayoutProps {
  profile?: Profile | null;
}

function AppLayout({ profile }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="h-full overflow-hidden overscroll-none flex flex-col bg-background">
      <MobileHeader profile={profile} onLogout={handleLogout} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar profile={profile} onLogout={handleLogout} />
        <main key={location.pathname} className="flex-1 flex flex-col overflow-hidden page-enter">
          <Outlet />
        </main>
      </div>
      <BottomNavigation profile={profile} />
    </div>
  );
}

export default AppLayout;
