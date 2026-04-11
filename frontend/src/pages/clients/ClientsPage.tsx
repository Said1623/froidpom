import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfClients } from '../../services/pdfService';
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { clientsApi } from '../../services';
import { Button, Input, PageHeader, Spinner } from '../../components/ui/UI';
import { createPortal } from 'react-dom';
import type { Client } from '../../types';
import toast from 'react-hot-toast';

export default function ClientsPage() {
  const { data: clients, loading, refetch } = useFetch<Client[]>(() => clientsApi.getAll());
  const [modal, setModal] = useState<'create' | 'edit' | 'bulk' | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', email: '' });

  const filtered = clients?.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone || '').includes(search)
  ) || [];

  function openCreate() {
    setForm({ nom: '', telephone: '', adresse: '', email: '' });
    setSelected(null);
    setModal('create');
  }

  function openEdit(c: Client) {
    setForm({ nom: c.nom, telephone: c.telephone || '', adresse: c.adresse || '', email: c.email || '' });
    setSelected(c);
    setModal('edit');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom) return toast.error('Nom requis');
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        await clientsApi.update(selected.id, form);
        toast.success('Client mis à jour');
      } else {
        await clientsApi.create(form);
        toast.success('Client créé');
      }
      setModal(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkImport() {
    const noms = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (noms.length === 0) return toast.error('Aucun nom détecté');
    setSaving(true);
    setBulkProgress({ done: 0, total: noms.length });
    let success = 0; let errors = 0;
    for (let i = 0; i < noms.length; i++) {
      try { await clientsApi.create({ nom: noms[i] }); success++; }
      catch { errors++; }
      setBulkProgress({ done: i + 1, total: noms.length });
    }
    setSaving(false); setBulkProgress(null); setBulkText(''); setModal(null); refetch();
    toast.success(`${success} client(s) importé(s)${errors > 0 ? `, ${errors} erreur(s)` : ''}`);
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const noms = text.split('\n')
        .map(l => l.split(/[,;|\t]/)[0].replace(/"/g, '').trim())
        .filter(l => l.length > 0 && isNaN(Number(l)));
      setBulkText(noms.join('\n'));
      toast.success(`${noms.length} nom(s) détecté(s)`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        title="Clients"
        subtitle={`${filtered.length} client(s)`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPdf onClick={() => pdfClients(filtered)} label="⬇ PDF" disabled={!filtered?.length} />
            <Button variant="secondary" onClick={() => setModal('bulk')}>⚡ Import rapide</Button>
            <Button onClick={openCreate}>+ Nouveau client</Button>
          </div>
        }
      />

      <div style={{ marginBottom: 18 }}>
        <input placeholder="🔍 Rechercher par nom ou téléphone..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '9px 13px', fontSize: 13, outline: 'none', width: 340 }} />
      </div>

      <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--c-bg2)' }}>
              {['Nom', 'Téléphone', 'Adresse', 'Email', 'Statut', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucun client</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--c-border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.nom}</td>
                <td style={{ padding: '11px 14px', color: 'var(--c-text2)' }}>{c.telephone || '—'}</td>
                <td style={{ padding: '11px 14px', color: 'var(--c-text2)', fontSize: 12 }}>{c.adresse || '—'}</td>
                <td style={{ padding: '11px 14px', color: 'var(--c-text2)', fontSize: 12 }}>{c.email || '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ background: c.actif ? 'rgba(46,207,138,.15)' : 'var(--c-surface2)', color: c.actif ? 'var(--c-success)' : 'var(--c-text3)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {c.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>✏ Modifier</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'create' || modal === 'edit') && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, overflowY: 'auto', padding: '20px 16px' }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#0f1628', border: '1px solid rgba(100,140,255,.22)', borderRadius: 16, width: '100%', maxWidth: 480, marginBottom: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(100,140,255,.12)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8edf8', margin: 0 }}>
                {modal === 'create' ? 'Nouveau client' : `Modifier — ${selected?.nom}`}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: '#1f2a4a', border: 'none', color: '#8fa3cc', width: 28, height: 28, borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input label="Nom *" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Nom complet" autoFocus />
                <Input label="Téléphone" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="+213 6 00 00 00 00" />
                <Input label="Adresse" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse complète" />
                <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button variant="secondary" type="button" onClick={() => setModal(null)}>Annuler</Button>
                  <Button type="submit" loading={saving}>Enregistrer</Button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modal === 'bulk' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, overflowY: 'auto', padding: '20px 16px' }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#0f1628', border: '1px solid rgba(100,140,255,.22)', borderRadius: 16, width: '100%', maxWidth: 540, marginBottom: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(100,140,255,.12)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8edf8', margin: 0 }}>⚡ Import rapide de clients</h3>
              <button onClick={() => setModal(null)} style={{ background: '#1f2a4a', border: 'none', color: '#8fa3cc', width: 28, height: 28, borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--c-surface2)', borderRadius: 10, padding: 16, border: '1px dashed var(--c-border2)' }}>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>📁 Importer depuis CSV / Excel</div>
                <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 12 }}>La première colonne sera utilisée comme nom du client.</div>
                <label style={{ display: 'inline-block', background: 'var(--c-primary)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Choisir un fichier
                  <input type="file" accept=".csv,.txt" onChange={handleFileImport} style={{ display: 'none' }} />
                </label>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>✏ Saisir les noms (un par ligne)</div>
                <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
                  placeholder={'Ahmed Benali\nFatima Zahra\nMohamed Kadi\n...'}
                  rows={10}
                  style={{ width: '100%', background: '#161d35', border: '1px solid rgba(100,140,255,.22)', borderRadius: 10, color: '#e8edf8', padding: '10px 13px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 6 }}>
                  {bulkText.split('\n').filter(l => l.trim()).length} nom(s) détecté(s)
                </div>
              </div>

              {bulkProgress && (
                <div style={{ background: 'var(--c-surface2)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 8 }}>Import en cours... {bulkProgress.done} / {bulkProgress.total}</div>
                  <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 20, background: 'var(--c-primary)', width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, transition: 'width .2s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="secondary" type="button" onClick={() => setModal(null)}>Annuler</Button>
                <Button onClick={handleBulkImport} loading={saving} disabled={!bulkText.trim()}>
                  ⚡ Importer ({bulkText.split('\n').filter(l => l.trim()).length})
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
