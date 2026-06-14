import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ProfileModal from '../ProfileModal';
import AboutModal from '../AboutModal';

const NAV = [
  { to: '/rdj',        key: 'nav.rdj',        icon: '📋', roles: ['dg','drh','chef','agent'] },
  { to: '/dashboard',  key: 'nav.dashboard',   icon: '🏠', roles: ['dg','drh'] },
  { to: '/analyses',   key: 'nav.analyses',    icon: '📊', roles: ['dg','drh'] },
  { to: '/alertes',    key: 'nav.alertes',     icon: '🔔', roles: ['dg','drh'] },
  { to: '/historique', key: 'nav.historique',  icon: '📁', roles: ['dg','drh','chef','agent'] },
  { to: '/admin',      key: 'nav.admin',       icon: '⚙️', roles: ['drh'] },
];

const ROLE_LABELS = {
  fr: { dg:'Directeur Général', drh:'DRH / Administration', chef:'Chef de Section', agent:'Agent / Stagiaire' },
  en: { dg:'Director General',  drh:'HR / Administration',  chef:'Section Head',    agent:'Staff / Intern' },
};

export default function Sidebar() {
  const { userProfile, logout } = useAuth();
  const { lang, t }             = useLanguage();
  const navigate                = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen,   setAboutOpen]   = useState(false);
  const role = userProfile?.role ?? 'agent';

  const initials = [userProfile?.prenom?.[0], userProfile?.nom?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  const photoURL  = userProfile?.photoURL ?? null;
  const roleLabel = (ROLE_LABELS[lang] ?? ROLE_LABELS.fr)[role] ?? role;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 min-h-screen"
        style={{ background: 'linear-gradient(180deg, #131313 0%, #0d0d0d 100%)', borderRight: '1px solid #1a1a1a' }}>

        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="/logo.jpeg" alt="CNSSAP"
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-cnssap-primary/50" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-cnssap-success rounded-full ring-2 ring-[#0d0d0d]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-cnssap-accent uppercase tracking-widest">CNSSAP</p>
              <p className="text-sm font-bold text-white leading-tight">Smart Reporting RDJ</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-cnssap-dim uppercase tracking-widest px-3 mb-3">Navigation</p>
          {NAV.filter(n => n.roles.includes(role)).map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => isActive
                ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white relative overflow-hidden'
                : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cnssap-muted hover:text-white hover:bg-white/[0.04] transition-all duration-150'
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(90deg, rgba(0,63,127,0.35) 0%, rgba(0,63,127,0.05) 100%)',
                borderLeft: '2px solid #4d9fff',
              } : {}}
            >
              <span className="text-base">{n.icon}</span>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
          {/* Avatar cliquable → ProfileModal */}
          <button onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-cnssap-primary/40">
              {photoURL ? (
                <img src={photoURL} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #003f7f 0%, #0060c0 100%)' }}>
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {userProfile?.prenom} {userProfile?.nom}
              </p>
              <p className="text-[10px] text-cnssap-accent truncate">{roleLabel}</p>
            </div>
            <span className="text-cnssap-dim text-xs">›</span>
          </button>

          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-cnssap-dim hover:text-white hover:bg-white/[0.04] transition-all">
            <span>🚪</span> {t('nav.logout')}
          </button>
        </div>
      </aside>

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
