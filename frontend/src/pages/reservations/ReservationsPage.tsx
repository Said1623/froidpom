import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfReservations } from '../../services/pdfService';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFetch } from '../../hooks/useFetch';
import { reservationsApi, clientsApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import type { Reservation, Client } from '../../types';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const STATUTS = [
  { value: 'en_attente', label: 'En attente', color: 'var(--c-warning)', bg: 'rgba(245,166,35,.12)' },
  { value: 'confirmee',  label: 'Confirmée',  color: 'var(--c-success)', bg: 'rgba(46,207,138,.12)' },
  { value: 'annulee',    label: 'Annulée',    color: 'var(--c-danger)',  bg: 'rgba(240,90,90,.12)' },
  { value: 'terminee',   label: 'Terminée',   color: 'var(--c-text3)',   bg: 'rgba(100,120,160,.12)' },
];
function fmt(n: number) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function calcTotal(r: any): number {
  return (Number(r.nbCaissesBois)||0)*(Number(r.prixUnitaireBois)||0)
       + (Number(r.nbCaissesPластique)||0)*(Number(r.prixUnitairePlastique)||0)
       + (Number(r.nbCaissesTranger)||0)*(Number(r.prixUnitaireTranger)||0);
}
function fdate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

const sInp = {
  background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8,
  color: '#e8edf8', padding: '9px 12px', fontSize: 13, width: '100%',
  outline: 'none', boxSizing: 'border-box' as const,
};

// ── Composants stables HORS du modal (évite recréation à chaque render) ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function NbPrix({ labelNb, labelPrix, keyNb, keyPrix, color, form, setForm }: {
  labelNb: string; labelPrix: string; keyNb: string; keyPrix: string;
  color: string; form: any; setForm: (f: any) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Field label={labelNb}>
        <input
          type="text"
          inputMode="numeric"
          value={form[keyNb]}
          onFocus={e => e.target.select()}
          onChange={e => setForm({ ...form, [keyNb]: e.target.value.replace(/[^0-9]/g, '') })}
          style={{
            ...sInp,
            borderColor: parseInt(form[keyNb]) > 0 ? color : 'rgba(79,142,247,.3)',
            fontWeight: parseInt(form[keyNb]) > 0 ? 700 : 400,
          }}
        />
      </Field>
      <Field label={labelPrix}>
        <input
          type="text"
          inputMode="decimal"
          value={form[keyPrix]}
          onFocus={e => e.target.select()}
          onChange={e => setForm({ ...form, [keyPrix]: e.target.value.replace(/[^0-9.]/g, '') })}
          style={sInp}
        />
      </Field>
    </div>
  );
}

