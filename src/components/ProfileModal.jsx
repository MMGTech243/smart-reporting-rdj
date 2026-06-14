import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DIRECTIONS } from '../data/directions';

const ROLE_LABELS = {
  fr: { dg:'Directeur Général', drh:'DRH / Administration', chef:'Chef de Section', agent:'Agent / Stagiaire', admin:'Resp. Informatique' },
  en: { dg:'Director General',  drh:'HR / Administration',  chef:'Section Head',    agent:'Staff / Intern',    admin:'IT Administrator' },
};

export default function ProfileModal({ onClose, onAbout }) {
  const { user, userProfile, logout } = useAuth();
  const { lang, setLang, t }          = useLanguage();
  const navigate                       = useNavigate();

  const handleLogout = async () => {
    onClose();
    navigate('/');
    await logout();
  };
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState('');
  const [preview,   setPreview]   = useState(null);
  const [file,      setFile]      = useState(null);
  const inputRef = useRef();

  const initials = [userProfile?.prenom?.[0], userProfile?.nom?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  const photoURL = userProfile?.photoURL ?? null;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setSuccess('');
    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      setSuccess(t('profile.saved'));
      setFile(null);
    } catch (e) {
      setSuccess('Erreur : ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const direction = DIRECTIONS.find(d => d.id === userProfile?.directionId)?.nom ?? '—';
  const roleLabel = (ROLE_LABELS[lang] ?? ROLE_LABELS.fr)[userProfile?.role] ?? userProfile?.role;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl animate-fade-up"
        style={{ background: '#111', border: '1px solid #222', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-cnssap-border2" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1e1e1e' }}>
          <p className="font-semibold text-white text-sm">{t('profile.title')}</p>
          <button onClick={onClose} className="text-cnssap-dim hover:text-white transition-colors">✕</button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-cnssap-primary/40">
                {(preview ?? photoURL) ? (
                  <img src={preview ?? photoURL} alt="avatar"
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#003f7f,#0060c0)' }}>
                    {initials}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                <span className="text-white text-xs font-medium">📷</span>
              </div>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button onClick={() => inputRef.current?.click()}
              className="text-xs text-cnssap-accent hover:text-blue-300 transition-colors">
              {t('profile.change')}
            </button>
            {file && (
              <button onClick={handleUpload} disabled={uploading}
                className="btn-primary px-5 py-2 text-xs disabled:opacity-50">
                {uploading ? t('profile.uploading') : t('common.save')}
              </button>
            )}
            {success && <p className="text-xs text-cnssap-success">{success}</p>}
          </div>

          {/* Infos */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
            {[
              { label: t('profile.role'),      value: roleLabel },
              { label: t('profile.direction'), value: direction.replace('Direction des ','').replace('Direction ','') },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #1a1a1a' }}>
                <span className="text-xs text-cnssap-dim">{r.label}</span>
                <span className="text-xs text-white font-medium">{r.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-cnssap-dim">{t('profile.online')}</span>
              <span className="text-xs text-cnssap-success flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cnssap-success animate-pulse-slow" />
                {t('profile.online')}
              </span>
            </div>
          </div>

          {/* Langue */}
          <div>
            <p className="text-[10px] font-semibold text-cnssap-dim uppercase tracking-wide mb-2">{t('profile.language')}</p>
            <div className="flex gap-2">
              {[
                { code: 'fr', label: '🇫🇷 Français' },
                { code: 'en', label: '🇬🇧 English' },
              ].map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={lang === l.code ? {
                    background: 'linear-gradient(135deg, rgba(0,63,127,0.5), rgba(0,96,192,0.3))',
                    border: '1px solid rgba(77,159,255,0.3)',
                    color: 'white',
                  } : {
                    background: '#1a1a1a',
                    border: '1px solid #222',
                    color: '#666',
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* About link */}
          <button onClick={() => { onClose(); onAbout(); }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-white/[0.03]"
            style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
            <span className="text-xs text-cnssap-dim">{t('about.title')}</span>
            <span className="text-cnssap-dim text-xs">›</span>
          </button>

          {/* Déconnexion */}
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', color: '#e74c3c' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(231,76,60,0.08)'}>
            🚪 {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
