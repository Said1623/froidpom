import { useState, useMemo, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { sortiesApi, clientsApi, chambresApi, stockApi } from '../../services';
import type { Client, Chambre } from '../../types';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const TYPES = [
  { value: 'plastique', label: 'Plastique', icon: '🧴', color: '#4f8ef7', bg: 'rgba(79,142,247,.12)', border: 'rgba(79,142,247,.4)' },
  { value: 'bois',      label: 'Bois',      icon: '🪵', color: '#f5a623', bg: 'rgba(245,166,35,.12)', border: 'rgba(245,166,35,.4)' },
  { value: 'tranger',   label: 'Étranger',  icon: '📦', color: '#00d4b4', bg: 'rgba(0,212,180,.12)', border: 'rgba(0,212,180,.4)' },
];

export default function SortiePage() {
  const { campagneActive } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());

  const [clientId, setClientId] = useState('');
  const [type, setType] = useState('plastique');
  const [chambreId, setChambreId] = useState('');
  const [quantite, setQuantite] = useState('');
  const [saving, setSaving] = useState(false);
  const [stockDetail, setStockDetail] = useState<any>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  // Charger le détail stock par type/chambre via getMouvementsClient
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
    try {
      const r = await stockApi.getStockDetailClient(parseInt(clientId));
      setStockDetail(r.data);
    } catch {}
  }

  // Chambres où ce client a du stock pour le type sélectionné
  const chambresAvecStock = useMemo(() => {
    if (!stockDetail || !chambres) return [];
    // L'endpoint getMouvementsClient retourne stockParChambre ou parChambre
    const pc = stockDetail.stockParChambre || stockDetail.parChambre || {};
    return chambres.map(ch => {
      const key = String(ch.id);
      const data = pc[key] || pc[ch.id] || null;
      const stock = !data ? 0
        : type === 'bois' ? (data.bois || data.Bois || 0)
        : type === 'plastique' ? (data.plastique || data.Plastique || 0)
        : (data.tranger || data.Tranger || data.etranger || 0);
      return { ...ch, stockType: stock };
    }).filter(ch => ch.stockType > 0);
  }, [stockDetail, chambres, type]);

  const chambreSelectionnee = chambresAvecStock.find(c => String(c.id) === chambreId);
  const stockDispo = chambreSelectionnee?.stockType || 0;
  const nb = parseInt(quantite) || 0;
  const depasseStock = nb > stockDispo;
  const canSave = clientId && chambreId && nb > 0 && !depasseStock;
  const typeActif = TYPES.find(t => t.value === type)!;

  // Stock total du client par chambre (affichage résumé)
  const resumeParChambre = useMemo(() => {
    if (!stockDetail || !chambres) return [];
    const pc = stockDetail.stockParChambre || stockDetail.parChambre || {};
    return chambres.map(ch => {
      const data = pc[String(ch.id)] || pc[ch.id] || null;
      if (!data) return null;
      const total = (data.bois || 0) + (data.plastique || 0) + (data.tranger || 0)
        || data.stock || data.total || 0;
      if (total === 0) return null;
      return { ch, data, total };
    }).filter(Boolean) as { ch: Chambre; data: any; total: number }[];
  }, [stockDetail, chambres]);

  async function handleValider() {
    if (!canSave) return;
    setSaving(true);
    try {
      await sortiesApi.create({
        clientId: parseInt(clientId),
        chambreId: parseInt(chambreId),
        dateSortie: new Date().toISOString().split('T')[0],
        nbCaisses: nb,
        typeCaisse: type,
      });
      toast.success(`✓ ${nb} caisses sorties`);
      setQuantite('');
      setChambreId('');
      refetchChambres();
      refetchStock();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,166,35,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⬆️</div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>Sortie de caisses</h1>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>Campagne {campagneActive}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 1. Client */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>👤 Client</div>
          <select
            value={clientId}
            onChange={e => { setClientId(e.target.value); setChambreId(''); setQuantite(''); }}
            style={{ width: '100%', background: 'var(--c-bg2)', border: '2px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '12px 14px', fontSize: 15, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">— Sélectionner un client —</option>
            {(clients || []).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          {/* Résumé stock client */}
          {loadingStock && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--c-text3)' }}>Chargement stock...</div>}
          {!loadingStock && resumeParChambre.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {resumeParChambre.map(({ ch, data }) => (
                <div key={ch.id} style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--c-primary)', marginBottom: 3 }}>❄ {ch.nom}</div>
                  {(data.bois || 0) > 0 && <div style={{ color: '#f5a623' }}>🪵 {data.bois}</div>}
                  {(data.plastique || 0) > 0 && <div style={{ color: '#4f8ef7' }}>🧴 {data.plastique}</div>}
                  {(data.tranger || 0) > 0 && <div style={{ color: '#00d4b4' }}>📦 {data.tranger}</div>}
                  {!(data.bois || data.plastique || data.tranger) && data.stock > 0 &&
                    <div style={{ color: 'var(--c-text2)' }}>📦 {data.stock} total</div>}
                </div>
              ))}
            </div>
          )}
          {!loadingStock && clientId && resumeParChambre.length === 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic' }}>Aucun stock en chambre pour ce client</div>
          )}
        </div>

        {/* 2. Type */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>📦 Type de caisse</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => { setType(t.value); setChambreId(''); setQuantite(''); }}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                  background: type === t.value ? t.bg : 'var(--c-bg2)',
                  border: `2px solid ${type === t.value ? t.border : 'var(--c-border)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: type === t.value ? t.color : 'var(--c-text2)' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Chambre — seulement celles avec stock pour ce type */}
        {clientId && !loadingStock && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>❄ Chambre source</div>
            {chambresAvecStock.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--c-text3)', fontSize: 13, fontStyle: 'italic' }}>
                Aucun stock {typeActif.icon} {typeActif.label} pour ce client
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chambresAvecStock.map(c => {
                  const selected = chambreId === String(c.id);
                  return (
                    <button key={c.id} onClick={() => { setChambreId(String(c.id)); setQuantite(String(c.stockType)); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                        borderRadius: 10, cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                        background: selected ? typeActif.bg : 'var(--c-bg2)',
                        border: `2px solid ${selected ? typeActif.border : 'var(--c-border)'}`,
                      }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: selected ? typeActif.bg : 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>❄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: selected ? typeActif.color : 'var(--c-text)' }}>{c.nom}</div>
                        <div style={{ fontSize: 13, marginTop: 3, color: typeActif.color, fontWeight: 700 }}>
                          {typeActif.icon} {c.stockType} caisses disponibles
                        </div>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>🔢 Quantité à sortir</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setQuantite(String(Math.max(0, nb - 1)))}
                style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--c-border)', background: 'var(--c-bg2)', color: 'var(--c-text)', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>−</button>
              <input
                type="text" inputMode="numeric" value={quantite}
                onFocus={e => e.target.select()}
                onChange={e => setQuantite(e.target.value.replace(/[^0-9]/g, ''))}
                style={{
                  flex: 1, textAlign: 'center', padding: '12px', fontSize: 28, fontWeight: 800,
                  background: 'var(--c-bg2)', border: `2px solid ${depasseStock ? 'var(--c-danger)' : typeActif.border}`,
                  borderRadius: 12, color: depasseStock ? 'var(--c-danger)' : 'var(--c-text)', outline: 'none',
                }}
                placeholder="0"
              />
              <button onClick={() => setQuantite(String(Math.min(nb + 1, stockDispo)))}
                style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--c-border)', background: 'var(--c-bg2)', color: 'var(--c-text)', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>+</button>
            </div>

            {/* Raccourcis */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[Math.floor(stockDispo * 0.25), Math.floor(stockDispo * 0.5), Math.floor(stockDispo * 0.75)].filter(v => v > 0 && v < stockDispo).map(v => (
                <button key={v} onClick={() => setQuantite(String(v))}
                  style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${typeActif.border}`, background: typeActif.bg, color: typeActif.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {v} ({Math.round(v / stockDispo * 100)}%)
                </button>
              ))}
              <button onClick={() => setQuantite(String(stockDispo))}
                style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${typeActif.border}`, background: typeActif.bg, color: typeActif.color, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Tout ({stockDispo})
              </button>
            </div>

            {depasseStock && nb > 0 && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(240,90,90,.1)', border: '1px solid rgba(240,90,90,.3)', borderRadius: 8, fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>
                ⚠ Stock insuffisant — disponible : {stockDispo}
              </div>
            )}
          </div>
        )}

        {/* Bouton Valider */}
        <button
          onClick={handleValider}
          disabled={!canSave || saving}
          style={{
            width: '100%', padding: '18px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 800,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            background: canSave ? '#f5a623' : 'var(--c-surface2)',
            color: canSave ? '#fff' : 'var(--c-text3)',
            transition: 'all .2s',
            boxShadow: canSave ? '0 4px 20px rgba(245,166,35,.3)' : 'none',
          }}>
          {saving ? '⏳ En cours...' : canSave ? `✓ VALIDER LA SORTIE — ${nb} ${typeActif.label}` : '✓ VALIDER LA SORTIE'}
        </button>
      </div>
    </div>
  );
}
