import { Client } from '../clients/client.entity';
export declare enum ModePaiement {
    ESPECES = "especes",
    VIREMENT = "virement",
    CHEQUE = "cheque",
    CARTE = "carte"
}
export declare class Paiement {
    id: number;
    client: Client;
    datePaiement: string;
    montant: number;
    modePaiement: ModePaiement;
    reference: string;
    notes: string;
    createdAt: Date;
}