// ── Modal Réservation (Créer / Modifier) ───────────────
function ModalReservation({ reservation, client, clients, campagneActive, onClose, onSaved }: {
  reservation?: Reservation; client?: Client; clients: Client[];
  campagneActive: string; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isEdit = !!reservation;

  const [form, setForm] = useState({
    clientId: reservation ? String(reservation.client.id) : client ? String(client.id) : '',
    dateReservation: reservation?.dateReservation || today,
    dateSortiePrevisionnelle: reservation?.dateSortiePrevisionnelle || '',
    nbCaissesBois: String(reservation?.nbCaissesBois || 0),
    prixUnitaireBois: String(reservation?.prixUnitaireBois || 0),
    nbCaissesPластique: String((reservation as any)?.nbCaissesPластique || 0),
    prixUnitairePlastique: String(reservation?.prixUnitairePlastique || 0),
    nbCaissesTranger: String((reservation as any)?.nbCaissesTranger || 0),
    prixUnitaireTranger: String((reservation as any)?.prixUnitaireTranger || 0),
    statut: (reservation as any)?.statut || 'en_attente',
  });
  const [saving, setSaving] = useState(false);

  const total = (parseInt(form.nbCaissesBois)||0)*(parseFloat(form.prixUnitaireBois)||0)
              + (parseInt(form.nbCaissesPластique)||0)*(parseFloat(form.prixUnitairePlastique)||0)
              + (parseInt(form.nbCaissesTranger)||0)*(parseFloat(form.prixUnitaireTranger)||0);

  async function handleSave() {
    if (!form.clientId || !form.dateReservation) return toast.error('Client et date requis');
    setSaving(true);
    try {
      const dto = {
        clientId: parseInt(form.clientId),
        dateReservation: form.dateReservation,
        dateSortiePrevisionnelle: form.dateSortiePrevisionnelle || undefined,
        nbCaissesBois: parseInt(form.nbCaissesBois)||0,
        prixUnitaireBois: parseFloat(form.prixUnitaireBois)||0,
        nbCaissesPластique: parseInt(form.nbCaissesPластique)||0,
        prixUnitairePlastique: parseFloat(form.prixUnitairePlastique)||0,
        nbCaissesTranger: parseInt(form.nbCaissesTranger)||0,
        prixUnitaireTranger: parseFloat(form.prixUnitaireTranger)||0,
        statut: form.statut,
      };
      if (isEdit) await reservationsApi.update(reservation!.id, dto);
      else await reservationsApi.create(dto);
      toast.success(isEdit ? 'Réservation modifiée' : 'Réservation créée');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position:'relative', zIndex:1, background:'#0f1628', border:'1px solid rgba(100,140,255,.3)', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', padding:'24px 28px', boxShadow:'0 24px 64px rgba(0,0,0,.6)' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>{isEdit ? '✏ Modifier réservation' : '+ Nouvelle réservation'}</div>
            {client && <div style={{ fontSize:13, color:'var(--c-primary)', marginTop:2 }}>{client.nom}</div>}
          </div>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'none', color:'#8fa3cc', width:30, height:30, borderRadius:6, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Client */}
          {!client && (
            <Field label="Client *">
              <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} style={sInp} disabled={isEdit}>
                <option value="">-- Sélectionner --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </Field>
          )}

          {/* Dates */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Date réservation *">
              <input type="date" value={form.dateReservation} onChange={e => setForm({...form, dateReservation: e.target.value})} style={sInp} />
            </Field>
            <Field label="Sortie prévisionnelle">
              <input type="date" value={form.dateSortiePrevisionnelle} onChange={e => setForm({...form, dateSortiePrevisionnelle: e.target.value})} style={sInp} />
            </Field>
          </div>

          {/* Caisses */}
          <div style={{ background:'rgba(79,142,247,.05)', border:'1px solid rgba(79,142,247,.15)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--c-text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>Quantités & Prix unitaires</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <NbPrix labelNb="🧴 Plastique (nb)" labelPrix="Prix/u (MAD)" keyNb="nbCaissesPластique" keyPrix="prixUnitairePlastique" color="rgba(79,142,247,1)" form={form} setForm={setForm} />
              <NbPrix labelNb="🪵 Bois (nb)" labelPrix="Prix/u (MAD)" keyNb="nbCaissesBois" keyPrix="prixUnitaireBois" color="rgba(245,166,35,1)" form={form} setForm={setForm} />
              <NbPrix labelNb="📦 Tranger (nb)" labelPrix="Prix/u (MAD)" keyNb="nbCaissesTranger" keyPrix="prixUnitaireTranger" color="rgba(0,212,180,1)" form={form} setForm={setForm} />
            </div>
          </div>

          {/* Total */}
          {total > 0 && (
            <div style={{ background:'rgba(46,207,138,.08)', border:'1px solid rgba(46,207,138,.2)', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--c-text2)' }}>Total estimé</span>
              <strong style={{ fontSize:18, color:'var(--c-success)' }}>{fmt(total)} MAD</strong>
            </div>
          )}

          {/* Statut */}
          <Field label="Statut">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {STATUTS.map(s => (
                <button key={s.value} onClick={() => setForm({...form, statut: s.value})}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${form.statut===s.value?s.color:'var(--c-border)'}`, background:form.statut===s.value?s.bg:'transparent', color:form.statut===s.value?s.color:'var(--c-text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'1px solid rgba(100,140,255,.2)', color:'#8fa3cc', borderRadius:10, padding:'10px 20px', fontWeight:600, cursor:'pointer', fontSize:13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background:'var(--c-primary)', border:'none', color:'#fff', borderRadius:10, padding:'10px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            {saving ? '...' : isEdit ? '✓ Modifier' : '✓ Créer'}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ── Carte client ───────────────────────────────────────
function CarteReservation({ client, reservations, onAdd, onEdit, onDelete, onStatut }: {
  client: Client;
  reservations: Reservation[];
  onAdd: (c: Client) => void;
  onEdit: (r: Reservation) => void;
  onDelete: (id: number, nom: string) => void;
  onStatut: (id: number, statut: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalClient = reservations.reduce((s, r) => s + calcTotal(r), 0);
  const hasResa = reservations.length > 0;
  const statuts = [...new Set(reservations.map(r => r.statut))];
  const dominantStatut = statuts[0] || 'en_attente';
  const sc = STATUTS.find(s => s.value === dominantStatut) || STATUTS[0];

  return (
    <div style={{ background:'var(--c-surface)', border:`1px solid ${hasResa ? sc.color+'55' : 'var(--c-border)'}`, borderRadius:12, overflow:'hidden', transition:'border-color .2s' }}>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor: hasResa ? 'pointer' : 'default' }}
        onClick={() => hasResa && setExpanded(!expanded)}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{client.nom}</div>
          {hasResa && (
            <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--c-text3)' }}>{reservations.length} résa</span>
              {reservations.reduce((s,r)=>s+(r.nbCaissesBois||0),0) > 0 &&
                <span style={{ fontSize:11, color:'var(--c-warning)' }}>🪵 {reservations.reduce((s,r)=>s+(r.nbCaissesBois||0),0)}</span>}
              {reservations.reduce((s,r)=>s+((r as any).nbCaissesPластique||0),0) > 0 &&
                <span style={{ fontSize:11, color:'var(--c-primary)' }}>🧴 {reservations.reduce((s,r)=>s+((r as any).nbCaissesPластique||0),0)}</span>}
              {reservations.reduce((s,r)=>s+((r as any).nbCaissesTranger||0),0) > 0 &&
                <span style={{ fontSize:11, color:'var(--c-accent)' }}>📦 {reservations.reduce((s,r)=>s+((r as any).nbCaissesTranger||0),0)}</span>}
              <span style={{ fontSize:11, color:'var(--c-success)', fontWeight:700 }}>{fmt(totalClient)} MAD</span>
            </div>
          )}
        </div>
        {hasResa && (
          <span style={{ background:sc.bg, color:sc.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, border:`1px solid ${sc.color}44` }}>
            {sc.label}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onAdd(client); }}
          style={{ background:'rgba(79,142,247,.12)', border:'1px solid rgba(79,142,247,.3)', color:'var(--c-primary)', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
          + Réserver
        </button>
        {hasResa && <span style={{ color:'var(--c-text3)', fontSize:14 }}>{expanded ? '▲' : '▼'}</span>}
      </div>

      {hasResa && expanded && (
        <div style={{ borderTop:'1px solid var(--c-border)' }}>
          {reservations.map((r, i) => {
            const total = calcTotal(r);
            const st = STATUTS.find(s => s.value === r.statut) || STATUTS[0];
            return (
              <div key={r.id} style={{ padding:'12px 16px', borderBottom: i < reservations.length-1 ? '1px solid rgba(255,255,255,.04)' : 'none', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ minWidth:90 }}>
                  <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:2 }}>DATE</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{fdate(r.dateReservation)}</div>
                  {r.dateSortiePrevisionnelle && (
                    <div style={{ fontSize:10, color:'var(--c-text3)' }}>→ {fdate(r.dateSortiePrevisionnelle)}</div>
                  )}
                </div>
                <div style={{ flex:1, display:'flex', gap:8, flexWrap:'wrap' }}>
                  {(r.nbCaissesBois > 0) && (
                    <div style={{ background:'rgba(245,166,35,.08)', border:'1px solid rgba(245,166,35,.2)', borderRadius:8, padding:'6px 10px', fontSize:12 }}>
                      <span style={{ color:'var(--c-warning)' }}>🪵 Bois</span>
                      <div style={{ fontWeight:700, color:'var(--c-warning)' }}>{r.nbCaissesBois} × {r.prixUnitaireBois} MAD</div>
                    </div>
                  )}
                  {((r as any).nbCaissesPластique > 0) && (
                    <div style={{ background:'rgba(79,142,247,.08)', border:'1px solid rgba(79,142,247,.2)', borderRadius:8, padding:'6px 10px', fontSize:12 }}>
                      <span style={{ color:'var(--c-primary)' }}>🧴 Plastique</span>
                      <div style={{ fontWeight:700, color:'var(--c-primary)' }}>{(r as any).nbCaissesPластique} × {r.prixUnitairePlastique} MAD</div>
                    </div>
                  )}
                  {((r as any).nbCaissesTranger > 0) && (
                    <div style={{ background:'rgba(0,212,180,.08)', border:'1px solid rgba(0,212,180,.2)', borderRadius:8, padding:'6px 10px', fontSize:12 }}>
                      <span style={{ color:'var(--c-accent)' }}>📦 Tranger</span>
                      <div style={{ fontWeight:700, color:'var(--c-accent)' }}>{(r as any).nbCaissesTranger} × {(r as any).prixUnitaireTranger} MAD</div>
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', minWidth:110 }}>
                  <div style={{ fontSize:10, color:'var(--c-text3)', marginBottom:2 }}>TOTAL</div>
                  <div style={{ fontWeight:800, fontSize:16, color:'var(--c-success)' }}>{fmt(total)} MAD</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                  <select value={r.statut} onChange={e => onStatut(r.id, e.target.value)}
                    style={{ background:st.bg, border:`1px solid ${st.color}55`, borderRadius:8, color:st.color, padding:'4px 8px', fontSize:11, fontWeight:700, outline:'none', cursor:'pointer' }}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div style={{ display:'flex', gap:5 }}>
                    <button onClick={() => onEdit(r)}
                      style={{ background:'rgba(79,142,247,.12)', border:'1px solid rgba(79,142,247,.25)', color:'var(--c-primary)', borderRadius:6, width:28, height:28, fontSize:13, cursor:'pointer' }}>✏</button>
                    <button onClick={() => onDelete(r.id, client.nom)}
                      style={{ background:'rgba(240,90,90,.12)', border:'1px solid rgba(240,90,90,.25)', color:'var(--c-danger)', borderRadius:6, width:28, height:28, fontSize:12, cursor:'pointer' }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasResa && (
        <div style={{ padding:'10px 16px 14px', borderTop:'1px solid var(--c-border)' }}>
          <span style={{ fontSize:12, color:'var(--c-text3)', fontStyle:'italic' }}>Aucune réservation pour cette campagne</span>
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────
export default function ReservationsPage() {
  const { data: reservations, loading: loadingR, refetch } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients, loading: loadingC } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState<{ client?: Client; reservation?: Reservation } | null>(null);
  const [massStatut, setMassStatut] = useState('confirmee');
  const [applyingMass, setApplyingMass] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMasse, setShowMasse] = useState(false);

  const loading = loadingR || loadingC;

  const reservationsFiltresCampagne = useMemo(() =>
    (reservations || []).filter(r => isInCampagne(r.dateReservation)),
    [reservations, campagneActive]
  );

  const reservationParClient = useMemo(() => {
    const map: Record<number, Reservation[]> = {};
    reservationsFiltresCampagne.forEach(r => {
      if (!map[r.client.id]) map[r.client.id] = [];
      map[r.client.id].push(r);
    });
    return map;
  }, [reservationsFiltresCampagne]);

  const clientsFiltres = useMemo(() => {
    return (clients || []).filter(c => {
      const ms = c.nom.toLowerCase().includes(search.toLowerCase());
      const reservs = reservationParClient[c.id] || [];
      const mst = filterStatut ? reservs.some(r => r.statut === filterStatut) : true;
      return ms && mst;
    });
  }, [clients, search, filterStatut, reservationParClient]);

  const totalGlobal = reservationsFiltresCampagne.reduce((s, r) => s + calcTotal(r), 0);
  const nbAvecResa = clientsFiltres.filter(c => (reservationParClient[c.id]||[]).length > 0).length;

  const kpiStatuts = STATUTS.map(s => ({
    ...s,
    count: reservationsFiltresCampagne.filter(r => r.statut === s.value).length,
  }));

  async function handleStatut(id: number, statut: string) {
    try { await reservationsApi.update(id, { statut }); refetch(); toast.success('Statut mis à jour'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
  }

  async function handleDelete(id: number, nom: string) {
    if (!confirm(`Supprimer la réservation de ${nom} ?`)) return;
    try { await reservationsApi.delete(id); toast.success('Supprimée'); refetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
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
    toast.success(`✓ ${ok} réservation(s) mises à jour`);
    refetch();
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={36}/></div>;

  return (
    <div className="fade-in">
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:14, padding:'18px 22px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14, marginBottom:16 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, margin:0 }}>Réservations</h1>
            <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3 }}>
              Campagne {campagneActive} — {nbAvecResa} client(s) avec réservation
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <BtnPdf onClick={() => pdfReservations(reservationsFiltresCampagne, clients||[])} label="⬇ PDF" disabled={!reservationsFiltresCampagne.length} />
            <button onClick={() => setShowMasse(!showMasse)}
              style={{ background:'rgba(79,142,247,.12)', border:'1px solid rgba(79,142,247,.3)', color:'var(--c-primary)', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ⚡ Masse
            </button>
            <button onClick={() => setModal({})}
              style={{ background:'var(--c-primary)', border:'none', color:'#fff', borderRadius:10, padding:'8px 18px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              + Nouvelle réservation
            </button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:10 }}>
          {kpiStatuts.map(k => (
            <div key={k.value} onClick={() => setFilterStatut(filterStatut === k.value ? '' : k.value)}
              style={{ background: filterStatut===k.value ? k.bg : 'var(--c-bg2)', border:`1px solid ${filterStatut===k.value ? k.color : 'var(--c-border)'}`, borderRadius:10, padding:'10px 14px', cursor:'pointer', transition:'all .15s' }}>
              <div style={{ fontSize:9, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:k.color }}>{k.count}</div>
            </div>
          ))}
          <div style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border)', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ fontSize:9, color:'var(--c-text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>Total MAD</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--c-success)' }}>{fmt(totalGlobal)}</div>
          </div>
        </div>
      </div>

      {showMasse && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border2)', borderRadius:12, padding:'14px 18px', marginBottom:14, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'var(--c-text2)', fontWeight:600 }}>⚡ Changer statut en masse :</span>
          <div style={{ display:'flex', gap:6 }}>
            {STATUTS.map(s => (
              <button key={s.value} onClick={() => setMassStatut(s.value)}
                style={{ padding:'5px 12px', borderRadius:8, border:`1.5px solid ${massStatut===s.value?s.color:'var(--c-border)'}`, background:massStatut===s.value?s.bg:'var(--c-bg2)', color:massStatut===s.value?s.color:'var(--c-text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:12, color:'var(--c-text2)' }}>Sélectionner les réservations dans les cartes puis :</div>
          <button onClick={appliquerStatutMasse} disabled={selectedIds.size===0||applyingMass}
            style={{ background:selectedIds.size>0?'var(--c-primary)':'var(--c-surface2)', border:'none', color:selectedIds.size>0?'#fff':'var(--c-text3)', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:700, cursor:selectedIds.size>0?'pointer':'not-allowed' }}>
            {applyingMass ? 'En cours...' : `⚡ Appliquer (${selectedIds.size})`}
          </button>
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="🔍 Rechercher client..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:10, color:'var(--c-text)', padding:'8px 14px', fontSize:13, outline:'none', width:260 }} />
        {filterStatut && (
          <button onClick={() => setFilterStatut('')}
            style={{ background:'none', border:'1px solid var(--c-border)', color:'var(--c-text3)', borderRadius:8, padding:'7px 12px', fontSize:12, cursor:'pointer' }}>
            ✕ Effacer filtre statut
          </button>
        )}
        <div style={{ fontSize:12, color:'var(--c-text2)', marginLeft:'auto' }}>{clientsFiltres.length} client(s) affiché(s)</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {clientsFiltres.length === 0 && (
          <div style={{ padding:60, textAlign:'center', color:'var(--c-text3)', background:'var(--c-surface)', borderRadius:12, border:'1px solid var(--c-border)' }}>
            Aucun client pour la campagne {campagneActive}
          </div>
        )}
        {clientsFiltres.map(client => (
          <CarteReservation
            key={client.id}
            client={client}
            reservations={reservationParClient[client.id] || []}
            onAdd={c => setModal({ client: c })}
            onEdit={r => setModal({ client, reservation: r })}
            onDelete={handleDelete}
            onStatut={handleStatut}
          />
        ))}
      </div>

      {modal !== null && (
        <ModalReservation
          reservation={modal.reservation}
          client={modal.client}
          clients={clients || []}
          campagneActive={campagneActive}
          onClose={() => setModal(null)}
          onSaved={() => { refetch(); setModal(null); }}
        />
      )}
    </div>
  );
}
