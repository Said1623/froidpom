import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfEntrees } from '../../services/pdfService';
import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { entreesApi, clientsApi, chambresApi, reservationsApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import type { Entree, Client, Chambre, Reservation } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const TYPES = [
  { value: 'bois',      label: '🪵 Bois',      color: 'var(--c-warning)' },
  { value: 'plastique', label: '🧴 Plastique',  color: 'var(--c-primary)' },
  { value: 'tranger',   label: '📦 Tranger',    color: 'var(--c-accent)'  },
];
function typeLabel(t: string) { return TYPES.find(x => x.value === t)?.label || t; }
function typeColor(t: string) { return TYPES.find(x => x.value === t)?.color || 'var(--c-text2)'; }

interface ClientRow {
  client: Client;
  bois: string; plastique: string; tranger: string;
  dejaB: number; dejaP: number; dejaT: number;
  resaB: number; resaP: number; resaT: number;
  selected: boolean; done: boolean; error: string;
}

export default function EntreesPage() {
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: entrees, loading, refetch: refetchEntrees } = useFetch<Entree[]>(() => entreesApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());

  const [tab, setTab] = useState<'affectation'|'historique'>('affectation');
  const [chambreGroupe, setChambreGroupe] = useState('');
  const [dateGroupe, setDateGroupe] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [affectationEnCours, setAffectationEnCours] = useState(false);
  const [progression, setProgression] = useState<{done:number;total:number}|null>(null);

  const rows = useMemo<ClientRow[]>(() => {
    if (!clients || !reservations || !entrees) return [];
    const resaMap: Record<number, Reservation> = {};
    reservations.filter(r => isInCampagne((r as any).dateReservation)).forEach(r => { resaMap[r.client.id] = r; });
    return clients.filter(c => resaMap[c.id]).map(client => {
      const resa = resaMap[client.id];
      const dejaB = entrees.filter(e => e.client.id===client.id&&(e as any).typeCaisse==='bois').reduce((s,e)=>s+e.nbCaisses,0);
      const dejaP = entrees.filter(e => e.client.id===client.id&&(e as any).typeCaisse==='plastique').reduce((s,e)=>s+e.nbCaisses,0);
      const dejaT = entrees.filter(e => e.client.id===client.id&&(e as any).typeCaisse==='tranger').reduce((s,e)=>s+e.nbCaisses,0);
      const resaB=resa?.nbCaissesBois||0, resaP=(resa as any)?.nbCaissesPластique||0, resaT=(resa as any)?.nbCaissesTranger||0;
      return { client, bois:String(Math.max(0,resaB-dejaB)), plastique:String(Math.max(0,resaP-dejaP)), tranger:String(Math.max(0,resaT-dejaT)), dejaB,dejaP,dejaT,resaB,resaP,resaT, selected:false,done:false,error:'' };
    });
  }, [clients, reservations, entrees]);

  const [rowsState, setRowsState] = useState<ClientRow[]>([]);
  const [initialized, setInitialized] = useState(false);
  if (rows.length>0&&!initialized) { setRowsState(rows); setInitialized(true); if (!chambreGroupe&&chambres&&chambres.length>0) setChambreGroupe(String(chambres[0].id)); }

  function updateRow(clientId: number, field: keyof ClientRow, value: any) { setRowsState(prev=>prev.map(r=>r.client.id===clientId?{...r,[field]:value}:r)); }
  function toggleSelect(clientId: number) { setRowsState(prev=>prev.map(r=>r.client.id===clientId?{...r,selected:!r.selected}:r)); }
  function selectAll(val: boolean) { setRowsState(prev=>prev.map(r=>r.done?r:{...r,selected:val})); }

  const rowsFiltres = rowsState.filter(r=>r.client.nom.toLowerCase().includes(search.toLowerCase()));
  const selectionnes = rowsState.filter(r=>r.selected&&!r.done);
  const totalSelectionne = selectionnes.reduce((s,r)=>s+(parseInt(r.bois)||0)+(parseInt(r.plastique)||0)+(parseInt(r.tranger)||0),0);
  const chambreSelectionnee = (chambres||[]).find(c=>String(c.id)===chambreGroupe);
  const depasse = chambreSelectionnee?totalSelectionne>chambreSelectionnee.disponible:false;
  function refetchAll() { refetchEntrees(); refetchChambres(); setInitialized(false); }

  async function affecterGroupe() {
    if (!chambreGroupe) return toast.error('Sélectionner une chambre');
    if (selectionnes.length===0) return toast.error('Sélectionner au moins un client');
    if (depasse) return toast.error(`Capacité dépassée ! Disponible: ${chambreSelectionnee?.disponible}`);
    for (const row of selectionnes) {
      if ((parseInt(row.bois)||0)>row.resaB-row.dejaB) return toast.error(`${row.client.nom}: 🪵 max ${row.resaB-row.dejaB}`);
      if ((parseInt(row.plastique)||0)>row.resaP-row.dejaP) return toast.error(`${row.client.nom}: 🧴 max ${row.resaP-row.dejaP}`);
      if ((parseInt(row.tranger)||0)>row.resaT-row.dejaT) return toast.error(`${row.client.nom}: 📦 max ${row.resaT-row.dejaT}`);
    }
    setAffectationEnCours(true); setProgression({done:0,total:selectionnes.length});
    let ok=0; let err=0;
    for (let i=0;i<selectionnes.length;i++) {
      const row=selectionnes[i];
      try {
        const ops=[];
        if(parseInt(row.bois)>0) ops.push(entreesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateEntree:dateGroupe,nbCaisses:parseInt(row.bois),typeCaisse:'bois'}));
        if(parseInt(row.plastique)>0) ops.push(entreesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateEntree:dateGroupe,nbCaisses:parseInt(row.plastique),typeCaisse:'plastique'}));
        if(parseInt(row.tranger)>0) ops.push(entreesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateEntree:dateGroupe,nbCaisses:parseInt(row.tranger),typeCaisse:'tranger'}));
        await Promise.all(ops); updateRow(row.client.id,'done',true); updateRow(row.client.id,'selected',false); ok++;
      } catch(e:any) { updateRow(row.client.id,'error',e?.response?.data?.message||'Erreur'); err++; }
      setProgression({done:i+1,total:selectionnes.length});
    }
    setAffectationEnCours(false); setProgression(null); refetchChambres(); refetchEntrees(); setInitialized(false);
    if(err===0) toast.success(`✓ ${ok} client(s) affecté(s)`); else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  async function affecterUn(row: ClientRow) {
    if (!chambreGroupe) return toast.error('Sélectionner une chambre');
    const total=(parseInt(row.bois)||0)+(parseInt(row.plastique)||0)+(parseInt(row.tranger)||0);
    if(total===0) return toast.error('Aucune caisse');
    const ch=(chambres||[]).find(c=>String(c.id)===chambreGroupe);
    if(ch&&total>ch.disponible) return toast.error(`Chambre pleine ! Disponible: ${ch.disponible}`);
    try {
      const ops=[];
      if(parseInt(row.bois)>0) ops.push(entreesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateEntree:dateGroupe,nbCaisses:parseInt(row.bois),typeCaisse:'bois'}));
      if(parseInt(row.plastique)>0) ops.push(entreesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateEntree:dateGroupe,nbCaisses:parseInt(row.plastique),typeCaisse:'plastique'}));
      if(parseInt(row.tranger)>0) ops.push(entreesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateEntree:dateGroupe,nbCaisses:parseInt(row.tranger),typeCaisse:'tranger'}));
      await Promise.all(ops); updateRow(row.client.id,'done',true);
      toast.success(`✓ ${row.client.nom} — ${total} caisses`); refetchChambres(); refetchEntrees(); setInitialized(false);
    } catch(e:any) { toast.error(e?.response?.data?.message||'Erreur'); }
  }

  const filteredEntrees = (entrees||[]).filter(e=>{
    const mc=filterClient?e.client.id===parseInt(filterClient):true;
    const mt=filterType?(e as any).typeCaisse===filterType:true;
    return mc&&mt&&isInCampagne(e.dateEntree);
  });

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner size={36}/></div>;
  const allSelected=rowsFiltres.filter(r=>!r.done).every(r=>r.selected);
  const someSelected=selectionnes.length>0;

  const inp=(row:ClientRow,type:'bois'|'plastique'|'tranger')=>{
    const val=row[type]; const deja=type==='bois'?row.dejaB:type==='plastique'?row.dejaP:row.dejaT;
    const resa=type==='bois'?row.resaB:type==='plastique'?row.resaP:row.resaT;
    const color=type==='bois'?'rgba(245,166,35':type==='plastique'?'rgba(79,142,247':'rgba(0,212,180';
    const icon=type==='bois'?'🪵':type==='plastique'?'🧴':'📦';
    if(resa===0) return null;
    return <div style={{display:'flex',alignItems:'center',gap:4}}>
      <span style={{fontSize:11,color:typeColor(type)}}>{icon}</span>
      <input type="number" min="0" max={resa-deja} value={val} disabled={deja>=resa} onFocus={e=>e.target.select()}
        onChange={e=>updateRow(row.client.id,type,e.target.value)}
        style={{background:deja>=resa?'rgba(46,207,138,.08)':'#161d35',border:`1px solid ${deja>=resa?'rgba(46,207,138,.3)':parseInt(val)>0?`${color},.6)`:`${color},.2)`}`,borderRadius:6,color:deja>=resa?'var(--c-success)':'#e8edf8',padding:'5px 0',fontSize:13,fontWeight:700,width:65,outline:'none',textAlign:'center'}}/>
    </div>;
  };

  return (
    <div className="fade-in">
      <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:14,padding:'18px 22px',marginBottom:20}}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:800,margin:'0 0 4px'}}>Entrées</h1>
        <div style={{fontSize:11,color:'var(--c-text3)'}}>Campagne {campagneActive} — {filteredEntrees.length} entrée(s)</div>
      </div>

      <div style={{display:'flex',gap:4,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:4,width:'fit-content',marginBottom:22}}>
        {[{id:'affectation',label:'⚡ Affectation rapide'},{id:'historique',label:`📋 Historique (${filteredEntrees.length})`}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'7px 20px',borderRadius:7,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',background:tab===t.id?'var(--c-primary-glow)':'transparent',color:tab===t.id?'var(--c-primary)':'var(--c-text2)'}}>{t.label}</button>
        ))}
      </div>

      {tab==='affectation'&&(<>
        <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border2)',borderRadius:12,padding:'16px 20px',marginBottom:16,display:'flex',gap:16,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:11,color:'var(--c-text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Chambre cible</div>
            <select value={chambreGroupe} onChange={e=>setChambreGroupe(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 14px',fontSize:13,outline:'none',minWidth:200}}>
              <option value="">-- Choisir --</option>
              {(chambres||[]).map(c=><option key={c.id} value={c.id}>❄ {c.nom} — {c.disponible} dispo</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--c-text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Date d'entrée</div>
            <input type="date" value={dateGroupe} onChange={e=>setDateGroupe(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}/>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:11,color:'var(--c-text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Rechercher</div>
            <input placeholder="🔍 Nom client..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none',width:'100%'}}/>
          </div>
          <button onClick={affecterGroupe} disabled={!someSelected||affectationEnCours||depasse||!chambreGroupe}
            style={{background:someSelected&&!depasse&&chambreGroupe?'var(--c-success)':'var(--c-surface2)',border:'none',color:someSelected&&!depasse&&chambreGroupe?'#fff':'var(--c-text3)',borderRadius:10,padding:'10px 22px',fontSize:14,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            {affectationEnCours?`⚡ ${progression?.done}/${progression?.total}...`:`⚡ Affecter (${selectionnes.length})`}
          </button>
        </div>

        {someSelected&&<div style={{background:depasse?'rgba(240,90,90,.08)':'rgba(46,207,138,.08)',border:`1px solid ${depasse?'rgba(240,90,90,.3)':'rgba(46,207,138,.3)'}`,borderRadius:10,padding:'12px 18px',marginBottom:14,display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{fontWeight:700,color:depasse?'var(--c-danger)':'var(--c-success)'}}>{depasse?'⚠ CAPACITÉ DÉPASSÉE':'✓ Sélection valide'}</div>
          <div style={{fontSize:12,color:'var(--c-text2)'}}>{selectionnes.length} client(s) · Total : <strong style={{color:depasse?'var(--c-danger)':'var(--c-success)'}}>{totalSelectionne}</strong> caisses</div>
          {chambreSelectionnee&&<div style={{fontSize:12,color:'var(--c-text2)'}}>Dispo : <strong>{chambreSelectionnee.disponible}</strong></div>}
        </div>}

        {progression&&<div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,color:'var(--c-text2)',marginBottom:8}}>Affectation {progression.done}/{progression.total}...</div>
          <div style={{background:'var(--c-bg2)',borderRadius:20,height:8,overflow:'hidden'}}><div style={{height:'100%',borderRadius:20,background:'var(--c-success)',width:`${(progression.done/progression.total)*100}%`,transition:'width .2s'}}/></div>
        </div>}

        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          {(chambres||[]).map(c=>(
            <div key={c.id} onClick={()=>setChambreGroupe(String(c.id))}
              style={{background:chambreGroupe===String(c.id)?'rgba(79,142,247,.1)':'var(--c-surface)',border:`2px solid ${chambreGroupe===String(c.id)?'var(--c-primary)':c.disponible===0?'rgba(240,90,90,.4)':'var(--c-border)'}`,borderRadius:10,padding:'12px 16px',minWidth:140,cursor:'pointer',transition:'all .15s'}}>
              <div style={{fontWeight:700,fontSize:12,marginBottom:5,color:chambreGroupe===String(c.id)?'var(--c-primary)':'var(--c-text)'}}>❄ {c.nom}</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:5}}>
                <span style={{color:'var(--c-text2)'}}>Stock: <strong>{c.stockActuel}</strong></span>
                <span style={{color:c.disponible===0?'var(--c-danger)':'var(--c-success)',fontWeight:700}}>{c.disponible} libre</span>
              </div>
              <div style={{background:'var(--c-bg2)',borderRadius:20,height:4,overflow:'hidden'}}><div style={{height:'100%',borderRadius:20,width:`${c.tauxRemplissage}%`,background:c.tauxRemplissage>85?'var(--c-danger)':'var(--c-primary)'}}/></div>
              {c.disponible===0&&<div style={{fontSize:9,color:'var(--c-danger)',marginTop:3,fontWeight:700}}>⚠ PLEINE</div>}
            </div>
          ))}
        </div>

        <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:12}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
            <thead><tr style={{background:'var(--c-bg2)'}}>
              <th style={{padding:'11px 12px',borderBottom:'1px solid var(--c-border)',width:40}}>
                <input type="checkbox" checked={allSelected} onChange={e=>selectAll(e.target.checked)} style={{width:15,height:15,cursor:'pointer',accentColor:'var(--c-primary)'}}/>
              </th>
              {['Client','Réservation','Déjà en chambre','À affecter','Statut',''].map((h,i)=>(
                <th key={h} style={{padding:'11px 14px',textAlign:i===0?'left':'center',fontSize:10,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)',borderLeft:i>0?'1px solid var(--c-border)':'none'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rowsFiltres.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucun client avec réservation pour cette campagne</td></tr>}
              {rowsFiltres.map(row=>{
                const total=(parseInt(row.bois)||0)+(parseInt(row.plastique)||0)+(parseInt(row.tranger)||0);
                const depasseRow=chambreSelectionnee?total>chambreSelectionnee.disponible:false;
                const toutAffecte=row.resaB===row.dejaB&&row.resaP===row.dejaP&&row.resaT===row.dejaT;
                if(row.done) return <tr key={row.client.id} style={{background:'rgba(46,207,138,.05)',borderBottom:'1px solid var(--c-border)',borderLeft:'3px solid var(--c-success)'}}>
                  <td style={{padding:'12px'}}>✅</td><td style={{padding:'12px 14px',fontWeight:700,color:'var(--c-success)'}}>{row.client.nom}</td>
                  <td colSpan={3} style={{padding:'12px 14px',color:'var(--c-text3)',fontSize:12,fontStyle:'italic',borderLeft:'1px solid var(--c-border)'}}>Affecté — 🪵{row.bois} 🧴{row.plastique}{parseInt(row.tranger)>0?` 📦${row.tranger}`:''}</td>
                  <td colSpan={2} style={{padding:'12px',borderLeft:'1px solid var(--c-border)'}}><button onClick={()=>updateRow(row.client.id,'done',false)} style={{background:'rgba(79,142,247,.1)',border:'1px solid rgba(79,142,247,.25)',color:'var(--c-primary)',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>↩</button></td>
                </tr>;
                if(row.error) return <tr key={row.client.id} style={{background:'rgba(240,90,90,.05)',borderBottom:'1px solid var(--c-border)',borderLeft:'3px solid var(--c-danger)'}}>
                  <td style={{padding:'12px'}}>❌</td><td style={{padding:'12px 14px',fontWeight:700,color:'var(--c-danger)'}}>{row.client.nom}</td>
                  <td colSpan={4} style={{padding:'12px 14px',color:'var(--c-danger)',fontSize:12,borderLeft:'1px solid var(--c-border)'}}>{row.error}</td>
                  <td style={{padding:'12px',borderLeft:'1px solid var(--c-border)'}}><button onClick={()=>updateRow(row.client.id,'error','')} style={{background:'rgba(240,90,90,.1)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>↩</button></td>
                </tr>;
                return <tr key={row.client.id} style={{borderBottom:'1px solid var(--c-border)',background:row.selected?'rgba(79,142,247,.06)':toutAffecte?'rgba(46,207,138,.03)':'',borderLeft:`3px solid ${row.selected?'var(--c-primary)':depasseRow?'var(--c-danger)':'transparent'}`}}>
                  <td style={{padding:'10px 12px'}} onClick={()=>toggleSelect(row.client.id)}><input type="checkbox" checked={row.selected} onChange={()=>toggleSelect(row.client.id)} style={{width:15,height:15,cursor:'pointer',accentColor:'var(--c-primary)'}}/></td>
                  <td style={{padding:'10px 14px',cursor:'pointer'}} onClick={()=>toggleSelect(row.client.id)}><div style={{fontWeight:700,fontSize:13}}>{row.client.nom}</div></td>
                  <td style={{padding:'10px 14px',borderLeft:'1px solid var(--c-border)'}}>
                    <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                      {row.resaB>0&&<span style={{fontSize:12,color:'var(--c-warning)',fontWeight:600}}>🪵 {row.resaB}</span>}
                      {row.resaP>0&&<span style={{fontSize:12,color:'var(--c-primary)',fontWeight:600}}>🧴 {row.resaP}</span>}
                      {row.resaT>0&&<span style={{fontSize:12,color:'var(--c-accent)',fontWeight:600}}>📦 {row.resaT}</span>}
                      {row.resaB===0&&row.resaP===0&&row.resaT===0&&<span style={{color:'var(--c-text3)',fontSize:11}}>—</span>}
                    </div>
                  </td>
                  <td style={{padding:'10px 14px',borderLeft:'1px solid var(--c-border)'}}>
                    <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                      {row.dejaB>0&&<span style={{fontSize:12,color:'var(--c-success)',fontWeight:600}}>🪵 {row.dejaB}</span>}
                      {row.dejaP>0&&<span style={{fontSize:12,color:'var(--c-success)',fontWeight:600}}>🧴 {row.dejaP}</span>}
                      {row.dejaT>0&&<span style={{fontSize:12,color:'var(--c-success)',fontWeight:600}}>📦 {row.dejaT}</span>}
                      {row.dejaB===0&&row.dejaP===0&&row.dejaT===0&&<span style={{color:'var(--c-text3)',fontSize:11}}>—</span>}
                    </div>
                  </td>
                  <td style={{padding:'8px 14px',borderLeft:'1px solid var(--c-border)'}}>
                    <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
                      {(['bois','plastique','tranger'] as const).map(t=>inp(row,t))}
                      {row.resaB===0&&row.resaP===0&&row.resaT===0&&<span style={{color:'var(--c-text3)',fontSize:11}}>—</span>}
                    </div>
                    {((parseInt(row.bois)||0)>row.resaB-row.dejaB||(parseInt(row.plastique)||0)>row.resaP-row.dejaP||(parseInt(row.tranger)||0)>row.resaT-row.dejaT)&&<div style={{textAlign:'center',fontSize:10,color:'var(--c-danger)',marginTop:3,fontWeight:700}}>⚠ Dépasse la réservation</div>}
                  </td>
                  <td style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid var(--c-border)'}}>
                    {toutAffecte?<span style={{fontSize:11,color:'var(--c-success)',fontWeight:600}}>✓ Complet</span>:total>0?<div><span style={{fontSize:13,fontWeight:800,color:depasseRow?'var(--c-danger)':'var(--c-primary)'}}>{total}</span><div style={{fontSize:10,color:'var(--c-text3)'}}>à affecter</div></div>:<span style={{fontSize:11,color:'var(--c-text3)'}}>En attente</span>}
                  </td>
                  <td style={{padding:'8px 12px',borderLeft:'1px solid var(--c-border)'}}>
                    <button onClick={()=>{
                      if((parseInt(row.bois)||0)>row.resaB-row.dejaB) return toast.error(`🪵 max ${row.resaB-row.dejaB}`);
                      if((parseInt(row.plastique)||0)>row.resaP-row.dejaP) return toast.error(`🧴 max ${row.resaP-row.dejaP}`);
                      if((parseInt(row.tranger)||0)>row.resaT-row.dejaT) return toast.error(`📦 max ${row.resaT-row.dejaT}`);
                      affecterUn(row);
                    }} disabled={total===0||!chambreGroupe||depasseRow||toutAffecte}
                      style={{background:total>0&&chambreGroupe&&!depasseRow&&!toutAffecte?'var(--c-primary)':'var(--c-surface2)',border:'none',color:total>0&&chambreGroupe&&!depasseRow&&!toutAffecte?'#fff':'var(--c-text3)',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',width:'100%'}}>
                      {toutAffecte?'✓ Complet':'↓ Affecter'}
                    </button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </>)}

      {tab==='historique'&&(<>
        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
            <option value="">Tous les clients</option>{clients?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
            <option value="">Tous les types</option>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {(filterClient||filterType)&&<button onClick={()=>{setFilterClient('');setFilterType('');}} style={{background:'none',border:'1px solid var(--c-border)',color:'var(--c-text3)',borderRadius:8,padding:'7px 12px',fontSize:12,cursor:'pointer'}}>✕</button>}
          <div style={{marginLeft:'auto'}}><BtnPdf onClick={()=>pdfEntrees(filteredEntrees)} label="⬇ PDF" disabled={filteredEntrees.length===0}/></div>
        </div>

        {filteredEntrees.length>0&&<div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          {TYPES.map(t=>{const nb=filteredEntrees.filter(e=>(e as any).typeCaisse===t.value).reduce((s,e)=>s+e.nbCaisses,0);if(nb===0) return null;return <div key={t.value} style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:'10px 16px',display:'flex',gap:10,alignItems:'center'}}><span style={{fontSize:18}}>{t.label.split(' ')[0]}</span><div><div style={{fontWeight:700,fontSize:18,color:t.color}}>{nb}</div><div style={{fontSize:10,color:'var(--c-text3)'}}>{t.label.split(' ')[1]}</div></div></div>;})}
        </div>}

        <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--c-bg2)'}}>
              {['Date','Client','Chambre','Type','Nb caisses','Référence',''].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredEntrees.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucune entrée pour la campagne {campagneActive}</td></tr>}
              {filteredEntrees.map((e,i)=>(
                <tr key={e.id} style={{borderBottom:'1px solid var(--c-border)',background:i%2===0?'':'rgba(255,255,255,.01)'}}>
                  <td style={{padding:'10px 14px',fontSize:13}}>{format(new Date(e.dateEntree),'dd/MM/yyyy')}</td>
                  <td style={{padding:'10px 14px',fontWeight:600}}>{e.client.nom}</td>
                  <td style={{padding:'10px 14px'}}><span style={{background:'var(--c-primary-glow)',color:'var(--c-primary)',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{e.chambre?.nom}</span></td>
                  <td style={{padding:'10px 14px'}}><span style={{color:typeColor((e as any).typeCaisse||'bois'),fontWeight:600}}>{typeLabel((e as any).typeCaisse||'bois')}</span></td>
                  <td style={{padding:'10px 14px'}}><strong style={{color:'var(--c-success)',fontSize:15}}>+{e.nbCaisses}</strong></td>
                  <td style={{padding:'10px 14px',color:'var(--c-text2)',fontSize:12}}>{e.reference||'—'}</td>
                  <td style={{padding:'10px 14px'}}><button onClick={async()=>{if(!confirm('Annuler ?')) return;try{await entreesApi.delete(e.id);toast.success('Annulée');refetchAll();}catch(err:any){toast.error(err?.response?.data?.message||'Erreur');}}} style={{background:'rgba(240,90,90,.12)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,width:28,height:28,fontSize:12,cursor:'pointer'}}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}
