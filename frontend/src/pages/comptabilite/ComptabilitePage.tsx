import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFetch } from '../../hooks/useFetch';
import { dashboardApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BASE = import.meta.env.VITE_API_URL || 'https://froidpom.onrender.com/api';
function getToken() { return localStorage.getItem('froidpom_token'); }
async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await res.json().catch(() => ({}));
  return res.json();
}

function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR'); }
function fdate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }

const CATEGORIES = [
  { value: 'salaire',    label: 'Salaire employé',         icone: '👤' },
  { value: 'entretien',  label: 'Entretien',               icone: '🔧' },
  { value: 'electricite',label: 'Électricité',             icone: '⚡' },
  { value: 'eau',        label: 'Eau',                     icone: '💧' },
  { value: 'lavage',     label: 'Lavage & réparation',     icone: '🧺' },
  { value: 'assurance',  label: 'Assurance',               icone: '🛡' },
  { value: 'impots',     label: 'Impôts',                  icone: '🏛' },
  { value: 'comptable',  label: 'Comptable',               icone: '📒' },
  { value: 'banque',     label: 'Banque',                  icone: '🏦' },
  { value: 'autre',      label: 'Autre',                   icone: '📌' },
];

const PERIODICITES = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'annuel',  label: 'Annuel' },
  { value: 'unique',  label: 'Ponctuel' },
];

const STATUT_CONFIG = {
  solde:   { label: '✅ Soldé',    color: 'var(--c-success)', bg: 'rgba(46,207,138,.12)'  },
  partiel: { label: '🟡 Partiel',  color: '#f5a623',           bg: 'rgba(245,166,35,.12)'  },
  impaye:  { label: '🔴 Impayé',   color: 'var(--c-danger)',   bg: 'rgba(240,90,90,.12)'   },
};

