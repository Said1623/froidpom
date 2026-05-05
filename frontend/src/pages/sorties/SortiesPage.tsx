import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfSorties } from '../../services/pdfService';
import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { sortiesApi, clientsApi, chambresApi, entreesApi, stockApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import type { Sortie, Client, Chambre } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const TYPES = [
  { value: 'bois',      label: '🪵 Bois',      color: '#f5a623' },
  { value: 'plastique', label: '🧴 Plastique',  color: '#4f8ef7' },
  { value: 'tranger',   label: '📦 Tranger',    color: '#00d4b4' },
];
function typeLabel(t: string) { return TYPES.find(x => x.value === t)?.label || t; }
function typeColor(t: string) { return TYPES.find(x => x.value === t)?.color || '#888'; }

// ── Champ numérique stable (hors composant parent) ────
function NumInput({ value, onChange, max, disabled, color }: {
  value: string; onChange: (v: string) => void;
  max: number; disabled?: boolean; color: string;
}) {
  const num = parseInt(value) || 0;
  const over = num > max;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onFocus={e => e.target.select()}
        onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        style={{
          width: 72, textAlign: 'center', padding: '6px 4px',
          background: disabled ? 'rgba(46,207,138,.06)' : '#0e1728',
          border: `2px solid ${over ? '#f05a5a' : num > 0 ? color : 'rgba(255,255,255,.1)'}`,
          borderRadius: 8, color: disabled ? '#2ecf8a' : over ? '#f05a5a' : '#e8edf8',
          fontSize: 14, fontWeight: 700, outline: 'none',
        }}
      />
      {over && <div style={{ fontSize: 9, color: '#f05a5a', fontWeight: 700 }}>max {max}</div>}
    </div>
  );
}

interface SortieRow {
  clientId: number;
  nom: string;
  bois: string; plastique: string; tranger: string;
  stockB: number; stockP: number; stockT: number;
  selected: boolean; done: boolean; error: string;
}

