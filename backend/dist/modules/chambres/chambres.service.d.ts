import { Repository } from 'typeorm';
import { Chambre } from './chambre.entity';
export declare class CreateChambreDto {
    nom: string;
    capaciteMax: number;
    description?: string;
    temperatureCible?: number;
}
export declare class UpdateChambreDto {
    nom?: string;
    capaciteMax?: number;
    description?: string;
    temperatureCible?: number;
    active?: boolean;
}
export declare class ChambresService {
    private readonly repo;
    constructor(repo: Repository<Chambre>);
    findAll(): Promise<Chambre[]>;
    findOne(id: number): Promise<Chambre>;
    create(dto: CreateChambreDto): Promise<Chambre>;
    update(id: number, dto: UpdateChambreDto): Promise<Chambre>;
    remove(id: number): Promise<Chambre>;
    updateStock(id: number, delta: number): Promise<Chambre>;
    getStats(): Promise<{
        chambres: Chambre[];
        totalCapacite: number;
        totalStock: number;
        totalDisponible: number;
        tauxRemplissageGlobal: number;
    }>;
}