// ── Modal Charge ───────────────────────────────────────
function ModalCharge({ charge, campagne, onClose, onSaved }: { charge?: any; campagne: string; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!charge?.id;
  const cat = CATEGORIES.find(c => c.value === charge?.categorie) || CATEGORIES[0];
  const [form, setForm] = useState({
    libelle: charge?.libelle || '',
    categorie: charge?.categorie || 'salaire',
    icone: charge?.icone || cat.icone,
    montantTotal: charge?.montantTotal ? String(charge.montantTotal) : '',
    periodicite: charge?.periodicite || 'unique',
    dateEcheance: charge?.dateEcheance || '',
    notes: charge?.notes || '',
    campagne: charge?.campagne || campagne,
  });
  const [saving, setSaving] = useState(false);
  const sInp = { background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' as const };

  async function handleSave() {
    if (!form.libelle || !form.montantTotal) return toast.error('Libellé et montant requis');
    setSaving(true);
    try {
      const dto = { ...form, montantTotal: parseFloat(form.montantTotal) };
      if (isEdit) await api('PUT', `/charges/${charge.id}`, dto);
      else await api('POST', '/charges', dto);
      toast.success(isEdit ? 'Charge modifiée' : 'Charge créée');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 520, padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '✏️ Modifier la charge' : '+ Nouvelle charge'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Catégorie */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Catégorie</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setForm({ ...form, categorie: c.value, icone: c.icone })}
                  style={{ padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${form.categorie === c.value ? 'var(--c-primary)' : 'var(--c-border)'}`, background: form.categorie === c.value ? 'rgba(79,142,247,.12)' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 18 }}>{c.icone}</span>
                  <span style={{ fontSize: 9, color: form.categorie === c.value ? 'var(--c-primary)' : 'var(--c-text3)', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Libellé */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Libellé *</div>
            <input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} placeholder="Ex: Salaire janvier 2026" style={sInp} />
          </div>

          {/* Montant + Périodicité */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Montant total (MAD) *</div>
              <input type="text" inputMode="decimal" value={form.montantTotal}
                onFocus={e => e.target.select()}
                onChange={e => setForm({ ...form, montantTotal: e.target.value.replace(/[^0-9.]/g, '') })}
                placeholder="0.00" style={{ ...sInp, fontSize: 16, fontWeight: 700 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Périodicité</div>
              <select value={form.periodicite} onChange={e => setForm({ ...form, periodicite: e.target.value })} style={sInp}>
                {PERIODICITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Date échéance */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Date échéance</div>
            <input type="date" value={form.dateEcheance} onChange={e => setForm({ ...form, dateEcheance: e.target.value })} style={sInp} />
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Notes</div>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...sInp, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '11px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, background: 'var(--c-primary)', border: 'none', color: '#fff', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '...' : isEdit ? '✓ Modifier' : '✓ Créer'}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Modal Paiement charge ──────────────────────────────
function ModalPaiement({ charge, onClose, onSaved }: { charge: any; onClose: () => void; onSaved: () => void }) {
  const [montant, setMontant] = useState(String(charge.resteAPayer));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const nb = parseFloat(montant) || 0;
  const over = nb > charge.resteAPayer;

  async function handleSave() {
    if (nb <= 0) return toast.error('Montant invalide');
    if (over) return toast.error(`Maximum : ${fmt(charge.resteAPayer)} MAD`);
    setSaving(true);
    try {
      await api('POST', `/charges/${charge.id}/paiements`, { montantPaye: nb, datePaiement: date, notes });
      toast.success(`✓ Paiement de ${fmt(nb)} MAD enregistré`);
      onSaved(); onClose();
    } catch (e: any) { toast.error('Erreur'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 420, padding: '24px 28px', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>💳 Enregistrer un paiement</div>
            <div style={{ fontSize: 13, color: 'var(--c-primary)', marginTop: 2 }}>{charge.icone} {charge.libelle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Résumé charge */}
        <div style={{ background: 'rgba(79,142,247,.06)', border: '1px solid rgba(79,142,247,.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--c-text2)' }}>Total dû</span>
            <strong>{fmt(charge.montantTotal)} MAD</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--c-text2)' }}>Déjà payé</span>
            <strong style={{ color: 'var(--c-success)' }}>{fmt(charge.totalPaye)} MAD</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--c-text2)', fontWeight: 600 }}>Reste à payer</span>
            <strong style={{ color: 'var(--c-warning)', fontSize: 16 }}>{fmt(charge.resteAPayer)} MAD</strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Montant à payer (MAD)</div>
            <input type="text" inputMode="decimal" value={montant}
              onFocus={e => e.target.select()}
              onChange={e => setMontant(e.target.value.replace(/[^0-9.]/g, ''))}
              style={{ width: '100%', textAlign: 'center', padding: '12px', fontSize: 24, fontWeight: 800, background: '#0e1728', border: `2px solid ${over ? 'var(--c-danger)' : nb > 0 ? 'var(--c-success)' : 'rgba(79,142,247,.3)'}`, borderRadius: 10, color: over ? 'var(--c-danger)' : '#e8edf8', outline: 'none', boxSizing: 'border-box' }} />
            {over && <div style={{ fontSize: 11, color: 'var(--c-danger)', fontWeight: 700, marginTop: 4 }}>⚠ Dépasse le reste à payer ({fmt(charge.resteAPayer)} MAD)</div>}
            {/* Raccourcis */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {[25, 50, 75].map(p => (
                <button key={p} onClick={() => setMontant(String(Math.round(charge.resteAPayer * p / 100)))}
                  style={{ flex: 1, padding: '5px', borderRadius: 7, border: '1px solid rgba(79,142,247,.3)', background: 'rgba(79,142,247,.08)', color: 'var(--c-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{p}%</button>
              ))}
              <button onClick={() => setMontant(String(charge.resteAPayer))}
                style={{ flex: 1, padding: '5px', borderRadius: 7, border: '1px solid rgba(46,207,138,.3)', background: 'rgba(46,207,138,.08)', color: 'var(--c-success)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Tout</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Date du paiement</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Notes</div>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionnel..."
              style={{ width: '100%', background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '11px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving || nb <= 0 || over}
            style={{ flex: 2, background: nb > 0 && !over ? 'var(--c-success)' : 'var(--c-surface2)', border: 'none', color: nb > 0 && !over ? '#fff' : 'var(--c-text3)', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: nb > 0 && !over ? 'pointer' : 'not-allowed' }}>
            {saving ? '...' : `✓ Payer ${fmt(nb)} MAD`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Carte charge ───────────────────────────────────────
function CarteCharge({ charge, onEdit, onDelete, onPayer, onDeletePaiement }: { charge: any; onEdit: () => void; onDelete: () => void; onPayer: () => void; onDeletePaiement: (pid: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUT_CONFIG[charge.statut as keyof typeof STATUT_CONFIG];

  return (
    <div style={{ background: 'var(--c-surface)', border: `1px solid ${charge.statut === 'solde' ? 'rgba(46,207,138,.3)' : charge.statut === 'partiel' ? 'rgba(245,166,35,.3)' : 'rgba(240,90,90,.3)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {charge.icone}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{charge.libelle}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
            {CATEGORIES.find(c => c.value === charge.categorie)?.label || charge.categorie}
            {charge.periodicite !== 'unique' && <span style={{ marginLeft: 6, background: 'var(--c-bg2)', padding: '1px 6px', borderRadius: 10 }}>{charge.periodicite}</span>}
            {charge.dateEcheance && <span style={{ marginLeft: 6, color: 'var(--c-text3)' }}>· Échéance: {fdate(charge.dateEcheance)}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-text)' }}>{fmt(charge.montantTotal)} MAD</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>
        </div>
      </div>

      {/* Barre progression */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>
          <span>Payé : <strong style={{ color: 'var(--c-success)' }}>{fmt(charge.totalPaye)} MAD</strong></span>
          <span>Reste : <strong style={{ color: charge.resteAPayer > 0 ? 'var(--c-warning)' : 'var(--c-success)' }}>{fmt(charge.resteAPayer)} MAD</strong></span>
          <span style={{ fontWeight: 700 }}>{charge.pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--c-bg2)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 20, width: `${charge.pct}%`, background: charge.statut === 'solde' ? 'var(--c-success)' : charge.statut === 'partiel' ? '#f5a623' : 'rgba(240,90,90,.4)', transition: 'width .4s ease' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
        {charge.resteAPayer > 0 && (
          <button onClick={onPayer}
            style={{ flex: 2, background: 'var(--c-success)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            💳 Payer
          </button>
        )}
        <button onClick={() => setExpanded(!expanded)}
          style={{ flex: 1, background: 'var(--c-bg2)', border: '1px solid var(--c-border)', color: 'var(--c-text2)', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer' }}>
          {expanded ? '▲ Masquer' : `▼ Historique (${charge.paiements?.length || 0})`}
        </button>
        <button onClick={onEdit}
          style={{ background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.25)', color: 'var(--c-primary)', borderRadius: 8, padding: '8px 10px', fontSize: 13, cursor: 'pointer' }}>✏️</button>
        <button onClick={onDelete}
          style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 13, cursor: 'pointer' }}>🗑️</button>
      </div>

      {/* Historique paiements */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '12px 16px' }}>
          {(!charge.paiements || charge.paiements.length === 0) ? (
            <div style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Aucun paiement enregistré</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {charge.paiements.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(46,207,138,.06)', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>{fdate(p.datePaiement)}</span>
                  <strong style={{ color: 'var(--c-success)', fontSize: 14, flex: 1 }}>+{fmt(p.montantPaye)} MAD</strong>
                  {p.notes && <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{p.notes}</span>}
                  <button onClick={() => onDeletePaiement(p.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--c-danger)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────
export default function ComptabilitePage() {
  const { campagneActive } = useCampagne();
  const { data: dashboard } = useFetch<any>(() => dashboardApi.getResume(campagneActive), [campagneActive]);

  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dashboard' | 'charges'>('dashboard');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [modalCharge, setModalCharge] = useState<any>(null);
  const [modalPaiement, setModalPaiement] = useState<any>(null);

  async function loadCharges() {
    setLoading(true);
    try { setCharges(await api('GET', `/charges?campagne=${campagneActive}`)); }
    catch { toast.error('Erreur chargement charges'); }
    finally { setLoading(false); }
  }

  useState(() => { loadCharges(); });

  async function handleDeleteCharge(id: number) {
    if (!confirm('Supprimer cette charge ?')) return;
    try { await api('DELETE', `/charges/${id}`); toast.success('Charge supprimée'); loadCharges(); }
    catch { toast.error('Erreur'); }
  }

  async function handleDeletePaiement(pid: number) {
    if (!confirm('Supprimer ce paiement ?')) return;
    try { await api('DELETE', `/charges/paiements/${pid}`); toast.success('Paiement supprimé'); loadCharges(); }
    catch { toast.error('Erreur'); }
  }

  // KPIs charges
  const totalDu = charges.reduce((s, c) => s + Number(c.montantTotal), 0);
  const totalPaye = charges.reduce((s, c) => s + Number(c.totalPaye || 0), 0);
  const resteAPayer = charges.reduce((s, c) => s + Number(c.resteAPayer || 0), 0);

  // Revenus depuis dashboard (encaissé réel)
  const revenusPaiements = Number(dashboard?.financier?.totalPaye || 0);
  const revenusLocations = Number(dashboard?.locations?.totalEncaisse || 0);
  const revenusVentes = 0; // à connecter si disponible
  const totalRevenus = revenusPaiements + revenusLocations + revenusVentes;
  const beneficeNet = totalRevenus - totalDu;

  // Charges filtrées
  const chargesFiltrees = useMemo(() => charges.filter(c => {
    const ms = c.libelle.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatut ? c.statut === filterStatut : true;
    const mcat = filterCat ? c.categorie === filterCat : true;
    return ms && mst && mcat;
  }), [charges, search, filterStatut, filterCat]);

  // Par catégorie
  const parCategorie = useMemo(() => {
    const map: Record<string, { totalDu: number; totalPaye: number; reste: number; count: number }> = {};
    charges.forEach(c => {
      if (!map[c.categorie]) map[c.categorie] = { totalDu: 0, totalPaye: 0, reste: 0, count: 0 };
      map[c.categorie].totalDu += Number(c.montantTotal);
      map[c.categorie].totalPaye += Number(c.totalPaye || 0);
      map[c.categorie].reste += Number(c.resteAPayer || 0);
      map[c.categorie].count++;
    });
    return map;
  }, [charges]);

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(15, 22, 40); doc.rect(0, 0, W, 28, 'F');
    doc.setFontSize(18); doc.setTextColor(79, 142, 247); doc.setFont('helvetica', 'bold'); doc.text('FROIDPOM', 14, 14);
    doc.setFontSize(11); doc.setTextColor(232, 237, 248); doc.text(`COMPTABILITÉ — ${campagneActive}`, W - 14, 14, { align: 'right' });
    doc.setFontSize(8); doc.setTextColor(90, 111, 148); doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, W - 14, 22, { align: 'right' });
    // Revenus
    doc.setFontSize(11); doc.setTextColor(46, 207, 138); doc.setFont('helvetica', 'bold'); doc.text('REVENUS ENCAISSÉS', 14, 38);
    autoTable(doc, { startY: 42, head: [['Source', 'Montant (MAD)']], body: [['Paiements réservations', `${fmt(revenusPaiements)} MAD`], ['Locations caisses', `${fmt(revenusLocations)} MAD`], ['TOTAL REVENUS', `${fmt(totalRevenus)} MAD`]], styles: { fontSize: 9 }, headStyles: { fillColor: [15, 22, 40] }, margin: { left: 14, right: 14 } });
    // Charges
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11); doc.setTextColor(240, 90, 90); doc.setFont('helvetica', 'bold'); doc.text('CHARGES', 14, y);
    autoTable(doc, { startY: y + 4, head: [['Libellé', 'Catégorie', 'Total dû', 'Payé', 'Reste', 'Statut']], body: charges.map(c => [c.libelle, c.categorie, `${fmt(c.montantTotal)} MAD`, `${fmt(c.totalPaye)} MAD`, `${fmt(c.resteAPayer)} MAD`, c.statut === 'solde' ? 'Soldé' : c.statut === 'partiel' ? 'Partiel' : 'Impayé']), styles: { fontSize: 8 }, headStyles: { fillColor: [15, 22, 40] }, margin: { left: 14, right: 14 } });
    doc.save(`froidpom-comptabilite-${campagneActive}.pdf`);
  }

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>Comptabilité</h1>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>Campagne {campagneActive}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportPDF}
              style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.3)', color: 'var(--c-danger)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ⬇ PDF
            </button>
            <button onClick={() => setModalCharge({})}
              style={{ background: 'var(--c-primary)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle charge
            </button>
          </div>
        </div>

        {/* KPIs récapitulatifs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: '💰 Total encaissé', val: totalRevenus, color: 'var(--c-success)', sub: 'Revenus réels' },
            { label: '📉 Total charges dû', val: totalDu, color: 'var(--c-danger)', sub: `${charges.length} charge(s)` },
            { label: '✅ Charges payées', val: totalPaye, color: 'var(--c-primary)', sub: `${charges.filter(c => c.statut === 'solde').length} soldée(s)` },
            { label: '⚠ Reste à payer', val: resteAPayer, color: 'var(--c-warning)', sub: `${charges.filter(c => c.statut !== 'solde').length} en attente` },
            { label: beneficeNet >= 0 ? '🟢 Bénéfice net' : '🔴 Déficit', val: Math.abs(beneficeNet), color: beneficeNet >= 0 ? 'var(--c-success)' : 'var(--c-danger)', sub: 'Revenus - Charges' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--c-bg2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: k.color }}>{fmt(k.val)} MAD</div>
              <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[{ id: 'dashboard', label: '📊 Tableau de bord' }, { id: 'charges', label: `📋 Charges (${charges.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'var(--c-primary-glow)' : 'transparent', color: tab === t.id ? 'var(--c-primary)' : 'var(--c-text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Revenus */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid rgba(46,207,138,.3)', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-success)', marginBottom: 16 }}>💰 Revenus encaissés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Paiements réservations', val: revenusPaiements, color: 'var(--c-primary)' },
                { label: 'Locations caisses', val: revenusLocations, color: 'var(--c-warning)' },
                { label: 'Ventes marchandise', val: revenusVentes, color: '#00d4b4' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--c-bg2)', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>{r.label}</span>
                  <strong style={{ fontSize: 15, color: r.color }}>{fmt(r.val)} MAD</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(46,207,138,.08)', border: '1px solid rgba(46,207,138,.25)', borderRadius: 10, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>TOTAL ENCAISSÉ</span>
                <strong style={{ fontSize: 18, color: 'var(--c-success)' }}>{fmt(totalRevenus)} MAD</strong>
              </div>
            </div>
          </div>

          {/* Charges par catégorie */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid rgba(240,90,90,.3)', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-danger)', marginBottom: 16 }}>📉 Charges par catégorie</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(parCategorie).sort(([, a], [, b]) => b.totalDu - a.totalDu).map(([cat, data]) => {
                const catInfo = CATEGORIES.find(c => c.value === cat);
                const pct = data.totalDu > 0 ? Math.round((data.totalPaye / data.totalDu) * 100) : 0;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span>{catInfo?.icone} {catInfo?.label || cat}</span>
                      <span style={{ color: 'var(--c-text3)' }}>
                        <span style={{ color: 'var(--c-success)', fontWeight: 700 }}>{fmt(data.totalPaye)}</span>
                        {' / '}
                        {fmt(data.totalDu)} MAD
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--c-bg2)', borderRadius: 20, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 20, width: `${pct}%`, background: pct === 100 ? 'var(--c-success)' : pct > 50 ? '#f5a623' : 'var(--c-danger)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Totaux charges */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--c-text2)' }}>Total payé</span>
                <strong style={{ color: 'var(--c-success)' }}>{fmt(totalPaye)} MAD</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--c-text2)' }}>Reste à payer</span>
                <strong style={{ color: 'var(--c-warning)' }}>{fmt(resteAPayer)} MAD</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(240,90,90,.08)', border: '1px solid rgba(240,90,90,.2)', borderRadius: 10, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>TOTAL DÛ</span>
                <strong style={{ fontSize: 18, color: 'var(--c-danger)' }}>{fmt(totalDu)} MAD</strong>
              </div>
            </div>
          </div>

          {/* Bénéfice net */}
          <div style={{ gridColumn: '1/-1', background: beneficeNet >= 0 ? 'rgba(46,207,138,.06)' : 'rgba(240,90,90,.06)', border: `1px solid ${beneficeNet >= 0 ? 'rgba(46,207,138,.3)' : 'rgba(240,90,90,.3)'}`, borderRadius: 14, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{beneficeNet >= 0 ? '🟢 Bénéfice net estimé' : '🔴 Déficit estimé'}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>Total encaissé ({fmt(totalRevenus)} MAD) − Total charges dues ({fmt(totalDu)} MAD)</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: beneficeNet >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
              {beneficeNet >= 0 ? '+' : '-'}{fmt(Math.abs(beneficeNet))} MAD
            </div>
          </div>
        </div>
      )}

      {/* ══ CHARGES ══ */}
      {tab === 'charges' && (
        <>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 220 }} />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icone} {c.label}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Tous statuts</option>
              <option value="impaye">🔴 Impayé</option>
              <option value="partiel">🟡 Partiel</option>
              <option value="solde">✅ Soldé</option>
            </select>
            {(search || filterCat || filterStatut) && (
              <button onClick={() => { setSearch(''); setFilterCat(''); setFilterStatut(''); }}
                style={{ background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-text2)' }}>{chargesFiltrees.length} charge(s)</div>
          </div>

          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chargesFiltrees.length === 0 && (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--c-text3)', background: 'var(--c-surface)', borderRadius: 12, border: '1px solid var(--c-border)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <div>Aucune charge — cliquez sur <strong>+ Nouvelle charge</strong></div>
                </div>
              )}
              {chargesFiltrees.map(charge => (
                <CarteCharge
                  key={charge.id}
                  charge={charge}
                  onEdit={() => setModalCharge(charge)}
                  onDelete={() => handleDeleteCharge(charge.id)}
                  onPayer={() => setModalPaiement(charge)}
                  onDeletePaiement={handleDeletePaiement}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {modalCharge !== null && (
        <ModalCharge
          charge={modalCharge?.id ? modalCharge : undefined}
          campagne={campagneActive}
          onClose={() => setModalCharge(null)}
          onSaved={() => { loadCharges(); setModalCharge(null); }}
        />
      )}
      {modalPaiement && (
        <ModalPaiement
          charge={modalPaiement}
          onClose={() => setModalPaiement(null)}
          onSaved={() => { loadCharges(); setModalPaiement(null); }}
        />
      )}
    </div>
  );
}
