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

// ── Modal Retour ───────────────────────────────────────
function ModalRetour({ client, locations, onClose, onSaved }: {
  client: Client; locations: Location[]; onClose: () => void; onSaved: () => void;
}) {
  const locsClient = locations.filter(l => l.client.id === client.id);
  const boisRestant  = locsClient.filter(l => !l.typeCaisse || l.typeCaisse === 'bois').reduce((s,l) => s + Math.max(0,(Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0)), 0);
  const plastRestant = locsClient.filter(l => l.typeCaisse === 'plastique').reduce((s,l) => s + Math.max(0,(Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0)), 0);
  const [nbBois, setNbBois] = useState(String(boisRestant));
  const [nbPlast, setNbPlast] = useState(String(plastRestant));
  const [prixBois, setPrixBois] = useState('30');
  const [prixPlast, setPrixPlast] = useState('55');
  const [saving, setSaving] = useState(false);
  const vBois = parseInt(nbBois)||0;
  const vPlast = parseInt(nbPlast)||0;
  const total = vBois + vPlast;
  const depasse = vBois > boisRestant || vPlast > plastRestant;
  const montantDu = Math.max(0,boisRestant-vBois)*(parseFloat(prixBois)||0)+Math.max(0,plastRestant-vPlast)*(parseFloat(prixPlast)||0);

  async function handleSave() {
    if (total === 0) return toast.error('Saisir au moins une caisse');
    if (depasse) return toast.error('Quantité dépasse le stock');
    setSaving(true);
    try {
      async function retournerType(type: string, nb: number) {
        if (nb <= 0) return;
        const locs = locsClient
          .filter(l => type === 'bois' ? (!l.typeCaisse || l.typeCaisse === 'bois') : l.typeCaisse === type)
          .filter(l => (Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0) > 0)
          .sort((a,b) => new Date(a.dateLocation).getTime()-new Date(b.dateLocation).getTime());
        let reste = nb;
        for (const loc of locs) {
          if (reste <= 0) break;
          const dispo = Math.max(0,(Number(loc.nbCaisses)||0)-(Number(loc.nbCaissesRetournees)||0));
          const n = Math.min(reste, dispo);
          await locationsApi.enregistrerRetour(loc.id, { nbRetournees: n });
          reste -= n;
        }
      }
      await retournerType('bois', vBois);
      await retournerType('plastique', vPlast);
      toast.success(`✓ ${client.nom} — ${total} caisse(s) retournée(s)`);
      onSaved(); onClose();
    } catch(e:any) { toast.error(e?.response?.data?.message||'Erreur'); }
    finally { setSaving(false); }
  }

  const inp = (label: string, val: string, onChange: (v:string)=>void, max: number, color: string) => (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
      <div style={{ width:100, fontWeight:700, color, fontSize:14 }}>{label}</div>
      <div style={{ textAlign:'center', width:70 }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:2 }}>STOCK</div>
        <div style={{ fontWeight:800, fontSize:22, color }}>{max}</div>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4 }}>À RETOURNER</div>
        <input type="number" min="0" max={max} value={val} onFocus={e=>e.target.select()} onChange={e=>onChange(e.target.value)}
          style={{ background:'#1a2540', border:`2px solid ${(parseInt(val)||0)>max?'var(--c-danger)':(parseInt(val)||0)>0?color:'rgba(100,140,255,.3)'}`, borderRadius:8, color:'#e8edf8', padding:'8px 0', fontSize:20, fontWeight:800, width:'100%', outline:'none', textAlign:'center' }} />
      </div>
      <div style={{ textAlign:'center', width:70 }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:2 }}>RESTANT</div>
        <div style={{ fontWeight:800, fontSize:22, color:Math.max(0,max-(parseInt(val)||0))===0?'var(--c-success)':color }}>
          {Math.max(0, max-(parseInt(val)||0))}
        </div>
      </div>
      <div style={{ width:100 }}>
        <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4 }}>PRIX/U (MAD)</div>
        <input type="number" min="0" value={label.includes('Bois')?prixBois:prixPlast}
          onChange={e => label.includes('Bois') ? setPrixBois(e.target.value) : setPrixPlast(e.target.value)}
          style={{ background:'#1a2540', border:'1px solid rgba(100,140,255,.2)', borderRadius:6, color:'#e8edf8', padding:'6px 8px', fontSize:13, width:'100%', outline:'none', textAlign:'center' }} />
      </div>
    </div>
  );

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position:'relative', zIndex:1, background:'#0f1628', border:'1px solid rgba(100,140,255,.3)', borderRadius:16, width:'100%', maxWidth:580, padding:'24px 28px', boxShadow:'0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>↩ Retour de caisses</div>
            <div style={{ fontSize:13, color:'var(--c-text2)', marginTop:2 }}>{client.nom}</div>
          </div>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'none', color:'#8fa3cc', width:30, height:30, borderRadius:6, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
        {boisRestant > 0 && inp('🪵 Bois', nbBois, setNbBois, boisRestant, 'var(--c-warning)')}
        {plastRestant > 0 && inp('🧴 Plastique', nbPlast, setNbPlast, plastRestant, 'var(--c-primary)')}
        {boisRestant===0&&plastRestant===0&&<div style={{padding:'20px 0',textAlign:'center',color:'var(--c-success)',fontWeight:600}}>✓ Tout retourné</div>}
        {total>0&&!depasse&&(
          <div style={{background:'rgba(46,207,138,.08)',border:'1px solid rgba(46,207,138,.2)',borderRadius:10,padding:'12px 16px',margin:'16px 0 0',display:'flex',gap:24,alignItems:'center'}}>
            <div style={{fontWeight:700,color:'var(--c-success)'}}>Retour : <span style={{fontSize:20}}>{total}</span></div>
            <div style={{fontSize:13,color:'var(--c-text2)'}}>Montant dû restant : <strong style={{color:'var(--c-accent)'}}>{montantDu.toLocaleString('fr-FR')} MAD</strong></div>
          </div>
        )}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
          <button onClick={onClose} style={{background:'#1f2a4a',border:'1px solid rgba(100,140,255,.2)',color:'#8fa3cc',borderRadius:10,padding:'10px 20px',fontWeight:600,cursor:'pointer',fontSize:13}}>Annuler</button>
          <button onClick={handleSave} disabled={saving||total===0||depasse}
            style={{background:total>0&&!depasse?'var(--c-success)':'var(--c-surface2)',border:'none',color:total>0&&!depasse?'#fff':'var(--c-text3)',borderRadius:10,padding:'10px 24px',fontSize:14,fontWeight:700,cursor:total>0&&!depasse?'pointer':'not-allowed'}}>
            {saving?'...':depasse?'⚠ Dépassé':`✓ Confirmer (${total})`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Carte client dans la session ───────────────────────
function CarteClient({ row, onUpdRow, onAutoFill, onLouer, onRetour, locClient, PRIX_DEF_BOIS, PRIX_DEF_PLAST }: {
  row: any; onUpdRow: (id:number,patch:any)=>void; onAutoFill:(id:number)=>void;
  onLouer:(row:any)=>void; onRetour:(client:Client)=>void;
  locClient: any; PRIX_DEF_BOIS:number; PRIX_DEF_PLAST:number;
}) {
  const { client, resaB, resaP, prixB, prixP, nbBois, nbPlast, done, error } = row;
  const montant = nbBois*(prixB||PRIX_DEF_BOIS)+nbPlast*(prixP||PRIX_DEF_PLAST);
  const anomalie = nbBois>resaB || nbPlast>resaP;
  const rien = resaB===0 && resaP===0;

  // Caisses déjà louées (depuis locations en base)
  const boisLoue = locClient?.bois?.l || 0;
  const plastLoue = locClient?.plast?.l || 0;
  const boisRest = locClient?.bois?.rest || 0;
  const plastRest = locClient?.plast?.rest || 0;
  const totalRest = boisRest + plastRest;

  const borderColor = done?'var(--c-success)':anomalie?'var(--c-danger)':row.modified?'var(--c-primary)':'var(--c-border)';

  if (rien) return null;

  return (
    <div style={{ background:'var(--c-surface)', border:`1px solid ${borderColor}`, borderRadius:12, padding:'14px 16px', transition:'border-color .15s' }}>
      {/* En-tête client */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{client.nom}</div>
          {done && <div style={{ fontSize:11, color:'var(--c-success)', marginTop:2 }}>✓ Location créée</div>}
          {error && <div style={{ fontSize:11, color:'var(--c-danger)', marginTop:2 }}>⚠ {error}</div>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {!done && <button onClick={() => onAutoFill(client.id)}
            style={{ background:'rgba(245,166,35,.12)', border:'1px solid rgba(245,166,35,.3)', color:'var(--c-warning)', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            ⚡ Max
          </button>}
          {totalRest > 0 && <button onClick={() => onRetour(client)}
            style={{ background:'rgba(46,207,138,.12)', border:'1px solid rgba(46,207,138,.3)', color:'var(--c-success)', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            ↩ Retour
          </button>}
        </div>
      </div>

      {/* Résumé visuel loué/restant si déjà des locations */}
      {(boisLoue > 0 || plastLoue > 0) && (
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {boisLoue > 0 && (
            <div style={{ background:'rgba(245,166,35,.08)', border:'1px solid rgba(245,166,35,.2)', borderRadius:8, padding:'6px 10px', fontSize:11 }}>
              <span style={{ color:'var(--c-text3)' }}>🪵 Loué: </span><strong style={{ color:'var(--c-warning)' }}>{boisLoue}</strong>
              {boisRest > 0 && <><span style={{ color:'var(--c-text3)', marginLeft:6 }}>Restant: </span><strong style={{ color:'var(--c-danger)' }}>{boisRest}</strong></>}
              {boisRest === 0 && <span style={{ color:'var(--c-success)', marginLeft:6 }}>✓</span>}
            </div>
          )}
          {plastLoue > 0 && (
            <div style={{ background:'rgba(79,142,247,.08)', border:'1px solid rgba(79,142,247,.2)', borderRadius:8, padding:'6px 10px', fontSize:11 }}>
              <span style={{ color:'var(--c-text3)' }}>🧴 Loué: </span><strong style={{ color:'var(--c-primary)' }}>{plastLoue}</strong>
              {plastRest > 0 && <><span style={{ color:'var(--c-text3)', marginLeft:6 }}>Restant: </span><strong style={{ color:'var(--c-danger)' }}>{plastRest}</strong></>}
              {plastRest === 0 && <span style={{ color:'var(--c-success)', marginLeft:6 }}>✓</span>}
            </div>
          )}
        </div>
      )}

      {/* Saisie quantités */}
      {!done && (
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {/* Plastique */}
          {resaP > 0 && (
            <div style={{ flex:1, minWidth:120 }}>
              <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4 }}>🧴 Plastique <span style={{ color:'var(--c-primary)' }}>(résa: {resaP})</span></div>
              <input type="number" min="0" max={resaP} value={nbPlast} onFocus={e=>e.target.select()}
                onChange={e => onUpdRow(client.id, { nbPlast: parseInt(e.target.value)||0 })}
                style={{ background:'#161d35', border:`1.5px solid ${nbPlast>resaP?'var(--c-danger)':nbPlast>0?'var(--c-primary)':'rgba(79,142,247,.25)'}`, borderRadius:8, color:'#e8edf8', padding:'8px 0', fontSize:18, fontWeight:700, width:'100%', outline:'none', textAlign:'center' }} />
            </div>
          )}
          {/* Bois */}
          {resaB > 0 && (
            <div style={{ flex:1, minWidth:120 }}>
              <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:4 }}>🪵 Bois <span style={{ color:'var(--c-warning)' }}>(résa: {resaB})</span></div>
              <input type="number" min="0" max={resaB} value={nbBois} onFocus={e=>e.target.select()}
                onChange={e => onUpdRow(client.id, { nbBois: parseInt(e.target.value)||0 })}
                style={{ background:'#161d35', border:`1.5px solid ${nbBois>resaB?'var(--c-danger)':nbBois>0?'var(--c-warning)':'rgba(245,166,35,.25)'}`, borderRadius:8, color:'#e8edf8', padding:'8px 0', fontSize:18, fontWeight:700, width:'100%', outline:'none', textAlign:'center' }} />
            </div>
          )}
          {/* Montant + Bouton */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
            {montant > 0 && (
              <div style={{ fontSize:13, fontWeight:700, color:'var(--c-accent)', whiteSpace:'nowrap' }}>
                {montant.toLocaleString('fr-FR')} MAD
              </div>
            )}
            <button onClick={() => onLouer(row)}
              disabled={!((nbBois>0||nbPlast>0)&&!anomalie)}
              style={{ background:(nbBois>0||nbPlast>0)&&!anomalie?'var(--c-success)':'var(--c-surface2)', border:'none', color:(nbBois>0||nbPlast>0)&&!anomalie?'#fff':'var(--c-text3)', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, cursor:(nbBois>0||nbPlast>0)&&!anomalie?'pointer':'not-allowed', whiteSpace:'nowrap' }}>
              ✓ Louer
            </button>
          </div>
        </div>
      )}
      {anomalie && <div style={{ fontSize:11, color:'var(--c-danger)', marginTop:6 }}>⚠ Quantité dépasse la réservation</div>}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────
interface ClientLoc {
  client: Client; resaB:number; resaP:number; prixB:number; prixP:number;
  nbBois:number; nbPlast:number; modified:boolean; error:string; done:boolean;
}

// ── Page principale ───────────────────────────────────
export default function LocationsPage() {
  const { data: locations, loading, refetch } = useFetch<Location[]>(() => locationsApi.getAll());
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());

  const [tab, setTab] = useState<'session'|'suivi'|'historique'>('session');
  const [dateOp, setDateOp] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [searchSuivi, setSearchSuivi] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientRetour, setClientRetour] = useState<Client|null>(null);

  const PRIX_DEF_BOIS = 30;
  const PRIX_DEF_PLAST = 55;

  const clientRows = useMemo<ClientLoc[]>(() => {
    if (!clients || !reservations) return [];
    const resaMap: Record<number, Reservation> = {};
    reservations.filter(r => isInCampagne((r as any).dateReservation)).forEach(r => { resaMap[r.client.id] = r; });
    return clients.filter(c => resaMap[c.id]).map(client => {
      const resa = resaMap[client.id];
      return {
        client,
        resaB: resa?.nbCaissesBois||0,
        resaP: (resa as any)?.nbCaissesPластique||0,
        prixB: resa?.prixUnitaireBois||0,
        prixP: resa?.prixUnitairePlastique||0,
        nbBois: 0, nbPlast: 0, modified: false, error: '', done: false,
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

  async function louerUn(row: ClientLoc) {
    try {
      const ops = [];
      if (row.nbBois > 0) ops.push(locationsApi.create({clientId:row.client.id, dateLocation:dateOp, nbCaisses:row.nbBois, typeCaisse:'bois', prixUnitaire:row.prixB||PRIX_DEF_BOIS}));
      if (row.nbPlast > 0) ops.push(locationsApi.create({clientId:row.client.id, dateLocation:dateOp, nbCaisses:row.nbPlast, typeCaisse:'plastique', prixUnitaire:row.prixP||PRIX_DEF_PLAST}));
      await Promise.all(ops);
      updRow(row.client.id, { done: true });
      toast.success(`✓ ${row.client.nom}`);
      refetch();
    } catch(e:any) { updRow(row.client.id, { error: e?.response?.data?.message||'Erreur' }); toast.error('Erreur'); }
  }

  async function confirmerTout() {
    const aFaire = rows.filter(r => r.modified && !r.done && (r.nbBois>0||r.nbPlast>0));
    if (aFaire.length === 0) return toast.error('Aucune opération');
    setSaving(true);
    let ok=0; let err=0;
    for (const row of aFaire) {
      try { await louerUn(row); ok++; }
      catch { err++; }
    }
    setSaving(false);
    if (err === 0) toast.success(`✓ ${ok} location(s) créée(s)`);
  }

  // Suivi
  const suivi = useMemo(() => {
    if (!clients || !locations) return [];
    return clients.map(client => {
      const locs = locations.filter(l => l.client.id === client.id && isInCampagne(l.dateLocation));
      const boisLocs = locs.filter(l => !l.typeCaisse || l.typeCaisse === 'bois');
      const plastLocs = locs.filter(l => l.typeCaisse === 'plastique');
      const boisL = boisLocs.reduce((s,l)=>s+(Number(l.nbCaisses)||0),0);
      const boisR = boisLocs.reduce((s,l)=>s+(Number(l.nbCaissesRetournees)||0),0);
      const plastL = plastLocs.reduce((s,l)=>s+(Number(l.nbCaisses)||0),0);
      const plastR = plastLocs.reduce((s,l)=>s+(Number(l.nbCaissesRetournees)||0),0);
      const totalL = boisL+plastL;
      if (totalL === 0) return null;
      return {
        client, totalL, totalRest: Math.max(0,boisL-boisR)+Math.max(0,plastL-plastR),
        bois:{l:boisL,r:boisR,rest:Math.max(0,boisL-boisR)},
        plast:{l:plastL,r:plastR,rest:Math.max(0,plastL-plastR)},
      };
    }).filter(Boolean);
  }, [clients, locations]);

  // Map suivi par client pour les cartes
  const suiviMap = useMemo(() => {
    const m: Record<number, any> = {};
    suivi.forEach((s:any) => { m[s.client.id] = s; });
    return m;
  }, [suivi]);

  const suiviFiltres = suivi.filter(s => (s as any).client.nom.toLowerCase().includes(searchSuivi.toLowerCase()));
  const filteredLoc = (locations||[]).filter(l => (filterClient ? l.client.id===parseInt(filterClient) : true) && isInCampagne(l.dateLocation));

  const modifies = rows.filter(r => r.modified && (r.nbBois>0||r.nbPlast>0) && !r.done);
  const totalResaB = rows.reduce((s,r)=>s+r.resaB,0);
  const totalResaP = rows.reduce((s,r)=>s+r.resaP,0);
  const totalNbB = modifies.reduce((s,r)=>s+r.nbBois,0);
  const totalNbP = modifies.reduce((s,r)=>s+r.nbPlast,0);

  const rowsFiltres = rows.filter(r =>
    r.client.nom.toLowerCase().includes(search.toLowerCase()) &&
    (r.resaB > 0 || r.resaP > 0)
  );

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner size={36}/></div>;

  return (
    <div className="fade-in">
      {/* ── HEADER ── */}
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:14, padding:'18px 22px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, margin:0 }}>Location de caisses vides</h1>
            <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3 }}>Campagne {campagneActive}</div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input type="date" value={dateOp} onChange={e => setDateOp(e.target.value)}
              style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:8, color:'var(--c-text)', padding:'8px 12px', fontSize:13, outline:'none' }} />
            <button onClick={resetRows}
              style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', color:'var(--c-text2)', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ↺ Reset
            </button>
            <button onClick={autoFillAll}
              style={{ background:'rgba(245,166,35,.15)', border:'1px solid rgba(245,166,35,.3)', color:'var(--c-warning)', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ⚡ Auto-remplir tout
            </button>
            <button onClick={confirmerTout} disabled={saving||modifies.length===0}
              style={{ background:modifies.length>0?'var(--c-success)':'var(--c-surface2)', border:'none', color:modifies.length>0?'#fff':'var(--c-text3)', borderRadius:10, padding:'8px 20px', fontSize:14, fontWeight:700, cursor:modifies.length>0?'pointer':'not-allowed', whiteSpace:'nowrap' }}>
              {saving?'...': `✓ Valider tout (${modifies.length})`}
            </button>
          </div>
        </div>
        {/* KPIs compacts */}
        <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
          {[
            {label:'🧴 Plast. réservé', val:totalResaP, color:'var(--c-primary)'},
            {label:'🪵 Bois réservé', val:totalResaB, color:'var(--c-warning)'},
            {label:'À louer maintenant', val:`🧴${totalNbP} + 🪵${totalNbB}`, color:'var(--c-text)', isText:true},
            {label:'En cours de retour', val:suiviFiltres.filter((s:any)=>s.totalRest>0).length, color:'var(--c-danger)'},
          ].map(k => (
            <div key={k.label} style={{ background:'var(--c-bg2)', borderRadius:8, padding:'8px 12px', minWidth:130 }}>
              <div style={{ fontSize:9, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>{k.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:k.color }}>{(k as any).isText ? k.val : typeof k.val==='number' ? k.val.toLocaleString('fr-FR') : k.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:'flex', gap:4, background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:10, padding:4, width:'fit-content', marginBottom:18 }}>
        {[
          {id:'session', label:'⚡ Session location'},
          {id:'suivi', label:`📊 Suivi (${suiviFiltres.length})`},
          {id:'historique', label:`📋 Historique (${filteredLoc.length})`},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding:'7px 16px', borderRadius:7, border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background:tab===t.id?'var(--c-primary-glow)':'transparent', color:tab===t.id?'var(--c-primary)':'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SESSION ══ */}
      {tab === 'session' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
            <input placeholder="🔍 Rechercher client..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:8, color:'var(--c-text)', padding:'8px 12px', fontSize:13, outline:'none', width:250 }} />
            <div style={{ fontSize:12, color:'var(--c-text2)' }}>
              <strong style={{ color:'var(--c-primary)' }}>{modifies.length}</strong> modifié(s) — <strong style={{ color:'var(--c-success)' }}>{rows.filter(r=>r.done).length}</strong> validé(s)
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:12 }}>
            {rowsFiltres.length === 0 && (
              <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'var(--c-text3)' }}>
                Aucun client avec réservation pour cette campagne
              </div>
            )}
            {rowsFiltres.map(row => (
              <CarteClient
                key={row.client.id}
                row={row}
                onUpdRow={updRow}
                onAutoFill={autoFill}
                onLouer={louerUn}
                onRetour={setClientRetour}
                locClient={suiviMap[row.client.id]}
                PRIX_DEF_BOIS={PRIX_DEF_BOIS}
                PRIX_DEF_PLAST={PRIX_DEF_PLAST}
              />
            ))}
          </div>
        </>
      )}

      {/* ══ SUIVI ══ */}
      {tab === 'suivi' && (
        <>
          <input placeholder="🔍 Rechercher..." value={searchSuivi} onChange={e=>setSearchSuivi(e.target.value)}
            style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:10, color:'var(--c-text)', padding:'8px 12px', fontSize:13, outline:'none', width:280, marginBottom:16 }} />

          {/* KPIs suivi */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              {label:'Total loué', val:filteredLoc.reduce((s,l)=>s+(Number(l.nbCaisses)||0),0), color:'var(--c-primary)'},
              {label:'Total retourné', val:filteredLoc.reduce((s,l)=>s+(Number(l.nbCaissesRetournees)||0),0), color:'var(--c-success)'},
              {label:'En circulation', val:filteredLoc.reduce((s,l)=>s+Math.max(0,(Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0)),0), color:'var(--c-warning)'},
              {label:'Clients actifs', val:suiviFiltres.filter((s:any)=>s.totalRest>0).length, color:'var(--c-accent)'},
            ].map(k => (
              <div key={k.label} style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>{k.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:k.color }}>{k.val.toLocaleString('fr-FR')}</div>
              </div>
            ))}
          </div>

          {/* Cartes suivi par client */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
            {suiviFiltres.length === 0 && <div style={{ padding:40, textAlign:'center', color:'var(--c-text3)' }}>Aucune location</div>}
            {suiviFiltres.map((s:any) => {
              const pct = s.totalL > 0 ? Math.round((s.totalRest/s.totalL)*100) : 0;
              return (
                <div key={s.client.id} style={{ background:'var(--c-surface)', border:`1px solid ${s.totalRest>0?'rgba(245,166,35,.3)':'rgba(46,207,138,.3)'}`, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{s.client.nom}</div>
                    {s.totalRest > 0
                      ? <button onClick={() => setClientRetour(s.client)}
                          style={{ background:'rgba(46,207,138,.15)', border:'1px solid rgba(46,207,138,.3)', color:'var(--c-success)', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>↩ Retour</button>
                      : <span style={{ fontSize:11, color:'var(--c-success)', fontWeight:600 }}>✓ Tout rendu</span>}
                  </div>
                  {/* Barre progression */}
                  <div style={{ background:'var(--c-bg2)', borderRadius:20, height:6, marginBottom:10, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:20, background:pct>50?'var(--c-warning)':'var(--c-success)', width:`${pct}%`, transition:'width .3s' }} />
                  </div>
                  <div style={{ display:'flex', gap:10, fontSize:12, flexWrap:'wrap' }}>
                    {s.bois.l > 0 && (
                      <div>
                        <span style={{ color:'var(--c-text3)' }}>🪵 </span>
                        <span style={{ color:'var(--c-warning)' }}>Loué:{s.bois.l}</span>
                        {s.bois.rest > 0 && <span style={{ color:'var(--c-danger)', marginLeft:4 }}>Rest:{s.bois.rest}</span>}
                        {s.bois.rest === 0 && <span style={{ color:'var(--c-success)', marginLeft:4 }}>✓</span>}
                      </div>
                    )}
                    {s.plast.l > 0 && (
                      <div>
                        <span style={{ color:'var(--c-text3)' }}>🧴 </span>
                        <span style={{ color:'var(--c-primary)' }}>Loué:{s.plast.l}</span>
                        {s.plast.rest > 0 && <span style={{ color:'var(--c-danger)', marginLeft:4 }}>Rest:{s.plast.rest}</span>}
                        {s.plast.rest === 0 && <span style={{ color:'var(--c-success)', marginLeft:4 }}>✓</span>}
                      </div>
                    )}
                    <div style={{ marginLeft:'auto', fontWeight:700, color:s.totalRest>0?'var(--c-warning)':'var(--c-success)' }}>
                      {s.totalRest > 0 ? `${s.totalRest} restant(s)` : '✓ Complet'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══ HISTORIQUE ══ */}
      {tab === 'historique' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <select value={filterClient} onChange={e=>setFilterClient(e.target.value)}
              style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:10, color:'var(--c-text)', padding:'8px 12px', fontSize:13, outline:'none' }}>
              <option value="">Tous les clients</option>
              {clients?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <div style={{ marginLeft:'auto' }}>
              <BtnPdf onClick={() => pdfLocations(filteredLoc)} label="⬇ Exporter PDF" disabled={filteredLoc.length===0} />
            </div>
          </div>
          <div style={{ overflowX:'auto', border:'1px solid var(--c-border)', borderRadius:10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr style={{ background:'var(--c-bg2)' }}>
                  {['Date','Client','Type','Loué','Retourné','Restant',''].map(h => (
                    <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--c-text2)', textTransform:'uppercase', letterSpacing:'.5px', borderBottom:'1px solid var(--c-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLoc.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucune location</td></tr>}
                {filteredLoc.map((l,i) => {
                  const restant = Math.max(0,(Number(l.nbCaisses)||0)-(Number(l.nbCaissesRetournees)||0));
                  const typeCol = !l.typeCaisse||l.typeCaisse==='bois'?'var(--c-warning)':'var(--c-primary)';
                  return (
                    <tr key={l.id} style={{ borderBottom:'1px solid var(--c-border)', background:i%2===0?'':'rgba(255,255,255,.01)' }}>
                      <td style={{ padding:'10px 12px', fontSize:13 }}>{format(new Date(l.dateLocation),'dd/MM/yyyy')}</td>
                      <td style={{ padding:'10px 12px', fontWeight:600 }}>{l.client.nom}</td>
                      <td style={{ padding:'10px 12px', fontWeight:600, color:typeCol }}>
                        {!l.typeCaisse||l.typeCaisse==='bois'?'🪵 Bois':'🧴 Plastique'}
                      </td>
                      <td style={{ padding:'10px 12px' }}><strong>{l.nbCaisses}</strong></td>
                      <td style={{ padding:'10px 12px', color:'var(--c-success)' }}>{l.nbCaissesRetournees||0}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <strong style={{ color:restant>0?'var(--c-warning)':'var(--c-success)' }}>{restant}</strong>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          {restant>0&&<button onClick={()=>setClientRetour(l.client)}
                            style={{ background:'rgba(46,207,138,.15)', border:'1px solid rgba(46,207,138,.3)', color:'var(--c-success)', borderRadius:6, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer' }}>↩</button>}
                          <button onClick={async()=>{if(!confirm('Supprimer ?')) return;try{await locationsApi.delete(l.id);toast.success('Supprimée');refetch();}catch(e:any){toast.error(e?.response?.data?.message||'Erreur');}}}
                            style={{ background:'rgba(240,90,90,.12)', border:'1px solid rgba(240,90,90,.25)', color:'var(--c-danger)', borderRadius:6, width:28, height:28, fontSize:12, cursor:'pointer' }}>✕</button>
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

      {clientRetour && <ModalRetour client={clientRetour} locations={locations||[]} onClose={()=>setClientRetour(null)} onSaved={()=>{refetch();setClientRetour(null);}} />}
    </div>
  );
}
