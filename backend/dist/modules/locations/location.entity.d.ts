import { Client } from '../clients/client.entity';
export declare enum TypeCaisse {
    BOIS = "bois",
    PLASTIQUE = "plastique",
    ETRANGER = "tranger"
}
export declare class Location {
    id: number;
    client: Client;
    dateLocation: string;
    nbCaisses: number;
    nbCaissesRetournees: number;
    typeCaisse: TypeCaisse;
    prixUnitaire: number;
    dateRetourPrevu: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    get nbCaissesRestantes(): number;
    get montantTotal(): number;
}
