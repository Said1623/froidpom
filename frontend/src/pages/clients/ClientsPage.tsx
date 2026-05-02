import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfClients } from '../../services/pdfService';
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { clientsApi } from '../../services';
import { Input, Spinner } from '../../components/ui/UI';
import { createPortal } from 'react-dom';
import type { Client } from '../../types';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

function ModalClient({ client, campagneActive, onClose, onSaved }: {
  client?: Client; campagneActive: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: client?.nom || '',
    telephone: client?.telephone || '',
    adresse: client?.adresse || '',
    email: client?.email || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom) return toast.error('Nom requis');
    setSaving(true);
    try {
      if (client) {
        await clientsApi.update(client.id, form);
        toast.success('Client mis à jour');
      } else {
        await clientsApi.create({ ...form, campagne: campagneActive });
        toast.success('Client créé');
      }
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  const sInp = { background: '#161d35', border: '1px solid rgba(79,142,247,.3)', borderRadius: 8, color: '#e8edf8', padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box' as const };
  const Label = ({ children }: any) => <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.5px', marginBottom: 5 }}>{children}</div>;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: '#0f1628', border: '1px solid rgba(100,140,255,.3)', borderRadius: 16, width: '100%', maxWidth: 460, padding: '24px 28px', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{client ? '✏ Modifier client' : '+ Nouveau client'}</div>
          <button onClick={onClose} style={{ background: '#1f2a4a', border: 'none', color: '#8fa3cc', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><Label>Nom *</Label><input autoFocus value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Nom complet" style={sInp} /></div>
          <div><Label>Téléphone</Label><input value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} placeholder="+212 6 00 00 00 00" style={sInp} /></div>
          <div><Label>Adresse</Label><input value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} placeholder="Adresse complète" style={sInp} /></div>
          <div><Label>Email</Label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemple.com" style={sInp} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ background: '#1f2a4a', border: '1px solid rgba(100,140,255,.2)', color: '#8fa3cc', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ background: 'var(--c-primary)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '...' : client ? '✓ Modifier' : '✓ Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}

function ModalImport({ campagneActive, onClose, onSaved }: { campagneActive: string; onClose: () => void; onSaved: () => void }) {
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState<{done:number;total:number}|null>(null);

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const noms = text.split('\n').map(l => l.split(/[,;|\t]/)[0].replace(/"/g,'').trim()).filter(l => l.length > 0 && isNaN(Number(l)));
      setBulkText(noms.join('\n'));
      toast.success(`${noms.length} nom(s) détecté(s)`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleImport() {
    const noms = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (noms.length === 0) return toast.error('Aucun nom détecté');
    setSaving(true); setProgression({done:0,total:noms.length});
    let ok=0; let err=0;
    for (let i=0; i<noms.length; i++) {
      try { await clientsApi.create({nom:noms[i], campagne:campagneActive}); ok++; }
      catch { err++; }
      setProgression({done:i+1,total:noms.length});
    }
    setSaving(false); setProgression(null); onSaved(); onClose();
    toast.success(`${ok} client(s) importé(s)${err>0?`, ${err} erreur(s)`:''}`);
  }

  const sF = { background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' };

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }} onClick={onClose}>
      <div style={{ background:'#0f1628', border:'1px solid rgba(100,140,255,.22)', borderRadius:16, width:'100%', maxWidth:520, padding:28 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>⚡ Import rapide de clients</div>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'none', color:'#8fa3cc', width:30, height:30, borderRadius:6, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>

        <div style={{ background:'var(--c-surface2)', borderRadius:10, padding:14, border:'1px dashed var(--c-border2)', marginBottom:14 }}>
          <div style={{ fontSize:12, color:'var(--c-text2)', marginBottom:8, fontWeight:600 }}>📁 Importer depuis CSV / Excel</div>
          <div style={{ fontSize:12, color:'var(--c-text3)', marginBottom:10 }}>La première colonne sera utilisée comme nom.</div>
          <label style={{ display:'inline-block', background:'var(--c-primary)', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Choisir un fichier
            <input type="file" accept=".csv,.txt" onChange={handleFileImport} style={{ display:'none' }} />
          </label>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:'var(--c-text2)', marginBottom:8, fontWeight:600 }}>✏ Saisir les noms (un par ligne)</div>
          <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)}
            placeholder={'Ahmed Benali\nFatima Zahra\nMohamed Kadi\n...'} rows={8}
            style={{ width:'100%', background:'#161d35', border:'1px solid rgba(100,140,255,.22)', borderRadius:10, color:'#e8edf8', padding:'10px 13px', fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box' as const }} />
          <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:4 }}>
            {bulkText.split('\n').filter(l=>l.trim()).length} nom(s) détecté(s)
          </div>
        </div>

        {progression && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:'var(--c-text2)', marginBottom:6 }}>Import {progression.done}/{progression.total}...</div>
            <div style={{ background:'var(--c-bg2)', borderRadius:20, height:8 }}>
              <div style={{ height:'100%', borderRadius:20, background:'var(--c-primary)', width:`${(progression.done/progression.total)*100}%`, transition:'width .2s' }} />
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'#1f2a4a', border:'1px solid rgba(100,140,255,.2)', color:'#8fa3cc', borderRadius:10, padding:'10px 20px', fontWeight:600, cursor:'pointer', fontSize:13 }}>Annuler</button>
          <button onClick={handleImport} disabled={saving||!bulkText.trim()}
            style={{ background:bulkText.trim()?'var(--c-primary)':'var(--c-surface2)', border:'none', color:bulkText.trim()?'#fff':'var(--c-text3)', borderRadius:10, padding:'10px 22px', fontSize:14, fontWeight:700, cursor:bulkText.trim()?'pointer':'not-allowed' }}>
            {saving?'...':`⚡ Importer (${bulkText.split('\n').filter(l=>l.trim()).length})`}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

export default function ClientsPage() {
  const { campagneActive } = useCampagne();
  const { data: clients, loading, refetch } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const [modal, setModal] = useState<'create'|'import'|null>(null);
  const [editClient, setEditClient] = useState<Client|null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = (clients||[]).filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone||'').includes(search)
  );

  async function handleCopierCampagne() {
    const anneeDebut = parseInt(campagneActive.split('-')[0]);
    const campagnePrecedente = `${anneeDebut-1}-${anneeDebut}`;
    if (!confirm(`Copier les clients de ${campagnePrecedente} vers ${campagneActive} ?`)) return;
    setSaving(true);
    try {
      const res = await clientsApi.copierCampagne(campagnePrecedente, campagneActive);
      const nb = (res as any).data?.copies ?? 0;
      toast.success(`${nb} client(s) copié(s) depuis ${campagnePrecedente}`);
      refetch();
    } catch (e: any) { toast.error(e?.response?.data?.message||'Erreur'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={36}/></div>;

  return (
    <div className="fade-in">
      {/* ── HEADER ── */}
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:14, padding:'18px 22px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, margin:0 }}>Clients</h1>
            <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3 }}>
              Campagne {campagneActive} — <strong style={{ color:'var(--c-primary)' }}>{filtered.length}</strong> client(s)
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <BtnPdf onClick={() => pdfClients(filtered)} label="⬇ PDF" disabled={!filtered.length} />
            <button onClick={handleCopierCampagne} disabled={saving}
              style={{ background:'rgba(79,142,247,.12)', border:'1px solid rgba(79,142,247,.3)', color:'var(--c-primary)', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {saving ? '...' : '↩ Copier campagne précédente'}
            </button>
            <button onClick={() => setModal('import')}
              style={{ background:'rgba(245,166,35,.12)', border:'1px solid rgba(245,166,35,.3)', color:'var(--c-warning)', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ⚡ Import rapide
            </button>
            <button onClick={() => setModal('create')}
              style={{ background:'var(--c-primary)', border:'none', color:'#fff', borderRadius:10, padding:'8px 18px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              + Nouveau client
            </button>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div style={{ marginBottom:16 }}>
        <input placeholder="🔍 Rechercher par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'var(--c-bg2)', border:'1px solid var(--c-border2)', borderRadius:10, color:'var(--c-text)', padding:'9px 14px', fontSize:13, outline:'none', width:320 }} />
      </div>

      {/* Grille cartes */}
      {filtered.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--c-text3)', background:'var(--c-surface)', borderRadius:12, border:'1px solid var(--c-border)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
          <div style={{ fontSize:15, marginBottom:8 }}>Aucun client pour la campagne {campagneActive}</div>
          <div style={{ fontSize:13, color:'var(--c-text3)' }}>
            Créez un client ou copiez depuis la campagne précédente
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:12, padding:'16px 18px', transition:'border-color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,142,247,.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
              {/* Avatar + Nom */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(79,142,247,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'var(--c-primary)', flexShrink:0 }}>
                  {c.nom[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nom}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <span style={{ background:c.actif?'rgba(46,207,138,.15)':'var(--c-surface2)', color:c.actif?'var(--c-success)':'var(--c-text3)', padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:600 }}>
                      {c.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Infos */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {c.telephone && (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--c-text3)', width:16 }}>📞</span>
                    <span style={{ fontSize:13, color:'var(--c-text2)' }}>{c.telephone}</span>
                  </div>
                )}
                {c.adresse && (
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ fontSize:12, color:'var(--c-text3)', width:16, marginTop:1 }}>📍</span>
                    <span style={{ fontSize:12, color:'var(--c-text2)', lineHeight:1.4 }}>{c.adresse}</span>
                  </div>
                )}
                {c.email && (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--c-text3)', width:16 }}>✉</span>
                    <span style={{ fontSize:12, color:'var(--c-text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</span>
                  </div>
                )}
                {!c.telephone && !c.adresse && !c.email && (
                  <div style={{ fontSize:12, color:'var(--c-text3)', fontStyle:'italic' }}>Aucune information de contact</div>
                )}
              </div>
              {/* Action */}
              <button onClick={() => setEditClient(c)}
                style={{ width:'100%', background:'rgba(79,142,247,.08)', border:'1px solid rgba(79,142,247,.2)', color:'var(--c-primary)', borderRadius:8, padding:'7px 0', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                ✏ Modifier
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(modal === 'create') && (
        <ModalClient campagneActive={campagneActive} onClose={() => setModal(null)} onSaved={() => { refetch(); setModal(null); }} />
      )}
      {editClient && (
        <ModalClient client={editClient} campagneActive={campagneActive} onClose={() => setEditClient(null)} onSaved={() => { refetch(); setEditClient(null); }} />
      )}
      {modal === 'import' && (
        <ModalImport campagneActive={campagneActive} onClose={() => setModal(null)} onSaved={() => { refetch(); setModal(null); }} />
      )}
    </div>
  );
}
