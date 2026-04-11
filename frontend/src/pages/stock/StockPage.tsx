import { BtnPdf } from '../../components/ui/BtnPdf';
import { pdfStock } from '../../services/pdfService';
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { stockApi, chambresApi } from '../../services';
import { Card, PageHeader, Spinner } from '../../components/ui/UI';
import type { StockClient } from '../../types';
import styles from './StockPage.module.css';

interface StockChambreDetail {
  clientId: number;
  clientNom: string;
  bois: number;
  plastique: number;
  tranger: number;
  total: number;
}

export default function StockPage() {
  const { data: stockChambres, loading: loadingCh } = useFetch(() => stockApi.getParChambre());
  const { data: stockClients, loading: loadingCl } = useFetch<StockClient[]>(() => stockApi.getParClient());
  const { data: chambresData } = useFetch(() => chambresApi.getAll());
  const [tab, setTab] = useState<'chambres' | 'clients'>('chambres');
  const [chambreSelectionnee, setChambreSelectionnee] = useState<number | null>(null);
  const [searchClient, setSearchClient] = useState('');

  const loading = loadingCh || loadingCl;

  // Construire le détail d'une chambre depuis stockClients
  function getDetailChambre(chambreId: number): StockChambreDetail[] {
    if (!stockClients) return [];
    const result: StockChambreDetail[] = [];
    stockClients.forEach(sc => {
      const chData = sc.parChambre[chambreId];
      if (chData && chData.stock > 0) {
        // On ne peut pas distinguer bois/plastique/tranger ici sans données enrichies
        // On affiche le total par client dans cette chambre
        result.push({
          clientId: sc.clientId,
          clientNom: sc.clientNom,
          bois: 0,
          plastique: 0,
          tranger: 0,
          total: chData.stock,
        });
      }
    });
    return result.sort((a, b) => b.total - a.total);
  }

  const globalStats = stockChambres as any;
  const chambres = (stockChambres as any)?.chambres || [];
  const chambreDetail = chambreSelectionnee ? getDetailChambre(chambreSelectionnee) : [];
  const chambreInfo = chambres.find((c: any) => c.id === chambreSelectionnee);

  const clientsFiltres = (stockClients || []).filter(c =>
    c.clientNom.toLowerCase().includes(searchClient.toLowerCase())
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  return (
    <div className="fade-in">
      <PageHeader title="Suivi du stock" subtitle="Vue consolidée par chambre et par client" />

      {/* Onglets + PDF */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 4 }}>
          {[{ id: 'chambres', label: '❄ Par chambre' }, { id: 'clients', label: '👤 Par client' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? 'var(--c-primary-glow)' : 'transparent', color: tab === t.id ? 'var(--c-primary)' : 'var(--c-text2)', transition: 'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>
        <BtnPdf onClick={() => pdfStock(globalStats, stockClients||[])} label="⬇ Exporter PDF" disabled={!globalStats} />
      </div>

      {/* ══ PAR CHAMBRE ══ */}
      {tab === 'chambres' && (
        <div style={{ display: 'grid', gridTemplateColumns: chambreSelectionnee ? '340px 1fr' : '1fr', gap: 20 }}>

          {/* Liste chambres */}
          <div>
            {globalStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'Stock total', val: globalStats.totalStock, sub: `/ ${globalStats.totalCapacite}`, color: 'var(--c-primary)' },
                  { label: 'Disponible', val: globalStats.totalDisponible, color: 'var(--c-success)' },
                  { label: 'Taux global', val: `${globalStats.tauxRemplissageGlobal}%`, color: globalStats.tauxRemplissageGlobal > 85 ? 'var(--c-danger)' : 'var(--c-warning)' },
                ].map(k => (
                  <div key={k.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
                    {(k as any).sub && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{(k as any).sub}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 10, fontStyle: 'italic' }}>
              💡 Cliquer sur une chambre pour voir le détail des clients
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chambres.map((c: any) => (
                <div key={c.id} onClick={() => setChambreSelectionnee(chambreSelectionnee === c.id ? null : c.id)}
                  style={{ background: chambreSelectionnee === c.id ? 'rgba(79,142,247,.1)' : 'var(--c-surface)', border: `2px solid ${chambreSelectionnee === c.id ? 'var(--c-primary)' : c.tauxRemplissage > 85 ? 'rgba(240,90,90,.4)' : 'var(--c-border)'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all .18s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{c.nom}</div>
                      {c.temperatureCible && <div style={{ fontSize: 11, color: 'var(--c-accent)', marginTop: 2 }}>🌡 {c.temperatureCible}°C</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--c-primary)', lineHeight: 1 }}>{c.stockActuel}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>/ {c.capaciteMax}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text2)', marginBottom: 8 }}>
                    <span>Disponible : <strong style={{ color: c.disponible === 0 ? 'var(--c-danger)' : 'var(--c-success)' }}>{c.disponible}</strong></span>
                    <span style={{ color: c.tauxRemplissage > 85 ? 'var(--c-danger)' : c.tauxRemplissage > 60 ? 'var(--c-warning)' : 'var(--c-success)', fontWeight: 700 }}>{c.tauxRemplissage}%</span>
                  </div>
                  <div style={{ background: 'var(--c-bg2)', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 20, width: `${c.tauxRemplissage}%`, background: c.tauxRemplissage > 85 ? 'var(--c-danger)' : c.tauxRemplissage > 60 ? 'var(--c-warning)' : 'var(--c-primary)', transition: 'width .3s' }} />
                  </div>
                  {c.disponible === 0 && <div style={{ fontSize: 10, color: 'var(--c-danger)', marginTop: 5, fontWeight: 700, textAlign: 'center' }}>⚠ CHAMBRE PLEINE</div>}
                  {chambreSelectionnee === c.id && <div style={{ fontSize: 11, color: 'var(--c-primary)', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>▲ Voir détail ci-contre</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Détail chambre sélectionnée */}
          {chambreSelectionnee && (
            <div>
              <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-primary)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: 'var(--c-primary-glow)', borderBottom: '1px solid rgba(79,142,247,.2)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--c-primary)', margin: 0 }}>
                      ❄ {chambreInfo?.nom}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 3 }}>
                      {chambreInfo?.stockActuel} caisses stockées · {chambreInfo?.disponible} places libres
                    </div>
                  </div>
                  <button onClick={() => setChambreSelectionnee(null)}
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text2)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>

                {chambreDetail.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Chambre vide</div>
                ) : (
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--c-bg2)' }}>
                          {['Client', 'Stock actuel', '% de la chambre'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chambreDetail.map((cd, i) => {
                          const pct = chambreInfo?.stockActuel > 0 ? Math.round((cd.total / chambreInfo.stockActuel) * 100) : 0;
                          return (
                            <tr key={cd.clientId} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>{cd.clientNom}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <strong style={{ color: 'var(--c-primary)', fontSize: 16 }}>{cd.total}</strong>
                                <span style={{ color: 'var(--c-text3)', fontSize: 11, marginLeft: 4 }}>caisses</span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ flex: 1, background: 'var(--c-bg2)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 20, width: `${pct}%`, background: 'var(--c-primary)' }} />
                                  </div>
                                  <span style={{ fontSize: 12, color: 'var(--c-text2)', minWidth: 35 }}>{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--c-bg2)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13 }}>TOTAL</td>
                          <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--c-primary)', fontSize: 15 }}>
                            {chambreDetail.reduce((s, c) => s + c.total, 0)}
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--c-text2)' }}>
                            {chambreInfo?.stockActuel} / {chambreInfo?.capaciteMax} (taux: {chambreInfo?.tauxRemplissage}%)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PAR CLIENT ══ */}
      {tab === 'clients' && (
        <>
          <input placeholder="🔍 Rechercher un client..." value={searchClient} onChange={e => setSearchClient(e.target.value)}
            style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 280, marginBottom: 16 }} />

          <div style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-bg2)' }}>
                  {['Client', 'Total entré', 'Total sorti', 'Stock actuel', 'Détail par chambre'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--c-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientsFiltres.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--c-text3)' }}>Aucun stock</td></tr>}
                {clientsFiltres.map((c, i) => (
                  <tr key={c.clientId} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? '' : 'rgba(255,255,255,.01)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.clientNom}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--c-success)' }}>+{c.totalEntree}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--c-warning)' }}>-{c.totalSortie}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <strong style={{ color: c.stockActuel > 0 ? 'var(--c-primary)' : 'var(--c-text3)', fontSize: 15 }}>{c.stockActuel}</strong>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.values(c.parChambre).filter(ch => ch.stock > 0).map((ch: any, j) => (
                          <span key={j} style={{ background: 'var(--c-primary-glow)', color: 'var(--c-primary)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            {ch.chambreNom}: {ch.stock}
                          </span>
                        ))}
                        {Object.values(c.parChambre).every((ch: any) => ch.stock === 0) && (
                          <span style={{ color: 'var(--c-text3)', fontSize: 12 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
