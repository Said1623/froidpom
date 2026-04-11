import { Client } from '../clients/client.entity';
import { Chambre } from '../chambres/chambre.entity';
export declare class Entree {
    id: number;
    client: Client;
    chambre: Chambre;
    dateEntree: string;
    nbCaisses: number;
    typeCaisse: string;
    reference: string;
    notes: string;
    createdAt: Date;
}
