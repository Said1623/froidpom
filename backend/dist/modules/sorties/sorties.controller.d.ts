import { SortiesService } from './sorties.service';
export declare class SortiesController {
    private readonly service;
    constructor(service: SortiesService);
    findAll(clientId?: string, chambreId?: string): Promise<import("./sortie.entity").Sortie[]>;
    findOne(id: number): Promise<import("./sortie.entity").Sortie>;
    create(body: any): Promise<import("./sortie.entity").Sortie>;
    remove(id: number): Promise<import("./sortie.entity").Sortie>;
}
