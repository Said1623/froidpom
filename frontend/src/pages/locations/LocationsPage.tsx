import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfLocations } from '../../services/pdfService';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFetch } from '../../hooks/useFetch';
import { locationsApi, clientsApi, reservationsApi } from '../../services';
import { PageHeader, Spinner } from '../../components/ui/UI';
import type { Location, Client, Reservation } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

// ── LigneRetour Modal ─────────────────────────────────
function LigneRetour({ emoji, label, color, restant, nb, onNbChange, prix, onPrixChange }: {
  emoji: string; label: string; color: string;
  restant: number; nb: string; onNbChange: (v: string) => void;
  prix: string; onPrixChange: (v: string) => void;
}) {
  const saisi = parseInt(nb) || 0;
  const dep = saisi > restant;
  if (restant === 0) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
      <div style={{ width:120, fontWeight:700, color, fontSize:14 }}>{emoji} {label}</div>
      <div style={{ width:80, textAlign:'center' }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:2 }}>EN STOCK</div>
        <div style={{ fontWeight:800, fontSize:24, color, lineHeight:1 }}>{restant}</div>
      </div>
      <div style={{ width:140 }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4, textAlign:'center' }}>À RETOURNER</div>
        <input type="number" min="0" value={nb} onChange={e => onNbChange(e.target.value)}
          style={{ background:'#1a2540', border:`2px solid ${dep?'var(--c-danger)':saisi>0?color:'rgba(100,140,255,.3)'}`, borderRadius:8, color:dep?'var(--c-danger)':'#e8edf8', padding:'10px 0', fontSize:22, fontWeight:800, width:'100%', outline:'none', textAlign:'center' }} />
        {dep && <div style={{ fontSize:10, color:'var(--c-danger)', marginTop:2, textAlign:'center' }}>⚠ Max {restant}</div>}
      </div>
      <div style={{ width:80, textAlign:'center' }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:2 }}>RESTANT</div>
        <div style={{ fontWeight:800, fontSize:24, color:dep?'var(--c-danger)':Math.max(0,restant-saisi)===0?'var(--c-success)':'var(--c-text)', lineHeight:1 }}>
          {dep ? '⚠' : Math.max(0, restant - saisi)}
        </div>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4 }}>PRIX/U SI NON RET.</div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <input type="number" min="0" step="0.5" value={prix} onChange={e => onPrixChange(e.target.value)}
            style={{ background:'#1a2540', border:'1px solid rgba(100,140,255,.2)', borderRadius:6, color:'#e8edf8', padding:'6px 8px', fontSize:13, width:70, outline:'none', textAlign:'center' }} />
          <span style={{ fontSize:11, color:'var(--c-text3)' }}>MAD</span>
        </div>
      </div>
    </div>
  );
}

