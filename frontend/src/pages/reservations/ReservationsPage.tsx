import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfReservations } from '../../services/pdfService';
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { reservationsApi, clientsApi } from '../../services';
import { Button, PageHeader, Spinner } from '../../components/ui/UI';
import type { Reservation, Client } from '../../types';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const STATUTS = [
  { value: 'en_attente', label: 'En attente', color: 'var(--c-warning)' },
  { value: 'confirmee', label: 'Confirmée', color: 'var(--c-success)' },
  { value: 'annulee', label: 'Annulée', color: 'var(--c-danger)' },
  { value: 'terminee', label: 'Terminée', color: 'var(--c-text3)' },
];
function statutLabel(s: string) { return STATUTS.find(x => x.value === s)?.label || s; }
function statutColor(s: string) { return STATUTS.find(x => x.value === s)?.color || 'var(--c-text3)'; }

function calcTotal(r: any): number {
  return (
    (Number(r.nbCaissesBois) || 0) * (Number(r.prixUnitaireBois) || 0) +
    (Number(r.nbCaissesPластique) || 0) * (Number(r.prixUnitairePlastique) || 0) +
    (Number(r.nbCaissesTranger) || 0) * (Number(r.prixUnitaireTranger) || 0)
  );
}

function EditCell({ value, type = 'text', options, onSave }: {
  value: string | number;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  function handleBlur() { setEditing(false); if (String(val) !== String(value)) onSave(val); }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setVal(String(value)); setEditing(false); }
  }
  if (editing) {
    if (type === 'select' && options) {
      return <select autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur}
        style={{ background: '#161d35', border: '1px solid var(--c-primary)', borderRadius: 6, color: '#e8edf8', padding: '4px 8px', fontSize: 12, width: '100%' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    }
    return <input autoFocus type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur} onKeyDown={handleKey}
      style={{ background: '#161d35', border: '1px solid var(--c-primary)', borderRadius: 6, color: '#e8edf8', padding: '4px 8px', fontSize: 12, width: '100%', outline: 'none' }} />;
  }
  return <div onClick={() => { setVal(String(value)); setEditing(true); }} title="Cliquer pour modifier"
    style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: 6, minWidth: 36, minHeight: 24 }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,.12)')}
    onMouseLeave={e => (e.currentTarget.style.background = '')}>
    {type === 'select'
      ? <span style={{ color: statutColor(String(value)), fontWeight: 600 }}>{statutLabel(String(value))}</span>
      : (value !== '' && value !== 0 ? String(value) : <span style={{ color: 'var(--c-text3)' }}>—</span>)}
  </div>;
}

