import { Repository } from 'typeorm';
import { Paiement, ModePaiement } from './paiement.entity';
export declare class CreatePaiementDto {
    clientId: number;
    datePaiement: string;
    montant: number;
    modePaiement?: ModePaiement;
    reference?: string;
    notes?: string;
}
export declare class PaiementsService {
    private readonly repo;
    constructor(repo: Repository<Paiement>);
    findAll(clientId?: number): Promise<Paiement[]>;
    findOne(id: number): Promise<Paiement>;
    create(dto: CreatePaiementDto): Promise<Paiement>;
    remove(id: number): Promise<Paiement>;
    getBalanceClient(clientId: number): Promise<{
        paiements: Paiement[];
        totalPaye: number;
    }>;
    getBalanceGlobale(): Promise<{
        totalPaye: number;
        parClient: Record<number, {
            clientNom: string;
            total: number;
        }>;
    }>;
}
