import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  // phase 0 = logo entre  |  1 = texte entre  |  2 = sortie

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => {
      sessionStorage.setItem('splashSeen', '1');
      navigate('/login');
    }, 3400);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [navigate]);

  const skip = () => {
    sessionStorage.setItem('splashSeen', '1');
    navigate('/login');
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: '#080808',
        transition: 'opacity 0.5s ease',
        opacity: phase === 2 ? 0 : 1,
      }}
    >
      {/* Glow de fond */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,63,127,0.35) 0%, transparent 70%)',
            filter: 'blur(60px)',
            transition: 'opacity 0.8s ease',
            opacity: phase >= 1 ? 1 : 0,
          }} />
      </div>

      {/* Logo */}
      <div style={{
        transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1)',
        transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(20px)',
        opacity: phase >= 1 ? 1 : 0,
      }}>
        <div className="relative mb-8 flex justify-center">
          {/* Anneau animé */}
          <div className="absolute inset-0 rounded-full animate-glow"
            style={{
              background: 'conic-gradient(from 0deg, #003f7f, #4d9fff, #003f7f)',
              filter: 'blur(8px)',
              opacity: 0.5,
              margin: '-6px',
              borderRadius: '28px',
            }} />
          <img
            src="/logo.jpeg"
            alt="CNSSAP"
            className="relative w-24 h-24 object-cover shadow-2xl"
            style={{ borderRadius: '22px' }}
          />
        </div>
      </div>

      {/* Texte */}
      <div style={{
        transition: 'all 0.6s ease 0.3s',
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(16px)',
        opacity: phase >= 1 ? 1 : 0,
        textAlign: 'center',
      }}>
        <p className="text-[11px] font-bold text-cnssap-accent uppercase tracking-[0.3em] mb-2">
          CNSSAP
        </p>
        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
          Smart Reporting RDJ
        </h1>
        <p className="text-sm text-cnssap-muted">
          Reporting Déclaratif Journalier
        </p>
      </div>

      {/* Barre de progression */}
      <div style={{
        transition: 'opacity 0.4s ease 0.5s',
        opacity: phase >= 1 ? 1 : 0,
        marginTop: '56px',
        width: '120px',
      }}>
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
          <div className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #003f7f, #4d9fff)',
              width: phase >= 1 ? '100%' : '0%',
              transition: 'width 2s linear 0.1s',
            }} />
        </div>
      </div>

      {/* Version + Skip */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: 0, right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        transition: 'opacity 0.4s ease 0.6s',
        opacity: phase >= 1 ? 1 : 0,
      }}>
        <p className="text-[10px] text-cnssap-dim">v1.0.0 · © 2025 CNSSAP</p>
        <button onClick={skip}
          className="text-xs text-cnssap-dim hover:text-white transition-colors px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #222' }}>
          Passer →
        </button>
      </div>
    </div>
  );
}
