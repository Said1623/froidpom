import { Repository } from 'typeorm';
import { Sortie } from './sortie.entity';
import { ChambresService } from '../chambres/chambres.service';
export declare class SortiesService {
    private readonly repo;
    private readonly chambresService;
    constructor(repo: Repository<Sortie>, chambresService: ChambresService);
    findAll(clientId?: number, chambreId?: number): Promise<Sortie[]>;
    findOne(id: number): Promise<Sortie>;
    create(dto: any): Promise<Sortie>;
    remove(id: number): Promise<Sortie>;
}
