import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

function useRapportReminder(user, userProfile) {
  useEffect(() => {
    if (!user || userProfile?.isDemo || userProfile?.role === 'admin') return;
    const check = async () => {
      const now  = new Date();
      const hour = now.getHours();
      if (hour < 15 || hour >= 20) return; // Rappel entre 15h et 20h seulement
      const todayKey = now.toISOString().split('T')[0];
      const cacheKey = `rdj_notif_${user.uid}_${todayKey}`;
      if (localStorage.getItem(cacheKey)) return; // Déjà rappelé aujourd'hui
      // Vérifier si rapport soumis
      const snap = await getDocs(query(
        collection(db, 'rdj_reports'),
        where('userId', '==', user.uid),
        where('date', '==', todayKey)
      ));
      if (!snap.empty) return; // Déjà soumis
      localStorage.setItem(cacheKey, '1');
      // Envoyer notification
      if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REMIND',
          body: `Il est ${now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} — vous n'avez pas encore soumis votre rapport RDJ.`,
        });
      }
    };
    check();
    const timer = setInterval(check, 30 * 60 * 1000); // vérifier toutes les 30min
    return () => clearInterval(timer);
  }, [user, userProfile]);
}

async function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export default function Layout() {
  const { user, userProfile } = useAuth();
  const isDemo = userProfile?.isDemo;

  useRapportReminder(user, userProfile);

  useEffect(() => { requestNotifPermission(); }, []);

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
