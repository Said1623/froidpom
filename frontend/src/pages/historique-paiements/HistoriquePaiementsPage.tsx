import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { paiementsApi, clientsApi } from '../../services';
import { PageHeader, Spinner } from '../../components/ui/UI';
import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfPaiements } from '../../services/pdfService';
import type { Paiement, Client } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const MODES = [
  { value: 'especes', label: '💵 Espèces' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'cheque', label: '📄 Chèque' },
  { value: 'carte', label: '💳 Carte' },
];

function fmt(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function HistoriquePaiementsPage() {
  const { data: paiements, loading, refetch } = useFetch<Paiement[]>(() => paiementsApi.getAll());
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);

  const [filterClient, setFilterClient] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [search, setSearch] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const paiementsCampagne = (paiements || []).filter(p => isInCampagne(p.datePaiement));

  const filtered = paiementsCampagne.filter(p => {
    const mc = filterClient ? p.client.id === parseInt(filterClient) : true;
    const mm = filterMode ? p.modePaiement === filterMode : true;
    const ms = search ? p.client.nom.toLowerCase().includes(search.toLowerCase()) : true;
    const md = dateDebut ? new Date(p.datePaiement) >= new Date(dateDebut) : true;
    const mf = dateFin ? new Date(p.datePaiement) <= new Date(dateFin) : true;
    return mc && mm && ms && md && mf;
  });

  const totalFiltre = filtered.reduce((s, p) => s + Number(p.montant), 0);

  async function handleDelete(id: number, nom: string) {
    if (!confirm(`Supprimer le paiement de ${nom} ?`)) return;
    try { await paiementsApi.delete(id); toast.success('Supprimé'); refetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
  }

  const sF = { background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        title="Historique des paiements"
        subtitle={`Campagne ${campagneActive} — ${filtered.length} paiement(s)`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Nb paiements', val: String(filtered.length), color: 'var(--c-primary)' },
          { label: 'Total encaissé', val: `${fmt(totalFiltre)} Dh`, color: 'var(--c-success)' },
          { label: 'Moyenne / paiement', val: filtered.length > 0 ? `${fmt(totalFiltre / filtered.length)} Dh` : '—', color: 'var(--c-warning)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Client..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...sF, width: 200 }} />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={sF}>
          <option value="">Tous les clients</option>
          {clients?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={sF}>
          <option value="">Tous les modes</option>
          {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>Du</span>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={sF} />
          <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>Au</span>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={sF} />
        </div>
        {(search || filterClient || filterMode || dateDebut || dateFin) && (
          <button onClick={() => { setSearch(''); setFilterClient(''); setFilterMode(''); setDateDebut(''); setDateFin(''); }}
            style={{ background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            ✕ Réinitialiser
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <BtnPdf onClick={() => pdfPaiements(filtered, totalFiltre)} label="⬇ Exporter PDF" disabled={!filtered.length} />
        </div>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--c-bg2)' }}>
              {['Date', 'Client', 'Montant', 'Mode', 'Référence', 'Notes', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>
                Aucun paiement pour la campagne {campagneActive}
              </td></tr>
            )}
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
                <td style={{ padding: '11px 14px', color: 'var(--c-text2)', fontSize: 12 }}>{(p as any).reference || '—'}</td>
                <td style={{ padding: '11px 14px', color: 'var(--c-text2)', fontSize: 12, maxWidth: 200 }}>{(p as any).notes || '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <button onClick={() => handleDelete(p.id, p.client.nom)}
                    style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--c-bg2)', borderTop: '2px solid var(--c-border)' }}>
                <td colSpan={2} style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13 }}>TOTAL</td>
                <td style={{ padding: '12px 14px' }}>
                  <strong style={{ color: 'var(--c-success)', fontSize: 16 }}>{fmt(totalFiltre)} Dh</strong>
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
