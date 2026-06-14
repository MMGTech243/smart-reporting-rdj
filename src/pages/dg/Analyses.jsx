import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DIRECTIONS } from '../../data/directions';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { exportRapportMensuelPDF } from '../../utils/exportPdf';
import { exportAssiduiteExcel }    from '../../utils/exportExcel';

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseHeures(h) {
  if (!h) return 0;
  const [hs, ms] = h.replace('h', ':').split(':').map(Number);
  return hs + (ms || 0) / 60;
}
function fmtH(d) {
  if (!d) return '—';
  const h = Math.floor(d), m = Math.round((d - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}
function countWorkingDays(start, end) {
  let n = 0;
  const d = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  while (d <= e) { if (d.getDay() !== 0 && d.getDay() !== 6) n++; d.setDate(d.getDate() + 1); }
  return n;
}
function datesInRange(start, end) {
  const out = [], d = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00');
  while (d <= e) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return out;
}
function monthRange(offset = 0) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + offset;
  const start = new Date(y, m, 1),  end = new Date(y, m + 1, 0);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-cnssap-surface border border-cnssap-border rounded-lg px-3 py-2 text-xs text-cnssap-text shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name} : {p.value}{p.unit ?? ''}</p>
      ))}
    </div>
  );
};

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5">
      <p className="text-xs text-cnssap-dim font-medium mb-1">{icon} {label}</p>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-cnssap-muted mt-1">{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analyses() {
  const [period,     setPeriod]   = useState('month-0');
  const [startDate,  setStart]    = useState(() => monthRange(0)[0]);
  const [endDate,    setEnd]      = useState(() => monthRange(0)[1]);
  const [reports,    setReports]  = useState([]);
  const [users,      setUsers]    = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [dirFilter,  setDirFilter]= useState('all');
  const [exporting,  setExporting]= useState('');

  // Period shortcuts
  const applyPeriod = (key) => {
    setPeriod(key);
    const now = new Date();
    if (key === 'month-0') { const [s, e] = monthRange(0);  setStart(s); setEnd(e); }
    if (key === 'month-1') { const [s, e] = monthRange(-1); setStart(s); setEnd(e); }
    if (key === 'week')    {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
      setStart(mon.toISOString().split('T')[0]);
      setEnd(fri.toISOString().split('T')[0]);
    }
  };

  // Load users once
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Load reports for period
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'rdj_reports'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
      limit(2000)
    );
    getDocs(q).then(snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [startDate, endDate]);

  const workingDays = useMemo(() => countWorkingDays(startDate, endDate), [startDate, endDate]);
  const allDates    = useMemo(() => datesInRange(startDate, endDate), [startDate, endDate]);

  const activeUsers  = users.filter(u => u.role !== undefined);
  const filteredReps = dirFilter === 'all' ? reports : reports.filter(r => r.directionId === dirFilter);

  // KPIs
  const totalSoumissions = filteredReps.length;
  const uniqueAgents     = activeUsers.length;
  const tauxMoyen        = workingDays > 0 && uniqueAgents > 0
    ? Math.round(totalSoumissions / (uniqueAgents * workingDays) * 100)
    : 0;

  const allHrs   = filteredReps.map(r => parseHeures(r.heuresEffectives)).filter(Boolean);
  const avgHeurs = allHrs.length ? allHrs.reduce((a, b) => a + b, 0) / allHrs.length : 0;

  const retards = filteredReps.filter(r => r.heureArrivee && r.heureArrivee > '08:30').length;

  const devCount   = filteredReps.filter(r => r.developpement?.length > 0).length;
  const tauxDev    = totalSoumissions > 0 ? Math.round(devCount / totalSoumissions * 100) : 0;

  // Chart 1 : soumissions par jour
  const dailyChart = allDates.map(date => {
    const dayReps = filteredReps.filter(r => r.date === date);
    const label   = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return {
      date: label,
      soumissions: dayReps.length,
      taux: uniqueAgents > 0 ? Math.round(dayReps.length / uniqueAgents * 100) : 0,
    };
  });

  // Chart 2 : heures effectives par direction
  const dirChart = DIRECTIONS.map(dir => {
    const dreps = filteredReps.filter(r => r.directionId === dir.id);
    const hrs   = dreps.map(r => parseHeures(r.heuresEffectives)).filter(Boolean);
    const avg   = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    return {
      name: dir.nom.replace('Direction des ', '').replace('Direction ', '').substring(0, 12),
      heures: parseFloat(avg.toFixed(2)),
      label: fmtH(avg),
    };
  }).filter(d => d.heures > 0);

  // Chart 3 : tâches par direction
  const taskChart = DIRECTIONS.map(dir => {
    const dreps   = filteredReps.filter(r => r.directionId === dir.id);
    const total   = dreps.reduce((s, r) => s + (r.taches?.length ?? 0), 0);
    const avg     = dreps.length ? total / dreps.length : 0;
    return {
      name: dir.nom.replace('Direction des ', '').replace('Direction ', '').substring(0, 12),
      taches: parseFloat(avg.toFixed(1)),
    };
  }).filter(d => d.taches > 0);

  // Table agents
  const agentTable = activeUsers.map(u => {
    const ureps   = filteredReps.filter(r => r.userId === u.id);
    const hrs     = ureps.map(r => parseHeures(r.heuresEffectives)).filter(Boolean);
    const avgH    = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const tasks   = ureps.reduce((s, r) => s + (r.taches?.length ?? 0), 0);
    const rate    = workingDays > 0 ? Math.round(ureps.length / workingDays * 100) : 0;
    const lates   = ureps.filter(r => r.heureArrivee > '08:30').length;
    return { ...u, presentDays: ureps.length, rate, avgH, tasks, lates };
  }).sort((a, b) => b.rate - a.rate);

  const periodLabel = (() => {
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate   + 'T00:00:00');
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return s.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  })();

  const handlePDF = () => {
    setExporting('pdf');
    try {
      exportRapportMensuelPDF({ reports: filteredReps, users: activeUsers, period: periodLabel, workingDays });
    } finally { setExporting(''); }
  };

  const handleExcel = () => {
    setExporting('excel');
    try {
      exportAssiduiteExcel({ reports: filteredReps, users: activeUsers, period: periodLabel, workingDays });
    } finally { setExporting(''); }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Analyses RH</h1>
          <p className="text-sm text-cnssap-muted mt-0.5">Assiduité · Productivité · Développement</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePDF}   disabled={!!exporting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-cnssap-primary hover:bg-cnssap-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            📄 {exporting === 'pdf' ? 'Génération…' : 'Export PDF'}
          </button>
          <button onClick={handleExcel} disabled={!!exporting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            📊 {exporting === 'excel' ? 'Génération…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        {/* Période rapide */}
        <div>
          <p className="text-xs text-cnssap-dim mb-1.5">Période</p>
          <div className="flex gap-1.5">
            {[
              { key: 'month-0', label: 'Ce mois' },
              { key: 'month-1', label: 'Mois préc.' },
              { key: 'week',    label: 'Cette semaine' },
            ].map(p => (
              <button key={p.key} onClick={() => applyPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p.key
                    ? 'bg-cnssap-primary text-white'
                    : 'bg-cnssap-surface2 text-cnssap-muted hover:text-white'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {/* Dates custom */}
        <div className="flex gap-2 items-end">
          <div>
            <p className="text-xs text-cnssap-dim mb-1.5">Du</p>
            <input type="date" value={startDate}
              onChange={e => { setPeriod('custom'); setStart(e.target.value); }}
              className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text focus:outline-none focus:border-cnssap-accent" />
          </div>
          <div>
            <p className="text-xs text-cnssap-dim mb-1.5">Au</p>
            <input type="date" value={endDate}
              onChange={e => { setPeriod('custom'); setEnd(e.target.value); }}
              className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text focus:outline-none focus:border-cnssap-accent" />
          </div>
        </div>
        {/* Direction */}
        <div>
          <p className="text-xs text-cnssap-dim mb-1.5">Direction</p>
          <select value={dirFilter} onChange={e => setDirFilter(e.target.value)}
            className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text focus:outline-none focus:border-cnssap-accent cursor-pointer">
            <option value="all">Toutes les directions</option>
            {DIRECTIONS.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
          </select>
        </div>
        {loading && <p className="text-xs text-cnssap-dim ml-auto">Chargement…</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard icon="📊" label="Taux assiduité moyen" value={`${tauxMoyen}%`}    sub={`${totalSoumissions} rapports · ${workingDays} jours`} />
        <KpiCard icon="⏱"  label="Heures eff. moyennes" value={fmtH(avgHeurs)}     sub="par rapport soumis" />
        <KpiCard icon="⚠️" label="Retards (> 08h30)"     value={retards}            sub={`sur ${totalSoumissions} rapports`} />
        <KpiCard icon="📚" label="Participation dév. perso" value={`${tauxDev}%`}  sub={`${devCount} rapports avec activité`} />
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-1 gap-6 mb-6">
        <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Taux de soumission journalier (%)</h2>
          {dailyChart.length === 0
            ? <p className="text-cnssap-dim text-sm">Aucune donnée pour cette période.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTaux" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#003f7f" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#003f7f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={[0, 100]} unit="%" />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="taux" name="Taux" unit="%" stroke="#4d9fff" fill="url(#gTaux)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Heures effectives moy. par direction</h2>
          {dirChart.length === 0
            ? <p className="text-cnssap-dim text-sm">Aucune donnée.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dirChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="h" />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="heures" name="Heures" unit="h" radius={[4,4,0,0]}>
                    {dirChart.map((_, i) => <Cell key={i} fill="#003f7f" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Productivité moy. par direction (tâches/j)</h2>
          {taskChart.length === 0
            ? <p className="text-cnssap-dim text-sm">Aucune donnée.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={taskChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="taches" name="Tâches/j" radius={[4,4,0,0]}>
                    {taskChart.map((_, i) => <Cell key={i} fill="#4d9fff" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Classement agents */}
      <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">
          Classement agents — {periodLabel}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cnssap-dim uppercase border-b border-cnssap-border">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">Agent</th>
                <th className="text-left pb-2 font-medium">Direction</th>
                <th className="text-left pb-2 font-medium">Présences</th>
                <th className="text-left pb-2 font-medium">Taux</th>
                <th className="text-left pb-2 font-medium">Heures moy.</th>
                <th className="text-left pb-2 font-medium">Tâches tot.</th>
                <th className="text-left pb-2 font-medium">Retards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cnssap-border">
              {agentTable.map((u, i) => (
                <tr key={u.id} className="hover:bg-cnssap-surface2 transition-colors">
                  <td className="py-2.5 text-cnssap-dim font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 font-medium text-cnssap-text">{u.prenom} {u.nom}</td>
                  <td className="py-2.5 text-cnssap-dim text-xs max-w-[120px] truncate">
                    {DIRECTIONS.find(d => d.id === u.directionId)?.nom?.replace('Direction des ','')?.replace('Direction ','') ?? '—'}
                  </td>
                  <td className="py-2.5 text-cnssap-muted">{u.presentDays} / {workingDays}</td>
                  <td className="py-2.5">
                    <span className={`font-semibold ${u.rate >= 80 ? 'text-cnssap-success' : u.rate >= 50 ? 'text-cnssap-warning' : 'text-cnssap-danger'}`}>
                      {u.rate}%
                    </span>
                  </td>
                  <td className="py-2.5 text-cnssap-accent">{fmtH(u.avgH)}</td>
                  <td className="py-2.5 text-cnssap-muted">{u.tasks}</td>
                  <td className="py-2.5">
                    {u.lates > 0
                      ? <span className="text-cnssap-warning font-medium">{u.lates}</span>
                      : <span className="text-cnssap-dim">0</span>}
                  </td>
                </tr>
              ))}
              {agentTable.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-cnssap-dim">Aucune donnée pour cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
