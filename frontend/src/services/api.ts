 const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('froidpom_token');
}

async function request(method: string, url: string, body?: any) {
  const headers: any = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('froidpom_token');
  console.log('Token utilisé:', token ? token.substring(0, 20) : 'AUCUN');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // NE PAS rediriger automatiquement — laisser le composant gérer
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { response: { data: err, status: res.status } };
  }

  return { data: await res.json() };
}

const api = {
  get: (url: string) => request('GET', url),
  post: (url: string, body: any) => request('POST', url, body),
  put: (url: string, body: any) => request('PUT', url, body),
  delete: (url: string) => request('DELETE', url),
};

export default api;