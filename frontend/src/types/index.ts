// ── Auth ──────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  nom?: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Chambre ───────────────────────────────────────────
export interface Chambre {
  id: number;
  nom: string;
  capaciteMax: number;
  stockActuel: number;
  disponible: number;
  tauxRemplissage: number;
  description?: string;
  active: boolean;
  temperatureCible?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChambreStats {
  chambres: Chambre[];
  totalCapacite: number;
  totalStock: number;
  totalDisponible: number;
  tauxRemplissageGlobal: number;
}

// ── Client ────────────────────────────────────────────
export interface Client {
  id: number;
  nom: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  actif: boolean;
  createdAt: string;
}

// ── Réservation ───────────────────────────────────────
export type StatutReservation = 'en_attente' | 'confirmee' | 'annulee' | 'terminee';

export interface Reservation {
  id: number;
  client: Client;
  dateReservation: string;
  dateSortiePrevisionnelle?: string;
  nbCaissesBois: number;
  nbCaissesPластique: number;
  prixUnitaireBois: number;
  prixUnitairePlastique: number;
  statut: StatutReservation;
  notes?: string;
  montantTotal: number;
  totalCaisses: number;
  createdAt: string;
}

// ── Entrée ────────────────────────────────────────────
export interface Entree {
  id: number;
  client: Client;
  chambre: Chambre;
  dateEntree: string;
  nbCaisses: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

// ── Sortie ────────────────────────────────────────────
export interface Sortie {
  id: number;
  client: Client;
  chambre: Chambre;
  dateSortie: string;
  nbCaisses: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

// ── Paiement ──────────────────────────────────────────
export type ModePaiement = 'especes' | 'virement' | 'cheque' | 'carte';

export interface Paiement {
  id: number;
  client: Client;
  datePaiement: string;
  montant: number;
  modePaiement: ModePaiement;
  reference?: string;
  notes?: string;
  createdAt: string;
}

// ── Location ──────────────────────────────────────────
export type TypeCaisse = 'bois' | 'plastique' | 'tranger';

export interface Location {
  id: number;
  client: Client;
  dateLocation: string;
  nbCaisses: number;
  nbCaissesRetournees: number;
  nbCaissesRestantes: number;
  typeCaisse: TypeCaisse;
  prixUnitaire: number;
  montantTotal: number;
  dateRetourPrevu?: string;
  notes?: string;
  createdAt: string;
}

// ── Stock ─────────────────────────────────────────────
export interface StockClient {
  clientId: number;
  clientNom: string;
  totalEntree: number;
  totalSortie: number;
  stockActuel: number;
  parChambre: Record<number, {
    chambreNom: string;
    entree: number;
    sortie: number;
    stock: number;
  }>;
}

export interface Mouvement {
  type: 'entree' | 'sortie';
  date: string;
  nbCaisses: number;
  chambre?: string;
  reference?: string;
}

// ── Dashboard ─────────────────────────────────────────
export interface DashboardData {
  chambres: {
    details: Chambre[];
    totalCapacite: number;
    totalStock: number;
    totalDisponible: number;
    tauxRemplissageGlobal: number;
  };
  financier: {
    totalPaye: number;
    montantReservations: number;
    resteAPayer: number;
    totalReservations: number;
  };
  locations: {
    totalCaissesLouees: number;
    totalCaissesRestantes: number;
    tauxRetour: number;
  };
  mouvementsAujourdhui: {
    entrees: number;
    sorties: number;
  };
  activite30j: {
    entrees: Array<{ date: string; nb: number }>;
    sorties: Array<{ date: string; nb: number }>;
  };
}

// ── Forms ─────────────────────────────────────────────
export interface ApiError {
  message: string | string[];
  statusCode: number;
}