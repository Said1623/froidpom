import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfPaiements } from '../../services/pdfService';
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { paiementsApi, clientsApi, reservationsApi } from '../../services';
import { Button, Card, Input, Modal, PageHeader, Select, StatCard, Table, Spinner } from '../../components/ui/UI';
import type { Paiement, Client, Reservation } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import styles from './PaiementsPage.module.css';

const MODES = [
  { value: 'especes', label: '💵 Espèces' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'cheque', label: '📄 Chèque' },
  { value: 'carte', label: '💳 Carte' },
];

export default function PaiementsPage() {
  const { data: paiements, loading, refetch } = useFetch<Paiement[]>(() => paiementsApi.getAll());
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll());
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [form, setForm] = useState({
    clientId: '',
    datePaiement: new Date().toISOString().split('T')[0],
    montant: '',
    modePaiement: 'especes',
    reference: '',
    notes: '',
  });

  const totalPaye = paiements?.reduce((s, p) => s + Number(p.montant), 0) || 0;
  const totalReservations = reservations?.reduce((s, r) => s + Number(r.montantTotal), 0) || 0;
  const resteAPayer = Math.max(0, totalReservations - totalPaye);

  const filtered = filterClient
    ? paiements?.filter((p) => p.client.id === parseInt(filterClient)) || []
    : paiements || [];

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
      setModal(false);
      setForm({ clientId: '', datePaiement: new Date().toISOString().split('T')[0], montant: '', modePaiement: 'especes', reference: '', notes: '' });
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'datePaiement', label: 'Date', render: (p: Paiement) => format(new Date(p.datePaiement), 'dd/MM/yyyy') },
    { key: 'client', label: 'Client', render: (p: Paiement) => <strong>{p.client.nom}</strong> },
    { key: 'montant', label: 'Montant', render: (p: Paiement) => (
      <strong style={{ color: 'var(--c-success)', fontSize: 15 }}>{Number(p.montant).toLocaleString('fr-FR')} €</strong>
    )},
    { key: 'mode', label: 'Mode', render: (p: Paiement) => {
      const m = MODES.find((m) => m.value === p.modePaiement);
      return <span className="badge badge-primary">{m?.label || p.modePaiement}</span>;
    }},
    { key: 'reference', label: 'Référence', render: (p: Paiement) => p.reference || '—' },
    { key: 'del', label: '', render: (p: Paiement) => (
      <Button variant="danger" size="sm" onClick={async () => {
        if (!confirm('Supprimer ce paiement ?')) return;
        try { await paiementsApi.delete(p.id); toast.success('Supprimé'); refetch(); }
        catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
      }}>✕</Button>
    )},
  ];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        title="Paiements"
        subtitle="Suivi des encaissements"
        action={<Button onClick={() => setModal(true)}>+ Nouveau paiement</Button>}
      />

      <div className={styles.kpis}>
        <StatCard icon="✓" label="Total encaissé" value={`${totalPaye.toLocaleString('fr-FR')} €`} color="success" />
        <StatCard icon="≡" label="Montant réservations" value={`${totalReservations.toLocaleString('fr-FR')} €`} color="primary" />
        <StatCard icon="!" label="Reste à percevoir" value={`${resteAPayer.toLocaleString('fr-FR')} €`}
          color={resteAPayer > 0 ? 'warning' : 'success'} />
      </div>

      <div className={styles.filters} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Select
          label=""
          value={filterClient}
          onChange={(v) => setFilterClient(v)}
          options={(clients || []).map((c) => ({ value: c.id, label: c.nom }))}
          placeholder="Tous les clients"
        />
        <BtnPdf onClick={() => pdfPaiements(filtered||[], totalReservations)} label="⬇ Exporter PDF" disabled={!filtered?.length} />
      </div>

      <Table columns={columns} rows={filtered} />

      {modal && (
        <Modal title="Nouveau paiement" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Select label="Client *" value={form.clientId} onChange={(v) => setForm({ ...form, clientId: v })}
              options={(clients || []).map((c) => ({ value: c.id, label: c.nom }))} placeholder="Sélectionner un client" />
            <Input label="Date *" type="date" value={form.datePaiement}
              onChange={(e) => setForm({ ...form, datePaiement: e.target.value })} />
            <Input label="Montant (€) *" type="number" min="0.01" step="0.01" value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="0.00" />
            <Select label="Mode de paiement" value={form.modePaiement} onChange={(v) => setForm({ ...form, modePaiement: v })}
              options={MODES} />
            <Input label="Référence" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="N° chèque, virement..." />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Button variant="secondary" type="button" onClick={() => setModal(false)}>Annuler</Button>
              <Button type="submit" loading={saving}>Enregistrer</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
