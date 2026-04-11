import { Reservation } from '../reservations/reservation.entity';
import { Entree } from '../entrees/entree.entity';
import { Sortie } from '../sorties/sortie.entity';
import { Paiement } from '../paiements/paiement.entity';
import { Location } from '../locations/location.entity';
export declare class Client {
    id: number;
    nom: string;
    telephone: string;
    adresse: string;
    email: string;
    actif: boolean;
    reservations: Reservation[];
    entrees: Entree[];
    sorties: Sortie[];
    paiements: Paiement[];
    locations: Location[];
    createdAt: Date;
    updatedAt: Date;
}
