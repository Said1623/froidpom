import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { chambresApi, clientsApi } from '../../services';
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

// Palette couleurs clients
const PALETTE = [
  '#1565c0','#e65100','#00695c','#6a1b9a','#c62828',
  '#f57f17','#1b5e20','#01579b','#37474f','#880e4f',
  '#2e7d32','#ad1457','#0277bd','#4e342e','#00838f',
  '#558b2f','#6d4c41','#0097a7','#7b1fa2','#d84315',
];

// Composant SVG 3D isométrique
function Chambre3D({ chambre, stockParClient, clientCouleurs }: {
  chambre: any;
  stockParClient: Record<number, { nom: string; bois: number; plastique: number; total: number }>;
  clientCouleurs: Record<number, string>;
}) {
  const W = 900;
  const H = 700;

  // Dimensions isométriques
  const OX = 450; // centre
  const OY = 560; // base (plus bas pour donner de la hauteur)
  const CW = 130;  // largeur caisse iso — plus large
  const CH = 38;   // hauteur caisse — plus haute
  const DEPTH = 40; // profondeur

  // Convertir coordonnées grille → iso
  function isoX(col: number, row: number) { return OX + (col - row) * CW; }
  function isoY(col: number, row: number, stack: number) { return OY + (col + row) * (DEPTH / 2) - stack * CH; }

  // Trier les clients par stock décroissant
  const clients = Object.entries(stockParClient)
    .filter(([, v]) => v.total > 0)
    .sort(([, a], [, b]) => b.total - a.total);

  // Calculer la grille de placement
  const COLS = 5;
  const gridItems: { clientId: number; col: number; row: number; stacks: number; color: string; nom: string }[] = [];

  clients.forEach(([cidStr, data], idx) => {
    const cid = parseInt(cidStr);
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const maxStack = chambre.capaciteMax > 0
      ? Math.max(1, Math.round((data.total / chambre.capaciteMax) * 12))
      : 1;
    gridItems.push({
      clientId: cid, col, row,
      stacks: Math.min(maxStack, 8),
      color: clientCouleurs[cid] || '#37474f',
      nom: data.nom.split(' ')[0],
    });
  });

  // Dessiner les murs
  const wallH = 220;
  const floorY = OY + 60;

  // Mur gauche
  const wallLeft = [
    `${OX - COLS * CW},${floorY}`,
    `${OX - COLS * CW},${floorY - wallH}`,
    `${OX},${floorY - wallH - COLS * (DEPTH / 2)}`,
    `${OX},${floorY - COLS * (DEPTH / 2)}`,
  ].join(' ');

  // Mur droit
  const wallRight = [
    `${OX},${floorY - COLS * (DEPTH / 2)}`,
    `${OX},${floorY - wallH - COLS * (DEPTH / 2)}`,
    `${OX + COLS * CW},${floorY - wallH}`,
    `${OX + COLS * CW},${floorY}`,
  ].join(' ');

  // Sol
  const floor = [
    `${OX - COLS * CW},${floorY}`,
    `${OX},${floorY - COLS * (DEPTH / 2)}`,
    `${OX + COLS * CW},${floorY}`,
    `${OX},${floorY + COLS * (DEPTH / 2)}`,
  ].join(' ');

  // Dessiner une caisse iso
  function drawBox(cx: number, cy: number, color: string, label: string, isTop: boolean) {
    const darkColor = shadeColor(color, -30);
    const lightColor = shadeColor(color, 20);
    const top = [
      `${cx},${cy}`,
      `${cx + CW},${cy - DEPTH / 2}`,
      `${cx},${cy - CH}`,
      `${cx - CW},${cy - DEPTH / 2}`,
    ].join(' ');
    const left = [
      `${cx - CW},${cy - DEPTH / 2}`,
      `${cx - CW},${cy - DEPTH / 2 - CH}`,
      `${cx},${cy - CH}`,
      `${cx},${cy}`,
    ].join(' ');
    const right = [
      `${cx},${cy}`,
      `${cx},${cy - CH}`,
      `${cx + CW},${cy - DEPTH / 2 - CH}`,
      `${cx + CW},${cy - DEPTH / 2}`,
    ].join(' ');

    // Point d'ancrage : coin gauche du toit de la caisse
    const anchorX = cx - CW;
    const anchorY = cy - DEPTH / 2 - CH;
    // Label à gauche, décalé de 18px
    const labelX = anchorX - 18;
    const labelY = anchorY + 4;
    const labelW = Math.max(label.length * 7 + 10, 60);

    return `
      <polygon points="${left}" fill="${darkColor}" stroke="#0d1b2a" stroke-width="0.5"/>
      <polygon points="${right}" fill="${lightColor}" stroke="#0d1b2a" stroke-width="0.5"/>
      <polygon points="${top}" fill="${color}" stroke="#0d1b2a" stroke-width="0.5"/>
      ${isTop && label ? `
        <line x1="${anchorX}" y1="${anchorY}" x2="${labelX}" y2="${labelY}" stroke="${color}" stroke-width="1.2" opacity="0.8"/>
        <rect x="${labelX - labelW}" y="${labelY - 11}" width="${labelW}" height="16" rx="4" fill="#0d1b2a" opacity="0.82"/>
        <rect x="${labelX - labelW}" y="${labelY - 11}" width="3" height="16" rx="2" fill="${color}"/>
        <text x="${labelX - labelW + 8}" y="${labelY + 1}" font-size="12" font-weight="700" fill="white" font-family="system-ui" style="pointer-events:none">${label}</text>
      ` : ''}
    `;
  }

  function shadeColor(color: string, percent: number) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Trier les items pour le rendu (arrière → avant)
  const sorted = [...gridItems].sort((a, b) => (b.col + b.row) - (a.col + a.row));

  const tauxRemplissage = chambre.capaciteMax > 0
    ? Math.round((chambre.stockActuel / chambre.capaciteMax) * 100)
    : 0;

  return (
    <div style={{ width: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>

        {/* Fond */}
        <rect width={W} height={H} fill="#0d1b2a" rx="12"/>

        {/* Titre chambre */}
        <text x={W / 2} y="32" textAnchor="middle" fontSize="16" fontWeight="700" fill="#7eb8f7" fontFamily="system-ui">
          ❄ {chambre.nom}
        </text>
        <text x={W / 2} y="52" textAnchor="middle" fontSize="11" fill="#4a7fa8" fontFamily="system-ui">
          {chambre.stockActuel?.toLocaleString('fr-FR')} / {chambre.capaciteMax?.toLocaleString('fr-FR')} caisses · {tauxRemplissage}% remplie
        </text>

        {/* Mur gauche */}
        <polygon points={wallLeft} fill="#0f2d4a" stroke="#1e4a6e" strokeWidth="1"/>
        {/* Mur droit */}
        <polygon points={wallRight} fill="#0a2038" stroke="#1e4a6e" strokeWidth="1"/>
        {/* Sol */}
        <polygon points={floor} fill="#0d2540" stroke="#1e4a6e" strokeWidth="1"/>

        {/* Grille au sol */}
        {Array.from({ length: COLS + 1 }).map((_, i) => (
          <g key={i} opacity="0.15">
            <line
              x1={OX - COLS * CW + i * CW * 2}
              y1={floorY - i * (DEPTH / 2) + (COLS - i) * (DEPTH / 2)}
              x2={OX + i * CW * 2 - COLS * CW}
              y2={floorY + COLS * (DEPTH / 2) - i * DEPTH}
              stroke="#4a9ad4" strokeWidth="0.5"
            />
          </g>
        ))}

        {/* Tuyaux plafond */}
        <line x1={OX - COLS * CW} y1={floorY - wallH} x2={OX} y2={floorY - wallH - COLS * (DEPTH / 2)} stroke="#2a6aa8" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
        <line x1={OX} y1={floorY - wallH - COLS * (DEPTH / 2)} x2={OX + COLS * CW} y2={floorY - wallH} stroke="#2a6aa8" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>

        {/* Évaporateur */}
        <rect x={OX - 50} y={floorY - wallH - COLS * (DEPTH / 2) + 5} width="100" height="20" rx="3" fill="#0d3d6e" stroke="#1e6aaa" strokeWidth="1"/>
        <text x={OX} y={floorY - wallH - COLS * (DEPTH / 2) + 19} textAnchor="middle" fontSize="9" fill="#4a9ad4" fontFamily="system-ui">ÉVAPORATEUR ❄</text>

        {/* Caisses */}
        {sorted.map((item) => {
          const baseX = isoX(item.col - Math.floor(COLS / 2), item.row - 1);
          const baseY = isoY(item.col - Math.floor(COLS / 2), item.row - 1, 0) + 30;
          return Array.from({ length: item.stacks }).map((_, s) => {
            const isTop = s === item.stacks - 1;
            return (
              <g key={`${item.clientId}-${s}`} dangerouslySetInnerHTML={{ __html: drawBox(baseX, baseY - s * CH, item.color, isTop ? item.nom : '', isTop) }} />
            );
          });
        })}

        {/* Espaces vides */}
        {chambre.stockActuel === 0 && (
          <text x={OX} y={floorY - 20} textAnchor="middle" fontSize="15" fill="#2a5f8a" fontFamily="system-ui">Chambre vide</text>
        )}

        {/* KPIs bas */}
        <rect x="14" y={H - 70} width={W - 28} height="58" rx="8" fill="#0a1f35" stroke="#1e4a6e" strokeWidth="1"/>
        {[
          { label: 'CAPACITÉ MAX', val: chambre.capaciteMax?.toLocaleString('fr-FR'), color: '#7eb8f7' },
          { label: 'STOCK ACTUEL', val: chambre.stockActuel?.toLocaleString('fr-FR'), color: '#5ae0a0' },
          { label: 'DISPONIBLE', val: chambre.disponible?.toLocaleString('fr-FR'), color: '#fbbf24' },
          { label: 'TAUX', val: `${tauxRemplissage}%`, color: '#d8b4fe' },
        ].map((k, i) => {
          const x = 14 + i * ((W - 28) / 4) + (W - 28) / 8;
          return (
            <g key={k.label}>
              <text x={x} y={H - 50} textAnchor="middle" fontSize="9" fill="#4a9ad4" fontFamily="system-ui">{k.label}</text>
              <text x={x} y={H - 28} textAnchor="middle" fontSize="18" fontWeight="700" fill={k.color} fontFamily="system-ui">{k.val}</text>
            </g>
          );
        })}

        {/* Barre remplissage */}
        <rect x="650" y={H - 18} width="220" height="5" rx="2" fill="#1e3a5a"/>
        <rect x="650" y={H - 18} width={Math.round(220 * tauxRemplissage / 100)} height="5" rx="2" fill="#8b5cf6"/>
      </svg>
    </div>
  );
}

export default function ChambreVue3DPage() {
  const { campagneActive } = useCampagne();
  const { data: chambres, loading: loadingC } = useFetch<any[]>(() => chambresApi.getAll());
  const [selectedChambre, setSelectedChambre] = useState<number | null>(null);
  const [stockData, setStockData] = useState<any[]>([]);

  // Charger le stock par client au démarrage
  useMemo(() => {
    fetchStockParClient().then(d => setStockData(d || []));
  }, []);

  // Sélectionner la première chambre par défaut
  useMemo(() => {
    if (chambres && chambres.length > 0 && selectedChambre === null) {
      setSelectedChambre(chambres[0].id);
    }
  }, [chambres]);

  const chambreActive = chambres?.find(c => c.id === selectedChambre);

  // Construire le stock par client pour la chambre sélectionnée
  const stockParClient = useMemo<Record<number, { nom: string; bois: number; plastique: number; total: number }>>(() => {
    if (!stockData || !selectedChambre) return {};
    const result: Record<number, { nom: string; bois: number; plastique: number; total: number }> = {};
    stockData.forEach((sc: any) => {
      const chambreStock = sc.parChambre?.[selectedChambre];
      if (chambreStock && chambreStock.stock > 0) {
        result[sc.clientId] = {
          nom: sc.clientNom || `Client ${sc.clientId}`,
          bois: chambreStock.bois || 0,
          plastique: chambreStock.plastique || 0,
          total: chambreStock.stock || 0,
        };
      }
    });
    return result;
  }, [stockData, selectedChambre]);

  // Assigner couleurs aux clients
  const clientCouleurs = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    Object.keys(stockParClient).forEach((cid, i) => {
      map[parseInt(cid)] = PALETTE[i % PALETTE.length];
    });
    return map;
  }, [stockParClient]);

  if (loadingC) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>
              Vue 3D Chambres Froides
            </h1>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>
              Campagne {campagneActive} — Visualisation isométrique du stockage
            </div>
          </div>
        </div>
      </div>

      {/* Sélecteur chambres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {(chambres || []).map(c => (
          <button key={c.id} onClick={() => setSelectedChambre(c.id)}
            style={{
              background: selectedChambre === c.id ? 'rgba(79,142,247,.15)' : 'var(--c-surface)',
              border: `2px solid ${selectedChambre === c.id ? 'var(--c-primary)' : 'var(--c-border)'}`,
              borderRadius: 10, padding: '10px 18px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
            }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: selectedChambre === c.id ? 'var(--c-primary)' : 'var(--c-text)' }}>
              ❄ {c.nom}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
              {c.stockActuel} / {c.capaciteMax} · {c.tauxRemplissage}%
            </div>
            {/* Mini barre */}
            <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 3, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 20, background: c.tauxRemplissage > 85 ? 'var(--c-danger)' : 'var(--c-primary)', width: `${c.tauxRemplissage}%` }} />
            </div>
          </button>
        ))}
      </div>

      {/* Vue 3D */}
      {chambreActive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
          {/* Chambre 3D */}
          <div style={{ background: '#0d1b2a', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e4a6e' }}>
            <Chambre3D
              chambre={chambreActive}
              stockParClient={stockParClient}
              clientCouleurs={clientCouleurs}
            />
          </div>

          {/* Légende clients */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Clients stockés
            </div>

            {Object.keys(stockParClient).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                Aucun stock dans cette chambre
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(stockParClient)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([cidStr, data]) => {
                    const cid = parseInt(cidStr);
                    const color = clientCouleurs[cid] || '#37474f';
                    const pct = chambreActive.capaciteMax > 0
                      ? Math.round((data.total / chambreActive.capaciteMax) * 100)
                      : 0;
                    return (
                      <div key={cid} style={{ padding: '8px 10px', background: 'var(--c-bg2)', borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{data.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{pct}%</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--c-text3)', marginBottom: 4 }}>
                          {data.bois > 0 && <span style={{ color: '#f57f17' }}>🪵 {data.bois.toLocaleString('fr-FR')}</span>}
                          {data.plastique > 0 && <span style={{ color: '#1976d2' }}>🧴 {data.plastique.toLocaleString('fr-FR')}</span>}
                        </div>
                        {/* Mini barre */}
                        <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 3, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
                          <div style={{ height: '100%', borderRadius: 20, background: color, width: `${Math.min(100, pct * 4)}%` }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2, textAlign: 'right' }}>
                          {data.total.toLocaleString('fr-FR')} caisses
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Total */}
            {Object.keys(stockParClient).length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>Total</span>
                <strong style={{ fontSize: 13, color: 'var(--c-success)' }}>
                  {Object.values(stockParClient).reduce((s, v) => s + v.total, 0).toLocaleString('fr-FR')} caisses
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note marketing */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(79,142,247,.06)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 10, fontSize: 12, color: 'var(--c-text2)' }}>
        💡 <strong>Vue marketing</strong> — Cette visualisation 3D permet de montrer en temps réel l'occupation de chaque chambre froide par client. Idéal pour les présentations et le suivi visuel du stock.
      </div>
    </div>
  );
}
