import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfLocations } from '../../services/pdfService';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFetch } from '../../hooks/useFetch';
import { locationsApi, clientsApi, reservationsApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import type { Location, Client, Reservation } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

// ── Champ numérique stable hors composant ─────────────
function NumField({ label, value, onChange, max, color, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  max: number; color: string; disabled?: boolean;
}) {
  const n = parseInt(value) || 0;
  const over = n > max;
  return (
    <div style={{ flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, marginBottom: 5 }}>
        {label}
        <span style={{ color, marginLeft: 6, fontSize: 12, fontWeight: 800 }}>
          max: {max}
        </span>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        disabled={disabled || max === 0}
        onFocus={e => e.target.select()}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9]/g, '');
          onChange(v);
        }}
        style={{
          width: '100%', textAlign: 'center', padding: '10px 8px',
          background: disabled || max === 0 ? 'rgba(255,255,255,.03)' : '#0e1728',
          border: `2px solid ${over ? '#f05a5a' : n > 0 ? color : 'rgba(255,255,255,.1)'}`,
          borderRadius: 10, color: over ? '#f05a5a' : disabled ? 'var(--c-text3)' : '#e8edf8',
          fontSize: 20, fontWeight: 800, outline: 'none',
          opacity: max === 0 ? 0.4 : 1,
        }}
        placeholder="0"
      />
      {over && (
        <div style={{ fontSize: 10, color: '#f05a5a', fontWeight: 700, marginTop: 3 }}>
          ⚠ Dépasse le quota ({max})
        </div>
      )}
    </div>
  );
}

