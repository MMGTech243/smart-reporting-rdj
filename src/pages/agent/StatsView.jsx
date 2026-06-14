import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie,
} from 'recharts';

function hmsToDecimal(str) {
  if (!str) return 0;
  const [h, m] = str.replace('h', ':').split(':').map(Number);
  return +(h + (m || 0) / 60).toFixed(2);
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #222', borderRadius: 8, color: '#e0e0e0', fontSize: 12 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

export default function StatsView() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('month'); // 'month' | '3months'

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const now   = new Date();
    const months = period === '3months' ? 3 : 1;
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).toISOString().split('T')[0];
    getDocs(query(
      collection(db, 'rdj_reports'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      orderBy('date', 'desc'),
      limit(100)
    )).then(snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user, period]);

  const onTime     = reports.filter(r => !r.heureArrivee || r.heureArrivee <= '08:30').length;
  const late       = reports.length - onTime;
  const totalTasks = reports.reduce((s, r) => s + (r.taches?.length ?? 0), 0);
  const avgHours   = reports.length
    ? (reports.reduce((s, r) => s + hmsToDecimal(r.heuresEffectives), 0) / reports.length).toFixed(1)
    : '0';

  // Données bar chart : 14 derniers rapports
  const barData = [...reports].reverse().slice(-14).map(r => ({
    date:    r.date?.slice(5) ?? '',
    heures:  hmsToDecimal(r.heuresEffectives),
    isLate:  r.heureArrivee && r.heureArrivee > '08:30',
  }));

  // Données camembert
  const pieData = [
    { name: 'À temps', value: onTime, color: '#2ecc71' },
    { name: 'Retard',  value: late,   color: '#e67e22' },
  ].filter(d => d.value > 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-cnssap-dim border-t-cnssap-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <h1 className="text-xl font-bold text-white">Mes Statistiques</h1>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          {[{ k: 'month', l: 'Ce mois' }, { k: '3months', l: '3 mois' }].map(p => (
            <button key={p.k} onClick={() => setPeriod(p.k)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={period === p.k
                ? { background: 'linear-gradient(135deg,rgba(0,63,127,0.5),rgba(0,96,192,0.3))', color: 'white', border: '1px solid rgba(77,159,255,0.2)' }
                : { color: '#666' }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: '📋', label: 'Rapports',    value: reports.length, color: '#4d9fff' },
          { icon: '⏱',  label: 'Moy. heures', value: `${avgHours}h`, color: '#2ecc71' },
          { icon: '⏰', label: 'Retards',     value: late,           color: '#e67e22' },
          { icon: '✅', label: 'Tâches',      value: totalTasks,     color: '#9b59b6' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-cnssap-dim mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-cnssap-dim">
          <p className="text-4xl mb-3">📊</p>
          <p>Aucun rapport sur cette période.</p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="rounded-xl p-5 mb-5" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-sm font-semibold text-white mb-4">Heures effectives (14 derniers jours)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}h`, 'Heures']} />
                <Bar dataKey="heures" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.isLate ? '#e67e22' : '#4d9fff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-cnssap-dim">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#4d9fff' }} /> À temps
              </span>
              <span className="flex items-center gap-1.5 text-xs text-cnssap-dim">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#e67e22' }} /> Retard
              </span>
            </div>
          </div>

          {/* Pie chart ponctualité */}
          {pieData.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <p className="text-sm font-semibold text-white mb-4">Ponctualité</p>
              <div className="flex items-center justify-center gap-8 flex-wrap">
                <PieChart width={150} height={150}>
                  <Pie data={pieData} cx={70} cy={70} innerRadius={42} outerRadius={65}
                    dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-3">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                      <div>
                        <p className="text-lg font-bold text-white">{d.value}</p>
                        <p className="text-xs text-cnssap-dim">{d.name}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-cnssap-border">
                    <p className="text-xs text-cnssap-dim">
                      Taux de ponctualité
                    </p>
                    <p className="text-lg font-bold text-cnssap-success">
                      {Math.round(onTime / reports.length * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
