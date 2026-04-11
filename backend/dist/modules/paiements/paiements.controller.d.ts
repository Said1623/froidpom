import { PaiementsService, CreatePaiementDto } from './paiements.service';
export declare class PaiementsController {
    private readonly service;
    constructor(service: PaiementsService);
    findAll(clientId?: string): Promise<import("./paiement.entity").Paiement[]>;
    getBalanceGlobale(): Promise<{
        totalPaye: number;
        parClient: Record<number, {
            clientNom: string;
            total: number;
        }>;
    }>;
    getBalanceClient(clientId: number): Promise<{
        paiements: import("./paiement.entity").Paiement[];
        totalPaye: number;
    }>;
    findOne(id: number): Promise<import("./paiement.entity").Paiement>;
    create(dto: CreatePaiementDto): Promise<import("./paiement.entity").Paiement>;
    remove(id: number): Promise<import("./paiement.entity").Paiement>;
}
