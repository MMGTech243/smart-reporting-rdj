import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate  = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#080808' }}
    >
      {/* Glow de fond */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,63,127,0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1.2s ease',
          }} />
      </div>

      {/* Contenu */}
      <div className="relative flex flex-col items-center gap-6 px-8 text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.2,0.64,1)',
        }}>

        {/* Logo */}
        <div className="relative">
          <div className="absolute -inset-2 rounded-[26px] opacity-40 animate-glow"
            style={{
              background: 'conic-gradient(from 0deg, #003f7f, #4d9fff, #0060c0, #003f7f)',
              filter: 'blur(10px)',
            }} />
          <img src="/logo.jpeg" alt="CNSSAP"
            className="relative w-28 h-28 object-cover shadow-2xl"
            style={{ borderRadius: '24px' }} />
        </div>

        {/* Texte */}
        <div style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.2s',
        }}>
          <p className="text-[11px] font-bold text-cnssap-accent uppercase tracking-[0.35em] mb-3">
            CNSSAP
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Smart Reporting RDJ
          </h1>
          <p className="text-sm text-cnssap-muted leading-relaxed max-w-xs mx-auto">
            Reporting Déclaratif Journalier<br />d'Assiduité et Productivité
          </p>
        </div>

        <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, #333, transparent)' }} />

        <p className="text-xs text-cnssap-dim max-w-[260px] leading-relaxed"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 0.35s' }}>
          Système numérique de gestion des présences et de productivité du personnel CNSSAP
        </p>

        {/* Bouton principal */}
        <div style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.5s',
          width: '100%',
          maxWidth: '260px',
        }}>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3.5 text-sm font-semibold tracking-wide"
          >
            Se connecter →
          </button>
        </div>

        {/* Démo */}
        <button
          onClick={() => navigate('/login')}
          className="text-xs text-cnssap-dim hover:text-white transition-colors"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 0.6s' }}
        >
          👁 Accès démo
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 0.7s' }}>
        <p className="text-[10px] text-cnssap-dim/50">v1.0.0 · © 2025 CNSSAP · Tous droits réservés</p>
      </div>
    </div>
  );
}
