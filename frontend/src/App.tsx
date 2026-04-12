import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ChambresPage from './pages/chambres/ChambresPage';
import ClientsPage from './pages/clients/ClientsPage';
import ReservationsPage from './pages/reservations/ReservationsPage';
import EntreesPage from './pages/entrees/EntreesPage';
import SortiesPage from './pages/sorties/SortiesPage';
import PaiementsPage from './pages/paiements/PaiementsPage';
import LocationsPage from './pages/locations/LocationsPage';
import StockPage from './pages/stock/StockPage';

function LoginPage() {
  async function handleLogin() {
    const r = await fetch('https://froidpom.onrender.com/api/auth/login', {    
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data = await r.json();
    if (data.access_token) {
      localStorage.setItem('froidpom_token', data.access_token);
      localStorage.setItem('froidpom_user', JSON.stringify(data.user));
      window.location.href = '/';
    }
  }

  async function handleLoginForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const r = await fetch('https://froidpom.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await r.json();
    if (data.access_token) {
      localStorage.setItem('froidpom_token', data.access_token);
      localStorage.setItem('froidpom_user', JSON.stringify(data.user));
      window.location.href = '/';
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-bg)' }}>
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', borderRadius: 20, padding: '40px 44px', width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <span style={{ fontSize: 36 }}>❄</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Froidpom</span>
        </div>
        <h2 style={{ marginBottom: 4 }}>Connexion</h2>
        <p style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 28, textTransform: 'uppercase', letterSpacing: '.6px' }}>Gestion Unité Frigorifique</p>
        <form onSubmit={handleLoginForm} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 }}>Nom d'utilisateur</label>
            <input name="username" defaultValue="admin" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '9px 13px', fontSize: 13, width: '100%', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 }}>Mot de passe</label>
            <input name="password" type="password" defaultValue="admin123" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-border2)', borderRadius: 10, color: 'var(--c-text)', padding: '9px 13px', fontSize: 13, width: '100%', outline: 'none' }} />
          </div>
          <button type="submit" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('froidpom_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const token = localStorage.getItem('froidpom_token');

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="chambres" element={<ChambresPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="entrees" element={<EntreesPage />} />
        <Route path="sorties" element={<SortiesPage />} />
        <Route path="paiements" element={<PaiementsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="stock" element={<StockPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2340',
              color: '#e8edf8',
              border: '1px solid rgba(100,140,255,.2)',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}