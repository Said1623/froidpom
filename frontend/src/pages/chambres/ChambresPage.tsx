import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { chambresApi } from '../../services';
import { Button, Input, Modal, PageHeader, Spinner } from '../../components/ui/UI';
import type { Chambre } from '../../types';
import toast from 'react-hot-toast';

export default function ChambresPage() {
  const { data: chambres, loading, refetch } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', capaciteMax: '', description: '', temperatureCible: '' });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.capaciteMax) return toast.error('Nom et capacité requis');
    setSaving(true);
    try {
      await chambresApi.create({
        nom: form.nom,
        capaciteMax: parseInt(form.capaciteMax),
        description: form.description || undefined,
        temperatureCible: form.temperatureCible ? parseFloat(form.temperatureCible) : undefined,
      });
      toast.success('Chambre créée');
      setModal(false);
      setForm({ nom: '', capaciteMax: '', description: '', temperatureCible: '' });
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        title="Chambres froides"
        subtitle={`${chambres?.length || 0} chambre(s) configurée(s)`}
        action={<Button onClick={() => setModal(true)}>+ Nouvelle chambre</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {chambres?.map((c) => (
          <div key={c.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.nom}</h3>
            <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 4 }}>
              Stock : {c.stockActuel} / {c.capaciteMax} caisses
            </div>
            {c.temperatureCible && <div style={{ fontSize: 12, color: 'var(--c-accent)' }}>🌡 {c.temperatureCible}°C</div>}
            <div style={{ marginTop: 12, background: 'var(--c-bg2)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 20, width: `${c.tauxRemplissage}%`, background: 'var(--c-primary)' }} />
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Nouvelle chambre" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Nom *"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Chambre A"
              autoFocus
            />
            <Input
              label="Capacité max (caisses) *"
              type="number"
              min="1"
              value={form.capaciteMax}
              onChange={(e) => setForm({ ...form, capaciteMax: e.target.value })}
              placeholder="500"
            />
            <Input
              label="Température cible (°C)"
              type="number"
              step="0.1"
              value={form.temperatureCible}
              onChange={(e) => setForm({ ...form, temperatureCible: e.target.value })}
              placeholder="-2"
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description optionnelle"
            />
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