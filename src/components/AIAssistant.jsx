import { useState, useRef, useEffect } from 'react';

const MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';

function buildSystemPrompt(todayReports, totalAgents, date) {
  const taux = totalAgents > 0
    ? Math.round(todayReports.length / totalAgents * 100) : 0;

  const submittedNames = todayReports
    .map(r => `${r.prenom} ${r.nom} (${r.directionId})`)
    .join(', ') || 'Aucun';

  return `Tu es l'assistant IA de la CNSSAP (Caisse Nationale de Sécurité Sociale des Agents Publics), spécialisé dans l'analyse des rapports journaliers RH.

Date d'aujourd'hui : ${date}
Rapports soumis aujourd'hui : ${todayReports.length} / ${totalAgents} agents (${taux}%)
Agents ayant soumis : ${submittedNames}

Réponds de façon concise et professionnelle en français. Tu peux analyser les tendances, donner des conseils RH, générer des résumés et répondre aux questions sur les données.`;
}

function Message({ role, content }) {
  const isAI = role === 'assistant';
  return (
    <div className={`flex gap-2.5 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
        isAI
          ? 'text-white'
          : 'bg-cnssap-surface2 text-cnssap-muted'
      }`}
        style={isAI ? { background: 'linear-gradient(135deg,#003f7f,#0060c0)' } : {}}>
        {isAI ? '✦' : '👤'}
      </div>
      <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isAI
          ? 'text-cnssap-text'
          : 'text-white'
      }`}
        style={isAI
          ? { background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e1e' }
          : { background: 'linear-gradient(135deg, rgba(0,63,127,0.4), rgba(0,96,192,0.25))', border: '1px solid rgba(77,159,255,0.15)' }}>
        {content}
      </div>
    </div>
  );
}

export default function AIAssistant({ todayReports = [], totalAgents = 0 }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const bottomRef              = useRef(null);
  const apiKey                 = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday:'long', day:'numeric', month:'long', year:'numeric',
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const QUICK = [
    'Résume la journée en une phrase',
    'Quelles directions sont en retard ?',
    'Conseil pour améliorer le taux',
    'Exporte moi un point de situation',
  ];

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    if (!apiKey) { setError('Clé API Anthropic manquante. Ajoutez VITE_ANTHROPIC_API_KEY dans .env'); return; }

    setInput('');
    setError('');
    const newMsgs = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type':                         'application/json',
          'x-api-key':                            apiKey,
          'anthropic-version':                    '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          system: buildSystemPrompt(todayReports, totalAgents, date),
          messages: newMsgs,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `Erreur ${res.status}`);
      }
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.content[0].text }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const taux = totalAgents > 0 ? Math.round(todayReports.length / totalAgents * 100) : 0;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
      {/* Header — toujours visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'linear-gradient(135deg,#003f7f,#0060c0)', boxShadow: '0 0 12px rgba(77,159,255,0.25)' }}>
            ✦
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Assistant IA CNSSAP</p>
            <p className="text-xs text-cnssap-dim">
              {open ? 'Cliquer pour réduire' : `Journée : ${taux}% de soumission — ${todayReports.length} / ${totalAgents} rapports`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {apiKey
            ? <span className="text-xs text-cnssap-success bg-green-900/20 border border-cnssap-success/25 px-2 py-0.5 rounded-full">Claude IA</span>
            : <span className="text-xs text-cnssap-warning bg-amber-900/20 border border-cnssap-warning/20 px-2 py-0.5 rounded-full">Clé API manquante</span>}
          <span className="text-cnssap-dim text-xs transition-transform duration-200"
            style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </div>
      </button>

      {/* Corps — masqué si fermé */}
      {open && (
        <div className="border-t" style={{ borderColor: '#1e1e1e' }}>
          {/* Messages */}
          <div className="h-72 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✦</p>
                <p className="text-xs text-cnssap-muted mb-4">Posez une question ou choisissez un raccourci</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-[13px] px-3 py-1.5 rounded-full text-cnssap-accent transition-colors hover:text-white"
                      style={{ background: 'rgba(0,63,127,0.2)', border: '1px solid rgba(77,159,255,0.2)' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => <Message key={i} {...m} />)}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#003f7f,#0060c0)' }}>✦</div>
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e1e' }}>
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-cnssap-accent rounded-full animate-bounce"
                      style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            {error && (
              <p className="text-xs text-cnssap-danger bg-red-900/20 border border-cnssap-danger/20 rounded-lg px-3 py-2">
                ⚠ {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK.slice(0,2).map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-xs px-2.5 py-1 rounded-full text-cnssap-dim hover:text-white transition-colors"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}>
                    {q}
                  </button>
                ))}
                <button onClick={() => setMessages([])}
                  className="text-xs px-2.5 py-1 rounded-full text-cnssap-dim hover:text-cnssap-danger transition-colors ml-auto"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}>
                  Effacer
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Posez une question sur les rapports du jour…"
                disabled={loading}
                className="input-premium flex-1 resize-none text-sm"
                style={{ minHeight: '40px', maxHeight: '96px' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="btn-primary px-4 rounded-xl text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ↑
              </button>
            </div>
            <p className="text-xs text-cnssap-dim mt-1.5 text-right">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
          </div>
        </div>
      )}
    </div>
  );
}
