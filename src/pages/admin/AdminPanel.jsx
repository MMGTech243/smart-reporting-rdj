import { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, setDoc, updateDoc, getDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { adminCreateUser } from '../../firebase/adminAuth';
import { DIRECTIONS } from '../../data/directions';

// ── Shared ────────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'agent', label: 'Agent / Stagiaire' },
  { value: 'chef',  label: 'Chef de Section / CST' },
  { value: 'drh',   label: 'DRH / Administration' },
  { value: 'dg',    label: 'Directeur Général' },
  { value: 'admin', label: 'Responsable Informatique' },
];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-fade-up"
        style={{ background: '#111', border: '1px solid #222', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-cnssap-dim hover:text-white transition-colors text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-cnssap-muted mb-1">
        {label} {required && <span className="text-cnssap-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = 'input-premium w-full';
const sel = 'input-premium w-full cursor-pointer';

// ── Tab: Agents ───────────────────────────────────────────────────────────────
function AgentsTab() {
  const [agents,  setAgents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null); // null | 'create' | agent obj
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [form,    setForm]    = useState({
    email:'', password:'', nom:'', prenom:'', matricule:'', poste:'', role:'agent', directionId:'dg',
  });

  const load = () => {
    setLoading(true);
    getDocs(collection(db, 'users')).then(snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>
        `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`)
      ));
      setLoading(false);
    });
  };
  useEffect(load, []);

  const openCreate = () => {
    setForm({ email:'', password:'', nom:'', prenom:'', matricule:'', poste:'', role:'agent', directionId:'dg' });
    setErr('');
    setModal('create');
  };

  const openEdit = (agent) => {
    setForm({ ...agent, password: '', email: agent.email ?? '' });
    setErr('');
    setModal(agent);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.nom || !form.prenom) {
      setErr('Email, mot de passe, nom et prénom sont obligatoires.'); return;
    }
    setSaving(true); setErr('');
    try {
      const uid = await adminCreateUser(form.email, form.password);
      await setDoc(doc(db, 'users', uid), {
        email: form.email, nom: form.nom, prenom: form.prenom,
        matricule: form.matricule, poste: form.poste,
        role: form.role, directionId: form.directionId,
        directionNom: DIRECTIONS.find(d => d.id === form.directionId)?.nom ?? '',
        status: 'active', createdAt: serverTimestamp(),
      });
      setModal(null); load();
    } catch (e) {
      setErr(e.code === 'auth/email-already-in-use'
        ? 'Cet email est déjà utilisé.' : `Erreur : ${e.message}`);
    } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await updateDoc(doc(db, 'users', modal.id), {
        nom: form.nom, prenom: form.prenom, matricule: form.matricule,
        poste: form.poste, role: form.role, directionId: form.directionId,
        directionNom: DIRECTIONS.find(d => d.id === form.directionId)?.nom ?? '',
      });
      setModal(null); load();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (agent) => {
    await updateDoc(doc(db, 'users', agent.id), {
      status: agent.status === 'active' ? 'inactive' : 'active',
    });
    load();
  };

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    return !q || `${a.prenom} ${a.nom} ${a.matricule}`.toLowerCase().includes(q);
  });

  const roleBadge = (role) => ({
    dg:    { label:'DG',       bg:'rgba(0,63,127,0.3)',     color:'#4d9fff' },
    drh:   { label:'DRH',      bg:'rgba(46,204,113,0.15)',  color:'#2ecc71' },
    chef:  { label:'Chef',     bg:'rgba(230,126,34,0.15)',  color:'#e67e22' },
    agent: { label:'Agent',    bg:'rgba(255,255,255,0.06)', color:'#888' },
    admin: { label:'Inf.',     bg:'rgba(155,89,182,0.2)',   color:'#9b59b6' },
  }[role] ?? { label:role, bg:'#1a1a1a', color:'#888' });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Rechercher un agent…"
          className="input-premium flex-1 max-w-xs" />
        <button onClick={openCreate} className="btn-primary px-4 py-2 text-xs">
          + Créer un agent
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-cnssap-dim text-sm">Chargement…</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{border:'1px solid #1e1e1e'}}>
          <table className="w-full text-sm">
            <thead style={{background:'#0d0d0d'}}>
              <tr>
                {['Agent','Matricule','Direction','Rôle','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-cnssap-dim uppercase tracking-wide font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const badge = roleBadge(a.role);
                const isActive = a.status !== 'inactive';
                return (
                  <tr key={a.id} style={{borderTop:'1px solid #161616'}}
                    className={`transition-colors ${!isActive?'opacity-40':''}`}
                    onMouseEnter={e=>e.currentTarget.style.background='#161616'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{background:'linear-gradient(135deg,#003f7f,#0060c0)'}}>
                          {(a.prenom?.[0]??'').toUpperCase()}{(a.nom?.[0]??'').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{a.prenom} {a.nom}</p>
                          <p className="text-[10px] text-cnssap-dim">{a.poste??'—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cnssap-muted text-xs font-mono">{a.matricule||'—'}</td>
                    <td className="px-4 py-3 text-cnssap-dim text-xs max-w-[160px] truncate">
                      {DIRECTIONS.find(d=>d.id===a.directionId)?.nom?.replace('Direction des ','')?.replace('Direction ','')??'—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{background:badge.bg,color:badge.color}}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        isActive
                          ? 'bg-green-900/30 text-cnssap-success'
                          : 'bg-red-900/20 text-cnssap-danger'
                      }`}>
                        {isActive ? '● Actif' : '○ Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={()=>openEdit(a)}
                          className="text-xs text-cnssap-accent hover:text-blue-300 transition-colors">Modifier</button>
                        <button onClick={()=>toggleStatus(a)}
                          className={`text-xs transition-colors ${isActive?'text-cnssap-warning hover:text-amber-300':'text-cnssap-success hover:text-green-300'}`}>
                          {isActive?'Désactiver':'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-cnssap-dim text-sm">Aucun agent trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal créer */}
      {modal === 'create' && (
        <Modal title="Créer un agent" onClose={()=>setModal(null)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required><input value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} className={inp} /></Field>
              <Field label="Nom" required><input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} className={inp} /></Field>
            </div>
            <Field label="Email" required><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inp} placeholder="prenom.nom@cnssap.cd"/></Field>
            <Field label="Mot de passe provisoire" required><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} className={inp} placeholder="Min. 6 caractères"/></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Matricule"><input value={form.matricule} onChange={e=>setForm(f=>({...f,matricule:e.target.value}))} className={inp} /></Field>
              <Field label="Poste / Fonction"><input value={form.poste} onChange={e=>setForm(f=>({...f,poste:e.target.value}))} className={inp} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rôle" required>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className={sel}>
                  {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Direction" required>
                <select value={form.directionId} onChange={e=>setForm(f=>({...f,directionId:e.target.value}))} className={sel}>
                  {DIRECTIONS.map(d=><option key={d.id} value={d.id}>{d.nom.replace('Direction des ','').replace('Direction ','')}</option>)}
                </select>
              </Field>
            </div>
            {err && <p className="text-xs text-cnssap-danger bg-red-900/20 border border-cnssap-danger/20 rounded-lg px-3 py-2">{err}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-sm mt-2">
              {saving ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        </Modal>
      )}

      {/* Modal modifier */}
      {modal && modal !== 'create' && (
        <Modal title={`Modifier — ${modal.prenom} ${modal.nom}`} onClose={()=>setModal(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom"><input value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} className={inp} /></Field>
              <Field label="Nom"><input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} className={inp} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Matricule"><input value={form.matricule} onChange={e=>setForm(f=>({...f,matricule:e.target.value}))} className={inp} /></Field>
              <Field label="Poste"><input value={form.poste} onChange={e=>setForm(f=>({...f,poste:e.target.value}))} className={inp} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rôle">
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className={sel}>
                  {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Direction">
                <select value={form.directionId} onChange={e=>setForm(f=>({...f,directionId:e.target.value}))} className={sel}>
                  {DIRECTIONS.map(d=><option key={d.id} value={d.id}>{d.nom.replace('Direction des ','').replace('Direction ','')}</option>)}
                </select>
              </Field>
            </div>
            {err && <p className="text-xs text-cnssap-danger bg-red-900/20 border border-cnssap-danger/20 rounded-lg px-3 py-2">{err}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-sm mt-2">
              {saving ? 'Sauvegarde…' : 'Enregistrer les modifications'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Directions ───────────────────────────────────────────────────────────
function DirectionsTab() {
  const [custom,   setCustom]  = useState([]);
  const [form,     setForm]    = useState({ nom: '', id: '' });
  const [saving,   setSaving]  = useState(false);
  const [success,  setSuccess] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'directions')).then(snap =>
      setCustom(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    const id = form.id.trim() || form.nom.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    await setDoc(doc(db, 'directions', id), { nom: form.nom.trim(), id, createdAt: serverTimestamp() });
    setCustom(c => [...c, { id, nom: form.nom.trim() }]);
    setForm({ nom:'', id:'' });
    setSuccess(true);
    setTimeout(()=>setSuccess(false), 2000);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'directions', id));
    setCustom(c => c.filter(d => d.id !== id));
  };

  const allDirs = [
    ...DIRECTIONS.map(d => ({ ...d, builtin: true })),
    ...custom.filter(c => !DIRECTIONS.find(d => d.id === c.id)),
  ];

  return (
    <div className="space-y-6">
      {/* Liste */}
      <div className="rounded-xl overflow-hidden" style={{border:'1px solid #1e1e1e'}}>
        {allDirs.map((d, i) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3 transition-colors"
            style={{borderTop: i>0 ? '1px solid #161616':''}}
            onMouseEnter={e=>e.currentTarget.style.background='#161616'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                style={{background:'linear-gradient(135deg,#003f7f,#0060c0)'}}>
                {d.nom[0]}
              </div>
              <div>
                <p className="text-sm text-white">{d.nom}</p>
                <p className="text-[10px] text-cnssap-dim font-mono">id: {d.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {d.builtin
                ? <span className="text-[10px] text-cnssap-dim bg-cnssap-surface2 px-2 py-0.5 rounded-full">Par défaut</span>
                : <button onClick={()=>handleDelete(d.id)}
                    className="text-xs text-cnssap-danger hover:text-red-400 transition-colors">Supprimer</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Ajouter */}
      <div className="rounded-xl p-5" style={{background:'#111',border:'1px solid #1e1e1e'}}>
        <p className="text-xs font-semibold text-cnssap-dim uppercase tracking-wide mb-4">Ajouter une direction</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <Field label="Nom de la direction" required>
            <input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}
              placeholder="Ex: Direction de la Formation" className={inp} />
          </Field>
          <Field label="Identifiant (optionnel — généré automatiquement)">
            <input value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))}
              placeholder="Ex: dform" className={inp} />
          </Field>
          {success && <p className="text-xs text-cnssap-success">✓ Direction ajoutée avec succès.</p>}
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-xs">
            {saving ? 'Ajout…' : '+ Ajouter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Paramètres ───────────────────────────────────────────────────────────
function ParametresTab() {
  const [config,  setConfig]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'config', 'systeme')).then(snap => {
      setConfig(snap.exists() ? snap.data() : {
        heureArriveeNormale: '08:00',
        heureDepartNormale:  '17:00',
        seuilRetardMinutes:  30,
        orgName:             'CNSSAP',
        emailDG:             '',
      });
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, 'config', 'systeme'), { ...config, updatedAt: serverTimestamp() });
    setSuccess(true);
    setTimeout(()=>setSuccess(false), 2500);
    setSaving(false);
  };

  if (!config) return <div className="text-cnssap-dim text-sm py-8 text-center">Chargement…</div>;

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <Field label="Nom de l'organisation">
        <input value={config.orgName??''} onChange={e=>setConfig(c=>({...c,orgName:e.target.value}))} className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Heure d'arrivée normale">
          <input type="time" value={config.heureArriveeNormale??'08:00'}
            onChange={e=>setConfig(c=>({...c,heureArriveeNormale:e.target.value}))} className={inp} />
        </Field>
        <Field label="Heure de départ normale">
          <input type="time" value={config.heureDepartNormale??'17:00'}
            onChange={e=>setConfig(c=>({...c,heureDepartNormale:e.target.value}))} className={inp} />
        </Field>
      </div>
      <Field label="Seuil retard (minutes après heure d'arrivée)">
        <input type="number" min={0} max={120}
          value={config.seuilRetardMinutes??30}
          onChange={e=>setConfig(c=>({...c,seuilRetardMinutes:+e.target.value}))} className={inp} />
      </Field>
      <Field label="Email du Directeur Général (notifications)">
        <input type="email" value={config.emailDG??''}
          onChange={e=>setConfig(c=>({...c,emailDG:e.target.value}))}
          placeholder="dg@cnssap.cd" className={inp} />
      </Field>

      {success && (
        <p className="text-xs text-cnssap-success bg-green-900/20 border border-cnssap-success/20 rounded-lg px-3 py-2">
          ✓ Paramètres enregistrés.
        </p>
      )}
      <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
        {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
      </button>
    </form>
  );
}

// ── Tab: Formulaires extensibles ──────────────────────────────────────────────
function FormulairesTab() {
  const forms = [
    { id:'rdj',       icon:'📋', label:'Rapport RDJ',       status:'active',  desc:'Reporting déclaratif journalier FOR-DRH-001' },
    { id:'conge',     icon:'🏖',  label:'Demande de congé',  status:'coming',  desc:'Soumission numérique · validation hiérarchique · calendrier' },
    { id:'mission',   icon:'✈️',  label:'Ordre de mission',  status:'coming',  desc:'Demande + rapport de mission + notes de frais' },
    { id:'evaluation',icon:'⭐', label:'Évaluation annuelle',status:'coming',  desc:'Auto-évaluation + évaluation chef + score final' },
    { id:'formation', icon:'🎓', label:'Demande de formation',status:'coming', desc:'Demande de participation + rapport post-formation' },
    { id:'absence',   icon:'📅', label:'Justification absence',status:'coming',desc:'Justification des absences avec pièce jointe' },
    { id:'incident',  icon:'⚠️', label:"Déclaration d'incident",status:'coming',desc:'Déclaration incidents ou accidents de travail' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-cnssap-dim mb-4">
        Architecture modulaire — chaque formulaire est une collection Firestore + une page React indépendante.
        Les nouveaux formulaires peuvent être activés progressivement.
      </p>
      {forms.map(f => (
        <div key={f.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors"
          style={{background:'#111',border:'1px solid #1e1e1e'}}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{f.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{f.label}</p>
              <p className="text-[10px] text-cnssap-dim mt-0.5">{f.desc}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
            f.status === 'active'
              ? 'bg-green-900/30 text-cnssap-success border border-cnssap-success/25'
              : 'bg-cnssap-surface2 text-cnssap-dim border border-cnssap-border'
          }`}>
            {f.status === 'active' ? '● Actif' : 'Bientôt'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'agents',      icon:'👥', label:'Agents' },
  { id:'directions',  icon:'🏢', label:'Directions' },
  { id:'parametres',  icon:'⚙️', label:'Paramètres' },
  { id:'formulaires', icon:'📝', label:'Formulaires' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('agents');

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Administration</h1>
        <p className="text-sm text-cnssap-muted mt-0.5">Gestion des agents, directions et paramètres système</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{background:'#111',border:'1px solid #1e1e1e'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? 'text-white'
                : 'text-cnssap-dim hover:text-cnssap-muted'
            }`}
            style={tab === t.id ? {
              background:'linear-gradient(135deg, rgba(0,63,127,0.5), rgba(0,96,192,0.3))',
              border:'1px solid rgba(77,159,255,0.2)',
            } : {}}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {tab === 'agents'      && <AgentsTab />}
        {tab === 'directions'  && <DirectionsTab />}
        {tab === 'parametres'  && <ParametresTab />}
        {tab === 'formulaires' && <FormulairesTab />}
      </div>
    </div>
  );
}
