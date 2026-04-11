import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfSorties } from '../../services/pdfService';
import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { sortiesApi, clientsApi, chambresApi, entreesApi, stockApi } from '../../services';
import { PageHeader, Spinner } from '../../components/ui/UI';
import type { Sortie, Client, Chambre } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'bois', label: '🪵 Bois', color: 'var(--c-warning)' },
  { value: 'plastique', label: '🧴 Plastique', color: 'var(--c-primary)' },
  { value: 'tranger', label: '📦 Tranger', color: 'var(--c-accent)' },
];
function typeLabel(t: string) { return TYPES.find(x => x.value === t)?.label || t; }
function typeColor(t: string) { return TYPES.find(x => x.value === t)?.color || 'var(--c-text2)'; }

// ── Formulaire sortie intelligent par étapes ──────────
function NewSortieRow({ clients, entrees, sorties, onSaved, onCancel }: {
  clients: Client[]; entrees: any[]; sorties: any[];
  onSaved: () => void; onCancel: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [clientId, setClientId] = useState('');
  const [chambreId, setChambreId] = useState('');
  const [date, setDate] = useState(today);
  const [typeCaisse, setTypeCaisse] = useState('');
  const [nbCaisses, setNbCaisses] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  // Stock de ce client par chambre et par type
  const stockParChambre = useMemo(() => {
    if (!clientId) return [];
    const cid = parseInt(clientId);
    const map: Record<number, { chambreId: number; chambreNom: string; bois: number; plastique: number; tranger: number }> = {};
    entrees.filter((e: any) => e.client?.id === cid).forEach((e: any) => {
      const chid = e.chambre?.id; const chnom = e.chambre?.nom || '?';
      if (!chid) return;
      if (!map[chid]) map[chid] = { chambreId: chid, chambreNom: chnom, bois: 0, plastique: 0, tranger: 0 };
      const t = (e.typeCaisse || 'bois') as string;
      (map[chid] as any)[t] += e.nbCaisses;
    });
    sorties.filter((s: any) => s.client?.id === cid).forEach((s: any) => {
      const chid = s.chambre?.id;
      if (!chid || !map[chid]) return;
      const t = (s.typeCaisse || 'bois') as string;
      (map[chid] as any)[t] = Math.max(0, (map[chid] as any)[t] - s.nbCaisses);
    });
    return Object.values(map).filter(c => c.bois + c.plastique + c.tranger > 0);
  }, [clientId, entrees, sorties]);

  const ch = stockParChambre.find(c => String(c.chambreId) === chambreId);
  const stockType = ch ? (ch as any)[typeCaisse] || 0 : 0;
  const nb = parseInt(nbCaisses) || 0;
  const depasse = nb > stockType && typeCaisse !== '' && nb > 0;

  function handleClientChange(cid: string) { setClientId(cid); setChambreId(''); setTypeCaisse(''); setNbCaisses(''); }
  function handleChambreChange(chid: string) { setChambreId(chid); setTypeCaisse(''); setNbCaisses(''); }
  function handleTypeChange(t: string) {
    setTypeCaisse(t);
    const dispo = ch ? (ch as any)[t] || 0 : 0;
    setNbCaisses(dispo > 0 ? String(dispo) : '');
  }

  async function handleSave() {
    if (!clientId || !chambreId || !typeCaisse || !nbCaisses) return toast.error('Tous les champs sont requis');
    if (depasse) return toast.error(`Stock insuffisant ! Max: ${stockType}`);
    setSaving(true);
    try {
      await sortiesApi.create({ clientId: parseInt(clientId), chambreId: parseInt(chambreId), dateSortie: date, nbCaisses: nb, typeCaisse, reference: reference || undefined });
      toast.success('Sortie enregistrée'); onSaved();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  const stepStyle = { fontSize: 11, color: 'var(--c-text3)', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '.5px', marginBottom: 8 };

  return (
    <div style={{ background: 'var(--c-surface)', border: '2px solid rgba(245,166,35,.3)', borderRadius: 14, padding: 22, marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-warning)', marginBottom: 20 }}>📝 Nouvelle sortie — Saisie guidée</div>

      {/* Étape 1 — Client */}
      <div style={{ marginBottom: 18 }}>
        <div style={stepStyle}>① Client *</div>
        <select value={clientId} onChange={e => handleClientChange(e.target.value)}
          style={{ background: '#161d35', border: `1px solid ${clientId ? 'var(--c-success)' : 'rgba(79,142,247,.3)'}`, borderRadius: 8, color: clientId ? '#e8edf8' : '#5a6f94', padding: '9px 14px', fontSize: 13, minWidth: 300, outline: 'none' }}>
          <option value="">-- Sélectionner un client --</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        {clientId && stockParChambre.length === 0 && (
          <div style={{ marginTop: 8, background: 'rgba(240,90,90,.08)', border: '1px solid rgba(240,90,90,.2)', borderRadius: 8, padding: '10px 14px', color: 'var(--c-danger)', fontSize: 13 }}>
            ⚠ Ce client n'a aucun stock dans les chambres
          </div>
        )}
      </div>

      {/* Étape 2 — Chambres du client */}
      {clientId && stockParChambre.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={stepStyle}>② Chambre — Cliquer sur la chambre souhaitée</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stockParChambre.map(c => (
              <div key={c.chambreId} onClick={() => handleChambreChange(String(c.chambreId))}
                style={{ background: chambreId === String(c.chambreId) ? 'rgba(245,166,35,.1)' : 'var(--c-bg2)', border: `2px solid ${chambreId === String(c.chambreId) ? 'var(--c-warning)' : 'var(--c-border)'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all .15s', minWidth: 155 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: chambreId === String(c.chambreId) ? 'var(--c-warning)' : 'var(--c-text)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>❄ {c.chambreNom}</span>
                  {chambreId === String(c.chambreId) && <span style={{ color: 'var(--c-warning)' }}>✓</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {c.bois > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--c-warning)' }}>🪵 Bois</span>
                    <strong style={{ color: 'var(--c-warning)' }}>{c.bois}</strong>
                  </div>}
                  {c.plastique > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--c-primary)' }}>🧴 Plastique</span>
                    <strong style={{ color: 'var(--c-primary)' }}>{c.plastique}</strong>
                  </div>}
                  {c.tranger > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--c-accent)' }}>📦 Tranger</span>
                    <strong style={{ color: 'var(--c-accent)' }}>{c.tranger}</strong>
                  </div>}
                  <div style={{ borderTop: '1px solid var(--c-border)', marginTop: 4, paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--c-text3)' }}>Total</span>
                    <strong>{c.bois + c.plastique + c.tranger}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Étape 3 — Type */}
      {chambreId && ch && (
        <div style={{ marginBottom: 18 }}>
          <div style={stepStyle}>③ Type de caisse *</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { value: 'bois', label: '🪵 Bois', color: 'var(--c-warning)', dispo: ch.bois },
              { value: 'plastique', label: '🧴 Plastique', color: 'var(--c-primary)', dispo: ch.plastique },
              { value: 'tranger', label: '📦 Tranger', color: 'var(--c-accent)', dispo: ch.tranger },
            ].filter(t => t.dispo > 0).map(t => (
              <div key={t.value} onClick={() => handleTypeChange(t.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 10, border: `2px solid ${typeCaisse === t.value ? t.color : 'var(--c-border)'}`, background: typeCaisse === t.value ? `${t.color}18` : 'var(--c-bg2)', cursor: 'pointer', transition: 'all .15s' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: t.color, lineHeight: 1.1 }}>{t.dispo}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>disponibles</div>
                </div>
                {typeCaisse === t.value && <span style={{ fontSize: 20, color: t.color }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Étape 4 — Quantité + infos */}
      {typeCaisse && (
        <div style={{ marginBottom: 18 }}>
          <div style={stepStyle}>④ Quantité, date et référence</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Nb caisses */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 5 }}>Nb caisses * (max: {stockType})</div>
              <input type="number" min="1" max={stockType} value={nbCaisses}
                onChange={e => setNbCaisses(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
                autoFocus
                style={{ background: '#161d35', border: `2px solid ${depasse ? 'var(--c-danger)' : nb > 0 && nb <= stockType ? 'var(--c-success)' : 'rgba(245,166,35,.4)'}`, borderRadius: 10, color: depasse ? 'var(--c-danger)' : '#e8edf8', padding: '10px 14px', fontSize: 24, fontWeight: 800, width: 140, outline: 'none', textAlign: 'center' }} />
              {depasse && <div style={{ fontSize: 11, color: 'var(--c-danger)', marginTop: 3 }}>⚠ Dépasse le stock ({stockType})</div>}
            </div>

            {/* Résumé après sortie */}
            {nb > 0 && !depasse && (
              <div style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '10px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 6 }}>Après cette sortie</div>
                <div style={{ fontSize: 13, color: 'var(--c-warning)' }}>Sortie : <strong style={{ fontSize: 18 }}>-{nb}</strong></div>
                <div style={{ fontSize: 13, color: 'var(--c-success)', marginTop: 4 }}>Restant : <strong style={{ fontSize: 18 }}>{stockType - nb}</strong></div>
              </div>
            )}

            {/* Date */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 5 }}>Date *</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
            </div>

            {/* Référence */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 5 }}>Référence</div>
              <input type="text" value={reference} placeholder="BL-2026-001"
                onChange={e => setReference(e.target.value)}
                style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none' }} />
            </div>
          </div>
        </div>
      )}

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={handleSave} disabled={saving || depasse || !clientId || !chambreId || !typeCaisse || !nbCaisses}
          style={{ background: !depasse && clientId && chambreId && typeCaisse && nbCaisses ? 'var(--c-warning)' : 'var(--c-surface2)', border: 'none', color: !depasse && clientId && chambreId && typeCaisse && nbCaisses ? '#fff' : 'var(--c-text3)', borderRadius: 10, padding: '11px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>
          {saving ? '...' : '✓ Enregistrer la sortie'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 10, padding: '11px 18px', fontSize: 13, cursor: 'pointer' }}>
          ✕ Annuler
        </button>
        {clientId && !chambreId && stockParChambre.length > 0 && <span style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic' }}>← Cliquer sur une chambre</span>}
        {chambreId && !typeCaisse && <span style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic' }}>← Sélectionner un type</span>}
        {typeCaisse && !nbCaisses && <span style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic' }}>← Saisir le nombre</span>}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────
export default function SortiesPage() {
  const { data: sorties, loading, refetch: refetchSorties } = useFetch<Sortie[]>(() => sortiesApi.getAll());
  const { data: entrees } = useFetch<any[]>(() => entreesApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll());
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const { data: stockClients } = useFetch<any[]>(() => stockApi.getParClient());

  const [tab, setTab] = useState<'online' | 'groupe' | 'historique'>('online');
  const [showNew, setShowNew] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterChambre, setFilterChambre] = useState('');

  // Groupe
  const [chambreGroupe, setChambreGroupe] = useState('');
  const [dateGroupe, setDateGroupe] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [savingGroupe, setSavingGroupe] = useState(false);
  const [progression, setProgression] = useState<{done:number;total:number}|null>(null);

  interface SortieRow { client: Client; bois: string; plastique: string; tranger: string; selected: boolean; done: boolean; error: string; stockDispo: number; }
  const rowsGroupe = useMemo<SortieRow[]>(() => {
    if (!stockClients || !chambreGroupe || !clients) return [];
    const chid = parseInt(chambreGroupe);
    return stockClients.filter(sc => sc.parChambre[chid] && sc.parChambre[chid].stock > 0).map(sc => {
      const client = clients.find(c => c.id === sc.clientId);
      if (!client) return null;
      const stock = sc.parChambre[chid].stock;
      return { client, bois: String(stock), plastique: '0', tranger: '0', selected: false, done: false, error: '', stockDispo: stock };
    }).filter(Boolean) as SortieRow[];
  }, [stockClients, chambreGroupe, clients]);

  const [rowsState, setRowsState] = useState<SortieRow[]>([]);
  const [groupeKey, setGroupeKey] = useState('');
  if (chambreGroupe && chambreGroupe !== groupeKey && rowsGroupe.length > 0) { setRowsState(rowsGroupe); setGroupeKey(chambreGroupe); }

  function upd(cid: number, f: keyof SortieRow, v: any) { setRowsState(p => p.map(r => r.client.id === cid ? {...r, [f]: v} : r)); }
  function tog(cid: number) { setRowsState(p => p.map(r => r.client.id === cid ? {...r, selected: !r.selected} : r)); }
  function selAll(v: boolean) { setRowsState(p => p.map(r => r.done ? r : {...r, selected: v})); }

  const selectes = rowsState.filter(r => r.selected && !r.done);
  const totalGroupe = selectes.reduce((s,r) => s+(parseInt(r.bois)||0)+(parseInt(r.plastique)||0)+(parseInt(r.tranger)||0), 0);
  const chambreInfo = (chambres||[]).find(c => String(c.id) === chambreGroupe);

  async function sortirGroupe() {
    if (!chambreGroupe || selectes.length === 0) return toast.error('Sélectionner chambre et clients');
    if (chambreInfo && totalGroupe > chambreInfo.stockActuel) return toast.error(`Stock insuffisant !`);
    setSavingGroupe(true); setProgression({done:0,total:selectes.length});
    let ok=0; let err=0;
    for (let i=0; i<selectes.length; i++) {
      const row = selectes[i];
      try {
        const ops=[];
        if (parseInt(row.bois)>0) ops.push(sortiesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateSortie:dateGroupe,nbCaisses:parseInt(row.bois),typeCaisse:'bois'}));
        if (parseInt(row.plastique)>0) ops.push(sortiesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateSortie:dateGroupe,nbCaisses:parseInt(row.plastique),typeCaisse:'plastique'}));
        if (parseInt(row.tranger)>0) ops.push(sortiesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateSortie:dateGroupe,nbCaisses:parseInt(row.tranger),typeCaisse:'tranger'}));
        if (ops.length===0) throw new Error('0 caisse');
        await Promise.all(ops); upd(row.client.id,'done',true); ok++;
      } catch(e:any) { upd(row.client.id,'error',e?.response?.data?.message||e.message); err++; }
      setProgression({done:i+1,total:selectes.length});
    }
    setSavingGroupe(false); setProgression(null);
    refetchSorties(); refetchChambres(); setGroupeKey('');
    if (err===0) toast.success(`✓ ${ok} sortie(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const filteredSorties = (sorties||[]).filter(s => {
    const mc = filterClient ? s.client.id===parseInt(filterClient) : true;
    const mt = filterType ? (s as any).typeCaisse===filterType : true;
    const mch = filterChambre ? s.chambre?.id===parseInt(filterChambre) : true;
    return mc && mt && mch;
  });

  const ns = {background:'#161d35',border:'1px solid rgba(79,142,247,.3)',borderRadius:6,color:'#e8edf8',padding:'5px 0',fontSize:13,width:70,outline:'none',textAlign:'center' as const};

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner size={36}/></div>;

  return (
    <div className="fade-in">
      <PageHeader title="Sorties" subtitle={`${(sorties||[]).length} sortie(s) enregistrée(s)`} />

      <div style={{display:'flex',gap:4,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:4,width:'fit-content',marginBottom:22}}>
        {[{id:'online',label:'📝 Sortie quotidienne'},{id:'groupe',label:'🏭 Sortie groupe'},{id:'historique',label:`📋 Historique (${(sorties||[]).length})`}].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{padding:'7px 16px',borderRadius:7,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',background:tab===t.id?'var(--c-primary-glow)':'transparent',color:tab===t.id?'var(--c-primary)':'var(--c-text2)',transition:'all .15s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SORTIE QUOTIDIENNE ══ */}
      {tab === 'online' && (
        <>
          <div style={{marginBottom:14}}>
            <button onClick={()=>setShowNew(!showNew)}
              style={{background:showNew?'rgba(240,90,90,.15)':'var(--c-warning)',border:'none',color:showNew?'var(--c-danger)':'#fff',borderRadius:10,padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all .15s'}}>
              {showNew ? '✕ Annuler' : '+ Nouvelle sortie'}
            </button>
          </div>

          {showNew && (
            <NewSortieRow clients={clients||[]} entrees={entrees||[]} sorties={sorties||[]}
              onSaved={()=>{setShowNew(false);refetchSorties();refetchChambres();}}
              onCancel={()=>setShowNew(false)} />
          )}

          <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Tous les clients</option>
              {clients?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filterChambre} onChange={e=>setFilterChambre(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Toutes les chambres</option>
              {chambres?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Tous les types</option>
              {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {(filterClient||filterChambre||filterType) && <button onClick={()=>{setFilterClient('');setFilterChambre('');setFilterType('');}} style={{background:'none',border:'1px solid var(--c-border)',color:'var(--c-text3)',borderRadius:8,padding:'6px 12px',fontSize:12,cursor:'pointer'}}>✕</button>}
          </div>

          <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'var(--c-bg2)'}}>
                  {['Date','Client','Chambre','Type','Caisses','Référence',''].map(h=>(
                    <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorties.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucune sortie</td></tr>}
                {filteredSorties.map((s,i)=>(
                  <tr key={s.id} style={{borderBottom:'1px solid var(--c-border)',background:i%2===0?'':'rgba(255,255,255,.01)'}}>
                    <td style={{padding:'10px 12px',fontSize:13}}>{format(new Date(s.dateSortie),'dd/MM/yyyy')}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{s.client.nom}</td>
                    <td style={{padding:'10px 12px'}}><span style={{background:'var(--c-primary-glow)',color:'var(--c-primary)',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{s.chambre?.nom||'—'}</span></td>
                    <td style={{padding:'10px 12px'}}><span style={{color:typeColor((s as any).typeCaisse||'bois'),fontWeight:600}}>{typeLabel((s as any).typeCaisse||'bois')}</span></td>
                    <td style={{padding:'10px 12px'}}><strong style={{color:'var(--c-warning)',fontSize:15}}>-{s.nbCaisses}</strong></td>
                    <td style={{padding:'10px 12px',color:'var(--c-text2)',fontSize:12}}>{s.reference||'—'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <button onClick={async()=>{if(!confirm('Annuler ?')) return; try{await sortiesApi.delete(s.id);toast.success('Annulée');refetchSorties();refetchChambres();}catch(e:any){toast.error(e?.response?.data?.message||'Erreur');}}}
                        style={{background:'rgba(240,90,90,.12)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,width:28,height:28,fontSize:12,cursor:'pointer'}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ SORTIE GROUPE ══ */}
      {tab === 'groupe' && (
        <>
          <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border2)',borderRadius:12,padding:'16px 20px',marginBottom:16,display:'flex',gap:16,alignItems:'flex-end',flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:11,color:'var(--c-text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Chambre source</div>
              <select value={chambreGroupe} onChange={e=>{setChambreGroupe(e.target.value);setGroupeKey('');}}
                style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 14px',fontSize:13,outline:'none',minWidth:220}}>
                <option value="">-- Choisir --</option>
                {(chambres||[]).map(c=><option key={c.id} value={c.id}>❄ {c.nom} — {c.stockActuel} caisses</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:'var(--c-text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Date</div>
              <input type="date" value={dateGroupe} onChange={e=>setDateGroupe(e.target.value)}
                style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}} />
            </div>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:11,color:'var(--c-text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Rechercher</div>
              <input placeholder="🔍 Client..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:8,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none',width:'100%'}} />
            </div>
            <button onClick={sortirGroupe} disabled={selectes.length===0||savingGroupe||!chambreGroupe}
              style={{background:selectes.length>0?'var(--c-warning)':'var(--c-surface2)',border:'none',color:selectes.length>0?'#fff':'var(--c-text3)',borderRadius:10,padding:'10px 22px',fontSize:14,fontWeight:700,cursor:selectes.length>0?'pointer':'not-allowed',whiteSpace:'nowrap'}}>
              {savingGroupe?`Sortie... ${progression?.done}/${progression?.total}`:`⬆ Sortir (${selectes.length})`}
            </button>
          </div>

          {chambreGroupe && chambreInfo && (
            <div style={{background:'rgba(245,166,35,.06)',border:'1px solid rgba(245,166,35,.25)',borderRadius:10,padding:'12px 18px',marginBottom:14,display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
              <strong>❄ {chambreInfo.nom}</strong>
              <span style={{fontSize:12,color:'var(--c-text2)'}}>Stock : <strong style={{color:'var(--c-warning)'}}>{chambreInfo.stockActuel}</strong></span>
              <span style={{fontSize:12,color:'var(--c-text2)'}}>Sortie prévue : <strong>{totalGroupe}</strong></span>
              <span style={{fontSize:12,color:'var(--c-text2)'}}>Restant : <strong style={{color:'var(--c-success)'}}>{chambreInfo.stockActuel-totalGroupe}</strong></span>
            </div>
          )}

          {progression && (
            <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:12,marginBottom:12}}>
              <div style={{fontSize:12,color:'var(--c-text2)',marginBottom:6}}>Sortie... {progression.done}/{progression.total}</div>
              <div style={{background:'var(--c-bg2)',borderRadius:20,height:8,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:20,background:'var(--c-warning)',width:`${(progression.done/progression.total)*100}%`,transition:'width .2s'}} />
              </div>
            </div>
          )}

          {!chambreGroupe ? (
            <div style={{textAlign:'center',padding:60,color:'var(--c-text3)'}}>
              <div style={{fontSize:40,marginBottom:12}}>❄</div>
              <div>Sélectionner une chambre pour voir les clients stockés</div>
            </div>
          ) : rowsState.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:'var(--c-text3)'}}>Chambre vide</div>
          ) : (
            <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                <thead>
                  <tr style={{background:'var(--c-bg2)'}}>
                    <th style={{padding:'10px 10px',borderBottom:'1px solid var(--c-border)',width:36}}>
                      <input type="checkbox" checked={rowsState.filter(r=>!r.done).every(r=>r.selected)} onChange={e=>selAll(e.target.checked)} style={{width:15,height:15,cursor:'pointer',accentColor:'var(--c-warning)'}} />
                    </th>
                    {['Client','Stock dispo','🪵 Bois','🧴 Plastique','📦 Tranger','Total',''].map(h=>(
                      <th key={h} style={{padding:'10px 8px',textAlign:h==='Client'||h==='Stock dispo'?'left':'center',fontSize:10,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.4px',borderBottom:'1px solid var(--c-border)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsState.filter(r=>r.client.nom.toLowerCase().includes(search.toLowerCase())).map(row=>{
                    const total=(parseInt(row.bois)||0)+(parseInt(row.plastique)||0)+(parseInt(row.tranger)||0);
                    if(row.done) return <tr key={row.client.id} style={{background:'rgba(46,207,138,.04)',borderBottom:'1px solid var(--c-border)'}}>
                      <td style={{padding:'10px 10px'}}>✅</td><td style={{padding:'10px',fontWeight:600,color:'var(--c-success)'}}>{row.client.nom}</td>
                      <td colSpan={5} style={{padding:'10px',color:'var(--c-text3)',fontSize:12,fontStyle:'italic'}}>Sorti</td>
                      <td style={{padding:'10px'}}><button onClick={()=>upd(row.client.id,'done',false)} style={{background:'rgba(79,142,247,.1)',border:'1px solid rgba(79,142,247,.25)',color:'var(--c-primary)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>↩</button></td>
                    </tr>;
                    if(row.error) return <tr key={row.client.id} style={{background:'rgba(240,90,90,.04)',borderBottom:'1px solid var(--c-border)'}}>
                      <td style={{padding:'10px 10px'}}>❌</td><td style={{padding:'10px',fontWeight:600,color:'var(--c-danger)'}}>{row.client.nom}</td>
                      <td colSpan={5} style={{padding:'10px',color:'var(--c-danger)',fontSize:12}}>{row.error}</td>
                      <td style={{padding:'10px'}}><button onClick={()=>upd(row.client.id,'error','')} style={{background:'rgba(240,90,90,.1)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>↩</button></td>
                    </tr>;
                    return (
                      <tr key={row.client.id} style={{borderBottom:'1px solid var(--c-border)',background:row.selected?'rgba(245,166,35,.05)':''}}>
                        <td style={{padding:'7px 10px'}} onClick={()=>tog(row.client.id)}><input type="checkbox" checked={row.selected} onChange={()=>tog(row.client.id)} style={{width:15,height:15,cursor:'pointer',accentColor:'var(--c-warning)'}}/></td>
                        <td style={{padding:'7px 8px',fontWeight:600,fontSize:13,cursor:'pointer'}} onClick={()=>tog(row.client.id)}>{row.client.nom}</td>
                        <td style={{padding:'7px 8px'}}><span style={{background:'rgba(245,166,35,.1)',color:'var(--c-warning)',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>{row.stockDispo}</span></td>
                        <td style={{padding:'5px 4px',textAlign:'center'}}><input type="number" min="0" value={row.bois} onChange={e=>upd(row.client.id,'bois',e.target.value)} style={{...ns,border:'1px solid rgba(245,166,35,.4)'}}/></td>
                        <td style={{padding:'5px 4px',textAlign:'center'}}><input type="number" min="0" value={row.plastique} onChange={e=>upd(row.client.id,'plastique',e.target.value)} style={{...ns,border:'1px solid rgba(79,142,247,.4)'}}/></td>
                        <td style={{padding:'5px 4px',textAlign:'center'}}><input type="number" min="0" value={row.tranger} onChange={e=>upd(row.client.id,'tranger',e.target.value)} style={{...ns,border:'1px solid rgba(0,212,180,.4)'}}/></td>
                        <td style={{padding:'7px 8px',textAlign:'center'}}><strong style={{color:total>0?'var(--c-warning)':'var(--c-text3)',fontSize:14}}>{total}</strong></td>
                        <td style={{padding:'7px 8px'}}>
                          <button onClick={async()=>{
                            if(total===0) return;
                            try{
                              const ops=[];
                              if(parseInt(row.bois)>0) ops.push(sortiesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateSortie:dateGroupe,nbCaisses:parseInt(row.bois),typeCaisse:'bois'}));
                              if(parseInt(row.plastique)>0) ops.push(sortiesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateSortie:dateGroupe,nbCaisses:parseInt(row.plastique),typeCaisse:'plastique'}));
                              if(parseInt(row.tranger)>0) ops.push(sortiesApi.create({clientId:row.client.id,chambreId:parseInt(chambreGroupe),dateSortie:dateGroupe,nbCaisses:parseInt(row.tranger),typeCaisse:'tranger'}));
                              await Promise.all(ops); upd(row.client.id,'done',true);
                              toast.success(`✓ ${row.client.nom}`); refetchSorties(); refetchChambres();
                            }catch(e:any){toast.error(e?.response?.data?.message||'Erreur');}
                          }} disabled={total===0}
                            style={{background:total>0?'rgba(245,166,35,.15)':'var(--c-surface2)',border:`1px solid ${total>0?'rgba(245,166,35,.3)':'var(--c-border)'}`,color:total>0?'var(--c-warning)':'var(--c-text3)',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:600,cursor:total>0?'pointer':'not-allowed',whiteSpace:'nowrap'}}>
                            ↑ Sortir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══ HISTORIQUE ══ */}
      {tab === 'historique' && (
        <>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Tous les clients</option>{clients?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filterChambre} onChange={e=>setFilterChambre(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Toutes chambres</option>{chambres?.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{background:'var(--c-bg2)',border:'1px solid var(--c-border2)',borderRadius:10,color:'var(--c-text)',padding:'8px 12px',fontSize:13,outline:'none'}}>
              <option value="">Tous types</option>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div style={{marginLeft:'auto'}}>
              <BtnPdf onClick={() => pdfSorties(filteredSorties)} label="⬇ Exporter PDF" disabled={filteredSorties.length===0} />
            </div>
          </div>
          <div style={{overflowX:'auto',border:'1px solid var(--c-border)',borderRadius:10}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'var(--c-bg2)'}}>
                  {['Date','Client','Chambre','Type','Caisses','Référence',''].map(h=>(
                    <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--c-text2)',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid var(--c-border)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorties.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'var(--c-text3)'}}>Aucune sortie</td></tr>}
                {filteredSorties.map((s,i)=>(
                  <tr key={s.id} style={{borderBottom:'1px solid var(--c-border)',background:i%2===0?'':'rgba(255,255,255,.01)'}}>
                    <td style={{padding:'10px 14px',fontSize:13}}>{format(new Date(s.dateSortie),'dd/MM/yyyy')}</td>
                    <td style={{padding:'10px 14px',fontWeight:600}}>{s.client.nom}</td>
                    <td style={{padding:'10px 14px'}}><span style={{background:'var(--c-primary-glow)',color:'var(--c-primary)',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>{s.chambre?.nom||'—'}</span></td>
                    <td style={{padding:'10px 14px'}}><span style={{color:typeColor((s as any).typeCaisse||'bois'),fontWeight:600}}>{typeLabel((s as any).typeCaisse||'bois')}</span></td>
                    <td style={{padding:'10px 14px'}}><strong style={{color:'var(--c-warning)',fontSize:15}}>-{s.nbCaisses}</strong></td>
                    <td style={{padding:'10px 14px',color:'var(--c-text2)',fontSize:12}}>{s.reference||'—'}</td>
                    <td style={{padding:'10px 14px'}}>
                      <button onClick={async()=>{if(!confirm('Annuler ?')) return; try{await sortiesApi.delete(s.id);toast.success('Annulée');refetchSorties();refetchChambres();}catch(e:any){toast.error(e?.response?.data?.message||'Erreur');}}}
                        style={{background:'rgba(240,90,90,.12)',border:'1px solid rgba(240,90,90,.25)',color:'var(--c-danger)',borderRadius:6,width:28,height:28,fontSize:12,cursor:'pointer'}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
