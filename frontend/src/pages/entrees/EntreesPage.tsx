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
  { value: 'bois',      label: '🪵 Bois',     color: '#f5a623' },
  { value: 'plastique', label: '🧴 Plastique', color: '#4f8ef7' },
  { value: 'tranger',   label: '📦 Tranger',   color: '#00d4b4' },
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
      {over && (
        <div style={{ fontSize: 9, color: '#f05a5a', fontWeight: 700, whiteSpace: 'nowrap' }}>
          max {max}
        </div>
      )}
    </div>
  );
}

interface RowState {
  clientId: number;
  nom: string;
  bois: string; plastique: string; tranger: string;
  dejaB: number; dejaP: number; dejaT: number;
  resaB: number; resaP: number; resaT: number;
  selected: boolean;
  done: boolean;
  error: string;
}

export default function EntreesPage() {
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: entrees, loading, refetch: refetchEntrees } = useFetch<Entree[]>(() => entreesApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());

  const [tab, setTab] = useState<'affectation' | 'historique'>('affectation');
  const [chambreId, setChambreId] = useState('');
  const [dateEntree, setDateEntree] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [en_cours, setEnCours] = useState(false);
  const [affectingIds, setAffectingIds] = useState<Set<number>>(new Set());
  const [rows, setRows] = useState<RowState[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Init rows depuis réservations + entrées
  const rowsBase = useMemo<RowState[]>(() => {
    if (!clients || !reservations || !entrees) return [];
    const resaMap: Record<number, any> = {};
    reservations.filter(r => isInCampagne((r as any).dateReservation))
      .forEach(r => { resaMap[r.client.id] = r; });
    return clients.filter(c => resaMap[c.id]).map(client => {
      const resa = resaMap[client.id];
      const resaB = resa?.nbCaissesBois || 0;
      const resaP = (resa as any)?.nbCaissesPластique || 0;
      const resaT = (resa as any)?.nbCaissesTranger || 0;
      const dejaB = entrees.filter(e => e.client.id === client.id && (e as any).typeCaisse === 'bois' && isInCampagne(e.dateEntree)).reduce((s, e) => s + e.nbCaisses, 0);
      const dejaP = entrees.filter(e => e.client.id === client.id && (e as any).typeCaisse === 'plastique' && isInCampagne(e.dateEntree)).reduce((s, e) => s + e.nbCaisses, 0);
      const dejaT = entrees.filter(e => e.client.id === client.id && (e as any).typeCaisse === 'tranger' && isInCampagne(e.dateEntree)).reduce((s, e) => s + e.nbCaisses, 0);
      const restB = Math.max(0, resaB - dejaB);
      const restP = Math.max(0, resaP - dejaP);
      const restT = Math.max(0, resaT - dejaT);
      return {
        clientId: client.id, nom: client.nom,
        bois: String(restB), plastique: String(restP), tranger: String(restT),
        dejaB, dejaP, dejaT, resaB, resaP, resaT,
        selected: false, done: false, error: '',
      };
    });
  }, [clients, reservations, entrees]);

  if (rowsBase.length > 0 && !initialized) {
    setRows(rowsBase);
    setInitialized(true);
    if (!chambreId && chambres && chambres.length > 0) setChambreId(String(chambres[0].id));
  }

  function updateRow(clientId: number, field: keyof RowState, value: any) {
    setRows(prev => prev.map(r => r.clientId === clientId ? { ...r, [field]: value } : r));
  }
  function toggleSelect(clientId: number) {
    setRows(prev => prev.map(r => r.clientId === clientId && !r.done ? { ...r, selected: !r.selected } : r));
  }
  function setTout(clientId: number) {
    setRows(prev => prev.map(r => {
      if (r.clientId !== clientId) return r;
      return { ...r, bois: String(r.resaB - r.dejaB), plastique: String(r.resaP - r.dejaP), tranger: String(r.resaT - r.dejaT) };
    }));
  }
  function reset(clientId: number) {
    setRows(prev => prev.map(r => r.clientId !== clientId ? r : { ...r, bois: '0', plastique: '0', tranger: '0' }));
  }

  const chambre = (chambres || []).find(c => String(c.id) === chambreId);
  const rowsFiltres = rows.filter(r => r.nom.toLowerCase().includes(search.toLowerCase()));
  const selectionnes = rows.filter(r => r.selected && !r.done);

  function isOver(r: RowState) {
    return (parseInt(r.bois) || 0) > r.resaB - r.dejaB
      || (parseInt(r.plastique) || 0) > r.resaP - r.dejaP
      || (parseInt(r.tranger) || 0) > r.resaT - r.dejaT;
  }
  function total(r: RowState) {
    return (parseInt(r.bois) || 0) + (parseInt(r.plastique) || 0) + (parseInt(r.tranger) || 0);
  }

  const totalSelection = selectionnes.reduce((s, r) => s + total(r), 0);
  const depasseCapacite = chambre ? totalSelection > chambre.disponible : false;

  function refetchAll() { refetchEntrees(); refetchChambres(); setInitialized(false); }

  async function affecterRow(r: RowState) {
    if (affectingIds.has(r.clientId)) return; // bloquer double-clic
    if (!chambreId) return toast.error('Choisir une chambre');
    if (total(r) === 0) return toast.error('Quantité = 0');
    if (isOver(r)) return toast.error('Dépasse la réservation');
    if (chambre && total(r) > chambre.disponible) return toast.error(`Chambre pleine — disponible : ${chambre.disponible}`);
    setAffectingIds(prev => new Set(prev).add(r.clientId));
    try {
      const ops = [];
      if (parseInt(r.bois) > 0) ops.push(entreesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateEntree, nbCaisses: parseInt(r.bois), typeCaisse: 'bois' }));
      if (parseInt(r.plastique) > 0) ops.push(entreesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateEntree, nbCaisses: parseInt(r.plastique), typeCaisse: 'plastique' }));
      if (parseInt(r.tranger) > 0) ops.push(entreesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateEntree, nbCaisses: parseInt(r.tranger), typeCaisse: 'tranger' }));
      await Promise.all(ops);
      updateRow(r.clientId, 'done', true);
      updateRow(r.clientId, 'selected', false);
      toast.success(`✓ ${r.nom} — ${total(r)} caisses`);
      refetchChambres(); refetchEntrees(); setInitialized(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setAffectingIds(prev => { const s = new Set(prev); s.delete(r.clientId); return s; });
    }
  }

  async function affecterSelection() {
    if (!chambreId) return toast.error('Choisir une chambre');
    if (selectionnes.length === 0) return toast.error('Aucun client sélectionné');
    if (depasseCapacite) return toast.error(`Capacité dépassée — disponible : ${chambre?.disponible}`);
    const over = selectionnes.find(r => isOver(r));
    if (over) return toast.error(`${over.nom} dépasse sa réservation`);
    setEnCours(true);
    let ok = 0, err = 0;
    for (const r of selectionnes) {
      try {
        const ops = [];
        if (parseInt(r.bois) > 0) ops.push(entreesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateEntree, nbCaisses: parseInt(r.bois), typeCaisse: 'bois' }));
        if (parseInt(r.plastique) > 0) ops.push(entreesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateEntree, nbCaisses: parseInt(r.plastique), typeCaisse: 'plastique' }));
        if (parseInt(r.tranger) > 0) ops.push(entreesApi.create({ clientId: r.clientId, chambreId: parseInt(chambreId), dateEntree, nbCaisses: parseInt(r.tranger), typeCaisse: 'tranger' }));
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
    refetchChambres(); refetchEntrees(); setInitialized(false);
    if (err === 0) toast.success(`✓ ${ok} client(s) affecté(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const filteredEntrees = (entrees || []).filter(e => {
    const mc = filterClient ? e.client.id === parseInt(filterClient) : true;
    const mt = filterType ? (e as any).typeCaisse === filterType : true;
    return mc && mt && isInCampagne(e.dateEntree);
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  const allChecked = rowsFiltres.filter(r => !r.done).length > 0 && rowsFiltres.filter(r => !r.done).every(r => r.selected);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Entrées</h1>
        <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Campagne {campagneActive} — {filteredEntrees.length} entrée(s)</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 22 }}>
        {[{ id: 'affectation', label: '⚡ Affectation' }, { id: 'historique', label: `📋 Historique (${filteredEntrees.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 20px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'var(--c-primary-glow)' : 'transparent', color: tab === t.id ? 'var(--c-primary)' : 'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'affectation' && (<>

        {/* Barre de contrôle */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Chambres */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Chambre cible</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(chambres || []).map(c => (
                <button key={c.id} onClick={() => setChambreId(String(c.id))}
                  style={{
                    background: chambreId === String(c.id) ? 'rgba(79,142,247,.15)' : 'var(--c-bg2)',
                    border: `2px solid ${chambreId === String(c.id) ? 'var(--c-primary)' : c.disponible === 0 ? 'rgba(240,90,90,.4)' : 'var(--c-border)'}`,
                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: chambreId === String(c.id) ? 'var(--c-primary)' : 'var(--c-text)' }}>❄ {c.nom}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: c.disponible === 0 ? 'var(--c-danger)' : 'var(--c-success)', fontWeight: 700 }}>{c.disponible} libre</span>
                    <span style={{ color: 'var(--c-text3)', marginLeft: 6 }}>{c.tauxRemplissage}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Date d'entrée</div>
            <input type="date" value={dateEntree} onChange={e => setDateEntree(e.target.value)}
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
          <div style={{ background: depasseCapacite ? 'rgba(240,90,90,.08)' : 'rgba(46,207,138,.08)', border: `1px solid ${depasseCapacite ? 'rgba(240,90,90,.3)' : 'rgba(46,207,138,.3)'}`, borderRadius: 10, padding: '12px 18px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, color: depasseCapacite ? 'var(--c-danger)' : 'var(--c-success)' }}>
              {depasseCapacite ? '⚠ Capacité chambre dépassée' : `✓ ${selectionnes.length} client(s) sélectionné(s)`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
              Total : <strong style={{ color: depasseCapacite ? 'var(--c-danger)' : 'var(--c-primary)' }}>{totalSelection}</strong> caisses
              {chambre && <span style={{ marginLeft: 12, color: 'var(--c-text3)' }}>/ {chambre.disponible} disponibles</span>}
            </div>
            <button onClick={affecterSelection} disabled={en_cours || depasseCapacite}
              style={{ marginLeft: 'auto', background: depasseCapacite ? 'var(--c-surface2)' : 'var(--c-success)', border: 'none', color: depasseCapacite ? 'var(--c-text3)' : '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: depasseCapacite ? 'not-allowed' : 'pointer' }}>
              {en_cours ? '⚡ En cours...' : `⚡ Affecter (${selectionnes.length})`}
            </button>
          </div>
        )}

        {/* Tableau */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: 'var(--c-bg2)' }}>
                <th style={{ padding: '12px', width: 40, borderBottom: '1px solid var(--c-border)' }}>
                  <input type="checkbox" checked={allChecked}
                    onChange={e => setRows(prev => prev.map(r => r.done ? r : { ...r, selected: e.target.checked }))}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--c-primary)' }} />
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>Client</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>🪵 Bois</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>🧴 Plastique</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#00d4b4', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>📦 Tranger</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', borderLeft: '1px solid var(--c-border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsFiltres.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucun client avec réservation</td></tr>
              )}
              {rowsFiltres.map(r => {
                const toutAffecte = r.resaB === r.dejaB && r.resaP === r.dejaP && r.resaT === r.dejaT;
                const maxB = r.resaB - r.dejaB;
                const maxP = r.resaP - r.dejaP;
                const maxT = r.resaT - r.dejaT;
                const over = isOver(r);
                const tot = total(r);

                // Ligne affectée avec succès
                if (r.done) return (
                  <tr key={r.clientId} style={{ borderBottom: '1px solid var(--c-border)', background: 'rgba(46,207,138,.04)', borderLeft: '3px solid var(--c-success)' }}>
                    <td style={{ padding: 12 }}>✅</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--c-success)' }}>{r.nom}</td>
                    <td colSpan={3} style={{ padding: '12px 14px', color: 'var(--c-text3)', fontSize: 12, fontStyle: 'italic', borderLeft: '1px solid var(--c-border)' }}>
                      Affecté ✓ — 🪵{r.bois} 🧴{r.plastique} 📦{r.tranger}
                    </td>
                    <td style={{ padding: 12, borderLeft: '1px solid var(--c-border)', textAlign: 'center' }}>
                      <button onClick={() => updateRow(r.clientId, 'done', false)}
                        style={{ background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>↩ Modifier</button>
                    </td>
                  </tr>
                );

                // Ligne erreur
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
                    background: r.selected ? 'rgba(79,142,247,.05)' : toutAffecte ? 'rgba(46,207,138,.02)' : '',
                    borderLeft: `3px solid ${r.selected ? 'var(--c-primary)' : over ? 'var(--c-danger)' : 'transparent'}`,
                    opacity: toutAffecte ? 0.5 : 1,
                  }}>
                    {/* Checkbox */}
                    <td style={{ padding: '10px 12px' }} onClick={() => !toutAffecte && toggleSelect(r.clientId)}>
                      <input type="checkbox" checked={r.selected} onChange={() => toggleSelect(r.clientId)}
                        disabled={toutAffecte}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--c-primary)' }} />
                    </td>

                    {/* Nom client */}
                    <td style={{ padding: '10px 14px', cursor: 'pointer' }} onClick={() => !toutAffecte && toggleSelect(r.clientId)}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.nom}</div>
                      {/* Infos réservation et déjà affecté */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        {r.resaB > 0 && <span style={{ fontSize: 10, color: '#f5a623' }}>Résa: {r.resaB} · Affecté: {r.dejaB}</span>}
                        {r.resaP > 0 && <span style={{ fontSize: 10, color: '#4f8ef7' }}>Résa: {r.resaP} · Affecté: {r.dejaP}</span>}
                        {r.resaT > 0 && <span style={{ fontSize: 10, color: '#00d4b4' }}>Résa: {r.resaT} · Affecté: {r.dejaT}</span>}
                      </div>
                      {toutAffecte && <div style={{ fontSize: 10, color: 'var(--c-success)', fontWeight: 700, marginTop: 2 }}>✓ Complet</div>}
                    </td>

                    {/* Bois */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
                      {r.resaB > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <NumInput value={r.bois} onChange={v => updateRow(r.clientId, 'bois', v)} max={maxB} disabled={toutAffecte || maxB === 0} color="#f5a623" />
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => updateRow(r.clientId, 'bois', String(maxB))} title="Tout" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(245,166,35,.3)', background: 'rgba(245,166,35,.1)', color: '#f5a623', cursor: 'pointer' }}>max</button>
                            <button onClick={() => updateRow(r.clientId, 'bois', '0')} title="Vider" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--c-text3)', cursor: 'pointer' }}>0</button>
                          </div>
                        </div>
                      ) : <span style={{ color: 'var(--c-text3)', fontSize: 11 }}>—</span>}
                    </td>

                    {/* Plastique */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
                      {r.resaP > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <NumInput value={r.plastique} onChange={v => updateRow(r.clientId, 'plastique', v)} max={maxP} disabled={toutAffecte || maxP === 0} color="#4f8ef7" />
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => updateRow(r.clientId, 'plastique', String(maxP))} title="Tout" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(79,142,247,.3)', background: 'rgba(79,142,247,.1)', color: '#4f8ef7', cursor: 'pointer' }}>max</button>
                            <button onClick={() => updateRow(r.clientId, 'plastique', '0')} title="Vider" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--c-text3)', cursor: 'pointer' }}>0</button>
                          </div>
                        </div>
                      ) : <span style={{ color: 'var(--c-text3)', fontSize: 11 }}>—</span>}
                    </td>

                    {/* Tranger */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--c-border)' }}>
                      {r.resaT > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <NumInput value={r.tranger} onChange={v => updateRow(r.clientId, 'tranger', v)} max={maxT} disabled={toutAffecte || maxT === 0} color="#00d4b4" />
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => updateRow(r.clientId, 'tranger', String(maxT))} title="Tout" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(0,212,180,.3)', background: 'rgba(0,212,180,.1)', color: '#00d4b4', cursor: 'pointer' }}>max</button>
                            <button onClick={() => updateRow(r.clientId, 'tranger', '0')} title="Vider" style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--c-text3)', cursor: 'pointer' }}>0</button>
                          </div>
                        </div>
                      ) : <span style={{ color: 'var(--c-text3)', fontSize: 11 }}>—</span>}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '8px 12px', borderLeft: '1px solid var(--c-border)', textAlign: 'center' }}>
                      {toutAffecte ? (
                        <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 700 }}>✓ Complet</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {over && (
                            <div style={{ fontSize: 10, color: 'var(--c-danger)', fontWeight: 700 }}>⚠ Dépasse résa</div>
                          )}
                          <button
                            onClick={() => affecterRow(r)}
                            disabled={tot === 0 || over || !chambreId || affectingIds.has(r.clientId)}
                            style={{
                              background: tot > 0 && !over && chambreId && !affectingIds.has(r.clientId) ? 'var(--c-primary)' : 'var(--c-surface2)',
                              border: 'none', color: tot > 0 && !over && chambreId && !affectingIds.has(r.clientId) ? '#fff' : 'var(--c-text3)',
                              borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700,
                              cursor: tot > 0 && !over && chambreId && !affectingIds.has(r.clientId) ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                            }}>
                            {affectingIds.has(r.clientId) ? '⏳...' : '↓ Affecter'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>)}

      {tab === 'historique' && (<>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
            <option value="">Tous les clients</option>
            {clients?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {(filterClient || filterType) && (
            <button onClick={() => { setFilterClient(''); setFilterType(''); }}
              style={{ background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>✕</button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <BtnPdf onClick={() => pdfEntrees(filteredEntrees)} label="⬇ PDF" disabled={filteredEntrees.length === 0} />
          </div>
        </div>

        {/* KPIs types */}
        {filteredEntrees.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {TYPES.map(t => {
              const nb = filteredEntrees.filter(e => (e as any).typeCaisse === t.value).reduce((s, e) => s + e.nbCaisses, 0);
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
                {['Date', 'Client', 'Chambre', 'Type', 'Nb caisses', 'Référence', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntrees.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune entrée pour la campagne {campagneActive}</td></tr>
              )}
              {filteredEntrees.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{format(new Date(e.dateEntree), 'dd/MM/yyyy')}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{e.client.nom}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{e.chambre?.nom}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: typeColor((e as any).typeCaisse || 'bois'), fontWeight: 600 }}>{typeLabel((e as any).typeCaisse || 'bois')}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ color: 'var(--c-success)', fontSize: 15 }}>+{e.nbCaisses}</strong>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--c-text2)', fontSize: 12 }}>{e.reference || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer cette entrée (+${e.nbCaisses} ${typeLabel((e as any).typeCaisse)}) pour ${e.client.nom} ?`)) return;
                        try { await entreesApi.delete(e.id); toast.success('Entrée supprimée'); refetchAll(); }
                        catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
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
