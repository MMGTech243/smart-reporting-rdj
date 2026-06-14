import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLES = [
  {
    id:    'dg',
    icon:  '🏛',
    title: 'Directeur Général',
    sub:   'DG',
    desc:  'Accès complet · Tableau de bord · Analyses RH · Rapports globaux',
    color: '#4d9fff',
    bg:    'rgba(77,159,255,0.08)',
    border:'rgba(77,159,255,0.2)',
  },
  {
    id:    'drh',
    icon:  '👥',
    title: 'DRH / Administration',
    sub:   'DRH',
    desc:  'Gestion des agents · Alertes · Création de comptes · Paramètres',
    color: '#2ecc71',
    bg:    'rgba(46,204,113,0.08)',
    border:'rgba(46,204,113,0.2)',
  },
  {
    id:    'agent',
    icon:  '📋',
    title: 'CA · CST · Agent',
    sub:   'Chef d\'Agence · Chef de Service Technique · Agent',
    desc:  'Rapport journalier · Signature numérique · Historique personnel',
    color: '#e67e22',
    bg:    'rgba(230,126,34,0.08)',
    border:'rgba(230,126,34,0.2)',
  },
  {
    id:    'admin',
    icon:  '💻',
    title: 'Responsable Informatique',
    sub:   'Admin Système',
    desc:  'Gestion des comptes · Création d\'utilisateurs · Configuration système',
    color: '#9b59b6',
    bg:    'rgba(155,89,182,0.08)',
    border:'rgba(155,89,182,0.2)',
  },
];

export default function RoleSelect() {
  const navigate          = useNavigate();
  const { user, userProfile } = useAuth();

  // Déjà connecté → aller directement
  if (user && userProfile) {
    const role = userProfile.role;
    if (role === 'dg' || role === 'drh') navigate('/app/dashboard', { replace: true });
    else navigate('/app/rdj', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,63,127,0.2) 0%, #0a0a0a 60%)' }}>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />

      <div className="w-full max-w-sm animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs text-cnssap-dim hover:text-white transition-colors mb-6">
            ← Retour
          </button>
          <div className="flex justify-center mb-4">
            <img src="/logo.jpeg" alt="CNSSAP"
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-cnssap-primary/40" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Qui êtes-vous ?</h1>
          <p className="text-xs text-cnssap-dim">Sélectionnez votre profil pour continuer</p>
        </div>

        {/* Cartes rôle */}
        <div className="space-y-3">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => navigate('/login', { state: { roleHint: r.id } })}
              className="w-full text-left p-4 rounded-2xl transition-all duration-200 group"
              style={{ background: r.bg, border: `1px solid ${r.border}` }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${r.bg}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
              <div className="flex items-start gap-4">
                <div className="text-3xl mt-0.5 shrink-0">{r.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white text-sm">{r.title}</p>
                    <span className="text-xs font-bold shrink-0" style={{ color: r.color }}>→</span>
                  </div>
                  <p className="text-[10px] mt-0.5 mb-1.5 font-medium" style={{ color: r.color }}>
                    {r.sub}
                  </p>
                  <p className="text-[11px] text-cnssap-dim leading-relaxed">{r.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Accès démo */}
        <div className="mt-6 text-center">
          <button onClick={() => navigate('/login')}
            className="text-xs text-cnssap-dim hover:text-white transition-colors">
            👁 Accès démo — lecture seule
          </button>
        </div>
      </div>
    </div>
  );
}
