import { useState, useMemo, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { sortiesApi, clientsApi, chambresApi, stockApi } from '../../services';
import type { Client, Chambre } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const TYPES = [
  { value: 'plastique', label: 'Plastique', icon: '🧴', color: '#4f8ef7', bg: 'rgba(79,142,247,.12)', border: 'rgba(79,142,247,.4)' },
  { value: 'bois',      label: 'Bois',      icon: '🪵', color: '#f5a623', bg: 'rgba(245,166,35,.12)', border: 'rgba(245,166,35,.4)' },
  { value: 'tranger',   label: 'Étranger',  icon: '📦', color: '#00d4b4', bg: 'rgba(0,212,180,.12)', border: 'rgba(0,212,180,.4)' },
];
function typeColor(t: string) { return TYPES.find(x => x.value === t)?.color || '#888'; }
function typeIcon(t: string) { return TYPES.find(x => x.value === t)?.icon || '📦'; }

export default function SortiePage() {
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const { data: sorties, refetch: refetchSorties } = useFetch<any[]>(() => sortiesApi.getAll());
  const { data: allStocks } = useFetch<any[]>(() => stockApi.getParClient());

  const [tab, setTab] = useState<'sortie' | 'historique'>('sortie');
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState('plastique');
  const [chambreId, setChambreId] = useState('');
  const [quantite, setQuantite] = useState('');
  const [saving, setSaving] = useState(false);
  const [stockDetail, setStockDetail] = useState<any>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [hFilterClient, setHFilterClient] = useState('');
  const [hFilterType, setHFilterType] = useState('');
  const [hFilterChambre, setHFilterChambre] = useState('');

  // Clients avec stock > 0
  const clientsAvecStock = useMemo(() => {
    if (!clients || !allStocks) return [];
    return clients.filter(c => {
      const sc = allStocks.find((s: any) => s.clientId === c.id);
      return sc && sc.stockActuel > 0;
    });
  }, [clients, allStocks]);

  useEffect(() => {
    if (!clientId) { setStockDetail(null); return; }
    setLoadingStock(true);
    stockApi.getStockDetailClient(parseInt(clientId))
      .then(r => setStockDetail(r.data))
      .catch(() => setStockDetail(null))
      .finally(() => setLoadingStock(false));
  }, [clientId]);

  async function refetchStock() {
    if (!clientId) return;
    try { const r = await stockApi.getStockDetailClient(parseInt(clientId)); setStockDetail(r.data); } catch {}
  }

  const chambresAvecStock = useMemo(() => {
    if (!stockDetail || !chambres) return [];
    const pc = stockDetail.parChambre || {};
    return chambres.map(ch => {
      const data = pc[String(ch.id)] || pc[ch.id] || null;
      const stock = !data ? 0 : type === 'bois' ? (data.bois || 0) : type === 'plastique' ? (data.plastique || 0) : (data.tranger || 0);
      return { ...ch, stockType: stock };
    }).filter(ch => ch.stockType > 0);
  }, [stockDetail, chambres, type]);

  // Stock total par type pour ce client
  const stockTotal = useMemo(() => {
    if (!stockDetail) return { bois: 0, plastique: 0, tranger: 0, total: 0 };
    const pc = stockDetail.parChambre || {};
    let bois = 0, plastique = 0, tranger = 0;
    Object.values(pc).forEach((d: any) => {
      bois += d.bois || 0;
      plastique += d.plastique || 0;
      tranger += d.tranger || 0;
    });
    return { bois, plastique, tranger, total: bois + plastique + tranger };
  }, [stockDetail]);

  const chambreSelectionnee = chambresAvecStock.find(c => String(c.id) === chambreId);
  const stockDispo = chambreSelectionnee?.stockType || 0;
  const nb = parseInt(quantite) || 0;
  const depasseStock = nb > stockDispo;
  const canSave = clientId && chambreId && nb > 0 && !depasseStock;
  const typeActif = TYPES.find(t => t.value === type)!;

  async function handleValider() {
    if (!canSave) return;
    setSaving(true);
    try {
      await sortiesApi.create({ clientId: parseInt(clientId), chambreId: parseInt(chambreId), dateSortie: new Date().toISOString().split('T')[0], nbCaisses: nb, typeCaisse: type });
      toast.success(`✓ ${nb} caisses sorties`);
      setQuantite(''); setChambreId('');
      refetchChambres(); refetchSorties(); refetchStock();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  const filteredSorties = useMemo(() => {
    return (sorties || []).filter((s: any) => {
      const mc = hFilterClient ? s.client.id === parseInt(hFilterClient) : true;
      const mt = hFilterType ? s.typeCaisse === hFilterType : true;
      const mch = hFilterChambre ? s.chambre?.id === parseInt(hFilterChambre) : true;
      return mc && mt && mch && isInCampagne(s.dateSortie);
    });
  }, [sorties, hFilterClient, hFilterType, hFilterChambre, campagneActive]);

  return (
    <div className="fade-in" style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,166,35,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⬆️</div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>Sortie de caisses</h1>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                Campagne {campagneActive} — {clientsAvecStock.length} client(s) avec stock
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--c-bg2)', borderRadius: 10, padding: 4 }}>
            <button onClick={() => setTab('sortie')} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === 'sortie' ? '#f5a623' : 'transparent', color: tab === 'sortie' ? '#fff' : 'var(--c-text2)' }}>⬆ Sortie</button>
            <button onClick={() => setTab('historique')} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === 'historique' ? 'var(--c-primary)' : 'transparent', color: tab === 'historique' ? '#fff' : 'var(--c-text2)' }}>📋 Historique ({(sorties || []).filter((s: any) => isInCampagne(s.dateSortie)).length})</button>
          </div>
        </div>
      </div>

      {/* ── TAB SORTIE ── */}
      {tab === 'sortie' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 1. Client — seulement ceux avec stock > 0 */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>👤 Client</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{clientsAvecStock.length} avec stock en chambre</div>
            </div>
            <select value={clientId} onChange={e => { setClientId(e.target.value); setChambreId(''); setQuantite(''); }}
              style={{ width: '100%', background: 'var(--c-bg2)', border: '2px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '12px 14px', fontSize: 15, fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
              <option value="">— Sélectionner un client —</option>
              {clientsAvecStock.map(c => {
                const sc = allStocks?.find((s: any) => s.clientId === c.id);
                return <option key={c.id} value={c.id}>{c.nom} — stock: {sc?.stockActuel || 0}</option>;
              })}
            </select>

            {/* Stock total + Restant à sortir */}
            {loadingStock && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--c-text3)' }}>Chargement stock...</div>}
            {!loadingStock && stockDetail && stockTotal.total > 0 && (
              <>
                {/* Bandeau restant total */}
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245,166,35,.08)', border: '1px solid rgba(245,166,35,.25)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--c-text2)', fontWeight: 600 }}>📦 Restant à sortir</span>
                  <strong style={{ fontSize: 18, color: '#f5a623' }}>{stockTotal.total} caisses</strong>
                </div>
                {/* Détail par type */}
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {stockTotal.plastique > 0 && (
                    <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90 }}>
                      <div style={{ fontSize: 10, color: '#4f8ef7', fontWeight: 700, marginBottom: 2 }}>🧴 Plastique</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#4f8ef7' }}>{stockTotal.plastique}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>en chambre</div>
                    </div>
                  )}
                  {stockTotal.bois > 0 && (
                    <div style={{ background: 'rgba(245,166,35,.08)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90 }}>
                      <div style={{ fontSize: 10, color: '#f5a623', fontWeight: 700, marginBottom: 2 }}>🪵 Bois</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#f5a623' }}>{stockTotal.bois}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>en chambre</div>
                    </div>
                  )}
                  {stockTotal.tranger > 0 && (
                    <div style={{ background: 'rgba(0,212,180,.08)', border: '1px solid rgba(0,212,180,.2)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90 }}>
                      <div style={{ fontSize: 10, color: '#00d4b4', fontWeight: 700, marginBottom: 2 }}>📦 Étranger</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#00d4b4' }}>{stockTotal.tranger}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>en chambre</div>
                    </div>
                  )}
                </div>
              </>
            )}
            {!loadingStock && clientId && stockTotal.total === 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic' }}>Aucun stock en chambre</div>
            )}
          </div>

          {/* 2. Type */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>📦 Type de caisse</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {TYPES.map(t => {
                const stockType = t.value === 'bois' ? stockTotal.bois : t.value === 'plastique' ? stockTotal.plastique : stockTotal.tranger;
                const dispo = !clientId || stockType > 0;
                return (
                  <button key={t.value} onClick={() => { setType(t.value); setChambreId(''); setQuantite(''); }}
                    style={{ flex: 1, padding: '14px 8px', borderRadius: 12, cursor: dispo ? 'pointer' : 'not-allowed', opacity: clientId && !dispo ? 0.4 : 1, transition: 'all .15s', background: type === t.value ? t.bg : 'var(--c-bg2)', border: `2px solid ${type === t.value ? t.border : 'var(--c-border)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 24 }}>{t.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: type === t.value ? t.color : 'var(--c-text2)' }}>{t.label}</span>
                    {clientId && <span style={{ fontSize: 10, color: stockType > 0 ? t.color : 'var(--c-text3)', fontWeight: 700 }}>{stockType > 0 ? `${stockType} disponibles` : 'Aucun stock'}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Chambre */}
          {clientId && !loadingStock && (
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>❄ Chambre source</div>
              {chambresAvecStock.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--c-text3)', fontSize: 13, fontStyle: 'italic' }}>Aucun stock {typeActif.icon} {typeActif.label} pour ce client</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chambresAvecStock.map(c => {
                    const selected = chambreId === String(c.id);
                    return (
                      <button key={c.id} onClick={() => { setChambreId(String(c.id)); setQuantite(String(c.stockType)); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all .15s', textAlign: 'left', background: selected ? typeActif.bg : 'var(--c-bg2)', border: `2px solid ${selected ? typeActif.border : 'var(--c-border)'}` }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: selected ? typeActif.bg : 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>❄</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: selected ? typeActif.color : 'var(--c-text)' }}>{c.nom}</div>
                          <div style={{ fontSize: 13, marginTop: 3, color: typeActif.color, fontWeight: 700 }}>{typeActif.icon} {c.stockType} caisses à sortir</div>
                        </div>
                        {selected && <span style={{ color: typeActif.color, fontSize: 18 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Quantité */}
          {chambreId && (
            <div style={{ background: 'var(--c-surface)', border: `2px solid ${depasseStock ? 'var(--c-danger)' : 'var(--c-border)'}`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>🔢 Quantité à sortir</div>
                <div style={{ fontSize: 12, color: typeActif.color, fontWeight: 700 }}>max: {stockDispo}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setQuantite(String(Math.max(0, nb - 1)))} style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--c-border)', background: 'var(--c-bg2)', color: 'var(--c-text)', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>−</button>
                <input type="text" inputMode="numeric" value={quantite} onFocus={e => e.target.select()}
                  onChange={e => setQuantite(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ flex: 1, textAlign: 'center', padding: '12px', fontSize: 28, fontWeight: 800, background: 'var(--c-bg2)', border: `2px solid ${depasseStock ? 'var(--c-danger)' : typeActif.border}`, borderRadius: 12, color: depasseStock ? 'var(--c-danger)' : 'var(--c-text)', outline: 'none' }} placeholder="0" />
                <button onClick={() => setQuantite(String(Math.min(nb + 1, stockDispo)))} style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--c-border)', background: 'var(--c-bg2)', color: 'var(--c-text)', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>+</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {[Math.floor(stockDispo * 0.25), Math.floor(stockDispo * 0.5), Math.floor(stockDispo * 0.75)].filter(v => v > 0 && v < stockDispo).map(v => (
                  <button key={v} onClick={() => setQuantite(String(v))} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${typeActif.border}`, background: typeActif.bg, color: typeActif.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{v} ({Math.round(v / stockDispo * 100)}%)</button>
                ))}
                <button onClick={() => setQuantite(String(stockDispo))} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${typeActif.border}`, background: typeActif.bg, color: typeActif.color, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Tout ({stockDispo})</button>
              </div>
              {depasseStock && nb > 0 && <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(240,90,90,.1)', border: '1px solid rgba(240,90,90,.3)', borderRadius: 8, fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>⚠ Stock insuffisant — disponible : {stockDispo}</div>}
            </div>
          )}

          {/* Valider */}
          <button onClick={handleValider} disabled={!canSave || saving}
            style={{ width: '100%', padding: '18px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 800, cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: canSave ? '#f5a623' : 'var(--c-surface2)', color: canSave ? '#fff' : 'var(--c-text3)', transition: 'all .2s', boxShadow: canSave ? '0 4px 20px rgba(245,166,35,.3)' : 'none' }}>
            {saving ? '⏳ En cours...' : canSave ? `✓ VALIDER LA SORTIE — ${nb} ${typeActif.label}` : '✓ VALIDER LA SORTIE'}
          </button>
        </div>
      )}

      {/* ── TAB HISTORIQUE ── */}
      {tab === 'historique' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <select value={hFilterClient} onChange={e => setHFilterClient(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', flex: 1 }}>
              <option value="">Tous les clients</option>
              {(clients || []).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={hFilterChambre} onChange={e => setHFilterChambre(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', flex: 1 }}>
              <option value="">Toutes chambres</option>
              {(chambres || []).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={hFilterType} onChange={e => setHFilterType(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}>
              <option value="">Tous types</option>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
            {(hFilterClient || hFilterType || hFilterChambre) && (
              <button onClick={() => { setHFilterClient(''); setHFilterType(''); setHFilterChambre(''); }}
                style={{ background: 'none', border: '1px solid var(--c-border)', color: 'var(--c-text3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {TYPES.map(t => {
              const n = filteredSorties.filter((s: any) => s.typeCaisse === t.value).reduce((sum: number, s: any) => sum + s.nbCaisses, 0);
              if (!n) return null;
              return <div key={t.value} style={{ background: 'var(--c-surface)', border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <div><div style={{ fontWeight: 800, fontSize: 16, color: t.color }}>{n.toLocaleString('fr-FR')}</div><div style={{ fontSize: 10, color: 'var(--c-text3)' }}>{t.label}</div></div>
              </div>;
            })}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-text3)', alignSelf: 'center' }}>{filteredSorties.length} sortie(s)</div>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--c-border)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--c-bg2)' }}>
                {['Date', 'Client', 'Chambre', 'Type', 'Nb', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredSorties.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucune sortie</td></tr>}
                {filteredSorties.map((s: any, i: number) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{format(new Date(s.dateSortie), 'dd/MM/yy')}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.client.nom}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.chambre?.nom}</span></td>
                    <td style={{ padding: '10px 12px' }}><span style={{ color: typeColor(s.typeCaisse), fontWeight: 600, fontSize: 13 }}>{typeIcon(s.typeCaisse)} {s.typeCaisse}</span></td>
                    <td style={{ padding: '10px 12px' }}><strong style={{ color: '#f5a623', fontSize: 14 }}>-{s.nbCaisses}</strong></td>
                    <td style={{ padding: '10px 8px' }}>
                      <button onClick={async () => {
                        if (!confirm(`Annuler cette sortie (-${s.nbCaisses} ${s.typeCaisse} pour ${s.client.nom}) ?`)) return;
                        try { await sortiesApi.delete(s.id); toast.success('Sortie annulée'); refetchSorties(); refetchChambres(); }
                        catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
                      }} style={{ background: 'rgba(240,90,90,.12)', border: '1px solid rgba(240,90,90,.25)', color: 'var(--c-danger)', borderRadius: 6, width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
