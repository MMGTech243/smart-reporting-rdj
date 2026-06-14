import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { DIRECTIONS, CATEGORIES_TACHE, TYPES_DEVELOPPEMENT } from '../../data/directions';

const today = () => new Date().toISOString().split('T')[0];

function toMinutes(t) { if (!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; }

function calcHeures({ heureArrivee, heureDepartPause, heureRetourPause, heureDepart }) {
  if (!heureArrivee || !heureDepart) return null;
  let t = toMinutes(heureDepart) - toMinutes(heureArrivee);
  if (heureDepartPause && heureRetourPause) t -= toMinutes(heureRetourPause) - toMinutes(heureDepartPause);
  if (t <= 0) return null;
  return `${Math.floor(t/60)}h${(t%60).toString().padStart(2,'0')}`;
}

// ── Section accent colors ─────────────────────────────────────────────────────
const SECTION_COLORS = ['#003f7f','#0060c0','#2ecc71','#4d9fff','#e67e22','#9b59b6'];

function SectionCard({ index, num, title, subtitle, children }) {
  const color = SECTION_COLORS[index] ?? '#003f7f';
  return (
    <div className="rounded-xl overflow-hidden animate-fade-in"
      style={{ background: '#111', border: '1px solid #1e1e1e' }}>
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />
      <div className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
            {num}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            {subtitle && <p className="text-[13px] text-cnssap-dim mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-cnssap-muted mb-1">
        {label} {required && <span className="text-cnssap-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function RDJForm() {
  const { user, userProfile } = useAuth();

  const [checking,    setChecking]  = useState(true);
  const [existingId,  setExistId]   = useState(null);
  const [saving,      setSaving]    = useState(false);
  const [saveError,   setError]     = useState('');
  const [saveSuccess, setSuccess]   = useState(false);

  const [ass, setAss] = useState({ heureArrivee:'', heureDepartPause:'', heureRetourPause:'', heureDepart:'', mouvements:[] });
  const [taches,   setTaches]  = useState([{ description:'', categorie:'Administratif' }]);
  const [devPerso, setDevP]    = useState([]);
  const [obs,      setObs]     = useState('');
  const [signed,   setSigned]  = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db,'rdj_reports'), where('userId','==',user.uid), where('date','==',today())))
      .then(snap => {
        if (!snap.empty) {
          const d = snap.docs[0].data();
          setExistId(snap.docs[0].id);
          setAss({ heureArrivee:d.heureArrivee??'', heureDepartPause:d.heureDepartPause??'',
                   heureRetourPause:d.heureRetourPause??'', heureDepart:d.heureDepart??'', mouvements:d.mouvements??[] });
          setTaches(d.taches?.length ? d.taches : [{ description:'', categorie:'Administratif' }]);
          setDevP(d.developpement??[]);
          setObs(d.observations??'');
        }
        setChecking(false);
      });
  }, [user]);

  const heuresEff = calcHeures(ass);

  const addMvt = () => setAss(a=>({...a, mouvements:[...a.mouvements,{heure:'',motif:''}]}));
  const updMvt = (i,k,v) => setAss(a=>{ const m=[...a.mouvements]; m[i]={...m[i],[k]:v}; return {...a,mouvements:m}; });
  const delMvt = i => setAss(a=>({...a, mouvements:a.mouvements.filter((_,j)=>j!==i)}));

  const addT = () => setTaches(t=>[...t,{description:'',categorie:'Administratif'}]);
  const updT = (i,k,v) => setTaches(t=>{ const n=[...t]; n[i]={...n[i],[k]:v}; return n; });
  const delT = i => setTaches(t=>t.filter((_,j)=>j!==i));

  const addD = () => setDevP(d=>[...d,{titre:'',type:'Ouvrage / Livre'}]);
  const updD = (i,k,v) => setDevP(d=>{ const n=[...d]; n[i]={...n[i],[k]:v}; return n; });
  const delD = i => setDevP(d=>d.filter((_,j)=>j!==i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signed) { setError('Vous devez signer votre déclaration.'); return; }
    if (!ass.heureArrivee || !ass.heureDepart) { setError("Saisissez les heures d'arrivée et de départ."); return; }
    const tf = taches.filter(t=>t.description.trim());
    if (!tf.length) { setError('Ajoutez au moins une tâche (Section IV).'); return; }
    setError(''); setSaving(true);
    const payload = {
      userId:user.uid, date:today(), submittedAt:serverTimestamp(), signedAt:serverTimestamp(),
      nom:userProfile?.nom??'', prenom:userProfile?.prenom??'', matricule:userProfile?.matricule??'',
      poste:userProfile?.poste??'', directionId:userProfile?.directionId??'',
      directionNom:DIRECTIONS.find(d=>d.id===userProfile?.directionId)?.nom??'',
      ...ass, heuresEffectives:heuresEff??'',
      taches:tf, developpement:devPerso.filter(d=>d.titre.trim()), observations:obs.trim(),
    };
    try {
      if (existingId) { await updateDoc(doc(db,'rdj_reports',existingId),payload); }
      else { const r=await addDoc(collection(db,'rdj_reports'),payload); setExistId(r.id); }
      setSuccess(true);
    } catch(err) { setError('Erreur réseau. Vérifiez votre connexion.'); console.error(err); }
    finally { setSaving(false); }
  };

  if (checking) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-cnssap-dim border-t-cnssap-accent rounded-full animate-spin" />
    </div>
  );

  const dateLabel = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 page-enter">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Rapport RDJ</h1>
          <p className="text-xs text-cnssap-dim mt-1 capitalize">{dateLabel}</p>
          <p className="text-xs text-cnssap-dim/50 mt-0.5">Formulaire FOR-DRH-001</p>
        </div>
        {existingId && !saveSuccess && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{background:'rgba(46,204,113,0.1)',border:'1px solid rgba(46,204,113,0.25)',color:'#2ecc71'}}>
            ✓ Soumis
          </span>
        )}
      </div>

      {saveSuccess && (
        <div className="mb-5 p-4 rounded-xl text-sm flex items-start gap-3 animate-fade-in"
          style={{background:'rgba(46,204,113,0.08)',border:'1px solid rgba(46,204,113,0.2)'}}>
          <span className="text-xl">✅</span>
          <div>
            <p className="font-semibold text-cnssap-success">Rapport soumis avec succès</p>
            <p className="text-xs text-cnssap-success/70 mt-0.5">Visible dans le tableau de bord de la Direction Générale.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* I */}
        <SectionCard index={0} num="I" title="Noms et Fonctions" subtitle="Pré-rempli depuis votre profil">
          <div className="grid grid-cols-2 gap-3">
            {[['Nom',userProfile?.nom],['Prénom',userProfile?.prenom],['Matricule',userProfile?.matricule],['Poste',userProfile?.poste]].map(([lbl,val])=>(
              <Field key={lbl} label={lbl}>
                <input disabled value={val??'—'} className="input-premium" />
              </Field>
            ))}
          </div>
        </SectionCard>

        {/* II */}
        <SectionCard index={1} num="II" title="Direction / Entité" subtitle="Direction d'affectation">
          <Field label="Direction">
            <input disabled value={DIRECTIONS.find(d=>d.id===userProfile?.directionId)?.nom??userProfile?.directionNom??'—'}
              className="input-premium" />
          </Field>
        </SectionCard>

        {/* III */}
        <SectionCard index={2} num="III" title="Assiduité" subtitle="Heures effectives calculées automatiquement">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Heure d'arrivée" required>
              <input type="time" value={ass.heureArrivee} className="input-premium"
                onChange={e=>setAss(a=>({...a,heureArrivee:e.target.value}))} />
            </Field>
            <Field label="Heure de départ" required>
              <input type="time" value={ass.heureDepart} className="input-premium"
                onChange={e=>setAss(a=>({...a,heureDepart:e.target.value}))} />
            </Field>
            <Field label="Départ pause">
              <input type="time" value={ass.heureDepartPause} className="input-premium"
                onChange={e=>setAss(a=>({...a,heureDepartPause:e.target.value}))} />
            </Field>
            <Field label="Retour pause">
              <input type="time" value={ass.heureRetourPause} className="input-premium"
                onChange={e=>setAss(a=>({...a,heureRetourPause:e.target.value}))} />
            </Field>
          </div>

          {heuresEff && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl animate-fade-in"
              style={{background:'rgba(46,204,113,0.07)',border:'1px solid rgba(46,204,113,0.2)'}}>
              <span className="text-cnssap-success text-xl">⏱</span>
              <div>
                <p className="text-xs text-cnssap-success/70 font-medium">Heures effectives calculées</p>
                <p className="text-2xl font-bold text-cnssap-success">{heuresEff}</p>
              </div>
            </div>
          )}

          {ass.mouvements.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-cnssap-muted uppercase tracking-wide">Autres mouvements</p>
              {ass.mouvements.map((m,i)=>(
                <div key={i} className="flex gap-2">
                  <input type="time" value={m.heure} onChange={e=>updMvt(i,'heure',e.target.value)} className="input-premium w-32" />
                  <input type="text" placeholder="Motif" value={m.motif} onChange={e=>updMvt(i,'motif',e.target.value)} className="input-premium flex-1" />
                  <button type="button" onClick={()=>delMvt(i)} className="text-cnssap-danger hover:text-red-400 px-1.5 transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addMvt} className="mt-3 text-xs text-cnssap-accent hover:text-blue-300 font-medium transition-colors">
            + Ajouter un mouvement
          </button>
        </SectionCard>

        {/* IV */}
        <SectionCard index={3} num="IV" title="Productivité" subtitle="Tâches mesurables réalisées dans la journée">
          <div className="space-y-3">
            {taches.map((t,i)=>(
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <input type="text" placeholder={`Tâche ${i+1}`} value={t.description}
                    onChange={e=>updT(i,'description',e.target.value)} className="input-premium" />
                  <select value={t.categorie} onChange={e=>updT(i,'categorie',e.target.value)}
                    className="input-premium cursor-pointer">
                    {CATEGORIES_TACHE.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                {taches.length>1 && (
                  <button type="button" onClick={()=>delT(i)} className="mt-1 text-cnssap-danger hover:text-red-400 px-1.5 transition-colors">✕</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addT} className="mt-3 text-xs text-cnssap-accent hover:text-blue-300 font-medium transition-colors">
            + Ajouter une tâche
          </button>
        </SectionCard>

        {/* V */}
        <SectionCard index={4} num="V" title="Développement Personnel" subtitle="Ouvrages, formations, coaching — optionnel">
          {devPerso.length>0 && (
            <div className="space-y-3 mb-3">
              {devPerso.map((d,i)=>(
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input type="text" placeholder="Titre" value={d.titre}
                      onChange={e=>updD(i,'titre',e.target.value)} className="input-premium" />
                    <select value={d.type} onChange={e=>updD(i,'type',e.target.value)}
                      className="input-premium cursor-pointer">
                      {TYPES_DEVELOPPEMENT.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={()=>delD(i)} className="mt-1 text-cnssap-danger hover:text-red-400 px-1.5 transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addD} className="text-xs text-cnssap-accent hover:text-blue-300 font-medium transition-colors">
            + Ajouter un élément
          </button>
        </SectionCard>

        {/* VI */}
        <SectionCard index={5} num="VI" title="Observations" subtitle="Notes libres, incidents, suggestions — optionnel">
          <textarea rows={4} placeholder="Vos observations pour la journée…" value={obs}
            onChange={e=>setObs(e.target.value)} className="input-premium resize-y" />
        </SectionCard>

        {/* Signature */}
        <div className="rounded-xl p-6" style={{background:'#111',border:'1px solid #1e1e1e'}}>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${signed?'bg-cnssap-primary border-cnssap-primary':'border-cnssap-border2 group-hover:border-cnssap-accent'}`}>
              <input type="checkbox" checked={signed} onChange={e=>setSigned(e.target.checked)} className="sr-only" />
              {signed && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10"><path d="M1.5 5L4 7.5 8.5 2.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className="text-xs text-cnssap-muted leading-relaxed">
              Je soussigné(e) <strong className="text-cnssap-text">{userProfile?.prenom} {userProfile?.nom}</strong>, déclare sur l'honneur que les informations renseignées dans ce rapport sont exactes et sincères.
            </span>
          </label>

          {saveError && (
            <div className="mt-4 px-4 py-3 rounded-lg text-xs text-cnssap-danger flex items-center gap-2 animate-fade-in"
              style={{background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.25)'}}>
              <span>⚠</span> {saveError}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="btn-primary w-full py-3 text-sm mt-5">
            {saving
              ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Soumission…</span>
              : existingId ? '💾 Mettre à jour mon rapport' : '✅ Soumettre mon rapport du jour'}
          </button>
        </div>
      </form>
    </div>
  );
}
