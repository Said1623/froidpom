import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFetch } from '../../hooks/useFetch';
import { clientsApi } from '../../services';
import { PageHeader, Spinner } from '../../components/ui/UI';
import { BtnPdf } from '../../components/ui/BtnPdf';
import type { Client } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BASE = import.meta.env.VITE_API_URL || 'https://froidpom.onrender.com/api';

function getToken() { return localStorage.getItem('froidpom_token'); }
async function apiVentes(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}/ventes${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

const VILLES_MAROC = [
  'Casablanca','Rabat','Fès','Marrakech','Agadir','Tanger','Meknès','Oujda',
  'Kenitra','Tétouan','Safi','El Jadida','Béni Mellal','Nador','Mohammedia',
  'Khouribga','Settat','Berrechid','Khémisset','Inezgane','Laâyoune','Dakhla',
  'Tiznit','Taroudant','Ouarzazate','Errachidia','Ifrane','Essaouira','Larache',
  'Guelmim','Ksar El Kébir','Taza','Figuig','Al Hoceima','Chefchaouen'
].sort();

const STATUTS = [
  { value: 'en_cours', label: '🔄 En cours', color: 'var(--c-warning)' },
  { value: 'livre', label: '✅ Livré', color: 'var(--c-success)' },
  { value: 'annule', label: '❌ Annulé', color: 'var(--c-danger)' },
  { value: 'en_attente', label: '⏳ En attente', color: 'var(--c-text3)' },
];

function statutLabel(s: string) { return STATUTS.find(x => x.value === s)?.label || s; }
function statutColor(s: string) { return STATUTS.find(x => x.value === s)?.color || 'var(--c-text2)'; }

// ── Modal Édition ─────────────────────────────────────
function ModalVente({ vente, clients, onClose, onSaved }: {
  vente?: any; clients: Client[]; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    clientId: vente?.client?.id ? String(vente.client.id) : '',
    dateVente: vente?.dateVente || today,
    quantiteTonnes: vente?.quantiteTonnes || '',
    villeDestinataire: vente?.villeDestinataire || '',
    typeMarchandise: vente?.typeMarchandise || '',
    prixUnitaire: vente?.prixUnitaire || '',
    transporteur: vente?.transporteur || '',
    statut: vente?.statut || 'en_cours',
    notes: vente?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const montant = (parseFloat(form.quantiteTonnes as string) || 0) * (parseFloat(form.prixUnitaire as string) || 0);

  async function handleSave() {
    if (!form.clientId || !form.dateVente || !form.quantiteTonnes || !form.villeDestinataire)
      return toast.error('Client, date, quantité et ville sont requis');
    setSaving(true);
    try {
      const dto = { ...form, clientId: parseInt(form.clientId), quantiteTonnes: parseFloat(form.quantiteTonnes as string), prixUnitaire: parseFloat(form.prixUnitaire as string) || 0 };
      if (vente?.id) await apiVentes('PUT', `/${vente.id}`, dto);
      else await apiVentes('POST', '', dto);
      toast.success(vente?.id ? 'Vente modifiée' : 'Vente créée');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  const inp = (label: string, field: string, type = 'text', opts?: any) => (
    <div>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</div>
      <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} {...opts}
        style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' as const }} />
    </div>
  );

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 560, padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8edf8' }}>{vente?.id ? '✏ Modifier la vente' : '+ Nouvelle vente'}</div>
          <button onClick={onClose} style={{ background: '#1f2a4a', border: 'none', color: '#8fa3cc', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Client */}
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Client *</div>
            <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none' }}>
              <option value="">-- Sélectionner --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          {inp('Date *', 'dateVente', 'date')}
          {inp('Quantité (Tonnes) *', 'quantiteTonnes', 'number', { min: 0, step: 0.01, placeholder: '0.00' })}

          {/* Ville */}
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Ville destinataire *</div>
            <select value={form.villeDestinataire} onChange={e => setForm({ ...form, villeDestinataire: e.target.value })}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none' }}>
              <option value="">-- Sélectionner une ville --</option>
              {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {inp('Type marchandise', 'typeMarchandise', 'text', { placeholder: 'Pommes, Légumes...' })}
          {inp('Prix unitaire (MAD/T)', 'prixUnitaire', 'number', { min: 0, step: 0.01 })}

          {/* Montant calculé */}
          {montant > 0 && (
            <div style={{ gridColumn: '1/-1', background: 'rgba(46,207,138,.08)', border: '1px solid rgba(46,207,138,.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>Montant total :</span>
              <strong style={{ color: 'var(--c-success)', fontSize: 15 }}>{montant.toLocaleString('fr-FR')} MAD</strong>
            </div>
          )}

          {inp('Transporteur', 'transporteur', 'text', { placeholder: 'Nom du transporteur' })}

          {/* Statut */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Statut</div>
            <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none' }}>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Notes</div>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'var(--c-primary)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '...' : vente?.id ? '✓ Modifier' : '✓ Créer'}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Saisie groupe ─────────────────────────────────────
interface GroupeRow { client: Client; quantite: string; ville: string; type: string; prix: string; selected: boolean; done: boolean; error: string; }

function TabGroupe({ clients, onSaved }: { clients: Client[]; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [dateGroupe, setDateGroupe] = useState(today);
  const [villeGroupe, setVilleGroupe] = useState('');
  const [typeGroupe, setTypeGroupe] = useState('');
  const [prixGroupe, setPrixGroupe] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState<{done:number;total:number}|null>(null);

  const [rows, setRows] = useState<GroupeRow[]>(
    clients.map(c => ({ client: c, quantite: '', ville: '', type: '', prix: '', selected: false, done: false, error: '' }))
  );

  function upd(cid: number, f: keyof GroupeRow, v: any) {
    setRows(p => p.map(r => r.client.id === cid ? { ...r, [f]: v } : r));
  }
  function tog(cid: number) { setRows(p => p.map(r => r.client.id === cid ? { ...r, selected: !r.selected } : r)); }
  function selAll(v: boolean) { setRows(p => p.map(r => r.done ? r : { ...r, selected: v })); }

  function appliquerVille() { setRows(p => p.map(r => r.done ? r : { ...r, ville: villeGroupe })); }
  function appliquerType() { setRows(p => p.map(r => r.done ? r : { ...r, type: typeGroupe })); }
  function appliquerPrix() { setRows(p => p.map(r => r.done ? r : { ...r, prix: prixGroupe })); }

  const selectes = rows.filter(r => r.selected && !r.done && r.quantite && (r.ville || villeGroupe));
  const totalTonnes = selectes.reduce((s, r) => s + (parseFloat(r.quantite) || 0), 0);

  async function confirmer() {
    if (selectes.length === 0) return toast.error('Sélectionner des clients avec quantité et ville');
    setSaving(true); setProgression({ done: 0, total: selectes.length });
    let ok = 0; let err = 0;
    for (let i = 0; i < selectes.length; i++) {
      const row = selectes[i];
      try {
        await apiVentes('POST', '', {
          clientId: row.client.id,
          dateVente: dateGroupe,
          quantiteTonnes: parseFloat(row.quantite),
          villeDestinataire: row.ville || villeGroupe,
          typeMarchandise: row.type || typeGroupe,
          prixUnitaire: parseFloat(row.prix || prixGroupe) || 0,
          statut: 'en_cours',
        });
        upd(row.client.id, 'done', true); ok++;
      } catch (e: any) { upd(row.client.id, 'error', e?.message || 'Erreur'); err++; }
      setProgression({ done: i + 1, total: selectes.length });
    }
    setSaving(false); setProgression(null); onSaved();
    if (err === 0) toast.success(`✓ ${ok} vente(s) créée(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const rowsFiltres = rows.filter(r => r.client.nom.toLowerCase().includes(search.toLowerCase()));
  const s = { background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' };
  const inpS = { background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 6, color: '#e8edf8', padding: '5px 8px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div>
      {/* Barre contrôle groupe */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 600, marginBottom: 12 }}>⚡ Paramètres communs (appliqués à toute la sélection)</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Date</div>
            <input type="date" value={dateGroupe} onChange={e => setDateGroupe(e.target.value)} style={s} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Ville (pour tous)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={villeGroupe} onChange={e => setVilleGroupe(e.target.value)} style={{ ...s, minWidth: 160 }}>
                <option value="">-- Ville --</option>
                {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={appliquerVille} style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Appliquer</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Type marchandise</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={typeGroupe} onChange={e => setTypeGroupe(e.target.value)} placeholder="Pommes..." style={{ ...s, width: 120 }} />
              <button onClick={appliquerType} style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Appliquer</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>Prix/Tonne (MAD)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" value={prixGroupe} onChange={e => setPrixGroupe(e.target.value)} placeholder="0" style={{ ...s, width: 80 }} />
              <button onClick={appliquerPrix} style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Appliquer</button>
            </div>
          </div>
          <button onClick={confirmer} disabled={saving || selectes.length === 0}
            style={{ background: selectes.length > 0 ? 'var(--c-success)' : 'var(--c-surface2)', border: 'none', color: selectes.length > 0 ? '#fff' : 'var(--c-text3)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: selectes.length > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            {saving ? `Création... ${progression?.done}/${progression?.total}` : `✓ Confirmer (${selectes.length}) — ${totalTonnes.toFixed(2)}T`}
          </button>
        </div>
      </div>

      {/* Résumé sélection */}
      {selectes.length > 0 && (
        <div style={{ background: 'rgba(46,207,138,.06)', border: '1px solid rgba(46,207,138,.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--c-success)' }}>{selectes.length} client(s) sélectionné(s)</div>
          <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>Total : <strong style={{ color: 'var(--c-success)' }}>{totalTonnes.toFixed(2)} Tonnes</strong></div>
        </div>
      )}

      {progression && (
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 6 }}>Création... {progression.done}/{progression.total}</div>
          <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 20, background: 'var(--c-success)', width: `${(progression.done / progression.total) * 100}%`, transition: 'width .2s' }} />
          </div>
        </div>
      )}

      <input placeholder="🔍 Rechercher client..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...s, width: 280, marginBottom: 10 }} />

      <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: 'var(--c-bg2)' }}>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)', width: 36 }}>
                <input type="checkbox" checked={rowsFiltres.filter(r => !r.done).every(r => r.selected)} onChange={e => selAll(e.target.checked)} style={{ accentColor: 'var(--c-success)', width: 15, height: 15 }} />
              </th>
              {['Client', 'Quantité (T)', 'Ville destinataire', 'Type', 'Prix/T', 'Montant', ''].map(h => (
                <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsFiltres.map(row => {
              const montant = (parseFloat(row.quantite) || 0) * (parseFloat(row.prix || prixGroupe) || 0);
              if (row.done) return (
                <tr key={row.client.id} style={{ background: 'rgba(46,207,138,.04)', borderBottom: '1px solid var(--c-border)' }}>
                  <td style={{ padding: '10px 12px' }}>✅</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--c-success)' }}>{row.client.nom}</td>
                  <td colSpan={5} style={{ padding: '10px', color: 'var(--c-text3)', fontSize: 12, fontStyle: 'italic' }}>{row.quantite}T → {row.ville || villeGroupe}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => upd(row.client.id, 'done', false)} style={{ background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>↩</button></td>
                </tr>
              );
              return (
                <tr key={row.client.id} style={{ borderBottom: '1px solid var(--c-border)', background: row.selected ? 'rgba(46,207,138,.04)' : '' }}>
                  <td style={{ padding: '7px 12px' }} onClick={() => tog(row.client.id)}>
                    <input type="checkbox" checked={row.selected} onChange={() => tog(row.client.id)} style={{ accentColor: 'var(--c-success)', width: 15, height: 15, cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '7px 8px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => tog(row.client.id)}>{row.client.nom}</td>
                  <td style={{ padding: '5px 6px' }}>
                    <input type="number" min="0" step="0.01" value={row.quantite} onChange={e => upd(row.client.id, 'quantite', e.target.value)} placeholder="0.00"
                      style={{ ...inpS, width: 90, border: `1px solid ${row.quantite ? 'rgba(46,207,138,.5)' : 'rgba(79,142,247,.3)'}` }} />
                  </td>
                  <td style={{ padding: '5px 6px' }}>
                    <select value={row.ville} onChange={e => upd(row.client.id, 'ville', e.target.value)} style={{ ...inpS, width: 150 }}>
                      <option value="">{villeGroupe || '-- Ville --'}</option>
                      {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '5px 6px' }}>
                    <input type="text" value={row.type} onChange={e => upd(row.client.id, 'type', e.target.value)} placeholder={typeGroupe || 'Type...'} style={{ ...inpS, width: 100 }} />
                  </td>
                  <td style={{ padding: '5px 6px' }}>
                    <input type="number" value={row.prix} onChange={e => upd(row.client.id, 'prix', e.target.value)} placeholder={prixGroupe || '0'} style={{ ...inpS, width: 70 }} />
                  </td>
                  <td style={{ padding: '7px 8px', fontWeight: 700, color: montant > 0 ? 'var(--c-accent)' : 'var(--c-text3)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {montant > 0 ? `${montant.toLocaleString('fr-FR')} MAD` : '—'}
                  </td>
                  <td style={{ padding: '5px 8px' }}>
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

// ── PDF ───────────────────────────────────────────────
function exportPDF(ventes: any[], titre = 'Suivi Vente Marchandise') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 22, 40);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(18); doc.setTextColor(79, 142, 247); doc.setFont('helvetica', 'bold');
  doc.text('FROIDPOM', 14, 14);
  doc.setFontSize(8); doc.setTextColor(90, 111, 148); doc.setFont('helvetica', 'normal');
  doc.text('GESTION FRIGORIFIQUE', 14, 20);
  doc.setFontSize(13); doc.setTextColor(232, 237, 248); doc.setFont('helvetica', 'bold');
  doc.text(titre.toUpperCase(), W - 14, 12, { align: 'right' });
  doc.setFontSize(8); doc.setTextColor(90, 111, 148); doc.setFont('helvetica', 'normal');
  doc.text(`Edite le ${new Date().toLocaleDateString('fr-FR')}`, W - 14, 20, { align: 'right' });

  const totalT = ventes.reduce((s, v) => s + (Number(v.quantiteTonnes) || 0), 0);
  const totalM = ventes.reduce((s, v) => s + (Number(v.quantiteTonnes) || 0) * (Number(v.prixUnitaire) || 0), 0);

  let y = 35;
  const kpis = [
    { label: 'NB VENTES', val: String(ventes.length) },
    { label: 'TOTAL TONNES', val: `${totalT.toFixed(2)} T` },
    { label: 'MONTANT TOTAL', val: `${Math.round(totalM).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD` },
  ];
  const kw = (W - 28) / kpis.length;
  kpis.forEach((k, i) => {
    const x = 14 + i * kw;
    doc.setFillColor(240, 243, 250);
    doc.roundedRect(x, y, kw - 3, 18, 2, 2, 'F');
    doc.setFontSize(7); doc.setTextColor(90, 111, 148); doc.setFont('helvetica', 'normal');
    doc.text(k.label, x + 4, y + 6);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 22, 40);
    doc.text(k.val, x + 4, y + 14);
  });

  autoTable(doc, {
    startY: y + 24,
    head: [['Date', 'Client', 'Quantite (T)', 'Ville', 'Type', 'Prix/T', 'Montant', 'Transporteur', 'Statut']],
    body: ventes.map(v => {
      const montant = (Number(v.quantiteTonnes) || 0) * (Number(v.prixUnitaire) || 0);
      return [
        v.dateVente ? new Date(v.dateVente).toLocaleDateString('fr-FR') : '-',
        v.client?.nom || '-',
        (Number(v.quantiteTonnes) || 0).toFixed(2),
        v.villeDestinataire || '-',
        v.typeMarchandise || '-',
        v.prixUnitaire ? `${Number(v.prixUnitaire)} MAD` : '-',
        montant > 0 ? `${Math.round(montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD` : '-',
        v.transporteur || '-',
        v.statut || '-',
      ];
    }),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 22, 40], textColor: [232, 237, 248], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 243, 248);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFontSize(7); doc.setTextColor(90, 111, 148);
    doc.text('Froidpom - Suivi Vente Marchandise', 14, H - 4);
    doc.text(`Page ${i} / ${pages}`, W - 14, H - 4, { align: 'right' });
  }

  doc.save(`froidpom-ventes-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── Page principale ───────────────────────────────────
export default function VentesPage() {
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll());
  const [ventes, setVentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'liste'|'groupe'>('liste');
  const [modal, setModal] = useState<any>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');

  async function loadVentes() {
    setLoading(true);
    try { setVentes(await apiVentes('GET', '')); }
    catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }

  useState(() => { loadVentes(); });

  async function handleDelete(id: number, nom: string) {
    if (!confirm(`Supprimer la vente de ${nom} ?`)) return;
    try { await apiVentes('DELETE', `/${id}`); toast.success('Supprimée'); loadVentes(); }
    catch { toast.error('Erreur'); }
  }

  const filtres = ventes.filter(v => {
    const ms = v.client?.nom?.toLowerCase().includes(search.toLowerCase());
    const mc = filterClient ? v.client?.id === parseInt(filterClient) : true;
    const mv = filterVille ? v.villeDestinataire === filterVille : true;
    const mst = filterStatut ? v.statut === filterStatut : true;
    return ms && mc && mv && mst;
  });

  const totalTonnes = filtres.reduce((s, v) => s + (Number(v.quantiteTonnes) || 0), 0);
  const totalMontant = filtres.reduce((s, v) => s + (Number(v.quantiteTonnes) || 0) * (Number(v.prixUnitaire) || 0), 0);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader title="Suivi Vente Marchandise" subtitle={`${ventes.length} vente(s) enregistrée(s)`} />

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 22 }}>
        {[{ id: 'liste', label: '📋 Liste & Historique' }, { id: 'groupe', label: '⚡ Saisie en groupe' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'var(--c-primary-glow)' : 'transparent', color: tab === t.id ? 'var(--c-primary)' : 'var(--c-text2)', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ LISTE ══ */}
      {tab === 'liste' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total ventes', val: String(filtres.length), color: 'var(--c-primary)' },
              { label: 'Total Tonnes', val: `${totalTonnes.toFixed(2)} T`, color: 'var(--c-warning)' },
              { label: 'Montant total', val: `${Math.round(totalMontant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD`, color: 'var(--c-success)' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Filtres + Actions */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="🔍 Client..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 200 }} />
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Tous clients</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filterVille} onChange={e => setFilterVille(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Toutes villes</option>
              {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Tous statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={() => setModal({})}
              style={{ background: 'var(--c-primary)', border: 'none', color: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle vente
            </button>
            <div style={{ marginLeft: 'auto' }}>
              <BtnPdf onClick={() => exportPDF(filtres)} label="⬇ Exporter PDF" disabled={filtres.length === 0} />
            </div>
          </div>

          {/* Tableau */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--c-bg2)' }}>
                  {['Date', 'Client', 'Quantité', 'Ville', 'Type', 'Prix/T', 'Montant', 'Transporteur', 'Statut', ''].map(h => (
                    <th key={h} style={{ padding: '11px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtres.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune vente</td></tr>}
                {filtres.map((v, i) => {
                  const montant = (Number(v.quantiteTonnes) || 0) * (Number(v.prixUnitaire) || 0);
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                      <td style={{ padding: '10px 10px', fontSize: 13 }}>{v.dateVente ? new Date(v.dateVente).toLocaleDateString('fr-FR') : '-'}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 600 }}>{v.client?.nom}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--c-warning)' }}>{Number(v.quantiteTonnes).toFixed(2)} T</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{v.villeDestinataire}</span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--c-text2)' }}>{v.typeMarchandise || '-'}</td>
                      <td style={{ padding: '10px 10px', color: 'var(--c-text2)' }}>{v.prixUnitaire ? `${Number(v.prixUnitaire)} MAD` : '-'}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--c-accent)', whiteSpace: 'nowrap' }}>
                        {montant > 0 ? `${Math.round(montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD` : '-'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--c-text2)', fontSize: 12 }}>{v.transporteur || '-'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ color: statutColor(v.statut), fontWeight: 600, fontSize: 12 }}>{statutLabel(v.statut)}</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setModal(v)}
                            style={{ background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 6, width: 28, height: 28, fontSize: 13, cursor: 'pointer' }}>✏</button>
                          <button onClick={() => handleDelete(v.id, v.client?.nom)}
                            style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ GROUPE ══ */}
      {tab === 'groupe' && <TabGroupe clients={clients || []} onSaved={loadVentes} />}

      {/* Modal */}
      {modal !== null && (
        <ModalVente vente={modal?.id ? modal : undefined} clients={clients || []}
          onClose={() => setModal(null)} onSaved={() => { loadVentes(); setModal(null); }} />
      )}
    </div>
  );
}
