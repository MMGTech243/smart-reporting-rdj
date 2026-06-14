import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ProfileModal from '../ProfileModal';
import AboutModal from '../AboutModal';

const NAV = [
  { to: '/app/rdj',        key: 'nav.rdj',       icon: '📋', roles: ['dg','drh','chef','agent'] },
  { to: '/app/dashboard',  key: 'nav.dashboard',  icon: '🏠', roles: ['dg','drh'] },
  { to: '/app/analyses',   key: 'nav.analyses',   icon: '📊', roles: ['dg','drh'] },
  { to: '/app/alertes',    key: 'nav.alertes',    icon: '🔔', roles: ['dg','drh'] },
  { to: '/app/historique', key: 'nav.historique', icon: '📁', roles: ['dg','drh','chef','agent'] },
  { to: '/app/admin',      key: 'nav.admin',      icon: '⚙️', roles: ['admin'] },
];

export default function BottomNav() {
  const { userProfile }               = useAuth();
  const { t }                         = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen,   setAboutOpen]   = useState(false);

  const role     = userProfile?.role ?? 'agent';
  const items    = NAV.filter(n => n.roles.includes(role));
  const photoURL = userProfile?.photoURL ?? null;
  const initials = [userProfile?.prenom?.[0], userProfile?.nom?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{ background: '#111', borderTop: '1px solid #1e1e1e' }}>
        <div className="flex">
          {items.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-cnssap-accent' : 'text-cnssap-dim'
                }`
              }
            >
              <span className="text-lg mb-0.5">{n.icon}</span>
              <span className="text-[10px]">{t(n.key).split(' ')[0]}</span>
            </NavLink>
          ))}

          {/* Bouton profil */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 text-cnssap-dim hover:text-white transition-colors"
          >
            <div className="w-6 h-6 rounded-lg overflow-hidden mb-0.5 ring-1 ring-cnssap-primary/40">
              {photoURL ? (
                <img src={photoURL} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#003f7f,#0060c0)' }}>
                  {initials}
                </div>
              )}
            </div>
            <span className="text-[10px]">{t('profile.title').split(' ')[1] ?? 'Profil'}</span>
          </button>
        </div>
      </nav>

      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          onAbout={() => setAboutOpen(true)}
        />
      )}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  );
}
