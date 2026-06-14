import * as XLSX from 'xlsx';

function parseHeures(h) {
  if (!h) return 0;
  const [hs, ms] = h.replace('h', ':').split(':').map(Number);
  return hs + (ms || 0) / 60;
}

function fmtH(decimal) {
  if (!decimal) return '—';
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

// ── Export assiduité mensuelle ─────────────────────────────────────────────────
export function exportAssiduiteExcel({ reports, users, period, workingDays }) {
  const wb = XLSX.utils.book_new();

  // Feuille 1 : Résumé par agent
  const summary = [
    ['Agent', 'Matricule', 'Poste', 'Direction', 'Jours présents', `Jours ouvrables (${workingDays})`, 'Taux assiduité', 'Heures eff. moy.', 'Tâches/j moy.', 'Retards (> 08h30)'],
  ];

  users.forEach(u => {
    const ureps   = reports.filter(r => r.userId === u.id);
    const days    = ureps.length;
    const rate    = workingDays > 0 ? (days / workingDays) : 0;
    const hrs     = ureps.map(r => parseHeures(r.heuresEffectives)).filter(Boolean);
    const avgH    = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const tasks   = ureps.reduce((s, r) => s + (r.taches?.length ?? 0), 0);
    const avgTask = ureps.length ? tasks / ureps.length : 0;
    const lates   = ureps.filter(r => r.heureArrivee > '08:30').length;

    summary.push([
      `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
      u.matricule ?? '—',
      u.poste     ?? '—',
      u.directionNom ?? u.directionId ?? '—',
      days,
      workingDays,
      `${Math.round(rate * 100)}%`,
      fmtH(avgH),
      avgTask.toFixed(1),
      lates,
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [20, 14, 22, 28, 14, 16, 14, 16, 14, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé agents');

  // Feuille 2 : Détail rapports
  const detail = [
    ['Date', 'Agent', 'Matricule', 'Direction', 'Heure arrivée', 'Heure départ', 'Heures effectives', 'Nb tâches', 'Tâches', 'Développement perso', 'Observations'],
  ];

  reports
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(r => {
      detail.push([
        r.date,
        `${r.prenom ?? ''} ${r.nom ?? ''}`.trim(),
        r.matricule     ?? '—',
        r.directionNom  ?? r.directionId ?? '—',
        r.heureArrivee  ?? '—',
        r.heureDepart   ?? '—',
        r.heuresEffectives ?? '—',
        r.taches?.length ?? 0,
        (r.taches ?? []).map(t => t.description).join(' | '),
        (r.developpement ?? []).map(d => d.titre).join(' | '),
        r.observations  ?? '',
      ]);
    });

  const ws2 = XLSX.utils.aoa_to_sheet(detail);
  ws2['!cols'] = [12, 20, 12, 28, 12, 12, 14, 10, 40, 30, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Détail rapports');

  XLSX.writeFile(wb, `CNSSAP_Assiduité_${period.replace(/\s/g, '_')}.xlsx`);
}
