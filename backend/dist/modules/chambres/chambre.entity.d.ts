import { Entree } from '../entrees/entree.entity';
export declare class Chambre {
    id: number;
    nom: string;
    capaciteMax: number;
    stockActuel: number;
    description: string;
    active: boolean;
    temperatureCible: number;
    entrees: Entree[];
    createdAt: Date;
    updatedAt: Date;
    get tauxRemplissage(): number;
    get disponible(): number;
}
