import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { DIRECTIONS } from '../../data/directions';

const today = () => new Date().toISOString().split('T')[0];

export default function Alertes() {
  const { user } = useAuth();
  const [allUsers,     setAllUsers]     = useState([]);
  const [todayReps,    setTodayReps]    = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [creating,     setCreating]     = useState(false);
  const [created,      setCreated]      = useState(false);

  // Charger utilisateurs
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Écoute temps réel des rapports du jour
  useEffect(() => {
    const q = query(collection(db, 'rdj_reports'), where('date', '==', today()));
    return onSnapshot(q, snap => {
      setTodayReps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Historique des alertes (30 derniers jours)
  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    getDocs(q).then(snap => {
      setAlertHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [created]);

  const agents        = allUsers.filter(u => u.role !== undefined);
  const submittedUids = new Set(todayReps.map(r => r.userId));
  const nonSoumis     = agents.filter(u => !submittedUids.has(u.id));
  const tauxSoumission = agents.length > 0 ? Math.round((agents.length - nonSoumis.length) / agents.length * 100) : 0;

  const handleCreateAlerte = async () => {
    setCreating(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        type:          'bilan-soumission',
        date:          today(),
        totalAgents:   agents.length,
        soumisCount:   agents.length - nonSoumis.length,
        nonSubmitters: nonSoumis.map(u => ({
          userId:      u.id,
          nom:         u.nom         ?? '',
          prenom:      u.prenom      ?? '',
          directionId: u.directionId ?? '',
        })),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      setCreated(c => !c); // refresh history
    } finally {
      setCreating(false);
    }
  };

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Alertes</h1>
        <p className="text-sm text-cnssap-muted capitalize mt-0.5">{dateLabel}</p>
      </div>

      {/* Situation du jour */}
      <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Situation du jour</h2>
          <button
            onClick={handleCreateAlerte}
            disabled={creating}
            className="px-4 py-2 bg-cnssap-primary hover:bg-cnssap-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {creating ? 'Enregistrement…' : '🔔 Enregistrer l\'alerte du jour'}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-cnssap-surface2 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-cnssap-success">{agents.length - nonSoumis.length}</p>
            <p className="text-xs text-cnssap-dim mt-1">Rapports reçus</p>
          </div>
          <div className={`rounded-lg p-4 text-center ${nonSoumis.length > 0 ? 'bg-amber-900/30' : 'bg-green-900/30'}`}>
            <p className={`text-2xl font-bold ${nonSoumis.length > 0 ? 'text-cnssap-warning' : 'text-cnssap-success'}`}>
              {nonSoumis.length}
            </p>
            <p className="text-xs text-cnssap-dim mt-1">Non soumis</p>
          </div>
          <div className="bg-cnssap-surface2 rounded-lg p-4 text-center">
            <p className={`text-2xl font-bold ${tauxSoumission >= 80 ? 'text-cnssap-success' : tauxSoumission >= 50 ? 'text-cnssap-warning' : 'text-cnssap-danger'}`}>
              {tauxSoumission}%
            </p>
            <p className="text-xs text-cnssap-dim mt-1">Taux soumission</p>
          </div>
        </div>

        {/* Liste non soumis */}
        {nonSoumis.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-cnssap-success font-medium text-sm">Tous les agents ont soumis leur rapport !</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-cnssap-warning uppercase tracking-wide mb-3">
              Agents n'ayant pas soumis ({nonSoumis.length})
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {nonSoumis.map(u => (
                <div key={u.id} className="flex items-center gap-3 bg-cnssap-surface2 border border-cnssap-border rounded-lg px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-900/50 flex items-center justify-center text-cnssap-warning text-xs font-bold shrink-0">
                    {(u.prenom?.[0] ?? u.nom?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cnssap-text truncate">
                      {u.prenom} {u.nom}
                    </p>
                    <p className="text-xs text-cnssap-dim truncate">
                      {u.poste ?? '—'} · {DIRECTIONS.find(d => d.id === u.directionId)?.nom?.replace('Direction des ','')?.replace('Direction ','') ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs text-cnssap-warning bg-amber-900/40 border border-cnssap-warning/30 px-2 py-0.5 rounded-full shrink-0">
                    ⚠ Non soumis
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Historique alertes */}
      <div className="bg-cnssap-surface border border-cnssap-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Historique des alertes</h2>
        {alertHistory.length === 0 ? (
          <p className="text-cnssap-dim text-sm">Aucune alerte enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {alertHistory.map(a => {
              const d = a.createdAt?.toDate?.()?.toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              }) ?? a.date;
              const rate = a.totalAgents > 0 ? Math.round(a.soumisCount / a.totalAgents * 100) : 0;
              return (
                <div key={a.id} className="flex items-center justify-between bg-cnssap-surface2 border border-cnssap-border rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-cnssap-text capitalize">{d}</p>
                    <p className="text-xs text-cnssap-dim mt-0.5">
                      {a.soumisCount} / {a.totalAgents} agents · {a.nonSubmitters?.length ?? 0} absents
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    rate >= 80 ? 'bg-green-900/40 text-cnssap-success border border-cnssap-success/30'
                    : rate >= 50 ? 'bg-amber-900/40 text-cnssap-warning border border-cnssap-warning/30'
                    : 'bg-red-900/40 text-cnssap-danger border border-cnssap-danger/30'
                  }`}>
                    {rate}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
