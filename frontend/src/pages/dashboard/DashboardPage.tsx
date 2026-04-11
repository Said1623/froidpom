import { useFetch } from '../../hooks/useFetch';
import { dashboardApi } from '../../services';
import { StatCard, Card, ProgressBar, Spinner } from '../../components/ui/UI';
import type { DashboardData } from '../../types';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardPage() {
  const token = localStorage.getItem('froidpom_token');
  const { data, loading } = useFetch<DashboardData>(
    () => token ? dashboardApi.getResume() : Promise.resolve({ data: null }),
    [token]
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;
  if (!data) return null;

  // Préparer données graphique
  const dates: Record<string, { date: string; entrees: number; sorties: number }> = {};
  data.activite30j.entrees.forEach(({ date, nb }) => {
    if (!dates[date]) dates[date] = { date, entrees: 0, sorties: 0 };
    dates[date].entrees += nb;
  });
  data.activite30j.sorties.forEach(({ date, nb }) => {
    if (!dates[date]) dates[date] = { date, entrees: 0, sorties: 0 };
    dates[date].sorties += nb;
  });
  const chartData = Object.values(dates)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      label: format(parseISO(d.date), 'dd/MM', { locale: fr }),
    }));

  const { chambres, financier, locations, mouvementsAujourdhui } = data;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Tableau de bord</h1>
        <span style={{ fontSize: 13, color: 'var(--c-text3)' }}>
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon="❄"
          label="Stock total"
          value={chambres.totalStock}
          sub={`/ ${chambres.totalCapacite} caisses`}
          color="primary"
        />
        <StatCard
          icon="▣"
          label="Taux remplissage"
          value={`${chambres.tauxRemplissageGlobal}%`}
          sub={`${chambres.totalDisponible} places libres`}
          color={chambres.tauxRemplissageGlobal > 85 ? 'danger' : chambres.tauxRemplissageGlobal > 60 ? 'warning' : 'success'}
        />
        <StatCard
          icon="€"
          label="Total encaissé"
          value={`${Number(financier.totalPaye).toLocaleString('fr-FR')} MAD`}
          sub={`Reste: ${Number(financier.resteAPayer).toLocaleString('fr-FR')} MAD`}
          color="accent"
        />
        <StatCard
          icon="↓"
          label="Entrées aujourd'hui"
          value={mouvementsAujourdhui.entrees}
          sub={`${mouvementsAujourdhui.sorties} sorties`}
          color="accent2"
        />
        <StatCard
          icon="📦"
          label="Caisses en location"
          value={locations.totalCaissesRestantes}
          sub={`Taux retour: ${locations.tauxRetour}%`}
          color="warning"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Activité 30j */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--c-text2)' }}>Activité — 30 derniers jours</h3>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--c-text3)', padding: '40px 0', fontSize: 13 }}>Aucune activité enregistrée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4b4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4b4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,140,255,.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8fa3cc' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8fa3cc' }} />
                <Tooltip
                  contentStyle={{ background: '#1a2340', border: '1px solid rgba(100,140,255,.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#e8edf8', fontWeight: 600 }}
                  itemStyle={{ color: '#8fa3cc' }}
                />
                <Area type="monotone" dataKey="entrees" stroke="#4f8ef7" fill="url(#ge)" name="Entrées" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="sorties" stroke="#00d4b4" fill="url(#gs)" name="Sorties" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Chambres */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--c-text2)' }}>Chambres froides</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chambres.details.map((c) => (
              <div key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nom}</span>
                  <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>
                    {c.stockActuel} / {c.capaciteMax}
                    {c.temperatureCible && <span style={{ marginLeft: 8 }}>🌡 {c.temperatureCible}°C</span>}
                  </span>
                </div>
                <ProgressBar value={c.stockActuel} max={c.capaciteMax} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Financier */}
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--c-text2)' }}>Situation financière</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 4 }}>Montant réservations</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{Number(financier.montantReservations).toLocaleString('fr-FR')} MAD</div>
          </div>
          <div style={{ color: 'var(--c-text3)', fontSize: 20 }}>→</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 4 }}>Encaissé</div>
            <div style={{ fontSize: 20, fontWeight: 700 }} className="text-success">{Number(financier.totalPaye).toLocaleString('fr-FR')} MAD</div>
          </div>
          <div style={{ color: 'var(--c-text3)', fontSize: 20 }}>+</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 4 }}>Reste à percevoir</div>
            <div style={{ fontSize: 20, fontWeight: 700 }} className={financier.resteAPayer > 0 ? 'text-warning' : 'text-success'}>
              {Number(financier.resteAPayer).toLocaleString('fr-FR')} MAD
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
