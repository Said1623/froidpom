import api from './api';
import type {
  Chambre, Client, Reservation, Entree, Sortie,
  Paiement, Location, DashboardData, StockClient, ChambreStats
} from '../types';

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  getResume: (campagne?: string) => api.get(`/dashboard/resume${campagne ? `?campagne=${encodeURIComponent(campagne)}` : ''}`),
};

// ── Chambres ──────────────────────────────────────────
export const chambresApi = {
  getAll: () => api.get('/chambres'),
  getStats: () => api.get('/chambres/stats'),
  getOne: (id: number) => api.get(`/chambres/${id}`),
  create: (data: any) => api.post('/chambres', data),
  update: (id: number, data: any) => api.put(`/chambres/${id}`, data),
  delete: (id: number) => api.delete(`/chambres/${id}`),
};

// ── Clients ───────────────────────────────────────────
export const clientsApi = {
  getAll: (campagne?: string) => api.get(`/clients${campagne ? `?campagne=${encodeURIComponent(campagne)}` : ''}`),
  getOne: (id: number) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: number, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
  copierCampagne: (source: string, cible: string) => api.post('/clients/copier-campagne', { source, cible }),
};

// ── Réservations ──────────────────────────────────────
export const reservationsApi = {
  getAll: () => api.get('/reservations'),
  getOne: (id: number) => api.get(`/reservations/${id}`),
  create: (data: any) => api.post('/reservations', data),
  update: (id: number, data: any) => api.put(`/reservations/${id}`, data),
  delete: (id: number) => api.delete(`/reservations/${id}`),
};

// ── Entrées ───────────────────────────────────────────
export const entreesApi = {
  getAll: () => api.get('/entrees'),
  getOne: (id: number) => api.get(`/entrees/${id}`),
  create: (data: any) => api.post('/entrees', data),
  update: (id: number, data: any) => api.put(`/entrees/${id}`, data),
  delete: (id: number) => api.delete(`/entrees/${id}`),
};

// ── Sorties ───────────────────────────────────────────
export const sortiesApi = {
  getAll: () => api.get('/sorties'),
  getOne: (id: number) => api.get(`/sorties/${id}`),
  create: (data: any) => api.post('/sorties', data),
  delete: (id: number) => api.delete(`/sorties/${id}`),
};

// ── Paiements ─────────────────────────────────────────
export const paiementsApi = {
  getAll: () => api.get('/paiements'),
  getOne: (id: number) => api.get(`/paiements/${id}`),
  getBalanceClient: (id: number) => api.get(`/paiements/client/${id}`),
  getBalanceGlobale: () => api.get('/paiements/balance'),
  create: (data: any) => api.post('/paiements', data),
  delete: (id: number) => api.delete(`/paiements/${id}`),
};

// ── Locations ─────────────────────────────────────────
export const locationsApi = {
  getAll: () => api.get('/locations'),
  getAllRetours: () => api.get('/locations/retours').then(r => r.data),
  getOne: (id: number) => api.get(`/locations/${id}`),
  getSuiviGlobal: () => api.get('/locations/suivi'),
  getSuiviClient: (id: number) => api.get(`/locations/suivi/${id}`),
  create: (data: any) => api.post('/locations', data),
  enregistrerRetour: (id: number, data: any) => api.put(`/locations/${id}/retour`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

// ── Stock ─────────────────────────────────────────────
export const stockApi = {
  getParChambre: () => api.get('/stock/chambres'),
  getParClient: () => api.get('/stock/clients'),
  getMouvementsClient: (id: number) => api.get(`/stock/clients/${id}`),
};