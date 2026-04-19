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
    statut: vente?.statut || 'livre',
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
function TabGroupe({ clients, onSaved }: { clients: Client[]; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0];

  // Champs communs
  const [date, setDate] = useState(today);
  const [quantite, setQuantite] = useState('');
  const [ville, setVille] = useState('');
  const [type, setType] = useState('Pomme fruits');

  // Sélection clients
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState<{done:number;total:number}|null>(null);
  const [dones, setDones] = useState<Set<number>>(new Set());

  const clientsFiltres = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase())
  );

  function tog(id: number) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selAll() {
    const ids = clientsFiltres.filter(c => !dones.has(c.id)).map(c => c.id);
    setSelected(new Set(ids));
  }

  function deselAll() { setSelected(new Set()); }

  const selectes = clients.filter(c => selected.has(c.id));
  const totalTonnes = selectes.length * (parseFloat(quantite) || 0);

  function reset() {
    setSelected(new Set());
    setDones(new Set());
    setQuantite('');
    setVille('');
    setType('Pomme fruits');
    setDate(today);
  }

  async function confirmer() {
    if (selected.size === 0) return toast.error('Sélectionner au moins un client');
    if (!quantite) return toast.error('Saisir la quantité en tonnes');
    if (!ville) return toast.error('Sélectionner une ville');

    setSaving(true);
    setProgression({ done: 0, total: selectes.length });
    let ok = 0; let err = 0;

    for (let i = 0; i < selectes.length; i++) {
      const c = selectes[i];
      try {
        await apiVentes('POST', '', {
          clientId: c.id,
          dateVente: date,
          quantiteTonnes: parseFloat(quantite),
          villeDestinataire: ville,
          typeMarchandise: type,
          statut: 'livre',
        });
        setDones(prev => new Set([...prev, c.id]));
        ok++;
      } catch { err++; }
      setProgression({ done: i + 1, total: selectes.length });
    }

    setSaving(false);
    setProgression(null);
    setSelected(new Set());
    onSaved();
    if (err === 0) toast.success(`✓ ${ok} vente(s) créée(s)`);
    else toast.error(`${ok} OK, ${err} erreur(s)`);
  }

  const s = { background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

      {/* ── Colonne gauche : sélection clients ── */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
          1. Sélectionner les clients
        </div>

        {/* Barre recherche + actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...s, flex: 1 }} />
          <button onClick={selAll} style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--c-primary)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✓ Tout sélectionner
          </button>
          <button onClick={deselAll} style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', color: 'var(--c-text2)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            ✕ Vider
          </button>
        </div>

        {/* Info sélection */}
        <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 8 }}>
          <strong style={{ color: 'var(--c-primary)' }}>{selected.size}</strong> client(s) sélectionné(s) sur {clients.length}
        </div>

        {/* Liste clients */}
        <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden', maxHeight: 480, overflowY: 'auto' }}>
          {clientsFiltres.map((c, i) => {
            const isSel = selected.has(c.id);
            const isDone = dones.has(c.id);
            return (
              <div key={c.id}
                onClick={() => !isDone && tog(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isDone ? 'rgba(46,207,138,.06)' : isSel ? 'rgba(79,142,247,.08)' : i % 2 === 0 ? '' : 'rgba(255,255,255,.01)',
                  borderBottom: '1px solid var(--c-border)',
                  cursor: isDone ? 'default' : 'pointer',
                  transition: 'background .1s',
                  borderLeft: `3px solid ${isDone ? 'var(--c-success)' : isSel ? 'var(--c-primary)' : 'transparent'}`,
                }}>
                <input type="checkbox" checked={isSel || isDone} disabled={isDone}
                  onChange={() => tog(c.id)}
                  style={{ width: 15, height: 15, accentColor: isDone ? 'var(--c-success)' : 'var(--c-primary)', cursor: 'pointer' }} />
                <span style={{ fontWeight: isSel ? 700 : 500, fontSize: 13, flex: 1, color: isDone ? 'var(--c-success)' : 'var(--c-text)' }}>
                  {c.nom}
                </span>
                {isDone && <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 600 }}>✓ Créé</span>}
              </div>
            );
          })}
          {clientsFiltres.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--c-text3)' }}>Aucun client trouvé</div>
          )}
        </div>
      </div>

      {/* ── Colonne droite : formulaire ── */}
      <div style={{ position: 'sticky', top: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
          2. Saisir les informations
        </div>

        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', borderRadius: 14, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Date */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Date</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>

          {/* Quantité */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Quantité (Tonnes) *</div>
            <input type="number" min="0" step="0.01" value={quantite} onChange={e => setQuantite(e.target.value)} placeholder="0.00"
              style={{ background: '#161d35', border: `1px solid ${quantite ? 'rgba(245,166,35,.6)' : 'rgba(79,142,247,.3)'}`, borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 15, fontWeight: 700, width: '100%', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>

          {/* Ville */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Ville destinataire *</div>
            <select value={ville} onChange={e => setVille(e.target.value)}
              style={{ background: '#161d35', border: `1px solid ${ville ? 'rgba(79,142,247,.6)' : 'rgba(79,142,247,.3)'}`, borderRadius: 8, color: ville ? '#e8edf8' : '#8fa3cc', padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none' }}>
              <option value="">-- Sélectionner une ville --</option>
              {VILLES_MAROC.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Type marchandise */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Type de marchandise</div>
            <input type="text" value={type} onChange={e => setType(e.target.value)}
              style={{ background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>

          {/* Résumé */}
          {selected.size > 0 && quantite && (
            <div style={{ background: 'rgba(46,207,138,.08)', border: '1px solid rgba(46,207,138,.2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 4 }}>Résumé :</div>
              <div style={{ fontWeight: 700, color: 'var(--c-success)', fontSize: 15 }}>{selected.size} clients × {quantite} T</div>
              <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>= <strong style={{ color: 'var(--c-warning)' }}>{totalTonnes.toFixed(2)} Tonnes</strong> au total</div>
              {ville && <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 4 }}>→ {ville} · {type}</div>}
            </div>
          )}

          {/* Progression */}
          {progression && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 6 }}>Création {progression.done}/{progression.total}...</div>
              <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 8 }}>
                <div style={{ height: '100%', borderRadius: 20, background: 'var(--c-success)', width: `${(progression.done / progression.total) * 100}%`, transition: 'width .2s' }} />
              </div>
            </div>
          )}

          {/* Boutons */}
          <button onClick={confirmer} disabled={saving || selected.size === 0 || !quantite || !ville}
            style={{
              background: selected.size > 0 && quantite && ville ? 'var(--c-success)' : 'var(--c-surface2)',
              border: 'none', color: selected.size > 0 && quantite && ville ? '#fff' : 'var(--c-text3)',
              borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700,
              cursor: selected.size > 0 && quantite && ville ? 'pointer' : 'not-allowed', width: '100%',
            }}>
            {saving ? `Création... ${progression?.done}/${progression?.total}` : `✓ Créer ${selected.size} vente(s)`}
          </button>

          <button onClick={reset} style={{ background: 'transparent', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 10, padding: '8px 0', fontSize: 12, cursor: 'pointer', width: '100%' }}>
            ↺ Réinitialiser
          </button>
        </div>
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
    head: [['Date', 'Client', 'Quantite (T)', 'Ville', 'Type', 'Statut']],
    body: ventes.map(v => [
      v.dateVente ? new Date(v.dateVente).toLocaleDateString('fr-FR') : '-',
      v.client?.nom || '-',
      (Number(v.quantiteTonnes) || 0).toFixed(2),
      v.villeDestinataire || '-',
      v.typeMarchandise || '-',
      v.statut || 'livre',
    ]),
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
                  {['Date', 'Client', 'Quantité', 'Ville', 'Type', 'Statut', ''].map(h => (
                    <th key={h} style={{ padding: '11px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtres.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune vente</td></tr>}
                {filtres.map((v, i) => {
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                      <td style={{ padding: '10px 10px', fontSize: 13 }}>{v.dateVente ? new Date(v.dateVente).toLocaleDateString('fr-FR') : '-'}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 600 }}>{v.client?.nom}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--c-warning)' }}>{Number(v.quantiteTonnes).toFixed(2)} T</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{v.villeDestinataire}</span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--c-text2)' }}>{v.typeMarchandise || '-'}</td>
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
