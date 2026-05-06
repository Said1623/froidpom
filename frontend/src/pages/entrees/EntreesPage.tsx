import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { entreesApi, clientsApi, chambresApi, reservationsApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import type { Client, Chambre, Reservation } from '../../types';
import toast from 'react-hot-toast';
import { useCampagne } from '../../contexts/CampagneContext';

const TYPES = [
  { value: 'plastique', label: 'Plastique', icon: '🧴', color: '#4f8ef7', bg: 'rgba(79,142,247,.12)', border: 'rgba(79,142,247,.4)' },
  { value: 'bois',      label: 'Bois',      icon: '🪵', color: '#f5a623', bg: 'rgba(245,166,35,.12)', border: 'rgba(245,166,35,.4)' },
  { value: 'tranger',   label: 'Étranger',  icon: '📦', color: '#00d4b4', bg: 'rgba(0,212,180,.12)', border: 'rgba(0,212,180,.4)' },
];

export default function EntreePage() {
  const { campagneActive, isInCampagne } = useCampagne();
  const { data: clients } = useFetch<Client[]>(() => clientsApi.getAll(campagneActive), [campagneActive]);
  const { data: chambres, refetch: refetchChambres } = useFetch<Chambre[]>(() => chambresApi.getAll());
  const { data: reservations } = useFetch<Reservation[]>(() => reservationsApi.getAll());
  const { data: entrees, refetch: refetchEntrees } = useFetch<any[]>(() => entreesApi.getAll());

  const [clientId, setClientId] = useState('');
  const [type, setType] = useState('plastique');
  const [quantite, setQuantite] = useState('');
  const [chambreId, setChambreId] = useState('');
  const [saving, setSaving] = useState(false);

  // Données du client sélectionné
  const clientData = useMemo(() => {
    if (!clientId || !reservations || !entrees) return null;
    const cid = parseInt(clientId);
    const resa = reservations.find(r => r.client.id === cid && isInCampagne((r as any).dateReservation));
    if (!resa) return null;
    const resaB = resa.nbCaissesBois || 0;
    const resaP = (resa as any).nbCaissesPластique || 0;
    const resaT = (resa as any).nbCaissesTranger || 0;
    const dejaB = entrees.filter(e => e.client.id === cid && e.typeCaisse === 'bois' && isInCampagne(e.dateEntree)).reduce((s: number, e: any) => s + e.nbCaisses, 0);
    const dejaP = entrees.filter(e => e.client.id === cid && e.typeCaisse === 'plastique' && isInCampagne(e.dateEntree)).reduce((s: number, e: any) => s + e.nbCaisses, 0);
    const dejaT = entrees.filter(e => e.client.id === cid && e.typeCaisse === 'tranger' && isInCampagne(e.dateEntree)).reduce((s: number, e: any) => s + e.nbCaisses, 0);
    return {
      resaB, resaP, resaT,
      resteB: Math.max(0, resaB - dejaB),
      resteP: Math.max(0, resaP - dejaP),
      resteT: Math.max(0, resaT - dejaT),
    };
  }, [clientId, reservations, entrees]);

  const chambre = (chambres || []).find(c => String(c.id) === chambreId);
  const nb = parseInt(quantite) || 0;
  const quotaReste = clientData
    ? type === 'bois' ? clientData.resteB : type === 'plastique' ? clientData.resteP : clientData.resteT
    : 0;
  const depasseQuota = nb > quotaReste;
  const depasseChambre = chambre ? nb > chambre.disponible : false;
  const canSave = clientId && chambreId && nb > 0 && !depasseQuota && !depasseChambre;

  async function handleValider() {
    if (!canSave) return;
    setSaving(true);
    try {
      await entreesApi.create({
        clientId: parseInt(clientId),
        chambreId: parseInt(chambreId),
        dateEntree: new Date().toISOString().split('T')[0],
        nbCaisses: nb,
        typeCaisse: type,
      });
      toast.success(`✓ ${nb} caisses entrées`);
      setQuantite('');
      refetchChambres();
      refetchEntrees();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const typeActif = TYPES.find(t => t.value === type)!;

  return (
    <div className="fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(46,207,138,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⬇️</div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>Entrée de caisses</h1>
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
            onChange={e => { setClientId(e.target.value); setQuantite(''); }}
            style={{ width: '100%', background: 'var(--c-bg2)', border: '2px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', padding: '12px 14px', fontSize: 15, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">— Sélectionner un client —</option>
            {(clients || []).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          {/* Quota client */}
          {clientData && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {clientData.resaP > 0 && (
                <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90 }}>
                  <div style={{ fontSize: 10, color: '#4f8ef7', fontWeight: 700, marginBottom: 2 }}>🧴 Plastique</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#4f8ef7' }}>{clientData.resteP}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>restant / {clientData.resaP}</div>
                </div>
              )}
              {clientData.resaB > 0 && (
                <div style={{ background: 'rgba(245,166,35,.08)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90 }}>
                  <div style={{ fontSize: 10, color: '#f5a623', fontWeight: 700, marginBottom: 2 }}>🪵 Bois</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f5a623' }}>{clientData.resteB}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>restant / {clientData.resaB}</div>
                </div>
              )}
              {clientData.resaT > 0 && (
                <div style={{ background: 'rgba(0,212,180,.08)', border: '1px solid rgba(0,212,180,.2)', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 90 }}>
                  <div style={{ fontSize: 10, color: '#00d4b4', fontWeight: 700, marginBottom: 2 }}>📦 Étranger</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#00d4b4' }}>{clientData.resteT}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>restant / {clientData.resaT}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Type de caisse */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>📦 Type de caisse</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => { setType(t.value); setQuantite(''); }}
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

        {/* 3. Quantité */}
        <div style={{ background: 'var(--c-surface)', border: `2px solid ${depasseQuota || depasseChambre ? 'var(--c-danger)' : 'var(--c-border)'}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>🔢 Quantité</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setQuantite(String(Math.max(0, nb - 1)))}
              style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--c-border)', background: 'var(--c-bg2)', color: 'var(--c-text)', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>−</button>
            <input
              type="text" inputMode="numeric" value={quantite}
              onFocus={e => e.target.select()}
              onChange={e => setQuantite(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                flex: 1, textAlign: 'center', padding: '12px', fontSize: 28, fontWeight: 800,
                background: 'var(--c-bg2)', border: `2px solid ${depasseQuota || depasseChambre ? 'var(--c-danger)' : typeActif.border}`,
                borderRadius: 12, color: depasseQuota || depasseChambre ? 'var(--c-danger)' : 'var(--c-text)', outline: 'none',
              }}
              placeholder="0"
            />
            <button
              onClick={() => setQuantite(String(nb + 1))}
              style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid var(--c-border)', background: 'var(--c-bg2)', color: 'var(--c-text)', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>+</button>
          </div>
          {/* Boutons raccourcis */}
          {clientData && quotaReste > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[25, 50, 100].filter(v => v <= quotaReste).map(v => (
                <button key={v} onClick={() => setQuantite(String(v))}
                  style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${typeActif.border}`, background: typeActif.bg, color: typeActif.color, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{v}</button>
              ))}
              <button onClick={() => setQuantite(String(quotaReste))}
                style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${typeActif.border}`, background: typeActif.bg, color: typeActif.color, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Max ({quotaReste})</button>
            </div>
          )}
          {/* Alertes */}
          {depasseQuota && nb > 0 && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(240,90,90,.1)', border: '1px solid rgba(240,90,90,.3)', borderRadius: 8, fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>
              ⚠ Dépasse le quota — max autorisé : {quotaReste}
            </div>
          )}
          {depasseChambre && !depasseQuota && nb > 0 && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(240,90,90,.1)', border: '1px solid rgba(240,90,90,.3)', borderRadius: 8, fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>
              ⚠ Chambre pleine — disponible : {chambre?.disponible}
            </div>
          )}
        </div>

        {/* 4. Chambre */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>❄ Chambre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(chambres || []).map(c => {
              const pct = c.capaciteMax > 0 ? Math.round((c.stockActuel / c.capaciteMax) * 100) : 0;
              const pleine = c.disponible === 0;
              const selected = chambreId === String(c.id);
              return (
                <button key={c.id} onClick={() => !pleine && setChambreId(String(c.id))}
                  disabled={pleine}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    borderRadius: 10, cursor: pleine ? 'not-allowed' : 'pointer', transition: 'all .15s', textAlign: 'left',
                    background: selected ? 'rgba(79,142,247,.1)' : pleine ? 'rgba(240,90,90,.04)' : 'var(--c-bg2)',
                    border: `2px solid ${selected ? 'var(--c-primary)' : pleine ? 'rgba(240,90,90,.2)' : 'var(--c-border)'}`,
                    opacity: pleine ? 0.6 : 1,
                  }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: selected ? 'rgba(79,142,247,.2)' : 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>❄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: selected ? 'var(--c-primary)' : 'var(--c-text)' }}>{c.nom}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 4, background: 'var(--c-bg2)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
                        <div style={{ height: '100%', borderRadius: 20, width: `${pct}%`, background: pct > 85 ? 'var(--c-danger)' : pct > 60 ? '#f5a623' : 'var(--c-success)' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pleine ? 'var(--c-danger)' : 'var(--c-success)', whiteSpace: 'nowrap' }}>
                        {pleine ? '⚠ Pleine' : `${c.disponible} libre`}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{pct}%</span>
                    </div>
                  </div>
                  {selected && <span style={{ color: 'var(--c-primary)', fontSize: 18 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bouton Valider */}
        <button
          onClick={handleValider}
          disabled={!canSave || saving}
          style={{
            width: '100%', padding: '18px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 800,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            background: canSave ? 'var(--c-success)' : 'var(--c-surface2)',
            color: canSave ? '#fff' : 'var(--c-text3)',
            transition: 'all .2s',
            boxShadow: canSave ? '0 4px 20px rgba(46,207,138,.3)' : 'none',
          }}>
          {saving ? '⏳ En cours...' : canSave ? `✓ VALIDER L'ENTRÉE — ${nb} ${typeActif.label}` : '✓ VALIDER L\'ENTRÉE'}
        </button>
      </div>
    </div>
  );
}
