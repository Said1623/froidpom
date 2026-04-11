import { StockService } from './stock.service';
export declare class StockController {
    private readonly service;
    constructor(service: StockService);
    getStockParChambre(): Promise<{
        chambres: import("../chambres/chambre.entity").Chambre[];
        totalCapacite: number;
        totalStock: number;
        totalDisponible: number;
        tauxRemplissageGlobal: number;
    }>;
    getStockParClient(): Promise<{
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
    }[]>;
    getMouvementsClient(clientId: number): Promise<{
        mouvements: {
            type: string;
            date: string;
            nbCaisses: number;
            chambre: string;
            reference: string;
        }[];
        totalEntree: number;
        totalSortie: number;
        stockActuel: number;
    }>;
}
