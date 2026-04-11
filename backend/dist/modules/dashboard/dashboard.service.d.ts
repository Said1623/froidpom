import { Repository } from 'typeorm';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { Paiement } from '../paiements/paiement.entity';
import { Reservation } from '../reservations/reservation.entity';
import { Location } from '../locations/location.entity';
import { ChambresService } from '../chambres/chambres.service';
export declare class DashboardService {
    private readonly entreeRepo;
    private readonly sortieRepo;
    private readonly paiementRepo;
    private readonly reservationRepo;
    private readonly locationRepo;
    private readonly chambresService;
    constructor(entreeRepo: Repository<Entree>, sortieRepo: Repository<Sortie>, paiementRepo: Repository<Paiement>, reservationRepo: Repository<Reservation>, locationRepo: Repository<Location>, chambresService: ChambresService);
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
