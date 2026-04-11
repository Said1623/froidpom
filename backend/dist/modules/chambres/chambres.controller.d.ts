import { ChambresService, CreateChambreDto, UpdateChambreDto } from './chambres.service';
export declare class ChambresController {
    private readonly service;
    constructor(service: ChambresService);
    findAll(): Promise<import("./chambre.entity").Chambre[]>;
    getStats(): Promise<{
        chambres: import("./chambre.entity").Chambre[];
        totalCapacite: number;
        totalStock: number;
        totalDisponible: number;
        tauxRemplissageGlobal: number;
    }>;
    findOne(id: number): Promise<import("./chambre.entity").Chambre>;
    create(dto: CreateChambreDto): Promise<import("./chambre.entity").Chambre>;
    update(id: number, dto: UpdateChambreDto): Promise<import("./chambre.entity").Chambre>;
    remove(id: number): Promise<import("./chambre.entity").Chambre>;
}
