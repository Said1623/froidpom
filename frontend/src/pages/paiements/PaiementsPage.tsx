import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfPaiements } from '../../services/pdfService';
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { paiementsApi, clientsApi, reservationsApi } from '../../services';
import { Button, PageHeader, Select, StatCard, Spinner } from '../../components/ui/UI';
import type { Paiement, Client, Reservation } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

const MODES = [
  { value: 'especes', label: '💵 Espèces' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'cheque', label: '📄 Chèque' },
  { value: 'carte', label: '💳 Carte' },
];

function fmt(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const sInp = {
  background: '#161d35',
  border: '1px solid rgba(79,142,247,.3)',
  borderRadius: 8,
  color: '#e8edf8',
  padding: '9px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

// ── Modal paiement individuel ──────────────────────────
function ModalPaiement({ clients, onClose, onSaved }: {
  clients: Client[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    clientId: '', datePaiement: today, montant: '',
    modePaiement: 'especes', reference: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.montant) return toast.error('Client et montant requis');
    setSaving(true);
    try {
      await paiementsApi.create({
        clientId: parseInt(form.clientId),
        datePaiement: form.datePaiement,
        montant: parseFloat(form.montant),
        modePaiement: form.modePaiement,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Paiement enregistré');
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally { setSaving(false); }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 480, padding: '24px 28px', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8edf8' }}>+ Nouveau paiement</div>
          <button onClick={onClose} style={{ background: '#1f2a4a', border: 'none', color: '#8fa3cc', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Client */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Client *</div>
            <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} style={sInp}>
              <option value="">-- Sélectionner --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          {/* Date */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Date *</div>
            <input type="date" value={form.datePaiement} onChange={e => setForm({ ...form, datePaiement: e.target.value })} style={sInp} />
          </div>
          {/* Montant */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Montant (Dh) *</div>
            <input type="number" min="0.01" step="0.01" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} placeholder="0.00" style={sInp} />
          </div>
          {/* Mode */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Mode de paiement</div>
            <select value={form.modePaiement} onChange={e => setForm({ ...form, modePaiement: e.target.value })} style={sInp}>
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {/* Référence */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Référence</div>
            <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="N° chèque, virement..." style={sInp} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ background: 'var(--c-success)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '...' : '✓ Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

// ── Saisie groupe paiements ────────────────────────────
interface GroupeRow { client: Client; montant: string; mode: string; reference: string; selected: boolean; done: boolean; error: string; }

function TabGroupe({ clients, onSaved }: { clients: Client[]; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [modeGroupe, setModeGroupe] = useState('especes');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState<{ done: number; total: number } | null>(null);

  const [rows, setRows] = useState<GroupeRow[]>(
    clients.map(c => ({ client: c, montant: '', mode: 'especes', reference: '', selected: false, done: false, error: '' }))
  );

  function upd(cid: number, f: keyof GroupeRow, v: any) {
    setRows(p => p.map(r => r.client.id === cid ? { ...r, [f]: v } : r));
  }
  function tog(cid: number) {
    setRows(p => p.map(r => r.client.id === cid && !r.done ? { ...r, selected: !r.selected } : r));
  }
  function selAll() {
    const filtres = rowsFiltres.filter(r => !r.done && r.montant);
    setRows(p => p.map(r => filtres.find(f => f.client.id === r.client.id) ? { ...r, selected: true } : r));
  }
  function deselAll() { setRows(p => p.map(r => ({ ...r, selected: false }))); }
  function appliquerMode() { setRows(p => p.map(r => r.done ? r : { ...r, mode: modeGroupe })); }
  function reset() {
    setRows(clients.map(c => ({ client: c, montant: '', mode: 'especes', reference: '', selected: false, done: false, error: '' })));
  }

  const rowsFiltres = rows.filter(r => r.client.nom.toLowerCase().includes(search.toLowerCase()));
  const selectes = rows.filter(r => r.selected && !r.done && r.montant);
  const totalMontant = selectes.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0);

  async function confirmer() {
    if (selectes.length === 0) return toast.error('Sélectionner des clients avec montant');
    setSaving(true); setProgression({ done: 0, total: selectes.length });
    let ok = 0; let err = 0;
    for (let i = 0; i < selectes.length; i++) {
      const row = selectes[i];
      try {
        await paiementsApi.create({
          clientId: row.client.id,
          datePaiement: date,
          montant: parseFloat(row.montant),
          modePaiement: row.mode || modeGroupe,
          reference: row.reference || undefined,
        });
        upd(row.client.id, 'done', true); ok++;
      } catch (e: any) { upd(row.client.id, 'error', e?.response?.data?.message || 'Erreur'); err++; }
      setProgression({ done: i + 1, total: selectes.length });
    }
    setSaving(false); setProgression(null); onSaved();
    if (err === 0) toast.success(`✓ ${ok} paiement(s) enregistré(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const sF = { background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' };
  const sI = { background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 6, color: '#e8edf8', padding: '5px 8px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div>
      {/* Barre paramètres communs */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 600, marginBottom: 12 }}>⚡ Paramètres communs</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Date</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={sF} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Mode (pour tous)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={modeGroupe} onChange={e => setModeGroupe(e.target.value)} style={sF}>
                {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button onClick={appliquerMode} style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Appliquer</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={reset} style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', color: 'var(--c-text2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>↺ Réinitialiser</button>
            <button onClick={confirmer} disabled={saving || selectes.length === 0}
              style={{ background: selectes.length > 0 ? 'var(--c-success)' : 'var(--c-surface2)', border: 'none', color: selectes.length > 0 ? '#fff' : 'var(--c-text3)', borderRadius: 10, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: selectes.length > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              {saving ? `Enregistrement... ${progression?.done}/${progression?.total}` : `✓ Valider (${selectes.length}) — ${fmt(totalMontant)} Dh`}
            </button>
          </div>
        </div>
      </div>

      {/* Résumé sélection */}
      {selectes.length > 0 && (
        <div style={{ background: 'rgba(46,207,138,.06)', border: '1px solid rgba(46,207,138,.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 24 }}>
          <div style={{ fontWeight: 700, color: 'var(--c-success)' }}>{selectes.length} client(s)</div>
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Total : <strong style={{ color: 'var(--c-success)', fontSize: 15 }}>{fmt(totalMontant)} Dh</strong></div>
        </div>
      )}

      {progression && (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 6 }}>Enregistrement {progression.done}/{progression.total}...</div>
          <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 8 }}>
            <div style={{ height: '100%', borderRadius: 20, background: 'var(--c-success)', width: `${(progression.done / progression.total) * 100}%`, transition: 'width .2s' }} />
          </div>
        </div>
      )}

      {/* Filtres + actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <input placeholder="🔍 Rechercher client..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...sF, width: 260 }} />
        <button onClick={selAll} style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Tout sélectionner</button>
        <button onClick={deselAll} style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', color: 'var(--c-text2)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>✕ Vider</button>
        <div style={{ fontSize: 12, color: 'var(--c-text2)', marginLeft: 8 }}>
          <strong style={{ color: 'var(--c-primary)' }}>{rows.filter(r => r.selected).length}</strong> sélectionné(s)
        </div>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: 'var(--c-bg2)' }}>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)', width: 36 }}>
                <input type="checkbox"
                  checked={rowsFiltres.filter(r => !r.done).length > 0 && rowsFiltres.filter(r => !r.done).every(r => r.selected)}
                  onChange={e => e.target.checked ? selAll() : deselAll()}
                  style={{ width: 15, height: 15, accentColor: 'var(--c-success)', cursor: 'pointer' }} />
              </th>
              {['Client', 'Montant (Dh) *', 'Mode', 'Référence', ''].map(h => (
                <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsFiltres.map((row, i) => {
              if (row.done) return (
                <tr key={row.client.id} style={{ background: 'rgba(46,207,138,.05)', borderBottom: '1px solid var(--c-border)', borderLeft: '3px solid var(--c-success)' }}>
                  <td style={{ padding: '10px 12px' }}>✅</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--c-success)' }}>{row.client.nom}</td>
                  <td colSpan={3} style={{ padding: '10px', color: 'var(--c-text3)', fontSize: 12, fontStyle: 'italic' }}>
                    {fmt(parseFloat(row.montant))} Dh · {MODES.find(m => m.value === row.mode)?.label}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => upd(row.client.id, 'done', false)} style={{ background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>↩</button>
                  </td>
                </tr>
              );
              return (
                <tr key={row.client.id}
                  style={{ borderBottom: '1px solid var(--c-border)', background: row.selected ? 'rgba(79,142,247,.06)' : i % 2 === 0 ? '' : 'rgba(255,255,255,.01)', borderLeft: `3px solid ${row.selected ? 'var(--c-primary)' : 'transparent'}` }}>
                  <td style={{ padding: '7px 12px' }} onClick={() => tog(row.client.id)}>
                    <input type="checkbox" checked={row.selected} onChange={() => tog(row.client.id)}
                      style={{ width: 15, height: 15, accentColor: 'var(--c-primary)', cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '7px 10px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => tog(row.client.id)}>
                    {row.client.nom}
                  </td>
                  <td style={{ padding: '5px 8px' }}>
                    <input type="number" min="0" step="0.01" value={row.montant}
                      onChange={e => { upd(row.client.id, 'montant', e.target.value); if (e.target.value && !row.selected) upd(row.client.id, 'selected', true); }}
                      onFocus={e => e.target.select()}
                      placeholder="0.00"
                      style={{ ...sI, width: 110, border: `1px solid ${row.montant ? 'rgba(46,207,138,.5)' : 'rgba(79,142,247,.3)'}`, fontWeight: row.montant ? 700 : 400 }} />
                  </td>
                  <td style={{ padding: '5px 8px' }}>
                    <select value={row.mode} onChange={e => upd(row.client.id, 'mode', e.target.value)} style={{ ...sI, width: 130 }}>
                      {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '5px 8px' }}>
                    <input type="text" value={row.reference} onChange={e => upd(row.client.id, 'reference', e.target.value)}
                      placeholder="Réf..." style={{ ...sI, width: 120 }} />
                  </td>
                  <td style={{ padding: '7px 8px' }}>
                    {row.error && <span style={{ fontSize: 10, color: 'var(--c-danger)' }}>⚠ {row.error}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────
export default function PaiementsPage() {
  const { data: paiements, loading, refetch } = useFetch<Paiement[]>(() => paiementsApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll());
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const [tab, setTab] = useState<'liste' | 'groupe'>('liste');
  const [modal, setModal] = useState(false);
  const [filterClient, setFilterClient] = useState('');

  const totalPaye = paiements?.reduce((s, p) => s + Number(p.montant), 0) || 0;
  const totalReservations = reservations?.reduce((s, r) => {
    const bois  = (Number((r as any).nbCaissesBois) || 0) * (Number((r as any).prixUnitaireBois) || 0);
    const plast = (Number((r as any).nbCaissesPластique) || 0) * (Number((r as any).prixUnitairePlastique) || 0);
    const tran  = (Number((r as any).nbCaissesTranger) || 0) * (Number((r as any).prixUnitaireTranger) || 0);
    return s + bois + plast + tran;
  }, 0) || 0;
  const resteAPayer = Math.max(0, totalReservations - totalPaye);

  const filtered = filterClient
    ? paiements?.filter(p => p.client.id === parseInt(filterClient)) || []
    : paiements || [];

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce paiement ?')) return;
    try { await paiementsApi.delete(id); toast.success('Supprimé'); refetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader title="Paiements" subtitle="Suivi des encaissements"
        action={<Button onClick={() => setModal(true)}>+ Nouveau paiement</Button>} />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { icon: '✓', label: 'Total encaissé', val: `${fmt(totalPaye)} Dh`, color: 'var(--c-success)' },
          { icon: '≡', label: 'Montant réservations', val: `${fmt(totalReservations)} Dh`, color: 'var(--c-primary)' },
          { icon: '!', label: 'Reste à percevoir', val: `${fmt(resteAPayer)} Dh`, color: resteAPayer > 0 ? 'var(--c-warning)' : 'var(--c-success)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[{ id: 'liste', label: '📋 Liste' }, { id: 'groupe', label: '⚡ Saisie groupe' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'var(--c-primary-glow)' : 'transparent', color: tab === t.id ? 'var(--c-primary)' : 'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ LISTE ══ */}
      {tab === 'liste' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Tous les clients</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <BtnPdf onClick={() => pdfPaiements(filtered, totalReservations)} label="⬇ Exporter PDF" disabled={!filtered.length} />
          </div>

          {/* Tableau récap par client */}
          {!filterClient && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 10 }}>📊 Récapitulatif par client</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-bg2)' }}>
                      {['Client', 'Réservé', 'Encaissé', 'Reste à encaisser'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(clients || []).map((c, i) => {
                      const resaClient = (reservations || []).filter(r => (r as any).client?.id === c.id || (r as any).client_id === c.id);
                      const montantResa = resaClient.reduce((s, r) => {
                        const bois  = (Number((r as any).nbCaissesBois) || 0) * (Number((r as any).prixUnitaireBois) || 0);
                        const plast = (Number((r as any).nbCaissesPластique) || 0) * (Number((r as any).prixUnitairePlastique) || 0);
                        const tran  = (Number((r as any).nbCaissesTranger) || 0) * (Number((r as any).prixUnitaireTranger) || 0);
                        return s + bois + plast + tran;
                      }, 0);
                      const paiementsClient = (paiements || []).filter(p => p.client.id === c.id);
                      const montantEncaisse = paiementsClient.reduce((s, p) => s + Number(p.montant), 0);
                      const reste = Math.max(0, montantResa - montantEncaisse);
                      if (montantResa === 0 && montantEncaisse === 0) return null;
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{c.nom}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--c-primary)', fontWeight: 600 }}>
                            {montantResa > 0 ? `${fmt(montantResa)} Dh` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--c-success)', fontWeight: 700 }}>
                            {montantEncaisse > 0 ? `${fmt(montantEncaisse)} Dh` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {reste > 0
                              ? <span style={{ color: 'var(--c-danger)', fontWeight: 700 }}>{fmt(reste)} Dh</span>
                              : montantEncaisse > 0
                                ? <span style={{ color: 'var(--c-success)', fontSize: 12 }}>✓ Soldé</span>
                                : <span style={{ color: 'var(--c-text3)' }}>—</span>}
                          </td>
                        </tr>
                      );
                    }).filter(Boolean)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historique paiements */}
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 10 }}>
            {filterClient ? `Paiements — ${clients?.find(c => c.id === parseInt(filterClient))?.nom}` : '📋 Historique des paiements'}
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-bg2)' }}>
                  {['Date', 'Client', 'Montant', 'Mode', 'Référence', ''].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucun paiement</td></tr>}
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13 }}>{format(new Date(p.datePaiement), 'dd/MM/yyyy')}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{p.client.nom}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <strong style={{ color: 'var(--c-success)', fontSize: 15 }}>{fmt(Number(p.montant))} Dh</strong>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {MODES.find(m => m.value === p.modePaiement)?.label || p.modePaiement}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--c-text2)' }}>{p.reference || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => handleDelete(p.id)}
                        style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ GROUPE ══ */}
      {tab === 'groupe' && <TabGroupe clients={clients || []} onSaved={refetch} />}

      {/* Modal individuel */}
      {modal && <ModalPaiement clients={clients || []} onClose={() => setModal(false)} onSaved={refetch} />}
    </div>
  );
}
