import { createContext, useContext, useState, ReactNode } from 'react';

export interface Campagne {
  label: string;   // ex: "2025-2026"
  debut: Date;     // 01/09/2025
  fin: Date;       // 01/06/2026
}

function getCampagnes(): Campagne[] {
  const result: Campagne[] = [];
  // Générer de 2023 à 2028
  for (let y = 2023; y <= 2028; y++) {
    result.push({
      label: `${y}-${y + 1}`,
      debut: new Date(y, 8, 1),      // 01/09/y
      fin: new Date(y + 1, 5, 1),    // 01/06/y+1
    });
  }
  return result;
}

// Trouver la campagne courante
function getCampagneCourante(): string {
  const now = new Date();
  const campagnes = getCampagnes();
  for (const c of campagnes) {
    if (now >= c.debut && now <= c.fin) return c.label;
  }
  return campagnes[campagnes.length - 2].label;
}

interface CampagneContextType {
  campagneActive: string;
  setCampagneActive: (c: string) => void;
  campagnes: Campagne[];
  getCampagne: (label: string) => Campagne | undefined;
  isInCampagne: (dateStr: string | undefined) => boolean;
}

const CampagneContext = createContext<CampagneContextType | null>(null);

export function CampagneProvider({ children }: { children: ReactNode }) {
  const campagnes = getCampagnes();
  const [campagneActive, setCampagneActive] = useState(getCampagneCourante);

  function getCampagne(label: string) {
    return campagnes.find(c => c.label === label);
  }

  function isInCampagne(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    const c = getCampagne(campagneActive);
    if (!c) return false;
    const d = new Date(dateStr);
    return d >= c.debut && d <= c.fin;
  }

  return (
    <CampagneContext.Provider value={{ campagneActive, setCampagneActive, campagnes, getCampagne, isInCampagne }}>
      {children}
    </CampagneContext.Provider>
  );
}

export function useCampagne() {
  const ctx = useContext(CampagneContext);
  if (!ctx) throw new Error('useCampagne must be used within CampagneProvider');
  return ctx;
}