// ── Modal Retour (Bois + Plastique uniquement) ─────────
function ModalRetour({ client, locations, onClose, onSaved }: { client: Client; locations: Location[]; onClose: () => void; onSaved: () => void; }) {
  const locsClient = locations.filter(l => l.client.id === client.id);
  const boisRestant  = locsClient.filter(l => !l.typeCaisse || l.typeCaisse === 'bois').reduce((s,l) => s + Math.max(0, (Number(l.nbCaisses)||0) - (Number(l.nbCaissesRetournees)||0)), 0);
  const plastRestant = locsClient.filter(l => l.typeCaisse === 'plastique').reduce((s,l) => s + Math.max(0, (Number(l.nbCaisses)||0) - (Number(l.nbCaissesRetournees)||0)), 0);

  const [prixBois, setPrixBois] = useState('30');
  const [prixPlast, setPrixPlast] = useState('55');
  const [nbBois, setNbBois] = useState('0');
  const [nbPlast, setNbPlast] = useState('0');
  const [saving, setSaving] = useState(false);

  const vBois = parseInt(nbBois)||0;
  const vPlast = parseInt(nbPlast)||0;
  const total = vBois + vPlast;
  const depasse = vBois > boisRestant || vPlast > plastRestant;
  const montantDu = Math.max(0, boisRestant-vBois)*(parseFloat(prixBois)||0) + Math.max(0, plastRestant-vPlast)*(parseFloat(prixPlast)||0);

  async function handleSave() {
    if (total === 0) return toast.error('Saisir au moins une caisse');
    if (depasse) return toast.error('Quantité dépasse le stock');
    setSaving(true);
    try {
      async function retournerType(type: string, nb: number) {
        if (nb <= 0) return;
        const locs = locsClient
          .filter(l => type === 'bois' ? (!l.typeCaisse || l.typeCaisse === 'bois') : l.typeCaisse === type)
          .filter(l => (Number(l.nbCaisses)||0) - (Number(l.nbCaissesRetournees)||0) > 0)
          .sort((a,b) => new Date(a.dateLocation).getTime() - new Date(b.dateLocation).getTime());
        let reste = nb;
        for (const loc of locs) {
          if (reste <= 0) break;
          const dispo = Math.max(0, (Number(loc.nbCaisses)||0) - (Number(loc.nbCaissesRetournees)||0));
          const n = Math.min(reste, dispo);
          await locationsApi.enregistrerRetour(loc.id, { nbRetournees: n });
          reste -= n;
        }
      }
      await retournerType('bois', vBois);
      await retournerType('plastique', vPlast);
      toast.success(`✓ ${client.nom} — ${total} caisse(s) retournée(s)`);
      onSaved(); onClose();
    } catch(e:any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position:'relative', zIndex:1, background:'#0f1628', border:'1px solid rgba(100,140,255,.3)', borderRadius:16, width:'100%', maxWidth:600, padding:'24px 28px', boxShadow:'0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#e8edf8' }}>↩ Retour de caisses</div>
            <div style={{ fontSize:13, color:'var(--c-text2)', marginTop:3 }}>{client.nom}</div>
          </div>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'none', color:'#8fa3cc', width:30, height:30, borderRadius:6, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        <LigneRetour emoji="🪵" label="Bois"      color="var(--c-warning)" restant={boisRestant}  nb={nbBois}  onNbChange={setNbBois}  prix={prixBois}  onPrixChange={setPrixBois} />
        <LigneRetour emoji="🧴" label="Plastique" color="var(--c-primary)" restant={plastRestant} nb={nbPlast} onNbChange={setNbPlast} prix={prixPlast} onPrixChange={setPrixPlast} />
        {boisRestant===0 && plastRestant===0 && (
          <div style={{ padding:'20px 0', textAlign:'center', color:'var(--c-success)', fontWeight:600 }}>✓ Toutes les caisses ont été retournées</div>
        )}
        {total > 0 && !depasse && (
          <div style={{ background:'rgba(46,207,138,.08)', border:'1px solid rgba(46,207,138,.2)', borderRadius:10, padding:'12px 16px', margin:'16px 0 0', display:'flex', gap:24, alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--c-success)' }}>Retour : <span style={{ fontSize:20 }}>{total}</span> caisse(s)</div>
            <div style={{ fontSize:13, color:'var(--c-text2)' }}>Montant dû sur restant : <strong style={{ color:'var(--c-accent)' }}>{montantDu.toLocaleString('fr-FR')} MAD</strong></div>
          </div>
        )}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'1px solid rgba(100,140,255,.2)', color:'#8fa3cc', borderRadius:10, padding:'10px 20px', fontWeight:600, cursor:'pointer', fontSize:13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving||total===0||depasse}
            style={{ background:total>0&&!depasse?'var(--c-success)':'var(--c-surface2)', border:'none', color:total>0&&!depasse?'#fff':'var(--c-text3)', borderRadius:10, padding:'10px 24px', fontSize:14, fontWeight:700, cursor:total>0&&!depasse?'pointer':'not-allowed' }}>
            {saving ? '...' : depasse ? '⚠ Dépassé' : `✓ Confirmer (${total})`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Compteur +/- ──────────────────────────────────────
function Counter({ val, onChange, color, max }: { val: number; onChange: (v: number) => void; color: string; max?: number }) {
  const [inputVal, setInputVal] = useState(String(val));

  // Sync si val change de l'extérieur
  if (String(val) !== inputVal && document.activeElement?.tagName !== 'INPUT') {
    setInputVal(String(val));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setInputVal(raw); // Permet la saisie libre
    const parsed = parseInt(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed); // Pas de clamp ici, laisse le parent gérer l'erreur
    }
  }

  function handleBlur() {
    const parsed = parseInt(inputVal);
    if (isNaN(parsed) || parsed < 0) {
      setInputVal('0');
      onChange(0);
    } else {
      setInputVal(String(parsed));
      onChange(parsed);
    }
  }

  const dep = max !== undefined && val > max;

  return (
    <div style={{ display:'flex', alignItems:'center', background:'rgba(0,0,0,.25)', borderRadius:8, overflow:'hidden', border:`1px solid ${dep?'var(--c-danger)':val>0?color:'rgba(100,140,255,.15)'}`, transition:'border-color .15s' }}>
      <button onClick={() => { const n = Math.max(0, val-1); onChange(n); setInputVal(String(n)); }}
        disabled={val<=0}
        style={{ width:28, height:34, border:'none', background:'transparent', color:val<=0?'rgba(100,140,255,.2)':'var(--c-text2)', fontSize:18, cursor:val<=0?'not-allowed':'pointer', fontWeight:700, flexShrink:0 }}>−</button>
      <input
        type="text"
        inputMode="numeric"
        value={inputVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={e => e.target.select()}
        style={{ width:60, border:'none', background:'transparent', color:dep?'var(--c-danger)':val>0?color:'var(--c-text2)', fontSize:15, fontWeight:700, textAlign:'center', outline:'none', padding:'0 2px' }}
      />
      <button onClick={() => { const n = val+1; onChange(n); setInputVal(String(n)); }}
        disabled={max!==undefined && val>=max}
        style={{ width:28, height:34, border:'none', background:'transparent', color:max!==undefined&&val>=max?'rgba(100,140,255,.2)':color, fontSize:18, cursor:max!==undefined&&val>=max?'not-allowed':'pointer', fontWeight:700, flexShrink:0 }}>+</button>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────
interface ClientLoc {
  client: Client;
  resaB: number; resaP: number;
  prixB: number; prixP: number;
  nbBois: number; nbPlast: number;
  modified: boolean; error: string; done: boolean;
}

// ── Page principale ───────────────────────────────────
export default function LocationsPage() {
  const { data: locations, loading, refetch } = useFetch<Location[]>(() => locationsApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll());
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const { isInCampagne } = useCampagne();

  const [tab, setTab] = useState<'session'|'suivi'|'historique'>('session');
  const [dateOp, setDateOp] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [searchSuivi, setSearchSuivi] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filtre, setFiltre] = useState<'tous'|'actifs'|'anomalie'>('tous');
  const [saving, setSaving] = useState(false);
  const [clientRetour, setClientRetour] = useState<Client|null>(null);
  const [showSummary, setShowSummary] = useState(true);

  const PRIX_DEF_BOIS = 30;
  const PRIX_DEF_PLAST = 55;

  const clientRows = useMemo<ClientLoc[]>(() => {
    if (!clients || !reservations) return [];
    const resaMap: Record<number, Reservation> = {};
    reservations.forEach(r => { resaMap[r.client.id] = r; });
    return clients.filter(c => resaMap[c.id]).map(client => {
      const resa = resaMap[client.id];
      return {
        client,
        resaB: resa?.nbCaissesBois||0,
        resaP: (resa as any)?.nbCaissesPластique||0,
        prixB: resa?.prixUnitaireBois||0,
        prixP: resa?.prixUnitairePlastique||0,
        nbBois: 0, nbPlast: 0,
        modified: false, error: '', done: false,
      };
    });
  }, [clients, reservations]);

  const [rows, setRows] = useState<ClientLoc[]>([]);
  const [rowsInit, setRowsInit] = useState(false);
  if (clientRows.length > 0 && !rowsInit) { setRows(clientRows); setRowsInit(true); }

  function updRow(cid: number, patch: Partial<ClientLoc>) {
    setRows(p => p.map(r => r.client.id === cid ? { ...r, ...patch, modified: true } : r));
  }
  function resetRows() {
    setRows(clientRows.map(r => ({...r, nbBois:0, nbPlast:0, modified:false, error:'', done:false})));
  }
  function autoFill(cid: number) {
    const r = rows.find(x => x.client.id === cid);
    if (!r) return;
    updRow(cid, { nbBois: r.resaB, nbPlast: r.resaP });
  }
  function autoFillAll() {
    setRows(p => p.map(r => ({ ...r, nbBois: r.resaB, nbPlast: r.resaP, modified: true })));
  }

  const totalResaB = rows.reduce((s,r) => s+r.resaB, 0);
  const totalResaP = rows.reduce((s,r) => s+r.resaP, 0);
  const modifies = rows.filter(r => r.modified && (r.nbBois>0||r.nbPlast>0));
  const totalNbB = modifies.reduce((s,r) => s+r.nbBois, 0);
  const totalNbP = modifies.reduce((s,r) => s+r.nbPlast, 0);
  // Estimation pénalité = sur les locations DÉJÀ en base (caisses non retournées)
  const estimPenalite = useMemo(() => {
    if (!locations) return 0;
    return (locations).reduce((s, l) => {
      const restant = Math.max(0, (Number(l.nbCaisses)||0) - (Number(l.nbCaissesRetournees)||0));
      const prix = Number(l.prixUnitaire) || ((!l.typeCaisse || l.typeCaisse === 'bois') ? PRIX_DEF_BOIS : PRIX_DEF_PLAST);
      return s + restant * prix;
    }, 0);
  }, [locations]);
  const anomalies = rows.filter(r => r.nbBois>r.resaB || r.nbPlast>r.resaP);

  const rowsFiltres = rows.filter(r => {
    const ms = r.client.nom.toLowerCase().includes(search.toLowerCase());
    const mf = filtre==='tous' ? true : filtre==='actifs' ? (r.nbBois>0||r.nbPlast>0) : (r.nbBois>r.resaB||r.nbPlast>r.resaP);
    return ms && mf;
  });

  async function confirmerTout() {
    const aFaire = modifies.filter(r => !r.done);
    if (aFaire.length===0) return toast.error('Aucune opération');
    if (anomalies.length>0) return toast.error(`${anomalies.length} anomalie(s) à corriger`);
    setSaving(true);
    let ok=0; let err=0;
    for (const row of aFaire) {
      try {
        const ops=[];
        if (row.nbBois>0) ops.push(locationsApi.create({clientId:row.client.id,dateLocation:dateOp,nbCaisses:row.nbBois,typeCaisse:'bois',prixUnitaire:row.prixB||PRIX_DEF_BOIS}));
        if (row.nbPlast>0) ops.push(locationsApi.create({clientId:row.client.id,dateLocation:dateOp,nbCaisses:row.nbPlast,typeCaisse:'plastique',prixUnitaire:row.prixP||PRIX_DEF_PLAST}));
        await Promise.all(ops);
        updRow(row.client.id, { done: true }); ok++;
      } catch(e:any) { updRow(row.client.id, { error: e?.response?.data?.message||'Erreur' }); err++; }
    }
    setSaving(false); refetch();
    if (err===0) toast.success(`✓ ${ok} location(s) créée(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  // Suivi par client — on calcule le restant réel (loué - retourné)
  const suivi = useMemo(() => {
    if (!clients || !locations) return [];
    return clients.map(client => {
      const locs = (locations).filter(l => l.client.id === client.id);
      // Bois = typeCaisse 'bois' OU null (anciennes locations)
      const boisLocs = locs.filter(l => !l.typeCaisse || l.typeCaisse === 'bois');
      const plastLocs = locs.filter(l => l.typeCaisse === 'plastique');
      const boisL = boisLocs.reduce((s,l)=>s+(Number(l.nbCaisses)||0),0);
      const boisR = boisLocs.reduce((s,l)=>s+(Number(l.nbCaissesRetournees)||0),0);
      const plastL = plastLocs.reduce((s,l)=>s+(Number(l.nbCaisses)||0),0);
      const plastR = plastLocs.reduce((s,l)=>s+(Number(l.nbCaissesRetournees)||0),0);
      const boisRest = Math.max(0, boisL - boisR);
      const plastRest = Math.max(0, plastL - plastR);
      const totalL = boisL + plastL;
      const totalRest = boisRest + plastRest;
      if (totalL === 0) return null;
      return {
        client, totalL, totalRest,
        bois: { l: boisL, r: boisR, rest: boisRest },
        plast: { l: plastL, r: plastR, rest: plastRest },
      };
    }).filter(Boolean);
  }, [clients, locations]);

  const suiviFiltres = suivi.filter(s => (s as any).client.nom.toLowerCase().includes(searchSuivi.toLowerCase()));
  const filteredLoc = (locations||[]).filter(l => (filterClient ? l.client.id===parseInt(filterClient) : true) && isInCampagne(l.dateLocation));

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner size={36}/></div>;

  return (
    <div className="fade-in">

      {/* ── HEADER PILOTAGE ── */}
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:14, padding:'20px 24px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, margin:0 }}>Location de caisses vides</h1>
            <div style={{ fontSize:12, color:'var(--c-text3)', marginTop:4 }}>Prix unitaire = montant dû si non retournée</div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input type="date" value={dateOp} onChange={e => setDateOp(e.target.value)}
              style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:8, color:'var(--c-text)', padding:'8px 12px', fontSize:13, outline:'none' }} />
            <button onClick={resetRows}
              style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', color:'var(--c-text2)', borderRadius:10, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ↺ Réinitialiser
            </button>
            <button onClick={confirmerTout} disabled={saving||modifies.filter(r=>!r.done).length===0||anomalies.length>0}
              style={{ background:modifies.filter(r=>!r.done).length>0&&anomalies.length===0?'var(--c-success)':'var(--c-surface2)', border:'none', color:modifies.filter(r=>!r.done).length>0&&anomalies.length===0?'#fff':'var(--c-text3)', borderRadius:10, padding:'9px 22px', fontSize:14, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              {saving ? '...' : `✓ Valider (${modifies.filter(r=>!r.done).length})`}
            </button>
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginTop:18 }}>
          {[
            { label:'🧴 Plastique réservé', val:totalResaP, color:'var(--c-primary)' },
            { label:'🪵 Bois réservé', val:totalResaB, color:'var(--c-warning)' },
            { label:'🔢 Total global', val:totalResaB+totalResaP, color:'var(--c-text)' },
            { label:'💰 Estimation pénalité', val:`${estimPenalite.toLocaleString('fr-FR')} MAD`, color:'var(--c-danger)' },
          ].map(k => (
            <div key={k.label} style={{ background:'var(--c-bg2)', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:k.color }}>{typeof k.val==='number'?k.val.toLocaleString('fr-FR'):k.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', gap:4, background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:10, padding:4, width:'fit-content', marginBottom:18 }}>
        {[{id:'session',label:'⚡ Session location'},{id:'suivi',label:`📊 Suivi client (${suiviFiltres.length})`},{id:'historique',label:`📋 Historique (${filteredLoc.length})`}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding:'7px 16px', borderRadius:7, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background:tab===t.id?'var(--c-primary-glow)':'transparent', color:tab===t.id?'var(--c-primary)':'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SESSION ══ */}
      {tab==='session' && (
        <div style={{ display:'grid', gridTemplateColumns:showSummary?'1fr 260px':'1fr', gap:16 }}>
          <div>
            {/* Filtres */}
            <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
              <input placeholder="🔍 Rechercher client..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:8, color:'var(--c-text)', padding:'8px 12px', fontSize:13, outline:'none', minWidth:200 }} />
              <div style={{ display:'flex', gap:4 }}>
                {[{id:'tous',label:'Tous'},{id:'actifs',label:'Actifs'},{id:'anomalie',label:'⚠ Anomalies'}].map(f => (
                  <button key={f.id} onClick={() => setFiltre(f.id as any)}
                    style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${filtre===f.id?'var(--c-primary)':'var(--c-border)'}`, background:filtre===f.id?'var(--c-primary-glow)':'transparent', color:filtre===f.id?'var(--c-primary)':'var(--c-text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={autoFillAll} style={{ background:'rgba(245,166,35,.12)', border:'1px solid rgba(245,166,35,.3)', color:'var(--c-warning)', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', marginLeft:'auto' }}>
                ⚡ Auto-remplir tout
              </button>
              <button onClick={() => setShowSummary(!showSummary)} style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border)', color:'var(--c-text2)', borderRadius:8, padding:'6px 10px', fontSize:12, cursor:'pointer' }}>
                {showSummary ? '▶' : '◀ Résumé'}
              </button>
            </div>

            {anomalies.length>0 && (
              <div style={{ background:'rgba(240,90,90,.08)', border:'1px solid rgba(240,90,90,.25)', borderRadius:10, padding:'10px 16px', marginBottom:12, fontSize:12, color:'var(--c-danger)', fontWeight:600 }}>
                ⚠ {anomalies.length} ligne(s) dépassent la réservation
              </div>
            )}

            <div style={{ overflowX:'auto', border:'1px solid var(--c-border)', borderRadius:12 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:650 }}>
                <thead>
                  <tr style={{ background:'var(--c-bg2)' }}>
                    {['Client','Réservé','🧴 Plastique','🪵 Bois','Restant','Montant',''].map(h => (
                      <th key={h} style={{ padding:'11px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'.5px', borderBottom:'1px solid var(--c-border)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsFiltres.length===0 && <tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucun résultat</td></tr>}
                  {rowsFiltres.map(row => {
                    const anomalie = row.nbBois>row.resaB || row.nbPlast>row.resaP;
                    const restant = Math.max(0,row.resaB-row.nbBois)+Math.max(0,row.resaP-row.nbPlast);
                    const montant = row.nbBois*(row.prixB||PRIX_DEF_BOIS)+row.nbPlast*(row.prixP||PRIX_DEF_PLAST);
                    const bg = row.done?'rgba(46,207,138,.04)':anomalie?'rgba(240,90,90,.04)':row.modified?'rgba(79,142,247,.04)':'';
                    const bl = row.done?'3px solid var(--c-success)':anomalie?'3px solid var(--c-danger)':row.modified?'3px solid var(--c-primary)':'3px solid transparent';
                    return (
                      <tr key={row.client.id} style={{ borderBottom:'1px solid var(--c-border)', background:bg, borderLeft:bl }}>
                        <td style={{ padding:'8px 12px' }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{row.client.nom}</div>
                          {row.done && <div style={{ fontSize:10, color:'var(--c-success)' }}>✓ Validé</div>}
                          {row.error && <div style={{ fontSize:10, color:'var(--c-danger)' }}>⚠ {row.error}</div>}
                        </td>
                        <td style={{ padding:'8px 10px', fontSize:12, color:'var(--c-text2)' }}>
                          <span style={{ color:'var(--c-primary)' }}>🧴{row.resaP}</span>{' '}
                          <span style={{ color:'var(--c-warning)' }}>🪵{row.resaB}</span>
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          {row.resaP>0
                            ? <Counter val={row.nbPlast} max={row.resaP} color="var(--c-primary)" onChange={v=>updRow(row.client.id,{nbPlast:v})}/>
                            : <span style={{color:'var(--c-text3)',fontSize:12}}>—</span>}
                          {row.nbPlast>row.resaP && <div style={{fontSize:9,color:'var(--c-danger)'}}>Dépasse résa</div>}
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          {row.resaB>0
                            ? <Counter val={row.nbBois} max={row.resaB} color="var(--c-warning)" onChange={v=>updRow(row.client.id,{nbBois:v})}/>
                            : <span style={{color:'var(--c-text3)',fontSize:12}}>—</span>}
                          {row.nbBois>row.resaB && <div style={{fontSize:9,color:'var(--c-danger)'}}>Dépasse résa</div>}
                        </td>
                        <td style={{ padding:'8px 10px', textAlign:'center' }}>
                          <strong style={{ color:restant===0?'var(--c-success)':'var(--c-text)', fontSize:15 }}>{restant}</strong>
                        </td>
                        <td style={{ padding:'8px 10px', textAlign:'right' }}>
                          <strong style={{ color:montant>0?'var(--c-accent)':'var(--c-text3)', fontSize:13, whiteSpace:'nowrap' }}>
                            {montant>0?`${montant.toLocaleString('fr-FR')} MAD`:'—'}
                          </strong>
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <button onClick={() => autoFill(row.client.id)}
                              style={{ background:'rgba(245,166,35,.12)', border:'1px solid rgba(245,166,35,.2)', color:'var(--c-warning)', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
                              ⚡ Max
                            </button>
                            {!row.done && (row.nbBois>0||row.nbPlast>0) && (
                              <button onClick={async () => {
                                try {
                                  const ops=[];
                                  if(row.nbBois>0) ops.push(locationsApi.create({clientId:row.client.id,dateLocation:dateOp,nbCaisses:row.nbBois,typeCaisse:'bois',prixUnitaire:row.prixB||PRIX_DEF_BOIS}));
                                  if(row.nbPlast>0) ops.push(locationsApi.create({clientId:row.client.id,dateLocation:dateOp,nbCaisses:row.nbPlast,typeCaisse:'plastique',prixUnitaire:row.prixP||PRIX_DEF_PLAST}));
                                  await Promise.all(ops);
                                  updRow(row.client.id,{done:true}); toast.success(`✓ ${row.client.nom}`); refetch();
                                } catch(e:any){ updRow(row.client.id,{error:e?.response?.data?.message||'Erreur'}); toast.error('Erreur'); }
                              }}
                                style={{ background:'var(--c-accent)', border:'none', color:'#fff', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                                ✓ Louer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel résumé */}
          {showSummary && (
            <div style={{ position:'sticky', top:20, height:'fit-content' }}>
              <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:14, padding:'18px 20px' }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>📊 Résumé session</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  {[
                    {label:'Clients modifiés', val:modifies.length, color:'var(--c-primary)'},
                    {label:'🧴 Plastique total', val:totalNbP, color:'var(--c-primary)'},
                    {label:'🪵 Bois total', val:totalNbB, color:'var(--c-warning)'},
                  ].map(k => (
                    <div key={k.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:'var(--c-text2)' }}>{k.label}</span>
                      <strong style={{ color:k.color }}>{k.val}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:'1px solid var(--c-border)', paddingTop:12, marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--c-text2)' }}>Montant total</span>
                    <strong style={{ color:'var(--c-accent)', fontSize:15 }}>
                      {modifies.reduce((s,r)=>s+r.nbBois*(r.prixB||PRIX_DEF_BOIS)+r.nbPlast*(r.prixP||PRIX_DEF_PLAST),0).toLocaleString('fr-FR')} MAD
                    </strong>
                  </div>
                </div>
                {anomalies.length>0 && (
                  <div style={{ background:'rgba(240,90,90,.08)', border:'1px solid rgba(240,90,90,.2)', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
                    <div style={{ fontSize:12, color:'var(--c-danger)', fontWeight:700 }}>⚠ {anomalies.length} anomalie(s)</div>
                    {anomalies.slice(0,3).map(r => <div key={r.client.id} style={{ fontSize:11, color:'var(--c-danger)', marginTop:4 }}>· {r.client.nom}</div>)}
                  </div>
                )}
                {modifies.filter(r=>r.done).length>0 && (
                  <div style={{ background:'rgba(46,207,138,.08)', border:'1px solid rgba(46,207,138,.2)', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
                    <div style={{ fontSize:12, color:'var(--c-success)', fontWeight:700 }}>✓ {modifies.filter(r=>r.done).length} validé(s)</div>
                  </div>
                )}
                <button onClick={confirmerTout} disabled={saving||modifies.filter(r=>!r.done).length===0||anomalies.length>0}
                  style={{ width:'100%', background:modifies.filter(r=>!r.done).length>0&&anomalies.length===0?'var(--c-success)':'var(--c-surface2)', border:'none', color:modifies.filter(r=>!r.done).length>0&&anomalies.length===0?'#fff':'var(--c-text3)', borderRadius:10, padding:'11px 0', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  {saving?'...':`✓ Valider tout (${modifies.filter(r=>!r.done).length})`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SUIVI ══ */}
      {tab==='suivi' && (
        <>
          <input placeholder="🔍 Rechercher..." value={searchSuivi} onChange={e=>setSearchSuivi(e.target.value)}
            style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none',width:280,marginBottom:16}}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'Total loué',val:filteredLoc.reduce((s,l)=>s+(Number(l.nbCaisses)||0),0),color:'var(--c-primary)'},
              {label:'Total retourné',val:filteredLoc.reduce((s,l)=>s+(Number(l.nbCaissesRetournees)||0),0),color:'var(--c-success)'},
              {label:'En circulation',val:filteredLoc.reduce((s,l)=>s+Math.max(0,(Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0)),0),color:'var(--c-warning)'},
              {label:'Clients actifs',val:suiviFiltres.filter(s=>(s as any).totalRest>0).length,color:'var(--c-accent)'},
            ].map(k=>(
              <div key={k.label} style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
                <div style={{fontSize:10,color:'var(--c-text3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>{k.label}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:800,color:k.color}}>{k.val.toLocaleString('fr-FR')}</div>
              </div>
            ))}
          </div>
          <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}>
              <thead>
                <tr style={{background:'var(--c-bg2)'}}>
                  <th rowSpan={2} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',borderBottom:'1px solid var(--c-border)',borderRight:'1px solid var(--c-border)'}}>Client</th>
                  {['🪵 Bois','🧴 Plastique','TOTAL'].map(t=>(
                    <th key={t} colSpan={t==='TOTAL'?2:3} style={{padding:'8px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',borderBottom:'1px solid var(--c-border)',borderRight:'1px solid var(--c-border)'}}>{t}</th>
                  ))}
                  <th rowSpan={2} style={{padding:'10px 14px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',borderBottom:'1px solid var(--c-border)'}}>Action</th>
                </tr>
                <tr style={{background:'var(--c-bg2)'}}>
                  {['Loué','Ret.','Rest.','Loué','Ret.','Rest.','Total','Rest.'].map((h,i)=>(
                    <th key={i} style={{padding:'7px 8px',textAlign:'center',fontSize:10,fontWeight:700,color:'var(--c-text3)',textTransform:'uppercase',borderBottom:'1px solid var(--c-border)',borderRight:[2,5,6].includes(i)?'1px solid var(--c-border)':'none'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suiviFiltres.length===0&&<tr><td colSpan={10} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucune location</td></tr>}
                {suiviFiltres.map((s:any,i)=>(
                  <tr key={s.client.id} style={{borderBottom:'1px solid var(--c-border)',background:i%2===0?'':'rgba(255,255,255,.01)'}}>
                    <td style={{padding:'10px 14px',fontWeight:600,fontSize:13,borderRight:'1px solid var(--c-border)'}}>{s.client.nom}</td>
                    <td style={{padding:'10px',textAlign:'center',color:'var(--c-warning)'}}>{s.bois.l}</td>
                    <td style={{padding:'10px',textAlign:'center',color:'var(--c-success)'}}>{s.bois.r}</td>
                    <td style={{padding:'10px',textAlign:'center',fontWeight:700,color:s.bois.rest>0?'var(--c-warning)':'var(--c-success)',borderRight:'1px solid var(--c-border)'}}>{s.bois.rest}</td>
                    <td style={{padding:'10px',textAlign:'center',color:'var(--c-primary)'}}>{s.plast.l}</td>
                    <td style={{padding:'10px',textAlign:'center',color:'var(--c-success)'}}>{s.plast.r}</td>
                    <td style={{padding:'10px',textAlign:'center',fontWeight:700,color:s.plast.rest>0?'var(--c-primary)':'var(--c-success)',borderRight:'1px solid var(--c-border)'}}>{s.plast.rest}</td>
                    <td style={{padding:'10px',textAlign:'center',fontWeight:700,fontSize:15}}>{s.totalL}</td>
                    <td style={{padding:'10px',textAlign:'center',fontWeight:700,color:s.totalRest>0?'var(--c-warning)':'var(--c-success)',fontSize:15}}>{s.totalRest}</td>
                    <td style={{padding:'10px',textAlign:'center'}}>
                      {s.totalRest>0&&<button onClick={()=>setClientRetour(s.client)} style={{background:'rgba(46,207,138,.15)',border:'1px solid rgba(46,207,138,.3)',color:'var(--c-success)',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>↩ Retour</button>}
                      {s.totalRest===0&&<span style={{fontSize:11,color:'var(--c-success)'}}>✓ Tout rendu</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ HISTORIQUE ══ */}
      {tab==='historique' && (
        <>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Tous les clients</option>{clients?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <div style={{marginLeft:'auto'}}>
              <BtnPdf onClick={() => pdfLocations(filteredLoc)} label="⬇ Exporter PDF" disabled={filteredLoc.length===0} />
            </div>
          </div>
          <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr style={{background:'var(--c-bg2)'}}>
                  {['Date','Client','Type','Loué','Retourné','Restant','Retour prévu',''].map(h=>(
                    <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLoc.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucune location</td></tr>}
                {filteredLoc.map((l,i)=>{
                  const enRetard=l.dateRetourPrevu&&new Date(l.dateRetourPrevu)<new Date()&&(Number(l.nbCaisses)-Number(l.nbCaissesRetournees))>0;
                  const typeCol=!l.typeCaisse||l.typeCaisse==='bois'?'var(--c-warning)':'var(--c-primary)';
                  const typeIcon=!l.typeCaisse||l.typeCaisse==='bois'?'🪵 Bois':'🧴 Plastique';
                  const restant=Math.max(0,(Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0));
                  return (
                    <tr key={l.id} style={{borderBottom:'1px solid var(--c-border)',background:i%2===0?'':'rgba(255,255,255,.01)'}}>
                      <td style={{padding:'10px 12px',fontSize:13}}>{format(new Date(l.dateLocation),'dd/MM/yyyy')}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{l.client.nom}</td>
                      <td style={{padding:'10px 12px',fontWeight:600,color:typeCol}}>{typeIcon}</td>
                      <td style={{padding:'10px 12px'}}><strong>{l.nbCaisses}</strong></td>
                      <td style={{padding:'10px 12px',color:'var(--c-success)'}}>{l.nbCaissesRetournees}</td>
                      <td style={{padding:'10px 12px'}}><strong style={{color:restant>0?'var(--c-warning)':'var(--c-success)'}}>{restant}</strong></td>
                      <td style={{padding:'10px 12px',color:enRetard?'var(--c-danger)':'var(--c-text2)',fontSize:12}}>{l.dateRetourPrevu?format(new Date(l.dateRetourPrevu),'dd/MM/yyyy'):'—'}{enRetard&&' ⚠'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:6}}>
                          {restant>0&&<button onClick={()=>setClientRetour(l.client)} style={{background:'rgba(46,207,138,.15)',border:'1px solid rgba(46,207,138,.3)',color:'var(--c-success)',borderRadius:6,padding:'4px 8px',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>↩ Retour</button>}
                          <button onClick={async()=>{if(!confirm('Supprimer ?')) return;try{await locationsApi.delete(l.id);toast.success('Supprimée');refetch();}catch(e:any){toast.error(e?.response?.data?.message||'Erreur');}}} style={{background:'rgba(240,90,90,.12)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,width:28,height:28,fontSize:12,cursor:'pointer'}}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {clientRetour && <ModalRetour client={clientRetour} locations={locations||[]} onClose={()=>setClientRetour(null)} onSaved={()=>{refetch();setClientRetour(null);}}/>}
    </div>
  );
}
