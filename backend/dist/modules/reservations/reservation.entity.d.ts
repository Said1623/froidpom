import { Client } from '../clients/client.entity';
export declare enum StatutReservation {
    EN_ATTENTE = "en_attente",
    CONFIRMEE = "confirmee",
    ANNULEE = "annulee",
    TERMINEE = "terminee"
}
export declare class Reservation {
    id: number;
    client: Client;
    dateReservation: string;
    dateSortiePrevisionnelle: string;
    nbCaissesBois: number;
    nbCaissesPластique: number;
    nbCaissesTranger: number;
    prixUnitaireBois: number;
    prixUnitairePlastique: number;
    prixUnitaireTranger: number;
    statut: StatutReservation;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    get totalCaisses(): number;
    get montantTotal(): number;
}
