import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout() {
  const { userProfile } = useAuth();
  const isDemo = userProfile?.isDemo;

  return (
    <div className="flex min-h-screen bg-cnssap-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        {isDemo && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold sticky top-0 z-30"
            style={{ background: 'rgba(230,126,34,0.15)', borderBottom: '1px solid rgba(230,126,34,0.3)', color: '#e67e22' }}>
            <span>👁</span>
            Mode démo — lecture seule · Aucune donnée ne peut être modifiée
          </div>
        )}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
