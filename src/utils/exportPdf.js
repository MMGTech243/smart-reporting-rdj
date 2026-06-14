import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// ── Rapport mensuel d'assiduité ───────────────────────────────────────────────
export function exportRapportMensuelPDF({ reports, users, period, workingDays }) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // En-tête
  doc.setFontSize(18);
  doc.setTextColor(0, 63, 127);
  doc.text('CNSSAP — Smart Reporting RDJ', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Rapport Mensuel d'Assiduité — ${period}`, 14, 28);

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} · ${workingDays} jour(s) ouvrable(s) · ${users.length} agent(s)`,
    14, 35
  );

  // Tableau par agent
  const rows = users.map(u => {
    const ureps   = reports.filter(r => r.userId === u.id);
    const days    = ureps.length;
    const rate    = workingDays > 0 ? Math.round(days / workingDays * 100) : 0;
    const hrs     = ureps.map(r => parseHeures(r.heuresEffectives)).filter(Boolean);
    const avgH    = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const tasks   = ureps.reduce((s, r) => s + (r.taches?.length ?? 0), 0);
    const avgTask = ureps.length ? (tasks / ureps.length).toFixed(1) : '0';
    const lates   = ureps.filter(r => r.heureArrivee > '08:30').length;

    return [
      `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
      u.poste ?? '—',
      u.directionNom ?? u.directionId ?? '—',
      days,
      `${rate}%`,
      fmtH(avgH),
      avgTask,
      lates,
    ];
  });

  autoTable(doc, {
    startY:  42,
    head:    [['Agent', 'Poste', 'Direction', 'Jours présents', 'Taux', 'Heures eff. moy.', 'Tâches/j moy.', 'Retards']],
    body:    rows,
    styles:  { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [0, 63, 127], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 245, 255] },
  });

  doc.save(`CNSSAP_Assiduité_${period.replace(/\s/g, '_')}.pdf`);
}

// ── Rapport individuel ────────────────────────────────────────────────────────
export function exportRapportIndividuelPDF({ reports, user, period }) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(0, 63, 127);
  doc.text('CNSSAP — Smart Reporting RDJ', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Rapport Individuel — ${user.prenom ?? ''} ${user.nom ?? ''}`, 14, 30);
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(`Période : ${period} · Poste : ${user.poste ?? '—'}`, 14, 37);

  const rows = reports.map(r => {
    const taches = (r.taches ?? []).map(t => t.description).join(', ');
    return [
      r.date,
      r.heureArrivee  ?? '—',
      r.heureDepart   ?? '—',
      r.heuresEffectives ?? '—',
      r.taches?.length ?? 0,
      taches.substring(0, 60) + (taches.length > 60 ? '…' : ''),
    ];
  });

  autoTable(doc, {
    startY: 44,
    head:   [['Date', 'Arrivée', 'Départ', 'Heures eff.', 'Tâches', 'Tâches réalisées']],
    body:   rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 63, 127], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    columnStyles: { 5: { cellWidth: 70 } },
  });

  doc.save(`CNSSAP_${(user.nom ?? 'Agent').replace(/\s/g, '_')}_${period.replace(/\s/g, '_')}.pdf`);
}
