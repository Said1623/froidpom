import { EntreesService } from './entrees.service';
export declare class EntreesController {
    private readonly service;
    constructor(service: EntreesService);
    findAll(clientId?: string, chambreId?: string): Promise<import("./entree.entity").Entree[]>;
    findOne(id: number): Promise<import("./entree.entity").Entree>;
    create(body: any): Promise<import("./entree.entity").Entree>;
    remove(id: number): Promise<import("./entree.entity").Entree>;
}
