import { useLanguage } from '../contexts/LanguageContext';

const STACK = [
  { icon: '⚛️', name: 'React 19',          role: 'UI Framework' },
  { icon: '⚡', name: 'Vite 8',             role: 'Build tool' },
  { icon: '🔥', name: 'Firebase',           role: 'Auth · Firestore · Hosting' },
  { icon: '🎨', name: 'Tailwind CSS 3',     role: 'Styling' },
  { icon: '📊', name: 'Recharts',           role: 'Charts & analytics' },
  { icon: '📄', name: 'jsPDF + SheetJS',    role: 'PDF & Excel export' },
  { icon: '✦',  name: 'Claude Haiku',       role: 'AI Assistant' },
  { icon: '📦', name: 'React Router 7',     role: 'Navigation' },
];

export default function AboutModal({ onClose }) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl animate-fade-up overflow-hidden"
        style={{ background: '#111', border: '1px solid #222', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-cnssap-border2" />
        </div>

        {/* Hero */}
        <div className="relative px-6 pt-6 pb-8 text-center overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(0,63,127,0.25) 0%, transparent 100%)' }}>
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #003f7f, transparent 70%)', filter: 'blur(30px)' }} />

          <div className="relative flex justify-center mb-4">
            <div className="relative">
              <img src="/logo.jpeg" alt="CNSSAP"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cnssap-primary/50 shadow-2xl" />
              <div className="absolute -inset-1 rounded-2xl animate-glow opacity-40 pointer-events-none"
                style={{ background: 'linear-gradient(135deg,#003f7f,#4d9fff)', filter: 'blur(6px)', zIndex: -1 }} />
            </div>
          </div>

          <h2 className="text-lg font-bold text-white mb-1">{t('about.app')}</h2>
          <p className="text-xs text-cnssap-accent font-medium mb-3">{t('about.version')}</p>
          <p className="text-xs text-cnssap-muted leading-relaxed max-w-xs mx-auto">{t('about.desc')}</p>
        </div>

        <div className="px-5 pb-6 space-y-5">

          {/* Organisation */}
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
            <span className="text-2xl">🏛</span>
            <div>
              <p className="text-xs font-semibold text-white">CNSSAP</p>
              <p className="text-xs text-cnssap-dim mt-0.5">{t('about.org')}</p>
            </div>
          </div>

          {/* Stack */}
          <div>
            <p className="text-xs font-semibold text-cnssap-dim uppercase tracking-widest mb-2">{t('about.stack')}</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
              {STACK.map((s, i) => (
                <div key={s.name}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #161616' : '' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#161616'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base w-5 text-center">{s.icon}</span>
                    <span className="text-xs font-medium text-white">{s.name}</span>
                  </div>
                  <span className="text-xs text-cnssap-dim">{s.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold text-cnssap-dim uppercase tracking-widest mb-2">{t('about.links')}</p>
            <div className="flex gap-2">
              <a href="https://smart-reporting-rdj.web.app" target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-cnssap-accent transition-colors hover:text-white"
                style={{ background: 'rgba(0,63,127,0.2)', border: '1px solid rgba(77,159,255,0.2)' }}>
                🌐 {t('about.app_url')}
              </a>
              <a href="https://github.com/MMGTech243/smart-reporting-rdj" target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-cnssap-dim transition-colors hover:text-white"
                style={{ background: '#1a1a1a', border: '1px solid #222' }}>
                ⌥ {t('about.code_url')}
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1 pt-1">
            <p className="text-xs text-cnssap-muted">{t('about.dev')}</p>
            <p className="text-xs text-cnssap-dim">{t('about.year')}</p>
          </div>

          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-cnssap-dim hover:text-white transition-colors"
            style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
