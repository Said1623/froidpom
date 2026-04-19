import { useState } from 'react';
import { Button, Input } from '../../components/ui/UI';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password) return;
    setLoading(true);
    try {
      const BASE = import.meta.env.VITE_API_URL || 'https://froidpom.onrender.com/api';
      const response = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err?.message || `Erreur ${response.status}`);
        return;
      }
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('froidpom_token', data.access_token);
        localStorage.setItem('froidpom_user', JSON.stringify(data.user));
        window.location.href = '/';
      } else {
        toast.error('Identifiants incorrects');
      }
    } catch {
      toast.error('Serveur inaccessible — réessayez dans 30 secondes');
    } finally {
      setLoading(false);
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
          <Input
            label="Nom d'utilisateur"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="admin"
            autoFocus
          />
          <Input
            label="Mot de passe"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 8 }}>
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}
