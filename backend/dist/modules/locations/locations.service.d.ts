import { Repository } from 'typeorm';
import { Location, TypeCaisse } from './location.entity';
export declare class CreateLocationDto {
    clientId: number;
    dateLocation: string;
    nbCaisses: number;
    typeCaisse?: TypeCaisse;
    prixUnitaire?: number;
    dateRetourPrevu?: string;
    notes?: string;
}
export declare class RetourLocationDto {
    nbRetournees: number;
    notes?: string;
}
export declare class LocationsService {
    private readonly repo;
    constructor(repo: Repository<Location>);
    findAll(clientId?: number): Promise<Location[]>;
    findOne(id: number): Promise<Location>;
    create(dto: CreateLocationDto): Promise<Location>;
    enregistrerRetour(id: number, dto: RetourLocationDto): Promise<Location>;
    remove(id: number): Promise<Location>;
    getSuiviClient(clientId: number): Promise<{
        locations: Location[];
        totalLoue: number;
        totalRetourne: number;
        totalRestant: number;
    }>;
    getSuiviGlobal(): Promise<{
        totalLoue: number;
        totalRetourne: number;
        totalRestant: number;
        enRetard: Location[];
    }>;
}
