import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { paiementsApi, clientsApi, reservationsApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import type { Paiement, Client, Reservation } from '../../types';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useCampagne } from '../../contexts/CampagneContext';

const MODES = [
  { value: 'especes', label: '💵 Espèces', color: 'var(--c-warning)' },
  { value: 'virement', label: '🏦 Virement', color: 'var(--c-primary)' },
  { value: 'cheque', label: '📄 Chèque', color: 'var(--c-accent)' },
  { value: 'carte', label: '💳 Carte', color: 'var(--c-success)' },
];

function fmt(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const sInp = {
  background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8,
  color: '#e8edf8', padding: '9px 12px', fontSize: 13, width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
};

function ModalPaiement({ paiement, clientDefaut, clients, onClose, onSaved }: {
  paiement?: Paiement; clientDefaut?: Client; clients: Client[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isEdit = !!paiement;
  const [form, setForm] = useState({
    clientId: paiement ? String(paiement.client.id) : clientDefaut ? String(clientDefaut.id) : '',
    datePaiement: paiement ? (paiement as any).datePaiement : today,
    montant: paiement ? String(paiement.montant) : '',
    modePaiement: paiement ? paiement.modePaiement : 'especes',
    reference: paiement ? ((paiement as any).reference || '') : '',
    notes: paiement ? ((paiement as any).notes || '') : '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.montant) return toast.error('Client et montant requis');
    setSaving(true);
    try {
      const dto = {
        clientId: parseInt(form.clientId), datePaiement: form.datePaiement,
        montant: parseFloat(form.montant), modePaiement: form.modePaiement,
        reference: form.reference || undefined, notes: form.notes || undefined,
      };
      if (isEdit) await paiementsApi.update(paiement!.id, dto);
      else await paiementsApi.create(dto);
      toast.success(isEdit ? 'Paiement modifié' : 'Paiement enregistré');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  const Label = ({ children }: any) => (
    <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.5px', marginBottom: 5 }}>{children}</div>
  );

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 480, padding: '24px 28px', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '✏ Modifier le paiement' : '+ Nouveau paiement'}</div>
            {clientDefaut && <div style={{ fontSize: 13, color: 'var(--c-primary)', marginTop: 2 }}>{clientDefaut.nom}</div>}
          </div>
          <button onClick={onClose} style={{ background: '#1f2a4a', border: 'none', color: '#8fa3cc', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!clientDefaut && (
            <div><Label>Client *</Label>
              <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} style={sInp} disabled={isEdit}>
                <option value="">-- Sélectionner --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Date *</Label>
              <input type="date" value={form.datePaiement} onChange={e => setForm({...form, datePaiement: e.target.value})} style={sInp} />
            </div>
            <div><Label>Montant (Dh) *</Label>
              <input type="number" min="0.01" step="0.01" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0.00" style={sInp} />
            </div>
          </div>
          <div>
            <Label>Mode de paiement</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MODES.map(m => (
                <button key={m.value} type="button" onClick={() => setForm({...form, modePaiement: m.value})}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${form.modePaiement === m.value ? m.color : 'var(--c-border)'}`, background: form.modePaiement === m.value ? `${m.color}22` : 'transparent', color: form.modePaiement === m.value ? m.color : 'var(--c-text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div><Label>Référence</Label>
            <input type="text" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="N° chèque, virement..." style={sInp} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ background: 'var(--c-success)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '...' : isEdit ? '✓ Modifier' : '✓ Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

function CartePaiement({ client, paiements, montantResa, onAdd, onEdit, onDelete }: {
  client: Client; paiements: Paiement[]; montantResa: number;
  onAdd: (c: Client) => void; onEdit: (p: Paiement) => void; onDelete: (id: number, nom: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalEncaisse = paiements.reduce((s, p) => s + Number(p.montant), 0);
  const restant = Math.max(0, montantResa - totalEncaisse);
  const pct = montantResa > 0 ? Math.min(100, Math.round((totalEncaisse / montantResa) * 100)) : 0;
  const solde = restant === 0 && montantResa > 0;

  return (
    <div style={{ background: 'var(--c-surface)', border: `1px solid ${solde ? 'rgba(46,207,138,.3)' : restant > 0 ? 'rgba(245,166,35,.25)' : 'var(--c-border)'}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: solde ? 'rgba(46,207,138,.15)' : 'rgba(79,142,247,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: solde ? 'var(--c-success)' : 'var(--c-primary)', flexShrink: 0 }}>
          {solde ? '✓' : client.nom[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.nom}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1, background: 'var(--c-bg2)', borderRadius: 20, height: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 20, background: solde ? 'var(--c-success)' : pct > 60 ? 'var(--c-warning)' : 'var(--c-primary)', width: `${pct}%`, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--c-text3)', whiteSpace: 'nowrap' }}>{pct}%</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 2 }}>
            Résa : <span style={{ color: 'var(--c-primary)', fontWeight: 600 }}>{fmt(montantResa)} Dh</span>
          </div>
          {solde
            ? <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 700 }}>✓ Soldé</span>
            : <span style={{ fontSize: 11, color: 'var(--c-danger)', fontWeight: 700 }}>Reste : {fmt(restant)} Dh</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onAdd(client)}
            style={{ background: 'rgba(46,207,138,.12)', border: '1px solid rgba(46,207,138,.3)', color: 'var(--c-success)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Payer
          </button>
          {paiements.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', color: 'var(--c-text2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
              {expanded ? '▲' : `▼ ${paiements.length}`}
            </button>
          )}
        </div>
      </div>

      {expanded && paiements.length > 0 && (
        <div style={{ borderTop: '1px solid var(--c-border)' }}>
          {paiements.map((p, i) => {
            const mode = MODES.find(m => m.value === p.modePaiement);
            return (
              <div key={p.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < paiements.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                <div style={{ fontSize: 12, color: 'var(--c-text3)', width: 85 }}>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</div>
                <div style={{ flex: 1 }}><strong style={{ color: 'var(--c-success)', fontSize: 15 }}>{fmt(Number(p.montant))} Dh</strong></div>
                <span style={{ background: `${mode?.color}22`, color: mode?.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1px solid ${mode?.color}44` }}>
                  {mode?.label || p.modePaiement}
                </span>
                {(p as any).reference && <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{(p as any).reference}</span>}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onEdit(p)} style={{ background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, width: 26, height: 26, fontSize: 12, cursor: 'pointer' }}>✏</button>
                  <button onClick={() => onDelete(p.id, client.nom)} style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 26, height: 26, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            );
          })}
          <div style={{ padding: '10px 16px', background: 'rgba(46,207,138,.04)', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>Total encaissé</span>
            <strong style={{ color: 'var(--c-success)' }}>{fmt(totalEncaisse)} Dh</strong>
          </div>
        </div>
      )}
    </div>
  );
}

interface GroupeRow { client: Client; montant: string; mode: string; reference: string; selected: boolean; done: boolean; error: string; }

function TabGroupe({ clients, onSaved }: { clients: Client[]; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [modeGroupe, setModeGroupe] = useState('especes');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState<{done:number;total:number}|null>(null);
  const [rows, setRows] = useState<GroupeRow[]>(clients.map(c => ({client:c,montant:'',mode:'especes',reference:'',selected:false,done:false,error:''})));

  function upd(cid: number, f: keyof GroupeRow, v: any) { setRows(p => p.map(r => r.client.id===cid?{...r,[f]:v}:r)); }
  function tog(cid: number) { setRows(p => p.map(r => r.client.id===cid&&!r.done?{...r,selected:!r.selected}:r)); }
  function selAll() { const f=rowsFiltres.filter(r=>!r.done&&r.montant); setRows(p=>p.map(r=>f.find(x=>x.client.id===r.client.id)?{...r,selected:true}:r)); }
  function deselAll() { setRows(p=>p.map(r=>({...r,selected:false}))); }
  function reset() { setRows(clients.map(c=>({client:c,montant:'',mode:'especes',reference:'',selected:false,done:false,error:''}))); }
  const rowsFiltres = rows.filter(r=>r.client.nom.toLowerCase().includes(search.toLowerCase()));
  const selectes = rows.filter(r=>r.selected&&!r.done&&r.montant);
  const totalMontant = selectes.reduce((s,r)=>s+(parseFloat(r.montant)||0),0);

  async function confirmer() {
    if (selectes.length===0) return toast.error('Sélectionner des clients avec montant');
    setSaving(true); setProgression({done:0,total:selectes.length});
    let ok=0; let err=0;
    for (let i=0;i<selectes.length;i++) {
      const row=selectes[i];
      try { await paiementsApi.create({clientId:row.client.id,datePaiement:date,montant:parseFloat(row.montant),modePaiement:row.mode||modeGroupe,reference:row.reference||undefined}); upd(row.client.id,'done',true); ok++; }
      catch(e:any) { upd(row.client.id,'error',e?.response?.data?.message||'Erreur'); err++; }
      setProgression({done:i+1,total:selectes.length});
    }
    setSaving(false); setProgression(null); onSaved();
    if (err===0) toast.success(`✓ ${ok} paiement(s)`); else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const sF={background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'};
  const sI={background:'#161d35',border:'1px solid rgba(79,142,247,.3)',borderRadius:6,color:'#e8edf8',padding:'5px 8px',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box' as const};

  return (
    <div>
      <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border2)',borderRadius:12,padding:'16px 20px',marginBottom:14}}>
        <div style={{fontSize:12,color:'var(--c-text2)',fontWeight:600,marginBottom:12}}>⚡ Paramètres communs</div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div>
            <div style={{fontSize:11,color:'var(--c-text3)',marginBottom:4}}>Date</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={sF}/>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--c-text3)',marginBottom:4}}>Mode (pour tous)</div>
            <div style={{display:'flex',gap:6}}>
              <select value={modeGroupe} onChange={e=>setModeGroupe(e.target.value)} style={sF}>{MODES.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select>
              <button onClick={()=>setRows(p=>p.map(r=>r.done?r:{...r,mode:modeGroupe}))} style={{background:'rgba(79,142,247,.15)',border:'1px solid rgba(79,142,247,.3)',color:'var(--c-primary)',borderRadius:8,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>→ Appliquer</button>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
            <button onClick={reset} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border)',color:'var(--c-text2)',borderRadius:8,padding:'8px 14px',fontSize:12,cursor:'pointer'}}>↺ Reset</button>
            <button onClick={confirmer} disabled={saving||selectes.length===0}
              style={{background:selectes.length>0?'var(--c-success)':'var(--c-surface2)',border:'none',color:selectes.length>0?'#fff':'var(--c-text3)',borderRadius:10,padding:'9px 22px',fontSize:14,fontWeight:700,cursor:selectes.length>0?'pointer':'not-allowed',whiteSpace:'nowrap'}}>
              {saving?`${progression?.done}/${progression?.total}...`:`✓ Valider (${selectes.length}) — ${fmt(totalMontant)} Dh`}
            </button>
          </div>
        </div>
      </div>
      {progression&&<div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:12,marginBottom:12}}><div style={{fontSize:12,color:'var(--c-text2)',marginBottom:6}}>{progression.done}/{progression.total}...</div><div style={{background:'var(--c-bg2)',borderRadius:20,height:8}}><div style={{height:'100%',borderRadius:20,background:'var(--c-success)',width:`${(progression.done/progression.total)*100}%`,transition:'width .2s'}}/></div></div>}
      <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{...sF,width:260}}/>
        <button onClick={selAll} style={{background:'rgba(79,142,247,.15)',border:'1px solid rgba(79,142,247,.3)',color:'var(--c-primary)',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}}>✓ Tout</button>
        <button onClick={deselAll} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border)',color:'var(--c-text2)',borderRadius:8,padding:'7px 12px',fontSize:12,cursor:'pointer'}}>✕</button>
        <div style={{fontSize:12,color:'var(--c-text2)',marginLeft:8}}><strong style={{color:'var(--c-primary)'}}>{rows.filter(r=>r.selected).length}</strong> sél.</div>
      </div>
      <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
          <thead><tr style={{background:'var(--c-bg2)'}}>
            <th style={{padding:'10px 12px',borderBottom:'1px solid var(--c-border)',width:36}}><input type="checkbox" checked={rowsFiltres.filter(r=>!r.done).length>0&&rowsFiltres.filter(r=>!r.done).every(r=>r.selected)} onChange={e=>e.target.checked?selAll():deselAll()} style={{width:15,height:15,accentColor:'var(--c-success)',cursor:'pointer'}}/></th>
            {['Client','Montant (Dh) *','Mode','Référence',''].map(h=><th key={h} style={{padding:'10px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rowsFiltres.map((row,i)=>{
              if(row.done) return <tr key={row.client.id} style={{background:'rgba(46,207,138,.05)',borderBottom:'1px solid var(--c-border)',borderLeft:'3px solid var(--c-success)'}}><td style={{padding:'10px 12px'}}>✅</td><td style={{padding:'10px',fontWeight:600,color:'var(--c-success)'}}>{row.client.nom}</td><td colSpan={3} style={{padding:'10px',color:'var(--c-text3)',fontSize:12,fontStyle:'italic'}}>{fmt(parseFloat(row.montant))} Dh</td><td style={{padding:'10px'}}><button onClick={()=>upd(row.client.id,'done',false)} style={{background:'rgba(79,142,247,.1)',border:'1px solid rgba(79,142,247,.25)',color:'var(--c-primary)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>↩</button></td></tr>;
              return <tr key={row.client.id} style={{borderBottom:'1px solid var(--c-border)',background:row.selected?'rgba(79,142,247,.06)':i%2===0?'':'rgba(255,255,255,.01)',borderLeft:`3px solid ${row.selected?'var(--c-primary)':'transparent'}`}}>
                <td style={{padding:'7px 12px'}} onClick={()=>tog(row.client.id)}><input type="checkbox" checked={row.selected} onChange={()=>tog(row.client.id)} style={{width:15,height:15,accentColor:'var(--c-primary)',cursor:'pointer'}}/></td>
                <td style={{padding:'7px 10px',fontWeight:600,fontSize:13,cursor:'pointer'}} onClick={()=>tog(row.client.id)}>{row.client.nom}</td>
                <td style={{padding:'5px 8px'}}><input type="number" min="0" step="0.01" value={row.montant} onChange={e=>{upd(row.client.id,'montant',e.target.value);if(e.target.value&&!row.selected)upd(row.client.id,'selected',true);}} onFocus={e=>e.target.select()} placeholder="0.00" style={{...sI,width:110,border:`1px solid ${row.montant?'rgba(46,207,138,.5)':'rgba(79,142,247,.3)'}`,fontWeight:row.montant?700:400}}/></td>
                <td style={{padding:'5px 8px'}}><select value={row.mode} onChange={e=>upd(row.client.id,'mode',e.target.value)} style={{...sI,width:130}}>{MODES.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></td>
                <td style={{padding:'5px 8px'}}><input type="text" value={row.reference} onChange={e=>upd(row.client.id,'reference',e.target.value)} placeholder="Réf..." style={{...sI,width:120}}/></td>
                <td style={{padding:'7px 8px'}}>{row.error&&<span style={{fontSize:10,color:'var(--c-danger)'}}>⚠ {row.error}</span>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PaiementsPage() {
  const { data: paiements, loading, refetch } = useFetch<Paiement[]>(() => paiementsApi.getAll());
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const [tab, setTab] = useState<'recap'|'saisie'|'groupe'>('recap');
  const [modal, setModal] = useState<{paiement?:Paiement;client?:Client}|null>(null);
  const [search, setSearch] = useState('');

  const paiementsCampagne = useMemo(()=>(paiements||[]).filter(p=>isInCampagne(p.datePaiement)),[paiements,campagneActive]);
  const reservationsCampagne = useMemo(()=>(reservations||[]).filter(r=>isInCampagne((r as any).dateReservation)),[reservations,campagneActive]);
  const totalPaye = paiementsCampagne.reduce((s,p)=>s+Number(p.montant),0);
  const totalReservations = reservationsCampagne.reduce((s,r)=>s+(Number((r as any).nbCaissesBois)||0)*(Number((r as any).prixUnitaireBois)||0)+(Number((r as any).nbCaissesPластique)||0)*(Number((r as any).prixUnitairePlastique)||0)+(Number((r as any).nbCaissesTranger)||0)*(Number((r as any).prixUnitaireTranger)||0),0);
  const resteAPayer = Math.max(0,totalReservations-totalPaye);

  const paiementsParClient = useMemo(()=>{const m:Record<number,Paiement[]>={};paiementsCampagne.forEach(p=>{if(!m[p.client.id])m[p.client.id]=[];m[p.client.id].push(p);});return m;},[paiementsCampagne]);
  const resaParClient = useMemo(()=>{const m:Record<number,number>={};reservationsCampagne.forEach(r=>{const cid=(r as any).client?.id;if(!cid) return;const v=(Number((r as any).nbCaissesBois)||0)*(Number((r as any).prixUnitaireBois)||0)+(Number((r as any).nbCaissesPластique)||0)*(Number((r as any).prixUnitairePlastique)||0)+(Number((r as any).nbCaissesTranger)||0)*(Number((r as any).prixUnitaireTranger)||0);m[cid]=(m[cid]||0)+v;});return m;},[reservationsCampagne]);

  const clientsFiltres = useMemo(()=>(clients||[]).filter(c=>c.nom.toLowerCase().includes(search.toLowerCase())),[clients,search]);

  async function handleDelete(id: number, nom: string) {
    if (!confirm(`Supprimer le paiement de ${nom} ?`)) return;
    try { await paiementsApi.delete(id); toast.success('Supprimé'); refetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message||'Erreur'); }
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner size={36}/></div>;

  const nbSoldes = (clients||[]).filter(c=>{const enc=(paiementsParClient[c.id]||[]).reduce((s,p)=>s+Number(p.montant),0);const resa=resaParClient[c.id]||0;return resa>0&&enc>=resa;}).length;

  return (
    <div className="fade-in">
      <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:14,padding:'18px 22px',marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:14,marginBottom:16}}>
          <div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,margin:0}}>Paiements</h1>
            <div style={{fontSize:11,color:'var(--c-text3)',marginTop:3}}>Campagne {campagneActive}</div>
          </div>
          <button onClick={()=>setModal({})} style={{background:'var(--c-success)',border:'none',color:'#fff',borderRadius:10,padding:'9px 20px',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Nouveau paiement</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[{label:'✓ Total encaissé',val:`${fmt(totalPaye)} Dh`,color:'var(--c-success)'},{label:'≡ Montant réservations',val:`${fmt(totalReservations)} Dh`,color:'var(--c-primary)'},{label:'! Reste à percevoir',val:`${fmt(resteAPayer)} Dh`,color:resteAPayer>0?'var(--c-warning)':'var(--c-success)'}].map(k=>(
            <div key={k.label} style={{background:'var(--c-bg2)',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:9,color:'var(--c-text3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{k.label}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,color:k.color}}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex',gap:4,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:4,width:'fit-content',marginBottom:20}}>
        {[{id:'recap',label:`📊 Récap clients (${nbSoldes} soldés)`},{id:'saisie',label:`💰 Individuel (${paiementsCampagne.length})`},{id:'groupe',label:'⚡ Groupe'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'7px 14px',borderRadius:7,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',background:tab===t.id?'var(--c-primary-glow)':'transparent',color:tab===t.id?'var(--c-primary)':'var(--c-text2)'}}>{t.label}</button>
        ))}
      </div>

      {tab==='recap'&&(
        <>
          <div style={{marginBottom:14}}><input placeholder="🔍 Rechercher client..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 14px',fontSize:13,outline:'none',width:280}}/></div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {clientsFiltres.filter(c=>(resaParClient[c.id]||0)>0||(paiementsParClient[c.id]||[]).length>0).length===0&&(
              <div style={{padding:40,textAlign:'center',color:'var(--c-text3)',background:'var(--c-surface)',borderRadius:12,border:'1px solid var(--c-border)'}}>Aucun paiement pour la campagne {campagneActive}</div>
            )}
            {clientsFiltres.filter(c=>(resaParClient[c.id]||0)>0||(paiementsParClient[c.id]||[]).length>0).map(client=>(
              <CartePaiement key={client.id} client={client} paiements={paiementsParClient[client.id]||[]} montantResa={resaParClient[client.id]||0} onAdd={c=>setModal({client:c})} onEdit={p=>setModal({paiement:p})} onDelete={handleDelete}/>
            ))}
          </div>
        </>
      )}

      {tab==='saisie'&&(
        <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--c-bg2)'}}>
              {['Date','Client','Total à encaisser','Mode','Référence','Total encaissé','Restant dû',''].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {paiementsCampagne.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucun paiement — <button onClick={()=>setModal({})} style={{color:'var(--c-primary)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Ajouter le premier</button></td></tr>}
              {paiementsCampagne.map((p,i)=>{
                const enc=paiementsCampagne.filter(x=>x.client.id===p.client.id).reduce((s,x)=>s+Number(x.montant),0);
                const resa=resaParClient[p.client.id]||0;
                const rest=Math.max(0,resa-enc);
                const mode=MODES.find(m=>m.value===p.modePaiement);
                return <tr key={p.id} style={{borderBottom:'1px solid var(--c-border)',background:i%2===0?'':'rgba(255,255,255,.01)'}}>
                  <td style={{padding:'11px 14px',fontSize:13}}>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td style={{padding:'11px 14px',fontWeight:600}}>{p.client.nom}</td>
                  <td style={{padding:'11px 14px'}}><strong style={{color:'var(--c-primary)',fontSize:15}}>{resa>0?`${fmt(resa)} Dh`:'—'}</strong></td>
                  <td style={{padding:'11px 14px'}}><span style={{background:`${mode?.color}22`,color:mode?.color,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,border:`1px solid ${mode?.color}44`}}>{mode?.label||p.modePaiement}</span></td>
                  <td style={{padding:'11px 14px',color:'var(--c-text2)',fontSize:12}}>{(p as any).reference||'—'}</td>
                  <td style={{padding:'11px 14px'}}><strong style={{color:'var(--c-success)'}}>{fmt(enc)} Dh</strong></td>
                  <td style={{padding:'11px 14px'}}>{rest>0?<strong style={{color:'var(--c-danger)'}}>{fmt(rest)} Dh</strong>:<span style={{color:'var(--c-success)',fontSize:12,fontWeight:600}}>✓ Soldé</span>}</td>
                  <td style={{padding:'11px 14px'}}><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setModal({paiement:p})} style={{background:'rgba(79,142,247,.12)',border:'1px solid rgba(79,142,247,.25)',color:'var(--c-primary)',borderRadius:6,width:28,height:28,fontSize:13,cursor:'pointer'}}>✏</button>
                    <button onClick={()=>handleDelete(p.id,p.client.nom)} style={{background:'rgba(240,90,90,.12)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,width:28,height:28,fontSize:12,cursor:'pointer'}}>✕</button>
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab==='groupe'&&<TabGroupe clients={clients||[]} onSaved={refetch}/>}

      {modal!==null&&<ModalPaiement paiement={modal.paiement} clientDefaut={modal.client} clients={clients||[]} onClose={()=>setModal(null)} onSaved={()=>{refetch();setModal(null);}}/>}
    </div>
  );
}
