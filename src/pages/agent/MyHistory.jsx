import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { DIRECTIONS } from '../../data/directions';
import { exportRapportIndividuelPDF } from '../../utils/exportPdf';
import { exportAssiduiteExcel }       from '../../utils/exportExcel';

function monthRange() {
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [s.toISOString().split('T')[0], e.toISOString().split('T')[0]];
}

function ReportCard({ report, expanded, onToggle, showAgent }) {
  const date = new Date(report.date + 'T00:00:00');
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const submittedAt = report.submittedAt?.toDate?.()?.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  }) ?? '—';

  return (
    <div className="bg-cnssap-surface border border-cnssap-border rounded-xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-cnssap-surface2 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cnssap-primary/20 flex items-center justify-center shrink-0">
            <span className="text-lg">📋</span>
          </div>
          <div>
            {showAgent && (
              <p className="text-xs text-cnssap-accent font-medium mb-0.5">
                {report.prenom} {report.nom}
                {report.directionNom && <span className="text-cnssap-dim ml-2">· {report.directionNom.replace('Direction des ','').replace('Direction ','')}</span>}
              </p>
            )}
            <p className="text-sm font-semibold text-white capitalize">{dateLabel}</p>
            <p className="text-xs text-cnssap-dim">
              Soumis à {submittedAt} · {report.taches?.length ?? 0} tâche(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.heuresEffectives && (
            <span className="text-xs bg-green-900/40 text-cnssap-success border border-cnssap-success/30 px-2 py-0.5 rounded-full font-medium">
              {report.heuresEffectives}
            </span>
          )}
          {report.heureArrivee && report.heureArrivee > '08:30' && (
            <span className="text-xs bg-amber-900/40 text-cnssap-warning border border-cnssap-warning/30 px-2 py-0.5 rounded-full">
              Retard
            </span>
          )}
          <span className="text-cnssap-dim text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-cnssap-border px-5 py-4 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-cnssap-accent uppercase tracking-wide mb-2">III — Assiduité</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-cnssap-muted">
              <span>Arrivée : <strong className="text-cnssap-text">{report.heureArrivee || '—'}</strong></span>
              <span>Départ : <strong className="text-cnssap-text">{report.heureDepart || '—'}</strong></span>
              {report.heureDepartPause && <>
                <span>Dép. pause : <strong className="text-cnssap-text">{report.heureDepartPause}</strong></span>
                <span>Ret. pause : <strong className="text-cnssap-text">{report.heureRetourPause || '—'}</strong></span>
              </>}
              <span className="col-span-2 mt-1 text-cnssap-accent font-semibold">
                Heures effectives : {report.heuresEffectives || '—'}
              </span>
            </div>
          </div>

          {report.taches?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-cnssap-accent uppercase tracking-wide mb-2">
                IV — Productivité ({report.taches.length} tâche{report.taches.length > 1 ? 's' : ''})
              </p>
              <ul className="space-y-1">
                {report.taches.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-cnssap-muted">
                    <span className="text-cnssap-border2 mt-0.5">•</span>
                    <span>
                      {t.description}
                      {t.categorie && (
                        <span className="ml-2 text-xs text-cnssap-accent bg-cnssap-primary/20 px-1.5 py-0.5 rounded">{t.categorie}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.developpement?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-cnssap-accent uppercase tracking-wide mb-2">V — Développement Personnel</p>
              <ul className="space-y-1">
                {report.developpement.map((d, i) => (
                  <li key={i} className="text-cnssap-muted">
                    📚 {d.titre} {d.type && <span className="text-xs text-cnssap-dim">({d.type})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.observations && (
            <div>
              <p className="text-xs font-semibold text-cnssap-accent uppercase tracking-wide mb-1">VI — Observations</p>
              <p className="text-cnssap-muted whitespace-pre-line">{report.observations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyHistory() {
  const { user, userProfile } = useAuth();
  const isSupervisor = ['dg','drh'].includes(userProfile?.role);

  const [reports,    setReports]   = useState([]);
  const [allUsers,   setAllUsers]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [expanded,   setExpanded]  = useState(null);
  const [startDate,  setStart]     = useState(() => monthRange()[0]);
  const [endDate,    setEnd]       = useState(() => monthRange()[1]);
  const [dirFilter,  setDirFilter] = useState('all');
  const [search,     setSearch]    = useState('');
  const [exporting,  setExporting] = useState('');

  useEffect(() => {
    if (isSupervisor) {
      getDocs(collection(db, 'users')).then(snap => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [isSupervisor]);

  const loadReports = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setExpanded(null);

    let q;
    if (isSupervisor) {
      q = query(
        collection(db, 'rdj_reports'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc'),
        limit(500)
      );
    } else {
      q = query(
        collection(db, 'rdj_reports'),
        where('userId',  '==', user.uid),
        where('date',    '>=', startDate),
        where('date',    '<=', endDate),
        orderBy('date',  'desc'),
        limit(120)
      );
    }

    getDocs(q).then(snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user, isSupervisor, startDate, endDate]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // Filtres client-side (direction + recherche)
  const filtered = reports.filter(r => {
    if (dirFilter !== 'all' && r.directionId !== dirFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${r.prenom ?? ''} ${r.nom ?? ''}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const periodLabel = (() => {
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate   + 'T00:00:00');
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return s.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return `${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} — ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
  })();

  const handlePDF = () => {
    setExporting('pdf');
    const u = userProfile ? { ...userProfile, id: user.uid } : { nom: '', prenom: '', poste: '' };
    exportRapportIndividuelPDF({ reports: filtered, user: u, period: periodLabel });
    setExporting('');
  };

  const handleExcel = () => {
    setExporting('excel');
    const users = isSupervisor ? allUsers : [{ ...userProfile, id: user.uid }];
    exportAssiduiteExcel({
      reports: filtered,
      users,
      period: periodLabel,
      workingDays: 0,
    });
    setExporting('');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {isSupervisor ? 'Historique — Tous les agents' : 'Mon Historique'}
          </h1>
          <p className="text-sm text-cnssap-muted mt-0.5">
            {filtered.length} rapport{filtered.length !== 1 ? 's' : ''}
            {loading ? ' · chargement…' : ''}
          </p>
        </div>
        {isSupervisor && (
          <div className="flex gap-2 shrink-0">
            <button onClick={handlePDF}   disabled={!!exporting || loading || filtered.length === 0}
              className="px-3 py-1.5 bg-cnssap-primary hover:bg-cnssap-hover disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              {exporting === 'pdf' ? '…' : '📄 PDF'}
            </button>
            <button onClick={handleExcel} disabled={!!exporting || loading || filtered.length === 0}
              className="px-3 py-1.5 bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              {exporting === 'excel' ? '…' : '📊 Excel'}
            </button>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <p className="text-xs text-cnssap-dim mb-1.5">Du</p>
          <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
            className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text focus:outline-none focus:border-cnssap-accent" />
        </div>
        <div>
          <p className="text-xs text-cnssap-dim mb-1.5">Au</p>
          <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
            className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text focus:outline-none focus:border-cnssap-accent" />
        </div>
        {isSupervisor && (
          <>
            <div>
              <p className="text-xs text-cnssap-dim mb-1.5">Direction</p>
              <select value={dirFilter} onChange={e => setDirFilter(e.target.value)}
                className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text focus:outline-none focus:border-cnssap-accent cursor-pointer">
                <option value="all">Toutes</option>
                {DIRECTIONS.map(d => <option key={d.id} value={d.id}>{d.nom.replace('Direction des ','').replace('Direction ','')}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-cnssap-dim mb-1.5">Rechercher un agent</p>
              <input type="text" placeholder="Nom ou prénom…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 bg-cnssap-surface2 border border-cnssap-border2 rounded-lg text-xs text-cnssap-text placeholder-cnssap-dim focus:outline-none focus:border-cnssap-accent w-44" />
            </div>
          </>
        )}
      </div>

      {/* Liste */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-cnssap-muted">Aucun rapport trouvé pour cette période.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(r => (
          <ReportCard
            key={r.id}
            report={r}
            expanded={expanded === r.id}
            onToggle={() => setExpanded(p => p === r.id ? null : r.id)}
            showAgent={isSupervisor}
          />
        ))}
      </div>
    </div>
  );
}
