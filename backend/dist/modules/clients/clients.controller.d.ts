import { ClientsService, CreateClientDto, UpdateClientDto } from './clients.service';
export declare class ClientsController {
    private readonly service;
    constructor(service: ClientsService);
    findAll(search?: string): Promise<import("./client.entity").Client[]>;
    findOne(id: number): Promise<import("./client.entity").Client>;
    getStock(id: number): Promise<import("./client.entity").Client>;
    create(dto: CreateClientDto): Promise<import("./client.entity").Client>;
    update(id: number, dto: UpdateClientDto): Promise<import("./client.entity").Client>;
    remove(id: number): Promise<import("./client.entity").Client>;
}
