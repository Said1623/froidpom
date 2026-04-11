import { Repository } from 'typeorm';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { ChambresService } from '../chambres/chambres.service';
export declare class StockService {
    private readonly entreeRepo;
    private readonly sortieRepo;
    private readonly chambresService;
    constructor(entreeRepo: Repository<Entree>, sortieRepo: Repository<Sortie>, chambresService: ChambresService);
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
