import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const TODAY = new Date().toISOString().split('T')[0];

export default function CalendarView() {
  const { user } = useAuth();
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const y  = year;
    const m  = month;
    const yS = String(y);
    const mS = String(m + 1).padStart(2, '0');
    const start = `${yS}-${mS}-01`;
    const end   = `${yS}-${mS}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    getDocs(query(
      collection(db, 'rdj_reports'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    )).then(snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user, year, month]);

  const reportMap = Object.fromEntries(reports.map(r => [r.date, r]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay(); // 0=Sun
  const startPad    = firstDow === 0 ? 6 : firstDow - 1; // Mon-based

  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const prevM = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextM = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const submitted  = reports.length;
  const lates      = reports.filter(r => r.heureArrivee && r.heureArrivee > '08:30').length;
  const totalTasks = reports.reduce((s, r) => s + (r.taches?.length ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 page-enter">
      <h1 className="text-xl font-bold text-white mb-5">Calendrier des rapports</h1>

      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4 bg-cnssap-surface border border-cnssap-border rounded-xl px-4 py-3">
        <button onClick={prevM}
          className="p-1.5 rounded-lg text-cnssap-dim hover:text-white hover:bg-white/[0.06] transition-all">‹</button>
        <p className="font-semibold text-white capitalize">{monthLabel}</p>
        <button onClick={nextM}
          className="p-1.5 rounded-lg text-cnssap-dim hover:text-white hover:bg-white/[0.06] transition-all">›</button>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { color: 'rgba(46,204,113,0.5)',   label: 'Soumis à temps' },
          { color: 'rgba(230,126,34,0.5)',   label: 'Retard' },
          { color: 'rgba(231,76,60,0.35)',   label: 'Non soumis' },
          { color: 'rgba(255,255,255,0.04)', label: 'Weekend' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-cnssap-dim">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Grille calendrier */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 text-center" style={{ background: '#0d0d0d', borderBottom: '1px solid #1e1e1e' }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="py-2.5 text-xs font-semibold text-cnssap-dim">{d}</div>
          ))}
        </div>

        {/* Cellules */}
        <div className="grid grid-cols-7">
          {Array(startPad).fill(null).map((_, i) => (
            <div key={`p${i}`} className="aspect-square" style={{ border: '1px solid #0d0d0d', background: 'transparent' }} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const d   = i + 1;
            const ds  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const report   = reportMap[ds];
            const dow      = new Date(year, month, d).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isToday  = ds === TODAY;
            const isPast   = ds < TODAY;
            const isLate   = report?.heureArrivee && report.heureArrivee > '08:30';

            let bg      = 'transparent';
            let border  = '1px solid #0d0d0d';

            if (isWeekend)    { bg = 'rgba(255,255,255,0.015)'; }
            else if (report)  { bg = isLate ? 'rgba(230,126,34,0.15)' : 'rgba(46,204,113,0.12)';
                                 border = isLate ? '1px solid rgba(230,126,34,0.3)' : '1px solid rgba(46,204,113,0.25)'; }
            else if (isPast && !isWeekend) { bg = 'rgba(231,76,60,0.07)'; border = '1px solid rgba(231,76,60,0.18)'; }

            return (
              <div key={d} className="aspect-square flex flex-col items-center justify-center relative"
                style={{ background: bg, border }}>
                <p className={`text-sm font-semibold ${
                  isToday    ? 'text-cnssap-accent' :
                  isWeekend  ? 'text-cnssap-dim/30' :
                  report     ? (isLate ? 'text-cnssap-warning' : 'text-cnssap-success') :
                  isPast     ? 'text-red-400/50' : 'text-cnssap-muted'
                }`}>{d}</p>
                {report?.heuresEffectives && (
                  <p className="text-[9px] text-cnssap-dim leading-none">{report.heuresEffectives}</p>
                )}
                {isToday && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cnssap-accent" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Résumé du mois */}
      {loading ? (
        <div className="text-center py-6 text-cnssap-dim text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: '✅', label: 'Soumis',  value: submitted,  color: '#2ecc71' },
            { icon: '⏰', label: 'Retards', value: lates,      color: '#e67e22' },
            { icon: '📝', label: 'Tâches',  value: totalTasks, color: '#4d9fff' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-cnssap-dim mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
