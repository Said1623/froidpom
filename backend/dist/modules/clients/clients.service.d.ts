import { Repository } from 'typeorm';
import { Client } from './client.entity';
export declare class CreateClientDto {
    nom: string;
    telephone?: string;
    adresse?: string;
    email?: string;
}
export declare class UpdateClientDto {
    nom?: string;
    telephone?: string;
    adresse?: string;
    email?: string;
    actif?: boolean;
}
export declare class ClientsService {
    private readonly repo;
    constructor(repo: Repository<Client>);
    findAll(search?: string): Promise<Client[]>;
    findOne(id: number): Promise<Client>;
    create(dto: CreateClientDto): Promise<Client>;
    update(id: number, dto: UpdateClientDto): Promise<Client>;
    remove(id: number): Promise<Client>;
    getStockClient(clientId: number): Promise<Client>;
}