// ── Modal Retour ───────────────────────────────────────
function ModalRetour({ client, locations, onClose, onSaved }: {
  client: Client; locations: Location[]; onClose: () => void; onSaved: () => void;
}) {
  const locsClient = locations.filter(l => l.client.id === client.id);
  const boisRestant = locsClient.filter(l => !l.typeCaisse || l.typeCaisse === 'bois').reduce((s, l) => s + Math.max(0, (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0)), 0);
  const plastRestant = locsClient.filter(l => l.typeCaisse === 'plastique').reduce((s, l) => s + Math.max(0, (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0)), 0);
  const [nbBois, setNbBois] = useState(String(boisRestant));
  const [nbPlast, setNbPlast] = useState(String(plastRestant));
  const [prixBois, setPrixBois] = useState('30');
  const [prixPlast, setPrixPlast] = useState('55');
  const [dateRetour, setDateRetour] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const vBois = parseInt(nbBois) || 0;
  const vPlast = parseInt(nbPlast) || 0;
  const total = vBois + vPlast;
  const depasse = vBois > boisRestant || vPlast > plastRestant;
  const montantDu = Math.max(0, boisRestant - vBois) * (parseFloat(prixBois) || 0) + Math.max(0, plastRestant - vPlast) * (parseFloat(prixPlast) || 0);

  async function handleSave() {
    if (total === 0) return toast.error('Saisir au moins une caisse');
    if (depasse) return toast.error('Quantité dépasse le stock');
    setSaving(true);
    try {
      async function retournerType(type: string, nb: number) {
        if (nb <= 0) return;
        const locs = locsClient
          .filter(l => type === 'bois' ? (!l.typeCaisse || l.typeCaisse === 'bois') : l.typeCaisse === type)
          .filter(l => (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0) > 0)
          .sort((a, b) => new Date(a.dateLocation).getTime() - new Date(b.dateLocation).getTime());
        let reste = nb;
        for (const loc of locs) {
          if (reste <= 0) break;
          const dispo = Math.max(0, (Number(loc.nbCaisses) || 0) - (Number(loc.nbCaissesRetournees) || 0));
          const n = Math.min(reste, dispo);
          await locationsApi.enregistrerRetour(loc.id, { nbRetournees: n, dateRetour });
          reste -= n;
        }
      }
      await retournerType('bois', vBois);
      await retournerType('plastique', vPlast);
      toast.success(`✓ ${client.nom} — ${total} caisse(s) retournée(s)`);
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 480, padding: '24px 28px', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>↩ Retour de caisses</div>
            <div style={{ fontSize: 13, color: 'var(--c-primary)', marginTop: 2 }}>{client.nom}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>DATE RETOUR</div>
            <input type="date" value={dateRetour} onChange={e => setDateRetour(e.target.value)}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '6px 10px', fontSize: 13, outline: 'none' }} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          {boisRestant > 0 && (
            <NumField label="🪵 Bois" value={nbBois} onChange={setNbBois} max={boisRestant} color="#f5a623" />
          )}
          {plastRestant > 0 && (
            <NumField label="🧴 Plastique" value={nbPlast} onChange={setNbPlast} max={plastRestant} color="#4f8ef7" />
          )}
        </div>

        {/* Prix non retournées */}
        {(boisRestant > 0 || plastRestant > 0) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {boisRestant > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Prix/u si non rendu (MAD)</div>
                <input type="text" inputMode="decimal" value={prixBois} onFocus={e => e.target.select()}
                  onChange={e => setPrixBois(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{ width: '100%', background: '#161d35', border: '1px solid rgba(245,166,35,.3)', borderRadius: 8, color: '#e8edf8', padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            {plastRestant > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Prix/u si non rendu (MAD)</div>
                <input type="text" inputMode="decimal" value={prixPlast} onFocus={e => e.target.select()}
                  onChange={e => setPrixPlast(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{ width: '100%', background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>
        )}

        {/* Résumé */}
        <div style={{ background: 'rgba(46,207,138,.06)', border: '1px solid rgba(46,207,138,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>Retour : </span>
            <strong style={{ color: 'var(--c-success)', fontSize: 16 }}>{total}</strong>
          </div>
          <div>
            <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>Montant dû restant : </span>
            <strong style={{ color: montantDu > 0 ? 'var(--c-warning)' : 'var(--c-success)', fontSize: 16 }}>{montantDu.toLocaleString('fr-FR')} MAD</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '11px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving || total === 0 || depasse}
            style={{ flex: 2, background: total > 0 && !depasse ? 'var(--c-success)' : 'var(--c-surface2)', border: 'none', color: total > 0 && !depasse ? '#fff' : 'var(--c-text3)', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: total > 0 && !depasse ? 'pointer' : 'not-allowed' }}>
            {saving ? '...' : depasse ? '⚠ Dépassé' : `✓ Confirmer (${total})`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Carte client simplifiée ────────────────────────────
function CarteClient({ row, onUpdRow, onLouer, onRetour, locClient, PRIX_DEF_BOIS, PRIX_DEF_PLAST }: {
  row: any; onUpdRow: (id: number, patch: any) => void;
  onLouer: (row: any) => void; onRetour: (client: Client) => void;
  locClient: any; PRIX_DEF_BOIS: number; PRIX_DEF_PLAST: number;
}) {
  const { client, resaB, resaP, nbBois, nbPlast, done, error } = row;

  // Quota autorisé = réservation - déjà loué
  const boisLoue = locClient?.bois?.l || 0;
  const plastLoue = locClient?.plast?.l || 0;
  const boisRest = locClient?.bois?.rest || 0;
  const plastRest = locClient?.plast?.rest || 0;

  // Max lonable = quota réservé - déjà loué (pas déjà retourné)
  const maxBois = Math.max(0, resaB - boisLoue);
  const maxPlast = Math.max(0, resaP - plastLoue);
  const totalRest = boisRest + plastRest;

  const over = nbBois > maxBois || nbPlast > maxPlast;
  const canLouer = (nbBois > 0 || nbPlast > 0) && !over && !done;

  if (resaB === 0 && resaP === 0) return null;

  return (
    <div style={{
      background: 'var(--c-surface)',
      border: `1px solid ${done ? 'rgba(46,207,138,.4)' : over ? 'rgba(240,90,90,.4)' : 'var(--c-border)'}`,
      borderRadius: 12, padding: '16px', transition: 'border-color .15s',
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{client.nom}</div>
          {done && <div style={{ fontSize: 11, color: 'var(--c-success)', marginTop: 2 }}>✓ Location enregistrée</div>}
          {error && <div style={{ fontSize: 11, color: 'var(--c-danger)', marginTop: 2 }}>⚠ {error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {totalRest > 0 && (
            <button onClick={() => onRetour(client)}
              style={{ background: 'rgba(46,207,138,.12)', border: '1px solid rgba(46,207,138,.3)', color: 'var(--c-success)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ↩ Retour
            </button>
          )}
        </div>
      </div>

      {/* Quota autorisé */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {resaP > 0 && (
          <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.15)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
            <div style={{ color: 'var(--c-text3)', fontSize: 10, marginBottom: 2 }}>🧴 QUOTA PLASTIQUE</div>
            <div style={{ color: '#4f8ef7', fontWeight: 800, fontSize: 15 }}>{resaP}</div>
            {boisLoue > 0 && <div style={{ color: 'var(--c-text3)', fontSize: 10 }}>Déjà loué: {plastLoue} · Disponible: {maxPlast}</div>}
          </div>
        )}
        {resaB > 0 && (
          <div style={{ background: 'rgba(245,166,35,.08)', border: '1px solid rgba(245,166,35,.15)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
            <div style={{ color: 'var(--c-text3)', fontSize: 10, marginBottom: 2 }}>🪵 QUOTA BOIS</div>
            <div style={{ color: '#f5a623', fontWeight: 800, fontSize: 15 }}>{resaB}</div>
            {boisLoue > 0 && <div style={{ color: 'var(--c-text3)', fontSize: 10 }}>Déjà loué: {boisLoue} · Disponible: {maxBois}</div>}
          </div>
        )}
        {(boisLoue > 0 || plastLoue > 0) && (
          <div style={{ background: totalRest > 0 ? 'rgba(245,166,35,.08)' : 'rgba(46,207,138,.08)', border: `1px solid ${totalRest > 0 ? 'rgba(245,166,35,.2)' : 'rgba(46,207,138,.2)'}`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
            <div style={{ color: 'var(--c-text3)', fontSize: 10, marginBottom: 2 }}>EN CIRCULATION</div>
            <div style={{ color: totalRest > 0 ? 'var(--c-warning)' : 'var(--c-success)', fontWeight: 800, fontSize: 15 }}>
              {totalRest > 0 ? `${totalRest} à rendre` : '✓ Tout rendu'}
            </div>
          </div>
        )}
      </div>

      {/* Saisie — seulement si quota disponible */}
      {!done && (maxBois > 0 || maxPlast > 0) && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {resaP > 0 && (
              <NumField
                label="🧴 Plastique à louer"
                value={String(nbPlast)}
                onChange={v => onUpdRow(client.id, { nbPlast: parseInt(v) || 0 })}
                max={maxPlast}
                color="#4f8ef7"
                disabled={maxPlast === 0}
              />
            )}
            {resaB > 0 && (
              <NumField
                label="🪵 Bois à louer"
                value={String(nbBois)}
                onChange={v => onUpdRow(client.id, { nbBois: parseInt(v) || 0 })}
                max={maxBois}
                color="#f5a623"
                disabled={maxBois === 0}
              />
            )}
          </div>
          <button onClick={() => onLouer(row)} disabled={!canLouer}
            style={{
              width: '100%', padding: '10px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
              background: canLouer ? 'var(--c-success)' : 'var(--c-surface2)',
              color: canLouer ? '#fff' : 'var(--c-text3)',
              cursor: canLouer ? 'pointer' : 'not-allowed',
            }}>
            {canLouer ? `✓ Louer — ${nbBois + nbPlast} caisses` : 'Saisir une quantité'}
          </button>
        </>
      )}

      {!done && maxBois === 0 && maxPlast === 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-success)', fontWeight: 600, padding: '8px 0' }}>
          ✓ Quota entièrement loué
        </div>
      )}
    </div>
  );
}

interface ClientLoc {
  client: Client; resaB: number; resaP: number; prixB: number; prixP: number;
  nbBois: number; nbPlast: number; modified: boolean; error: string; done: boolean;
}

export default function LocationsPage() {
  const { data: locations, loading, refetch } = useFetch<Location[]>(() => locationsApi.getAll());
  const { data: retours, refetch: refetchRetours } = useFetch<any[]>(() => locationsApi.getAllRetours ? locationsApi.getAllRetours() : Promise.resolve([]));
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());

  const [tab, setTab] = useState<'session' | 'suivi' | 'historique'>('session');
  const [histTab, setHistTab] = useState<'locations' | 'retours'>('locations');
  const [dateOp, setDateOp] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [searchSuivi, setSearchSuivi] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientRetour, setClientRetour] = useState<Client | null>(null);

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
        resaB: resa?.nbCaissesBois || 0,
        resaP: (resa as any)?.nbCaissesPластique || 0,
        prixB: resa?.prixUnitaireBois || 0,
        prixP: resa?.prixUnitairePlastique || 0,
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
    setRows(clientRows.map(r => ({ ...r, nbBois: 0, nbPlast: 0, modified: false, error: '', done: false })));
  }

  async function louerUn(row: ClientLoc) {
    // Vérifier quota côté frontend
    const boisLoue = suiviMap[row.client.id]?.bois?.l || 0;
    const plastLoue = suiviMap[row.client.id]?.plast?.l || 0;
    const maxBois = Math.max(0, row.resaB - boisLoue);
    const maxPlast = Math.max(0, row.resaP - plastLoue);

    if (row.nbBois > maxBois) return toast.error(`🪵 Bois : quota max ${maxBois} caisses`);
    if (row.nbPlast > maxPlast) return toast.error(`🧴 Plastique : quota max ${maxPlast} caisses`);

    try {
      const ops = [];
      if (row.nbBois > 0) ops.push(locationsApi.create({ clientId: row.client.id, dateLocation: dateOp, nbCaisses: row.nbBois, typeCaisse: 'bois', prixUnitaire: row.prixB || PRIX_DEF_BOIS }));
      if (row.nbPlast > 0) ops.push(locationsApi.create({ clientId: row.client.id, dateLocation: dateOp, nbCaisses: row.nbPlast, typeCaisse: 'plastique', prixUnitaire: row.prixP || PRIX_DEF_PLAST }));
      await Promise.all(ops);
      updRow(row.client.id, { done: true });
      toast.success(`✓ ${row.client.nom} — ${row.nbBois + row.nbPlast} caisses louées`);
      refetch();
    } catch (e: any) {
      updRow(row.client.id, { error: e?.response?.data?.message || 'Erreur' });
      toast.error('Erreur');
    }
  }

  // Suivi
  const suivi = useMemo(() => {
    if (!clients || !locations) return [];
    return clients.map(client => {
      const locs = locations.filter(l => l.client.id === client.id && isInCampagne(l.dateLocation));
      const boisLocs = locs.filter(l => !l.typeCaisse || l.typeCaisse === 'bois');
      const plastLocs = locs.filter(l => l.typeCaisse === 'plastique');
      const boisL = boisLocs.reduce((s, l) => s + (Number(l.nbCaisses) || 0), 0);
      const boisR = boisLocs.reduce((s, l) => s + (Number(l.nbCaissesRetournees) || 0), 0);
      const plastL = plastLocs.reduce((s, l) => s + (Number(l.nbCaisses) || 0), 0);
      const plastR = plastLocs.reduce((s, l) => s + (Number(l.nbCaissesRetournees) || 0), 0);
      const totalL = boisL + plastL;
      if (totalL === 0) return null;
      return {
        client, totalL, totalRest: Math.max(0, boisL - boisR) + Math.max(0, plastL - plastR),
        bois: { l: boisL, r: boisR, rest: Math.max(0, boisL - boisR) },
        plast: { l: plastL, r: plastR, rest: Math.max(0, plastL - plastR) },
      };
    }).filter(Boolean);
  }, [clients, locations]);

  const suiviMap = useMemo(() => {
    const m: Record<number, any> = {};
    suivi.forEach((s: any) => { m[s.client.id] = s; });
    return m;
  }, [suivi]);

  const suiviFiltres = suivi.filter(s => (s as any).client.nom.toLowerCase().includes(searchSuivi.toLowerCase()));
  const filteredLoc = (locations || []).filter(l => (filterClient ? l.client.id === parseInt(filterClient) : true) && isInCampagne(l.dateLocation));
  const filteredRetours = (retours || []).filter((r: any) => (filterClient ? r.client?.id === parseInt(filterClient) : true) && isInCampagne(r.dateRetour));
  const rowsFiltres = rows.filter(r => r.client.nom.toLowerCase().includes(search.toLowerCase()) && (r.resaB > 0 || r.resaP > 0));
  const modifies = rows.filter(r => r.modified && (r.nbBois > 0 || r.nbPlast > 0) && !r.done);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>Location de caisses vides</h1>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>Campagne {campagneActive} — {rowsFiltres.length} client(s) avec quota</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={dateOp} onChange={e => setDateOp(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
            <button onClick={resetRows}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', color: 'var(--c-text2)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ↺ Reset
            </button>
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '🧴 Quota plastique total', val: rows.reduce((s, r) => s + r.resaP, 0).toLocaleString('fr-FR'), color: 'var(--c-primary)' },
            { label: '🪵 Quota bois total', val: rows.reduce((s, r) => s + r.resaB, 0).toLocaleString('fr-FR'), color: 'var(--c-warning)' },
            { label: '📦 En circulation', val: suiviFiltres.filter((s: any) => s.totalRest > 0).reduce((sum: number, s: any) => sum + s.totalRest, 0).toLocaleString('fr-FR'), color: 'var(--c-danger)' },
            { label: '✓ Tout rendu', val: String(suiviFiltres.filter((s: any) => s.totalRest === 0).length) + ' clients', color: 'var(--c-success)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--c-bg2)', borderRadius: 8, padding: '8px 14px', minWidth: 130 }}>
              <div style={{ fontSize: 9, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 18 }}>
        {[
          { id: 'session', label: '⚡ Session location' },
          { id: 'suivi', label: `📊 Suivi (${suiviFiltres.length})` },
          { id: 'historique', label: `📋 Historique (${filteredLoc.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'var(--c-primary-glow)' : 'transparent', color: tab === t.id ? 'var(--c-primary)' : 'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SESSION ══ */}
      {tab === 'session' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <input placeholder="🔍 Rechercher client..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 260 }} />
            <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>
              <strong style={{ color: 'var(--c-success)' }}>{rows.filter(r => r.done).length}</strong> location(s) créée(s)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {rowsFiltres.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>
                Aucun client avec quota de location
              </div>
            )}
            {rowsFiltres.map(row => (
              <CarteClient
                key={row.client.id}
                row={row}
                onUpdRow={updRow}
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
          <input placeholder="🔍 Rechercher..." value={searchSuivi} onChange={e => setSearchSuivi(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 280, marginBottom: 16 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total loué', val: filteredLoc.reduce((s, l) => s + (Number(l.nbCaisses) || 0), 0), color: 'var(--c-primary)' },
              { label: 'Total rendu', val: filteredLoc.reduce((s, l) => s + (Number(l.nbCaissesRetournees) || 0), 0), color: 'var(--c-success)' },
              { label: 'En circulation', val: filteredLoc.reduce((s, l) => s + Math.max(0, (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0)), 0), color: 'var(--c-warning)' },
              { label: 'Clients actifs', val: suiviFiltres.filter((s: any) => s.totalRest > 0).length, color: 'var(--c-accent)' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: k.color }}>{k.val.toLocaleString('fr-FR')}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {suiviFiltres.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune location</div>}
            {suiviFiltres.map((s: any) => {
              const pct = s.totalL > 0 ? Math.round((s.totalRest / s.totalL) * 100) : 0;
              return (
                <div key={s.client.id} style={{ background: 'var(--c-surface)', border: `1px solid ${s.totalRest > 0 ? 'rgba(245,166,35,.3)' : 'rgba(46,207,138,.3)'}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.client.nom}</div>
                    {s.totalRest > 0
                      ? <button onClick={() => setClientRetour(s.client)}
                          style={{ background: 'rgba(46,207,138,.15)', border: '1px solid rgba(46,207,138,.3)', color: 'var(--c-success)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>↩ Retour</button>
                      : <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 600 }}>✓ Tout rendu</span>}
                  </div>
                  <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 6, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 20, background: pct > 50 ? 'var(--c-warning)' : 'var(--c-success)', width: `${pct}%`, transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                    {s.bois.l > 0 && (
                      <div>
                        <span style={{ color: 'var(--c-text3)' }}>🪵 Loué: </span>
                        <span style={{ color: 'var(--c-warning)', fontWeight: 700 }}>{s.bois.l}</span>
                        {s.bois.rest > 0 && <span style={{ color: 'var(--c-danger)', marginLeft: 4 }}>· À rendre: {s.bois.rest}</span>}
                        {s.bois.rest === 0 && <span style={{ color: 'var(--c-success)', marginLeft: 4 }}>✓</span>}
                      </div>
                    )}
                    {s.plast.l > 0 && (
                      <div>
                        <span style={{ color: 'var(--c-text3)' }}>🧴 Loué: </span>
                        <span style={{ color: 'var(--c-primary)', fontWeight: 700 }}>{s.plast.l}</span>
                        {s.plast.rest > 0 && <span style={{ color: 'var(--c-danger)', marginLeft: 4 }}>· À rendre: {s.plast.rest}</span>}
                        {s.plast.rest === 0 && <span style={{ color: 'var(--c-success)', marginLeft: 4 }}>✓</span>}
                      </div>
                    )}
                    <div style={{ marginLeft: 'auto', fontWeight: 700, color: s.totalRest > 0 ? 'var(--c-warning)' : 'var(--c-success)' }}>
                      {s.totalRest > 0 ? `${s.totalRest} à rendre` : '✓ Complet'}
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
          <div style={{ display: 'flex', gap: 4, background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 14 }}>
            {[{ id: 'locations', label: `📦 Locations (${filteredLoc.length})` }, { id: 'retours', label: `↩ Retours (${filteredRetours.length})` }].map(t => (
              <button key={t.id} onClick={() => setHistTab(t.id as any)}
                style={{ padding: '5px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: histTab === t.id ? 'var(--c-surface)' : 'transparent', color: histTab === t.id ? 'var(--c-primary)' : 'var(--c-text2)' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Tous les clients</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <div style={{ marginLeft: 'auto' }}>
              <BtnPdf onClick={() => pdfLocations(filteredLoc)} label="⬇ PDF" disabled={filteredLoc.length === 0} />
            </div>
          </div>

          {histTab === 'locations' && (
            <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'var(--c-bg2)' }}>
                    {['Date', 'Client', 'Type', 'Loué', 'Rendu', 'À rendre', ''].map(h => (
                      <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLoc.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune location</td></tr>}
                  {filteredLoc.map((l, i) => {
                    const restant = Math.max(0, (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0));
                    const typeCol = !l.typeCaisse || l.typeCaisse === 'bois' ? 'var(--c-warning)' : 'var(--c-primary)';
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{format(new Date(l.dateLocation), 'dd/MM/yyyy')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.client.nom}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: typeCol }}>{!l.typeCaisse || l.typeCaisse === 'bois' ? '🪵 Bois' : '🧴 Plastique'}</td>
                        <td style={{ padding: '10px 12px' }}><strong>{l.nbCaisses}</strong></td>
                        <td style={{ padding: '10px 12px', color: 'var(--c-success)' }}>{l.nbCaissesRetournees || 0}</td>
                        <td style={{ padding: '10px 12px' }}><strong style={{ color: restant > 0 ? 'var(--c-warning)' : 'var(--c-success)' }}>{restant > 0 ? restant : '✓'}</strong></td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {restant > 0 && (
                              <button onClick={() => setClientRetour(l.client)}
                                style={{ background: 'rgba(46,207,138,.15)', border: '1px solid rgba(46,207,138,.3)', color: 'var(--c-success)', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>↩ Retour</button>
                            )}
                            <button onClick={async () => {
                              if (!confirm('Supprimer cette location ?')) return;
                              try { await locationsApi.delete(l.id); toast.success('Supprimée'); refetch(); }
                              catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
                            }} style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {histTab === 'retours' && (
            <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr style={{ background: 'var(--c-bg2)' }}>
                    {['Date retour', 'Client', 'Type', 'Nb caisses rendues', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRetours.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucun retour enregistré</td></tr>}
                  {filteredRetours.map((r: any, i: number) => {
                    const typeCol = !r.typeCaisse || r.typeCaisse === 'bois' ? 'var(--c-warning)' : 'var(--c-primary)';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--c-success)' }}>↩ {format(new Date(r.dateRetour), 'dd/MM/yyyy')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.client?.nom}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: typeCol }}>{!r.typeCaisse || r.typeCaisse === 'bois' ? '🪵 Bois' : '🧴 Plastique'}</td>
                        <td style={{ padding: '10px 12px' }}><strong style={{ color: 'var(--c-success)', fontSize: 15 }}>+{r.nbRetournees}</strong></td>
                        <td style={{ padding: '10px 12px', color: 'var(--c-text2)', fontSize: 12 }}>{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredRetours.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--c-bg2)', borderTop: '2px solid var(--c-border)' }}>
                      <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13 }}>TOTAL RENDU</td>
                      <td style={{ padding: '10px 12px' }}>
                        <strong style={{ color: 'var(--c-success)', fontSize: 15 }}>+{filteredRetours.reduce((s: number, r: any) => s + (r.nbRetournees || 0), 0)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}

      {clientRetour && (
        <ModalRetour
          client={clientRetour}
          locations={locations || []}
          onClose={() => setClientRetour(null)}
          onSaved={() => { refetch(); if (refetchRetours) refetchRetours(); setClientRetour(null); }}
        />
      )}
    </div>
  );
}
