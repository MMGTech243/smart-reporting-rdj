import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { DIRECTIONS } from '../../data/directions';
import useCounter from '../../hooks/useCounter';
import AIAssistant from '../../components/AIAssistant';

const today = () => new Date().toISOString().split('T')[0];

// ── Progress ring SVG ─────────────────────────────────────────────────────────
function ProgressRing({ value, size = 72, stroke = 6 }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(value / 100, 1)) * circ;
  const color = value >= 80 ? '#2ecc71' : value >= 50 ? '#e67e22' : '#e74c3c';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} stroke="#1e1e1e" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent = '#4d9fff', children }) {
  return (
    <div className="card-accent rounded-xl p-5 relative overflow-hidden"
      style={{ background: '#111', border: '1px solid #1e1e1e' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accent}88 0%, ${accent}22 100%)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-[13px] text-cnssap-dim font-medium mb-1">{label}</p>
          {children || (
            <p className="text-3xl font-bold text-white leading-none tracking-tight">{value}</p>
          )}
          {sub && <p className="text-xs text-cnssap-dim mt-1.5">{sub}</p>}
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

// ── Tooltip custom ────────────────────────────────────────────────────────────
const DarkTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-0.5">{label}</p>
      {payload.map((p,i) => <p key={i} style={{ color: p.fill }}>{p.name} : {p.value}</p>)}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [todayReports, setTodayReports] = useState([]);
  const [allUsers,     setAllUsers]     = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    const q = query(collection(db, 'rdj_reports'), where('date', '==', today()));
    return onSnapshot(q, snap => setTodayReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingUsers(false);
    });
  }, []);

  const agents         = allUsers.filter(u => u.role !== undefined);
  const totalAgents    = agents.length;
  const submittedUids  = new Set(todayReports.map(r => r.userId));
  const soumisCount    = submittedUids.size;
  const nonSoumis      = agents.filter(u => !submittedUids.has(u.id));
  const taux           = totalAgents > 0 ? Math.round(soumisCount / totalAgents * 100) : 0;

  const animSoumis = useCounter(soumisCount);
  const animNonS   = useCounter(nonSoumis.length);
  const animTaux   = useCounter(taux);

  const heuresMoy = (() => {
    const hrs = todayReports.map(r => r.heuresEffectives).filter(Boolean).map(h => {
      const [hs, ms] = h.replace('h',':').split(':').map(Number);
      return hs + (ms||0)/60;
    });
    if (!hrs.length) return '—';
    const avg = hrs.reduce((a,b)=>a+b,0)/hrs.length;
    return `${Math.floor(avg)}h${Math.round((avg-Math.floor(avg))*60).toString().padStart(2,'0')}`;
  })();

  const chartData = DIRECTIONS.map(dir => ({
    name:  dir.nom.replace('Direction des ','').replace('Direction ','').substring(0,12),
    count: todayReports.filter(r => r.directionId === dir.id).length,
  })).filter(d => d.count > 0);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 page-enter">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-cnssap-muted capitalize mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-cnssap-success"
          style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-cnssap-success animate-pulse-slow inline-block" />
          Temps réel
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Taux — anneau */}
        <div className="card-accent rounded-xl p-5 md:col-span-1 relative overflow-hidden"
          style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg, #003f7f88, transparent)' }} />
          <p className="text-[13px] text-cnssap-dim font-medium mb-3">Taux de soumission</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing value={taux} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{animTaux}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-cnssap-muted">{soumisCount} / {totalAgents}</p>
              <p className="text-xs text-cnssap-dim mt-0.5">agents</p>
            </div>
          </div>
        </div>

        <KpiCard icon="✅" label="Rapports reçus"    sub="aujourd'hui"                     accent="#2ecc71">
          <p className="text-3xl font-bold text-white leading-none">{animSoumis}</p>
        </KpiCard>

        <KpiCard icon="⚠️" label="Non soumis"        sub={loadingUsers ? '…' : `/ ${totalAgents} agents`} accent="#e67e22">
          <p className={`text-3xl font-bold leading-none ${nonSoumis.length > 0 ? 'text-cnssap-warning' : 'text-cnssap-success'}`}>
            {animNonS}
          </p>
        </KpiCard>

        <KpiCard icon="⏱" label="Moy. heures eff."  sub="rapports du jour"                accent="#4d9fff">
          <p className="text-3xl font-bold text-white leading-none">{heuresMoy}</p>
        </KpiCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-xs font-semibold text-cnssap-dim uppercase tracking-wider mb-4">Soumissions par direction</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555' }} />
                <YAxis tick={{ fontSize: 10, fill: '#555' }} allowDecimals={false} />
                <Tooltip content={<DarkTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Rapports" radius={[4,4,0,0]}>
                  {chartData.map((_,i) => <Cell key={i} fill={i % 2 === 0 ? '#003f7f' : '#0060c0'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Non soumis */}
        <div className="rounded-xl p-5" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <p className="text-xs font-semibold text-cnssap-dim uppercase tracking-wider mb-4">
            {nonSoumis.length === 0 ? '✅ Tous les agents ont soumis' : `Agents manquants (${nonSoumis.length})`}
          </p>
          {nonSoumis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="text-4xl">🎉</span>
              <p className="text-xs text-cnssap-muted">Excellent taux de soumission !</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-y-auto">
              {nonSoumis.map(u => (
                <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(230,126,34,0.06)', border: '1px solid rgba(230,126,34,0.15)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#e67e22,#d35400)' }}>
                    {(u.prenom?.[0] ?? u.nom?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{u.prenom} {u.nom}</p>
                    <p className="text-xs text-cnssap-dim truncate">
                      {DIRECTIONS.find(d => d.id === u.directionId)?.nom?.replace('Direction des ','')?.replace('Direction ','') ?? '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <div className="mb-6">
        <AIAssistant todayReports={todayReports} totalAgents={totalAgents} />
      </div>

      {/* Table rapports */}
      <div className="rounded-xl p-5" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        <p className="text-xs font-semibold text-cnssap-dim uppercase tracking-wider mb-4">Rapports reçus aujourd'hui</p>
        {todayReports.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <span className="text-3xl opacity-30">📋</span>
            <p className="text-xs text-cnssap-dim">Aucun rapport reçu pour l'instant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                  {['Agent','Direction','Arrivée','Heures eff.','Tâches','Soumis à'].map(h => (
                    <th key={h} className="text-left pb-2.5 text-xs text-cnssap-dim uppercase tracking-wide font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayReports
                  .slice().sort((a,b) => (b.submittedAt?.seconds??0)-(a.submittedAt?.seconds??0))
                  .map(r => (
                    <tr key={r.id} className="group transition-colors"
                      style={{ borderBottom: '1px solid #161616' }}
                      onMouseEnter={e => e.currentTarget.style.background='#161616'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td className="py-3 font-medium text-white">{r.prenom} {r.nom}</td>
                      <td className="py-3 text-cnssap-dim text-xs max-w-[140px] truncate">
                        {DIRECTIONS.find(d=>d.id===r.directionId)?.nom?.replace('Direction des ','')?.replace('Direction ','') ?? '—'}
                      </td>
                      <td className="py-3 text-cnssap-muted">{r.heureArrivee||'—'}</td>
                      <td className="py-3">
                        <span className="text-cnssap-accent font-semibold">{r.heuresEffectives||'—'}</span>
                      </td>
                      <td className="py-3 text-cnssap-dim">{r.taches?.length??0}</td>
                      <td className="py-3 text-cnssap-dim text-xs">
                        {r.submittedAt?.toDate?.()?.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})??'—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
