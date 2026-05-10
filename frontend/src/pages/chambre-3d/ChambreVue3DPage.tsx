import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { chambresApi } from '../../services';
import { Spinner } from '../../components/ui/UI';
import { useCampagne } from '../../contexts/CampagneContext';

const BASE = import.meta.env.VITE_API_URL || 'https://froidpom.onrender.com/api';
function getToken() { return localStorage.getItem('froidpom_token'); }

async function fetchStockParClient() {
  const res = await fetch(`${BASE}/stock/clients`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!res.ok) return [];
  return res.json();
}

const PALETTE = [
  '#4f8ef7','#e65100','#00695c','#6a1b9a','#c62828',
  '#f57f17','#1b5e20','#01579b','#37474f','#880e4f',
  '#2e7d32','#ad1457','#0277bd','#4e342e','#00838f',
  '#558b2f','#6d4c41','#0097a7','#7b1fa2','#d84315',
  '#1565c0','#00838f','#558b2f','#880e4f','#f57f17',
];

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

// Composant carte chambre avec visualisation en barres
function CarteChambre({ chambre, clients, clientCouleurs }: {
  chambre: any;
  clients: { clientId: number; nom: string; stock: number; color: string }[];
  clientCouleurs: Record<number, string>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const pct = chambre.capaciteMax > 0 ? Math.round((chambre.stockActuel / chambre.capaciteMax) * 100) : 0;
  const total = clients.reduce((s, c) => s + c.stock, 0);

  return (
    <div style={{
      background: '#0d1b2a',
      border: '1px solid #1e4a6e',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'transform .2s',
    }}>
      {/* Header chambre */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e4a6e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,142,247,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>❄</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#7eb8f7' }}>{chambre.nom}</div>
              <div style={{ fontSize: 11, color: '#4a7fa8' }}>{fmt(chambre.stockActuel)} / {fmt(chambre.capaciteMax)} caisses</div>
            </div>
          </div>
          <div style={{
            background: pct > 85 ? 'rgba(240,90,90,.2)' : pct > 60 ? 'rgba(245,166,35,.2)' : 'rgba(46,207,138,.2)',
            color: pct > 85 ? '#f05a5a' : pct > 60 ? '#f5a623' : '#2ecf8a',
            border: `1px solid ${pct > 85 ? 'rgba(240,90,90,.4)' : pct > 60 ? 'rgba(245,166,35,.4)' : 'rgba(46,207,138,.4)'}`,
            borderRadius: 20, padding: '4px 12px', fontSize: 14, fontWeight: 800,
          }}>{pct}%</div>
        </div>

        {/* Barre de remplissage globale */}
        <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 20, transition: 'width .6s ease',
            width: `${pct}%`,
            background: pct > 85 ? 'linear-gradient(90deg,#f05a5a,#ff8a80)' : pct > 60 ? 'linear-gradient(90deg,#f5a623,#ffd54f)' : 'linear-gradient(90deg,#2ecf8a,#80cbc4)',
          }} />
        </div>

        {/* Barre segmentée par client */}
        {clients.length > 0 && (
          <div style={{ display: 'flex', height: 6, borderRadius: 20, overflow: 'hidden', marginTop: 6, gap: 1 }}>
            {clients.map(c => (
              <div key={c.clientId}
                onMouseEnter={() => setHovered(c.clientId)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  height: '100%',
                  width: `${(c.stock / chambre.capaciteMax) * 100}%`,
                  background: c.color,
                  opacity: hovered === null || hovered === c.clientId ? 1 : 0.3,
                  transition: 'opacity .2s',
                  cursor: 'pointer',
                }} />
            ))}
            {/* Espace libre */}
            <div style={{ flex: 1, height: '100%', background: 'rgba(255,255,255,.04)' }} />
          </div>
        )}
      </div>

      {/* Liste clients */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#2a5f8a', fontSize: 13, padding: '20px 0', fontStyle: 'italic' }}>Chambre vide</div>
        ) : (
          clients.map(c => {
            const pctClient = chambre.capaciteMax > 0 ? (c.stock / chambre.capaciteMax) * 100 : 0;
            const isHov = hovered === c.clientId;
            return (
              <div key={c.clientId}
                onMouseEnter={() => setHovered(c.clientId)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                  borderRadius: 8, transition: 'background .15s',
                  background: isHov ? 'rgba(255,255,255,.06)' : 'transparent',
                  cursor: 'pointer',
                }}>
                {/* Couleur dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                {/* Nom */}
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: isHov ? '#e8edf8' : '#8fa3cc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.nom}
                </div>
                {/* Barre */}
                <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pctClient * (100 / Math.max(...clients.map(x => (x.stock / chambre.capaciteMax) * 100))))}%`, background: c.color, borderRadius: 20 }} />
                </div>
                {/* Stock */}
                <div style={{ fontSize: 12, fontWeight: 700, color: c.color, minWidth: 60, textAlign: 'right' }}>
                  {fmt(c.stock)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer totaux */}
      {clients.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #1e4a6e', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: '#4a7fa8' }}>{clients.length} client(s)</span>
          <span style={{ color: '#2ecf8a', fontWeight: 700 }}>{fmt(total)} stockées</span>
          <span style={{ color: '#4a7fa8' }}>{fmt(chambre.disponible || chambre.capaciteMax - chambre.stockActuel)} libres</span>
        </div>
      )}
    </div>
  );
}

export default function ChambreVue3DPage() {
  const { campagneActive } = useCampagne();
  const { data: chambres, loading: loadingC } = useFetch<any[]>(() => chambresApi.getAll());
  const [stockData, setStockData] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);

  useMemo(() => {
    fetchStockParClient().then(d => { setStockData(d || []); setLoadingStock(false); });
  }, []);

  // Construire le stock par chambre pour chaque client
  const stockParChambre = useMemo<Record<number, { clientId: number; nom: string; stock: number; color: string }[]>>(() => {
    if (!stockData || !chambres) return {};
    const result: Record<number, { clientId: number; nom: string; stock: number; color: string }[]> = {};
    chambres.forEach(ch => { result[ch.id] = []; });

    // Assigner couleurs une fois
    const colorMap: Record<number, string> = {};
    stockData.forEach((sc: any, i: number) => { colorMap[sc.clientId] = PALETTE[i % PALETTE.length]; });

    stockData.forEach((sc: any) => {
      Object.entries(sc.parChambre || {}).forEach(([chId, data]: [string, any]) => {
        const chIdNum = parseInt(chId);
        if (result[chIdNum] && data.stock > 0) {
          result[chIdNum].push({
            clientId: sc.clientId,
            nom: sc.clientNom || `Client ${sc.clientId}`,
            stock: data.stock,
            color: colorMap[sc.clientId] || '#37474f',
          });
        }
      });
    });

    // Trier par stock décroissant
    Object.keys(result).forEach(k => {
      result[parseInt(k)].sort((a, b) => b.stock - a.stock);
    });

    return result;
  }, [stockData, chambres]);

  // KPIs globaux
  const kpis = useMemo(() => {
    if (!chambres) return null;
    const totalStock = chambres.reduce((s: number, c: any) => s + c.stockActuel, 0);
    const totalCapacite = chambres.reduce((s: number, c: any) => s + c.capaciteMax, 0);
    const pct = totalCapacite > 0 ? Math.round((totalStock / totalCapacite) * 100) : 0;
    const pleines = chambres.filter((c: any) => c.disponible === 0).length;
    const totalClients = new Set(stockData.filter((sc: any) => sc.stockActuel > 0).map((sc: any) => sc.clientId)).size;
    return { totalStock, totalCapacite, pct, pleines, totalClients };
  }, [chambres, stockData]);

  if (loadingC || loadingStock) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>
              Vue Chambres Froides
            </h1>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>
              Campagne {campagneActive} — Stock en temps réel
            </div>
          </div>
          {kpis && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-primary)' }}>{fmt(kpis.totalStock)}</div>
                <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>caisses stockées</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: kpis.pct > 85 ? 'var(--c-danger)' : 'var(--c-success)' }}>{kpis.pct}%</div>
                <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>occupation globale</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-warning)' }}>{kpis.totalClients}</div>
                <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>clients actifs</div>
              </div>
              {kpis.pleines > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-danger)' }}>{kpis.pleines}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>chambre(s) pleine(s)</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barre globale */}
        {kpis && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>
              <span>Occupation globale : {fmt(kpis.totalStock)} / {fmt(kpis.totalCapacite)}</span>
              <span>{fmt(kpis.totalCapacite - kpis.totalStock)} places libres</span>
            </div>
            <div style={{ height: 10, background: 'var(--c-bg2)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 20,
                width: `${kpis.pct}%`,
                background: kpis.pct > 85 ? 'linear-gradient(90deg,#f05a5a,#ff8a80)' : 'linear-gradient(90deg,#4f8ef7,#7eb8f7)',
                transition: 'width .8s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Grille chambres */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {(chambres || []).map((ch: any) => (
          <CarteChambre
            key={ch.id}
            chambre={ch}
            clients={stockParChambre[ch.id] || []}
            clientCouleurs={{}}
          />
        ))}
      </div>

      {/* Légende globale clients */}
      {stockData.filter((sc: any) => sc.stockActuel > 0).length > 0 && (
        <div style={{ marginTop: 20, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Tous les clients en stock
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stockData.filter((sc: any) => sc.stockActuel > 0)
              .sort((a: any, b: any) => b.stockActuel - a.stockActuel)
              .map((sc: any, i: number) => (
                <div key={sc.clientId} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--c-bg2)', borderRadius: 8, padding: '6px 10px',
                  border: '1px solid var(--c-border)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>{sc.clientNom}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: PALETTE[i % PALETTE.length] }}>{fmt(sc.stockActuel)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(79,142,247,.06)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 10, fontSize: 12, color: 'var(--c-text2)' }}>
        💡 <strong>Vue stock</strong> — Survoler une barre pour identifier le client. Les données sont en temps réel depuis les entrées/sorties enregistrées.
      </div>
    </div>
  );
}
