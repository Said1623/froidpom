import { LocationsService, CreateLocationDto, RetourLocationDto } from './locations.service';
export declare class LocationsController {
    private readonly service;
    constructor(service: LocationsService);
    findAll(clientId?: string): Promise<import("./location.entity").Location[]>;
    getSuiviGlobal(): Promise<{
        totalLoue: number;
        totalRetourne: number;
        totalRestant: number;
        enRetard: import("./location.entity").Location[];
    }>;
    getSuiviClient(clientId: number): Promise<{
        locations: import("./location.entity").Location[];
        totalLoue: number;
        totalRetourne: number;
        totalRestant: number;
    }>;
    findOne(id: number): Promise<import("./location.entity").Location>;
    create(dto: CreateLocationDto): Promise<import("./location.entity").Location>;
    enregistrerRetour(id: number, dto: RetourLocationDto): Promise<import("./location.entity").Location>;
    remove(id: number): Promise<import("./location.entity").Location>;
}