export default function SortiesPage() {
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: sorties, loading, refetch: refetchSorties } = useFetch<Sortie[]>(() => sortiesApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const { data: stockClients } = useFetch<any[]>(() => stockApi.getParClient());

  const [tab, setTab] = useState<'sortie' | 'historique'>('sortie');
  const [chambreId, setChambreId] = useState('');
  const [dateSortie, setDateSortie] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterChambre, setFilterChambre] = useState('');
  const [en_cours, setEnCours] = useState(false);
  const [rows, setRows] = useState<SortieRow[]>([]);
  const [lastChambre, setLastChambre] = useState('');

  // Construire les rows depuis stockClients pour la chambre sélectionnée
  const rowsBase = useMemo<SortieRow[]>(() => {
    if (!stockClients || !chambreId || !clients) return [];
    const chid = parseInt(chambreId);
    return stockClients
      .filter(sc => sc.parChambre?.[chid] && sc.parChambre[chid].stock > 0)
      .map(sc => {
        const client = clients.find(c => c.id === sc.clientId);
        if (!client) return null;
        const ch = sc.parChambre[chid];
        const stockB = ch.bois || 0;
        const stockP = ch.plastique || 0;
        const stockT = ch.tranger || 0;
        return {
          clientId: sc.clientId,
          nom: client.nom,
          bois: String(stockB),
          plastique: String(stockP),
          tranger: String(stockT),
          stockB, stockP, stockT,
          selected: false, done: false, error: '',
        };
      }).filter(Boolean) as SortieRow[];
  }, [stockClients, chambreId, clients]);

  // Reset rows quand la chambre change
  if (chambreId && chambreId !== lastChambre) {
    setRows(rowsBase);
    setLastChambre(chambreId);
  }

  function updateRow(clientId: number, field: keyof SortieRow, value: any) {
    setRows(prev => prev.map(r => r.clientId === clientId ? { ...r, [field]: value } : r));
  }
  function toggleSelect(clientId: number) {
    setRows(prev => prev.map(r => r.clientId === clientId && !r.done ? { ...r, selected: !r.selected } : r));
  }

  const chambre = (chambres || []).find(c => String(c.id) === chambreId);
  const rowsFiltres = rows.filter(r => r.nom.toLowerCase().includes(search.toLowerCase()));
  const selectionnes = rows.filter(r => r.selected && !r.done);

  function isOver(r: SortieRow) {
    return (parseInt(r.bois) || 0) > r.stockB
      || (parseInt(r.plastique) || 0) > r.stockP
      || (parseInt(r.tranger) || 0) > r.stockT;
  }
  function total(r: SortieRow) {
    return (parseInt(r.bois) || 0) + (parseInt(r.plastique) || 0) + (parseInt(r.tranger) || 0);
  }

  const totalSelection = selectionnes.reduce((s, r) => s + total(r), 0);

  function refetchAll() { refetchSorties(); refetchChambres(); setLastChambre(''); }

  async function sortirRow(r: SortieRow) {
    if (!chambreId) return toast.error('Choisir une chambre');
    if (total(r) === 0) return toast.error('Quantité = 0');
    if (isOver(r)) return toast.error('Dépasse le stock disponible');
    try {
      const ops = [];
      if (parseInt(r.bois) > 0) ops.push(sortiesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateSortie, nbCaisses: parseInt(r.bois), typeCaisse: 'bois' }));
      if (parseInt(r.plastique) > 0) ops.push(sortiesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateSortie, nbCaisses: parseInt(r.plastique), typeCaisse: 'plastique' }));
      if (parseInt(r.tranger) > 0) ops.push(sortiesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateSortie, nbCaisses: parseInt(r.tranger), typeCaisse: 'tranger' }));
      await Promise.all(ops);
      updateRow(r.clientId, 'done', true);
      updateRow(r.clientId, 'selected', false);
      toast.success(`✓ ${r.nom} — ${total(r)} caisses`);
      refetchChambres(); refetchSorties(); setLastChambre('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    }
  }

  async function sortirSelection() {
    if (!chambreId) return toast.error('Choisir une chambre');
    if (selectionnes.length === 0) return toast.error('Aucun client sélectionné');
    const over = selectionnes.find(r => isOver(r));
    if (over) return toast.error(`${over.nom} dépasse le stock disponible`);
    setEnCours(true);
    let ok = 0, err = 0;
    for (const r of selectionnes) {
      try {
        const ops = [];
        if (parseInt(r.bois) > 0) ops.push(sortiesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateSortie, nbCaisses: parseInt(r.bois), typeCaisse: 'bois' }));
        if (parseInt(r.plastique) > 0) ops.push(sortiesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateSortie, nbCaisses: parseInt(r.plastique), typeCaisse: 'plastique' }));
        if (parseInt(r.tranger) > 0) ops.push(sortiesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateSortie, nbCaisses: parseInt(r.tranger), typeCaisse: 'tranger' }));
        await Promise.all(ops);
        updateRow(r.clientId, 'done', true);
        updateRow(r.clientId, 'selected', false);
        ok++;
      } catch (e: any) {
        updateRow(r.clientId, 'error', e?.response?.data?.message || 'Erreur');
        err++;
      }
    }
    setEnCours(false);
    refetchChambres(); refetchSorties(); setLastChambre('');
    if (err === 0) toast.success(`✓ ${ok} sortie(s) enregistrée(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const filteredSorties = (sorties || []).filter(s => {
    const mc = filterClient ? s.client.id === parseInt(filterClient) : true;
    const mt = filterType ? (s as any).typeCaisse === filterType : true;
    const mch = filterChambre ? s.chambre?.id === parseInt(filterChambre) : true;
    return mc && mt && mch && isInCampagne(s.dateSortie);
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  const allChecked = rowsFiltres.filter(r => !r.done).length > 0 && rowsFiltres.filter(r => !r.done).every(r => r.selected);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Sorties</h1>
        <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Campagne {campagneActive} — {filteredSorties.length} sortie(s)</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 22 }}>
        {[{ id: 'sortie', label: '⬆ Sortie' }, { id: 'historique', label: `📋 Historique (${filteredSorties.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 20px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'rgba(245,166,35,.15)' : 'transparent', color: tab === t.id ? '#f5a623' : 'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sortie' && (<>

        {/* Barre de contrôle */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Chambres */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Chambre source</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(chambres || []).map(c => (
                <button key={c.id} onClick={() => setChambreId(String(c.id))}
                  style={{
                    background: chambreId === String(c.id) ? 'rgba(245,166,35,.15)' : 'var(--c-bg2)',
                    border: `2px solid ${chambreId === String(c.id) ? '#f5a623' : c.stockActuel === 0 ? 'rgba(240,90,90,.3)' : 'var(--c-border)'}`,
                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: chambreId === String(c.id) ? '#f5a623' : 'var(--c-text)' }}>❄ {c.nom}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: c.stockActuel === 0 ? 'var(--c-danger)' : 'var(--c-warning)', fontWeight: 700 }}>{c.stockActuel} caisses</span>
                    <span style={{ color: 'var(--c-text3)', marginLeft: 6 }}>{c.tauxRemplissage}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Date de sortie</div>
            <input type="date" value={dateSortie} onChange={e => setDateSortie(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
          </div>

          {/* Recherche */}
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Rechercher</div>
            <input placeholder="🔍 Nom client..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }} />
          </div>
        </div>

        {/* Bandeau sélection */}
        {selectionnes.length > 0 && (
          <div style={{ background: 'rgba(245,166,35,.08)', border: '1px solid rgba(245,166,35,.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, color: '#f5a623' }}>⬆ {selectionnes.length} client(s) sélectionné(s)</div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
              Total : <strong style={{ color: '#f5a623' }}>{totalSelection}</strong> caisses à sortir
              {chambre && <span style={{ marginLeft: 12, color: 'var(--c-text3)' }}>/ {chambre.stockActuel} en chambre</span>}
            </div>
            <button onClick={sortirSelection} disabled={en_cours}
              style={{ marginLeft: 'auto', background: '#f5a623', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {en_cours ? '⬆ En cours...' : `⬆ Sortir (${selectionnes.length})`}
            </button>
          </div>
        )}

        {/* Pas de chambre */}
        {!chambreId && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--c-text3)', background: 'var(--c-surface)', borderRadius: 12, border: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❄</div>
            <div>Sélectionner une chambre source</div>
          </div>
        )}

        {/* Chambre vide */}
        {chambreId && rowsFiltres.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--c-text3)', background: 'var(--c-surface)', borderRadius: 12, border: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div>Aucun stock dans cette chambre</div>
          </div>
        )}

        {/* Tableau */}
        {chambreId && rowsFiltres.length > 0 && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: 'var(--c-bg2)' }}>
                  <th style={{ padding: '12px', width: 40, borderBottom: '1px solid var(--c-border)' }}>
                    <input type="checkbox" checked={allChecked}
                      onChange={e => setRows(prev => prev.map(r => r.done ? r : { ...r, selected: e.target.checked }))}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#f5a623' }} />
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>Client</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>🪵 Bois</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>🧴 Plastique</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#00d4b4', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>📦 Tranger</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rowsFiltres.map(r => {
                  const over = isOver(r);
                  const tot = total(r);

                  if (r.done) return (
                    <tr key={r.clientId} style={{ borderBottom: '1px solid var(--c-border)', background: 'rgba(46,207,138,.04)', borderLeft: '3px solid var(--c-success)' }}>
                      <td style={{ padding: 12 }}>✅</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--c-success)' }}>{r.nom}</td>
                      <td colSpan={3} style={{ padding: '12px 14px', color: 'var(--c-text3)', fontSize: 12, fontStyle: 'italic', borderLeft: '1px solid var(--c-border)' }}>
                        Sorti ✓ — 🪵{r.bois} 🧴{r.plastique} 📦{r.tranger}
                      </td>
                      <td style={{ padding: 12, borderLeft: '1px solid var(--c-border)', textAlign: 'center' }}>
                        <button onClick={() => updateRow(r.clientId, 'done', false)}
                          style={{ background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>↩ Modifier</button>
                      </td>
                    </tr>
                  );

                  if (r.error) return (
                    <tr key={r.clientId} style={{ borderBottom: '1px solid var(--c-border)', background: 'rgba(240,90,90,.04)', borderLeft: '3px solid var(--c-danger)' }}>
                      <td style={{ padding: 12 }}>❌</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--c-danger)' }}>{r.nom}</td>
                      <td colSpan={3} style={{ padding: '12px 14px', color: 'var(--c-danger)', fontSize: 12, borderLeft: '1px solid var(--c-border)' }}>{r.error}</td>
                      <td style={{ padding: 12, borderLeft: '1px solid var(--c-border)', textAlign: 'center' }}>
                        <button onClick={() => updateRow(r.clientId, 'error', '')}
                          style={{ background: 'rgba(240,90,90,.1)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>↩</button>
                      </td>
                    </tr>
                  );

                  return (
                    <tr key={r.clientId} style={{
                      borderBottom: '1px solid var(--c-border)',
                      background: r.selected ? 'rgba(245,166,35,.05)' : '',
                      borderLeft: `3px solid ${r.selected ? '#f5a623' : over ? 'var(--c-danger)' : 'transparent'}`,
                    }}>
                      {/* Checkbox */}
                      <td style={{ padding: '10px 12px' }} onClick={() => toggleSelect(r.clientId)}>
                        <input type="checkbox" checked={r.selected} onChange={() => toggleSelect(r.clientId)}
                          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#f5a623' }} />
                      </td>

                      {/* Nom client */}
                      <td style={{ padding: '10px 14px', cursor: 'pointer' }} onClick={() => toggleSelect(r.clientId)}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{r.nom}</div>
                        {/* Stock dispo */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          {r.stockB > 0 && <span style={{ fontSize: 10, color: '#f5a623' }}>🪵 stock: {r.stockB}</span>}
                          {r.stockP > 0 && <span style={{ fontSize: 10, color: '#4f8ef7' }}>🧴 stock: {r.stockP}</span>}
                          {r.stockT > 0 && <span style={{ fontSize: 10, color: '#00d4b4' }}>📦 stock: {r.stockT}</span>}
                        </div>
                      </td>

                      {/* Bois */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
                        {r.stockB > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <NumInput value={r.bois} onChange={v => updateRow(r.clientId, 'bois', v)} max={r.stockB} color="#f5a623" />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => updateRow(r.clientId, 'bois', String(r.stockB))} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(245,166,35,.3)', background: 'rgba(245,166,35,.1)', color: '#f5a623', cursor: 'pointer' }}>max</button>
                              <button onClick={() => updateRow(r.clientId, 'bois', '0')} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--c-text3)', cursor: 'pointer' }}>0</button>
                            </div>
                          </div>
                        ) : <span style={{ color: 'var(--c-text3)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Plastique */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
                        {r.stockP > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <NumInput value={r.plastique} onChange={v => updateRow(r.clientId, 'plastique', v)} max={r.stockP} color="#4f8ef7" />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => updateRow(r.clientId, 'plastique', String(r.stockP))} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(79,142,247,.3)', background: 'rgba(79,142,247,.1)', color: '#4f8ef7', cursor: 'pointer' }}>max</button>
                              <button onClick={() => updateRow(r.clientId, 'plastique', '0')} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--c-text3)', cursor: 'pointer' }}>0</button>
                            </div>
                          </div>
                        ) : <span style={{ color: 'var(--c-text3)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Tranger */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
                        {r.stockT > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <NumInput value={r.tranger} onChange={v => updateRow(r.clientId, 'tranger', v)} max={r.stockT} color="#00d4b4" />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => updateRow(r.clientId, 'tranger', String(r.stockT))} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(0,212,180,.3)', background: 'rgba(0,212,180,.1)', color: '#00d4b4', cursor: 'pointer' }}>max</button>
                              <button onClick={() => updateRow(r.clientId, 'tranger', '0')} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--c-text3)', cursor: 'pointer' }}>0</button>
                            </div>
                          </div>
                        ) : <span style={{ color: 'var(--c-text3)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '8px 12px', borderLeft: '1px solid var(--c-border)', textAlign: 'center' }}>
                        {over && <div style={{ fontSize: 10, color: 'var(--c-danger)', fontWeight: 700, marginBottom: 4 }}>⚠ Dépasse stock</div>}
                        <button
                          onClick={() => sortirRow(r)}
                          disabled={tot === 0 || over}
                          style={{
                            background: tot > 0 && !over ? '#f5a623' : 'var(--c-surface2)',
                            border: 'none', color: tot > 0 && !over ? '#fff' : 'var(--c-text3)',
                            borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700,
                            cursor: tot > 0 && !over ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                          }}>
                          ⬆ Sortir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {tab === 'historique' && (<>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
            <option value="">Tous les clients</option>
            {clients?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={filterChambre} onChange={e => setFilterChambre(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
            <option value="">Toutes les chambres</option>
            {chambres?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {(filterClient || filterChambre || filterType) && (
            <button onClick={() => { setFilterClient(''); setFilterChambre(''); setFilterType(''); }}
              style={{ background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>✕</button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <BtnPdf onClick={() => pdfSorties(filteredSorties)} label="⬇ PDF" disabled={filteredSorties.length === 0} />
          </div>
        </div>

        {/* KPIs types */}
        {filteredSorties.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {TYPES.map(t => {
              const nb = filteredSorties.filter(s => (s as any).typeCaisse === t.value).reduce((s, x) => s + x.nbCaisses, 0);
              if (nb === 0) return null;
              return (
                <div key={t.value} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{t.label.split(' ')[0]}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: t.color }}>{nb.toLocaleString('fr-FR')}</div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>{t.label.split(' ')[1]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--c-bg2)' }}>
                {['Date', 'Client', 'Chambre', 'Type', 'Caisses', 'Référence', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSorties.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune sortie pour la campagne {campagneActive}</td></tr>
              )}
              {filteredSorties.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{format(new Date(s.dateSortie), 'dd/MM/yyyy')}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{s.client.nom}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.chambre?.nom || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: typeColor((s as any).typeCaisse || 'bois'), fontWeight: 600 }}>{typeLabel((s as any).typeCaisse || 'bois')}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ color: '#f5a623', fontSize: 15 }}>-{s.nbCaisses}</strong>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--c-text2)', fontSize: 12 }}>{s.reference || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={async () => {
                        if (!confirm(`Annuler cette sortie (-${s.nbCaisses} ${typeLabel((s as any).typeCaisse)}) pour ${s.client.nom} ?`)) return;
                        try { await sortiesApi.delete(s.id); toast.success('Sortie annulée'); refetchAll(); }
                        catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
                      }}
                      style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}
