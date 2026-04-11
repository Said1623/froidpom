import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly service;
    constructor(service: DashboardService);
    getResume(): Promise<{
        chambres: {
            details: {
                id: number;
                nom: string;
                capaciteMax: number;
                stockActuel: number;
                disponible: number;
                tauxRemplissage: number;
                temperatureCible: number;
            }[];
            chambres: import("../chambres/chambre.entity").Chambre[];
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
            entrees: {
                date: string;
                nb: number;
            }[];
            sorties: {
                date: string;
                nb: number;
            }[];
        };
    }>;
}