function NewReservationRow({ client, clients, onSaved, onCancel }: {
  client: Client | null; clients: Client[]; onSaved: () => void; onCancel: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [row, setRow] = useState({
    clientId: client ? String(client.id) : '',
    dateReservation: today, dateSortiePrevisionnelle: '',
    nbCaissesBois: '0', prixUnitaireBois: '0',
    nbCaissesPластique: '0', prixUnitairePlastique: '0',
    nbCaissesTranger: '0', prixUnitaireTranger: '0',
    statut: 'en_attente',
  });
  const [saving, setSaving] = useState(false);
  const total = (parseInt(row.nbCaissesBois)||0)*(parseFloat(row.prixUnitaireBois)||0) +
    (parseInt(row.nbCaissesPластique)||0)*(parseFloat(row.prixUnitairePlastique)||0) +
    (parseInt(row.nbCaissesTranger)||0)*(parseFloat(row.prixUnitaireTranger)||0);

  async function handleSave() {
    if (!row.clientId || !row.dateReservation) return toast.error('Client et date requis');
    setSaving(true);
    try {
      await reservationsApi.create({
        clientId: parseInt(row.clientId), dateReservation: row.dateReservation,
        dateSortiePrevisionnelle: row.dateSortiePrevisionnelle || undefined,
        nbCaissesBois: parseInt(row.nbCaissesBois)||0, prixUnitaireBois: parseFloat(row.prixUnitaireBois)||0,
        nbCaissesPластique: parseInt(row.nbCaissesPластique)||0, prixUnitairePlastique: parseFloat(row.prixUnitairePlastique)||0,
        nbCaissesTranger: parseInt(row.nbCaissesTranger)||0, prixUnitaireTranger: parseFloat(row.prixUnitaireTranger)||0,
        statut: row.statut,
      });
      toast.success('Réservation créée'); onSaved();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  const s = { background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 6, color: '#e8edf8', padding: '4px 6px', fontSize: 12, width: '100%', outline: 'none', boxSizing: 'border-box' as const };
  return (
    <tr style={{ background: 'rgba(79,142,247,.05)', borderBottom: '2px solid rgba(79,142,247,.25)' }}>
      <td style={{ padding: '4px 8px' }} colSpan={1}>
        {!client
          ? <select value={row.clientId} onChange={e => setRow({...row, clientId: e.target.value})} style={s}>
              <option value="">-- Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          : <span style={{ fontWeight: 600, color: 'var(--c-primary)', fontSize: 13 }}>✏ {client.nom}</span>}
      </td>
      <td style={{ padding: '4px' }}><input type="date" value={row.dateReservation} onChange={e => setRow({...row, dateReservation: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="date" value={row.dateSortiePrevisionnelle} onChange={e => setRow({...row, dateSortiePrevisionnelle: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="number" min="0" value={row.nbCaissesBois} onChange={e => setRow({...row, nbCaissesBois: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="number" min="0" step="0.01" value={row.prixUnitaireBois} onChange={e => setRow({...row, prixUnitaireBois: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="number" min="0" value={row.nbCaissesPластique} onChange={e => setRow({...row, nbCaissesPластique: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="number" min="0" step="0.01" value={row.prixUnitairePlastique} onChange={e => setRow({...row, prixUnitairePlastique: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="number" min="0" value={row.nbCaissesTranger} onChange={e => setRow({...row, nbCaissesTranger: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px' }}><input type="number" min="0" step="0.01" value={row.prixUnitaireTranger} onChange={e => setRow({...row, prixUnitaireTranger: e.target.value})} style={s}/></td>
      <td style={{ padding: '4px 8px', fontWeight: 700, color: 'var(--c-accent)', fontSize: 13, whiteSpace: 'nowrap' }}>{total > 0 ? `${total.toLocaleString('fr-FR')} MAD` : '—'}</td>
      <td style={{ padding: '4px' }}>
        <select value={row.statut} onChange={e => setRow({...row, statut: e.target.value})} style={s}>
          {STATUTS.map(s2 => <option key={s2.value} value={s2.value}>{s2.label}</option>)}
        </select>
      </td>
      <td style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'var(--c-primary)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {saving ? '...' : '✓'}
          </button>
          <button onClick={onCancel}
            style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 24, height: 24, fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      </td>
    </tr>
  );
}

export default function ReservationsPage() {
  const { data: reservations, loading: loadingR, refetch } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const { data: clients, loading: loadingC } = useFetch<Client[]>(() => clientsApi.getAll());
  const { campagneActive, isInCampagne } = useCampagne();
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [inlineNew, setInlineNew] = useState<number | null | 'new'>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [massStatut, setMassStatut] = useState('confirmee');
  const [applyingMass, setApplyingMass] = useState(false);

  function toggleSelect(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll(val: boolean, list: Reservation[]) {
    setSelectedIds(val ? new Set(list.map(r => r.id)) : new Set());
  }

  async function appliquerStatutMasse() {
    if (selectedIds.size === 0) return toast.error('Sélectionner au moins une réservation');
    setApplyingMass(true);
    let ok = 0;
    for (const id of Array.from(selectedIds)) {
      try { await reservationsApi.update(id, { statut: massStatut }); ok++; }
      catch {}
    }
    setApplyingMass(false);
    setSelectedIds(new Set());
    toast.success(`✓ ${ok} réservation(s) → "${statutLabel(massStatut)}"`);
    refetch();
  }

  async function handleFieldUpdate(id: number, field: string, value: string) {
    try {
      const payload: any = {};
      if (['nbCaissesBois','nbCaissesPластique','nbCaissesTranger'].includes(field)) payload[field] = parseInt(value)||0;
      else if (['prixUnitaireBois','prixUnitairePlastique','prixUnitaireTranger'].includes(field)) payload[field] = parseFloat(value)||0;
      else payload[field] = value;
      await reservationsApi.update(id, payload);
      toast.success('Mis à jour'); refetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); refetch(); }
  }

  async function handleDelete(id: number, nom: string) {
    if (!confirm(`Supprimer la réservation de ${nom} ?`)) return;
    try { await reservationsApi.delete(id); toast.success('Supprimée'); refetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
  }

  const loading = loadingR || loadingC;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  // ── Filtre campagne sur dateReservation ──
  const reservationsFiltresCampagne = (reservations || []).filter(r => isInCampagne(r.dateReservation));

  const reservationParClient: Record<number, Reservation[]> = {};
  reservationsFiltresCampagne.forEach(r => {
    if (!reservationParClient[r.client.id]) reservationParClient[r.client.id] = [];
    reservationParClient[r.client.id].push(r);
  });

  const clientsFiltres = (clients || []).filter(c => {
    const matchSearch = c.nom.toLowerCase().includes(search.toLowerCase());
    const reservs = reservationParClient[c.id] || [];
    const matchStatut = filterStatut ? reservs.some(r => r.statut === filterStatut) : true;
    return matchSearch && (filterStatut ? matchStatut : true);
  });

  const toutesReservationsVisibles = clientsFiltres.flatMap(c => reservationParClient[c.id] || []);
  const totalGlobal = reservationsFiltresCampagne.reduce((s, r) => s + calcTotal(r), 0);
  const allSelected = toutesReservationsVisibles.length > 0 && toutesReservationsVisibles.every(r => selectedIds.has(r.id));

  const HEADERS = ['', 'Client', 'Date', 'Sortie prév.', '🪵 Bois nb', '🪵 Prix', '🧴 Plast. nb', '🧴 Prix', '📦 Tranger nb', '📦 Prix', 'Total', 'Statut', ''];

  return (
    <div className="fade-in">
      <PageHeader
        title="Réservations"
        subtitle={`Campagne ${campagneActive} — ${reservationsFiltresCampagne.length} réservation(s) — Total: ${totalGlobal.toLocaleString('fr-FR')} MAD`}
      />

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Client..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 220 }} />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || filterStatut) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStatut(''); }}>✕</Button>}
        <div style={{ marginLeft: 'auto' }}>
          <BtnPdf onClick={() => pdfReservations(reservationsFiltresCampagne, clients||[])} label="⬇ Exporter PDF" disabled={!reservationsFiltresCampagne.length} />
        </div>
      </div>

      {/* Barre changement statut en masse */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 600 }}>
          {selectedIds.size > 0 ? `${selectedIds.size} sélectionné(s)` : 'Changer statut en masse :'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUTS.map(s => (
            <button key={s.value} onClick={() => setMassStatut(s.value)}
              style={{ padding: '5px 12px', borderRadius: 8, border: massStatut === s.value ? `2px solid ${s.color}` : '1px solid var(--c-border)', background: massStatut === s.value ? `${s.color}22` : 'var(--c-bg2)', color: massStatut === s.value ? s.color : 'var(--c-text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={appliquerStatutMasse} disabled={selectedIds.size === 0 || applyingMass}
          style={{ background: selectedIds.size > 0 ? 'var(--c-primary)' : 'var(--c-surface2)', border: 'none', color: selectedIds.size > 0 ? '#fff' : 'var(--c-text3)', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
          {applyingMass ? 'En cours...' : `⚡ Appliquer (${selectedIds.size})`}
        </button>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())}
            style={{ background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            Tout désélectionner
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 10, fontStyle: 'italic' }}>
        💡 Cocher les réservations · Choisir le statut · Cliquer <strong style={{ color: 'var(--c-primary)' }}>⚡ Appliquer</strong> · Cliquer sur une cellule pour la modifier individuellement
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
          <thead>
            <tr style={{ background: 'var(--c-bg2)' }}>
              <th style={{ padding: '10px 10px', borderBottom: '1px solid var(--c-border)', width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={e => selectAll(e.target.checked, toutesReservationsVisibles)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--c-primary)' }} />
              </th>
              {HEADERS.slice(1).map(h => (
                <th key={h} style={{ padding: '10px 8px', textAlign: h === 'Client' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid var(--c-border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientsFiltres.length === 0 && <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune réservation pour la campagne {campagneActive}</td></tr>}

            {clientsFiltres.map(client => {
              const reservs = reservationParClient[client.id] || [];
              return (
                <>
                  {inlineNew === client.id && (
                    <NewReservationRow key={`new-${client.id}`} client={client} clients={clients || []}
                      onSaved={() => { setInlineNew(null); refetch(); }} onCancel={() => setInlineNew(null)} />
                  )}

                  {reservs.length > 0 ? reservs.map((r, ri) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--c-border)', background: selectedIds.has(r.id) ? 'rgba(79,142,247,.07)' : ri % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                      <td style={{ padding: '6px 10px' }} onClick={() => toggleSelect(r.id)}>
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)}
                          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--c-primary)' }} />
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {ri === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {client.nom}
                            {reservs.length > 1 && <span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', fontSize: 10, padding: '1px 6px', borderRadius: 10 }}>×{reservs.length}</span>}
                          </div>
                        ) : <span style={{ color: 'var(--c-text3)', fontSize: 11, paddingLeft: 8 }}>↳</span>}
                      </td>
                      <td style={{ padding: '6px 4px' }}><EditCell type="date" value={r.dateReservation} onSave={v => handleFieldUpdate(r.id, 'dateReservation', v)} /></td>
                      <td style={{ padding: '6px 4px' }}><EditCell type="date" value={r.dateSortiePrevisionnelle || ''} onSave={v => handleFieldUpdate(r.id, 'dateSortiePrevisionnelle', v)} /></td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}><EditCell type="number" value={r.nbCaissesBois} onSave={v => handleFieldUpdate(r.id, 'nbCaissesBois', v)} /></td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}><EditCell type="number" value={r.prixUnitaireBois} onSave={v => handleFieldUpdate(r.id, 'prixUnitaireBois', v)} /></td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}><EditCell type="number" value={r.nbCaissesPластique} onSave={v => handleFieldUpdate(r.id, 'nbCaissesPластique', v)} /></td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}><EditCell type="number" value={r.prixUnitairePlastique} onSave={v => handleFieldUpdate(r.id, 'prixUnitairePlastique', v)} /></td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}><EditCell type="number" value={(r as any).nbCaissesTranger || 0} onSave={v => handleFieldUpdate(r.id, 'nbCaissesTranger', v)} /></td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}><EditCell type="number" value={(r as any).prixUnitaireTranger || 0} onSave={v => handleFieldUpdate(r.id, 'prixUnitaireTranger', v)} /></td>
                      <td style={{ padding: '8px', fontWeight: 700, color: 'var(--c-accent)', fontSize: 13, whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {calcTotal(r).toLocaleString('fr-FR')} MAD
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <EditCell type="select" value={r.statut}
                          options={STATUTS.map(s => ({ value: s.value, label: s.label }))}
                          onSave={v => handleFieldUpdate(r.id, 'statut', v)} />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {ri === 0 && (
                            <button onClick={() => setInlineNew(inlineNew === client.id ? null : client.id)}
                              style={{ background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, width: 24, height: 24, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>+</button>
                          )}
                          <button onClick={() => handleDelete(r.id, client.nom)}
                            style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 24, height: 24, fontSize: 12, cursor: 'pointer' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    inlineNew !== client.id && (
                      <tr key={`empty-${client.id}`} style={{ borderBottom: '1px solid var(--c-border)' }}>
                        <td style={{ padding: '10px 10px' }}></td>
                        <td style={{ padding: '10px 8px', fontWeight: 600, fontSize: 13 }}>{client.nom}</td>
                        <td colSpan={9} style={{ padding: '10px 8px', color: 'var(--c-text3)', fontSize: 12, fontStyle: 'italic' }}>Aucune réservation pour cette campagne</td>
                        <td colSpan={2} style={{ padding: '8px' }}>
                          <button onClick={() => setInlineNew(client.id)}
                            style={{ background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            + Réserver
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
