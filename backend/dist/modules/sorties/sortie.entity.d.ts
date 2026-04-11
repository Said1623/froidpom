import { Client } from '../clients/client.entity';
import { Chambre } from '../chambres/chambre.entity';
export declare class Sortie {
    id: number;
    client: Client;
    chambre: Chambre;
    dateSortie: string;
    nbCaisses: number;
    typeCaisse: string;
    reference: string;
    notes: string;
    createdAt: Date;
}
