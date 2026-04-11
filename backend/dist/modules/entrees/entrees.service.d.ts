import { Repository } from 'typeorm';
import { Entree } from './entree.entity';
import { ChambresService } from '../chambres/chambres.service';
export declare class EntreesService {
    private readonly repo;
    private readonly chambresService;
    constructor(repo: Repository<Entree>, chambresService: ChambresService);
    findAll(clientId?: number, chambreId?: number): Promise<Entree[]>;
    findOne(id: number): Promise<Entree>;
    create(dto: any): Promise<Entree>;
    remove(id: number): Promise<Entree>;
}
