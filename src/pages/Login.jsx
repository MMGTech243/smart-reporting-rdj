import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, login, loginDemo } = useAuth();
  const navigate                   = useNavigate();
  const [email, setEmail]          = useState('');
  const [password, setPassword]    = useState('');
  const [error, setError]          = useState('');
  const [loading, setLoading]      = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError('Accès démo indisponible. Activez l\'authentification anonyme dans Firebase Console.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/rdj', { replace: true });
    } catch {
      setError('Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,63,127,0.25) 0%, #0a0a0a 60%)',
      }}
    >
      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,63,127,0.15) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(77,159,255,0.08) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block relative">
            <div className="absolute inset-0 rounded-2xl animate-glow" />
            <img src="/logo.jpeg" alt="CNSSAP"
              className="relative w-20 h-20 rounded-2xl object-cover mx-auto ring-2 ring-cnssap-primary/40" />
          </div>
          <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">Smart Reporting RDJ</h1>
          <p className="text-cnssap-dim text-xs mt-1.5 leading-relaxed">
            Caisse Nationale de Sécurité Sociale<br />des Agents Publics
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>

          <h2 className="text-base font-semibold text-white mb-6">Connexion à votre espace</h2>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg text-xs text-cnssap-danger flex items-center gap-2"
              style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-cnssap-muted mb-1.5">Adresse email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="prenom.nom@cnssap.cd"
                className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium text-cnssap-muted mb-1.5">Mot de passe</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-premium" />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1e1e1e' }}>
            <button type="button" onClick={handleDemo} disabled={demoLoading}
              className="w-full py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2a', color: '#888' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#ccc'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888'; }}>
              {demoLoading ? 'Connexion…' : '👁 Accès démo — lecture seule'}
            </button>
            <p className="mt-4 text-center text-xs text-cnssap-dim leading-relaxed">
              Accès réservé au personnel CNSSAP.<br />
              Contactez la DRH pour vos identifiants.
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-[10px] text-cnssap-dim/40 mt-4">
          Smart Reporting RDJ · v1.0
        </p>
      </div>
    </div>
  );
}
