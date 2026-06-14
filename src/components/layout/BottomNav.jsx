import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { to: '/rdj',        label: 'Rapport',   icon: '📋', roles: ['dg','drh','chef','agent'] },
  { to: '/dashboard',  label: 'Dashboard', icon: '🏠', roles: ['dg','drh'] },
  { to: '/analyses',   label: 'Analyses',  icon: '📊', roles: ['dg','drh'] },
  { to: '/alertes',    label: 'Alertes',   icon: '🔔', roles: ['dg','drh'] },
  { to: '/historique', label: 'Historique',icon: '📁', roles: ['dg','drh','chef','agent'] },
  { to: '/admin',      label: 'Admin',     icon: '⚙️', roles: ['drh'] },
];

export default function BottomNav() {
  const { userProfile } = useAuth();
  const role = userProfile?.role ?? 'agent';
  const items = NAV.filter(n => n.roles.includes(role));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-cnssap-surface border-t border-cnssap-border z-40">
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
            {n.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
